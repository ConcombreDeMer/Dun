import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { tasks, taskTags } from "../schema";
import { expectDataError } from "../testing/expectDataError";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import { createTagRepository } from "./tags";
import { createTaskRepository, type TaskRepository } from "./tasks";
import { createTaskTagRepository } from "./taskTags";

/* October 2026. */
const WED_28 = "2026-10-28";
const THU_29 = "2026-10-29";
const FRI_30 = "2026-10-30";

let options: TestRepositoryOptions;
let repo: TaskRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createTaskRepository({ ...options, newId: idSequence("task") });
});

const names = (rows: readonly { name: string }[]) => rows.map((t) => t.name);

describe("create", () => {
  it("creates a task not done, without delay, with the injected clock", () => {
    const task = repo.create({ name: "Courses", date: THU_29 });

    expect(task).toEqual({
      id: "task-1",
      createdAt: T0,
      updatedAt: T0,
      deletedAt: null,
      name: "Courses",
      description: "",
      done: false,
      date: THU_29,
      orderKey: expect.any(String),
      delayCount: 0,
    });
    expect(repo.get("task-1").get()).toEqual(task);
  });

  it("keeps the description", () => {
    repo.create({ name: "Courses", description: "Pain", date: null });

    expect(repo.get("task-1").get()?.description).toBe("Pain");
  });

  it("places the new task at the head of its day", () => {
    repo.create({ name: "A", date: THU_29 });
    repo.create({ name: "B", date: THU_29 });
    repo.create({ name: "C", date: THU_29 });

    expect(names(repo.listDay(THU_29).all())).toEqual(["C", "B", "A"]);
  });

  it("places the new task at the head of the Box", () => {
    repo.create({ name: "A", date: null });
    repo.create({ name: "B", date: null });

    expect(names(repo.listBox().all())).toEqual(["B", "A"]);
  });
});

describe("reads", () => {
  beforeEach(() => {
    repo.create({ name: "Mercredi", date: WED_28 });
    repo.create({ name: "Jeudi", date: THU_29 });
    repo.create({ name: "Vendredi", date: FRI_30 });
    repo.create({ name: "Box", date: null });
  });

  it("listDay returns only the tasks of the day", () => {
    expect(names(repo.listDay(THU_29).all())).toEqual(["Jeudi"]);
  });

  it("listBox returns only the tasks without a date", () => {
    expect(names(repo.listBox().all())).toEqual(["Box"]);
  });

  it("listRange returns the dated tasks between both keys included, by date", () => {
    repo.create({ name: "Jeudi 2", date: THU_29 });

    expect(names(repo.listRange(WED_28, THU_29).all())).toEqual([
      "Mercredi",
      "Jeudi 2",
      "Jeudi",
    ]);
    expect(names(repo.listRange(WED_28, FRI_30).all())).toHaveLength(4);
  });

  it("get returns undefined for a missing task", () => {
    expect(repo.get("missing").get()).toBeUndefined();
  });

  it("a deleted task appears in no read", () => {
    for (const id of ["task-1", "task-2", "task-3", "task-4"]) {
      repo.remove(id);
    }

    expect(repo.listDay(THU_29).all()).toEqual([]);
    expect(repo.listBox().all()).toEqual([]);
    expect(repo.listRange(WED_28, FRI_30).all()).toEqual([]);
    expect(repo.get("task-2").get()).toBeUndefined();
  });

  it("the reads are queries accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) => [
      live(repo.listDay(THU_29)),
      live(repo.listBox()),
      live(repo.listRange(WED_28, FRI_30)),
      live(repo.get("task-1")),
    ];

    expect(typeof subscribe).toBe("function");
  });
});

describe("update", () => {
  it("changes the name, the description and the state, and updated_at", () => {
    repo.create({ name: "Courses", date: THU_29 });
    const at = options.advance();

    repo.update("task-1", { name: "Marché", description: "Fruits" });
    repo.update("task-1", { done: true });

    expect(repo.get("task-1").get()).toMatchObject({
      name: "Marché",
      description: "Fruits",
      done: true,
      date: THU_29,
      createdAt: T0,
      updatedAt: at,
    });
  });

  it("refuses a missing or deleted task", () => {
    repo.create({ name: "Courses", date: THU_29 });
    repo.remove("task-1");

    expectDataError(() => repo.update("task-1", { done: true }), "not_found");
    expectDataError(() => repo.update("missing", { done: true }), "not_found");
  });
});

describe("remove", () => {
  it("soft-deletes the task and its tag links, with the injected clock", () => {
    const tagRepo = createTagRepository({
      ...options,
      newId: idSequence("tag"),
    });
    const links = createTaskTagRepository({
      ...options,
      newId: idSequence("link"),
    });
    repo.create({ name: "Courses", date: THU_29 });
    tagRepo.create({ name: "Maison", color: "#00ff00" });
    links.setForTask("task-1", ["tag-1"]);
    const at = options.advance();

    repo.remove("task-1");

    expect(links.listForTasks(["task-1"]).all()).toEqual([]);
    expect(options.db.select().from(taskTags).all()).toEqual([
      expect.objectContaining({ id: "link-1", deletedAt: at, updatedAt: at }),
    ]);
  });

  it("keeps the row in the table", () => {
    repo.create({ name: "Courses", date: THU_29 });
    const at = options.advance();

    repo.remove("task-1");

    expect(options.db.select().from(tasks).all()).toEqual([
      expect.objectContaining({ id: "task-1", deletedAt: at, updatedAt: at }),
    ]);
  });

  it("refuses a missing or already deleted task", () => {
    repo.create({ name: "Courses", date: THU_29 });
    repo.remove("task-1");

    expectDataError(() => repo.remove("task-1"), "not_found");
    expectDataError(() => repo.remove("missing"), "not_found");
  });
});
