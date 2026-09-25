import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number | undefined;
  unit?: string | undefined;
  slider?: boolean | undefined;
  hint?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  slider = true,
  hint,
  disabled,
  className,
}: NumberFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="label-tech">{label}</label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            inputMode="decimal"
            className="h-7 w-24 numeric text-xs text-right px-2"
            value={Number.isFinite(value) ? value : ""}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              if (!Number.isNaN(n)) onChange(clamp(n, min, max));
            }}
          />
          {unit && <span className="text-[11px] text-muted-foreground w-8">{unit}</span>}
        </div>
      </div>
      {slider && (
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          disabled={Boolean(disabled)}
          onValueChange={(v) => {
            const first = v[0];
            if (first !== undefined) onChange(first);
          }}
        />
      )}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
