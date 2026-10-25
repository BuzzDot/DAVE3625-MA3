import { z } from "zod";
import type { FoodInput } from "./types";

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
  const quantity = text(p.quantity, 100);
  const unit = text(p.product_quantity_unit, 10).toLowerCase();
  // OFF's legacy _100g fields can represent 100 ml for drinks. Require mass evidence.
  const mass =
    ["g", "kg", "mg"].includes(unit) ||
    (!unit && /\d\s*(?:kg|mg|g)\b/i.test(quantity));
  if (
    !mass ||
    (p.nutrition_data_per !== "100g" && p.nutrition_data_per !== "serving")
  )
    return {
      success: false,
      error:
        "A gram-based nutrition label could not be confirmed. For liquids or unclear labels, use Create food with verified values per 100 g; 100 ml is not assumed to weigh 100 g.",
    };
  const n = record(p.nutriments);
  const kj = nutrient(n["energy-kj_100g"], 8368);
  const brand = text(p.brands, 80);
  const serving = text(p.serving_size, 100).match(
    /^\s*(\d+(?:[.,]\d+)?)\s*g\s*$/i,
  );
  const grams = serving ? Number(serving[1].replace(",", ".")) : null;
  const url = `https://world.openfoodfacts.org/product/${providerCode.data}`;
  return {
    success: true,
    product: {
      barcode: code,
      url,
      name: `${name}${brand ? ` (${brand})` : ""}`.slice(0, 200),
      description: `Personal copy reviewed from Open Food Facts (ODbL). Barcode: ${code}. ${url}\nRetrieved: ${fetchedAt}. Check against the package; values may be incomplete.`,
      kcal_per_100g:
        nutrient(n["energy-kcal_100g"], 2000) ??
        (kj === null ? null : Math.round((kj / 4.184) * 1000) / 1000),
      protein_per_100g: nutrient(n.proteins_100g, 100),
      carbs_per_100g: nutrient(n.carbohydrates_100g, 100),
      fat_per_100g: nutrient(n.fat_100g, 100),
      portions:
        grams && grams <= 100000
          ? [
              {
                id: "label-serving",
                label: `Label serving (${grams} g)`,
                grams,
              },
            ]
          : [],
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
    "code,product_name,product_name_en,brands,quantity,product_quantity,product_quantity_unit,nutrition_data_per,serving_size,nutriments";
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
