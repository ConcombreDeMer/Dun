import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { tags, taskTags } from "../schema";
import { expectDataError } from "../testing/expectDataError";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import { createTagRepository, type TagRepository } from "./tags";
import { createTaskRepository } from "./tasks";
import { createTaskTagRepository } from "./taskTags";

let options: TestRepositoryOptions;
let repo: TagRepository;

beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createTagRepository({ ...options, newId: idSequence("tag") });
});

const names = (rows: readonly { name: string }[]) => rows.map((t) => t.name);

describe("list", () => {
  it("returns the tags that are not deleted, by name", () => {
    repo.create({ name: "Travail", color: "#0000ff" });
    repo.create({ name: "Maison", color: "#00ff00" });
    repo.create({ name: "Sport", color: "#ff0000" });
    repo.remove("tag-3");

    expect(names(repo.list().all())).toEqual(["Maison", "Travail"]);
  });

  it("is a query accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) => live(repo.list());

    expect(typeof subscribe).toBe("function");
  });
});

describe("create", () => {
  it("creates a tag with the injected clock and id", () => {
    const tag = repo.create({ name: "Sport", color: "#ff0000" });

    expect(tag).toEqual({
      id: "tag-1",
      createdAt: T0,
      updatedAt: T0,
      deletedAt: null,
      name: "Sport",
      color: "#ff0000",
    });
    expect(repo.list().all()).toEqual([tag]);
  });

  it("refuses a name already taken by a tag that is not deleted", () => {
    repo.create({ name: "Sport", color: "#ff0000" });

    expectDataError(
      () => repo.create({ name: "Sport", color: "#00ff00" }),
      "duplicate_tag_name",
    );
    expect(repo.list().all()).toHaveLength(1);
  });

  it("accepts the name again once the first tag is deleted", () => {
    repo.create({ name: "Sport", color: "#ff0000" });
    repo.remove("tag-1");

    repo.create({ name: "Sport", color: "#00ff00" });

    expect(repo.list().all()).toEqual([
      expect.objectContaining({ id: "tag-2", color: "#00ff00" }),
    ]);
  });

  it("tells names apart by case, as Supabase does", () => {
    repo.create({ name: "Sport", color: "#ff0000" });
    repo.create({ name: "sport", color: "#00ff00" });

    expect(repo.list().all()).toHaveLength(2);
  });
});

describe("update", () => {
  it("renames and recolors a tag, and fills updated_at", () => {
    repo.create({ name: "Sport", color: "#ff0000" });
    const at = options.advance();

    repo.update("tag-1", { name: "Course", color: "#00ff00" });

    expect(repo.list().all()).toEqual([
      expect.objectContaining({
        name: "Course",
        color: "#00ff00",
        createdAt: T0,
        updatedAt: at,
      }),
    ]);
  });

  it("refuses a name already taken", () => {
    repo.create({ name: "Sport", color: "#ff0000" });
    repo.create({ name: "Maison", color: "#00ff00" });

    expectDataError(
      () => repo.update("tag-2", { name: "Sport" }),
      "duplicate_tag_name",
    );
    expect(names(repo.list().all())).toEqual(["Maison", "Sport"]);
  });

  it("refuses a missing or deleted tag", () => {
    repo.create({ name: "Sport", color: "#ff0000" });
    repo.remove("tag-1");

    expectDataError(() => repo.update("tag-1", { name: "A" }), "not_found");
    expectDataError(() => repo.update("missing", { name: "A" }), "not_found");
  });

  it("lets other errors through", () => {
    repo.create({ name: "Sport", color: "#ff0000" });

    expect(() =>
      repo.update("tag-1", { name: null as unknown as string }),
    ).toThrow(/NOT NULL constraint failed/);
  });
});

describe("remove", () => {
  it("soft-deletes the tag and its links, keeping the rows", () => {
    const tasks = createTaskRepository({
      ...options,
      newId: idSequence("task"),
    });
    const links = createTaskTagRepository({
      ...options,
      newId: idSequence("link"),
    });
    tasks.create({ name: "Courses", date: "2026-10-29" });
    repo.create({ name: "Sport", color: "#ff0000" });
    repo.create({ name: "Maison", color: "#00ff00" });
    links.setForTask("task-1", ["tag-1", "tag-2"]);
    const at = options.advance();

    repo.remove("tag-1");

    expect(links.listForTasks(["task-1"]).all()).toEqual([
      { taskId: "task-1", tag: expect.objectContaining({ name: "Maison" }) },
    ]);
    expect(options.db.select().from(tags).all()).toEqual([
      expect.objectContaining({ id: "tag-1", deletedAt: at, updatedAt: at }),
      expect.objectContaining({ id: "tag-2", deletedAt: null, updatedAt: T0 }),
    ]);
    expect(options.db.select().from(taskTags).all()).toEqual([
      expect.objectContaining({ tagId: "tag-1", deletedAt: at, updatedAt: at }),
      expect.objectContaining({ tagId: "tag-2", deletedAt: null }),
    ]);
  });

  it("refuses a missing or already deleted tag", () => {
    repo.create({ name: "Sport", color: "#ff0000" });
    repo.remove("tag-1");

    expectDataError(() => repo.remove("tag-1"), "not_found");
    expectDataError(() => repo.remove("missing"), "not_found");
  });
});
