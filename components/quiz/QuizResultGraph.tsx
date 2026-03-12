"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

interface QuizResultGraphProps {
  resultId: string;
  metrics: Array<{
    id: string;
    label: string;
    value: number;
  }>;
}

export default function QuizResultGraph({
  resultId,
  metrics,
}: QuizResultGraphProps) {
  const gradientId = `quiz-graph-${resultId}`;

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={metrics} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            dy={10}
            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis axisLine={false} domain={[0, 100]} hide tickLine={false} />
          <Area
            dataKey="value"
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            stroke="#ffffff"
            strokeWidth={1.4}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
