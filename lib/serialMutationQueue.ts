/** Exécute les choix d'un même réglage dans l'ordre des pressions, même après un échec. */
export function createSerialMutationQueue() {
  let tail: Promise<void> = Promise.resolve();
  return function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.catch(() => undefined).then(operation);
    tail = result.then(() => undefined, () => undefined);
    return result;
  };
}
