/*
 * Opens the local database and applies the embedded migrations
 * (`src/data/migrations`). The app waits for `ready` before using the
 * database. An opening, configuration or migration error gives `error`;
 * nothing is deleted.
 */

import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { useEffect, useState } from "react";
import { openLocalDatabase } from "./database";
import migrations from "./migrations/migrations";

export type LocalDatabaseState = { ready: boolean; error: Error | undefined };

export function useLocalDatabase(): LocalDatabaseState {
  const [state, setState] = useState<LocalDatabaseState>({
    ready: false,
    error: undefined,
  });

  useEffect(() => {
    let isMounted = true;

    const prepare = async () => {
      try {
        await migrate(openLocalDatabase(), migrations);

        if (isMounted) {
          setState({ ready: true, error: undefined });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            ready: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }
    };

    prepare();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
