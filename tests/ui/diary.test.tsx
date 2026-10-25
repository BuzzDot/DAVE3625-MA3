import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  ScheduleForm,
  CalendarWorkspace,
} from "../../src/components/diary/calendar";
import type { DiaryData } from "../../src/lib/diary/domain";
import type { TrainingData } from "../../src/lib/training/types";
import type { NutritionData } from "../../src/lib/nutrition/types";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("../../src/app/calendar/actions", () => ({
  createSchedule: vi.fn(async () => ({ success: true, data: "rule" })),
  editSchedule: vi.fn(),
  startScheduledWorkout: vi.fn(),
  consumeScheduledMeal: vi.fn(),
  saveObservation: vi.fn(),
  deleteObservation: vi.fn(),
  setHealthGoal: vi.fn(),
  removeSchedule: vi.fn(),
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: () => null,
  LineChart: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));
import { createSchedule } from "../../src/app/calendar/actions";
import { saveObservation } from "../../src/app/calendar/actions";
import { HealthDiary } from "../../src/components/diary/health";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const training = {
  routines: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Upper body",
      exercises: [],
    },
  ],
  workouts: [],
  exercises: [],
} as unknown as TrainingData;
const nutrition = {
  timezone: "Europe/Oslo",
  today: "2026-10-16",
  recipes: [],
  entries: [],
  goals: [],
} as unknown as NutritionData;
const diary = {
  metrics: [
    {
      code: "water",
      unit: "ml",
      aggregation: "sum",
      minimum: 0,
      maximum: 20000,
    },
  ],
  observations: [],
  goals: [],
  rules: [],
  activities: [],
} as unknown as DiaryData;
it("a scheduling link preselects an owned recipe but still requires preview and acknowledgement", async () => {
  const recipe = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Breakfast recipe",
    revision: 1,
    servings: 1,
    instructions: "",
    ingredients: [],
  };
  render(
    <ScheduleForm
      date="2027-06-14"
      timezone="Europe/Oslo"
      training={training}
      nutrition={{ ...nutrition, recipes: [recipe] }}
      initialKind="meal"
      initialTemplateId={recipe.id}
      onSaved={vi.fn()}
    />,
  );
  expect(
    (screen.getByLabelText("Saved meals") as HTMLSelectElement).value,
  ).toBe(recipe.id);
  expect(screen.queryByRole("button", { name: "Save schedule" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Preview schedule" }));
  expect(createSchedule).not.toHaveBeenCalled();
  vi.mocked(createSchedule).mockRejectedValueOnce(
    new Error("Interrupted connection"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
  await waitFor(() =>
    expect(screen.getByText(/Your preview is still here/)).toBeTruthy(),
  );
  expect(screen.getByText("1 planned meals")).toBeTruthy();
  const first = vi.mocked(createSchedule).mock.calls[0][0];
  fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
  await waitFor(() => expect(screen.getByText("Schedule saved.")).toBeTruthy());
  expect(vi.mocked(createSchedule).mock.calls[1][0]).toEqual(first);
});
it("an unavailable template ID does not become a selectable recipe", () => {
  render(
    <ScheduleForm
      date="2027-06-14"
      timezone="Europe/Oslo"
      training={training}
      nutrition={nutrition}
      initialKind="meal"
      initialTemplateId="33333333-3333-4333-8333-333333333333"
      onSaved={vi.fn()}
    />,
  );
  expect(
    (screen.getByLabelText("Saved meals") as HTMLSelectElement).value,
  ).toBe("");
  expect(
    screen.queryByRole("option", {
      name: "33333333-3333-4333-8333-333333333333",
    }),
  ).toBeNull();
  expect(createSchedule).not.toHaveBeenCalled();
});
it("recurrence preview does not write until the user saves the reviewed dates", async () => {
  render(
    <ScheduleForm
      date="2026-10-16"
      timezone="Europe/Oslo"
      training={training}
      nutrition={nutrition}
      onSaved={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Workout routines"), {
    target: { value: training.routines[0].id },
  });
  fireEvent.click(screen.getByLabelText("Repeat weekly"));
  fireEvent.click(screen.getByLabelText("Mon"));
  fireEvent.change(screen.getByLabelText("Maximum occurrences"), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview schedule" }));
  expect(screen.getByText("3 planned workouts")).toBeTruthy();
  expect(screen.getByText(/2026-10-19 · 12:00/)).toBeTruthy();
  expect(createSchedule).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
  await waitFor(() => expect(createSchedule).toHaveBeenCalledOnce());
  expect(vi.mocked(createSchedule).mock.calls[0][0]).toMatchObject({
    weekdays: [1],
    count: 3,
    recurring: true,
  });
});
it("empty template lists explain the prerequisite for each activity type and prevent preview/save", () => {
  render(
    <ScheduleForm
      date="2026-10-18"
      timezone="Europe/Oslo"
      training={{ ...training, routines: [] }}
      nutrition={nutrition}
      onSaved={vi.fn()}
    />,
  );
  expect(
    (screen.getByLabelText("Workout routines") as HTMLSelectElement).disabled,
  ).toBe(true);
  expect(
    screen.getByRole("option", { name: "No workout routines yet" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Open Workouts to create a routine" })
      .getAttribute("href"),
  ).toBe("/workouts?date=2026-10-18");
  expect(
    (
      screen.getByRole("button", {
        name: "Preview schedule",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(screen.queryByRole("button", { name: "Save schedule" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Activity type"), {
    target: { value: "meal" },
  });
  expect(
    (screen.getByLabelText("Saved meals") as HTMLSelectElement).disabled,
  ).toBe(true);
  expect(
    screen.getByRole("option", { name: "No saved meals yet" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Open Nutrition to create a recipe" })
      .getAttribute("href"),
  ).toBe("/nutrition?date=2026-10-18&view=meals");
  expect(
    (
      screen.getByRole("button", {
        name: "Preview schedule",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(createSchedule).not.toHaveBeenCalled();
});
it("available templates are selectable and changing type clears a previously reviewed schedule", async () => {
  const recipe = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Breakfast recipe",
    revision: 1,
    servings: 1,
    instructions: "",
    ingredients: [],
  };
  render(
    <ScheduleForm
      date="2026-10-18"
      timezone="Europe/Oslo"
      training={training}
      nutrition={{ ...nutrition, recipes: [recipe] }}
      onSaved={vi.fn()}
    />,
  );
  expect(
    (screen.getByLabelText("Workout routines") as HTMLSelectElement).disabled,
  ).toBe(false);
  fireEvent.change(screen.getByLabelText("Workout routines"), {
    target: { value: training.routines[0].id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview schedule" }));
  expect(screen.getByRole("button", { name: "Save schedule" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Activity type"), {
    target: { value: "meal" },
  });
  expect(screen.queryByRole("button", { name: "Save schedule" })).toBeNull();
  expect(screen.queryByRole("option", { name: "Upper body" })).toBeNull();
  expect(screen.getByRole("option", { name: "Breakfast recipe" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Saved meals"), {
    target: { value: recipe.id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview schedule" }));
  fireEvent.click(screen.getByRole("button", { name: "Save schedule" }));
  await waitFor(() => expect(createSchedule).toHaveBeenCalledOnce());
  expect(vi.mocked(createSchedule).mock.calls[0][0]).toMatchObject({
    kind: "meal",
    templateId: recipe.id,
  });
});
it("selecting a date synchronizes recorded nutrition, health and diary links without inventing zeros", () => {
  render(
    <CalendarWorkspace
      diary={diary}
      training={training}
      nutrition={nutrition}
      initialDate="2026-10-16"
    />,
  );
  expect(screen.getAllByText("No consumed meals logged.").length).toBe(1);
  fireEvent.change(screen.getByLabelText("Calendar date"), {
    target: { value: "2026-10-17" },
  });
  expect(
    screen.getByRole("heading", { name: "Completed diary · 2026-10-17" }),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Open nutrition diary" })
      .getAttribute("href"),
  ).toBe("/nutrition?date=2026-10-17");
  expect(screen.getAllByText("Not logged").length).toBeGreaterThan(0);
  fireEvent.change(screen.getByLabelText("Calendar view"), {
    target: { value: "week" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next week" }));
  expect(
    (screen.getByLabelText("Calendar date") as HTMLInputElement).value,
  ).toBe("2026-10-24");
});

it("blank sleep is rejected and a DST sleep interval converts elapsed hours to canonical minutes", async () => {
  vi.mocked(saveObservation).mockResolvedValue({
    success: true,
    data: undefined,
  });
  const data = {
    ...diary,
    metrics: [
      ...diary.metrics,
      {
        code: "sleep",
        unit: "minutes",
        aggregation: "sum",
        minimum: 0,
        maximum: 1440,
      },
    ],
  } as DiaryData;
  render(<HealthDiary data={data} date="2026-10-25" timezone="Europe/Oslo" />);
  fireEvent.change(screen.getByLabelText("Metric"), {
    target: { value: "sleep" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save measurement" }));
  expect(saveObservation).not.toHaveBeenCalled();
  expect(
    screen.getByText("Enter a value or both sleep start and end times."),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Sleep start (optional)"), {
    target: { value: "2026-10-24T23:00" },
  });
  fireEvent.change(screen.getByLabelText("Sleep end (with start)"), {
    target: { value: "2026-10-25T07:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save measurement" }));
  await waitFor(() => expect(saveObservation).toHaveBeenCalledOnce());
  expect(vi.mocked(saveObservation).mock.calls[0][0]).toMatchObject({
    value: 540,
    started_at: "2026-10-24T21:00:00.000Z",
    ended_at: "2026-10-25T06:00:00.000Z",
    local_date: "2026-10-25",
  });
});
