import { assertTaskTagIds, MAX_TAGS_PER_TASK } from "./tags";

describe("Trois tags maximum sur une tâche.", () => {
  it("la limite vaut 3", () => {
    expect(MAX_TAGS_PER_TASK).toBe(3);
  });

  it("une tâche sans tag est acceptée", () => {
    expect(() => assertTaskTagIds([])).not.toThrow();
  });

  it("une tâche avec trois tags est acceptée", () => {
    expect(() =>
      assertTaskTagIds(["sport", "travail", "maison"]),
    ).not.toThrow();
  });

  it("une tâche avec quatre tags est refusée", () => {
    expect(() =>
      assertTaskTagIds(["sport", "travail", "maison", "courses"]),
    ).toThrow(RangeError);
  });

  it("le même tag ne peut pas être mis deux fois sur une tâche", () => {
    expect(() => assertTaskTagIds(["sport", "sport"])).toThrow(RangeError);
  });

  it("ne modifie pas la liste reçue", () => {
    const tagIds = Object.freeze(["sport", "travail"]);

    expect(() => assertTaskTagIds(tagIds)).not.toThrow();
    expect(tagIds).toEqual(["sport", "travail"]);
  });
});
