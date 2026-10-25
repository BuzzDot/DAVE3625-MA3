import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { display } from "@/lib/nutrition/calculations";
import {
  macroKeys,
  macroLabels as labels,
  type Goal,
  type Macros,
} from "@/lib/nutrition/types";

export function DailyNutritionTotals({
  totals,
  goal,
  className,
}: {
  totals: Macros;
  goal?: Goal;
  className?: string;
}) {
  const targets = goal
    ? {
        kcal: goal.kcal,
        protein: goal.protein_g,
        carbs: goal.carbs_g,
        fat: goal.fat_g,
      }
    : null;
  return (
    <div className={cn("@container", className)}>
      <div className="grid grid-cols-2 gap-3 @min-[640px]:grid-cols-4">
        {macroKeys.map((key) => {
          const target = targets?.[key] ?? null;
          const value = totals[key];
          const unit = key === "kcal" ? " kcal" : " g";
          return (
            <Card
              key={key}
              className={cn(
                "min-w-0 p-4 sm:p-5",
                key === "kcal" && "bg-[#edf1e8]",
              )}
            >
              <p className="text-xs text-muted-foreground">{labels[key]}</p>
              <p
                className="mt-3 break-words text-xl font-semibold sm:text-2xl"
                data-testid={`daily-${key}`}
              >
                {display(value, key === "kcal" ? "" : unit)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {target === null
                  ? "No target set"
                  : `of ${display(target, unit)}`}
              </p>
              {target !== null && target > 0 && value !== null && (
                <>
                  <progress
                    className="nutrition-progress mt-3 h-2 w-full"
                    aria-label={`${labels[key]} goal progress`}
                    value={Math.min(value, target)}
                    max={target}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {value <= target
                      ? `${display(target - value, unit)} remaining`
                      : `${display(value - target, unit)} above target`}
                  </p>
                </>
              )}
            </Card>
          );
        })}
      </div>
      {macroKeys.some((key) => totals[key] === null) && (
        <p className="mt-4 text-sm text-amber-800">
          Some nutrient values are unavailable. Affected totals are shown as
          Unknown, rather than counting missing data as zero.
        </p>
      )}
    </div>
  );
}
