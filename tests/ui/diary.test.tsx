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
  fireEvent.change(screen.getByLabelText("Saved template"), {
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
