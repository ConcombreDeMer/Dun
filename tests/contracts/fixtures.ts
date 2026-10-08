import type { Entity, SnapshotV1, Task } from '../../lib/contracts/data-v1';

export const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
export const SPACE = uuid(1);
export const NOW = '2026-10-02T12:00:00.000Z';
export const meta = (n: number): Entity => ({
  id: uuid(n), spaceId: SPACE, createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: NOW, deletedAt: null, serverRevision: null,
});
export const task = (n: number): Task => ({
  ...meta(n), name: 'Réviser le français', description: 'Une tâche synthétique',
  day: '2026-10-01', order: n, done: false, completedAt: null,
  resolvedAt: null, resolution: null, carriedFromId: null, delayCount: 0,
  lateAdjustedAt: null, tagIds: [],
});
export const snapshot = (): SnapshotV1 => ({
  format: 'dun-productivity', formatVersion: 1, exportedAt: NOW,
  source: { spaceId: SPACE, ownerId: null, generation: uuid(2) },
  tasks: [task(10)], tags: [{ ...meta(20), name: 'Études', color: 'blue' }],
  days: [{ ...meta(30), date: '2026-10-01', timeZone: 'Europe/Paris',
    closedAt: '2026-10-01T22:00:00.000Z', isRest: false, dailyReviewedAt: null }],
  restPeriods: [],
  objective: { ...meta(40), target: 1, confirmedAt: '2026-10-01T16:00:00.000Z',
    startDate: '2026-10-01', firstAchievedAt: null, firstAchievedDate: null },
  preferences: {
    ...meta(50), displayName: 'Exemple', onboardingCompletedAt: '2026-10-01T16:00:00.000Z',
    dailyEnabled: true, lockPastDaysEnabled: true, language: 'fr', theme: 'system',
    textSize: 'medium', palette: 'neutre', calendar: 'slider', progress: 'linear',
    stackCompletedTasks: false,
    statsVisibility: { today: true, future: false, empty: true, rest: true },
    reminders: { enabled: true, hour: 8, minute: 0, weekdays: [1, 2, 3, 4, 5, 6, 7],
      repetitionsEnabled: false, repetitions: 1, delayMinutes: 30 },
  },
});

export const examples = (): Record<string, SnapshotV1> => {
  const creation = snapshot(); creation.tasks[0].tagIds = [uuid(20)];
  const box = snapshot(); box.tasks[0].day = null;
  const report = snapshot();
  report.tasks[0].resolution = 'postponed'; report.tasks[0].resolvedAt = NOW;
  report.tasks.push({ ...task(11), day: null, carriedFromId: uuid(10), delayCount: 1 });
  const deletion = snapshot(); deletion.tasks[0].deletedAt = NOW;
  const rest = snapshot(); rest.days[0].isRest = true;
  rest.restPeriods.push({ ...meta(60), startDate: '2026-10-01', endDate: '2026-10-03',
    activatedAt: '2026-10-01T12:00:00.000Z', cancelledAt: null });
  const achievement = snapshot();
  achievement.objective!.firstAchievedDate = '2026-10-01';
  achievement.objective!.firstAchievedAt = '2026-10-01T22:00:00.000Z';
  // Past edits may now leave an incomplete day without erasing historical success.
  const replaced = snapshot(); replaced.source.ownerId = uuid(80); replaced.source.generation = uuid(81);
  replaced.tasks = [{ ...task(12), day: null }];
  return { creation, box, report, deletion, rest, achievement, replaced };
};
