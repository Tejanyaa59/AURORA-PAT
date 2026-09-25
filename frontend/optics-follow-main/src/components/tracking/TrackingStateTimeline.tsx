import { useEffect, useRef, useState } from "react";
import type { SimulationStatus } from "@/types/simulation";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock, GitCommit, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StateNode {
  id: string;
  state: SimulationStatus;
  startTime: number;
  endTime?: number;
  durationSec: number;
}

interface TrackingStateTimelineProps {
  currentStatus: SimulationStatus;
  className?: string;
}

export function TrackingStateTimeline({
  currentStatus,
  className,
}: TrackingStateTimelineProps) {
  const [timeline, setTimeline] = useState<StateNode[]>([]);
  const lastStateRef = useRef<SimulationStatus | null>(null);
  const nowRef = useRef<number>(Date.now());
  const [, setTick] = useState(0);

  // Update timer every 250ms for active state node
  useEffect(() => {
    const timer = setInterval(() => {
      nowRef.current = Date.now();
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Track status transitions
  useEffect(() => {
    const now = Date.now();

    if (currentStatus === "IDLE" || currentStatus === "STOPPED") {
      if (lastStateRef.current !== currentStatus && timeline.length > 0) {
        // Finalize previous state
        setTimeline((prev) => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && !last.endTime) {
            last.endTime = now;
            last.durationSec = Math.max(0.1, (now - last.startTime) / 1000);
          }
          return copy;
        });
      }
      lastStateRef.current = currentStatus;
      return;
    }

    if (currentStatus !== lastStateRef.current) {
      setTimeline((prev) => {
        const copy = [...prev];
        if (copy.length > 0) {
          const last = copy[copy.length - 1];
          if (last && !last.endTime) {
            last.endTime = now;
            last.durationSec = Math.max(0.1, (now - last.startTime) / 1000);
          }
        }
        // Append new state node
        copy.push({
          id: `${currentStatus}_${now}_${Math.random().toString(36).slice(2, 6)}`,
          state: currentStatus,
          startTime: now,
          durationSec: 0,
        });
        // Keep maximum 12 historical nodes for clean layout
        return copy.length > 12 ? copy.slice(copy.length - 12) : copy;
      });
      lastStateRef.current = currentStatus;
    }
  }, [currentStatus, timeline.length]);

  const getStateStyle = (st: SimulationStatus) => {
    switch (st) {
      case "TRACKING":
        return {
          bg: "bg-emerald-950/70 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-400",
        };
      case "ACQUIRING":
      case "RE-ACQUIRING":
        return {
          bg: "bg-amber-950/70 border-amber-500/40 text-amber-400",
          dot: "bg-amber-400",
        };
      case "TARGET_LOST":
        return {
          bg: "bg-red-950/70 border-red-500/40 text-red-400",
          dot: "bg-red-500",
        };
      case "SEARCHING":
        return {
          bg: "bg-sky-950/70 border-sky-500/40 text-sky-400",
          dot: "bg-sky-400",
        };
      default:
        return {
          bg: "bg-secondary/70 border-border text-muted-foreground",
          dot: "bg-muted-foreground",
        };
    }
  };

  const handleResetTimeline = () => {
    setTimeline([]);
    lastStateRef.current = null;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 p-2 rounded-lg border border-border bg-card/60 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs font-mono px-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GitCommit className="size-3.5 text-primary" />
          <span className="font-semibold text-foreground text-[11px]">
            TRACKING STATE TIMELINE
          </span>
          <span className="text-[10px]">
            ({timeline.length} state transition{timeline.length === 1 ? "" : "s"})
          </span>
        </div>
        {timeline.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetTimeline}
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            title="Reset Timeline History"
          >
            <RotateCcw className="size-2.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {timeline.length === 0 ? (
        <div className="flex items-center justify-center py-2 text-xs font-mono text-muted-foreground">
          <span>Simulation idle — transitions will be recorded in real time upon start.</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
          {timeline.map((node, idx) => {
            const isActive = idx === timeline.length - 1 && !node.endTime;
            const currentDurSec = isActive
              ? Math.max(0.1, (nowRef.current - node.startTime) / 1000)
              : node.durationSec;
            const style = getStateStyle(node.state);

            return (
              <div key={node.id} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded border font-mono text-[11px] transition-all",
                    style.bg,
                    isActive && "ring-1 ring-primary/40 shadow-sm"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      style.dot,
                      isActive && "animate-pulse"
                    )}
                  />
                  <span className="font-bold">{node.state}</span>
                  <span className="text-[10px] opacity-75 flex items-center gap-0.5">
                    <Clock className="size-2.5" />
                    {currentDurSec.toFixed(1)}s
                  </span>
                </div>

                {idx < timeline.length - 1 && (
                  <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
