import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "./data/db";
import type {
  Edition,
  ReadingState,
  Note,
  Preference,
  Job,
} from "./data/model";
export function useLibrary() {
  const [data, setData] = useState<{
    editions: Edition[];
    states: ReadingState[];
    notes: Note[];
    preferences: Preference[];
    jobs: Job[];
  }>({ editions: [], states: [], notes: [], preferences: [], jobs: [] });
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const subscription = liveQuery(async () => ({
      editions: await db.editions.toArray(),
      states: await db.states.toArray(),
      notes: await db.notes.toArray(),
      preferences: await db.preferences.toArray(),
      jobs: await db.jobs.toArray(),
    })).subscribe({
      next: (value) => {
        setData(value);
        setReady(true);
      },
      error: () => {
        setError(
          "Stockage IndexedDB indisponible. Vérifiez les autorisations du navigateur et quittez le mode privé.",
        );
        setReady(true);
      },
    });
    return () => subscription.unsubscribe();
  }, []);
  return { ...data, error, ready };
}
