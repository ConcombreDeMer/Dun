import { readAsStringAsync } from 'expo-file-system/legacy';
import { calculateStats } from '../../lib/calculateStats';
import { toDailyDateKey } from '../../lib/date';
import { readUserDataImport } from '../../lib/importData';
import { legacyImport } from '../importFixture';

jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), EncodingType: { UTF8: 'utf8' } }));
jest.mock('../../lib/supabase', () => ({ supabase: {} }));

// Explicit, bounded debt: do not add a case without a reproduced defect/owner.
// The strict command executes the exact same assertions as ordinary tests.
const knownDefect = process.env.DUN_STRICT_REGRESSIONS === '1' ? test : test.failing;

knownDefect('[E08 / PROD-008] le Daily bascule à minuit', () => {
  expect(toDailyDateKey(new Date(2026, 9, 1, 0, 1))).toBe('2026-10-01');
});
knownDefect('[E09 / PROD-008] Repos exclu des jours parfaits', () => {
  const stats = calculateStats([{ date: '2026-09-30', total: 1, done_count: 1, is_rest: true }], undefined, new Date(2026, 9, 1, 12));
  expect(stats.perfectDaysCount).toBe(0);
});
knownDefect('[E04 / PROD-012] lignes invalides rejetées avant restauration', async () => {
  const payload = legacyImport();
  jest.mocked(readAsStringAsync).mockResolvedValue(JSON.stringify({ ...payload, tables: { ...payload.tables, Tasks: [null] } }));
  await expect(readUserDataImport('synthetic://backup')).rejects.toThrow();
});
