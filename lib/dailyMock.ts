export type DailyCompletionDay = {
    dayLabel: string;
    completionPercent: number;
};

export type DailyPendingTask = {
    id: number;
    name: string;
    description: string;
    done: boolean;
    date: string;
    delay_count?: number | null;
    late_adjusted_at?: string | null;
    resolved_at?: string | null;
};

export const dailyUserName = 'Lucas';

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

export const dailyPendingTasks: DailyPendingTask[] = [
    {
        id: 301,
        name: 'Modifier',
        description: '',
        done: false,
        date: '2026-06-13',
        delay_count: 1,
    },
    {
        id: 302,
        name: 'Relire la note produit',
        description: '',
        done: false,
        date: '2026-06-14',
    },
    {
        id: 303,
        name: 'Préparer le brief',
        description: '',
        done: false,
        date: '2026-06-15',
        delay_count: 2,
    },
    {
        id: 304,
        name: 'Envoyer le compte rendu',
        description: '',
        done: false,
        date: '2026-06-12',
    },
    {
        id: 305,
        name: 'Finaliser la maquette',
        description: '',
        done: false,
        date: '2026-06-11',
        delay_count: 1,
    },
    {
        id: 306,
        name: 'Appeler Lucas',
        description: '',
        done: false,
        date: '2026-06-10',
    },
    {
        id: 307,
        name: 'Classer les documents',
        description: '',
        done: false,
        date: '2026-06-09',
    },
    {
        id: 308,
        name: 'Planifier la prochaine session',
        description: '',
        done: false,
        date: '2026-06-08',
        delay_count: 3,
    },
];
