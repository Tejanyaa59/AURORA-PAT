import { cn } from "@/lib/utils";
import { TONE_TEXT_CLASS, type Tone } from "@/utils/status";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  size = "md",
  className,
}: MetricCardProps) {
  return (
    <div className={cn("panel px-3.5 py-3 flex flex-col gap-1 min-w-0", className)}>
      <span className="label-tech truncate">{label}</span>
      <div className="flex items-baseline gap-1 min-w-0">
        <span
          className={cn(
            "numeric font-medium leading-none truncate",
            size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl",
            TONE_TEXT_CLASS[tone],
          )}
        >
          {value}
        </span>
        {unit && value !== "—" && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground/80 truncate">{hint}</span>}
    </div>
  );
}
