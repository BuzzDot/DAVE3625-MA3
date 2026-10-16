import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scheduleDates,
  instantInZone,
  dailyMetric,
  healthGoal,
  trend,
  type DiaryData,
  type ScheduleInput,
} from "../../src/lib/diary/domain";
const schedule: ScheduleInput = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "workout",
  templateId: "22222222-2222-4222-8222-222222222222",
  timezone: "Europe/Oslo",
  start: "2026-12-28",
  end: "2027-01-31",
  time: "09:00",
  recurring: true,
  weekdays: [1, 3],
  count: 4,
};
test("bounded recurrence crosses years, honors weekdays/count/end and has no duplicates", () => {
  assert.deepEqual(scheduleDates(schedule), [
    "2026-12-28",
    "2026-12-30",
    "2027-01-04",
    "2027-01-06",
  ]);
  assert.equal(
    scheduleDates({
      ...schedule,
      end: null,
      count: 366,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    }).length,
    366,
  );
  assert.throws(() => scheduleDates({ ...schedule, weekdays: [] }));
  assert.throws(() => scheduleDates({ ...schedule, end: "2028-01-01" }));
  assert.deepEqual(scheduleDates({ ...schedule, recurring: false }), [
    "2026-12-28",
  ]);
});
test("local clocks retain time across DST, reject gaps and choose standard time on overlaps", () => {
  assert.equal(
    instantInZone("2026-03-28", "09:00", "Europe/Oslo"),
    "2026-03-28T08:00:00.000Z",
  );
  assert.equal(
    instantInZone("2026-03-29", "09:00", "Europe/Oslo"),
    "2026-03-29T07:00:00.000Z",
  );
  assert.throws(
    () => instantInZone("2026-03-29", "02:30", "Europe/Oslo"),
    /does not exist/,
  );
  assert.equal(
    instantInZone("2026-10-25", "02:30", "Europe/Oslo"),
    "2026-10-25T01:30:00.000Z",
  );
  assert.throws(
    () => instantInZone("2011-12-30", "12:00", "Pacific/Apia"),
    /does not exist/,
  );
});
test("health aggregation preserves missing versus zero, events versus daily totals, dated targets", () => {
  const data = {
    metrics: [
      { code: "water", aggregation: "sum" },
      { code: "steps", aggregation: "latest" },
      { code: "heart_rate", aggregation: "average" },
    ],
    observations: [
      {
        id: "1",
        metric_code: "water",
        value: 250,
        local_date: "2026-10-16",
        observed_at: "2026-10-16T08:00:00Z",
      },
      {
        id: "2",
        metric_code: "water",
        value: 500,
        local_date: "2026-10-16",
        observed_at: "2026-10-16T10:00:00Z",
      },
      {
        id: "3",
        metric_code: "steps",
        value: 5000,
        local_date: "2026-10-16",
        observed_at: "2026-10-16T08:00:00Z",
      },
      {
        id: "4",
        metric_code: "steps",
        value: 0,
        local_date: "2026-10-16",
        observed_at: "2026-10-16T10:00:00Z",
      },
    ],
    goals: [
      {
        metric_code: "water",
        target: 2000,
        starts_on: "2026-10-01",
        ends_on: "2026-10-15",
      },
      {
        metric_code: "water",
        target: 2500,
        starts_on: "2026-10-16",
        ends_on: null,
      },
    ],
  } as DiaryData;
  assert.equal(dailyMetric(data, "water", "2026-10-16"), 750);
  assert.equal(dailyMetric(data, "steps", "2026-10-16"), 0);
  assert.equal(dailyMetric(data, "sleep", "2026-10-16"), null);
  assert.equal(healthGoal(data, "water", "2026-10-15"), 2000);
  assert.equal(healthGoal(data, "water", "2026-10-16"), 2500);
  assert.deepEqual(
    trend(data, "steps", "2026-10-16", 7).map((v) => v.value),
    [null, null, null, null, null, null, 0],
  );
});

test("latest daily totals use entry time to break identical observation clocks", () => {
  const data = {
    metrics: [{ code: "steps", aggregation: "latest" }],
    observations: [
      {
        id: "z",
        metric_code: "steps",
        local_date: "2026-10-16",
        value: 5000,
        observed_at: "2026-10-16T12:00:00Z",
        created_at: "2026-10-16T13:00:00Z",
      },
      {
        id: "a",
        metric_code: "steps",
        local_date: "2026-10-16",
        value: 7500,
        observed_at: "2026-10-16T12:00:00Z",
        created_at: "2026-10-16T14:00:00Z",
      },
    ],
  } as DiaryData;
  assert.equal(dailyMetric(data, "steps", "2026-10-16"), 7500);
});
