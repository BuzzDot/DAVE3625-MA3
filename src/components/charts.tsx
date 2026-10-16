"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { week } from "@/lib/demo/data";
export function ActivityChart({
  metric = "volume",
}: {
  metric?: "volume" | "weight" | "calories";
}) {
  return (
    <div
      className="h-52 w-full min-w-0"
      role="img"
      aria-label={`Demo weekly ${metric} chart. ${metric === "volume" ? "Monday 4200, Tuesday 6100, Thursday 5400, Friday 6800 kilograms; no workouts on other days." : "Sample daily values, with no measurements for the weekend."}`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 400, height: 208 }}
      >
        {metric === "weight" ? (
          <LineChart data={week}>
            <CartesianGrid vertical={false} stroke="#edf0eb" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#82877e" }}
            />
            <YAxis
              domain={[74, 76]}
              tickLine={false}
              axisLine={false}
              width={35}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, borderColor: "#e5e8e0" }}
            />
            <Line
              isAnimationActive={false}
              dataKey="weight"
              name="Body weight (kg)"
              stroke="#65836b"
              strokeWidth={3}
              connectNulls={false}
            />
          </LineChart>
        ) : (
          <BarChart data={week} barSize={24}>
            <CartesianGrid vertical={false} stroke="#edf0eb" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#82877e" }}
              dy={7}
            />
            <YAxis
              tickFormatter={(v) => (metric === "volume" ? `${v / 1000}k` : v)}
              tickLine={false}
              axisLine={false}
              width={32}
              tick={{ fontSize: 10, fill: "#82877e" }}
            />
            <Tooltip
              cursor={{ fill: "#f6f7f3" }}
              contentStyle={{ borderRadius: 12, borderColor: "#e5e8e0" }}
            />
            <Bar
              isAnimationActive={false}
              dataKey={metric}
              name={metric === "volume" ? "Volume (kg)" : "Energy (kcal)"}
              fill="#78977e"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
