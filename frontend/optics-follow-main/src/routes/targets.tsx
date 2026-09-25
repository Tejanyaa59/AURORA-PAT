import { createFileRoute } from "@tanstack/react-router";
import { ApplyConfigBar } from "@/components/controls/ApplyConfigBar";
import { NumberField } from "@/components/controls/NumberField";
import { KeyValue, PageHeader, Panel } from "@/components/layout/Panel";
import { TargetInfoPanel } from "@/components/tracking/TargetInfoPanel";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/hooks/appState";
import {
  TRAJECTORY_OPTIONS,
  type Trajectory,
  DETECTOR_MODE_OPTIONS,
  type DetectorMode,
} from "@/types/simulation";

export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "Target Configuration — FSOC Virtual Camera" },
      {
        name: "description",
        content:
          "Set beacon size, speed, trajectory, target count and the designated target for FSOC tracking.",
      },
      { property: "og:title", content: "Target Configuration — FSOC Virtual Camera" },
      {
        property: "og:description",
        content: "Beacon size, speed, trajectory and designated target selection.",
      },
    ],
  }),
  component: TargetsPage,
});

function TargetsPage() {
  const { configState, stream } = useAppState();
  const { config, update } = configState;
  const t = config.target;

  return (
    <>
      <PageHeader
        title="Target Configuration"
        description="Beacon properties and motion used by the backend scene generator."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          <Panel title="Beacon properties">
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Beacon size"
                unit="px"
                min={2}
                max={80}
                step={1}
                value={t.beacon_size}
                onChange={(v) => update((p) => ({ ...p, target: { ...p.target, beacon_size: v } }))}
                hint="Apparent diameter of the optical beacon."
              />
              <NumberField
                label="Target speed"
                unit="px/s"
                min={0}
                max={400}
                step={1}
                value={t.speed}
                onChange={(v) => update((p) => ({ ...p, target: { ...p.target, speed: v } }))}
              />
            </div>
          </Panel>

          <Panel title="Motion and multi-target">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label className="label-tech">Trajectory</Label>
                <Select
                  value={t.trajectory}
                  onValueChange={(v) =>
                    update((p) => ({ ...p, target: { ...p.target, trajectory: v as Trajectory } }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select trajectory" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAJECTORY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground/80">
                  Path followed by the moving terminal.
                </p>
              </div>

              <NumberField
                label="Number of targets"
                min={1}
                max={10}
                step={1}
                value={t.count}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    target: {
                      ...p.target,
                      count: v,
                      designated_id: Math.min(p.target.designated_id, v),
                    },
                  }))
                }
              />

              <NumberField
                label="Designated target ID"
                min={1}
                max={Math.max(1, t.count)}
                step={1}
                value={t.designated_id}
                onChange={(v) =>
                  update((p) => ({ ...p, target: { ...p.target, designated_id: v } }))
                }
                hint="The terminal the camera must keep aligned."
              />
            </div>
          </Panel>
          <Panel title="Detection algorithm" subtitle="AI and computer vision backend detector">
            <div className="flex flex-col gap-2">
              <Label className="label-tech">Detector Pipeline Mode</Label>
              <Select
                value={t.detector_mode ?? "AI"}
                onValueChange={(v) =>
                  update((p) => ({ ...p, target: { ...p.target, detector_mode: v as DetectorMode } }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select detector mode" />
                </SelectTrigger>
                <SelectContent>
                  {DETECTOR_MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex flex-col text-left py-0.5">
                        <span className="font-medium text-xs">{o.label}</span>
                        <span className="text-[10px] text-muted-foreground">{o.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground/80">
                Determines whether optical beacons are tracked via PyTorch CNN inference, subpixel hybrid fusion, or classical morphology.
              </p>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <Panel title="Current draft">
            <KeyValue label="Detector" value={t.detector_mode ?? "AI"} />
            <KeyValue label="Beacon size" value={`${t.beacon_size} px`} />
            <KeyValue label="Speed" value={`${t.speed} px/s`} />
            <KeyValue label="Trajectory" value={t.trajectory} mono={false} />
            <KeyValue label="Targets" value={t.count} />
            <KeyValue label="Designated ID" value={t.designated_id} />
          </Panel>
          <TargetInfoPanel update={stream.latest} />
        </div>
      </div>

      <ApplyConfigBar />
    </>
  );
}
