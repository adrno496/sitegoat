import { QuickNews } from "./features/v9/QuickNews";
import { hydrateQuickBriefs } from "./features/hydrateQuickBriefs";
import {
  DisplayFilters,
  DisplayProvider,
  DisplaySettings,
} from "./features/v9/preferences";
import { Dashboard } from "./features/v9/Dashboard";
import { ImportDiagnostics } from "./features/ImportDiagnostics";
import {
  InterfaceProvider,
  InterfaceSettings,
  useInterface,
} from "./features/interfacePreferences";
import { APP_VERSION } from "./config";
import { Diagnostics, recordDiagnostic } from "./features/diagnostics";
import { currentEditions, dayKeyOf } from "./data/day";
import { readingChanges, type ReadingChanges } from "./data/readingChanges";
import {
  SyncIndicator,
  useSyncPending,
  type SyncActivity,
} from "./features/SyncIndicator";
import { DayCard, DayView } from "./features/DayView";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { liveQuery } from "dexie";
import { useRegisterSW } from "virtual:pwa-register/react";
import type { Session } from "@supabase/supabase-js";
import {
  Home,
  Newspaper,
  Library,
  Search,
  BookOpen,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Download,
  Upload,
  ShieldCheck,
  Cloud,
  CloudOff,
  Check,
  Star,
  FileText,
  Clock,
  ChevronRight,
  Moon,
  Sun,
  X,
  HardDrive,
  RefreshCw,
  Trash2,
  Archive,
  Bookmark,
  Brain,
  Shield,
} from "lucide-react";
import { db } from "./data/db";
import {
  now,
  sortEditions,
  dateLabel,
  sizeLabel,
  type Edition,
} from "./data/model";
import { useLibrary } from "./hooks";
import { inspectHTML } from "./features/import";
import { ImportDialog, type Candidate } from "./features/ImportDialog";
import { Reader } from "./features/Reader";
import { useReaderHistory } from "./features/readerHistory";
import {
  exportBackup,
  inspectBackup,
  restoreBackup,
  download,
  type BackupData,
} from "./features/backup";
import {
  cloud,
  remote,
  coordinator,
  unlockCloud,
  type Snapshot,
} from "./features/cloud";
import { fingerprint, synchronizer } from "./features/sync";
import { useDialogFocus } from "./features/dialogFocus";
import { registerFileHandling } from "./features/fileHandling";
import { ArticlesView } from "./features/ArticlesView";
import { indexArticles } from "./data/articles";
import {
  collections,
  inCollection,
  isCollection,
  type ImportDestination,
} from "./data/collections";
import { CollectionView } from "./features/CollectionView";
import { classifyFuture } from "./features/future/routing";
import type { FutureFile } from "./features/future/import";
const UnifiedWorkspace = lazy(
  () => import("./features/unified/UnifiedWorkspace"),
);
const FutureView = lazy(() => import("./features/future/FutureView"));
const FutureImportDialog = lazy(() => import("./features/future/ImportDialog"));
type Tab =
  | "home"
  | "today"
  | "quick"
  | "library"
  | "articles"
  | "search"
  | "memory"
  | "settings"
  | "ai-major"
  | "sentinel"
  | "future";
const tabs = [
  { id: "home" as const, label: "Accueil", icon: Home },
  { id: "today" as const, label: "Aujourd’hui", icon: Home },
  { id: "quick" as const, label: "Actualité rapide", icon: Newspaper },
  { id: "articles" as const, label: "Articles", icon: FileText },
  { id: "library" as const, label: "Bibliothèque", icon: Library },
  { id: "ai-major" as const, label: "IA majeur", icon: Brain },
  { id: "sentinel" as const, label: "Sentinel", icon: Shield },
  { id: "future" as const, label: "Le Futur", icon: Clock },
  { id: "search" as const, label: "Rechercher", icon: Search },
  { id: "memory" as const, label: "Mémoire", icon: BookOpen },
  { id: "settings" as const, label: "Paramètres", icon: Settings },
];
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
export default function App() {
  return (
    <InterfaceProvider>
      <DisplayProvider>
        <JournalApp />
      </DisplayProvider>
    </InterfaceProvider>
  );
}
function JournalApp() {
  const {
    preferences: { options: interfaceOptions },
  } = useInterface();
  const [extraNavigation, setExtraNavigation] = useState(false);
  useEffect(
    () => setExtraNavigation(interfaceOptions.secondaryNav),
    [interfaceOptions.secondaryNav],
  );
  const visibleTabs = tabs.filter(
    (t) =>
      extraNavigation ||
      ["home", "today", "quick", "articles", "settings"].includes(t.id),
  );
  const [importsDiagnosticOpen, setImportsDiagnosticOpen] = useState(false);
  const [todayPanel, setTodayPanel] = useState("overview");
  const [articleTarget, setArticleTarget] = useState<{
    eventId: string;
    editionId: string;
    ticket: number;
  }>();
  function readArticle(eventId: string, editionId: string) {
    setArticleTarget({ eventId, editionId, ticket: Date.now() });
    navigate("articles");
  }
  const readerReturn = useRef<{
    scroll: number;
    element: HTMLElement | null;
    tab: Tab;
  }>({
    scroll: 0,
    element: null,
    tab: "library",
  });
  function restoreReaderContext() {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        readerReturn.current.element?.focus({ preventScroll: true });
        window.scrollTo({
          top: readerReturn.current.scroll,
          behavior: "instant",
        });
      }),
    );
  }
  const data = useLibrary();
  const allEditions = useMemo(
    () =>
      data.editions.map((edition) => {
        const key = dayKeyOf(edition);
        return key ? { ...edition, date: key.slice(15), dayKey: key } : edition;
      }),
    [data.editions],
  );
  const [futureTarget, setFutureTarget] = useState("");
  const [tab, setTab] = useState<Tab>(() => {
    try {
      const saved = sessionStorage.getItem("journal360.navigation.v9");
      return tabs.some((t) => t.id === saved) ? (saved as Tab) : "today";
    } catch {
      return "today";
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem("journal360.navigation.v9", tab);
    } catch {
      /* Navigation still works without storage. */
    }
  }, [tab]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string>();
  const [readingUpdates, setReadingUpdates] = useState<ReadingChanges>();
  const [syncActivity, setSyncActivity] = useState<SyncActivity>();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [futureFiles, setFutureFiles] = useState<FutureFile[]>([]);
  const [restoration, setRestoration] = useState<BackupData | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState("all");
  const [libraryMode, setLibraryMode] = useState<
    "active" | "archived" | "trash"
  >("active");
  const [sort, setSort] = useState<"date" | "title" | "import">("date");
  const [session, setSession] = useState<Session | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [cloudStatus, setCloudStatus] = useState(
    "Aucune sauvegarde cloud active",
  );
  const [storage, setStorage] = useState<{
    usage?: number;
    quota?: number;
    persisted?: boolean;
  }>({});
  const [fileAPI, setFileAPI] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const pendingSeen = useRef(new Set<string>());
  const briefHydrationSeen = useRef(new Set<string>());
  useEffect(() => {
    if (!data.ready) return;
    let active = true;
    void hydrateQuickBriefs(db, allEditions, briefHydrationSeen.current).then(
      (result) => {
        if (active && result.errors.length) setToast(result.errors[0]);
      },
    );
    return () => {
      active = false;
    };
  }, [data.ready, allEditions]);
  const busyCloud = useRef(false);
  const theme =
    data.preferences.find((p) => p.key === "theme")?.value || "light";
  const lastBackup = data.preferences.find(
    (p) => p.key === "last-backup",
  )?.value;
  const lastCloud = data.preferences.find(
    (p) => p.key === `last-cloud-${session?.user.id}`,
  )?.value;
  const autoSync =
    data.preferences.find((p) => p.key === `auto-sync-${session?.user.id}`)
      ?.value !== "off";
  const lastSync = data.preferences.find(
    (p) => p.key === `last-sync-${session?.user.id}`,
  )?.value;
  const syncPending = useSyncPending(session?.user.id);
  useDialogFocus(!!restoration, () => setRestoration(null));
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setToast(
        "Le cache hors ligne n’a pas pu être installé. Réessayez lors de la prochaine ouverture.",
      ),
  });
  const editions = useMemo(
    () => sortEditions(allEditions.filter((e) => !e.deleted)),
    [allEditions],
  );
  const displayedEditions = useMemo(
    () =>
      sortEditions(
        currentEditions(editions.filter((e) => !e.archived && !e.collection)),
      ),
    [editions],
  );
  const searchableEditions = currentEditions(editions);
  const current = allEditions.find((e) => e.id === selected);
  const categories = [...new Set(editions.flatMap((e) => e.categories))].sort();
  const months = [
    ...new Set(editions.flatMap((e) => (e.date ? [e.date.slice(0, 7)] : []))),
  ]
    .sort()
    .reverse();
  const openFutureDocument = useCallback((id?: string) => {
    setFutureTarget(id || "");
    setSelected(null);
    setSelectedDay(null);
    setTab("future");
  }, []);
  const run = useCallback(
    (action: () => Promise<unknown>, success?: string) => {
      setBusy(true);
      void action()
        .then(() => {
          if (success) setToast(success);
        })
        .catch((e) => {
          void recordDiagnostic("operation-failed");
          setToast(
            e instanceof Error
              ? e.message
              : "Opération impossible. Vérifiez le stockage et réessayez.",
          );
        })
        .finally(() => setBusy(false));
    },
    [],
  );
  const prepare = useCallback(
    async (
      files: {
        name: string;
        bytes: Uint8Array;
        demo?: boolean;
        pendingId?: string;
        type?: string;
      }[],
      destination: ImportDestination | "future" = "library",
    ) => {
      if (
        files.length > 20 ||
        files.reduce((s, f) => s + f.bytes.length, 0) > 100 * 1024 * 1024
      )
        throw new Error("Limite : 20 fichiers et 100 Mo par import.");
      const prepared: Candidate[] = [];
      const prospective: FutureFile[] = [];
      for (const file of files) {
        const kind = classifyFuture(file.bytes);
        if (
          destination === "future" ||
          kind === "future" ||
          kind === "legacy" ||
          /\.json$/i.test(file.name)
        ) {
          prospective.push(file);
          continue;
        }
        if (
          file.type &&
          ![
            "text/html",
            "application/xhtml+xml",
            "text/plain",
            "application/octet-stream",
          ].includes(file.type)
        )
          throw new Error("Type de fichier incohérent : HTML attendu.");
        const edition = inCollection(
          await inspectHTML(file.name, file.bytes, file.demo),
          destination,
        );
        prepared.push({
          edition,
          bytes: file.bytes,
          duplicate:
            !!(await db.editions
              .where("sha256")
              .equals(edition.sha256)
              .filter((e) => e.collection === edition.collection)
              .first()) ||
            prepared.some(
              (c) =>
                c.edition.sha256 === edition.sha256 &&
                c.edition.collection === edition.collection,
            ),
          pendingId: file.pendingId,
        });
      }
      setCandidates((previous) => [...previous, ...prepared]);
      setFutureFiles((previous) => [...previous, ...prospective]);
    },
    [],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const handle = () => setOnline(navigator.onLine);
    window.addEventListener("online", handle);
    window.addEventListener("offline", handle);
    return () => {
      window.removeEventListener("online", handle);
      window.removeEventListener("offline", handle);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 7000);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    void cloud.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setFileAPI(registerFileHandling(setToast));
    if (new URLSearchParams(location.search).has("share-error"))
      setToast(
        "Partage refusé : sélectionnez des HTML de 10 Mo maximum, 20 fichiers et 100 Mo par envoi.",
      );
    const subscription = liveQuery(() => db.pending.toArray()).subscribe(
      (records) => {
        const fresh = records.filter((r) => !pendingSeen.current.has(r.id));
        if (fresh.length) {
          fresh.forEach((r) => pendingSeen.current.add(r.id));
          run(() =>
            prepare(
              fresh.map((r) => ({
                name: r.filename,
                bytes: r.bytes,
                pendingId: r.id,
              })),
            ),
          );
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [prepare, run]);
  const syncDevices = useCallback(async () => {
    if (!session) throw new Error("Saisissez votre code d’accès d’abord.");
    if (!navigator.onLine) {
      setCloudStatus(
        "Hors ligne · les modifications seront synchronisées au retour du réseau",
      );
      return;
    }
    if (busyCloud.current) return;
    busyCloud.current = true;
    setCloudStatus("Synchronisation avec Supabase…");
    setSyncActivity({ owner: session.user.id, phase: "syncing" });
    try {
      await coordinator.flush(session);
      setSnapshots(await synchronizer.sync(session));
      setCloudStatus("Bibliothèque synchronisée sur vos appareils");
      setSyncActivity({ owner: session.user.id, phase: "idle" });
    } catch (error) {
      setSyncActivity({
        owner: session.user.id,
        phase: "error",
        error:
          error instanceof Error
            ? error.message
            : "Synchronisation interrompue",
      });
      setCloudStatus(
        error instanceof Error ? error.message : "Synchronisation interrompue.",
      );
      void recordDiagnostic("sync-failed");
      throw error;
    } finally {
      busyCloud.current = false;
    }
  }, [session]);
  useEffect(() => {
    if (!session || !autoSync || !data.ready) return;
    if (!online) {
      setCloudStatus(
        "Hors ligne · les modifications seront synchronisées au retour du réseau",
      );
      return;
    }
    let debounce: ReturnType<typeof setTimeout>;
    let previous = "";
    const sync = () => {
      if (document.visibilityState === "visible")
        void syncDevices().catch(() => {});
    };
    sync();
    const subscription = liveQuery(async () =>
      fingerprint(await db.snapshot()),
    ).subscribe({
      next: (signature) => {
        if (signature === previous) return;
        previous = signature;
        clearTimeout(debounce);
        debounce = setTimeout(sync, 2000);
      },
      error: () =>
        setCloudStatus(
          "Le stockage local est indisponible pour la synchronisation.",
        ),
    });
    const interval = setInterval(sync, 30000);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      subscription.unsubscribe();
      clearTimeout(debounce);
      clearInterval(interval);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [session, online, autoSync, data.ready, syncDevices]);
  useEffect(() => {
    if (!session || !online) return;
    let canceled = false;
    const resumeBackups = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const count = await db.jobs
          .where("ownerId")
          .equals(session.user.id)
          .count();
        if (!count) return;
        await coordinator.flush(session);
        const available = await remote.list(session);
        if (!canceled) {
          setSnapshots(available);
          setCloudStatus("Sauvegarde confirmée par Supabase");
        }
      } catch (error) {
        if (!canceled)
          setCloudStatus(
            error instanceof Error ? error.message : "Erreur de sauvegarde.",
          );
      }
    };
    void resumeBackups();
    const visible = () => {
      void resumeBackups();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      canceled = true;
      document.removeEventListener("visibilitychange", visible);
    };
  }, [session, online]);
  useEffect(() => {
    if (tab === "settings" && navigator.storage)
      void Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted(),
      ])
        .then(([estimate, persisted]) => setStorage({ ...estimate, persisted }))
        .catch(() => {});
  }, [tab]);
  const readerHistory = useReaderHistory((id) => {
    setSelectedArticle(undefined);
    const edition = allEditions.find((e) => e.id === id);
    setSelectedDay(null);
    setSelected(edition?.id || null);
    if (edition) {
      setReadingUpdates(readingChanges(edition, allEditions, data.states));
      run(() => db.reading(edition.id, "edition", { openedAt: now() }));
    } else setTab(readerReturn.current.tab);
    if (id) window.scrollTo({ top: 0, behavior: "instant" });
    else restoreReaderContext();
  });
  function backFromReader() {
    setSelectedArticle(undefined);
    readerHistory.back();
    setSelected(null);
    setSelectedDay(null);
    setTab(readerReturn.current.tab);
    restoreReaderContext();
  }
  function navigate(next: Tab) {
    setFutureTarget("");
    setSelectedArticle(undefined);
    readerHistory.reset();
    setSelected(null);
    setSelectedDay(null);
    setTab(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openDay(dayKey: string) {
    readerHistory.reset();
    setSelected(null);
    setSelectedDay(dayKey);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openEdition(id: string, articleId?: string) {
    const edition = allEditions.find((e) => e.id === id);
    if (!edition) return;
    if (!selected)
      readerReturn.current = {
        scroll: window.scrollY,
        element: document.activeElement as HTMLElement | null,
        tab,
      };
    setSelectedArticle(articleId);
    readerHistory.open(id);
    setReadingUpdates(
      edition ? readingChanges(edition, allEditions, data.states) : undefined,
    );
    setSelectedDay(null);
    setSelected(id);
    window.scrollTo({ top: 0, behavior: "instant" });
    run(() => db.reading(id, "edition", { openedAt: now() }));
  }
  async function selectedFiles(files: FileList | File[] | null) {
    if (!files?.length) return;
    if (files.length > 20) throw new Error("20 fichiers maximum.");
    const list = [];
    let size = 0;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Chaque fichier doit faire moins de 10 Mo.");
      size += file.size;
      if (size > 100 * 1024 * 1024)
        throw new Error("Sélection limitée à 100 Mo.");
      list.push({
        name: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
        type: file.type,
      });
    }
    await prepare(
      list,
      tab === "future" ? "future" : isCollection(tab) ? tab : "library",
    );
  }
  async function importDemo() {
    const files = await Promise.all(
      ["edition-12.html", "edition-13.html"].map(async (name) => {
        const r = await fetch(`/demo/${name}`);
        if (!r.ok) throw new Error("Démonstration indisponible hors ligne.");
        return {
          name,
          bytes: new Uint8Array(await r.arrayBuffer()),
          demo: true,
        };
      }),
    );
    await prepare(files);
  }
  async function localBackup() {
    const blob = await exportBackup(db);
    download(blob, `journal360-${new Date().toISOString().slice(0, 10)}.zip`);
    await db.preferences.put({ key: "last-backup", value: now() });
  }
  async function cloudBackup() {
    if (!session) throw new Error("Connectez-vous d’abord.");
    await coordinator.enqueue(session);
    if (!online) {
      setCloudStatus("Sauvegarde en attente du réseau");
      return;
    }
    const jobs = await db.jobs
      .where("ownerId")
      .equals(session.user.id)
      .toArray();
    for (const job of jobs)
      await db.jobs.update(job.id, { attempts: 0, status: "pending" });
    await coordinator.flush(session);
    setSnapshots(await remote.list(session));
    setCloudStatus("Sauvegarde confirmée par Supabase");
  }
  async function loadSnapshots() {
    if (!session) throw new Error("Connectez-vous d’abord.");
    setSnapshots(await remote.list(session));
    setCloudStatus("Connexion au serveur vérifiée");
  }
  const filtered = useMemo(() => {
    const q = normalize(query);
    let list = currentEditions(
      allEditions.filter(
        (e) =>
          !e.collection &&
          (libraryMode === "trash"
            ? e.deleted
            : !e.deleted &&
              (libraryMode === "archived" ? e.archived : !e.archived)),
      ),
    ).filter(
      (e) =>
        (category === "all" || e.categories.includes(category)) &&
        (month === "all" || e.date?.startsWith(month)) &&
        (!q ||
          normalize(
            e.title + " " + e.text + " " + e.categories.join(" "),
          ).includes(q)),
    );
    if (sort === "title")
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, "fr"));
    else if (sort === "import")
      list = [...list].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
    else list = sortEditions(list);
    return list;
  }, [allEditions, query, category, month, sort, libraryMode]);
  const indexedArticles = useMemo(() => indexArticles(editions), [editions]);
  const articleCount = indexedArticles.length;
  const favorites = data.states.filter(
    (s) => s.favorite && editions.some((e) => e.id === s.editionId),
  );
  const recent = data.states
    .filter(
      (s) =>
        s.articleId === "edition" &&
        s.openedAt &&
        editions.some((e) => e.id === s.editionId),
    )
    .sort((a, b) => (b.openedAt || "").localeCompare(a.openedAt || ""))[0];
  const recentOriginal = editions.find((e) => e.id === recent?.editionId);
  const resumeEdition = recentOriginal
    ? currentEditions(
        editions.filter((e) =>
          dayKeyOf(recentOriginal)
            ? dayKeyOf(e) === dayKeyOf(recentOriginal)
            : e.id === recentOriginal.id,
        ),
      )[0]
    : undefined;
  const eventGroups = useMemo(() => {
    const map = new Map<
      string,
      { edition: Edition; article: Edition["articles"][number] }[]
    >();
    for (const e of [...editions].reverse())
      for (const a of e.articles)
        if (a.eventId) {
          const list = map.get(a.eventId) || [];
          list.push({ edition: e, article: a });
          map.set(a.eventId, list);
        }
    return [...map.entries()].filter(
      ([, list]) => new Set(list.map((x) => x.edition.id)).size > 1,
    );
  }, [editions]);
  const libraryHeading = (title: string, kicker: string, subtitle: string) => (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <span className="issue-stamp">
        J<span>360°</span>
      </span>
    </div>
  );
  const syncIndicator = (
    <SyncIndicator
      owner={session?.user.id}
      online={online}
      autoSync={autoSync}
      pending={syncPending}
      activity={syncActivity}
      lastSync={lastSync}
      onSync={() => run(syncDevices)}
      onSettings={() => navigate("settings")}
    />
  );
  const renderCards = (rows: Edition[]) => {
    const seen = new Set<string>();
    return rows.map((edition, index) => {
      if (!edition.dayKey) return renderCard(edition, index);
      if (seen.has(edition.dayKey!)) return null;
      seen.add(edition.dayKey!);
      return (
        <DayCard
          key={edition.dayKey}
          versions={allEditions.filter(
            (e) =>
              e.dayKey &&
              e.dayKey === edition.dayKey &&
              (tab !== "library"
                ? !e.deleted && !e.archived
                : libraryMode === "trash"
                  ? e.deleted
                  : !e.deleted &&
                    (libraryMode === "archived" ? e.archived : !e.archived)),
          )}
          states={data.states}
          onOpen={openEdition}
          onHistory={openDay}
          favoriteIds={data.states
            .filter((s) => s.favorite && s.articleId === "edition")
            .map((s) => s.editionId)}
          onFavorite={(id) =>
            run(() =>
              db.reading(id, "edition", {
                favorite: !data.states.some(
                  (s) =>
                    s.editionId === id &&
                    s.articleId === "edition" &&
                    s.favorite,
                ),
              }),
            )
          }
          onMove={
            tab === "library"
              ? (ids, deleted) =>
                  run(
                    () =>
                      db.transaction("rw", db.editions, async () => {
                        const updatedAt = now();
                        for (const id of ids)
                          await db.editions.update(id, { deleted, updatedAt });
                      }),
                    deleted
                      ? "Journée déplacée dans la corbeille."
                      : "Journée restaurée.",
                  )
              : undefined
          }
        />
      );
    });
  };
  const renderCard = (edition: Edition, index: number) => (
    <article className="edition-card" key={edition.id}>
      <button
        className={`cover cover-${index % 3}`}
        onClick={() => openEdition(edition.id)}
        aria-label={`Lire ${edition.title}`}
      >
        <div className="cover-top">
          <span>JOURNAL</span>
          <span>360°</span>
        </div>
        <div className="cover-middle">
          <span className="cover-line" />
          <span>{edition.categories[0] || "ÉDITION PERSONNELLE"}</span>
          <strong>{edition.title}</strong>
        </div>
        <div className="cover-bottom">
          <span>
            {edition.date
              ? new Intl.DateTimeFormat("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(`${edition.date}T12:00:00Z`))
              : "DATE INCONNUE"}
          </span>
          <ArrowUpRight size={21} />
        </div>
      </button>
      <div className="card-meta">
        <span>
          {edition.demo
            ? "DÉMONSTRATION"
            : edition.archived
              ? "ARCHIVE"
              : "ÉDITION HTML"}
        </span>
        <button
          className="icon-button small"
          aria-label={`${data.states.find((s) => s.id === `${edition.id}:edition`)?.favorite ? "Retirer des" : "Ajouter aux"} favoris ${edition.title}`}
          onClick={() =>
            run(() =>
              db.reading(edition.id, "edition", {
                favorite: !data.states.find(
                  (s) => s.id === `${edition.id}:edition`,
                )?.favorite,
              }),
            )
          }
        >
          <Star
            size={18}
            fill={
              data.states.find((s) => s.id === `${edition.id}:edition`)
                ?.favorite
                ? "currentColor"
                : "none"
            }
          />
        </button>
      </div>
      <h3>
        <button
          className="title-button"
          onClick={() => openEdition(edition.id)}
        >
          {edition.title}
        </button>
      </h3>
      <p className="muted">
        {edition.articles.length
          ? `${edition.articles.length} articles`
          : "Lecture intégrale"}{" "}
        · {sizeLabel(edition.size)} · v{edition.revision}
      </p>
      <div className="card-status">
        <span>
          <span className="dot" />
          Enregistrée sur cet appareil
        </span>
        {data.states.find((s) => s.id === `${edition.id}:edition`)?.read && (
          <span>
            <Check size={13} />
            Lue
          </span>
        )}
      </div>
      {libraryMode === "trash" ? (
        <button
          className="text-button"
          onClick={() =>
            run(
              () =>
                db.editions.update(edition.id, {
                  deleted: false,
                  updatedAt: now(),
                }),
              "Édition restaurée.",
            )
          }
        >
          Restaurer
        </button>
      ) : (
        tab === "library" && (
          <button
            className="text-button subtle"
            onClick={() =>
              run(
                () =>
                  db.editions.update(edition.id, {
                    deleted: true,
                    updatedAt: now(),
                  }),
                "Édition déplacée dans la corbeille.",
              )
            }
          >
            <Trash2 size={14} />
            Corbeille
          </button>
        )
      )}
    </article>
  );
  return (
    <div
      className="app"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          run(() => selectedFiles(e.dataTransfer.files));
        }
      }}
    >
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("home")}
          aria-label="Journal 360, accueil"
        >
          <span className="brand-symbol">J.</span>
          <span>
            JOURNAL <b>360°</b>
            <small>VOTRE MÉMOIRE DE VEILLE</small>
          </span>
        </button>
        <div className="sidebar-rule" />
        <p className="sidebar-caption">VOTRE ESPACE PERSONNEL</p>
        <nav aria-label="Navigation principale">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              aria-label={t.label}
              className={
                tab === t.id && !selected ? "nav-item selected" : "nav-item"
              }
              aria-current={tab === t.id && !selected ? "page" : undefined}
              onClick={() => navigate(t.id)}
            >
              <t.icon size={20} />
              <span>{t.label}</span>
              {t.id === "library" && <small>{displayedEditions.length}</small>}
              {t.id === "articles" && <small>{articleCount}</small>}
              {isCollection(t.id) && (
                <small>
                  {editions.filter((e) => e.collection === t.id && !e.archived)
                    .length +
                    indexedArticles.filter(
                      (i) =>
                        !i.edition.collection &&
                        !i.edition.archived &&
                        i.article.sourceWatch === t.id,
                    ).length}
                </small>
              )}
            </button>
          ))}
          {
            <button
              className="text-button"
              onClick={() => setExtraNavigation(!extraNavigation)}
              aria-expanded={extraNavigation}
            >
              Autres espaces
            </button>
          }
        </nav>
        <button
          className="primary sidebar-import"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Plus size={19} />
          Importer une édition
        </button>
        <div className="sidebar-bottom">
          <div className="privacy-seal">
            <ShieldCheck size={21} />
            <div>
              <strong>Un espace à vous.</strong>
              <p>Vos journaux restent privés.</p>
            </div>
          </div>
          <button className="text-button" onClick={() => navigate("settings")}>
            <span className="dot" />
            {online ? "Stockage local actif" : "Vous êtes hors ligne"}
            <ChevronRight size={15} />
          </button>
          <span className="sidebar-version">
            JOURNAL 360 MOBILE · v{APP_VERSION}
          </span>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Votre espace</span>
            <ChevronRight size={14} />
            <strong>
              {selected ? "Lecture" : tabs.find((t) => t.id === tab)?.label}
            </strong>
          </div>
          <button className="mobile-brand" onClick={() => navigate("home")}>
            JOURNAL <b>360°</b>
          </button>
          <div className="topbar-actions">
            {syncIndicator}
            <button
              className="icon-button"
              aria-label={
                theme === "light"
                  ? "Activer le mode sombre"
                  : "Activer le mode clair"
              }
              onClick={() =>
                run(() =>
                  db.preferences.put({
                    key: "theme",
                    value: theme === "light" ? "dark" : "light",
                  }),
                )
              }
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <span className="avatar" aria-label="Espace personnel">
              J
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {data.error && (
            <p className="error" role="alert">
              {data.error}
            </p>
          )}
          {needRefresh && (
            <div className="update-banner">
              <RefreshCw size={18} />
              <span>
                Une nouvelle version est disponible. Vos données locales seront
                conservées.
              </span>
              <button
                className="secondary"
                onClick={() => void updateServiceWorker(true)}
              >
                Mettre à jour
              </button>
            </div>
          )}
          {busy && (
            <div className="working" role="status">
              Opération en cours…
            </div>
          )}
          <div
            hidden={
              !data.ready || tab !== "articles" || !!current || !!selectedDay
            }
          >
            <ArticlesView
              target={articleTarget}
              active={
                data.ready && tab === "articles" && !current && !selectedDay
              }
              editions={allEditions}
              states={data.states}
              onOpen={openEdition}
              onImport={() => fileRef.current?.click()}
              onReading={(editionId, articleId, patch) =>
                run(() => db.reading(editionId, articleId, patch))
              }
            />
          </div>
          {collections.map((collection) => (
            <div
              key={collection.id}
              hidden={
                !data.ready ||
                tab !== collection.id ||
                !!current ||
                !!selectedDay
              }
            >
              <CollectionView
                collection={collection.id}
                editions={allEditions}
                onImport={() => fileRef.current?.click()}
                onOpen={openEdition}
                onUpdate={(id, patch) =>
                  run(() =>
                    db.editions.update(id, { ...patch, updatedAt: now() }),
                  )
                }
              />
            </div>
          ))}
          {data.ready && tab === "today" && (
            <div hidden={!!current || !!selectedDay}>
              <Suspense
                fallback={
                  <div>
                    <h1>Journal 360° Unifié</h1>
                    <p role="status">Ouverture du journal unifié…</p>
                  </div>
                }
              >
                <UnifiedWorkspace
                  editions={allEditions}
                  onDemo={() => run(importDemo)}
                  initialPanel={todayPanel}
                  onArticle={readArticle}
                  onOpen={openEdition}
                  onDay={openDay}
                  onNavigate={navigate}
                  onImport={() => fileRef.current?.click()}
                  onFuture={openFutureDocument}
                />
              </Suspense>
            </div>
          )}
          {data.ready && tab === "quick" && (
            <div hidden={!!current || !!selectedDay}>
              <QuickNews editions={allEditions} onArticle={readArticle} />
            </div>
          )}
          {data.ready && tab === "future" && !current && !selectedDay && (
            <Suspense fallback={<p>Ouverture de Le Futur…</p>}>
              <FutureView
                initialDocumentId={futureTarget}
                onImport={() => fileRef.current?.click()}
              />
            </Suspense>
          )}
          {!data.ready ? (
            <p>Ouverture de votre bibliothèque…</p>
          ) : current ? (
            <Reader
              key={`${current.id}:${selectedArticle || "edition"}`}
              initialArticleId={selectedArticle}
              changes={readingUpdates}
              edition={current}
              editions={editions.filter(
                (edition) => edition.collection === current.collection,
              )}
              states={data.states}
              notes={data.notes}
              onBack={backFromReader}
              backLabel={
                tab === "settings"
                  ? "Retour à Paramètres"
                  : tab === "home"
                    ? "Retour à Accueil"
                    : tab === "quick"
                      ? "Retour à Actualité rapide"
                      : tab === "today" && !!current.unified
                        ? "Retour à Aujourd’hui"
                        : tab === "articles"
                          ? "Retour aux articles"
                          : isCollection(tab)
                            ? `Retour à ${collections.find((collection) => collection.id === tab)!.label}`
                            : undefined
              }
              onOpen={openEdition}
              onDay={openDay}
              run={run}
            />
          ) : selectedDay ? (
            <DayView
              key={selectedDay}
              versions={allEditions.filter((e) => e.dayKey === selectedDay)}
              notes={data.notes}
              onBack={() => navigate("library")}
              onOpen={openEdition}
            />
          ) : (
            <>
              {tab === "home" && (
                <Dashboard
                  editions={allEditions}
                  resumeId={resumeEdition?.id}
                  onOpen={openEdition}
                  onArticle={readArticle}
                  onImport={() => fileRef.current?.click()}
                  onToday={(panel = "overview") => {
                    setTodayPanel(panel === "quick" ? "overview" : panel);
                    navigate(panel === "quick" ? "quick" : "today");
                  }}
                />
              )}
              {tab === "library" && (
                <>
                  {libraryHeading(
                    "Votre bibliothèque",
                    "LES ÉDITIONS RESTENT",
                    "Une seule édition par jour : la dernière mise à jour remplace la précédente.",
                  )}
                  <div className="filters">
                    <label className="search-field">
                      <Search size={19} />
                      <span className="sr-only">
                        Rechercher dans la bibliothèque
                      </span>
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher une édition, un sujet…"
                      />
                    </label>
                    <DisplayFilters>
                      <label>
                        <span className="sr-only">Rubrique</span>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          <option value="all">Toutes les rubriques</option>
                          {categories.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="sr-only">Mois</span>
                        <select
                          value={month}
                          onChange={(e) => setMonth(e.target.value)}
                        >
                          <option value="all">Toutes les dates</option>
                          {months.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="sr-only">Trier</span>
                        <select
                          value={sort}
                          onChange={(e) =>
                            setSort(e.target.value as typeof sort)
                          }
                        >
                          <option value="date">Plus récentes</option>
                          <option value="title">Par titre</option>
                          <option value="import">Derniers imports</option>
                        </select>
                      </label>
                    </DisplayFilters>
                  </div>
                  <div className="library-subnav">
                    <div className="mode-tabs">
                      {(
                        [
                          { id: "active", label: "Éditions" },
                          { id: "archived", label: "Archives" },
                          { id: "trash", label: "Corbeille" },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          aria-pressed={libraryMode === t.id}
                          onClick={() => setLibraryMode(t.id)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <button
                      className="primary"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Plus size={17} />
                      Importer
                    </button>
                  </div>
                  <p className="muted results-count">
                    {currentEditions(filtered).length} journée(s) / édition(s) ·{" "}
                    {libraryMode === "trash"
                      ? "Les originaux sont conservés. Vous pouvez les restaurer."
                      : "Les dates inconnues sont affichées après les éditions datées."}
                  </p>
                  {filtered.length ? (
                    <div className="edition-grid">{renderCards(filtered)}</div>
                  ) : (
                    <div className="empty-state">
                      <Library />
                      <h2>Aucune édition ici.</h2>
                      <p>Importez un journal ou ajustez vos filtres.</p>
                      <button
                        className="primary"
                        onClick={() => fileRef.current?.click()}
                      >
                        Importer un HTML
                        <Plus size={17} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {tab === "search" && (
                <>
                  {libraryHeading(
                    "Retrouvez le fil.",
                    "RECHERCHE LOCALE",
                    "Dans vos éditions, articles, rubriques et notes.",
                  )}
                  <label className="search-field large">
                    <Search size={22} />
                    <span className="sr-only">
                      Rechercher dans tous les journaux
                    </span>
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Un mot, un sujet, une idée…"
                    />
                  </label>
                  {!query.trim() ? (
                    <div className="search-intro">
                      <p className="eyebrow">VOS RUBRIQUES</p>
                      <div className="tag-list">
                        {categories.length ? (
                          categories.map((c) => (
                            <button
                              className="secondary"
                              key={c}
                              onClick={() => setQuery(c)}
                            >
                              {c}
                              <ArrowUpRight size={15} />
                            </button>
                          ))
                        ) : (
                          <p className="muted">
                            Les rubriques apparaîtront après l’import d’éditions
                            structurées.
                          </p>
                        )}
                      </div>
                      <p className="muted">
                        La recherche reste sur cet appareil. Aucun contenu n’est
                        envoyé à un service d’IA.
                      </p>
                    </div>
                  ) : (
                    <div className="search-results">
                      {searchableEditions
                        .filter((e) =>
                          normalize(
                            e.title +
                              " " +
                              e.text +
                              " " +
                              e.date +
                              " " +
                              e.categories.join(" "),
                          ).includes(normalize(query)),
                        )
                        .map((e) => (
                          <button
                            className="result-row"
                            key={e.id}
                            onClick={() => openEdition(e.id)}
                          >
                            <FileText />
                            <div>
                              <p className="eyebrow">
                                ÉDITION · {dateLabel(e.date)}
                              </p>
                              <h3>{e.title}</h3>
                              <p>{e.excerpt}</p>
                            </div>
                            <ArrowUpRight size={19} />
                          </button>
                        ))}
                      {searchableEditions.flatMap((e) =>
                        e.articles
                          .filter((a) =>
                            normalize(
                              a.title + " " + a.text + " " + a.category,
                            ).includes(normalize(query)),
                          )
                          .map((a) => (
                            <button
                              className="result-row"
                              key={`${e.id}:${a.id}`}
                              onClick={() => openEdition(e.id)}
                            >
                              <BookOpen />
                              <div>
                                <p className="eyebrow">
                                  ARTICLE · {a.category}
                                </p>
                                <h3>{a.title}</h3>
                                <p>{a.text.slice(0, 180)}</p>
                              </div>
                              <ArrowUpRight size={19} />
                            </button>
                          )),
                      )}
                      {data.notes
                        .filter(
                          (n) =>
                            editions.some((e) => e.id === n.editionId) &&
                            normalize(n.body).includes(normalize(query)),
                        )
                        .map((n) => (
                          <button
                            className="result-row"
                            key={n.id}
                            onClick={() => openEdition(n.editionId)}
                          >
                            <Bookmark />
                            <div>
                              <p className="eyebrow">
                                {n.kind === "decision" ? "DÉCISION" : "NOTE"}
                              </p>
                              <p>{n.body}</p>
                            </div>
                            <ArrowUpRight size={19} />
                          </button>
                        ))}
                      {!searchableEditions.some((e) =>
                        normalize(
                          e.title +
                            " " +
                            e.text +
                            " " +
                            e.date +
                            " " +
                            e.categories.join(" "),
                        ).includes(normalize(query)),
                      ) &&
                        !data.notes.some(
                          (n) =>
                            editions.some((e) => e.id === n.editionId) &&
                            normalize(n.body).includes(normalize(query)),
                        ) && (
                          <div className="empty-state">
                            <Search />
                            <h2>Aucun résultat.</h2>
                            <p>
                              Essayez un autre mot ou importez une nouvelle
                              édition.
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </>
              )}
              {tab === "memory" && (
                <>
                  {libraryHeading(
                    "Votre mémoire vivante",
                    "DU PASSAGE À LA TRACE",
                    "Uniquement ce que vous avez réellement conservé.",
                  )}
                  <div className="memory-layout">
                    <section className="quiet-panel">
                      <h2>
                        <Star size={20} /> Vos favoris
                      </h2>
                      {favorites.length ? (
                        favorites.map((s) => {
                          const e = editions.find((e) => e.id === s.editionId)!;
                          return (
                            <button
                              className="memory-link"
                              key={s.id}
                              onClick={() => openEdition(e.id)}
                            >
                              <span>
                                {s.articleId === "edition"
                                  ? e.title
                                  : e.articles.find((a) => a.id === s.articleId)
                                      ?.title || e.title}
                                <small>{dateLabel(e.date)}</small>
                              </span>
                              <ArrowUpRight size={17} />
                            </button>
                          );
                        })
                      ) : (
                        <p className="muted">
                          Une étoile dans le lecteur garde les sujets à portée
                          de main.
                        </p>
                      )}
                    </section>
                    <section className="quiet-panel">
                      <h2>
                        <Bookmark size={20} /> Notes & décisions
                      </h2>
                      {data.notes.filter((n) =>
                        editions.some((e) => e.id === n.editionId),
                      ).length ? (
                        data.notes
                          .filter((n) =>
                            editions.some((e) => e.id === n.editionId),
                          )
                          .map((n) => (
                            <button
                              className="memory-link"
                              key={n.id}
                              onClick={() => openEdition(n.editionId)}
                            >
                              <span>
                                <small>
                                  {n.kind === "decision" ? "DÉCISION" : "NOTE"}
                                </small>
                                {n.body}
                              </span>
                              <ArrowUpRight size={17} />
                            </button>
                          ))
                      ) : (
                        <p className="muted">
                          Capturez votre réflexion dans le lecteur. Elle restera
                          liée à son édition.
                        </p>
                      )}
                    </section>
                  </div>
                  <section className="quiet-panel history-panel">
                    <p className="eyebrow">LES SUJETS AU FIL DU TEMPS</p>
                    <h2>Événements communs</h2>
                    <p className="muted">
                      Un lien est établi uniquement sur un identifiant event_id
                      explicite partagé par plusieurs éditions.
                    </p>
                    {eventGroups.length ? (
                      eventGroups.map(([id, items]) => (
                        <details className="event-group" key={id}>
                          <summary>
                            {items.at(-1)!.article.title}
                            <span>{items.length} occurrences</span>
                          </summary>
                          <small>
                            Identifiant déclaré par les éditions : {id}. Ce lien
                            ne constitue pas une vérification des faits.
                          </small>
                          {items.map((item, i) => (
                            <div
                              className="event-occurrence"
                              key={`${item.edition.id}:${item.article.id}`}
                            >
                              <button
                                className="text-button"
                                onClick={() => openEdition(item.edition.id)}
                              >
                                {dateLabel(item.edition.date)} ·{" "}
                                {item.edition.title}
                                <ArrowUpRight size={14} />
                              </button>
                              <p>{item.article.text}</p>
                              {i > 0 && (
                                <p className="comparison-label">
                                  Comparaison technique avec la précédente :{" "}
                                  {items[i - 1].article.text ===
                                  item.article.text
                                    ? "texte identique"
                                    : "texte modifié"}{" "}
                                  ·{" "}
                                  {item.article.text.length -
                                    items[i - 1].article.text.length >=
                                  0
                                    ? "+"
                                    : ""}
                                  {item.article.text.length -
                                    items[i - 1].article.text.length}{" "}
                                  caractères. Les deux textes sont conservés
                                  ci-dessus.
                                </p>
                              )}
                            </div>
                          ))}
                        </details>
                      ))
                    ) : (
                      <p>
                        Aucun événement commun prouvé pour le moment. Les
                        fichiers sans identifiant restent dans votre
                        chronologie.
                      </p>
                    )}
                  </section>
                  <section className="history-panel">
                    <div className="section-title">
                      <div>
                        <p className="eyebrow">VOS ARCHIVES</p>
                        <h2>La chronologie</h2>
                      </div>
                      <Archive size={23} />
                    </div>
                    {months.map((m) => (
                      <div className="timeline-month" key={m}>
                        <h3>
                          {new Intl.DateTimeFormat("fr-FR", {
                            month: "long",
                            year: "numeric",
                          }).format(new Date(`${m}-15T12:00:00Z`))}
                        </h3>
                        {editions
                          .filter((e) => e.date?.startsWith(m))
                          .map((e) => (
                            <button
                              className="timeline-row"
                              key={e.id}
                              onClick={() => openEdition(e.id)}
                            >
                              <span className="timeline-date">
                                {e.date?.slice(-2)}
                              </span>
                              <span>
                                {e.title}
                                <small>
                                  {e.articles.length
                                    ? `${e.articles.length} articles`
                                    : "HTML intégral"}{" "}
                                  · version {e.revision}
                                </small>
                              </span>
                              <ArrowUpRight size={18} />
                            </button>
                          ))}
                      </div>
                    ))}
                    {editions.filter((e) => !e.date).length > 0 && (
                      <div className="timeline-month">
                        <h3>Date inconnue</h3>
                        {editions
                          .filter((e) => !e.date)
                          .map((e) => (
                            <button
                              className="timeline-row"
                              key={e.id}
                              onClick={() => openEdition(e.id)}
                            >
                              {e.title}
                              <ArrowUpRight size={18} />
                            </button>
                          ))}
                      </div>
                    )}
                    {!editions.length && (
                      <p className="muted">
                        Votre histoire commencera avec le premier import.
                      </p>
                    )}
                  </section>
                  {months.length > 0 && (
                    <section className="quiet-panel">
                      <h2>Éditions par mois</h2>
                      <p className="muted">
                        Calculé sur les dates éditoriales connues. Les dates
                        inconnues sont exclues.
                      </p>
                      <div className="month-chart">
                        {months.map((m) => {
                          const count = editions.filter((e) =>
                            e.date?.startsWith(m),
                          ).length;
                          const max = Math.max(
                            ...months.map(
                              (x) =>
                                editions.filter((e) => e.date?.startsWith(x))
                                  .length,
                            ),
                          );
                          return (
                            <div className="chart-row" key={m}>
                              <span>{m}</span>
                              <div>
                                <i
                                  style={{ width: `${(count / max) * 100}%` }}
                                />
                              </div>
                              <strong>{count}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              )}
              {tab === "settings" && (
                <>
                  {libraryHeading(
                    "À votre façon.",
                    "RÉGLAGES & SAUVEGARDES",
                    "Votre appareil, vos originaux, votre compte.",
                  )}
                  <div className="settings-grid">
                    <DisplaySettings categories={categories} />
                    <details className="quiet-panel">
                      <summary>Profils et options historiques</summary>
                      <InterfaceSettings />
                    </details>
                    <ImportDiagnostics
                      open={importsDiagnosticOpen}
                      onToggle={setImportsDiagnosticOpen}
                      editions={allEditions}
                      onOpen={openEdition}
                      onDay={openDay}
                    />
                    <section className="quiet-panel">
                      <h2>
                        <HardDrive size={21} /> Stockage de cet appareil
                      </h2>
                      <p className="mode-label">
                        <span className="dot" />
                        IndexedDB · {editions.length} éditions disponibles
                      </p>
                      <p>
                        {sizeLabel(
                          data.editions.reduce((sum, e) => sum + e.size, 0),
                        )}{" "}
                        d’originaux enregistrés
                        {storage.usage !== undefined
                          ? ` · ${sizeLabel(storage.usage)} utilisés par le site`
                          : ""}
                        {storage.quota
                          ? ` · quota estimé ${sizeLabel(storage.quota)}`
                          : ""}
                        .
                      </p>
                      <p className="muted">
                        {storage.persisted
                          ? "Le navigateur a accordé le stockage persistant. Une suppression manuelle peut toujours effacer les données."
                          : "Le stockage peut être évincé par le navigateur. Une sauvegarde indépendante reste nécessaire."}
                      </p>
                      <button
                        className="secondary"
                        onClick={() =>
                          run(async () => {
                            const persisted =
                              await navigator.storage?.persist();
                            setStorage({ ...storage, persisted });
                            setToast(
                              persisted
                                ? "Stockage persistant accordé par le navigateur."
                                : "Le navigateur n’a pas accordé le stockage persistant.",
                            );
                          })
                        }
                      >
                        Demander le stockage persistant
                      </button>
                      <p className="small-note">
                        Supprimer les données Safari/Chrome, changer de
                        navigateur ou perdre votre téléphone peut supprimer vos
                        journaux locaux.
                      </p>
                    </section>
                    <section className="quiet-panel">
                      <h2>
                        <Download size={21} /> Sauvegarde indépendante
                      </h2>
                      <p>
                        Archive ZIP : originaux, notes, favoris, lectures,
                        versions et empreintes SHA-256. Sans session ni clé.
                      </p>
                      <p className="muted">
                        {lastBackup
                          ? `Dernier export : ${new Date(lastBackup).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`
                          : "Aucun export effectué sur cet appareil."}
                      </p>
                      <div className="settings-actions">
                        <button
                          className="primary"
                          onClick={() =>
                            run(localBackup, "Archive ZIP téléchargée.")
                          }
                        >
                          Exporter tout
                          <Download size={17} />
                        </button>
                        <button
                          className="secondary"
                          onClick={() => restoreRef.current?.click()}
                        >
                          Restaurer un ZIP
                          <Upload size={17} />
                        </button>
                      </div>
                      <p className="small-note">
                        La restauration fusionne sans effacer votre
                        bibliothèque. En cas de conflit de notes, les deux
                        textes sont conservés.
                      </p>
                    </section>
                    <Diagnostics
                      value={
                        data.preferences.find(
                          (p) => p.key === "local-diagnostics",
                        )?.value
                      }
                    />
                    <section className="quiet-panel cloud-panel">
                      <h2>
                        <Cloud size={21} /> PC & téléphone · Supabase
                      </h2>
                      <p className="mode-label">
                        {session ? (
                          <>
                            <span className="dot" />
                            Bibliothèque privée connectée
                          </>
                        ) : (
                          <>
                            <CloudOff size={17} />
                            Mode local — aucune sauvegarde cloud active
                          </>
                        )}
                      </p>
                      <p className="muted">
                        {session
                          ? cloudStatus
                          : "Saisissez le même code d’accès sur votre PC et votre téléphone. Vos éditions, notes, favoris et lectures se synchroniseront automatiquement."}
                      </p>
                      {!session ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            run(async () => {
                              await unlockCloud(accessCode);
                              setAccessCode("");
                            }, "Accès privé ouvert. La synchronisation de votre bibliothèque démarre.");
                          }}
                        >
                          <label>
                            Code d’accès
                            <input
                              type="password"
                              required
                              value={accessCode}
                              onChange={(e) => setAccessCode(e.target.value)}
                              placeholder="Votre code privé"
                              autoComplete="current-password"
                            />
                          </label>
                          <button
                            className="primary"
                            disabled={!online || busy}
                          >
                            Ouvrir mes sauvegardes
                            <ArrowRight size={17} />
                          </button>
                          <p className="small-note">
                            Le même code retrouve votre bibliothèque sur chaque
                            appareil. Aucun email ni mot de passe Supabase à
                            saisir.
                          </p>
                        </form>
                      ) : (
                        <>
                          <label className="sync-toggle">
                            <input
                              type="checkbox"
                              checked={autoSync}
                              onChange={(e) =>
                                run(() =>
                                  db.preferences.put({
                                    key: `auto-sync-${session.user.id}`,
                                    value: e.target.checked ? "on" : "off",
                                  }),
                                )
                              }
                            />
                            Synchroniser automatiquement cet appareil
                          </label>
                          <p className="muted">
                            {lastSync
                              ? `Dernière synchronisation : ${new Date(lastSync).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`
                              : "La bibliothèque sera récupérée dès la connexion."}
                          </p>
                          <div className="settings-actions">
                            <button
                              className="primary"
                              disabled={!online || busy}
                              onClick={() => run(syncDevices)}
                            >
                              Synchroniser maintenant
                              <RefreshCw size={17} />
                            </button>
                          </div>
                          <p className="muted">
                            {lastCloud
                              ? `Dernière sauvegarde confirmée : ${new Date(lastCloud).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`
                              : "Aucun transfert confirmé sur cet appareil."}
                          </p>
                          <div className="settings-actions">
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() =>
                                run(
                                  cloudBackup,
                                  online
                                    ? "Sauvegarde privée envoyée."
                                    : "Sauvegarde mise en attente du réseau.",
                                )
                              }
                            >
                              Sauvegarder dans Supabase
                              <Cloud size={17} />
                            </button>
                            <button
                              className="secondary"
                              disabled={!online}
                              onClick={() => run(loadSnapshots)}
                            >
                              Retrouver mes sauvegardes
                              <RefreshCw size={17} />
                            </button>
                          </div>
                          {data.jobs
                            .filter((j) => j.ownerId === session.user.id)
                            .map((j) => (
                              <p className="warning" key={j.id}>
                                Sauvegarde{" "}
                                {j.status === "error"
                                  ? "en erreur"
                                  : "en attente"}{" "}
                                · {j.attempts}/3 essais. {j.lastError}
                              </p>
                            ))}
                          <div className="snapshot-list">
                            {snapshots.map((s) => (
                              <div className="snapshot" key={s.id}>
                                <div>
                                  <strong>
                                    {new Date(s.createdAt).toLocaleString(
                                      "fr-FR",
                                      { timeZone: "Europe/Paris" },
                                    )}
                                  </strong>
                                  <small>
                                    {sizeLabel(s.size)} · Archive privée
                                  </small>
                                </div>
                                <button
                                  className="secondary"
                                  onClick={() =>
                                    run(async () => {
                                      await remote.restore(session, s.id);
                                    }, "Sauvegarde cloud restaurée par fusion. Les notes en conflit sont conservées.")
                                  }
                                >
                                  Restaurer
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            className="text-button"
                            onClick={() =>
                              run(async () => {
                                const { error } = await cloud.auth.signOut({
                                  scope: "local",
                                });
                                if (error) throw error;
                                setSnapshots([]);
                                setCloudStatus(
                                  "Aucune sauvegarde cloud active",
                                );
                              }, "Déconnecté. La bibliothèque locale est conservée.")
                            }
                          >
                            Se déconnecter
                          </button>
                        </>
                      )}
                      <p className="small-note">
                        Les changements sont envoyés automatiquement et les
                        nouveautés récupérées toutes les 30 secondes tant que
                        l’application est ouverte. Hors ligne, vos données
                        restent sur cet appareil et reprennent au retour du
                        réseau. Les archives privées sont conservées ; les notes
                        en conflit restent accessibles.
                      </p>
                    </section>
                    <section className="quiet-panel">
                      <h2>
                        <BookOpen size={21} /> Installer & ouvrir vos HTML
                      </h2>
                      <div className="install-step">
                        <span>01</span>
                        <div>
                          <strong>iPhone · Safari</strong>
                          <p>
                            Ouvrez l’adresse HTTPS, puis Partager → Ajouter à
                            l’écran d’accueil. Lancez Journal 360 et touchez
                            Importer pour choisir un .html dans Fichiers /
                            iCloud Drive.
                          </p>
                        </div>
                      </div>
                      <div className="install-step">
                        <span>02</span>
                        <div>
                          <strong>Android · Chrome</strong>
                          <p>
                            Menu ⋮ → Installer l’application. Dans Fichiers,
                            sélectionnez un HTML → Partager → Journal 360 si
                            votre navigateur le propose. L’import depuis la PWA
                            reste disponible.
                          </p>
                        </div>
                      </div>
                      <div className="install-step">
                        <span>03</span>
                        <div>
                          <strong>Ouvrir avec · File Handling API</strong>
                          <p>
                            {fileAPI
                              ? "API détectée dans ce navigateur. Après installation, le système peut proposer Journal 360 pour les .html et .htm."
                              : "API non disponible dans ce navigateur. Elle est actuellement destinée aux navigateurs Chromium sur ordinateur."}{" "}
                            Le partage Android utilise Web Share Target ; iOS ne
                            propose pas ces associations à la PWA.
                          </p>
                        </div>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => fileRef.current?.click()}
                      >
                        Choisir un HTML sur cet appareil
                        <Plus size={17} />
                      </button>
                      <p className="small-note">
                        Aucune installation physique n’a été vérifiée
                        automatiquement. Le fichier reçu passe toujours par
                        l’écran de vérification avant enregistrement.
                      </p>
                    </section>
                    <section className="quiet-panel">
                      <h2>
                        <ShieldCheck size={21} /> Confidentialité & lecture
                      </h2>
                      <p>
                        Mode sûr sans scripts par défaut. Mode interactif sur
                        consentement explicite, dans une iframe à origine
                        opaque. Aucun accès au parent, à vos notes ou à votre
                        session.
                      </p>
                      <p className="muted">
                        Les HTML privés ne sont jamais servis comme des pages du
                        site. Aucun tracker, aucune analyse IA externe. Les
                        anciennes éditions ne garantissent pas l’actualité des
                        sources.
                      </p>
                      <button
                        className="secondary"
                        onClick={() => run(importDemo)}
                      >
                        Importer les démonstrations
                        <FileText size={17} />
                      </button>
                    </section>
                    <section className="quiet-panel">
                      <h2>
                        <Sun size={21} /> Apparence
                      </h2>
                      <div className="mode-tabs">
                        <button
                          aria-pressed={theme === "light"}
                          onClick={() =>
                            run(() =>
                              db.preferences.put({
                                key: "theme",
                                value: "light",
                              }),
                            )
                          }
                        >
                          <Sun size={17} />
                          Papier clair
                        </button>
                        <button
                          aria-pressed={theme === "dark"}
                          onClick={() =>
                            run(() =>
                              db.preferences.put({
                                key: "theme",
                                value: "dark",
                              }),
                            )
                          }
                        >
                          <Moon size={17} />
                          Lecture sombre
                        </button>
                      </div>
                      <p className="muted">
                        Les animations respectent la préférence « réduire les
                        mouvements » de votre appareil.
                      </p>
                    </section>
                  </div>
                </>
              )}
            </>
          )}
        </main>
        <footer className="page-footer">
          <span>JOURNAL 360°</span>
          <p>La curiosité d’aujourd’hui. La mémoire de demain.</p>
          <span>PRIVÉ PAR DÉFAUT</span>
        </footer>
      </div>
      <nav
        className="mobile-nav"
        aria-label="Navigation mobile"
        data-expanded={extraNavigation}
      >
        {visibleTabs.map((t) => (
          <button
            aria-current={tab === t.id && !selected ? "page" : undefined}
            key={t.id}
            onClick={() => navigate(t.id)}
          >
            <t.icon size={21} />
            <span>{t.label}</span>
          </button>
        ))}
        {
          <button
            onClick={() => setExtraNavigation(!extraNavigation)}
            aria-expanded={extraNavigation}
          >
            Autres espaces
          </button>
        }
      </nav>
      <button
        className="mobile-import"
        aria-label="Importer un fichier HTML"
        onClick={() => fileRef.current?.click()}
      >
        <Plus size={23} />
      </button>
      <input
        hidden
        ref={fileRef}
        type="file"
        accept=".html,.htm,.json,text/html,application/json"
        multiple
        aria-label="Fichiers HTML à importer"
        onChange={(e) => {
          const files = e.target.files;
          run(() => selectedFiles(files));
          e.target.value = "";
        }}
      />
      <input
        hidden
        ref={restoreRef}
        type="file"
        accept=".zip,application/zip"
        aria-label="Archive ZIP à restaurer"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            run(async () => {
              if (file.size > 150 * 1024 * 1024)
                throw new Error("Archive supérieure à 150 Mo.");
              setRestoration(
                await inspectBackup(new Uint8Array(await file.arrayBuffer())),
              );
            });
          e.target.value = "";
        }}
      />
      {candidates.length > 0 && (
        <ImportDialog
          candidates={candidates}
          editions={allEditions}
          onClose={() => {
            const pending = candidates.flatMap((c) =>
              c.pendingId ? [c.pendingId] : [],
            );
            run(async () => {
              await db.pending.bulkDelete(pending);
            });
            setCandidates([]);
          }}
          onDone={(message, destination) => {
            setCandidates([]);
            setSelected(null);
            setSelectedDay(null);
            setToast(message);
            setTab(destination);
          }}
        />
      )}
      {futureFiles.length > 0 && candidates.length === 0 && (
        <Suspense
          fallback={<p role="status">Ouverture de la vérification Le Futur…</p>}
        >
          <FutureImportDialog
            files={futureFiles}
            onClose={() => {
              const ids = futureFiles.flatMap((f) =>
                f.pendingId ? [f.pendingId] : [],
              );
              run(async () => {
                await db.pending.bulkDelete(ids);
              });
              setFutureFiles([]);
            }}
            onDone={(message) => {
              const ids = futureFiles.flatMap((f) =>
                f.pendingId ? [f.pendingId] : [],
              );
              run(async () => {
                await db.pending.bulkDelete(ids);
              });
              setFutureFiles([]);
              setSelected(null);
              setSelectedDay(null);
              setTab("future");
              setToast(message);
            }}
            onJournal={(file) => {
              setFutureFiles((previous) => previous.filter((f) => f !== file));
              run(() => prepare([file], "library"));
            }}
          />
        </Suspense>
      )}
      {restoration && (
        <div className="modal-backdrop">
          <section
            className="modal compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-title"
          >
            <p className="eyebrow">INTÉGRITÉ VÉRIFIÉE</p>
            <h2 id="restore-title">Restaurer cette bibliothèque ?</h2>
            <p>
              {restoration.editions.length} éditions ·{" "}
              {restoration.notes.length} notes · {restoration.states.length}{" "}
              états de lecture.
            </p>
            <p>
              Fusion avec votre bibliothèque actuelle. Les originaux identiques
              sont reconnus par leur empreinte ; les notes en conflit restent
              séparées. Aucun fichier local ne sera effacé.
            </p>
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => setRestoration(null)}
              >
                Annuler
              </button>
              <button
                className="primary"
                onClick={() =>
                  run(async () => {
                    const result = await restoreBackup(db, restoration);
                    setRestoration(null);
                    setToast(
                      `${result.added} éditions restaurées · ${result.conflicts} notes en conflit conservées.`,
                    );
                  })
                }
              >
                Fusionner la sauvegarde
                <Upload size={17} />
              </button>
            </div>
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Fermer la notification"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
