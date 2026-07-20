import type { CharacterImageName } from "@/lib/imageHelper";

export type OnboardingStepType =
  | "text"
  | "name"
  | "options"
  | "info"
  | "slider"
  | "objective"
  | "objectiveQuestion"
  | "longTerm"
  | "trial";

export type CharacterPlacement = {
  top: number;
  left: number;
  size: number;
};

export type CharacterPosition = "centered" | "medium" | "high";

export type OnboardingStep = {
  id: string;
  type: OnboardingStepType;
  character: CharacterImageName;
  characterPosition: CharacterPosition;
  hideCharacter?: boolean;
  title?: string;
  titleParts?: OnboardingTextPart[];
  titleBeforeName?: string;
  titleAfterName?: string;
  body?: string;
  buttonTitle?: string;
  options?: string[];
  selectionMode?: "single" | "multiple";
};

export type OnboardingTextPart = {
  text: string;
  strong?: boolean;
};

export type LocalizedSliderOption = {
  days: number;
  label: string;
};

type OnboardingTranslator = (key: string) => string;

export function createSliderOptions(t: OnboardingTranslator): LocalizedSliderOption[] {
  return [
    { days: 1, label: t("onboarding.tutorial.sliderOptions.oneDay") },
    { days: 2, label: t("onboarding.tutorial.sliderOptions.twoDays") },
    { days: 3, label: t("onboarding.tutorial.sliderOptions.threeDays") },
    { days: 4, label: t("onboarding.tutorial.sliderOptions.fourDays") },
    { days: 7, label: t("onboarding.tutorial.sliderOptions.oneWeek") },
    { days: 14, label: t("onboarding.tutorial.sliderOptions.twoWeeks") },
  ];
}

export function createOnboardingSteps(t: OnboardingTranslator): OnboardingStep[] {
  return [
  {
    id: "hello",
    type: "text",
    character: "10",
    characterPosition: "centered",
    title: t("onboarding.tutorial.steps.hello.title"),
    titleParts: [{ text: t("onboarding.tutorial.steps.hello.title") }],
    buttonTitle: t("onboarding.tutorial.steps.hello.button"),
  },
  {
    id: "meet-dun",
    type: "text",
    character: "10",
    characterPosition: "centered",
    title: t("onboarding.tutorial.steps.meetDun.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.meetDun.part1") },
      { text: "Dun", strong: true },
      { text: t("onboarding.tutorial.steps.meetDun.part2") },
    ],
  },
  {
    id: "name",
    type: "name",
    character: "11",
    characterPosition: "centered",
    title: t("onboarding.tutorial.steps.name.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.name.part1") },
      { text: t("onboarding.tutorial.steps.name.part2"), strong: true },
      { text: " ?" },
    ],
  },
  {
    id: "nice-to-meet-you",
    type: "text",
    character: "21",
    characterPosition: "centered",
    titleBeforeName: t("onboarding.tutorial.steps.niceToMeetYou.beforeName"),
    titleAfterName: t("onboarding.tutorial.steps.niceToMeetYou.afterName"),
  },
  {
    id: "presentations",
    type: "text",
    character: "12",
    characterPosition: "centered",
    title: t("onboarding.tutorial.steps.presentations.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.presentations.part1") },
      { text: t("onboarding.tutorial.steps.presentations.part2"), strong: true },
      { text: t("onboarding.tutorial.steps.presentations.part3") },
    ],
  },
  {
    id: "why",
    type: "options",
    character: "1",
    characterPosition: "high",
    title: t("onboarding.tutorial.steps.why.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.why.part1") },
      { text: t("onboarding.tutorial.steps.why.part2"), strong: true },
      { text: " ?" },
    ],
    selectionMode: "multiple",
    options: [
      t("onboarding.tutorial.steps.why.options.procrastinate"),
      t("onboarding.tutorial.steps.why.options.phone"),
      t("onboarding.tutorial.steps.why.options.control"),
      t("onboarding.tutorial.steps.why.options.time"),
      t("onboarding.tutorial.steps.why.options.projects"),
      t("onboarding.tutorial.steps.why.options.other"),
    ],
  },
  {
    id: "recurrence",
    type: "options",
    character: "1",
    characterPosition: "high",
    title: t("onboarding.tutorial.steps.recurrence.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.recurrence.part1") },
      { text: t("onboarding.tutorial.steps.recurrence.part2"), strong: true },
      { text: t("onboarding.tutorial.steps.recurrence.part3") },
    ],
    selectionMode: "single",
    options: [
      t("onboarding.tutorial.steps.recurrence.options.everyDay"),
      t("onboarding.tutorial.steps.recurrence.options.ninetyPercent"),
      t("onboarding.tutorial.steps.recurrence.options.seventyFivePercent"),
      t("onboarding.tutorial.steps.recurrence.options.fiftyPercent"),
      t("onboarding.tutorial.steps.recurrence.options.lessThanHalf"),
    ],
  },
  {
    id: "lost-time",
    type: "info",
    character: "1",
    characterPosition: "high",
  },
  {
    id: "change",
    type: "text",
    character: "1",
    characterPosition: "centered",
    title: t("onboarding.tutorial.steps.change.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.change.part1") },
      { text: t("onboarding.tutorial.steps.change.part2"), strong: true },
    ],
  },
  {
    id: "system",
    type: "text",
    character: "9",
    characterPosition: "centered",
    title: t("onboarding.tutorial.steps.system.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.system.part1") },
      { text: t("onboarding.tutorial.steps.system.part2"), strong: true },
    ],
  },
  {
    id: "needs",
    type: "options",
    character: "9",
    characterPosition: "high",
    title: t("onboarding.tutorial.steps.needs.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.needs.part1") },
      { text: t("onboarding.tutorial.steps.needs.part2"), strong: true },
      { text: " ?" },
    ],
    selectionMode: "multiple",
    options: [
      t("onboarding.tutorial.steps.needs.options.control"),
      t("onboarding.tutorial.steps.needs.options.intention"),
      t("onboarding.tutorial.steps.needs.options.tasks"),
      t("onboarding.tutorial.steps.needs.options.projects"),
      t("onboarding.tutorial.steps.needs.options.satisfied"),
      t("onboarding.tutorial.steps.needs.options.phone"),
    ],
  },
  {
    id: "rhythm",
    type: "slider",
    character: "9",
    characterPosition: "medium",
    title: t("onboarding.tutorial.steps.rhythm.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.rhythm.part1") },
      { text: t("onboarding.tutorial.steps.rhythm.part2"), strong: true },
      { text: t("onboarding.tutorial.steps.rhythm.part3") },
    ],
  },
  {
    id: "noted",
    type: "text",
    character: "9",
    characterPosition: "medium",
    title: t("onboarding.tutorial.steps.noted.title"),
  },
  {
    id: "objective",
    type: "objective",
    character: "9",
    characterPosition: "medium",
    title: t("onboarding.tutorial.steps.objective.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.objective.part1") },
      { text: t("onboarding.tutorial.steps.objective.part2"), strong: true },
    ],
    buttonTitle: t("onboarding.tutorial.steps.objective.button"),
  },
  {
    id: "determination",
    type: "objectiveQuestion",
    character: "9",
    characterPosition: "high",
    title: t("onboarding.tutorial.steps.determination.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.determination.part1") },
      { text: t("onboarding.tutorial.steps.determination.part2"), strong: true },
      { text: t("onboarding.tutorial.steps.determination.part3") },
    ],
    selectionMode: "single",
    options: [
      t("onboarding.tutorial.steps.determination.options.ultra"),
      t("onboarding.tutorial.steps.determination.options.strong"),
      t("onboarding.tutorial.steps.determination.options.light"),
      t("onboarding.tutorial.steps.determination.options.try"),
    ],
  },
  {
    id: "transform",
    type: "objective",
    character: "9",
    characterPosition: "high",
    title: t("onboarding.tutorial.steps.transform.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.transform.part1") },
      { text: t("onboarding.tutorial.steps.transform.part2") },
      { text: t("onboarding.tutorial.steps.transform.part3"), strong: true },
      { text: t("onboarding.tutorial.steps.transform.part4") },
      { text: t("onboarding.tutorial.steps.transform.part5"), strong: true },
      { text: t("onboarding.tutorial.steps.transform.part6") },
    ],
  },
  {
    id: "long-term",
    type: "longTerm",
    character: "9",
    characterPosition: "high",
  },
  {
    id: "trial",
    type: "trial",
    character: "22",
    characterPosition: "medium",
    buttonTitle: t("common.actions.next"),
    title: t("onboarding.tutorial.steps.trial.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.trial.part1") },
      { text: t("onboarding.tutorial.steps.trial.part2"), strong: true },
      { text: t("onboarding.tutorial.steps.trial.part3") },
      { text: t("onboarding.tutorial.steps.trial.part4"), strong: true },
    ],
  },
  {
    id: "ready",
    type: "text",
    character: "5",
    characterPosition: "centered",
    title: t("onboarding.tutorial.steps.ready.title"),
    titleParts: [
      { text: t("onboarding.tutorial.steps.ready.part1"), strong: true },
      { text: t("onboarding.tutorial.steps.ready.part2") },
      { text: t("onboarding.tutorial.steps.ready.part3"), strong: true },
    ],
    buttonTitle: t("onboarding.tutorial.steps.ready.button"),
  },
  ];
}
