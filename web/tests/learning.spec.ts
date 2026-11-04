// Learning levels: anything unknown from the client falls back to a general audience, and the level reaches the prompt.
import { expect, test } from "@playwright/test";
import { learningGuidance, learningShortLabel, normalizeLearningLevel } from "../lib/learning";
import { vibeSystem } from "../lib/prompts";

test.describe("learning levels @new", () => {
  test("unknown values fall back to a general audience", () => {
    for (const bad of [undefined, null, "", "grade-99", 7, { value: "university" }]) {
      expect(normalizeLearningLevel(bad)).toBe("general");
      expect(learningShortLabel(bad)).toBe("General audience");
    }
    expect(normalizeLearningLevel("grades-7-9")).toBe("grades-7-9");
    expect(learningShortLabel("grades-7-9")).toBe("Grades 7–9");
  });

  test("the read prompt carries the level", () => {
    expect(vibeSystem(true, learningGuidance("grades-1-3"))).toContain("Learning level: Elementary school, grades 1–3.");
    expect(vibeSystem(false)).toContain("Learning level: General audience.");
  });
});
