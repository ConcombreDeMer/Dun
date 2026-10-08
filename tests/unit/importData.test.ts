import { readAsStringAsync } from 'expo-file-system/legacy';
import { readUserDataImport } from '../../lib/importData';
import { legacyImport } from '../importFixture';

jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), EncodingType: { UTF8: 'utf8' } }));
jest.mock('../../lib/supabase', () => ({ supabase: {} }));
const readFile = jest.mocked(readAsStringAsync);

test('importe seulement la lecture d’un fichier synthétique', async () => {
  readFile.mockResolvedValue(JSON.stringify(legacyImport()));
  expect((await readUserDataImport('synthetic://backup')).summary.tasksCount).toBe(0);
});
test('JSON tronqué rejeté', async () => {
  readFile.mockResolvedValue('{"tables":');
  await expect(readUserDataImport('synthetic://backup')).rejects.toBeInstanceOf(SyntaxError);
});
test('table absente rejetée', async () => {
  readFile.mockResolvedValue(JSON.stringify({ ...legacyImport(), tables: {} }));
  await expect(readUserDataImport('synthetic://backup')).rejects.toThrow('Missing Profiles data');
});
test('erreur de lecture propagée sans faux succès', async () => {
  readFile.mockRejectedValue(new Error('storage unavailable'));
  await expect(readUserDataImport('synthetic://backup')).rejects.toThrow('storage unavailable');
});
