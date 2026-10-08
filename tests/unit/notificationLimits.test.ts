import { normalizeIntegerInput, NOTIFICATION_REMINDER_LIMITS } from '../../lib/notificationLimits';

describe('bornes confirmées Q08-L', () => {
  test.each([[0, '1'], [1, '1'], [3, '3'], [4, '3']] as const)('édition des répétitions %i → %s', (input, expected) => {
    const { min, max } = NOTIFICATION_REMINDER_LIMITS.repetitions;
    expect(normalizeIntegerInput(input, min, max)).toBe(expected);
  });
  test.each([[14, '15'], [15, '15'], [240, '240'], [241, '240']] as const)('édition du délai %i → %s', (input, expected) => {
    const { min, max } = NOTIFICATION_REMINDER_LIMITS.delayMinutes;
    expect(normalizeIntegerInput(input, min, max)).toBe(expected);
  });
  test('champ vide reste vide, sans inventer une valeur persistée', () => {
    expect(normalizeIntegerInput('', 1, 3)).toBe('');
  });
});
