import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/layout/Panel";

export interface SeriesDef {
  key: string;
  label: string;
  color: string; // CSS variable reference
}

export interface ReferenceLineDef {
  y: number;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}

interface Props<T extends { t: number }> {
  data: T[];
  series: SeriesDef[];
  referenceLines?: ReferenceLineDef[];
  height?: number;
  yLabel?: string;
  xKey?: keyof T & string;
  yDomain?: [number | "auto", number | "auto"];
  zeroLine?: boolean;
  emptyMessage?: string;
}

const tickStyle = {
  fill: "var(--color-muted-foreground)",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
};

export function TimeSeriesChart<T extends { t: number }>({
  data,
  series,
  referenceLines,
  height = 220,
  yLabel,
  xKey = "t",
  yDomain,
  zeroLine,
  emptyMessage = "No data available yet.",
}: Props<T>) {
  const hasData = data.some((d) =>
    series.some(
      (s) =>
        (d as Record<string, unknown>)[s.key] !== null &&
        (d as Record<string, unknown>)[s.key] !== undefined,
    ),
  );
  if (!hasData) return <EmptyState message={emptyMessage} />;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={tickStyle}
            tickFormatter={(v: number) => `${v.toFixed(0)}s`}
            stroke="var(--color-border)"
            minTickGap={40}
          />
          <YAxis
            tick={tickStyle}
            stroke="var(--color-border)"
            width={44}
            domain={yDomain ?? ["auto", "auto"]}
            {...(yLabel
              ? {
                  label: {
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    style: { ...tickStyle, textAnchor: "middle" },
                  },
                }
              : {})}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "var(--color-muted-foreground)" }}
            labelFormatter={(v: number) => `t = ${Number(v).toFixed(2)} s`}
            formatter={(value: number, name: string) => [
              typeof value === "number" ? value.toFixed(2) : value,
              name,
            ]}
            isAnimationActive={false}
          />
          {zeroLine && (
            <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeOpacity={0.5} />
          )}
          {referenceLines?.map((ref, idx) =>
            ref.label ? (
              <ReferenceLine
                key={idx}
                y={ref.y}
                stroke={ref.color ?? "var(--color-destructive)"}
                strokeDasharray={ref.strokeDasharray ?? "4 4"}
                label={{
                  value: ref.label,
                  position: "insideTopRight",
                  fill: ref.color ?? "var(--color-destructive)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                }}
              />
            ) : (
              <ReferenceLine
                key={idx}
                y={ref.y}
                stroke={ref.color ?? "var(--color-destructive)"}
                strokeDasharray={ref.strokeDasharray ?? "4 4"}
              />
            )
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 px-1 pt-1 text-[11px] text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
