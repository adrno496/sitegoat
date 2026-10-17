import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
export function useLive<T>(
  query: () => Promise<T>,
  deps: unknown[],
  initial: T,
) {
  const [value, setValue] = useState(initial),
    [error, setError] = useState("");
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (v) => {
        setValue(v);
        setError("");
      },
      error: (e) => setError(String(e)),
    });
    return () => sub.unsubscribe();
    // Queries are intentionally governed by caller dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { value, error };
}
