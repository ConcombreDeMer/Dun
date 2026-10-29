import { expectDataError } from "../testing/expectDataError";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import { createTaskRepository, type TaskRepository } from "./tasks";

/*
 * Moving a task to another day (`move`) and reordering it within its day
 * (`place`).
 *
 * October 2026: the open day is Thursday the 29th, Wednesday is closed.
 */
const WED_28 = "2026-10-28";
const THU_29 = "2026-10-29";
const FRI_30 = "2026-10-30";
const OPEN = THU_29;

let options: TestRepositoryOptions;
let repo: TaskRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createTaskRepository({ ...options, newId: idSequence("task") });
});

const names = (rows: readonly { name: string }[]) => rows.map((t) => t.name);

describe("move", () => {
  it("postpones an undone task of a closed day to the open day: delay + 1, at the head", () => {
    repo.create({ name: "Jeudi", date: THU_29 });
    repo.create({ name: "Mercredi", date: WED_28 });
    const at = options.advance();

    repo.move("task-2", THU_29, OPEN);

    expect(repo.get("task-2").get()).toMatchObject({
      date: THU_29,
      delayCount: 1,
      updatedAt: at,
    });
    expect(names(repo.listDay(THU_29).all())).toEqual(["Mercredi", "Jeudi"]);
  });

  it("postpones to a later day", () => {
    repo.create({ name: "Mercredi", date: WED_28 });

    repo.move("task-1", FRI_30, OPEN);

    expect(repo.get("task-1").get()).toMatchObject({
      date: FRI_30,
      delayCount: 1,
    });
  });

  it("keeps the delay for a task from the Box", () => {
    repo.create({ name: "Box", date: null });

    repo.move("task-1", THU_29, OPEN);

    expect(repo.get("task-1").get()).toMatchObject({
      date: THU_29,
      delayCount: 0,
    });
  });

  it("keeps the delay for a move to a closed day", () => {
    repo.create({ name: "Jeudi", date: THU_29 });

    repo.move("task-1", WED_28, OPEN);

    expect(repo.get("task-1").get()).toMatchObject({
      date: WED_28,
      delayCount: 0,
    });
  });

  it("keeps the delay for a done task, and moves to the Box", () => {
    repo.create({ name: "Mercredi", date: WED_28 });
    repo.update("task-1", { done: true });

    repo.move("task-1", THU_29, OPEN);
    repo.move("task-1", null, OPEN);

    expect(repo.get("task-1").get()).toMatchObject({
      date: null,
      delayCount: 0,
    });
  });

  it("does nothing if the date does not change", () => {
    const task = repo.create({ name: "Mercredi", date: WED_28 });
    options.advance();

    repo.move("task-1", WED_28, OPEN);

    expect(repo.get("task-1").get()).toEqual(task);
  });

  it("throws the RangeError of the domain for an invalid key", () => {
    const task = repo.create({ name: "Mercredi", date: WED_28 });

    expect(() => repo.move("task-1", "2026-02-30", OPEN)).toThrow(RangeError);
    expect(() => repo.move("task-1", THU_29, "29/10/2026")).toThrow(RangeError);
    expect(repo.get("task-1").get()).toEqual(task);
  });

  it("refuses a missing or deleted task", () => {
    repo.create({ name: "Mercredi", date: WED_28 });
    repo.remove("task-1");

    expectDataError(() => repo.move("task-1", THU_29, OPEN), "not_found");
  });
});

describe("place", () => {
  /* Day of Thursday, in order: C, B, A. */
  beforeEach(() => {
    repo.create({ name: "A", date: THU_29 });
    repo.create({ name: "B", date: THU_29 });
    repo.create({ name: "C", date: THU_29 });
  });

  const day = () => names(repo.listDay(THU_29).all());

  it("places a task between two neighbors, modifying only its row", () => {
    const at = options.advance();

    repo.place("task-1", "task-3", "task-2");

    expect(day()).toEqual(["C", "A", "B"]);
    expect(repo.get("task-1").get()?.updatedAt).toEqual(at);
    expect(repo.get("task-2").get()?.updatedAt).toEqual(T0);
    expect(repo.get("task-3").get()?.updatedAt).toEqual(T0);
  });

  it("places a task at the head and at the end", () => {
    repo.place("task-1", null, "task-3");
    expect(day()).toEqual(["A", "C", "B"]);

    repo.place("task-1", "task-2", null);
    expect(day()).toEqual(["C", "B", "A"]);
  });

  it("refuses a neighbor of another day", () => {
    repo.create({ name: "Vendredi", date: FRI_30 });

    expectDataError(
      () => repo.place("task-1", "task-4", null),
      "invalid_neighbors",
    );
  });

  it("refuses a deleted, missing or identical neighbor", () => {
    repo.remove("task-2");

    expectDataError(
      () => repo.place("task-1", "task-2", null),
      "invalid_neighbors",
    );
    expectDataError(
      () => repo.place("task-1", null, "missing"),
      "invalid_neighbors",
    );
    expectDataError(
      () => repo.place("task-1", "task-1", null),
      "invalid_neighbors",
    );
  });

  it("refuses neighbors out of order, without modifying anything", () => {
    expectDataError(
      () => repo.place("task-1", "task-2", "task-3"),
      "invalid_neighbors",
    );
    expect(day()).toEqual(["C", "B", "A"]);
    expect(repo.get("task-1").get()?.updatedAt).toEqual(T0);
  });

  it("refuses a missing task", () => {
    expectDataError(() => repo.place("missing", null, null), "not_found");
  });
});
