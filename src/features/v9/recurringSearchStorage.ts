import { RECURRING_SEARCHES_KEY, parseRecurringSearches, serializeRecurringSearches, type RecurringSearch } from "./recurringSearchModel";
import { canonicalJSON } from "../backup";
export const RECURRING_LOCK = "journal360.recurring-searches.write";
// All new clients serialize read/compare/write. No migration, no lost updates,
// no unprotected fallback when a browser cannot provide the lock.
export async function mutateRecurringSearch(expected: RecurringSearch | null, next: RecurringSearch | null, storage: Storage = localStorage, locks: LockManager = navigator.locks) {
  if (!locks) throw Error("Verrou inter-onglets indisponible : aucune recherche enregistrée.");
  return locks.request(RECURRING_LOCK, async () => {
    const items = parseRecurringSearches(storage.getItem(RECURRING_SEARCHES_KEY));
    const id = next?.id || expected?.id;
    if (!id) throw Error("Identifiant de recherche absent.");
    const existing = items.find(i=>i.id===id) || null;
    if (canonicalJSON(existing) !== canonicalJSON(expected)) throw Error("Cette recherche a changé dans un autre onglet. Rechargez-la avant de modifier : aucune donnée remplacée.");
    const updated = items.filter(i=>i.id!==id);
    if (next) updated.push(next);
    storage.setItem(RECURRING_SEARCHES_KEY, serializeRecurringSearches(updated));
    window.dispatchEvent(new Event("journal360:recurring-change"));
    return updated;
  });
}
