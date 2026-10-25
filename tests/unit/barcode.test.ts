import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barcodeSchema,
  fetchBarcodeProduct,
  normalizeBarcodeProduct,
} from "../../src/lib/nutrition/barcode";

const code = "3017620422003";
const product = {
  code,
  product_name: "Example spread",
  brands: "Example",
  product_quantity_unit: "g",
  nutrition_data_per: "100g",
  serving_size: "15 g",
  nutriments: {
    "energy-kcal_100g": 500,
    proteins_100g: 10,
    carbohydrates_100g: 50,
    fat_100g: 30,
  },
};
test("barcode lookup accepts only product code digits, without accepting URLs or query strings", () => {
  assert.equal(barcodeSchema.parse(` ${code} `), code);
  for (const value of [
    "123",
    "https://example.com",
    "3017620422003?x=y",
    {},
    null,
  ])
    assert.equal(barcodeSchema.safeParse(value).success, false);
});
test("barcode normalization retains attributed mass-based macros and explicit gram servings", () => {
  const result = normalizeBarcodeProduct(
    { product },
    code,
    "2026-10-25T12:00:00Z",
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.product.kcal_per_100g, 500);
  assert.equal(result.product.portions[0].grams, 15);
  assert.match(result.product.description, /Open Food Facts \(ODbL\)/);
  assert.match(result.product.description, /3017620422003/);
  assert.match(result.product.description, /2026-10-25T12:00:00Z/);
});
test("provider normalization accepts equivalent leading-zero GTINs while retaining the scanned code", () => {
  for (const [requested, returned] of [
    ["03017620422003", "3017620422003"],
    ["034000470693", "0034000470693"],
    ["00000012345670", "12345670"],
  ]) {
    const result = normalizeBarcodeProduct(
      { product: { ...product, code: returned } },
      requested,
    );
    assert.equal(result.success, true);
    if (!result.success) continue;
    assert.equal(result.product.barcode, requested);
    assert.match(
      result.product.description,
      new RegExp(`Barcode: ${requested}`),
    );
    assert.equal(
      result.product.url,
      `https://world.openfoodfacts.org/product/${returned}`,
    );
  }
  assert.equal(
    normalizeBarcodeProduct({ product }, "13017620422003").success,
    false,
  );
});
test("barcode values preserve unknown versus zero, reject invalid nutrients and convert explicit kJ", () => {
  const result = normalizeBarcodeProduct(
    {
      product: {
        ...product,
        serving_size: "100 ml",
        nutriments: {
          "energy-kj_100g": 418.4,
          proteins_100g: 0,
          carbohydrates_100g: "",
          fat_100g: 101,
        },
      },
    },
    code,
  );
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.product.kcal_per_100g, 100);
  assert.equal(result.product.protein_per_100g, 0);
  assert.equal(result.product.carbs_per_100g, null);
  assert.equal(result.product.fat_per_100g, null);
  assert.deepEqual(result.product.portions, []);
});
test("barcode lookup rejects volume/unclear bases, missing products and mismatched provider codes", () => {
  for (const p of [
    { ...product, product_quantity_unit: "ml" },
    { ...product, product_quantity_unit: "" },
    { ...product, nutrition_data_per: "100ml" },
    { ...product, code: "00000000" },
    {},
  ])
    assert.equal(normalizeBarcodeProduct({ product: p }, code).success, false);
  const result = normalizeBarcodeProduct(
    { product: { ...product, product_quantity_unit: "", quantity: "400 g" } },
    code,
  );
  assert.equal(result.success, true);
});
test("barcode fetch uses a fixed provider, bounded timeout and cache, and handles provider failures", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (url, options) => {
    calls++;
    assert.match(
      String(url),
      /^https:\/\/world.openfoodfacts.org\/api\/v3\/product\/3017620422003.json\?/,
    );
    assert.equal(options?.redirect, "error");
    assert.equal(options?.next?.revalidate, 86400);
    assert.ok(options?.signal);
    return Response.json({ product });
  };
  assert.equal((await fetchBarcodeProduct(code, fetcher)).success, true);
  assert.equal((await fetchBarcodeProduct("bad", fetcher)).success, false);
  assert.equal(calls, 1);
  for (const status of [404, 429, 500]) {
    const result = await fetchBarcodeProduct(
      code,
      async () => new Response(null, { status }),
    );
    assert.equal(result.success, false);
    if (!result.success)
      assert.match(
        result.error,
        status === 404 ? /not found/ : /unavailable or busy/,
      );
  }
  assert.equal(
    (
      await fetchBarcodeProduct(code, async () => {
        throw new Error("offline");
      })
    ).success,
    false,
  );
  assert.equal(
    (await fetchBarcodeProduct(code, async () => new Response("invalid JSON")))
      .success,
    false,
  );
});
