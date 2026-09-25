"""Offline Training Pipeline for FSOC Optical Beacon CNN Detector.

Generates synthetic training frames with optical disturbances, trains the BeaconCNN
for objectness and bounding box regression, evaluates validation metrics, and
exports trained weights to backend/models/beacon_detector.pth.
"""

import os
import sys
import time
from typing import Optional
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from backend.vision.dataset_generator import generate_synthetic_dataset
from backend.vision.ai_detector import BeaconCNN


def train_beacon_detector(
    epochs: int = 12,
    batch_size: int = 32,
    learning_rate: float = 1e-3,
    save_path: Optional[str] = None,
) -> dict:
    """Train BeaconCNN on synthetic FSOC optical beacon data."""
    if not TORCH_AVAILABLE:
        raise RuntimeError("PyTorch is required to train the beacon detector.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[Train] Initializing training on device: {device}")

    # Set paths
    if save_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        models_dir = os.path.join(base_dir, "models")
        os.makedirs(models_dir, exist_ok=True)
        save_path = os.path.join(models_dir, "beacon_detector.pth")

    # 1. Generate Datasets
    print("[Train] Generating synthetic training set (1600 samples)...")
    train_imgs, train_cls, train_reg = generate_synthetic_dataset(
        num_samples=1600, positive_ratio=0.75, seed=42
    )

    print("[Train] Generating synthetic validation set (400 samples)...")
    val_imgs, val_cls, val_reg = generate_synthetic_dataset(
        num_samples=400, positive_ratio=0.75, seed=101
    )

    train_dataset = TensorDataset(
        torch.from_numpy(train_imgs),
        torch.from_numpy(train_cls),
        torch.from_numpy(train_reg),
    )
    val_dataset = TensorDataset(
        torch.from_numpy(val_imgs),
        torch.from_numpy(val_cls),
        torch.from_numpy(val_reg),
    )

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    # 2. Model, Criterion, Optimizer
    model = BeaconCNN().to(device)
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[Train] Model instantiated with {total_params:,} trainable parameters.")

    bce_loss = nn.BCELoss()
    smooth_l1 = nn.SmoothL1Loss(reduction="none")
    optimizer = optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_loss = float("inf")
    best_epoch = 0
    training_history = []

    # 3. Training Loop
    start_time = time.time()
    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        running_cls_loss = 0.0
        running_reg_loss = 0.0

        for images, labels_cls, labels_reg in train_loader:
            images = images.to(device)
            labels_cls = labels_cls.to(device)
            labels_reg = labels_reg.to(device)

            optimizer.zero_grad()

            pred_conf, pred_bbox = model(images)

            # Objectness loss
            loss_cls = bce_loss(pred_conf, labels_cls)

            # Localization loss (computed primarily on positive beacon samples)
            is_pos = labels_cls.squeeze(-1) > 0.5
            if is_pos.sum() > 0:
                # Reg loss on center coordinates [cx, cy]
                loss_coord = smooth_l1(pred_bbox[is_pos, :2], labels_reg[is_pos, :2]).mean()
                # Reg loss on size [w, h]
                loss_size = smooth_l1(pred_bbox[is_pos, 2:], labels_reg[is_pos, 2:]).mean()
                loss_reg = 6.0 * loss_coord + 2.0 * loss_size
            else:
                loss_reg = torch.tensor(0.0, device=device)

            total_loss = loss_cls + loss_reg
            total_loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()

            running_loss += total_loss.item() * images.size(0)
            running_cls_loss += loss_cls.item() * images.size(0)
            running_reg_loss += (loss_reg.item() if isinstance(loss_reg, torch.Tensor) else loss_reg) * images.size(0)

        scheduler.step()

        epoch_loss = running_loss / len(train_dataset)
        epoch_cls = running_cls_loss / len(train_dataset)
        epoch_reg = running_reg_loss / len(train_dataset)

        # 4. Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_pixel_errors = []

        with torch.no_grad():
            for val_images, val_labels_cls, val_labels_reg in val_loader:
                val_images = val_images.to(device)
                val_labels_cls = val_labels_cls.to(device)
                val_labels_reg = val_labels_reg.to(device)

                v_conf, v_bbox = model(val_images)

                v_loss_cls = bce_loss(v_conf, val_labels_cls)
                v_is_pos = val_labels_cls.squeeze(-1) > 0.5

                if v_is_pos.sum() > 0:
                    v_loss_coord = smooth_l1(v_bbox[v_is_pos, :2], val_labels_reg[v_is_pos, :2]).mean()
                    v_loss_size = smooth_l1(v_bbox[v_is_pos, 2:], val_labels_reg[v_is_pos, 2:]).mean()
                    v_loss_reg = 6.0 * v_loss_coord + 2.0 * v_loss_size

                    # Compute pixel Euclidean error on 128x128 grid
                    cx_pred_px = v_bbox[v_is_pos, 0] * 128.0
                    cy_pred_px = v_bbox[v_is_pos, 1] * 128.0
                    cx_gt_px = val_labels_reg[v_is_pos, 0] * 128.0
                    cy_gt_px = val_labels_reg[v_is_pos, 1] * 128.0
                    px_err = torch.sqrt((cx_pred_px - cx_gt_px) ** 2 + (cy_pred_px - cy_gt_px) ** 2)
                    val_pixel_errors.extend(px_err.cpu().tolist())
                else:
                    v_loss_reg = torch.tensor(0.0, device=device)

                v_total = v_loss_cls + v_loss_reg
                val_loss += v_total.item() * val_images.size(0)

                # Accuracy
                pred_binary = (v_conf > 0.5).float()
                val_correct += (pred_binary == val_labels_cls).sum().item()

        epoch_val_loss = val_loss / len(val_dataset)
        val_acc = (val_correct / len(val_dataset)) * 100.0
        mean_px_err = float(np.mean(val_pixel_errors)) if val_pixel_errors else 0.0

        print(
            f"Epoch {epoch:2d}/{epochs:2d} | "
            f"Train Loss: {epoch_loss:.4f} (cls: {epoch_cls:.4f}, reg: {epoch_reg:.4f}) | "
            f"Val Loss: {epoch_val_loss:.4f} | Val Acc: {val_acc:.1f}% | "
            f"Mean Err: {mean_px_err:.2f}px"
        )

        training_history.append({
            "epoch": epoch,
            "train_loss": epoch_loss,
            "val_loss": epoch_val_loss,
            "val_accuracy": val_acc,
            "mean_pixel_error": mean_px_err,
        })

        # Save best model
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            best_epoch = epoch
            torch.save(
                {
                    "epoch": epoch,
                    "state_dict": model.state_dict(),
                    "val_loss": epoch_val_loss,
                    "val_acc": val_acc,
                    "mean_pixel_error": mean_px_err,
                    "model_architecture": "BeaconCNN",
                    "parameters": total_params,
                },
                save_path,
            )

    elapsed = time.time() - start_time
    print(
        f"[Train] Complete in {elapsed:.1f}s. "
        f"Best checkpoint saved at Epoch {best_epoch} (Val Loss: {best_val_loss:.4f}) -> {save_path}"
    )

    return {
        "best_epoch": best_epoch,
        "best_val_loss": best_val_loss,
        "save_path": save_path,
        "history": training_history,
        "parameters": total_params,
    }


if __name__ == "__main__":
    # Import Optional when running directly
    from typing import Optional
    train_beacon_detector(epochs=12)
