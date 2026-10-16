"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/training/confirm-delete";
import { foodMacros, display } from "@/lib/nutrition/calculations";
import { portions, type Food } from "@/lib/nutrition/types";
import { MacroLine } from "./fields";
export function FoodSearch({
  foods,
  onChoose,
  chooseLabel,
  onFavorite,
  onEdit,
  onRemove,
  userId,
}: {
  foods: Food[];
  onChoose: (f: Food) => void;
  chooseLabel: string;
  onFavorite?: (f: Food) => void;
  onEdit?: (f: Food) => void;
  onRemove?: (f: Food) => void;
  userId?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const matches = foods.filter(
    (f) =>
      query
        .trim()
        .toLocaleLowerCase("nb")
        .split(/\s+/)
        .every((t) =>
          `${f.name} ${f.brand ?? ""} ${f.search_keywords}`
            .toLocaleLowerCase("nb")
            .includes(t),
        ) &&
      (filter !== "favorites" || f.favorite) &&
      (filter !== "personal" || f.owner_id === userId),
  );
  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-xs">
          Search foods
          <input
            className="mt-2"
            type="search"
            placeholder="Try havregryn, laks, egg…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {onFavorite && (
          <label className="text-xs">
            Food filter
            <select
              className="mt-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All foods</option>
              <option value="favorites">Favorites</option>
              <option value="personal">My foods</option>
            </select>
          </label>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {matches.length} matches
        {matches.length > 30 ? " · Showing 30. Refine your search." : ""}
      </p>
      {matches.length === 0 && (
        <Card>
          <p className="text-sm">
            No foods match this search. Try a Norwegian name or create your own
            food.
          </p>
        </Card>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {matches.slice(0, 30).map((food) => (
          <Card key={food.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold">{food.name}</h3>
              {onFavorite && (
                <Button
                  variant="ghost"
                  aria-label={`${food.favorite ? "Unfavorite" : "Favorite"} food ${food.name}`}
                  aria-pressed={!!food.favorite}
                  onClick={() => onFavorite(food)}
                >
                  <Star
                    size={16}
                    fill={food.favorite ? "currentColor" : "none"}
                  />
                </Button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {food.source === "matvaretabellen"
                ? "Matvaretabellen"
                : "Personal food"}{" "}
              {food.external_id ? `· ${food.external_id}` : ""}
            </p>
            <MacroLine values={foodMacros(food)} />
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="min-h-11 cursor-pointer py-3">
                Food details & nutrients
              </summary>
              <p>{food.description}</p>
              <ul className="mt-2 space-y-1">
                {portions(food.portions).map((p) => (
                  <li key={p.id}>
                    {p.label}: {p.grams} g
                  </li>
                ))}
              </ul>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(food.nutrients ?? {}).map(([key, value]) => {
                  const nutrient = value as {
                    amount?: number | null;
                    unit?: string;
                  } | null;
                  return (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {display(
                          nutrient?.amount ?? null,
                          ` ${nutrient?.unit ?? ""}`,
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </details>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="outline"
                aria-label={`${chooseLabel} ${food.name}`}
                onClick={() => onChoose(food)}
              >
                {chooseLabel}
              </Button>
              {food.owner_id === userId && onEdit && (
                <Button
                  variant="ghost"
                  aria-label={`Edit food ${food.name}`}
                  onClick={() => onEdit(food)}
                >
                  Edit
                </Button>
              )}
              {food.owner_id === userId && onRemove && (
                <ConfirmDelete
                  label={`Remove food ${food.name}`}
                  onConfirm={() => onRemove(food)}
                />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
