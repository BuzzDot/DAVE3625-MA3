"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  Utensils,
  Leaf,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";
import { ConfirmDelete } from "@/components/training/confirm-delete";
import {
  saveFood,
  saveRecipe,
  saveEntry,
  deleteEntry,
  favoriteNutrition,
  archiveNutrition,
  saveGoals,
} from "@/app/nutrition/actions";
import {
  display,
  sumMacros,
  recipeNutrition,
  entryMacros,
  goalForDate,
} from "@/lib/nutrition/calculations";
import {
  macroKeys,
  portions,
  type NutritionData,
  type Food,
  type FoodInput,
  type Recipe,
  type Result,
  type Entry,
} from "@/lib/nutrition/types";
import { NutritionHistory } from "./history";
import { MacroLine, mealNames, labels, type Meal } from "./fields";
import { FoodSearch } from "./food-library";
import { FoodEditor, RecipeEditor, LogEditor, GoalEditor } from "./editors";
export function NutritionWorkspace({
  data,
  initialDate,
}: {
  data: NutritionData;
  initialDate?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [tab, setTab] = useState("Diary");
  const [date, setDate] = useState(
    initialDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(initialDate) &&
      !Number.isNaN(Date.parse(initialDate))
      ? initialDate
      : data.today,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [defaultMeal, setDefaultMeal] = useState<Meal>("breakfast");
  const [foodEditor, setFoodEditor] = useState<FoodInput | null>(null);
  const [recipeEditor, setRecipeEditor] = useState<Recipe | null>(null);
  const [logger, setLogger] = useState<{
    food?: Food;
    recipe?: Recipe;
    entry?: Entry;
    meal: Meal;
  } | null>(null);
  function act(action: () => Promise<Result>, done?: () => void) {
    setError("");
    setStatus("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          setError(result.error);
          return;
        }
        setStatus("Saved to your account.");
        done?.();
        router.refresh();
      } catch {
        setError(
          "The request did not complete. Check your connection and retry.",
        );
      }
    });
  }
  const entries = data.entries.filter((e) => e.local_date === date);
  const totals = sumMacros(entries.map(entryMacros));
  const goal = goalForDate(data.goals, date);
  const activeFoods = data.foods.filter((f) => !f.archived_at);
  function moveDay(delta: number) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  }
  function editFood(food?: Food) {
    setFoodEditor(
      food
        ? {
            id: food.id,
            revision: food.revision,
            name: food.name,
            description: food.description,
            kcal_per_100g: food.kcal_per_100g,
            protein_per_100g: food.protein_per_100g,
            carbs_per_100g: food.carbs_per_100g,
            fat_per_100g: food.fat_per_100g,
            portions: portions(food.portions),
          }
        : {
            id: crypto.randomUUID(),
            revision: 0,
            name: "",
            description: "",
            kcal_per_100g: null,
            protein_per_100g: null,
            carbs_per_100g: null,
            fat_per_100g: null,
            portions: [],
          },
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR NUTRITION DIARY"
        title="Good food. Good energy."
        description="Real meals, a little awareness. Your food diary is saved privately to your account."
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          aria-label="Previous nutrition day"
          onClick={() => moveDay(-1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <label className="text-xs">
          <span className="sr-only">Nutrition date</span>
          <input
            aria-label="Nutrition date"
            disabled={!hydrated}
            type="date"
            required
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <Button
          variant="outline"
          aria-label="Next nutrition day"
          onClick={() => moveDay(1)}
        >
          <ChevronRight size={16} />
        </Button>
        <Button variant="ghost" onClick={() => setDate(data.today)}>
          Today
        </Button>
        <span className="text-xs text-muted-foreground">{data.timezone}</span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {macroKeys.map((k) => {
          const target = goal
            ? {
                kcal: goal.kcal,
                protein: goal.protein_g,
                carbs: goal.carbs_g,
                fat: goal.fat_g,
              }[k]
            : null;
          return (
            <Card key={k} className={k === "kcal" ? "bg-[#edf1e8]" : ""}>
              <p className="eyebrow">{labels[k]}</p>
              <p
                className="mt-3 text-2xl font-semibold"
                data-testid={`daily-${k}`}
              >
                {display(totals[k], k === "kcal" ? "" : " g")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {target === null
                  ? "No target set"
                  : `of ${display(target, k === "kcal" ? " kcal" : " g")}`}
              </p>
              {target !== null && target > 0 && totals[k] !== null && (
                <progress
                  className="mt-3 h-2 w-full accent-[#64794e]"
                  aria-label={`${labels[k]} goal progress`}
                  value={Math.min(totals[k]!, target)}
                  max={target}
                />
              )}
            </Card>
          );
        })}
      </div>
      {entries.some((e) =>
        macroKeys.some((k) => entryMacros(e)[k] === null),
      ) && (
        <p className="mb-4 text-sm text-amber-800">
          Some nutrient values are unavailable. Affected totals are shown as
          Unknown, rather than counting missing data as zero.
        </p>
      )}
      <nav
        aria-label="Nutrition sections"
        className="mb-6 flex flex-wrap gap-2"
      >
        {["Diary", "Food library", "Saved meals", "Goals & history"].map(
          (t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "outline"}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setError("");
              }}
            >
              {t}
            </Button>
          ),
        )}
      </nav>
      <p role="alert" className="mb-3 text-sm text-red-700">
        {error}
      </p>
      <p role="status" className="mb-3 text-xs text-primary">
        {pending ? "Saving…" : status}
      </p>
      <fieldset disabled={pending || !hydrated} className="min-w-0 space-y-5">
        <legend className="sr-only">Nutrition diary controls</legend>
        {logger && (
          <LogEditor
            key={logger.entry?.id ?? logger.food?.id ?? logger.recipe?.id}
            selection={logger}
            date={date}
            timezone={data.timezone}
            foods={data.foods}
            onCancel={() => setLogger(null)}
            onSave={(input) =>
              act(
                () => saveEntry(input),
                () => setLogger(null),
              )
            }
          />
        )}
        {tab === "Diary" && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              {(Object.entries(mealNames) as [Meal, string][]).map(
                ([meal, label]) => (
                  <Card key={meal}>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-base font-semibold">
                        <Utensils size={16} />
                        {label}
                      </h2>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setTab("Food library");
                          setLogger(null);
                          setDefaultMeal(meal);
                          setStatus(
                            `Choose a food to log to ${label.toLowerCase()}.`,
                          );
                        }}
                      >
                        <Plus size={15} />
                        Add food
                      </Button>
                    </div>
                    {entries.filter((e) => e.meal_slot === meal).length ===
                    0 ? (
                      <p className="mt-5 text-xs text-muted-foreground">
                        Nothing logged for {label.toLowerCase()}.
                      </p>
                    ) : (
                      entries
                        .filter((e) => e.meal_slot === meal)
                        .map((e) => (
                          <div
                            key={e.id}
                            className="mt-4 border-t border-border pt-4"
                          >
                            <p className="text-sm font-medium">
                              {e.name_snapshot}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {e.quantity} {e.unit_snapshot} ·{" "}
                              {display(e.grams_snapshot, " g")}
                            </p>
                            <MacroLine values={entryMacros(e)} />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => setLogger({ entry: e, meal })}
                                aria-label={`Edit entry ${e.name_snapshot}`}
                              >
                                Edit
                              </Button>
                              <ConfirmDelete
                                label={`Delete entry ${e.name_snapshot}`}
                                onConfirm={() =>
                                  act(() => deleteEntry(e.id, e.revision))
                                }
                              />
                            </div>
                          </div>
                        ))
                    )}
                    <MacroLine
                      values={sumMacros(
                        entries
                          .filter((e) => e.meal_slot === meal)
                          .map(entryMacros),
                      )}
                    />
                  </Card>
                ),
              )}
            </div>
            <Button variant="outline" onClick={() => setTab("Saved meals")}>
              Log a saved meal
            </Button>
          </>
        )}
        {tab === "Food library" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Find your everyday foods
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Norwegian search · Values per 100 g of edible food.
                </p>
              </div>
              <Button onClick={() => editFood()}>
                <Plus size={16} />
                Create food
              </Button>
            </div>
            {foodEditor && (
              <FoodEditor
                value={foodEditor}
                onChange={setFoodEditor}
                onCancel={() => setFoodEditor(null)}
                onSave={() =>
                  act(
                    () => saveFood(foodEditor),
                    () => setFoodEditor(null),
                  )
                }
              />
            )}
            <FoodSearch
              foods={activeFoods}
              onChoose={(food) => {
                setLogger({ food, meal: defaultMeal });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              chooseLabel="Log"
              onFavorite={(food) =>
                act(() => favoriteNutrition("food", food.id, !food.favorite))
              }
              onEdit={(food) => editFood(food)}
              onRemove={(food) =>
                act(() => archiveNutrition("food", food.id, food.revision))
              }
              userId={data.userId}
            />
          </>
        )}
        {tab === "Saved meals" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Meals worth repeating</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Recipes are reusable templates. Only logging a portion counts
                  as consumed food.
                </p>
              </div>
              <Button
                onClick={() =>
                  setRecipeEditor({
                    id: crypto.randomUUID(),
                    revision: 0,
                    name: "",
                    servings: 1,
                    instructions: "",
                    ingredients: [],
                  })
                }
              >
                <Plus size={16} />
                Create recipe
              </Button>
            </div>
            {recipeEditor && (
              <RecipeEditor
                value={recipeEditor}
                foods={data.foods}
                onChange={setRecipeEditor}
                onCancel={() => setRecipeEditor(null)}
                onSave={() => {
                  const {
                    id,
                    revision,
                    name,
                    servings,
                    instructions,
                    ingredients,
                  } = recipeEditor;
                  act(
                    () =>
                      saveRecipe({
                        id,
                        revision,
                        name,
                        servings,
                        instructions,
                        ingredients,
                      }),
                    () => setRecipeEditor(null),
                  );
                }}
              />
            )}
            {data.recipes.length === 0 && !recipeEditor && (
              <Card>
                <Leaf className="mb-3 text-primary" />
                <h3 className="font-semibold">Start with a meal you love.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Combine foods, define the number of servings, and log any
                  portion when you eat it.
                </p>
              </Card>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {[...data.recipes]
                .sort(
                  (a, b) =>
                    Number(!!b.favorite) - Number(!!a.favorite) ||
                    a.name.localeCompare(b.name),
                )
                .map((recipe) => (
                  <Card key={recipe.id}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">{recipe.name}</h3>
                      <Button
                        variant="ghost"
                        aria-label={`${recipe.favorite ? "Unfavorite" : "Favorite"} recipe ${recipe.name}`}
                        aria-pressed={!!recipe.favorite}
                        onClick={() =>
                          act(() =>
                            favoriteNutrition(
                              "recipe",
                              recipe.id,
                              !recipe.favorite,
                            ),
                          )
                        }
                      >
                        <Star
                          size={17}
                          fill={recipe.favorite ? "currentColor" : "none"}
                        />
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {recipe.servings} servings · {recipe.ingredients.length}{" "}
                      ingredients · Per serving:
                    </p>
                    <MacroLine
                      values={recipeNutrition(recipe, data.foods).perServing}
                    />
                    {recipe.instructions && (
                      <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">
                        {recipe.instructions}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          setLogger({ recipe, meal: "lunch" });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        aria-label={`Log recipe ${recipe.name}`}
                      >
                        Log portion
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRecipeEditor(recipe)}
                        aria-label={`Edit recipe ${recipe.name}`}
                      >
                        Edit
                      </Button>
                      <ConfirmDelete
                        label={`Remove recipe ${recipe.name}`}
                        onConfirm={() =>
                          act(() =>
                            archiveNutrition(
                              "recipe",
                              recipe.id,
                              recipe.revision,
                            ),
                          )
                        }
                      />
                    </div>
                  </Card>
                ))}
            </div>
          </>
        )}
        {tab === "Goals & history" && (
          <>
            <GoalEditor
              key={`${date}-${goal?.id ?? "none"}`}
              date={date}
              goal={goal}
              onSave={(values) => act(() => saveGoals(values))}
            />
            <NutritionHistory
              entries={data.entries}
              goals={data.goals}
              date={date}
            />
          </>
        )}
      </fieldset>
      <p className="my-6 text-xs leading-6 text-muted-foreground">
        Food composition source:{" "}
        <a
          className="text-primary underline"
          href="https://www.matvaretabellen.no/"
          target="_blank"
          rel="noreferrer"
        >
          Matvaretabellen — Mattilsynet
        </a>
        . Cached Norwegian catalog; values and portion weights describe edible
        food. Additional nutrients are available in food details. Personal foods
        are labeled separately. Removing a food or recipe archives it and
        preserves recorded history.
      </p>
    </>
  );
}
