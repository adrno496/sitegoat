import { useEffect, useLayoutEffect, useRef, useState } from "react";

const key = "journal360Reader";
type Entry = { id: string | null; visit: number };
// Only this running app can reopen a known local edition. Imported content and
// external messages never control parent navigation.
export function useReaderHistory(restore: (id: string | null) => void) {
  const [session] = useState(() => crypto.randomUUID());
  const callback = useRef(restore);
  const active = useRef<string | null>(null);
  const visit = useRef(0);
  const closedThrough = useRef(0);
  useLayoutEffect(() => {
    callback.current = restore;
  }, [restore]);
  function entry(value: unknown): Entry | null {
    if (!value || typeof value !== "object" || !(key in value)) return null;
    const data = (value as Record<string, unknown>)[key] as Record<
      string,
      unknown
    >;
    if (
      !data ||
      typeof data !== "object" ||
      data.session !== session ||
      data.version !== 1 ||
      !Number.isSafeInteger(data.visit) ||
      (data.visit as number) < 0 ||
      (data.id !== null &&
        (typeof data.id !== "string" || !/^[0-9a-f-]{36}$/i.test(data.id)))
    )
      return null;
    return { id: data.id as string | null, visit: data.visit as number };
  }
  function state(id: string | null) {
    return {
      ...(history.state && typeof history.state === "object"
        ? history.state
        : {}),
      [key]: { version: 1, session, id, visit: visit.current },
    };
  }
  function reset() {
    closedThrough.current = visit.current;
    active.current = null;
    if (entry(history.state)?.id) history.replaceState(state(null), "");
  }
  useEffect(() => {
    history.replaceState(state(null), "");
    const pop = () => {
      // Read the parent state, independently of nested frame fragment events.
      const current = entry(history.state);
      const id =
        current && current.visit > closedThrough.current ? current.id : null;
      if (current?.id && !id) history.replaceState(state(null), "");
      if (id === active.current) return;
      active.current = id;
      callback.current(id);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
    // Session is constant; callback stays current through the layout effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  return {
    open(id: string) {
      visit.current++;
      active.current = id;
      if (entry(history.state)?.id) history.replaceState(state(id), "");
      else history.pushState(state(id), "");
    },
    reset,
    // Explicit exit closes this visit in place. Do not guess a history.go()
    // offset: opaque frame anchors also occupy the joint browser history and
    // may not dispatch parent popstate when traversed. Closed visits cannot
    // reopen through those older fragment entries.
    back: reset,
  };
}
