import { useRef } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Rectangle,
} from "recharts";
import { z } from "zod";
import { CHART_COLORS, CHART_CONFIG } from "./config";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const BarChartProps = z.object({
  title: z.string().describe("Chart title"),
  description: z.string().describe("Brief description or subtitle"),
  data: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    }),
  ),
});

type BarChartProps = z.infer<typeof BarChartProps>;

/** Tracks seen indices so only NEW bars get the fade-in animation. */
function useSeenIndices() {
  const seen = useRef(new Set<number>());
  return {
    isNew(index: number) {
      if (seen.current.has(index)) return false;
      seen.current.add(index);
      return true;
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AnimatedBar(props: any) {
  const { isNew, ...rest } = props;
  return (
    <g
      style={
        isNew
          ? {
              animation: "barSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
            }
          : undefined
      }
    >
      <Rectangle {...rest} />
    </g>
  );
}

export function BarChart({ title, description, data }: BarChartProps) {
  const { isNew } = useSeenIndices();

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto my-4 rounded-[var(--radius-md,var(--radius))] shadow-[var(--elevation-sm,0_1px_2px_rgba(0,0,0,0.04))] bg-[var(--surface-container,var(--card))] border border-[var(--border-default,var(--border))]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--text-secondary,var(--muted-foreground))]" />
            <CardTitle className="text-[var(--text-primary,var(--foreground))]">
              {title}
            </CardTitle>
          </div>
          <CardDescription className="text-[var(--text-secondary,var(--muted-foreground))]">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary,var(--muted-foreground))] text-center py-8 text-sm">
            No data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto my-4 overflow-hidden rounded-[var(--radius-md,var(--radius))] shadow-[var(--elevation-sm,0_1px_2px_rgba(0,0,0,0.04))] bg-[var(--surface-container,var(--card))] border border-[var(--border-default,var(--border))]">
      {/* Scoped keyframe — no globals.css needed.
          Respects prefers-reduced-motion so users who opt out see the
          chart paint in instantly instead of sliding. */}
      <style>{`
        @keyframes barSlideIn {
          from { transform: translateY(40px); opacity: 0; }
          20% { opacity: 1; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes barSlideIn {
            from { transform: none; opacity: 1; }
            to { transform: none; opacity: 1; }
          }
        }
      `}</style>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-6 w-6 rounded-[var(--radius-xs,4px)] bg-[var(--accent)]">
            <BarChart3 className="h-3.5 w-3.5 text-[var(--cpk-lilac-400)]" />
          </div>
          <CardTitle className="text-[var(--text-primary,var(--foreground))]">
            {title}
          </CardTitle>
        </div>
        <CardDescription className="text-[var(--text-secondary,var(--muted-foreground))]">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={280}>
          <RechartsBarChart
            data={data}
            margin={{ top: 12, right: 12, bottom: 4, left: -8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-container, var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
              stroke="var(--border-container, var(--border))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
              stroke="var(--border-container, var(--border))"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={CHART_CONFIG.tooltipStyle}
              cursor={{ fill: "var(--accent)", opacity: 0.5 }}
            />
            <Bar
              isAnimationActive={false}
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              shape={(props: any) => (
                <AnimatedBar {...props} isNew={isNew(props.index as number)} />
              )}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
