export const LEARNING_LEVELS = [
  { value: "general", label: "General audience", shortLabel: "General audience", guidance: "General audience" },
  { value: "grades-1-3", label: "Grades 1–3 · Elementary", shortLabel: "Grades 1–3", guidance: "Elementary school, grades 1–3" },
  { value: "grades-4-6", label: "Grades 4–6 · Elementary", shortLabel: "Grades 4–6", guidance: "Elementary school, grades 4–6" },
  { value: "grades-7-9", label: "Grades 7–9 · Middle school", shortLabel: "Grades 7–9", guidance: "Middle school, grades 7–9" },
  { value: "grades-10-12", label: "Grades 10–12 · High school", shortLabel: "Grades 10–12", guidance: "High school, grades 10–12" },
  { value: "university", label: "University", shortLabel: "University", guidance: "University-level learners" },
] as const;

export type LearningLevel = (typeof LEARNING_LEVELS)[number]["value"];

export function normalizeLearningLevel(value: unknown): LearningLevel {
  return LEARNING_LEVELS.find((level) => level.value === value)?.value ?? "general";
}

export function learningGuidance(value: unknown) {
  return LEARNING_LEVELS.find((level) => level.value === value)?.guidance ?? LEARNING_LEVELS[0].guidance;
}

export function learningShortLabel(value: unknown) {
  return LEARNING_LEVELS.find((level) => level.value === value)?.shortLabel ?? LEARNING_LEVELS[0].shortLabel;
}
