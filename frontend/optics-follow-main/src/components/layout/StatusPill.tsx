import { cn } from "@/lib/utils";
import { TONE_DOT_CLASS, TONE_TEXT_CLASS, type Tone } from "@/utils/status";

interface StatusPillProps {
  tone: Tone;
  label: string;
  pulse?: boolean | undefined;
  className?: string | undefined;
  title?: string | undefined;
}

export function StatusPill({ tone, label, pulse, className, title }: StatusPillProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border border-border bg-secondary/60 px-2.5 py-1 label-tech whitespace-nowrap",
        TONE_TEXT_CLASS[tone],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          TONE_DOT_CLASS[tone],
          pulse && "animate-status-pulse",
        )}
      />
      {label}
    </span>
  );
}
