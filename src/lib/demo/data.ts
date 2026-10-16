// All preview fixtures live here. They must never be written to production tables.
export const demoDate = "2026-10-16";
export const week = [
  { day: "Mon", volume: 4200, calories: 2180, weight: 75.4 },
  { day: "Tue", volume: 6100, calories: 2320, weight: 75.3 },
  { day: "Wed", volume: 0, calories: 2050, weight: 75.5 },
  { day: "Thu", volume: 5400, calories: 2260, weight: 75.2 },
  { day: "Fri", volume: 6800, calories: 1840, weight: 75.1 },
  { day: "Sat", volume: 0, calories: 0, weight: null },
  { day: "Sun", volume: 0, calories: 0, weight: null },
];
export const routines = [
  {
    name: "Upper body strength",
    category: "STRENGTH",
    detail: "6 exercises · 55 min",
    color: "sage",
    exercises: [
      "Barbell bench press",
      "Bent-over row",
      "Overhead press",
      "Lat pulldown",
      "Lateral raise",
      "Triceps pushdown",
    ],
  },
  {
    name: "Lower body strength",
    category: "STRENGTH",
    detail: "5 exercises · 50 min",
    color: "peach",
    exercises: [
      "Barbell squat",
      "Romanian deadlift",
      "Leg press",
      "Leg curl",
      "Calf raise",
    ],
  },
  {
    name: "Full body essentials",
    category: "STRENGTH",
    detail: "5 exercises · 45 min",
    color: "lavender",
    exercises: [
      "Goblet squat",
      "Dumbbell press",
      "Cable row",
      "Hip thrust",
      "Plank",
    ],
  },
];
export const meals = [
  {
    name: "Greek yogurt & berries",
    time: "Breakfast · 08:15",
    calories: 380,
    protein: 28,
    carbs: 48,
    fat: 8,
    icon: "🥣",
  },
  {
    name: "Chicken & quinoa bowl",
    time: "Lunch · 12:30",
    calories: 620,
    protein: 46,
    carbs: 65,
    fat: 19,
    icon: "🥗",
  },
  {
    name: "Banana & peanut butter",
    time: "Snack · 15:00",
    calories: 240,
    protein: 7,
    carbs: 32,
    fat: 9,
    icon: "🍌",
  },
  {
    name: "Salmon & roasted vegetables",
    time: "Dinner · 18:30",
    calories: 600,
    protein: 51,
    carbs: 40,
    fat: 28,
    icon: "🍽️",
  },
];
export const scheduled = [
  {
    date: "2026-10-12",
    title: "Upper body strength",
    kind: "workout",
    time: "17:00",
    status: "Completed",
  },
  {
    date: "2026-10-13",
    title: "Lower body strength",
    kind: "workout",
    time: "17:30",
    status: "Completed",
  },
  {
    date: "2026-10-15",
    title: "Full body essentials",
    kind: "workout",
    time: "16:00",
    status: "Completed",
  },
  {
    date: "2026-10-16",
    title: "Upper body strength",
    kind: "workout",
    time: "17:00",
    status: "Planned",
  },
  {
    date: "2026-10-17",
    title: "Meal prep for the week",
    kind: "meal",
    time: "11:00",
    status: "Planned",
  },
];
