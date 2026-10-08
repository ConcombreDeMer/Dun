import { fromAppDateKey, isPastAppDateKey, isSameAppDate, toAppDateKey } from '../../lib/date';

describe('dates civiles déjà conformes', () => {
  test.each(['2026-01-01', '2026-12-31', '2028-02-29', '2026-10-25'])('préserve %s sans décalage UTC', (key) => {
    expect(toAppDateKey(fromAppDateKey(key))).toBe(key);
    expect(toAppDateKey(key)).toBe(key);
  });
  test('passage année et mois', () => {
    expect(toAppDateKey(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
    expect(toAppDateKey(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01');
    expect(isPastAppDateKey('2026-12-31', '2027-01-01')).toBe(true);
    expect(isPastAppDateKey('2027-01-01', '2027-01-01')).toBe(false);
  });
  test('comparer une date avec une heure locale ne modifie pas la date', () => {
    expect(isSameAppDate('2026-10-01', new Date(2026, 9, 1, 18))).toBe(true);
  });
});
