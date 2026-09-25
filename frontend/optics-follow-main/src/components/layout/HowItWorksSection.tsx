import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Crosshair,
  Gauge,
  HelpCircle,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HowItWorksSectionProps {
  className?: string;
  defaultExpanded?: boolean;
}

export function HowItWorksSection({
  className,
  defaultExpanded = false,
}: HowItWorksSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const pillars = [
    {
      title: "1. Optical Beacon Acquisition",
      subtitle: "Sensor Frame & Spatial Localization",
      icon: Radio,
      desc: "Captures 640×480 optical frames across a 60°×45° field of view. The detector processes raw focal-plane intensity, localizing the beacon centroid with sub-pixel precision and computing objectness confidence under atmospheric disturbances.",
    },
    {
      title: "2. Kinematic State Estimation",
      subtitle: "4D Continuous-Discrete Kalman Filter",
      icon: Crosshair,
      desc: "Estimates target state [x, y, vx, vy]ᵀ and updates error covariance. Dampens measurement noise, predicts target trajectory during dynamic maneuvers, and maintains coastal state propagation across momentary optical dropouts.",
    },
    {
      title: "3. Dual-Axis Gimbal Control",
      subtitle: "Closed-Loop PID Slew Actuation",
      icon: Gauge,
      desc: "Translates focal plane tracking errors (Δx, Δy) into commanded angular slew velocities (pan, tilt) to steer the gimbal. Continuously drives target displacement toward the receiver optical boresight within the 24 px coarse lock boundary.",
    },
    {
      title: "4. Channel Disturbance Rejection",
      subtitle: "Platform Jitter & Environmental Resilience",
      icon: ShieldCheck,
      desc: "Compensates for simulated marine platform pitch/roll, high-frequency mount vibration, sensor read noise, and atmospheric scintillation, ensuring stable coarse alignment prior to fine beam tracking handover.",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/60 backdrop-blur-sm overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-primary" />
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              Theory of Operation — Optical Coarse Alignment Architecture
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Closed-loop acquisition, kinematic filtering, and gimbal pointing principles
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-7 px-2 text-xs font-mono"
        >
          {expanded ? (
            <>
              Hide <ChevronUp className="size-3.5 ml-1" />
            </>
          ) : (
            <>
              Details <ChevronDown className="size-3.5 ml-1" />
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-background/40">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="flex flex-col gap-1.5 p-3 rounded border border-border/60 bg-card/40"
              >
                <div className="flex items-center gap-1.5 text-primary">
                  <Icon className="size-3.5" />
                  <span className="text-xs font-semibold text-foreground">
                    {pillar.title}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {pillar.subtitle}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
