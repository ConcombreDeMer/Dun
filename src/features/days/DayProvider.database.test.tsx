import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AppState } from "react-native";
import { createDayClosing, type DayClosing } from "../../data/dayClosing";
import { createDayRecordRepository } from "../../data/repositories/dayRecords";
import { createTaskRepository } from "../../data/repositories/tasks";
import { createTestDatabase } from "../../data/testing/testDatabase";
import { DayProvider } from "./DayProvider";
import { useOpenDay } from "./useOpenDay";

/*
 * `DayProvider` with the real `createDayClosing`, on the test database. The
 * triggers are tested with a simulated closing in `DayProvider.test.tsx`.
 */

const THU_29 = "2026-10-29";
const FRI_30 = "2026-10-30";

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation(() => ({ remove: jest.fn() }));
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function wrapperFor(closing: DayClosing) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DayProvider closing={closing}>{children}</DayProvider>;
  };
}

describe("DayProvider, with the local database", () => {
  it("does not record the task done after midnight in the day before", async () => {
    const db = createTestDatabase();
    let time = new Date("2026-10-29T09:00:00+01:00");
    const options = { db, now: () => time };
    const closing = createDayClosing({
      ...options,
      timeZone: () => "Europe/Paris",
    });
    const tasks = createTaskRepository(options);

    const { result } = await renderHook(() => useOpenDay(), {
      wrapper: wrapperFor(closing),
    });
    expect(result.current.openKey).toBe(THU_29);
    const task = await act(() =>
      result.current.write((key) =>
        tasks.create({ name: "Courir", date: key }),
      ),
    );

    /* The screen stayed open: the task is checked at 00:01. */
    time = new Date("2026-10-30T00:01:00+01:00");
    await act(() =>
      result.current.write(() => tasks.update(task.id, { done: true })),
    );

    expect(result.current.openKey).toBe(FRI_30);
    expect(createDayRecordRepository(options).get(THU_29).get()).toMatchObject({
      status: "failed",
      tasks: [{ id: task.id, name: "Courir", done: false, tags: [] }],
    });
    expect(tasks.get(task.id).get()?.done).toBe(true);
  });
});
