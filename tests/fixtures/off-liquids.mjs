// Deterministic provider responses, not assertions about current product labels.
// Loaded only by the explicit local verification preload, never by the app.
const base = {
  product_quantity: 250,
  product_quantity_unit: "ml",
  quantity: "250 ml",
  categories_tags: ["en:beverages", "en:energy-drinks"],
  nutrition_data_per: "100g", // OFF's legacy spelling also denotes 100 ml.
  serving_size: "250 ml",
  serving_quantity_unit: "ml",
  serving_quantity: 250,
};
export const offLiquids = {
  9002490100070: {
    ...base,
    code: "9002490100070",
    product_name: "Fixture regular energy drink",
    nutriments: {
      "energy-kcal_100g": 46,
      proteins_100g: 0,
      carbohydrates_100g: 11,
      sugars_100g: 11,
      fat_100g: 0,
    },
  },
  9002490100315: {
    ...base,
    code: "9002490100315",
    product_name: "Fixture sugar-free drink",
    nutriments: {
      "energy-kcal_100g": 3,
      proteins_100g: 0,
      carbohydrates_100g: 0,
      sugars_100g: 0,
      fat_100g: 0,
    },
  },
  3068320120253: {
    ...base,
    code: "3068320120253",
    product_name: "Fixture water",
    quantity: "500 ml",
    product_quantity: 500,
    serving_size: "500 ml",
    serving_quantity: 500,
    categories_tags: ["en:beverages", "en:waters"],
    nutriments: {
      "energy-kcal_100g": 0,
      proteins_100g: 0,
      carbohydrates_100g: 0,
      sugars_100g: 0,
      fat_100g: 0,
    },
  },
  "0999999999999": {
    ...base,
    code: "0999999999999",
    product_name: "Fixture ambiguous units",
    quantity: "250 g",
  },
};
