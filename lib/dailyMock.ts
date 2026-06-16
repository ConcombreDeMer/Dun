export type DailyCompletionDay = {
    dayLabel: string;
    completionPercent: number;
};

export const previousDayCompletion = {
    percent: 100,
    completedTasks: 10,
    totalTasks: 10,
};

export const dailyCompletionDays: DailyCompletionDay[] = [
    { dayLabel: 'Mer', completionPercent: 100 },
    { dayLabel: 'Jeu', completionPercent: 72 },
    { dayLabel: 'Ven', completionPercent: 100 },
    { dayLabel: 'Sam', completionPercent: 48 },
    { dayLabel: 'Dim', completionPercent: 100 },
    { dayLabel: 'Lun', completionPercent: 83 },
    { dayLabel: 'Mar', completionPercent: previousDayCompletion.percent },
];

export const dailyStreak = 12;

export const dailyMotivation = {
    title: 'Belle avance !',
    body: "Tu as complete 10 de tes 12 taches d'hier.",
};
