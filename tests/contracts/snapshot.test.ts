import { isDateKey, validateSnapshotV1 } from '../../lib/contracts/validate-v1';
import type { SnapshotV1 } from '../../lib/contracts/data-v1';
import { examples, meta, NOW, snapshot, task, uuid } from './fixtures';

test.each(Object.entries(examples()))('%s : sérialisation conserve tout le contenu canonique', (_name, value) => {
  const initial = JSON.stringify(value);
  expect(validateSnapshotV1(JSON.parse(initial))).toEqual(value);
  expect(JSON.stringify(value)).toBe(initial);
});
test('snapshot vide avant onboarding représentable', () => {
  const value = snapshot(); value.tasks = []; value.tags = []; value.days = []; value.objective = null;
  value.preferences.onboardingCompletedAt = null;
  expect(validateSnapshotV1(value)).toBe(value);
});
test('plus de cinq tags restaurables, ordre et grands IDs serveur préservés', () => {
  const value = snapshot();
  value.tags = Array.from({ length: 12 }, (_, i) => ({ ...meta(100 + i), name: `Tag ${i}`, color: 'blue' }));
  value.tasks[0].serverRevision = '9223372036854775807';
  value.tasks[0].tagIds = value.tags.slice(0, 3).map(t => t.id);
  expect(validateSnapshotV1(JSON.parse(JSON.stringify(value)))).toEqual(value);
});
test('deux ordres égaux sont représentables : le lecteur départage par ID', () => {
  const value = snapshot(); value.tasks.push({ ...task(11), order: value.tasks[0].order });
  expect(validateSnapshotV1(value).tasks).toHaveLength(2);
});
test.each(['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '0000-01-01', '2026-1-01'])('date impossible %s rejetée', date => {
  expect(isDateKey(date)).toBe(false);
});
test('jour bissextile valide accepté', () => expect(isDateKey('2028-02-29')).toBe(true));

const invalid: [string, (value: SnapshotV1) => unknown][] = [
  ['version inconnue', v => ({ ...v, formatVersion: 2 })],
  ['champ secret', v => ({ ...v, accessToken: 'synthetic-only' })],
  ['abonnement importé', v => ({ ...v, isPremium: true })],
  ['champ absent', v => { const { source: _source, ...rest } = v; return rest; }],
  ['UUID non canonique', v => { v.tasks[0].id = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'; return v; }],
  ['suppression après dernière modification', v => { v.tasks[0].deletedAt = '2026-10-03T12:00:00.000Z'; return v; }],
  ['fuseau offset sans nom IANA', v => { v.days[0].timeZone = '+01:00'; return v; }],
  ['ID dupliqué', v => { v.tasks.push({ ...v.tasks[0] }); return v; }],
  ['relation orpheline', v => { v.tasks[0].tagIds = [uuid(99)]; return v; }],
  ['relation inter-espace', v => { v.tags[0].spaceId = uuid(99); return v; }],
  ['tâche inter-espace', v => { v.tasks[0].spaceId = uuid(99); return v; }],
  ['4 tags', v => { v.tags = [20, 21, 22, 23].map(n => ({ ...meta(n), name: 'Tag', color: 'blue' })); v.tasks[0].tagIds = v.tags.map(t => t.id); return v; }],
  ['association en double', v => { v.tasks[0].tagIds = [uuid(20), uuid(20)]; return v; }],
  ['tag supprimé associé à une tâche vivante', v => { v.tags[0].deletedAt = NOW; v.tasks[0].tagIds = [uuid(20)]; return v; }],
  ['ordre non entier', v => { v.tasks[0].order = 0.5; return v; }],
  ['date impossible', v => { v.days[0].date = '2026-02-30'; return v; }],
  ['date tâche sans journée', v => { v.tasks[0].day = '2026-10-03'; return v; }],
  ['journée en double', v => { v.days.push({ ...v.days[0], id: uuid(31) }); return v; }],
  ['journée supprimée', v => { v.days[0].deletedAt = NOW; return v; }],
  ['fuseau invalide', v => { v.days[0].timeZone = 'Not/AZone'; return v; }],
  ['horodatage non UTC', v => ({ ...v, exportedAt: '2026-10-02T14:00:00+02:00' })],
  ['horodatage impossible', v => ({ ...v, exportedAt: '2026-02-30T12:00:00.000Z' })],
  ['report orphelin', v => { v.tasks[0].carriedFromId = uuid(99); return v; }],
  ['cycle de report', v => { v.tasks.push(task(11)); v.tasks[0].carriedFromId = uuid(11); v.tasks[1].carriedFromId = uuid(10); return v; }],
  ['complétion sans date', v => { v.tasks[0].done = true; return v; }],
  ['résolution sans date', v => { v.tasks[0].resolution = 'postponed'; return v; }],
  ['révision numérique perdant précision', v => ({ ...v, tasks: [{ ...v.tasks[0], serverRevision: 123 }] })],
  ['objectif cible invalide', v => ({ ...v, objective: { ...v.objective, target: 5 } })],
  ['réussite partielle', v => { v.objective!.firstAchievedAt = NOW; return v; }],
  ['réussite sur journée ouverte', v => { v.days[0].closedAt = null; v.objective!.firstAchievedAt = NOW; v.objective!.firstAchievedDate = '2026-10-01'; return v; }],
  ['rappel hors borne', v => { v.preferences.reminders.delayMinutes = 241; return v; }],
  ['quatrième répétition', v => { v.preferences.reminders.repetitions = 4; return v; }],
  ['jour de semaine invalide', v => { v.preferences.reminders.weekdays = [0]; return v; }],
  ['jour de semaine en double', v => { v.preferences.reminders.weekdays = [1, 1]; return v; }],
  ['préférences supprimées', v => { v.preferences.deletedAt = NOW; return v; }],
];
test.each(invalid)('%s rejeté sans mutation', (_label, corrupt) => {
  const value = corrupt(snapshot()); const before = JSON.stringify(value);
  expect(() => validateSnapshotV1(value)).toThrow('Invalid Dun v1 contract');
  expect(JSON.stringify(value)).toBe(before);
});
