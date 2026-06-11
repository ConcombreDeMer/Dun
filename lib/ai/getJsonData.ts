import type { Tag } from "@/lib/tags";
import { toAppDateKey } from "@/lib/date";

const MAX_TASK_NAME_LENGTH = 90;
const MAX_TASK_DESCRIPTION_LENGTH = 180;
const MAX_TASKS_FOR_AI = 40;
const REST_OR_RELATIONSHIP_KEYWORDS = [
  "ami",
  "amis",
  "amie",
  "amies",
  "couple",
  "famille",
  "parent",
  "parents",
  "pause",
  "proche",
  "proches",
  "repos",
  "recuperation",
  "récupération",
  "sante",
  "santé",
  "vacance",
  "vacances",
  "weekend",
  "week-end",
];

type TaskTagJoin = {
  tag_id?: string | null;
};

export type AiTaskInput = {
  id?: number;
  name?: string | null;
  description?: string | null;
  done?: boolean | null;
  date?: string | null;
  completed_at?: string | null;
  delay_count?: number | null;
  late_adjusted_at?: string | null;
  Task_Tags?: TaskTagJoin[] | null;
  tagIds?: string[] | null;
};

export type DayAnalysisPayload = {
  period: "day";
  date: string;
  locale: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    remainingTasks: number;
    completionRate: number;
    delayedTasks: number;
    lateAdjustedTasks: number;
    untaggedTasks: number;
    omittedTasks: number;
  };
  timeContext: {
    localHour: number;
    dayPhase: "morning" | "midday" | "afternoon" | "evening" | "late";
    dateRelation: "past" | "today" | "future";
    isLateInDay: boolean;
  };
  workload: {
    level: "empty" | "low" | "normal" | "high" | "overloaded";
    taskCount: number;
    shouldMention: boolean;
    reason: string;
    lowWorkloadContext: "rest_or_relationships" | "unknown";
  };
  progressProfile: {
    type: "empty" | "not_started_yet" | "slow_start" | "at_risk" | "in_progress" | "strong" | "complete";
    reason: string;
    shouldMention: boolean;
  };
  focus: {
    type: "focused" | "mixed" | "scattered" | "untagged";
    tagCount: number;
    dominantTagName?: string;
  };
  dominantTags: {
    name: string;
    total: number;
    completed: number;
    completionRate: number;
    shareOfDay: number;
  }[];
  completedSummary: {
    count: number;
    names: string[];
    topTags: string[];
  };
  remainingSummary: {
    count: number;
    names: string[];
    topTags: string[];
  };
  friction: {
    delayedTasksCount: number;
    completedDelayedTasksCount: number;
    unresolvedDelayedTasksCount: number;
    mostDelayedTasks: {
      name: string;
      delayCount: number;
      done: boolean;
    }[];
    resolvedDelayedTasks: {
      name: string;
      delayCount: number;
    }[];
  };
  suggestionHints: string[];
  feedbackPlan: {
    strategy:
      | "empty_day"
      | "rest_day"
      | "light_day"
      | "overloaded_day"
      | "high_workload"
      | "complete_day"
      | "strong_progress"
      | "normal_progress"
      | "slow_start"
      | "at_risk"
      | "delayed_task_resolved"
      | "delayed_task_open"
      | "mixed_day";
    tone: "soft" | "encouraging" | "warning" | "motivating";
    mainObservation: string;
    progressObservation: string;
    advice: string;
    facts: string[];
    avoid: string[];
  };
  tags: {
    id: string;
    name: string;
    total: number;
    completed: number;
  }[];
  tasks: {
    name: string;
    description?: string;
    done: boolean;
    tags: string[];
    delayCount: number;
    completedAt?: string;
    lateAdjusted: boolean;
  }[];
};

const compactText = (value: string | null | undefined, maxLength: number) => {
  const compacted = (value ?? "").replace(/\s+/g, " ").trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trim()}...`;
};

const getTaskTagIds = (task: AiTaskInput) => {
  if (task.tagIds?.length) {
    return task.tagIds.filter(Boolean);
  }

  return (task.Task_Tags ?? [])
    .map((tag) => tag.tag_id)
    .filter((tagId): tagId is string => Boolean(tagId));
};

const normalizeSearchText = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

const includesRestOrRelationshipSignal = (values: string[]) => {
  const searchText = normalizeSearchText(values.join(" "));
  return REST_OR_RELATIONSHIP_KEYWORDS.some((keyword) => searchText.includes(normalizeSearchText(keyword)));
};

const getDayPhase = (hour: number): DayAnalysisPayload["timeContext"]["dayPhase"] => {
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "late";
};

const getDateRelation = (dateKey: string): DayAnalysisPayload["timeContext"]["dateRelation"] => {
  const todayKey = toAppDateKey(new Date());

  if (dateKey < todayKey) return "past";
  if (dateKey > todayKey) return "future";
  return "today";
};

const getWorkload = ({
  hasRestOrRelationshipContext,
  totalTasks,
}: {
  hasRestOrRelationshipContext: boolean;
  totalTasks: number;
}): DayAnalysisPayload["workload"] => {
  if (totalTasks === 0) {
    return {
      level: "empty",
      taskCount: totalTasks,
      shouldMention: true,
      reason: "Aucune tâche prévue pour cette journée.",
      lowWorkloadContext: "unknown",
    };
  }

  if (totalTasks < 4) {
    return {
      level: "low",
      taskCount: totalTasks,
      shouldMention: !hasRestOrRelationshipContext,
      reason: hasRestOrRelationshipContext
        ? "Peu de tâches, mais le contexte suggère du repos ou du temps relationnel."
        : "Moins de 4 tâches prévues.",
      lowWorkloadContext: hasRestOrRelationshipContext ? "rest_or_relationships" : "unknown",
    };
  }

  if (totalTasks > 12) {
    return {
      level: "overloaded",
      taskCount: totalTasks,
      shouldMention: true,
      reason: "Plus de 12 tâches prévues, la journée semble trop chargée.",
      lowWorkloadContext: "unknown",
    };
  }

  if (totalTasks >= 9) {
    return {
      level: "high",
      taskCount: totalTasks,
      shouldMention: true,
      reason: "Entre 9 et 12 tâches prévues.",
      lowWorkloadContext: "unknown",
    };
  }

  return {
    level: "normal",
    taskCount: totalTasks,
    shouldMention: false,
    reason: "Charge de tâches normale.",
    lowWorkloadContext: "unknown",
  };
};

const getProgressProfile = ({
  completedTasks,
  completionRate,
  dateRelation,
  localHour,
  totalTasks,
}: {
  completedTasks: number;
  completionRate: number;
  dateRelation: DayAnalysisPayload["timeContext"]["dateRelation"];
  localHour: number;
  totalTasks: number;
}): DayAnalysisPayload["progressProfile"] => {
  if (totalTasks === 0) {
    return {
      type: "empty",
      reason: "Aucune tâche à analyser.",
      shouldMention: false,
    };
  }

  if (completionRate === 100) {
    return {
      type: "complete",
      reason: "Toutes les tâches prévues sont terminées.",
      shouldMention: true,
    };
  }

  if (completionRate >= 70) {
    return {
      type: "strong",
      reason: `${completedTasks} tâche(s) terminée(s) sur ${totalTasks}.`,
      shouldMention: true,
    };
  }

  if (completedTasks === 0) {
    if (dateRelation === "today" && localHour < 11) {
      return {
        type: "not_started_yet",
        reason: "Aucune tâche cochée, mais il est encore tôt dans la journée.",
        shouldMention: false,
      };
    }

    if (dateRelation === "future") {
      return {
        type: "not_started_yet",
        reason: "Journée future, aucune progression attendue pour le moment.",
        shouldMention: false,
      };
    }

    if (dateRelation === "today" && localHour < 17) {
      return {
        type: "slow_start",
        reason: "Aucune tâche cochée alors que la journée est déjà entamée.",
        shouldMention: true,
      };
    }

    return {
      type: "at_risk",
      reason: "Aucune tâche cochée en fin de journée ou sur une journée passée.",
      shouldMention: true,
    };
  }

  if (completionRate < 35 && (dateRelation === "past" || (dateRelation === "today" && localHour >= 17))) {
    return {
      type: "at_risk",
      reason: `${completedTasks} tâche(s) terminée(s) sur ${totalTasks}, avec peu de marge restante.`,
      shouldMention: true,
    };
  }

  return {
    type: "in_progress",
    reason: `${completedTasks} tâche(s) terminée(s) sur ${totalTasks}.`,
    shouldMention: true,
  };
};

const getTopTags = (tasks: { tags: string[] }[]) => {
  const usage = new Map<string, number>();

  tasks.forEach((task) => {
    task.tags.forEach((tag) => {
      usage.set(tag, (usage.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(usage.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);
};

const buildAiFeedbackPlan = ({
  completedSummary,
  dominantTags,
  friction,
  progressProfile,
  remainingSummary,
  stats,
  timeContext,
  workload,
}: Pick<
  DayAnalysisPayload,
  | "completedSummary"
  | "dominantTags"
  | "friction"
  | "progressProfile"
  | "remainingSummary"
  | "stats"
  | "timeContext"
  | "workload"
>): DayAnalysisPayload["feedbackPlan"] => {
  const dominantTag = dominantTags[0];
  const mainTheme = dominantTag?.name ?? "aucun thème clair";
  const hasRestContext = workload.lowWorkloadContext === "rest_or_relationships";
  const hasResolvedDelayedTask = friction.completedDelayedTasksCount > 0;
  const mostDelayedOpenTask = friction.mostDelayedTasks.find((task) => !task.done);

  if (stats.totalTasks === 0) {
    return {
      strategy: "empty_day",
      tone: "soft",
      mainObservation: "Aucune tâche n'est prévue aujourd'hui.",
      progressObservation: "Il n'y a donc pas de progression à analyser.",
      advice: "Profite de cet espace ou ajoute une seule priorité si tu veux cadrer ta journée.",
      facts: ["0 tâche prévue"],
      avoid: ["Ne pas parler d'échec.", "Ne pas pousser à la productivité."],
    };
  }

  if (hasRestContext && workload.level === "low") {
    return {
      strategy: "rest_day",
      tone: "soft",
      mainObservation: `La journée semble volontairement légère, plutôt orientée ${mainTheme}.`,
      progressObservation: "Une faible complétion n'est pas forcément un problème dans ce contexte.",
      advice: "Prends ton temps et garde seulement une petite intention si tu veux rester aligné.",
      facts: [`${stats.totalTasks} tâche(s)`, `thème: ${mainTheme}`],
      avoid: ["Ne pas critiquer la faible charge.", "Ne pas parler de retard global."],
    };
  }

  if (workload.level === "overloaded") {
    return {
      strategy: "overloaded_day",
      tone: "warning",
      mainObservation: `La journée est très chargée avec ${stats.totalTasks} tâches prévues.`,
      progressObservation: `${stats.completedTasks} tâche(s) sont terminée(s), mais la charge reste probablement trop élevée.`,
      advice: "Réduis le périmètre : choisis 2 ou 3 priorités et décale le reste proprement.",
      facts: [`${stats.totalTasks} tâches`, `${stats.remainingTasks} restante(s)`],
      avoid: ["Ne pas féliciter sans nuance.", "Ne pas proposer de tout finir."],
    };
  }

  if (stats.completionRate === 100) {
    return {
      strategy: "complete_day",
      tone: "encouraging",
      mainObservation: "Toutes les tâches prévues sont terminées.",
      progressObservation: dominantTag
        ? `Le thème principal était ${mainTheme}.`
        : "La journée est entièrement bouclée.",
      advice: hasResolvedDelayedTask
        ? "Beau point bonus : tu as aussi débloqué une tâche qui avait du retard."
        : "Tu peux t'arrêter là ou préparer tranquillement la suite.",
      facts: [`${stats.completedTasks}/${stats.totalTasks} terminées`],
      avoid: ["Ne pas ajouter de pression."],
    };
  }

  if (hasResolvedDelayedTask) {
    const resolved = friction.resolvedDelayedTasks[0];

    return {
      strategy: "delayed_task_resolved",
      tone: "encouraging",
      mainObservation: `Tu as débloqué une tâche qui avait du retard : ${resolved.name}.`,
      progressObservation: `${stats.completedTasks} tâche(s) terminée(s) sur ${stats.totalTasks}.`,
      advice: "Garde cet élan, mais évite de rouvrir trop de fronts à la fois.",
      facts: [`${resolved.name}`, `${resolved.delayCount} report(s)`],
      avoid: ["Ne pas minimiser l'effort."],
    };
  }

  if (mostDelayedOpenTask && mostDelayedOpenTask.delayCount >= 2) {
    return {
      strategy: "delayed_task_open",
      tone: "motivating",
      mainObservation: `Une tâche semble traîner : ${mostDelayedOpenTask.name}.`,
      progressObservation: `${remainingSummary.count} tâche(s) restent ouvertes aujourd'hui.`,
      advice: "Clarifie-la, découpe-la, ou replanifie-la franchement plutôt que de la laisser flotter.",
      facts: [`${mostDelayedOpenTask.name}`, `${mostDelayedOpenTask.delayCount} report(s)`],
      avoid: ["Ne pas culpabiliser.", "Ne pas dire de simplement la finir."],
    };
  }

  if (progressProfile.type === "at_risk") {
    return {
      strategy: "at_risk",
      tone: "motivating",
      mainObservation: "La journée semble prendre du retard.",
      progressObservation: `${stats.completedTasks} tâche(s) terminée(s) sur ${stats.totalTasks}, avec ${stats.remainingTasks} restante(s).`,
      advice: timeContext.isLateInDay
        ? "Reprends la main en choisissant une seule tâche réaliste, puis décale le reste."
        : "Choisis maintenant la tâche qui aura le plus d'impact pour relancer la journée.",
      facts: [`${stats.completionRate}% complété`, `phase: ${timeContext.dayPhase}`],
      avoid: ["Ne pas dramatiser.", "Ne pas proposer une longue liste."],
    };
  }

  if (progressProfile.type === "strong") {
    return {
      strategy: "strong_progress",
      tone: "encouraging",
      mainObservation: "Bonne avancée aujourd'hui.",
      progressObservation: `${stats.completedTasks} tâche(s) terminée(s) sur ${stats.totalTasks}.`,
      advice: "Termine une dernière tâche simple ou garde le reste pour plus tard sans casser le rythme.",
      facts: [`${stats.completionRate}% complété`],
      avoid: ["Ne pas surcharger la fin de journée."],
    };
  }

  if (progressProfile.type === "slow_start") {
    return {
      strategy: "slow_start",
      tone: "motivating",
      mainObservation: "La journée démarre doucement.",
      progressObservation: "Aucune tâche n'est encore cochée, mais il reste du temps pour reprendre le fil.",
      advice: "Commence par une tâche courte pour créer de l'élan.",
      facts: [`${stats.totalTasks} tâche(s) prévue(s)`, `phase: ${timeContext.dayPhase}`],
      avoid: ["Ne pas juger.", "Ne pas parler d'échec."],
    };
  }

  if (workload.level === "high") {
    return {
      strategy: "high_workload",
      tone: "motivating",
      mainObservation: `La journée est assez chargée avec ${stats.totalTasks} tâches prévues.`,
      progressObservation: `${stats.completedTasks} tâche(s) terminée(s) sur ${stats.totalTasks}.`,
      advice: "Garde une priorité claire pour éviter de disperser ton énergie.",
      facts: [`${stats.remainingTasks} restante(s)`, `thème: ${mainTheme}`],
      avoid: ["Ne pas présenter la charge comme impossible."],
    };
  }

  if (workload.level === "low") {
    return {
      strategy: "light_day",
      tone: "soft",
      mainObservation: `La journée est légère avec ${stats.totalTasks} tâche(s) prévue(s).`,
      progressObservation: `${stats.completedTasks} tâche(s) terminée(s) sur ${stats.totalTasks}.`,
      advice: "Profite de cette marge ou ajoute une seule priorité si tu veux structurer un peu plus la journée.",
      facts: [`${stats.totalTasks} tâche(s)`, `${stats.completionRate}% complété`],
      avoid: ["Ne pas critiquer la faible charge."],
    };
  }

  return {
    strategy: dominantTag ? "normal_progress" : "mixed_day",
    tone: "soft",
    mainObservation: dominantTag
      ? `La journée est surtout orientée ${mainTheme}.`
      : "La journée avance de façon assez équilibrée.",
    progressObservation: `${stats.completedTasks} tâche(s) terminée(s) sur ${stats.totalTasks}.`,
    advice: completedSummary.count > 0
      ? "Garde le cap avec une prochaine tâche claire."
      : "Choisis une première tâche simple pour lancer le mouvement.",
    facts: [
      `${stats.completionRate}% complété`,
      `${stats.remainingTasks} restante(s)`,
    ],
    avoid: ["Ne pas inventer de tendance."],
  };
};

export const getJsonData = ({
  dateKey,
  locale = "fr-FR",
  tags,
  tasks,
}: {
  dateKey: string;
  locale?: string;
  tags: Tag[];
  tasks: AiTaskInput[];
}): DayAnalysisPayload => {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagStats = new Map<string, { id: string; name: string; total: number; completed: number }>();
  let delayedTasks = 0;
  let lateAdjustedTasks = 0;
  let untaggedTasks = 0;

  const normalizedTasks = tasks.slice(0, MAX_TASKS_FOR_AI).map((task) => {
    const taskTagNames = getTaskTagIds(task)
      .map((tagId) => tagById.get(tagId))
      .filter((tag): tag is Tag => Boolean(tag))
      .map((tag) => tag.name);
    const done = Boolean(task.done);
    const delayCount = task.delay_count ?? 0;
    const lateAdjusted = Boolean(task.late_adjusted_at);
    const description = compactText(task.description, MAX_TASK_DESCRIPTION_LENGTH);

    if (delayCount > 0) delayedTasks += 1;
    if (lateAdjusted) lateAdjustedTasks += 1;
    if (taskTagNames.length === 0) untaggedTasks += 1;

    getTaskTagIds(task).forEach((tagId) => {
      const tag = tagById.get(tagId);
      if (!tag) return;

      const current = tagStats.get(tag.id) ?? {
        id: tag.id,
        name: tag.name,
        total: 0,
        completed: 0,
      };

      current.total += 1;
      current.completed += done ? 1 : 0;
      tagStats.set(tag.id, current);
    });

    return {
      name: compactText(task.name, MAX_TASK_NAME_LENGTH) || "Tâche sans titre",
      ...(description ? { description } : {}),
      done,
      tags: taskTagNames,
      delayCount,
      ...(task.completed_at ? { completedAt: task.completed_at } : {}),
      lateAdjusted,
    };
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.done).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const localHour = new Date().getHours();
  const dateRelation = getDateRelation(dateKey);
  const timeContext = {
    localHour,
    dayPhase: getDayPhase(localHour),
    dateRelation,
    isLateInDay: dateRelation === "past" || (dateRelation === "today" && localHour >= 17),
  };
  const sortedTags = Array.from(tagStats.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const dominantTags = sortedTags
    .slice(0, 3)
    .map((tag) => ({
      name: tag.name,
      total: tag.total,
      completed: tag.completed,
      completionRate: tag.total === 0 ? 0 : Math.round((tag.completed / tag.total) * 100),
      shareOfDay: totalTasks === 0 ? 0 : Math.round((tag.total / totalTasks) * 100),
    }));
  const completedNormalizedTasks = normalizedTasks.filter((task) => task.done);
  const remainingNormalizedTasks = normalizedTasks.filter((task) => !task.done);
  const focusTagCount = sortedTags.length;
  const dominantTag = dominantTags[0];
  const hasRestOrRelationshipContext = includesRestOrRelationshipSignal([
    ...sortedTags.map((tag) => tag.name),
    ...normalizedTasks.flatMap((task) => [task.name, task.description ?? ""]),
  ]);
  const delayedNormalizedTasks = normalizedTasks.filter((task) => task.delayCount > 0);
  const resolvedDelayedTasks = delayedNormalizedTasks
    .filter((task) => task.done)
    .sort((a, b) => b.delayCount - a.delayCount)
    .slice(0, 3)
    .map((task) => ({
      name: task.name,
      delayCount: task.delayCount,
    }));
  const mostDelayedTasks = delayedNormalizedTasks
    .sort((a, b) => b.delayCount - a.delayCount || Number(a.done) - Number(b.done))
    .slice(0, 3)
    .map((task) => ({
      name: task.name,
      delayCount: task.delayCount,
      done: task.done,
    }));
  const workload = getWorkload({ hasRestOrRelationshipContext, totalTasks });
  const progressProfile = getProgressProfile({
    completedTasks,
    completionRate,
    dateRelation,
    localHour,
    totalTasks,
  });
  const suggestionHints = [
    workload.level === "overloaded" ? "Avertir que la journée semble trop chargée et proposer de réduire ou prioriser." : null,
    workload.level === "low" && workload.lowWorkloadContext === "rest_or_relationships"
      ? "Présenter la journée légère comme probablement volontaire, liée au repos ou aux proches."
      : null,
    progressProfile.type === "at_risk" ? "Suggérer de choisir une seule tâche réaliste ou de replanifier proprement." : null,
    resolvedDelayedTasks.length > 0 ? "Féliciter le déblocage d'une tâche qui avait du retard." : null,
    delayedNormalizedTasks.some((task) => !task.done) ? "Suggérer de découper ou clarifier une tâche reportée qui reste ouverte." : null,
    dominantTag ? `Mentionner le thème dominant de la journée: ${dominantTag.name}.` : null,
  ].filter((hint): hint is string => Boolean(hint));
  const stats = {
    totalTasks,
    completedTasks,
    remainingTasks: totalTasks - completedTasks,
    completionRate,
    delayedTasks,
    lateAdjustedTasks,
    untaggedTasks,
    omittedTasks: Math.max(0, totalTasks - normalizedTasks.length),
  };
  const focus: DayAnalysisPayload["focus"] = {
    type: focusTagCount === 0
      ? "untagged"
      : dominantTag && dominantTag.shareOfDay >= 60
        ? "focused"
        : focusTagCount >= 4
          ? "scattered"
          : "mixed",
    tagCount: focusTagCount,
    ...(dominantTag ? { dominantTagName: dominantTag.name } : {}),
  };
  const completedSummary = {
    count: completedNormalizedTasks.length,
    names: completedNormalizedTasks.slice(0, 5).map((task) => task.name),
    topTags: getTopTags(completedNormalizedTasks),
  };
  const remainingSummary = {
    count: remainingNormalizedTasks.length,
    names: remainingNormalizedTasks.slice(0, 5).map((task) => task.name),
    topTags: getTopTags(remainingNormalizedTasks),
  };
  const friction = {
    delayedTasksCount: delayedNormalizedTasks.length,
    completedDelayedTasksCount: resolvedDelayedTasks.length,
    unresolvedDelayedTasksCount: delayedNormalizedTasks.filter((task) => !task.done).length,
    mostDelayedTasks,
    resolvedDelayedTasks,
  };
  const feedbackPlan = buildAiFeedbackPlan({
    completedSummary,
    dominantTags,
    friction,
    progressProfile,
    remainingSummary,
    stats,
    timeContext,
    workload,
  });

  return {
    period: "day",
    date: dateKey,
    locale,
    stats,
    timeContext,
    workload,
    progressProfile,
    focus,
    dominantTags,
    completedSummary,
    remainingSummary,
    friction,
    suggestionHints,
    feedbackPlan,
    tags: sortedTags,
    tasks: normalizedTasks,
  };
};

export const getJsonDataString = (input: Parameters<typeof getJsonData>[0]) => {
  return JSON.stringify(getJsonData(input));
};
