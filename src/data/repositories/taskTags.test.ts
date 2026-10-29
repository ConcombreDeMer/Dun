import type { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { taskTags } from "../schema";
import { expectDataError } from "../testing/expectDataError";
import { createTestDatabase } from "../testing/testDatabase";
import {
  idSequence,
  T0,
  testRepositoryOptions,
  type TestRepositoryOptions,
} from "../testing/testClock";
import { createTagRepository } from "./tags";
import { createTaskRepository } from "./tasks";
import { createTaskTagRepository, type TaskTagRepository } from "./taskTags";

const THU_29 = "2026-10-29";

let options: TestRepositoryOptions;
let repo: TaskTagRepository;

/*
 * Tasks `task-1` and `task-2`; tags `tag-1` (Sport), `tag-2` (Maison),
 * `tag-3` (Travail) and `tag-4` (Courses).
 */
beforeEach(() => {
  options = testRepositoryOptions(createTestDatabase());
  repo = createTaskTagRepository({ ...options, newId: idSequence("link") });

  const tasks = createTaskRepository({ ...options, newId: idSequence("task") });
  tasks.create({ name: "Courir", date: THU_29 });
  tasks.create({ name: "Ranger", date: THU_29 });

  const tags = createTagRepository({ ...options, newId: idSequence("tag") });
  for (const name of ["Sport", "Maison", "Travail", "Courses"]) {
    tags.create({ name, color: "#ff0000" });
  }
});

/** Tag names of each task, as `listForTasks` returns them. */
function tagNames(taskIds: readonly string[]) {
  return repo
    .listForTasks(taskIds)
    .all()
    .map(({ taskId, tag }) => `${taskId}:${tag.name}`);
}

const allLinks = () => options.db.select().from(taskTags).all();

describe("listForTasks", () => {
  it("returns the tags of the given tasks, by tag name", () => {
    repo.setForTask("task-1", ["tag-1", "tag-2"]);
    repo.setForTask("task-2", ["tag-3"]);

    expect(tagNames(["task-1", "task-2"])).toEqual([
      "task-1:Maison",
      "task-1:Sport",
      "task-2:Travail",
    ]);
    expect(tagNames(["task-2"])).toEqual(["task-2:Travail"]);
    expect(tagNames([])).toEqual([]);
  });

  it("returns the whole tag", () => {
    repo.setForTask("task-1", ["tag-1"]);

    expect(repo.listForTasks(["task-1"]).all()).toEqual([
      {
        taskId: "task-1",
        tag: {
          id: "tag-1",
          createdAt: T0,
          updatedAt: T0,
          deletedAt: null,
          name: "Sport",
          color: "#ff0000",
        },
      },
    ]);
  });

  it("is a query accepted by useLiveQuery", () => {
    /* Checked by `tsc` only: this function is never called. */
    const subscribe = (live: typeof useLiveQuery) =>
      live(repo.listForTasks(["task-1"]));

    expect(typeof subscribe).toBe("function");
  });
});

describe("setForTask", () => {
  it("inserts the links with the injected clock and ids", () => {
    repo.setForTask("task-1", ["tag-1", "tag-2"]);

    expect(allLinks()).toEqual([
      {
        id: "link-1",
        createdAt: T0,
        updatedAt: T0,
        deletedAt: null,
        taskId: "task-1",
        tagId: "tag-1",
      },
      {
        id: "link-2",
        createdAt: T0,
        updatedAt: T0,
        deletedAt: null,
        taskId: "task-1",
        tagId: "tag-2",
      },
    ]);
  });

  it("soft-deletes the removed links, inserts the new ones, leaves the kept ones untouched", () => {
    repo.setForTask("task-1", ["tag-1", "tag-2"]);
    const at = options.advance();

    repo.setForTask("task-1", ["tag-2", "tag-3"]);

    expect(tagNames(["task-1"])).toEqual(["task-1:Maison", "task-1:Travail"]);
    expect(allLinks()).toEqual([
      expect.objectContaining({ tagId: "tag-1", deletedAt: at, updatedAt: at }),
      expect.objectContaining({
        tagId: "tag-2",
        deletedAt: null,
        updatedAt: T0,
      }),
      expect.objectContaining({
        id: "link-3",
        tagId: "tag-3",
        createdAt: at,
        updatedAt: at,
      }),
    ]);
  });

  it("removes every link with an empty list", () => {
    repo.setForTask("task-1", ["tag-1"]);

    repo.setForTask("task-1", []);

    expect(tagNames(["task-1"])).toEqual([]);
    expect(allLinks()).toHaveLength(1);
  });

  it("links a tag again after it was removed", () => {
    repo.setForTask("task-1", ["tag-1"]);
    repo.setForTask("task-1", []);

    repo.setForTask("task-1", ["tag-1"]);

    expect(tagNames(["task-1"])).toEqual(["task-1:Sport"]);
    expect(allLinks()).toHaveLength(2);
  });

  it("accepts three tags on a task", () => {
    repo.setForTask("task-1", ["tag-1", "tag-2", "tag-3"]);

    expect(tagNames(["task-1"])).toHaveLength(3);
  });

  describe("refuses, without modifying anything", () => {
    beforeEach(() => {
      repo.setForTask("task-1", ["tag-1"]);
      options.advance();
    });

    const unchanged = () => {
      expect(allLinks()).toEqual([
        expect.objectContaining({ tagId: "tag-1", deletedAt: null }),
      ]);
    };

    it("a fourth tag", () => {
      expect(() =>
        repo.setForTask("task-1", ["tag-1", "tag-2", "tag-3", "tag-4"]),
      ).toThrow(RangeError);
      unchanged();
    });

    it("a duplicate tag", () => {
      expect(() => repo.setForTask("task-1", ["tag-2", "tag-2"])).toThrow(
        RangeError,
      );
      unchanged();
    });

    it("a deleted or missing tag", () => {
      createTagRepository(options).remove("tag-2");

      expectDataError(() => repo.setForTask("task-1", ["tag-2"]), "not_found");
      expectDataError(
        () => repo.setForTask("task-1", ["tag-3", "missing"]),
        "not_found",
      );
      unchanged();
    });

    it("a deleted or missing task", () => {
      createTaskRepository(options).remove("task-2");

      expectDataError(() => repo.setForTask("task-2", ["tag-2"]), "not_found");
      expectDataError(() => repo.setForTask("missing", ["tag-2"]), "not_found");
      unchanged();
    });
  });
});
