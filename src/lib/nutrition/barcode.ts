import { z } from "zod";
import type { FoodInput, NutritionBasis, Portion } from "./types";

export const barcodeSchema = z
  .string()
  .trim()
  .regex(
    /^\d{8}$|^\d{12,14}$/,
    "Enter an 8, 12, 13 or 14 digit product barcode.",
  );
export type BarcodeProduct = Omit<FoodInput, "id" | "revision"> & {
  barcode: string;
  url: string;
};
export type BarcodeResult =
  | { success: true; product: BarcodeProduct }
  | { success: false; error: string };

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const text = (v: unknown, limit: number) =>
  typeof v === "string" ? v.trim().slice(0, limit) : "";
function nutrient(v: unknown, max: number): number | null {
  // Never coerce missing, empty or implausible provider data to zero.
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max
    ? v
    : null;
}

const unitInfo: Record<string, { basis: NutritionBasis; factor: number }> = {
  g: { basis: "g", factor: 1 },
  kg: { basis: "g", factor: 1000 },
  mg: { basis: "g", factor: 0.001 },
  ml: { basis: "ml", factor: 1 },
  cl: { basis: "ml", factor: 10 },
  dl: { basis: "ml", factor: 100 },
  l: { basis: "ml", factor: 1000 },
};
function measures(value: unknown) {
  return [
    ...text(value, 200).matchAll(
      /(\d+(?:[.,]\d+)?)\s*(kg|mg|ml|cl|dl|g|l)\b/gi,
    ),
  ].map((match) => {
    const unit = unitInfo[match[2].toLowerCase()];
    return {
      basis: unit.basis,
      amount: Number(match[1].replace(",", ".")) * unit.factor,
    };
  });
}
function measurementBasis(p: Record<string, unknown>): NutritionBasis | null {
  const declared = text(p.product_quantity_unit, 10).toLowerCase();
  if (declared && !unitInfo[declared]) return null;
  const packageMeasures = measures(p.quantity);
  const servingMeasures = measures(p.serving_size);
  const servingUnit = text(p.serving_quantity_unit, 10).toLowerCase();
  if (servingUnit && !unitInfo[servingUnit]) return null;
  const evidence = new Set([
    ...(declared ? [unitInfo[declared].basis] : []),
    ...packageMeasures.map((m) => m.basis),
    ...servingMeasures.map((m) => m.basis),
    ...(servingUnit ? [unitInfo[servingUnit].basis] : []),
  ]);
  if (evidence.size !== 1) return null;
  const basis = [...evidence][0];
  const categories = Array.isArray(p.categories_tags) ? p.categories_tags : [];
  // Taxonomy alone (or a product name such as "water") never supplies units.
  // Serving-only volume evidence also needs the provider's beverage taxonomy.
  if (
    !declared &&
    !packageMeasures.length &&
    !(basis === "ml" && categories.includes("en:beverages"))
  )
    return null;
  const per = text(p.nutrition_data_per, 20);
  if (
    !["100g", "100ml", "serving"].includes(per) ||
    (per === "100ml" && basis !== "ml")
  )
    return null;
  // OFF _100g is normalized per 100 g OR per 100 ml, including serving labels.
  // A serving label without a measurable serving cannot establish that normalization.
  if (
    per === "serving" &&
    servingMeasures.length !== 1 &&
    !(servingUnit && nutrient(p.serving_quantity, 100000))
  )
    return null;
  return basis;
}

export function normalizeBarcodeProduct(
  body: unknown,
  code: string,
  fetchedAt = new Date().toISOString(),
): BarcodeResult {
  const data = record(body);
  const p = record(data.product);
  const providerCode = barcodeSchema.safeParse(p.code);
  // OFF normalizes leading zeroes (UPC-A/EAN/GTIN). Compare the same GTIN
  // identity while still rejecting an unrelated product returned by a provider.
  if (
    !providerCode.success ||
    providerCode.data.padStart(14, "0") !== code.padStart(14, "0")
  )
    return {
      success: false,
      error:
        "Product not found. Check the barcode or use Create food to enter the label manually.",
    };
  const name = text(p.product_name, 160) || text(p.product_name_en, 160);
  if (!name)
    return {
      success: false,
      error:
        "This product has no usable name. Use Create food to enter the label manually.",
    };
  const basis = measurementBasis(p);
  if (!basis || p.no_nutrition_data === "on")
    return {
      success: false,
      error:
        "The nutrition basis could not be confirmed as 100 g or 100 ml. Check the package and create a food with verified values and units; grams and milliliters are not interchangeable.",
    };
  const n = record(p.nutriments);
  const kj = nutrient(n["energy-kj_100g"], 8368);
  const brand = text(p.brands, 80);
  const serving = measures(p.serving_size);
  const labelAmount =
    serving.length === 1 && serving[0].basis === basis
      ? serving[0].amount
      : null;
  const sizes = basis === "ml" ? [250, 330, 500] : [];
  const choices: Portion[] = sizes.map((ml) => ({
    id: `volume-${ml}`,
    label: `${ml} ml`,
    ml,
  }));
  if (labelAmount && labelAmount <= 100000)
    choices.unshift({
      id: "label-serving",
      label: `Label serving (${labelAmount} ${basis})`,
      ...(basis === "ml" ? { ml: labelAmount } : { grams: labelAmount }),
    });
  const url = `https://world.openfoodfacts.org/product/${providerCode.data}`;
  return {
    success: true,
    product: {
      barcode: code,
      url,
      name: `${name}${brand ? ` (${brand})` : ""}`.slice(0, 200),
      description: `Personal copy reviewed from Open Food Facts (ODbL). Barcode: ${code}. ${url}\nRetrieved: ${fetchedAt}. Nutrition basis: per 100 ${basis} (OFF normalized _100g fields; label entry: ${text(p.nutrition_data_per, 20)}). Check against the package; values may be incomplete.`,
      nutrition_basis: basis,
      nutrients: {
        sugars: { amount: nutrient(n.sugars_100g, 100), unit: "g" },
      },
      kcal_per_100g:
        nutrient(n["energy-kcal_100g"], 2000) ??
        (kj === null ? null : Math.round((kj / 4.184) * 1000) / 1000),
      protein_per_100g: nutrient(n.proteins_100g, 100),
      carbs_per_100g: nutrient(n.carbohydrates_100g, 100),
      fat_per_100g: nutrient(n.fat_100g, 100),
      portions: choices,
    },
  };
}

export async function fetchBarcodeProduct(
  input: unknown,
  fetcher: typeof fetch = fetch,
): Promise<BarcodeResult> {
  const parsed = barcodeSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  const code = parsed.data;
  const fields =
    "code,product_name,product_name_en,brands,quantity,product_quantity,product_quantity_unit,categories_tags,nutrition_data_per,no_nutrition_data,serving_size,serving_quantity,serving_quantity_unit,nutriments";
  try {
    const response = await fetcher(
      `https://world.openfoodfacts.org/api/v3/product/${code}.json?fields=${fields}`,
      {
        headers: {
          "User-Agent":
            "FormFitnessDiary/0.1 (https://github.com/BuzzDot/DAVE3625-MA3)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
        redirect: "error",
        next: { revalidate: 86400 },
      },
    );
    if (response.status === 404)
      return {
        success: false,
        error:
          "Product not found. Check the barcode or use Create food to enter the label manually.",
      };
    if (!response.ok) throw new Error("Provider unavailable");
    return normalizeBarcodeProduct(await response.json(), code);
  } catch {
    return {
      success: false,
      error:
        "Open Food Facts is unavailable or busy. Try again later, search the food library, or use Create food to enter the label manually.",
    };
  }
}
