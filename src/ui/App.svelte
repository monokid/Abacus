<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ArrowDown,
    ArrowUp,
    Check,
    CheckCircle2,
    Clock,
    Coins,
    Download,
    FileCheck,
    Lock,
    MessageCircle,
    Moon,
    Pencil,
    Plus,
    Settings,
    Shield,
    ShieldCheck,
    ShoppingBasket,
    Sun,
    Trash2,
    Unlock,
    Upload,
    X,
  } from "@lucide/svelte";
  import { yearTotals } from "../core/calc";
  import { formatMoneyCents, formatDecimalCents, parseMoneyToCents } from "../core/money";
  import {
    addSubcategory as addBookSubcategory,
    addRecurringRule as addBookRecurringRule,
    allSubcategoriesFor,
    createEmptyBook,
    createYear,
    moveSubcategory as moveBookSubcategory,
    renameSubcategory as renameBookSubcategory,
    subcategoryUsage,
    updateRecurringRule as updateBookRecurringRule,
    validateBook,
  } from "../core/model";
  import { syncRecurringEntriesForBook } from "../core/recurring";
  import { fictionalSampleBook } from "../core/sample-data";
  import { SECTION_LABELS, type Section } from "../core/sections";
  import type { Book, BudgetMonth, BudgetYear, Entry, RecurringFrequency, RecurringRule, Subcategory } from "../core/model";

  import januariImage from "../../assets/months/januari.png";
  import februariImage from "../../assets/months/februari.png";
  import maartImage from "../../assets/months/maart.png";
  import aprilImage from "../../assets/months/april.png";
  import meiImage from "../../assets/months/mei.png";
  import juniImage from "../../assets/months/juni.png";
  import juliImage from "../../assets/months/juli.png";
  import augustusImage from "../../assets/months/augustus.png";
  import septemberImage from "../../assets/months/september.png";
  import oktoberImage from "../../assets/months/oktober.png";
  import novemberImage from "../../assets/months/november.png";
  import decemberImage from "../../assets/months/december.png";
  import abacusMark from "../../assets/brand/abacus-mark.png";

  interface DraftEntry {
    party: string;
    description: string;
    descriptionError: string;
    amountText: string;
    amountError: string;
    comment: string;
  }

  interface MonthView {
    name: string;
    image: string;
    accent: string;
    accentSoft: string;
    accentMist: string;
    sun: string;
    sunSoft: string;
  }

  interface RecurringRuleDraft {
    section: Section;
    subcategoryId: string | null;
    party: string;
    description: string;
    amountText: string;
    frequency: RecurringFrequency;
    pattern: string;
    startMonth: number;
    endMonth: number | null;
  }

  interface RecentEntry {
    entry: Entry;
    monthNumber: number;
    sectionLabel: string;
    isRecurring: boolean;
  }

  interface HistoryEvent {
    id: string;
    timestamp: number;
    title: string;
    detail: string;
    mode: AppMode;
  }

  interface UndoSnapshot {
    id: string;
    timestamp: number;
    title: string;
    detail: string;
    mode: AppMode;
    book: Book;
  }

  interface BackupFile {
    app?: string;
    exportedAt?: string;
    mode?: AppMode;
    book?: Book;
  }

  type AppMode = "demo" | "production";
  type AppView = "year" | "overview" | "insights" | "manage" | "settings" | "backup";
  type ManageTab = "categories" | "parties" | "labels" | "rules";
  type BackupTab = "backup" | "changes";
  type NoteTarget =
    | { kind: "month"; monthNumber: number; title: string }
    | { kind: "draft"; monthNumber: number; section: Section; subcategoryId: string; title: string }
    | { kind: "edit"; entryId: string; title: string }
    | { kind: "entry"; entryId: string; title: string };

  const demoStorageKey = "abacus.demo.2026.v2";
  const productionStorageKey = "abacus.book.v1";
  const modeStorageKey = "abacus.mode.v1";
  const historyStorageKey = "abacus.history.v1";
  const undoLimit = 20;
  const viewLabels: Record<AppView, string> = {
    year: "Jaarblad",
    overview: "Overzicht",
    insights: "Inzichten",
    manage: "Beheer",
    settings: "Instellingen",
    backup: "Veiligheid",
  };
  const manageTabLabels: Record<ManageTab, string> = {
    categories: "Categorieen",
    parties: "Partijen",
    labels: "Labels",
    rules: "Vaste regels",
  };
  const backupTabLabels: Record<BackupTab, string> = {
    backup: "Back-up en herstel",
    changes: "Wijzigingen",
  };
  const recurringFrequencies: Array<{ value: RecurringFrequency; label: string }> = [
    { value: "monthly", label: "Elke maand" },
    { value: "quarterly", label: "Om de drie maanden" },
    { value: "yearly", label: "Elk jaar" },
    { value: "months", label: "Gekozen maanden" },
    { value: "dates", label: "Specifieke datums" },
    { value: "weekday", label: "Vaste weekdag" },
  ];
  const sections: Section[] = ["inkomsten", "vaste_kosten", "variabele_kosten"];
  const labelGroups: Array<{ key: "income" | "expense"; label: string }> = [
    { key: "income", label: "Inkomsten" },
    { key: "expense", label: "Uitgaven" },
  ];
  const initialBook = fictionalSampleBook();
  const today = new Date();

  let book = $state(initialBook);
  let activeYearValue = $state(initialBook.years[0]?.year ?? today.getFullYear());
  let appMode = $state<AppMode>("demo");
  let activeView = $state<AppView>("year");
  let activeManageTab = $state<ManageTab>("categories");
  let activeBackupTab = $state<BackupTab>("backup");
  let activeMonth = $state(1);
  let evening = $state(false);
  let drafts = $state<Record<string, DraftEntry>>(createDrafts(initialBook));
  let expandedDraftKey = $state<string | null>(null);
  let recentEntryId = $state<string | null>(null);
  let recentEntryTimer = 0;
  let editingEntryId = $state<string | null>(null);
  let deleteConfirmEntryId = $state<string | null>(null);
  let editDraft = $state<DraftEntry>(emptyDraft());
  let notePopup = $state<NoteTarget | null>(null);
  let noteText = $state("");
  let noteInitialText = $state("");
  let noteCancelWarning = $state(false);
  let storageReady = $state(false);
  let saveStatus = $state("Voorbeeldgegevens");
  let currentClock = $state(formatClock(new Date()));
  let currentDateLabel = $state(formatLongDate(new Date()));
  let newSubcategoryNames = $state<Record<Section, string>>({
    inkomsten: "",
    vaste_kosten: "",
    variabele_kosten: "",
  });
  let subcategoryMessage = $state("");
  let recurringRuleMessage = $state("");
  let safetyMessage = $state("");
  let newRuleDraft = $state<RecurringRuleDraft>(emptyRecurringRuleDraft("vaste_kosten"));
  let editingRuleId = $state<string | null>(null);
  let historyEvents = $state<HistoryEvent[]>([]);
  let undoStack = $state<UndoSnapshot[]>([]);
  let redoStack = $state<UndoSnapshot[]>([]);
  let undoMessage = $state("");
  let restoreInput: HTMLInputElement | null = $state(null);

  const availableYears = $derived.by(() => [...book.years].filter((year) => !year.trashed).sort((left, right) => left.year - right.year));
  const selectedYear = $derived.by(() => {
    const year = availableYears.find((item) => item.year === activeYearValue) ?? availableYears[0];
    if (!year) throw new Error("Geen voorbeeldjaar gevonden.");
    return year;
  });

  const nextYear = $derived(book.years.find((year) => year.year === selectedYear.year + 1) ?? null);
  const totals = $derived(yearTotals(selectedYear));
  const currentMonthInSelectedYear = $derived(selectedYear.year === today.getFullYear() ? today.getMonth() + 1 : null);
  const validationIssues = $derived(validateBook(book));
  const recentEntries = $derived.by(() => recentEntriesForYear(8));
  const visibleHistoryEvents = $derived(historyEvents.slice(0, 12));
  const months: MonthView[] = [
    { name: "Januari", image: januariImage, accent: "#486b73", accentSoft: "#dbe6e6", accentMist: "rgba(219, 230, 230, 0.68)", sun: "#d8bf78", sunSoft: "#efe3bf" },
    { name: "Februari", image: februariImage, accent: "#7b5269", accentSoft: "#eadde5", accentMist: "rgba(234, 221, 229, 0.68)", sun: "#dfc069", sunSoft: "#f1e1b0" },
    { name: "Maart", image: maartImage, accent: "#668344", accentSoft: "#e3ead4", accentMist: "rgba(227, 234, 212, 0.7)", sun: "#e3c755", sunSoft: "#efe6a9" },
    { name: "April", image: aprilImage, accent: "#78934d", accentSoft: "#e8ecd2", accentMist: "rgba(232, 236, 210, 0.72)", sun: "#e8c84b", sunSoft: "#f1e6a5" },
    { name: "Mei", image: meiImage, accent: "#b28b3d", accentSoft: "#f0e4bf", accentMist: "rgba(240, 228, 191, 0.72)", sun: "#e7b93e", sunSoft: "#f3daa0" },
    { name: "Juni", image: juniImage, accent: "#9a9a45", accentSoft: "#ece8bb", accentMist: "rgba(236, 232, 187, 0.72)", sun: "#e5aa32", sunSoft: "#f2d18c" },
    { name: "Juli", image: juliImage, accent: "#aa743f", accentSoft: "#eed7bd", accentMist: "rgba(238, 215, 189, 0.72)", sun: "#dc8f2b", sunSoft: "#efc087" },
    { name: "Augustus", image: augustusImage, accent: "#b17a35", accentSoft: "#efdabe", accentMist: "rgba(239, 218, 190, 0.72)", sun: "#ce7b28", sunSoft: "#ebb57f" },
    { name: "September", image: septemberImage, accent: "#996039", accentSoft: "#ead0bd", accentMist: "rgba(234, 208, 189, 0.7)", sun: "#bd6b2f", sunSoft: "#e2a77d" },
    { name: "Oktober", image: oktoberImage, accent: "#8c5831", accentSoft: "#e7cdb8", accentMist: "rgba(231, 205, 184, 0.72)", sun: "#ad642f", sunSoft: "#d89e73" },
    { name: "November", image: novemberImage, accent: "#8b6a79", accentSoft: "#e5d8df", accentMist: "rgba(229, 216, 223, 0.7)", sun: "#c18948", sunSoft: "#e1bf8f" },
    { name: "December", image: decemberImage, accent: "#5f7a68", accentSoft: "#dce6dc", accentMist: "rgba(220, 230, 220, 0.7)", sun: "#d1b878", sunSoft: "#eadcb5" },
  ];

  onMount(() => {
    const storedMode = localStorage.getItem(modeStorageKey);
    appMode = storedMode === "production" ? "production" : "demo";
    historyEvents = loadHistoryEvents();
    loadBookForMode(appMode);
    activeMonth = currentMonthInSelectedYear ?? 1;
    currentClock = formatClock(new Date());

    const clockInterval = window.setInterval(() => {
      const now = new Date();
      currentClock = formatClock(now);
      currentDateLabel = formatLongDate(now);
    }, 30_000);

    storageReady = true;
    window.setTimeout(() => selectMonth(activeMonth), 120);

    return () => window.clearInterval(clockInterval);
  });

  $effect(() => {
    if (!storageReady) return;
    localStorage.setItem(modeStorageKey, appMode);
    localStorage.setItem(storageKeyForMode(appMode), JSON.stringify(book));
    saveStatus = "Lokaal bewaard";
  });

  function loadBookForMode(mode: AppMode): void {
    const fallbackBook = defaultBookForMode(mode);
    const savedBook = localStorage.getItem(storageKeyForMode(mode));
    if (savedBook) {
      try {
        const parsedBook = JSON.parse(savedBook) as Book;
        const issues = validateBook(parsedBook);
        if (issues.length === 0) {
          const readyBook = ensurePlanningYear(parsedBook);
          book = readyBook;
          syncActiveYearWithBook(readyBook);
          drafts = createDrafts(readyBook);
          expandedDraftKey = null;
          saveStatus = "Lokaal geladen";
          return;
        } else {
          saveStatus = "Lokale gegevens genegeerd";
        }
      } catch {
        saveStatus = "Kon lokale gegevens niet lezen";
      }
    }

    const readyFallback = ensurePlanningYear(fallbackBook);
    book = readyFallback;
    syncActiveYearWithBook(readyFallback);
    drafts = createDrafts(readyFallback);
    expandedDraftKey = null;
  }

  function loadHistoryEvents(): HistoryEvent[] {
    const savedHistory = localStorage.getItem(historyStorageKey);
    if (!savedHistory) return [];

    try {
      const parsedHistory = JSON.parse(savedHistory) as HistoryEvent[];
      if (!Array.isArray(parsedHistory)) return [];
      return parsedHistory
        .filter((event) => event && typeof event.title === "string" && typeof event.detail === "string" && typeof event.timestamp === "number")
        .slice(0, 80);
    } catch {
      return [];
    }
  }

  function recordHistory(title: string, detail: string): void {
    const event: HistoryEvent = {
      id: `history-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`,
      timestamp: Date.now(),
      title,
      detail,
      mode: appMode,
    };
    historyEvents = [event, ...historyEvents].slice(0, 80);
    localStorage.setItem(historyStorageKey, JSON.stringify(historyEvents));
  }

  function cloneBook(sourceBook: Book): Book {
    return JSON.parse(JSON.stringify(sourceBook)) as Book;
  }

  function rememberUndo(title: string, detail: string): void {
    undoStack = [
      {
        id: `undo-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`,
        timestamp: Date.now(),
        title,
        detail,
        mode: appMode,
        book: cloneBook(book),
      },
      ...undoStack,
    ].slice(0, undoLimit);
    redoStack = [];
    undoMessage = "";
  }

  function clearUndoRedo(): void {
    undoStack = [];
    redoStack = [];
    undoMessage = "";
  }

  function restoreBookSnapshot(snapshotBook: Book): void {
    book = ensurePlanningYear(cloneBook(snapshotBook));
    syncRecurringEntriesForBook(book);
    syncActiveYearWithBook(book);
    drafts = createDrafts(book);
    expandedDraftKey = null;
    editingEntryId = null;
    deleteConfirmEntryId = null;
    editDraft = emptyDraft();
    activeMonth = currentMonthInSelectedYear ?? 1;
    requestAnimationFrame(() => selectMonth(activeMonth));
  }

  function undoLastChange(): void {
    const snapshot = undoStack[0];
    if (!snapshot) {
      undoMessage = "Er is niets om ongedaan te maken.";
      return;
    }

    redoStack = [
      {
        ...snapshot,
        id: `redo-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`,
        timestamp: Date.now(),
        book: cloneBook(book),
      },
      ...redoStack,
    ].slice(0, undoLimit);
    undoStack = undoStack.slice(1);
    restoreBookSnapshot(snapshot.book);
    undoMessage = `Ongedaan gemaakt: ${snapshot.title}.`;
    recordHistory("Wijziging ongedaan gemaakt", snapshot.title);
  }

  function redoLastChange(): void {
    const snapshot = redoStack[0];
    if (!snapshot) {
      undoMessage = "Er is niets om opnieuw te doen.";
      return;
    }

    undoStack = [
      {
        ...snapshot,
        id: `undo-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`,
        timestamp: Date.now(),
        book: cloneBook(book),
      },
      ...undoStack,
    ].slice(0, undoLimit);
    redoStack = redoStack.slice(1);
    restoreBookSnapshot(snapshot.book);
    undoMessage = `Opnieuw gedaan: ${snapshot.title}.`;
    recordHistory("Wijziging opnieuw gedaan", snapshot.title);
  }

  function exportBackup(): void {
    const exportedAt = new Date().toISOString();
    const payload: BackupFile = {
      app: "Abacus",
      exportedAt,
      mode: appMode,
      book,
    };
    downloadJson(`abacus-${appMode === "demo" ? "leren" : "echt"}-${selectedYear.year}-${exportedAt.slice(0, 10)}.json`, payload);
    safetyMessage = "Back-upbestand gemaakt.";
    recordHistory("Back-up gemaakt", `Back-upbestand voor ${appMode === "demo" ? "leermodus" : "echte modus"} gemaakt.`);
  }

  function exportYearOverview(): void {
    const exportedAt = new Date().toISOString();
    const payload = {
      app: "Abacus",
      type: "year-overview",
      exportedAt,
      mode: appMode,
      year: selectedYear.year,
      startBalanceCents: selectedYear.startBalanceCents,
      totalIncomeCents: totals.incomeCents,
      totalExpenseCents: totals.outCents,
      endBalanceCents: totals.endCents,
      months: totals.months.map((month) => ({
        month: month.month,
        name: monthName(month.month),
        startCents: month.totals.startCents,
        incomeCents: month.totals.incomeCents,
        fixedCents: month.totals.fixedCents,
        variableCents: month.totals.variableCents,
        differenceCents: month.totals.differenceCents,
        endCents: month.totals.restCents,
      })),
    };
    downloadJson(`abacus-overzicht-${selectedYear.year}-${exportedAt.slice(0, 10)}.json`, payload);
    recordHistory("Jaaroverzicht gemaakt", `Overzicht voor ${selectedYear.year} gedownload.`);
  }

  function openOverview(): void {
    activeView = "overview";
  }

  function printOverview(): void {
    activeView = "overview";
    requestAnimationFrame(() => window.print());
    recordHistory("Overzicht afgedrukt", `Overzicht voor ${selectedYear.year} naar afdruk gestuurd.`);
  }

  function runSafetyCheck(): void {
    if (validationIssues.length === 0) {
      safetyMessage = `Controle uitgevoerd: geen problemen gevonden in ${selectedYear.year}.`;
    } else {
      safetyMessage = `Controle uitgevoerd: ${validationIssues.length} aandachtspunt${validationIssues.length === 1 ? "" : "en"} gevonden.`;
    }
    recordHistory("Gegevenscontrole uitgevoerd", safetyMessage);
  }

  function downloadJson(filename: string, payload: unknown): void {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function chooseRestoreFile(): void {
    restoreInput?.click();
  }

  async function restoreBackup(event: Event): Promise<void> {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const file = target.files?.[0];
    target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupFile | Book;
      const restoredBook = "book" in parsed && parsed.book ? parsed.book : (parsed as Book);
      const issues = validateBook(restoredBook);
      if (issues.length > 0) {
        safetyMessage = `Back-up niet teruggezet: ${issues[0]}`;
        recordHistory("Herstel geweigerd", `Bestand ${file.name} bevatte ${issues.length} aandachtspunt${issues.length === 1 ? "" : "en"}.`);
        return;
      }

      rememberUndo("Back-up teruggezet", `${file.name} teruggezet.`);
      restoreBookSnapshot(restoredBook);
      safetyMessage = `${file.name} teruggezet in ${appMode === "demo" ? "leermodus" : "echte modus"}.`;
      recordHistory("Back-up teruggezet", `${file.name} teruggezet in ${appMode === "demo" ? "leermodus" : "echte modus"}.`);
    } catch {
      safetyMessage = "Back-upbestand kon niet gelezen worden.";
      recordHistory("Herstel mislukt", `${file.name} kon niet gelezen worden.`);
    }
  }

  function resetCurrentMode(): void {
    const modeLabel = appMode === "demo" ? "leermodus" : "echte modus";
    if (!window.confirm(`Wil je de ${modeLabel} opnieuw starten? Dit vervangt de lokale gegevens in deze modus.`)) return;

    const nextBook = defaultBookForMode(appMode);
    rememberUndo("Gegevens opnieuw gestart", `${appMode === "demo" ? "Leermodus" : "Echte modus"} opnieuw gestart.`);
    restoreBookSnapshot(nextBook);
    safetyMessage = `${appMode === "demo" ? "Leermodus" : "Echte modus"} opnieuw gestart.`;
    recordHistory("Gegevens opnieuw gestart", `${appMode === "demo" ? "Leermodus" : "Echte modus"} opnieuw gestart.`);
  }

  function defaultBookForMode(mode: AppMode): Book {
    return ensurePlanningYear(mode === "demo" ? fictionalSampleBook() : createEmptyBook(2026));
  }

  function storageKeyForMode(mode: AppMode): string {
    return mode === "demo" ? demoStorageKey : productionStorageKey;
  }

  function switchMode(nextMode: AppMode): void {
    if (appMode === nextMode) return;
    storageReady = false;
    const previousMode = appMode;
    appMode = nextMode;
    loadBookForMode(nextMode);
    activeMonth = currentMonthInSelectedYear ?? 1;
    clearUndoRedo();
    storageReady = true;
    recordHistory("Gegevensmodus gewijzigd", `${previousMode === "demo" ? "Leren" : "Echt"} naar ${nextMode === "demo" ? "Leren" : "Echt"}.`);
    requestAnimationFrame(() => selectMonth(activeMonth));
  }

  function syncActiveYearWithBook(sourceBook: Book, preferredYear = activeYearValue): void {
    const years = [...sourceBook.years].filter((year) => !year.trashed).sort((left, right) => left.year - right.year);
    activeYearValue = years.find((year) => year.year === preferredYear)?.year ?? years[0]?.year ?? today.getFullYear();
  }

  function selectYear(yearNumber: number): void {
    if (!availableYears.some((year) => year.year === yearNumber)) return;
    activeYearValue = yearNumber;
    activeView = "year";
    activeMonth = yearNumber === today.getFullYear() ? today.getMonth() + 1 : 1;
    expandedDraftKey = null;
    editingEntryId = null;
    deleteConfirmEntryId = null;
    editDraft = emptyDraft();
    requestAnimationFrame(() => selectMonth(activeMonth));
  }

  function selectAdjacentYear(direction: -1 | 1): void {
    const index = availableYears.findIndex((year) => year.year === selectedYear.year);
    const next = availableYears[index + direction];
    if (next) selectYear(next.year);
  }

  function ensurePlanningYear(sourceBook: Book): Book {
    const baseYear = sourceBook.years[0];
    if (!baseYear) return sourceBook;
    ensureNextYear(sourceBook, baseYear);
    return sourceBook;
  }

  function ensureNextYear(sourceBook: Book, baseYear: BudgetYear): BudgetYear {
    const wantedYear = baseYear.year + 1;
    let targetYear = sourceBook.years.find((year) => year.year === wantedYear);
    if (targetYear) return targetYear;

    const baseTotals = yearTotals(baseYear);
    targetYear = createYear(wantedYear, baseTotals.endCents);
    sourceBook.years.push(targetYear);
    sourceBook.years.sort((left, right) => left.year - right.year);
    return targetYear;
  }

  function entryFingerprint(entry: Entry): string {
    return [entry.section, entry.subcategoryId ?? "", entry.party.trim(), entry.description.trim(), entry.amountCents ?? "", entry.comment.trim()].join("|");
  }

  function monthFingerprint(month: BudgetMonth): string {
    return month.entries.map(entryFingerprint).sort().join(";");
  }

  function projectedEntryId(sourceYear: number, sourceEntryId: string): string {
    return `projection-${sourceYear}-${sourceEntryId}`;
  }

  function projectionSummary(month: BudgetMonth): string {
    const targetYear = nextYear ?? ensureNextYear(book, selectedYear);
    const targetMonth = targetYear.months.find((item) => item.month === month.month);
    if (!targetMonth?.projection) {
      return `Nog geen projectie voor ${monthName(month.month)} ${targetYear.year}.`;
    }

    const projectedAt = formatHistoryTime(new Date(targetMonth.projection.projectedAt).getTime());
    const changed = targetMonth.projection.sourceFingerprint !== monthFingerprint(month);
    return `${monthName(month.month)} ${targetYear.year} laatst bijgewerkt op ${projectedAt}. ${changed ? "Er zijn nieuwe wijzigingen beschikbaar." : "Projectie is actueel."}`;
  }

  function projectionStateLabel(month: BudgetMonth): string {
    const targetYear = nextYear;
    if (!targetYear) return `Nog geen projectie voor ${selectedYear.year + 1}`;
    const targetMonth = targetYear.months.find((item) => item.month === month.month);
    if (!targetMonth?.projection) return `Nog geen projectie voor ${targetYear.year}`;
    const changed = targetMonth.projection.sourceFingerprint !== monthFingerprint(month);
    return changed ? `Projectie ${targetYear.year}: bijwerken beschikbaar` : `Projectie ${targetYear.year}: actueel`;
  }

  function confirmProjectMonth(month: BudgetMonth): boolean {
    const targetYear = nextYear ?? ensureNextYear(book, selectedYear);
    const targetMonth = targetYear.months.find((item) => item.month === month.month);
    const existingText = targetMonth?.projection
      ? `\n\n${projectionSummary(month)}`
      : `\n\nEr bestaat nog geen projectie voor ${monthName(month.month)} ${targetYear.year}.`;
    return window.confirm(
      `${monthName(month.month)} afsluiten en projectie maken voor ${monthName(month.month)} ${targetYear.year}?${existingText}\n\nDe app vervangt eerdere projectieregels uit ${selectedYear.year}, maar laat eigen regels in ${targetYear.year} staan.`,
    );
  }

  function projectMonthToNextYear(month: BudgetMonth): void {
    const targetYear = ensureNextYear(book, selectedYear);
    const targetMonth = targetYear.months.find((item) => item.month === month.month);
    if (!targetMonth) return;

    const projectedAt = new Date().toISOString();
    const sourceFingerprint = monthFingerprint(month);
    const projectedEntries = month.entries.map((entry, index) => ({
      ...entry,
      id: projectedEntryId(selectedYear.year, entry.id),
      date: `${targetYear.year}-${String(month.month).padStart(2, "0")}-01`,
      createdAt: Date.UTC(targetYear.year, month.month - 1, index + 1),
      projection: {
        sourceYear: selectedYear.year,
        sourceMonth: month.month,
        sourceEntryId: entry.id,
        projectedAt,
        sourceFingerprint: entryFingerprint(entry),
      },
    }));

    targetMonth.entries = [
      ...targetMonth.entries.filter((entry) => entry.projection?.sourceYear !== selectedYear.year || entry.projection.sourceMonth !== month.month),
      ...projectedEntries,
    ].sort((left, right) => left.createdAt - right.createdAt);
    targetMonth.projection = {
      sourceYear: selectedYear.year,
      sourceMonth: month.month,
      projectedAt,
      entryCount: projectedEntries.length,
      sourceFingerprint,
    };
    const message = `${monthName(month.month)} ${targetYear.year} bijgewerkt met ${projectedEntries.length} projectieregels.`;
    recordHistory("Projectie bijgewerkt", message);
  }

  function openMonthNote(month: BudgetMonth): void {
    noteText = month.comment ?? "";
    noteInitialText = month.comment ?? "";
    noteCancelWarning = false;
    notePopup = {
      kind: "month",
      monthNumber: month.month,
      title: `${monthName(month.month)} ${selectedYear.year}`,
    };
    centerMonth(month.month);
    focusNotePopup();
  }

  function monthName(monthNumber: number): string {
    return months[monthNumber - 1]?.name ?? `Maand ${monthNumber}`;
  }

  function monthImage(monthNumber: number): string {
    return months[monthNumber - 1]?.image ?? januariImage;
  }

  function monthTheme(monthNumber: number): MonthView {
    return months[monthNumber - 1] ?? months[0];
  }

  function monthThemeStyle(monthNumber: number): string {
    const theme = monthTheme(monthNumber);
    return `--month-accent: ${theme.accent}; --month-accent-soft: ${theme.accentSoft}; --month-accent-mist: ${theme.accentMist}; --month-sun: ${theme.sun}; --month-sun-soft: ${theme.sunSoft};`;
  }

  function centerMonth(monthNumber: number, resetVertical = false): void {
    activeMonth = monthNumber;

    requestAnimationFrame(() => {
      scrollRailToItem(".board", `[data-month-card="${monthNumber}"]`, resetVertical);
      scrollRailToItem(".month-tabs", `[data-month-tab="${monthNumber}"]`);
    });
  }

  function selectMonth(monthNumber: number): void {
    centerMonth(monthNumber, true);
  }

  function selectCurrentMonth(): void {
    selectMonth(currentMonthInSelectedYear ?? 1);
  }

  function nextMonth(monthNumber: number): number {
    return monthNumber === 12 ? 1 : monthNumber + 1;
  }

  function previousMonth(monthNumber: number): number {
    return monthNumber === 1 ? 12 : monthNumber - 1;
  }

  function activateMonthForInput(monthNumber: number): void {
    if (activeMonth === monthNumber) return;
    centerMonth(monthNumber);
  }

  function activateMonthForFocus(event: FocusEvent, monthNumber: number): void {
    const target = event.target;
    if (target instanceof Element && target.closest("button, a")) {
      activeMonth = monthNumber;
      return;
    }

    activateMonthForInput(monthNumber);
  }

  function scrollRailToItem(railSelector: string, itemSelector: string, resetVertical = false): void {
    const rail = document.querySelector(railSelector);
    const item = document.querySelector(itemSelector);
    if (!(rail instanceof HTMLElement) || !(item instanceof HTMLElement)) return;

    const railRect = rail.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    rail.scrollTo({
      left: rail.scrollLeft + itemRect.left - railRect.left - (rail.clientWidth - item.clientWidth) / 2,
      top: resetVertical ? 0 : rail.scrollTop,
      behavior: "instant",
    });
  }

  function selectCardFromPointer(event: PointerEvent, monthNumber: number): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, input, select, textarea, a")) return;

    selectMonth(monthNumber);
  }

  function monthTotal(monthNumber: number) {
    return totals.months.find((month) => month.month === monthNumber)?.totals;
  }

  function subcategoriesFor(section: Section): Subcategory[] {
    return allSubcategoriesFor(book, section).filter((subcategory) => !subcategory.hidden);
  }

  function settingsSubcategoriesFor(section: Section): Subcategory[] {
    return allSubcategoriesFor(book, section);
  }

  function addSubcategory(section: Section): void {
    try {
      rememberUndo("Categorie toegevoegd", `${newSubcategoryNames[section]} toegevoegd aan ${SECTION_LABELS[section]}.`);
      const subcategoryItem = addBookSubcategory(book, section, newSubcategoryNames[section]);
      ensureDraftsForSubcategory(subcategoryItem);
      newSubcategoryNames[section] = "";
      subcategoryMessage = `${subcategoryItem.name} toegevoegd aan ${SECTION_LABELS[section]}.`;
      recordHistory("Categorie toegevoegd", `${subcategoryItem.name} toegevoegd aan ${SECTION_LABELS[section]}.`);
    } catch (error) {
      subcategoryMessage = error instanceof Error ? error.message : "Subcategorie kon niet worden toegevoegd.";
    }
  }

  function maybeAddSubcategoryFromKey(event: KeyboardEvent, section: Section): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSubcategory(section);
  }

  function renameSubcategory(subcategoryId: string, event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    try {
      const currentName = book.subcategories.find((item) => item.id === subcategoryId)?.name ?? "";
      if (target.value.trim() !== currentName) rememberUndo("Categorie hernoemd", `${currentName} hernoemd.`);
      const subcategoryItem = renameBookSubcategory(book, subcategoryId, target.value);
      target.value = subcategoryItem.name;
      subcategoryMessage = `${subcategoryItem.name} bewaard.`;
      recordHistory("Categorie hernoemd", `${subcategoryItem.name} bewaard.`);
    } catch (error) {
      const subcategoryItem = book.subcategories.find((item) => item.id === subcategoryId);
      if (subcategoryItem) target.value = subcategoryItem.name;
      subcategoryMessage = error instanceof Error ? error.message : "Naam kon niet worden bewaard.";
    }
  }

  function moveSubcategory(subcategoryId: string, direction: -1 | 1): void {
    try {
      rememberUndo("Categorievolgorde aangepast", "De volgorde van categorieen werd aangepast.");
      moveBookSubcategory(book, subcategoryId, direction);
      subcategoryMessage = "Volgorde aangepast.";
      recordHistory("Categorievolgorde aangepast", "De volgorde van categorieen werd aangepast.");
    } catch (error) {
      subcategoryMessage = error instanceof Error ? error.message : "Volgorde kon niet worden aangepast.";
    }
  }

  function ensureDraftsForSubcategory(subcategory: Subcategory): void {
    const nextDrafts = { ...drafts };
    for (const year of book.years) {
      for (const month of year.months) {
        const key = draftKeyForYear(year.year, month.month, subcategory.section, subcategory.id);
        nextDrafts[key] ??= emptyDraft();
      }
    }
    drafts = nextDrafts;
  }

  function subcategoryUsageLabel(subcategoryId: string): string {
    const usage = subcategoryUsage(book, subcategoryId);
    const parts = [`${usage.entries} boeking${usage.entries === 1 ? "" : "en"}`];
    if (usage.recurringRules > 0) parts.push(`${usage.recurringRules} regel${usage.recurringRules === 1 ? "" : "s"}`);
    return parts.join(", ");
  }

  function rulesForSection(section: Section): RecurringRule[] {
    return book.recurringRules.filter((rule) => rule.section === section);
  }

  function statusCenterLabel(): string {
    return activeView === "year" ? `${monthName(activeMonth)} geselecteerd` : viewLabels[activeView];
  }

  function lockedMonthCount(): number {
    return selectedYear.months.filter((month) => month.locked).length;
  }

  function monthsWithOpenAmounts(): BudgetMonth[] {
    return selectedYear.months.filter((month) => month.entries.some((entry) => entry.amountCents === null));
  }

  function projectedMonthCount(): number {
    return nextYear?.months.filter((month) => month.projection?.sourceYear === selectedYear.year).length ?? 0;
  }

  function partyUsageCount(party: string): number {
    const normalized = party.trim().toLocaleLowerCase("nl-BE");
    let count = 0;
    for (const year of book.years) {
      for (const month of year.months) {
        count += month.entries.filter((entry) => entry.party.trim().toLocaleLowerCase("nl-BE") === normalized).length;
      }
    }
    count += book.recurringRules.filter((rule) => rule.party.trim().toLocaleLowerCase("nl-BE") === normalized).length;
    return count;
  }

  function labelUsageCount(label: string): number {
    const normalized = label.trim().toLocaleLowerCase("nl-BE");
    let count = 0;
    for (const year of book.years) {
      for (const month of year.months) {
        count += month.entries.filter((entry) => entry.description.trim().toLocaleLowerCase("nl-BE") === normalized).length;
      }
    }
    count += book.recurringRules.filter((rule) => rule.description.trim().toLocaleLowerCase("nl-BE") === normalized).length;
    return count;
  }

  function labelGroupName(group: "income" | "expense"): string {
    return group === "income" ? "Inkomsten" : "Uitgaven";
  }

  function labelSuggestionsForSection(section: Section): string[] {
    return section === "inkomsten" ? book.labels.income : book.labels.expense;
  }

  function labelListId(section: Section): string {
    return section === "inkomsten" ? "income-label-suggestions" : "expense-label-suggestions";
  }

  function normalizeSuggestion(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  function addSuggestion(list: string[], rawValue: string): void {
    const value = normalizeSuggestion(rawValue);
    if (!value) return;
    const exists = list.some((item) => item.toLocaleLowerCase("nl-BE") === value.toLocaleLowerCase("nl-BE"));
    if (!exists) list.push(value);
    list.sort((left, right) => left.localeCompare(right, "nl-BE"));
  }

  function learnEntrySuggestion(section: Section, party: string, description: string): void {
    addSuggestion(book.labels.parties, party);
    addSuggestion(section === "inkomsten" ? book.labels.income : book.labels.expense, description);
  }

  function updateSuggestion(list: string[], oldValue: string, rawNewValue: string): string {
    const currentIndex = list.findIndex((item) => item === oldValue);
    if (currentIndex < 0) return oldValue;

    const newValue = normalizeSuggestion(rawNewValue);
    if (!newValue) {
      list.splice(currentIndex, 1);
      return "";
    }

    const duplicateIndex = list.findIndex((item, index) => index !== currentIndex && item.toLocaleLowerCase("nl-BE") === newValue.toLocaleLowerCase("nl-BE"));
    if (duplicateIndex >= 0) {
      list.splice(currentIndex, 1);
      return list[duplicateIndex] ?? newValue;
    }

    list[currentIndex] = newValue;
    list.sort((left, right) => left.localeCompare(right, "nl-BE"));
    return newValue;
  }

  function renamePartySuggestion(oldValue: string, event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const previousValue = oldValue;
    if (normalizeSuggestion(target.value) !== previousValue) rememberUndo("Partij-autofill aangepast", previousValue);
    const nextValue = updateSuggestion(book.labels.parties, oldValue, target.value);
    target.value = nextValue || previousValue;
    subcategoryMessage = nextValue ? `${nextValue} bewaard in autofill.` : `${previousValue} verwijderd uit autofill.`;
    recordHistory("Partij-autofill aangepast", subcategoryMessage);
  }

  function removePartySuggestion(value: string): void {
    rememberUndo("Partij-autofill verwijderd", value);
    updateSuggestion(book.labels.parties, value, "");
    subcategoryMessage = `${value} verwijderd uit autofill. Bestaande boekingen blijven staan.`;
    recordHistory("Partij-autofill verwijderd", subcategoryMessage);
  }

  function renameLabelSuggestion(group: "income" | "expense", oldValue: string, event: Event): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLInputElement)) return;
    const previousValue = oldValue;
    if (normalizeSuggestion(target.value) !== previousValue) rememberUndo("Label-autofill aangepast", previousValue);
    const nextValue = updateSuggestion(book.labels[group], oldValue, target.value);
    target.value = nextValue || previousValue;
    subcategoryMessage = nextValue ? `${nextValue} bewaard in autofill.` : `${previousValue} verwijderd uit autofill.`;
    recordHistory("Label-autofill aangepast", subcategoryMessage);
  }

  function removeLabelSuggestion(group: "income" | "expense", value: string): void {
    rememberUndo("Label-autofill verwijderd", value);
    updateSuggestion(book.labels[group], value, "");
    subcategoryMessage = `${value} verwijderd uit autofill. Bestaande boekingen blijven staan.`;
    recordHistory("Label-autofill verwijderd", subcategoryMessage);
  }

  function topParties(limit = 8): Array<{ party: string; amountCents: number; count: number }> {
    const totalsByParty = new Map<string, { party: string; amountCents: number; count: number }>();
    for (const month of selectedYear.months) {
      for (const entry of month.entries) {
        const party = entry.party.trim() || "Geen partij";
        const existing = totalsByParty.get(party) ?? { party, amountCents: 0, count: 0 };
        existing.amountCents += entry.amountCents ?? 0;
        existing.count += 1;
        totalsByParty.set(party, existing);
      }
    }
    return [...totalsByParty.values()].sort((left, right) => Math.abs(right.amountCents) - Math.abs(left.amountCents)).slice(0, limit);
  }

  function sectionTotalsForInsights(): Array<{ section: Section; amountCents: number; count: number }> {
    return sections.map((section) => {
      let amountCents = 0;
      let count = 0;
      for (const month of selectedYear.months) {
        for (const entry of month.entries.filter((item) => item.section === section)) {
          amountCents += entry.amountCents ?? 0;
          count += 1;
        }
      }
      return { section, amountCents, count };
    });
  }

  function sectionTotalCents(section: Section): number {
    return sectionTotalsForInsights().find((insight) => insight.section === section)?.amountCents ?? 0;
  }

  function isRecurringEntry(entry: Entry): boolean {
    return book.recurringRules.some((rule) => entry.id.startsWith(`${rule.id}-`));
  }

  function recentEntriesForYear(limit: number): RecentEntry[] {
    return selectedYear.months
      .flatMap((month) =>
        month.entries.map((entry) => ({
          entry,
          monthNumber: month.month,
          sectionLabel: SECTION_LABELS[entry.section],
          isRecurring: isRecurringEntry(entry),
        })),
      )
      .sort((left, right) => right.entry.createdAt - left.entry.createdAt)
      .slice(0, limit);
  }

  function formatEntryDate(isoDate: string): string {
    const [, month, day] = isoDate.split("-");
    return `${day}/${month}`;
  }

  function emptyRecurringRuleDraft(section: Section): RecurringRuleDraft {
    return {
      section,
      subcategoryId: firstSubcategoryId(section),
      party: "",
      description: "",
      amountText: "",
      frequency: "monthly",
      pattern: "",
      startMonth: 1,
      endMonth: 12,
    };
  }

  function firstSubcategoryId(section: Section): string | null {
    return subcategoriesFor(section)[0]?.id ?? null;
  }

  function ruleFrequencyLabel(rule: RecurringRule): string {
    return recurringFrequencies.find((frequency) => frequency.value === rule.frequency)?.label ?? "Herhaling";
  }

  function ruleSubcategoryLabel(rule: RecurringRule): string {
    if (!rule.subcategoryId) return "Geen subcategorie";
    return book.subcategories.find((subcategory) => subcategory.id === rule.subcategoryId)?.name ?? "Onbekende subcategorie";
  }

  function rulePartyLabel(rule: RecurringRule): string {
    return rule.party.trim() || "Geen partij";
  }

  function ruleScheduleLabel(rule: RecurringRule): string {
    const end = rule.endMonth === null ? "doorlopend" : monthName(rule.endMonth).toLowerCase();
    const range = `${monthName(rule.startMonth).toLowerCase()} - ${end}`;
    if (!frequencyNeedsPattern(rule.frequency)) return `${ruleFrequencyLabel(rule)} / ${range}`;
    return `${ruleFrequencyLabel(rule)}: ${rule.pattern || "geen patroon"} / ${range}`;
  }

  function rulePeriodLabel(rule: RecurringRule): string {
    const end = rule.endMonth === null ? "Doorlopend" : monthName(rule.endMonth);
    return `${monthName(rule.startMonth)} - ${end}`;
  }

  function frequencyHelp(frequency: RecurringFrequency): string {
    if (frequency === "monthly") return "Elke maand vanaf de startmaand, bijvoorbeeld huur, pensioen of telecom.";
    if (frequency === "quarterly") return "Om de drie maanden vanaf de startmaand, bijvoorbeeld kwartaalbijdragen.";
    if (frequency === "yearly") return "Een keer per jaar in de startmaand.";
    if (frequency === "months") return "Alleen in gekozen maanden. Gebruik cijfers zoals 3,6,9,12.";
    if (frequency === "dates") return "Op specifieke datums. Gebruik bijvoorbeeld 01/07 of 01/01,01/07.";
    return "Op een vaste weekdag. Gebruik bijvoorbeeld maandag of eerste maandag.";
  }

  function frequencyFromValue(value: string): RecurringFrequency {
    return recurringFrequencies.some((frequency) => frequency.value === value) ? (value as RecurringFrequency) : "monthly";
  }

  function monthFromValue(value: string, fallback: number): number {
    const month = Number(value);
    return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback;
  }

  function optionalMonthFromValue(value: string): number | null {
    if (!value) return null;
    return monthFromValue(value, 12);
  }

  function frequencyNeedsPattern(frequency: RecurringFrequency): boolean {
    return frequency === "months" || frequency === "dates" || frequency === "weekday";
  }

  function patternLabel(frequency: RecurringFrequency): string {
    if (frequency === "months") return "Maanden";
    if (frequency === "dates") return "Datums";
    if (frequency === "weekday") return "Weekdag";
    return "Patroon";
  }

  function patternPlaceholder(frequency: RecurringFrequency): string {
    if (frequency === "months") return "bv. 1,5,9";
    if (frequency === "dates") return "bv. 15, 01/07";
    if (frequency === "weekday") return "bv. maandag";
    return "";
  }

  function defaultPatternForFrequency(frequency: RecurringFrequency, startMonth: number, currentPattern = ""): string {
    if (!frequencyNeedsPattern(frequency)) return "";
    if (currentPattern.trim()) return currentPattern;
    if (frequency === "months") return String(startMonth);
    if (frequency === "dates") return `01/${String(startMonth).padStart(2, "0")}`;
    return "maandag";
  }

  function ruleAmountText(rule: RecurringRule): string {
    return formatDecimalCents(rule.amountCents);
  }

  function inputValue(event: Event): string {
    const target = event.currentTarget;
    return target instanceof HTMLInputElement || target instanceof HTMLSelectElement ? target.value : "";
  }

  function checkboxValue(event: Event): boolean {
    const target = event.currentTarget;
    return target instanceof HTMLInputElement ? target.checked : false;
  }

  function sectionFromValue(value: string): Section {
    return sections.includes(value as Section) ? (value as Section) : "vaste_kosten";
  }

  function centsFromOptionalText(value: string): number | null {
    return value.trim() ? parseMoneyToCents(value) : null;
  }

  function applyRecurringRuleChange(ruleId: string, patch: Partial<RecurringRule>): void {
    try {
      const rule = book.recurringRules.find((item) => item.id === ruleId);
      rememberUndo("Vaste regel aangepast", rule?.description ?? "Vaste regel aangepast.");
      const updatedRule = updateBookRecurringRule(book, ruleId, patch);
      learnEntrySuggestion(updatedRule.section, updatedRule.party, updatedRule.description);
      syncRecurringEntriesForBook(book);
      drafts = createDrafts(book);
      recurringRuleMessage = "Regel toegepast op het jaar.";
      recordHistory("Vaste regel aangepast", "Een vaste regel werd opnieuw toegepast op het jaar.");
    } catch (error) {
      recurringRuleMessage = error instanceof Error ? error.message : "Regel kon niet worden bewaard.";
    }
  }

  function updateRuleSection(rule: RecurringRule, section: Section): void {
    applyRecurringRuleChange(rule.id, {
      section,
      subcategoryId: firstSubcategoryId(section),
    });
  }

  function updateRuleFrequency(rule: RecurringRule, frequency: RecurringFrequency): void {
    applyRecurringRuleChange(rule.id, {
      frequency,
      pattern: defaultPatternForFrequency(frequency, rule.startMonth, rule.pattern),
    });
  }

  function addRecurringRule(): void {
    try {
      rememberUndo("Vaste regel toegevoegd", newRuleDraft.description || "Nieuwe vaste regel");
      const rule = addBookRecurringRule(book, {
        active: true,
        section: newRuleDraft.section,
        subcategoryId: newRuleDraft.subcategoryId,
        party: newRuleDraft.party,
        description: newRuleDraft.description,
        amountCents: centsFromOptionalText(newRuleDraft.amountText),
        startYear: selectedYear.year,
        startMonth: newRuleDraft.startMonth,
        endYear: selectedYear.year,
        endMonth: newRuleDraft.endMonth,
        maxCount: null,
        frequency: newRuleDraft.frequency,
        pattern: defaultPatternForFrequency(newRuleDraft.frequency, newRuleDraft.startMonth, newRuleDraft.pattern),
      });
      learnEntrySuggestion(rule.section, rule.party, rule.description);
      syncRecurringEntriesForBook(book);
      drafts = createDrafts(book);
      recurringRuleMessage = `${rule.description} toegevoegd en toegepast.`;
      recordHistory("Vaste regel toegevoegd", `${rule.description} toegevoegd en toegepast.`);
      newRuleDraft = emptyRecurringRuleDraft(newRuleDraft.section);
    } catch (error) {
      recurringRuleMessage = error instanceof Error ? error.message : "Regel kon niet worden toegevoegd.";
    }
  }

  function maybeAddMonthlyRuleFromKey(event: KeyboardEvent): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addRecurringRule();
  }

  function entriesFor(month: BudgetMonth, section: Section, subcategoryId: string | null): Entry[] {
    return month.entries
      .filter((entry) => entry.section === section && entry.subcategoryId === subcategoryId)
      .sort((left, right) => left.createdAt - right.createdAt);
  }

  function sectionTotal(month: BudgetMonth, section: Section): number {
    return month.entries
      .filter((entry) => entry.section === section)
      .reduce((sum, entry) => sum + (entry.amountCents ?? 0), 0);
  }

  function uncategorizedEntries(month: BudgetMonth, section: Section): Entry[] {
    return entriesFor(month, section, null);
  }

  function draftKeyForYear(yearNumber: number, monthNumber: number, section: Section, subcategoryId: string): string {
    return `${yearNumber}:${monthNumber}:${section}:${subcategoryId}`;
  }

  function draftKey(monthNumber: number, section: Section, subcategoryId: string): string {
    return draftKeyForYear(selectedYear.year, monthNumber, section, subcategoryId);
  }

  function draftFor(monthNumber: number, section: Section, subcategoryId: string): DraftEntry {
    const key = draftKey(monthNumber, section, subcategoryId);
    return drafts[key] ?? emptyDraft();
  }

  function hasDraftContent(draft: DraftEntry): boolean {
    return Boolean(draft.party.trim() || draft.description.trim() || draft.amountText.trim() || draft.amountError || draft.comment.trim());
  }

  function isDraftVisible(key: string, draft: DraftEntry): boolean {
    return expandedDraftKey === key || hasDraftContent(draft);
  }

  function monthByNumber(monthNumber: number): BudgetMonth | null {
    return selectedYear.months.find((month) => month.month === monthNumber) ?? null;
  }

  function monthForEntry(entryId: string): BudgetMonth | null {
    for (const month of selectedYear.months) {
      if (month.entries.some((entry) => entry.id === entryId)) return month;
    }

    return null;
  }

  function lockedMonthMessage(monthNumber: number): void {
    undoMessage = `${monthName(monthNumber)} is vergrendeld. Ontgrendel de maand om te wijzigen.`;
  }

  function isMonthLocked(monthNumber: number): boolean {
    return monthByNumber(monthNumber)?.locked ?? false;
  }

  function toggleMonthLock(month: BudgetMonth): void {
    const willLock = !month.locked;
    if (willLock && !confirmProjectMonth(month)) return;

    rememberUndo(willLock ? "Maand vergrendeld" : "Maand ontgrendeld", `${monthName(month.month)} ${willLock ? "vergrendeld" : "ontgrendeld"}.`);
    month.locked = willLock;
    if (willLock) projectMonthToNextYear(month);

    if (willLock) {
      if (expandedDraftKey?.startsWith(`${selectedYear.year}:${month.month}:`)) expandedDraftKey = null;
      if (editingEntryId && month.entries.some((entry) => entry.id === editingEntryId)) cancelEdit();
      if (notePopup?.kind === "draft" && notePopup.monthNumber === month.month) closeNotePopup();
      if ((notePopup?.kind === "edit" || notePopup?.kind === "entry") && month.entries.some((entry) => entry.id === notePopup.entryId)) closeNotePopup();
    }

    centerMonth(month.month);
    undoMessage = `${monthName(month.month)} is ${willLock ? "vergrendeld" : "ontgrendeld"}.`;
    recordHistory(willLock ? "Maand vergrendeld" : "Maand ontgrendeld", `${monthName(month.month)} is ${willLock ? "vergrendeld" : "ontgrendeld"}.`);
  }

  function openDraft(monthNumber: number, section: Section, subcategoryId: string): void {
    if (isMonthLocked(monthNumber)) {
      centerMonth(monthNumber);
      lockedMonthMessage(monthNumber);
      return;
    }

    const key = draftKey(monthNumber, section, subcategoryId);
    drafts[key] = drafts[key] ?? emptyDraft();
    expandedDraftKey = key;
    centerMonth(monthNumber);

    requestAnimationFrame(() => {
      const input = document.querySelector(`[data-testid="draft-${monthNumber}-${section}-${subcategoryId}"] input[aria-label^="Partij"]`);
      if (input instanceof HTMLInputElement) input.focus();
    });
  }

  function commitDraft(month: BudgetMonth, section: Section, subcategoryId: string): void {
    if (month.locked) {
      lockedMonthMessage(month.month);
      return;
    }

    const key = draftKey(month.month, section, subcategoryId);
    const draft = drafts[key];
    if (!draft) return;

    const party = draft.party.trim();
    const description = draft.description.trim();
    const amountText = draft.amountText.trim();
    const comment = draft.comment.trim();
    if (!party && !description && !amountText) return;

    let hasError = false;
    if (!description) {
      draft.descriptionError = "Omschrijving is verplicht.";
      hasError = true;
    }
    if (!amountText) {
      draft.amountError = "Bedrag is verplicht.";
      hasError = true;
    }
    if (!isValidAmountText(amountText)) {
      draft.amountError = "Controleer het bedrag.";
      hasError = true;
    }
    if (hasError) return;

    rememberUndo("Boeking toegevoegd", `${monthName(month.month)}: ${description || "Nieuwe regel"}`);
    learnEntrySuggestion(section, party, description);
    const newEntryId = `demo-${month.month}-${section}-${Date.now()}`;
    month.entries.push({
      id: newEntryId,
      section,
      subcategoryId,
      date: `${selectedYear.year}-${String(month.month).padStart(2, "0")}-01`,
      party,
      description: description || "Nieuwe regel",
      amountCents: amountText ? parseMoneyToCents(amountText) : null,
      comment,
      createdAt: Date.now(),
    });
    markRecentEntry(newEntryId);
    recordHistory("Boeking toegevoegd", `${monthName(month.month)}: ${description || "Nieuwe regel"} ${amountText ? formatMoneyCents(parseMoneyToCents(amountText)) : ""}`.trim());

    drafts[key] = {
      party: "",
      description: "",
      descriptionError: "",
      amountText: "",
      amountError: "",
      comment: "",
    };
    if (expandedDraftKey === key) expandedDraftKey = null;
    activeMonth = month.month;
  }

  function markRecentEntry(entryId: string): void {
    recentEntryId = entryId;
    window.clearTimeout(recentEntryTimer);
    recentEntryTimer = window.setTimeout(() => {
      if (recentEntryId === entryId) recentEntryId = null;
    }, 1600);
  }

  function startEdit(month: BudgetMonth, entry: Entry): void {
    if (month.locked) {
      centerMonth(month.month);
      lockedMonthMessage(month.month);
      return;
    }

    centerMonth(month.month);
    editingEntryId = entry.id;
    deleteConfirmEntryId = null;
    editDraft = {
      party: entry.party,
      description: entry.description,
      descriptionError: "",
      amountText: formatDecimalCents(entry.amountCents),
      amountError: "",
      comment: entry.comment,
    };

    requestAnimationFrame(() => {
      const input = document.querySelector(`[data-edit-entry="${entry.id}"] input`);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.setSelectionRange(0, 0);
        input.scrollLeft = 0;
      }
    });
  }

  function saveEdit(entry: Entry): void {
    const month = monthForEntry(entry.id);
    if (month?.locked) {
      lockedMonthMessage(month.month);
      return;
    }

    const amountText = editDraft.amountText.trim();
    const description = editDraft.description.trim();
    let hasError = false;
    if (!description) {
      editDraft.descriptionError = "Omschrijving is verplicht.";
      hasError = true;
    }
    if (!amountText) {
      editDraft.amountError = "Bedrag is verplicht.";
      hasError = true;
    }
    if (!isValidAmountText(amountText)) {
      editDraft.amountError = "Controleer het bedrag.";
      hasError = true;
    }
    if (hasError) return;

    rememberUndo("Boeking aangepast", entry.description);
    entry.party = editDraft.party.trim();
    entry.description = description;
    entry.amountCents = amountText ? parseMoneyToCents(amountText) : null;
    entry.comment = editDraft.comment.trim();
    learnEntrySuggestion(entry.section, entry.party, entry.description);
    recordHistory("Boeking aangepast", `${entry.description} werd aangepast.`);
    editingEntryId = null;
    deleteConfirmEntryId = null;
    if (notePopup?.kind === "edit" && notePopup.entryId === entry.id) closeNotePopup();
    editDraft = emptyDraft();
  }

  function cancelEdit(): void {
    if (notePopup?.kind === "edit" && notePopup.entryId === editingEntryId) closeNotePopup();
    editingEntryId = null;
    deleteConfirmEntryId = null;
    editDraft = emptyDraft();
  }

  function requestDelete(entry: Entry): void {
    const month = monthForEntry(entry.id);
    if (month?.locked) {
      lockedMonthMessage(month.month);
      return;
    }

    deleteConfirmEntryId = entry.id;
  }

  function cancelDelete(): void {
    deleteConfirmEntryId = null;
  }

  function deleteEntry(month: BudgetMonth, entry: Entry): void {
    if (month.locked) {
      lockedMonthMessage(month.month);
      return;
    }

    const index = month.entries.findIndex((item) => item.id === entry.id);
    if (index < 0) return;

    rememberUndo("Boeking verwijderd", entry.description);
    month.entries.splice(index, 1);
    recordHistory("Boeking verwijderd", `${entry.description} werd verwijderd uit ${monthName(month.month)}.`);
    if ((notePopup?.kind === "edit" || notePopup?.kind === "entry") && notePopup.entryId === entry.id) closeNotePopup();
    cancelEdit();
  }

  function maybeHandleDraftKey(event: KeyboardEvent, month: BudgetMonth, section: Section, subcategoryId: string): void {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(month, section, subcategoryId);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (notePopup?.kind === "draft" && notePopup.monthNumber === month.month && notePopup.section === section && notePopup.subcategoryId === subcategoryId) {
        closeNotePopup();
        return;
      }
      resetDraft(month.month, section, subcategoryId);
    }
  }

  function maybeHandleEditKey(event: KeyboardEvent, entry: Entry): void {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit(entry);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (notePopup?.kind === "edit" && notePopup.entryId === entry.id) {
        closeNotePopup();
        return;
      }
      cancelEdit();
    }
  }

  function maybeCommitOnPanelBlur(event: FocusEvent, month: BudgetMonth, section: Section, subcategoryId: string): void {
    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget;
    if (currentTarget instanceof HTMLElement && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;
    if (notePopup?.kind === "draft" && notePopup.monthNumber === month.month && notePopup.section === section && notePopup.subcategoryId === subcategoryId) return;
    commitDraft(month, section, subcategoryId);
  }

  function resetDraft(monthNumber: number, section: Section, subcategoryId: string): void {
    const key = draftKey(monthNumber, section, subcategoryId);
    drafts[key] = emptyDraft();
    if (expandedDraftKey === key) expandedDraftKey = null;
  }

  function clearAmountError(draft: DraftEntry): void {
    draft.amountError = "";
  }

  function clearDescriptionError(draft: DraftEntry): void {
    draft.descriptionError = "";
  }

  function isValidAmountText(amountText: string): boolean {
    const text = amountText.trim().replace(/[\u20ac\s]/g, "");
    if (!text) return true;

    return (
      /^[+-]?\d+([,.]\d{1,2})?$/.test(text) ||
      /^[+-]?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text) ||
      /^[+-]?\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(text)
    );
  }

  function createDrafts(sourceBook: Book): Record<string, DraftEntry> {
    const initialDrafts: Record<string, DraftEntry> = {};

    for (const year of sourceBook.years) {
      for (const month of year.months) {
        for (const section of sections) {
          for (const subcategory of sourceBook.subcategories.filter((item) => item.section === section && !item.hidden)) {
            initialDrafts[draftKeyForYear(year.year, month.month, section, subcategory.id)] = emptyDraft();
          }
        }
      }
    }

    return initialDrafts;
  }

  function emptyDraft(): DraftEntry {
    return {
      party: "",
      description: "",
      descriptionError: "",
      amountText: "",
      amountError: "",
      comment: "",
    };
  }

  function findEntry(entryId: string): Entry | null {
    for (const month of selectedYear.months) {
      const entry = month.entries.find((item) => item.id === entryId);
      if (entry) return entry;
    }

    return null;
  }

  function focusNotePopup(): void {
    requestAnimationFrame(() => {
      const textarea = document.querySelector('[data-testid="note-popup"] textarea');
      if (textarea instanceof HTMLTextAreaElement) textarea.focus();
    });
  }

  function openDraftNote(monthNumber: number, section: Section, subcategory: Subcategory): void {
    if (isMonthLocked(monthNumber)) {
      centerMonth(monthNumber);
      lockedMonthMessage(monthNumber);
      return;
    }

    const draft = draftFor(monthNumber, section, subcategory.id);
    noteText = draft.comment;
    noteInitialText = draft.comment;
    noteCancelWarning = false;
    notePopup = {
      kind: "draft",
      monthNumber,
      section,
      subcategoryId: subcategory.id,
      title: `${subcategory.name} - ${monthName(monthNumber)}`,
    };
    focusNotePopup();
  }

  function openEditNote(entry: Entry): void {
    const month = monthForEntry(entry.id);
    if (month?.locked) {
      lockedMonthMessage(month.month);
      return;
    }

    noteText = editDraft.comment;
    noteInitialText = editDraft.comment;
    noteCancelWarning = false;
    notePopup = { kind: "edit", entryId: entry.id, title: entry.description };
    focusNotePopup();
  }

  function openEntryNote(entry: Entry): void {
    const month = monthForEntry(entry.id);
    if (month?.locked) {
      lockedMonthMessage(month.month);
      return;
    }

    noteText = entry.comment;
    noteInitialText = entry.comment;
    noteCancelWarning = false;
    notePopup = { kind: "entry", entryId: entry.id, title: entry.description };
    focusNotePopup();
  }

  function saveNotePopup(): void {
    const comment = noteText.trim();

    if (notePopup?.kind === "month") {
      const month = monthByNumber(notePopup.monthNumber);
      if (month && comment !== noteInitialText.trim()) {
        rememberUndo("Maandopmerking bewaard", monthName(month.month));
        month.comment = comment;
      }
    } else if (notePopup?.kind === "draft") {
      const key = draftKey(notePopup.monthNumber, notePopup.section, notePopup.subcategoryId);
      drafts[key] = {
        ...(drafts[key] ?? emptyDraft()),
        comment,
      };
    } else if (notePopup?.kind === "edit") {
      editDraft.comment = comment;
    } else if (notePopup?.kind === "entry") {
      const entry = findEntry(notePopup.entryId);
      const month = entry ? monthForEntry(entry.id) : null;
      if (month?.locked) {
        lockedMonthMessage(month.month);
        closeNotePopup();
        return;
      }
      if (entry && comment !== noteInitialText.trim()) {
        rememberUndo("Melding bewaard", entry.description);
        entry.comment = comment;
      }
    }

    if (comment !== noteInitialText.trim()) recordHistory("Melding bewaard", `${notePopup?.title ?? "Melding"} bijgewerkt.`);
    closeNotePopup();
  }

  function closeNotePopup(): void {
    notePopup = null;
    noteText = "";
    noteInitialText = "";
    noteCancelWarning = false;
  }

  function requestCloseNotePopup(): void {
    if (noteText !== noteInitialText) {
      noteCancelWarning = true;
      return;
    }

    closeNotePopup();
  }

  function maybeHandleNoteKey(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      requestCloseNotePopup();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      saveNotePopup();
    }
  }

  function formatClock(date: Date): string {
    return new Intl.DateTimeFormat("nl-BE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatLongDate(date: Date): string {
    return new Intl.DateTimeFormat("nl-BE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function formatHistoryTime(timestamp: number): string {
    return new Intl.DateTimeFormat("nl-BE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }
</script>

<main class:evening>
  <header class="app-header">
    <button class="brand" type="button" aria-label="Ga naar huidige maand" title="Ga naar huidige maand" data-tooltip="Ga naar huidige maand" onclick={selectCurrentMonth}>
      <span class="brand-mark" aria-hidden="true">
        <img src={abacusMark} alt="" />
      </span>
      <div>
        <h1>Abacus</h1>
        <p>Jaarbegroting {selectedYear.year}</p>
      </div>
    </button>

    <section class="year-menu-card" aria-label="Jaar kiezen">
      <button type="button" aria-label="Vorig jaar" title="Vorig jaar" data-tooltip="Vorig jaar" disabled={availableYears[0]?.year === selectedYear.year} onclick={() => selectAdjacentYear(-1)}>
        <ChevronLeft size={14} />
      </button>
      <label>
        <span>Jaar</span>
        <select aria-label="Actief jaar" value={String(selectedYear.year)} onchange={(event) => selectYear(Number(inputValue(event)))}>
          {#each availableYears as year}
            <option value={String(year.year)}>{year.year}</option>
          {/each}
        </select>
      </label>
      <button type="button" aria-label="Volgend jaar" title="Volgend jaar" data-tooltip="Volgend jaar" disabled={availableYears[availableYears.length - 1]?.year === selectedYear.year} onclick={() => selectAdjacentYear(1)}>
        <ChevronRight size={14} />
      </button>
      <span>Start {formatMoneyCents(selectedYear.startBalanceCents)}</span>
      <span>Eind {formatMoneyCents(totals.endCents)}</span>
    </section>

    <nav class="toolbar" aria-label="Hoofdnavigatie">
      <button class:active={activeView === "year"} class="tool" type="button" title="Jaarblad" data-tooltip="Jaarblad" onclick={() => (activeView = "year")}><CalendarDays size={16} /><span class="tool-label">Jaarblad</span></button>
      <button class:active={activeView === "overview"} class="tool" type="button" title="Overzicht" data-tooltip="Overzicht" onclick={openOverview}><Download size={16} /><span class="tool-label">Overzicht</span></button>
      <button class:active={activeView === "insights"} class="tool" type="button" title="Inzichten" data-tooltip="Inzichten" onclick={() => (activeView = "insights")}><Coins size={16} /><span class="tool-label">Inzichten</span></button>
      <button class:active={activeView === "manage"} class="tool" type="button" title="Beheer" data-tooltip="Beheer" onclick={() => (activeView = "manage")}><Pencil size={16} /><span class="tool-label">Beheer</span></button>
      <button class:active={activeView === "settings"} class="tool" type="button" title="Instellingen" data-tooltip="Instellingen" onclick={() => (activeView = "settings")}><Settings size={16} /><span class="tool-label">Instellingen</span></button>
      <button class:active={activeView === "backup"} class="tool" type="button" title="Veiligheid" data-tooltip="Veiligheid" onclick={() => (activeView = "backup")}><Shield size={16} /><span class="tool-label">Veiligheid</span></button>
    </nav>

    <div class="header-actions">
      <button class="icon-button" type="button" aria-label="Weergave wisselen" title="Weergave wisselen" data-tooltip="Weergave wisselen" onclick={() => (evening = !evening)}>
        {#if evening}
          <Sun size={19} />
        {:else}
          <Moon size={19} />
        {/if}
      </button>
    </div>
  </header>

  <datalist id="party-suggestions">
    {#each book.labels.parties as party}
      <option value={party}></option>
    {/each}
  </datalist>
  <datalist id="income-label-suggestions">
    {#each book.labels.income as label}
      <option value={label}></option>
    {/each}
  </datalist>
  <datalist id="expense-label-suggestions">
    {#each book.labels.expense as label}
      <option value={label}></option>
    {/each}
  </datalist>

  {#if activeView !== "year"}
    <section class="menu-page" aria-label={viewLabels[activeView]}>
      {#if activeView === "overview"}
        <header>
          <h2>Jaaroverzicht</h2>
          <p>Een compacte samenvatting van {selectedYear.year}, klaar om te controleren, downloaden of af te drukken.</p>
        </header>
        <section class="overview-strip" aria-label="Jaaroverzicht samenvatting">
          <article>
            <span>Startsaldo</span>
            <strong>{formatMoneyCents(selectedYear.startBalanceCents)}</strong>
          </article>
          <article>
            <span>Inkomsten</span>
            <strong>{formatMoneyCents(totals.incomeCents)}</strong>
          </article>
          <article>
            <span>Uitgaven</span>
            <strong class="negative">{formatMoneyCents(totals.outCents)}</strong>
          </article>
          <article>
            <span>Eindsaldo</span>
            <strong>{formatMoneyCents(totals.endCents)}</strong>
          </article>
          <article>
            <span>Projectie {selectedYear.year + 1}</span>
            <strong>{projectedMonthCount()} maand{projectedMonthCount() === 1 ? "" : "en"}</strong>
          </article>
        </section>
        <section class="settings-block overview-print-area" aria-label="Maandoverzicht">
          <header>
            <div>
              <h3>Maanden</h3>
              <p>{lockedMonthCount()} afgesloten maand{lockedMonthCount() === 1 ? "" : "en"}, {monthsWithOpenAmounts().length} maand{monthsWithOpenAmounts().length === 1 ? "" : "en"} met een open bedrag.</p>
            </div>
            <div class="history-actions">
              <button type="button" class="inline-action" onclick={exportYearOverview}>Download JSON</button>
              <button type="button" class="inline-action" onclick={printOverview}>Afdrukken</button>
            </div>
          </header>
          <div class="overview-table" role="table" aria-label="Maanden met bedragen">
            <div class="overview-row overview-head" role="row">
              <span>Maand</span>
              <span>Start</span>
              <span>Inkomsten</span>
              <span>Vast</span>
              <span>Variabel</span>
              <span>Verschil</span>
              <span>Eindsaldo</span>
              <span>Status</span>
            </div>
            {#each totals.months as month}
              {@const sourceMonth = monthByNumber(month.month)}
              <div class="overview-row" role="row">
                <strong>{monthName(month.month)}</strong>
                <span>{formatMoneyCents(month.totals.startCents)}</span>
                <span>{formatMoneyCents(month.totals.incomeCents)}</span>
                <span>{formatMoneyCents(month.totals.fixedCents)}</span>
                <span>{formatMoneyCents(month.totals.variableCents)}</span>
                <span class:negative={month.totals.differenceCents < 0}>{formatMoneyCents(month.totals.differenceCents)}</span>
                <span class:negative={month.totals.restCents < 0}>{formatMoneyCents(month.totals.restCents)}</span>
                <small>{sourceMonth?.locked ? "Afgesloten" : "Open"}</small>
              </div>
            {/each}
          </div>
        </section>
      {:else if activeView === "insights"}
        <header class="menu-heading">
          <div>
            <h2>Inzichten</h2>
            <p>Eerste rustige controles op waar het geld zit. Grafieken en rapporten komen hier later bij.</p>
          </div>
        </header>
        <section class="overview-strip" aria-label="Inzichten samenvatting">
          <article>
            <span>Vaste kosten</span>
            <strong class="negative">{formatMoneyCents(sectionTotalCents("vaste_kosten"))}</strong>
          </article>
          <article>
            <span>Variabel</span>
            <strong class="negative">{formatMoneyCents(sectionTotalCents("variabele_kosten"))}</strong>
          </article>
          <article>
            <span>Partijen</span>
            <strong>{book.labels.parties.length}</strong>
          </article>
          <article>
            <span>Labels</span>
            <strong>{book.labels.income.length + book.labels.expense.length}</strong>
          </article>
          <article>
            <span>Open bedragen</span>
            <strong>{monthsWithOpenAmounts().length} maand{monthsWithOpenAmounts().length === 1 ? "" : "en"}</strong>
          </article>
        </section>
        <section class="settings-block workbook-block" aria-label="Inzichten per hoofdgroep">
          <header>
            <div>
              <h3>Hoofdgroepen</h3>
              <p>Lees-only overzicht. Dit wordt later de basis voor filters, grafieken en rapporten.</p>
            </div>
          </header>
          <div class="overview-table" role="table" aria-label="Totalen per hoofdgroep">
            <div class="overview-row overview-head" role="row">
              <span>Hoofdgroep</span>
              <span>Boekingen</span>
              <span>Totaal</span>
              <span>Gebruik</span>
            </div>
            {#each sectionTotalsForInsights() as insight}
              <div class="overview-row" role="row">
                <strong>{SECTION_LABELS[insight.section]}</strong>
                <span>{insight.count}</span>
                <span class:negative={insight.section !== "inkomsten"}>{formatMoneyCents(insight.amountCents)}</span>
                <small>{insight.section === "inkomsten" ? "Inkomstenstroom" : "Uitgavenstroom"}</small>
              </div>
            {/each}
          </div>
        </section>
        <section class="settings-block workbook-block" aria-label="Grootste partijen">
          <header>
            <div>
              <h3>Grootste partijen</h3>
              <p>Welke partijen komen in dit voorbeeldjaar het zwaarst terug?</p>
            </div>
          </header>
          <div class="overview-table" role="table" aria-label="Grootste partijen">
            <div class="overview-row overview-head" role="row">
              <span>Partij</span>
              <span>Boekingen</span>
              <span>Totaal</span>
              <span>Type</span>
            </div>
            {#each topParties() as party}
              <div class="overview-row" role="row">
                <strong>{party.party}</strong>
                <span>{party.count}</span>
                <span>{formatMoneyCents(party.amountCents)}</span>
                <small>{party.party === "Geen partij" ? "Onbekend" : "Terugkerend"}</small>
              </div>
            {/each}
          </div>
        </section>
      {:else if activeView === "manage"}
        <header class="menu-heading">
          <div>
            <h2>Beheer</h2>
            <p>Categorieen, partijen, labels en vaste regels staan hier als compacte werkbladen bij elkaar.</p>
          </div>
          <nav class="settings-tabs" aria-label="Beheer onderdelen">
            <button class:active={activeManageTab === "categories"} type="button" aria-pressed={activeManageTab === "categories"} onclick={() => (activeManageTab = "categories")}>{manageTabLabels.categories}</button>
            <button class:active={activeManageTab === "parties"} type="button" aria-pressed={activeManageTab === "parties"} onclick={() => (activeManageTab = "parties")}>{manageTabLabels.parties}</button>
            <button class:active={activeManageTab === "labels"} type="button" aria-pressed={activeManageTab === "labels"} onclick={() => (activeManageTab = "labels")}>{manageTabLabels.labels}</button>
            <button class:active={activeManageTab === "rules"} type="button" aria-pressed={activeManageTab === "rules"} onclick={() => (activeManageTab = "rules")}>{manageTabLabels.rules}</button>
          </nav>
        </header>

        {#if activeManageTab === "categories"}
          <section class="settings-block workbook-block" aria-label="Categorieen beheren">
            <header>
              <div>
                <h3>Categorieen</h3>
                <p>Beheer de subcategorieen die onder elke hoofdgroep in de maandkaarten verschijnen.</p>
              </div>
              {#if subcategoryMessage}
                <span class="settings-message" role="status">{subcategoryMessage}</span>
              {/if}
            </header>

            <div class="category-sheet">
              <div class="category-row sheet-head">
                <span>Subcategorie</span>
                <span>Boekingen</span>
                <span>Regels</span>
                <span>Volgorde</span>
                <span>Status</span>
              </div>
              {#each sections as section}
                {@const sectionSubcategories = settingsSubcategoriesFor(section)}
                <div class:income={section === "inkomsten"} class:fixed={section === "vaste_kosten"} class:variable={section === "variabele_kosten"} class="sheet-section-row">
                  <strong>{SECTION_LABELS[section]}</strong>
                  <span>{sectionSubcategories.length} subcategorie{sectionSubcategories.length === 1 ? "" : "en"}</span>
                </div>
                {#each sectionSubcategories as subcategory, index}
                  {@const usage = subcategoryUsage(book, subcategory.id)}
                  <div class="category-row">
                    <input
                      aria-label={`Naam van subcategorie ${subcategory.name}`}
                      value={subcategory.name}
                      onblur={(event) => renameSubcategory(subcategory.id, event)}
                      onkeydown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <span class="number-cell" title={subcategoryUsageLabel(subcategory.id)}>{usage.entries}</span>
                    <span class="number-cell" title={subcategoryUsageLabel(subcategory.id)}>{usage.recurringRules}</span>
                    <span class="sheet-actions">
                      <button type="button" aria-label={`${subcategory.name} omhoog`} title="Omhoog" data-tooltip="Omhoog" disabled={index === 0} onclick={() => moveSubcategory(subcategory.id, -1)}>
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" aria-label={`${subcategory.name} omlaag`} title="Omlaag" data-tooltip="Omlaag" disabled={index === sectionSubcategories.length - 1} onclick={() => moveSubcategory(subcategory.id, 1)}>
                        <ArrowDown size={15} />
                      </button>
                    </span>
                    <span class="muted-action">Auto</span>
                  </div>
                {/each}

                <div class="category-row add-sheet-row">
                  <input
                    aria-label={`Nieuwe subcategorie voor ${SECTION_LABELS[section]}`}
                    bind:value={newSubcategoryNames[section]}
                    placeholder={`Nieuwe subcategorie voor ${SECTION_LABELS[section]}`}
                    onkeydown={(event) => maybeAddSubcategoryFromKey(event, section)}
                  />
                  <span></span>
                  <span></span>
                  <span></span>
                  <button type="button" aria-label={`Subcategorie toevoegen aan ${SECTION_LABELS[section]}`} title="Toevoegen" data-tooltip="Toevoegen" onclick={() => addSubcategory(section)}>
                    <Plus size={16} />
                  </button>
                </div>
              {/each}
            </div>
          </section>
        {:else if activeManageTab === "parties"}
          <section class="settings-block workbook-block" aria-label="Partijen beheren">
            <header>
              <div>
                <h3>Partijen</h3>
                <p>Vrij getypte partijen worden geleerd bij bewaren. Hernoem naar een bestaande naam om suggesties samen te voegen.</p>
              </div>
              {#if subcategoryMessage}
                <span class="settings-message" role="status">{subcategoryMessage}</span>
              {/if}
            </header>
            <div class="category-sheet">
              <div class="category-row sheet-head">
                <span>Partij</span>
                <span>Gebruik</span>
                <span>Regels</span>
                <span>Uitleg</span>
                <span>Actie</span>
              </div>
              {#each book.labels.parties as party}
                <div class="category-row">
                  <input aria-label={`Partij-autofill ${party}`} value={party} onblur={(event) => renamePartySuggestion(party, event)} />
                  <span class="number-cell">{partyUsageCount(party)}</span>
                  <span class="number-cell">{book.recurringRules.filter((rule) => rule.party === party).length}</span>
                  <span class="muted-action">Bestaande boekingen blijven ongewijzigd.</span>
                  <button type="button" class="inline-action danger-inline" aria-label={`Partij-autofill verwijderen: ${party}`} title="Uit autofill verwijderen" data-tooltip="Uit autofill verwijderen" onclick={() => removePartySuggestion(party)}>Verwijderen</button>
                </div>
              {:else}
                <div class="category-row">
                  <strong>Nog geen partijen geleerd</strong>
                  <span></span>
                  <span></span>
                  <span class="muted-action">Vul partijen in de grid of vaste regels in.</span>
                  <span class="muted-action">Geen actie</span>
                </div>
              {/each}
            </div>
          </section>
        {:else if activeManageTab === "labels"}
          <section class="settings-block workbook-block" aria-label="Labels beheren">
            <header>
              <div>
                <h3>Labels</h3>
                <p>Omschrijvingen worden apart geleerd voor inkomsten en uitgaven. Verwijderen haalt enkel de suggestie weg.</p>
              </div>
              {#if subcategoryMessage}
                <span class="settings-message" role="status">{subcategoryMessage}</span>
              {/if}
            </header>
            <div class="category-sheet">
              <div class="category-row sheet-head">
                <span>Label</span>
                <span>Gebruik</span>
                <span>Regels</span>
                <span>Groep</span>
                <span>Actie</span>
              </div>
              {#each labelGroups as group}
                {@const labels = book.labels[group.key]}
                <div class:income={group.key === "income"} class:fixed={group.key === "expense"} class="sheet-section-row">
                  <strong>{group.label}</strong>
                  <span>{labels.length} label{labels.length === 1 ? "" : "s"}</span>
                </div>
                {#each labels as label}
                  <div class="category-row">
                    <input aria-label={`${group.label}-label ${label}`} value={label} onblur={(event) => renameLabelSuggestion(group.key, label, event)} />
                    <span class="number-cell">{labelUsageCount(label)}</span>
                    <span class="number-cell">{book.recurringRules.filter((rule) => rule.description === label).length}</span>
                    <span>{labelGroupName(group.key)}</span>
                    <button type="button" class="inline-action danger-inline" aria-label={`Label-autofill verwijderen: ${label}`} title="Uit autofill verwijderen" data-tooltip="Uit autofill verwijderen" onclick={() => removeLabelSuggestion(group.key, label)}>Verwijderen</button>
                  </div>
                {/each}
              {/each}
            </div>
          </section>
        {:else}
          <section class="settings-block workbook-block" aria-label="Regels beheren">
            <header>
              <div>
                <h3>Vaste regels</h3>
                <p>Beheer terugkerende posten. Aanpassingen worden meteen opnieuw toegepast op het jaar.</p>
              </div>
              {#if recurringRuleMessage}
                <span class="settings-message" role="status">{recurringRuleMessage}</span>
              {/if}
            </header>

            <section class="rule-composer" aria-label="Nieuwe vaste regel">
              <header>
                <div>
                  <h4>Nieuwe vaste regel</h4>
                  <p>Kies eerst de hoofdgroep en subcategorie. Omschrijving en bedrag zijn verplicht; partij mag leeg blijven.</p>
                </div>
                <span class="rule-example">Voorbeelden: huur elke maand, pensioen elke maand, belasting in maart, verzekering jaarlijks.</span>
              </header>
              <div class="new-rule-grid">
                <label>
                  <span>Hoofdgroep</span>
                  <select
                    aria-label="Hoofdgroep voor nieuwe regel"
                    title="Kies waar de regel in de maandkaarten verschijnt."
                    data-tooltip="Kies waar de regel in de maandkaarten verschijnt."
                    value={newRuleDraft.section}
                    onchange={(event) => {
                      const section = sectionFromValue(inputValue(event));
                      newRuleDraft = { ...newRuleDraft, section, subcategoryId: firstSubcategoryId(section) };
                    }}
                  >
                    {#each sections as section}
                      <option value={section}>{SECTION_LABELS[section]}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Subcategorie</span>
                  <select
                    aria-label="Subcategorie voor nieuwe regel"
                    title="De subcategorie waaronder de regel automatisch wordt geplaatst."
                    data-tooltip="De subcategorie waaronder de regel automatisch wordt geplaatst."
                    value={newRuleDraft.subcategoryId ?? ""}
                    onchange={(event) => (newRuleDraft = { ...newRuleDraft, subcategoryId: inputValue(event) || null })}
                  >
                    <option value="">Geen subcategorie</option>
                    {#each subcategoriesFor(newRuleDraft.section) as subcategory}
                      <option value={subcategory.id}>{subcategory.name}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Partij</span>
                  <input aria-label="Partij voor nieuwe regel" bind:value={newRuleDraft.party} list="party-suggestions" placeholder="Bij wie?" title="Optioneel. Bijvoorbeeld Pensioendienst, Telenet of Luminus." data-tooltip="Optioneel. Bijvoorbeeld Pensioendienst, Telenet of Luminus." onkeydown={maybeAddMonthlyRuleFromKey} />
                </label>
                <label class="wide-rule-field">
                  <span>Omschrijving</span>
                  <input aria-label="Omschrijving voor nieuwe regel" bind:value={newRuleDraft.description} list={labelListId(newRuleDraft.section)} placeholder="Wat komt terug?" title="Verplicht. Dit is de tekst die in de maandkaart verschijnt." data-tooltip="Verplicht. Dit is de tekst die in de maandkaart verschijnt." onkeydown={maybeAddMonthlyRuleFromKey} />
                </label>
                <label>
                  <span>Bedrag</span>
                  <input aria-label="Bedrag voor nieuwe regel" bind:value={newRuleDraft.amountText} inputmode="decimal" placeholder="0,00" title="Verplicht. Gebruik bijvoorbeeld 76,43." data-tooltip="Verplicht. Gebruik bijvoorbeeld 76,43." onkeydown={maybeAddMonthlyRuleFromKey} />
                </label>
                <label>
                  <span>Herhaling</span>
                  <select
                    aria-label="Herhaling voor nieuwe regel"
                    title={frequencyHelp(newRuleDraft.frequency)}
                    data-tooltip={frequencyHelp(newRuleDraft.frequency)}
                    value={newRuleDraft.frequency}
                    onchange={(event) => {
                      const frequency = frequencyFromValue(inputValue(event));
                      newRuleDraft = { ...newRuleDraft, frequency, pattern: defaultPatternForFrequency(frequency, newRuleDraft.startMonth, newRuleDraft.pattern) };
                    }}
                  >
                    {#each recurringFrequencies as frequency}
                      <option value={frequency.value}>{frequency.label}</option>
                    {/each}
                  </select>
                </label>
                {#if frequencyNeedsPattern(newRuleDraft.frequency)}
                  <label class="wide-rule-field">
                    <span>{patternLabel(newRuleDraft.frequency)}</span>
                    <input
                      aria-label="Patroon voor nieuwe regel"
                      bind:value={newRuleDraft.pattern}
                      placeholder={patternPlaceholder(newRuleDraft.frequency)}
                      title={frequencyHelp(newRuleDraft.frequency)}
                      data-tooltip={frequencyHelp(newRuleDraft.frequency)}
                      onkeydown={maybeAddMonthlyRuleFromKey}
                    />
                  </label>
                {/if}
                <label>
                  <span>Vanaf</span>
                  <select
                    aria-label="Startmaand voor nieuwe regel"
                    title="De eerste maand waarin deze regel mag verschijnen."
                    data-tooltip="De eerste maand waarin deze regel mag verschijnen."
                    value={String(newRuleDraft.startMonth)}
                    onchange={(event) => {
                      const startMonth = monthFromValue(inputValue(event), newRuleDraft.startMonth);
                      newRuleDraft = {
                        ...newRuleDraft,
                        startMonth,
                        pattern: defaultPatternForFrequency(newRuleDraft.frequency, startMonth, newRuleDraft.pattern),
                      };
                    }}
                  >
                    {#each selectedYear.months as month}
                      <option value={String(month.month)}>{monthName(month.month)}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Tot en met</span>
                  <select
                    aria-label="Eindmaand voor nieuwe regel"
                    title="Laat leeg doorlopen of kies de laatste maand."
                    data-tooltip="Laat leeg doorlopen of kies de laatste maand."
                    value={newRuleDraft.endMonth === null ? "" : String(newRuleDraft.endMonth)}
                    onchange={(event) => (newRuleDraft = { ...newRuleDraft, endMonth: optionalMonthFromValue(inputValue(event)) })}
                  >
                    <option value="">Doorlopend</option>
                    {#each selectedYear.months as month}
                      <option value={String(month.month)}>{monthName(month.month)}</option>
                    {/each}
                  </select>
                </label>
                <button type="button" aria-label="Vaste regel toevoegen" title="Regel toevoegen" data-tooltip="Regel toevoegen" onclick={addRecurringRule}>
                  <Plus size={16} />
                  Regel toevoegen
                </button>
              </div>
            </section>

            <div class="rule-sheet">
              <div class="rule-table-row sheet-head">
                <span>Actief</span>
                <span>Subcategorie</span>
                <span>Partij</span>
                <span>Omschrijving</span>
                <span>Bedrag</span>
                <span>Herhaling</span>
                <span>Periode</span>
                <span>Actie</span>
              </div>
              {#each sections as section}
                {@const sectionRules = rulesForSection(section)}
                <div class:income={section === "inkomsten"} class:fixed={section === "vaste_kosten"} class:variable={section === "variabele_kosten"} class="sheet-section-row">
                  <strong>{SECTION_LABELS[section]}</strong>
                  <span>{sectionRules.length} vaste regel{sectionRules.length === 1 ? "" : "s"}</span>
                </div>
                {#each sectionRules as rule}
                  <article class:inactive-rule={!rule.active} class="rule-table-item">
                    <div class="rule-table-row">
                    <label class="rule-switch">
                      <input
                        aria-label={`Regel actief: ${rule.description}`}
                        checked={rule.active}
                        type="checkbox"
                        onchange={(event) => applyRecurringRuleChange(rule.id, { active: checkboxValue(event) })}
                      />
                      <span>{rule.active ? "Aan" : "Uit"}</span>
                    </label>
                    <span>{ruleSubcategoryLabel(rule)}</span>
                    <span>{rulePartyLabel(rule)}</span>
                    <strong>{rule.description}</strong>
                    <strong class="rule-card-amount">{formatMoneyCents(rule.amountCents ?? 0)}</strong>
                    <span title={frequencyHelp(rule.frequency)}>{ruleFrequencyLabel(rule)}{frequencyNeedsPattern(rule.frequency) && rule.pattern ? `: ${rule.pattern}` : ""}</span>
                    <span>{rulePeriodLabel(rule)}</span>
                    <button
                      class="rule-edit-toggle"
                      type="button"
                      aria-expanded={editingRuleId === rule.id}
                      aria-label={`Regel bewerken: ${rule.description}`}
                      title="Bewerken"
                      data-tooltip="Bewerken"
                      onclick={() => (editingRuleId = editingRuleId === rule.id ? null : rule.id)}
                    >
                      <Pencil size={15} />
                      <span>{editingRuleId === rule.id ? "Sluiten" : "Bewerken"}</span>
                    </button>
                  </div>

                  {#if editingRuleId === rule.id}
                    <div class="rule-edit-grid">
                      <label>
                        <span>Hoofdgroep</span>
                        <select aria-label={`Hoofdgroep voor regel ${rule.description}`} value={rule.section} onchange={(event) => updateRuleSection(rule, sectionFromValue(inputValue(event)))}>
                          {#each sections as section}
                            <option value={section}>{SECTION_LABELS[section]}</option>
                          {/each}
                        </select>
                      </label>
                      <label>
                        <span>Subcategorie</span>
                        <select
                          aria-label={`Subcategorie voor regel ${rule.description}`}
                          value={rule.subcategoryId ?? ""}
                          onchange={(event) => applyRecurringRuleChange(rule.id, { subcategoryId: inputValue(event) || null })}
                        >
                          <option value="">Geen subcategorie</option>
                          {#each subcategoriesFor(rule.section) as subcategory}
                            <option value={subcategory.id}>{subcategory.name}</option>
                          {/each}
                        </select>
                      </label>
                      <label>
                        <span>Partij</span>
                        <input
                          aria-label={`Partij voor regel ${rule.description}`}
                          list="party-suggestions"
                          value={rule.party}
                          onblur={(event) => applyRecurringRuleChange(rule.id, { party: inputValue(event) })}
                        />
                      </label>
                      <label>
                        <span>Omschrijving</span>
                        <input
                          aria-label={`Omschrijving voor regel ${rule.description}`}
                          list={labelListId(rule.section)}
                          value={rule.description}
                          onblur={(event) => applyRecurringRuleChange(rule.id, { description: inputValue(event) })}
                        />
                      </label>
                      <label>
                        <span>Bedrag</span>
                        <input
                          aria-label={`Bedrag voor regel ${rule.description}`}
                          inputmode="decimal"
                          value={ruleAmountText(rule)}
                          onblur={(event) => applyRecurringRuleChange(rule.id, { amountCents: centsFromOptionalText(inputValue(event)) })}
                        />
                      </label>
                      <label>
                        <span>Herhaling</span>
                        <select aria-label={`Herhaling voor regel ${rule.description}`} title={frequencyHelp(rule.frequency)} data-tooltip={frequencyHelp(rule.frequency)} value={rule.frequency} onchange={(event) => updateRuleFrequency(rule, frequencyFromValue(inputValue(event)))}>
                          {#each recurringFrequencies as frequency}
                            <option value={frequency.value}>{frequency.label}</option>
                          {/each}
                        </select>
                      </label>
                      {#if frequencyNeedsPattern(rule.frequency)}
                        <label class="wide-rule-field">
                          <span>{patternLabel(rule.frequency)}</span>
                          <input
                            aria-label={`Patroon voor regel ${rule.description}`}
                            value={rule.pattern}
                            placeholder={patternPlaceholder(rule.frequency)}
                            title={frequencyHelp(rule.frequency)}
                            data-tooltip={frequencyHelp(rule.frequency)}
                            onblur={(event) => applyRecurringRuleChange(rule.id, { pattern: inputValue(event) })}
                          />
                        </label>
                      {/if}
                      <label>
                        <span>Vanaf</span>
                        <select aria-label={`Startmaand voor regel ${rule.description}`} value={String(rule.startMonth)} onchange={(event) => applyRecurringRuleChange(rule.id, { startMonth: monthFromValue(inputValue(event), rule.startMonth) })}>
                          {#each selectedYear.months as month}
                            <option value={String(month.month)}>{monthName(month.month)}</option>
                          {/each}
                        </select>
                      </label>
                      <label>
                        <span>Tot en met</span>
                        <select aria-label={`Eindmaand voor regel ${rule.description}`} value={rule.endMonth === null ? "" : String(rule.endMonth)} onchange={(event) => applyRecurringRuleChange(rule.id, { endYear: selectedYear.year, endMonth: optionalMonthFromValue(inputValue(event)) })}>
                          <option value="">Doorlopend</option>
                          {#each selectedYear.months as month}
                            <option value={String(month.month)}>{monthName(month.month)}</option>
                          {/each}
                        </select>
                      </label>
                    </div>
                  {/if}
                </article>
              {/each}
              {/each}
            </div>
          </section>
        {/if}
      {:else if activeView === "settings"}
        <header class="menu-heading">
          <div>
            <h2>Instellingen</h2>
            <p>Rustige appkeuzes: leermodus, echte modus, thema en lokale opslag.</p>
          </div>
        </header>
        <section class="settings-block workbook-block" aria-label="App-instellingen">
          <header>
            <div>
              <h3>Appgedrag</h3>
              <p>Alles wat bepaalt in welke omgeving en met welke weergave je werkt.</p>
            </div>
          </header>
          <div class="data-sheet">
            <div class="data-row sheet-head">
              <span>Onderdeel</span>
              <span>Huidige waarde</span>
              <span>Uitleg</span>
              <span>Actie</span>
            </div>
            <div class="data-row">
              <strong>Gegevensmodus</strong>
              <span>{appMode === "demo" ? "Leermodus" : "Productie"}</span>
              <span>{appMode === "demo" ? "Fictieve begroting 2026 voor oefenen en testen." : "Echte gegevens, apart bewaard van leermodus."}</span>
              <div class="mode-switch" aria-label="Gegevensmodus">
                <button class:active={appMode === "demo"} type="button" onclick={() => switchMode("demo")}>Leren</button>
                <button class:active={appMode === "production"} type="button" onclick={() => switchMode("production")}>Echt</button>
              </div>
            </div>
            <div class="data-row">
              <strong>Thema</strong>
              <span>{evening ? "Donker" : "Licht"}</span>
              <span>Gebruik licht overdag en donker wanneer dat rustiger leest.</span>
              <button class="inline-action" type="button" onclick={() => (evening = !evening)}>{evening ? "Licht" : "Donker"}</button>
            </div>
            <div class="data-row">
              <strong>Jaar</strong>
              <span>{selectedYear.year}</span>
              <span>Het actieve jaarblad in deze modus.</span>
              <span class="muted-action">Automatisch</span>
            </div>
            <div class="data-row">
              <strong>Startsaldo</strong>
              <span>{formatMoneyCents(selectedYear.startBalanceCents)}</span>
              <span>Basis waarop januari verder rekent.</span>
              <span class="muted-action">Later bewerkbaar</span>
            </div>
            <div class="data-row">
              <strong>Opslag</strong>
              <span>{saveStatus}</span>
              <span>Lokaal bewaard in deze appomgeving.</span>
              <span class="muted-action">{appMode === "demo" ? "Demo-opslag" : "Productie-opslag"}</span>
            </div>
          </div>
        </section>
      {:else}
        <header class="menu-heading">
          <div>
            <h2>Veiligheid</h2>
            <p>Back-up, herstel, controle en wijzigingen staan samen, zonder het jaarblad te verstoren.</p>
          </div>
          <nav class="settings-tabs" aria-label="Veiligheid onderdelen">
            <button class:active={activeBackupTab === "backup"} type="button" aria-pressed={activeBackupTab === "backup"} onclick={() => (activeBackupTab = "backup")}>{backupTabLabels.backup}</button>
            <button class:active={activeBackupTab === "changes"} type="button" aria-pressed={activeBackupTab === "changes"} onclick={() => (activeBackupTab = "changes")}>{backupTabLabels.changes}</button>
          </nav>
        </header>

        {#if activeBackupTab === "backup"}
          <section class="settings-block workbook-block" aria-label="Back-up en herstel">
            <header>
              <div>
                <h3>Back-up en herstel</h3>
                <p>Leesbare bestanden, gescheiden leermodus en echte modus, en een snelle modelcontrole.</p>
              </div>
              {#if safetyMessage}
                <span class="settings-message" role="status">{safetyMessage}</span>
              {/if}
            </header>
            <div class="backup-sheet">
              <div class="backup-row sheet-head">
                <span>Onderdeel</span>
                <span>Status</span>
                <span>Uitleg</span>
                <span>Actie</span>
              </div>
              <article class="backup-row">
                <span class="backup-topic">
                  <FileCheck size={18} />
                  <strong>Gegevenscontrole</strong>
                </span>
                <span>{validationIssues.length === 0 ? "Geen modelproblemen gevonden." : `${validationIssues.length} aandachtspunt${validationIssues.length === 1 ? "" : "en"} gevonden.`}</span>
                <span>Controleert of het boek past bij het gegevensmodel.</span>
                <button type="button" class="inline-action" onclick={runSafetyCheck}>Controle uitvoeren</button>
              </article>
              <article class="backup-row">
                <span class="backup-topic">
                  <Download size={18} />
                  <strong>Back-up maken</strong>
                </span>
                <span>{appMode === "demo" ? "Leermodus" : "Productie"}</span>
                <span>Download een leesbaar JSON-bestand van de huidige modus.</span>
                <button type="button" class="inline-action" onclick={exportBackup}>Maak back-up</button>
              </article>
              <article class="backup-row">
                <span class="backup-topic">
                  <Upload size={18} />
                  <strong>Back-up terugzetten</strong>
                </span>
                <span>JSON-bestand</span>
                <span>Kies een Abacus JSON-bestand. De app controleert het bestand eerst.</span>
                <button type="button" class="inline-action" onclick={chooseRestoreFile}>Kies bestand</button>
                <input bind:this={restoreInput} class="hidden-file-input" type="file" accept="application/json,.json" onchange={restoreBackup} />
              </article>
              <article class="backup-row danger-row">
                <span class="backup-topic">
                  <Shield size={18} />
                  <strong>Opnieuw starten</strong>
                </span>
                <span>Huidige modus</span>
                <span>Vervang alleen de huidige modus door een verse start. Maak eerst een back-up als je twijfelt.</span>
                <button type="button" class="inline-action danger-action" onclick={resetCurrentMode}>Start opnieuw</button>
              </article>
              <article class="backup-row passive">
                <span class="backup-topic">
                  <CheckCircle2 size={18} />
                  <strong>Lokale opslag</strong>
                </span>
                <span>{saveStatus}</span>
                <span>{appMode === "demo" ? "Leermodus gebruikt eigen lokale opslag." : "Echte modus gebruikt eigen lokale opslag."}</span>
                <span class="muted-action">Geen actie</span>
              </article>
              <article class="backup-row passive">
                <span class="backup-topic">
                  <Lock size={18} />
                  <strong>Gescheiden modi</strong>
                </span>
                <span>Beschermd</span>
                <span>Leren en Echt blijven apart, zodat testen de echte gegevens niet overschrijft.</span>
                <span class="muted-action">Beschermd</span>
              </article>
            </div>
          </section>
          <section class="settings-block workbook-block" aria-label="Controlelijst veiligheid">
            <header>
              <div>
                <h3>Controlelijst</h3>
                <p>Deze controle kijkt of het huidige boek past bij het gegevensmodel.</p>
              </div>
            </header>
            {#if validationIssues.length === 0}
              <div class="empty-state">
                <CheckCircle2 size={18} />
                <span>Alles wat nu in het boek zit, past bij het huidige gegevensmodel.</span>
              </div>
            {:else}
              <ul class="issue-list">
                {#each validationIssues as issue}
                  <li>{issue}</li>
                {/each}
              </ul>
            {/if}
          </section>
        {:else}
          <section class="settings-block workbook-block" aria-label="Wijzigingen">
            <header>
              <div>
                <h3>Wijzigingen</h3>
                <p>Acties die je vanaf deze versie doet, komen hier bovenaan te staan.</p>
              </div>
              <div class="history-actions">
                <button type="button" class="inline-action" disabled={undoStack.length === 0} onclick={undoLastChange}>Ongedaan maken</button>
                <button type="button" class="inline-action" disabled={redoStack.length === 0} onclick={redoLastChange}>Opnieuw doen</button>
              </div>
            </header>
            {#if undoMessage}
              <span class="settings-message" role="status">{undoMessage}</span>
            {/if}
            {#if visibleHistoryEvents.length === 0}
              <div class="empty-state">
                <Clock size={18} />
                <span>Nog geen wijzigingen geregistreerd sinds deze functie actief is.</span>
              </div>
            {:else}
              <div class="event-list sheet-list">
                <div class="event-row sheet-head">
                  <span>Tijd</span>
                  <span>Type</span>
                  <span>Omschrijving</span>
                  <span>Modus</span>
                </div>
                {#each visibleHistoryEvents as event}
                  <article class="event-row">
                    <span>{formatHistoryTime(event.timestamp)}</span>
                    <strong>{event.title}</strong>
                    <span>{event.detail}</span>
                    <small>{event.mode === "demo" ? "Leren" : "Echt"}</small>
                  </article>
                {/each}
              </div>
            {/if}
          </section>
          <section class="settings-block workbook-block" aria-label="Recente boekingen">
            <header>
              <div>
                <h3>Recente boekingen</h3>
                <p>De nieuwste regels bovenaan, inclusief automatisch aangemaakte vaste regels.</p>
              </div>
            </header>
            {#if recentEntries.length === 0}
              <div class="empty-state">
                <Clock size={18} />
                <span>Er zijn nog geen boekingen in dit jaar.</span>
              </div>
            {:else}
              <div class="history-list sheet-list">
                <div class="history-row sheet-head">
                  <span>Datum</span>
                  <span>Maand</span>
                  <span>Groep</span>
                  <span>Partij</span>
                  <span>Omschrijving</span>
                  <span>Bedrag</span>
                  <span>Type</span>
                </div>
                {#each recentEntries as item}
                  <article class="history-row">
                    <span>{formatEntryDate(item.entry.date)}</span>
                    <strong>{monthName(item.monthNumber)}</strong>
                    <span>{item.sectionLabel}</span>
                    <span>{item.entry.party || "Geen partij"}</span>
                    <span>{item.entry.description}</span>
                    <strong>{formatMoneyCents(item.entry.amountCents ?? 0)}</strong>
                    <small>{item.isRecurring ? "Vaste regel" : "Handmatig"}</small>
                  </article>
                {/each}
              </div>
            {/if}
          </section>
          <section class="settings-block workbook-block" aria-label="Herstelstappen">
            <header>
              <div>
                <h3>Herstelstappen</h3>
                <p>{undoStack.length} stap{undoStack.length === 1 ? "" : "pen"} terug en {redoStack.length} stap{redoStack.length === 1 ? "" : "pen"} opnieuw beschikbaar.</p>
              </div>
              <div class="history-actions">
                <button type="button" class="inline-action" disabled={undoStack.length === 0} onclick={undoLastChange}>Ongedaan</button>
                <button type="button" class="inline-action" disabled={redoStack.length === 0} onclick={redoLastChange}>Opnieuw</button>
              </div>
            </header>
          </section>
        {/if}
      {/if}
    </section>
  {:else}

  <section class="month-tabs" aria-label="Maanden" data-testid="month-tabs">
    {#each selectedYear.months as month}
      {@const total = monthTotal(month.month)}
      <button
        type="button"
        class:active={activeMonth === month.month}
        class:current-month={currentMonthInSelectedYear === month.month}
        data-month-tab={month.month}
        data-current-month={currentMonthInSelectedYear === month.month ? "true" : undefined}
        aria-current={activeMonth === month.month ? "date" : undefined}
        style={monthThemeStyle(month.month)}
        onclick={() => selectMonth(month.month)}
      >
        <span class="month-number">{month.month}</span>
        <strong>{monthName(month.month)}</strong>
        <em>{formatMoneyCents(total?.restCents ?? 0)}</em>
        {#if currentMonthInSelectedYear === month.month}
          <Sun class="current-sun" size={14} aria-hidden="true" />
        {/if}
      </button>
    {/each}
  </section>

  <section class="board" aria-label="Maandkaarten">
    <button class="year-loop-card year-loop-start" type="button" title="Naar december" data-tooltip="Naar december" onclick={() => selectMonth(12)}>
      <span>December</span>
      <strong>Naar jaareinde</strong>
    </button>
    <div class="board-spacer board-spacer-start" aria-hidden="true"></div>
    {#each selectedYear.months as month}
      {@const total = monthTotal(month.month)}
      <div
        class:active-card={activeMonth === month.month}
        class:current-month={currentMonthInSelectedYear === month.month}
        class:locked-card={month.locked}
        class="month-card"
        aria-label={monthName(month.month)}
        data-month-card={month.month}
        role="group"
        style={monthThemeStyle(month.month)}
        onpointerup={(event) => selectCardFromPointer(event, month.month)}
        onfocusin={(event) => activateMonthForFocus(event, month.month)}
      >
        <header class="month-header">
          <img src={monthImage(month.month)} alt="" />
          <div class="month-title">
            {#if currentMonthInSelectedYear === month.month}
              <Sun class="current-card-sun" size={17} aria-hidden="true" />
            {/if}
            <h2>{monthName(month.month)}</h2>
          </div>
          <div class="month-tools">
            <button type="button" aria-label="Vorige maand" title="Vorige maand" data-tooltip="Vorige maand" onclick={() => selectMonth(previousMonth(month.month))}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Volgende maand" title="Volgende maand" data-tooltip="Volgende maand" onclick={() => selectMonth(nextMonth(month.month))}>
              <ChevronRight size={18} />
            </button>
            <button
              class:has-note={Boolean(month.comment?.trim())}
              type="button"
              aria-label={`Maandopmerking voor ${monthName(month.month)}`}
              title="Maandopmerking"
              data-tooltip="Maandopmerking"
              onclick={() => openMonthNote(month)}
            >
              <MessageCircle size={18} />
            </button>
            <button
              type="button"
              aria-label={month.locked ? "Maand ontgrendelen" : "Maand afsluiten"}
              title={month.locked ? "Maand ontgrendelen" : "Maand afsluiten"}
              data-tooltip={month.locked ? "Maand ontgrendelen" : "Maand afsluiten"}
              onclick={() => toggleMonthLock(month)}
            >
              {#if month.locked}
                <Unlock size={18} />
              {:else}
                <Lock size={18} />
              {/if}
            </button>
          </div>
        </header>

        <div class="grid-head">
          <span class="party-head">Partij</span>
          <span class="description-head">Omschrijving</span>
          <span class="amount-head">Bedrag</span>
          <span class="action-head">Actie</span>
        </div>

        {#if month.locked}
          <div class="locked-month-note" role="status">
            <Lock size={14} aria-hidden="true" />
            <span>{monthName(month.month)} is vergrendeld. Ontgrendel om te wijzigen.</span>
          </div>
          <div class="projection-note" role="status">
            <Clock size={14} aria-hidden="true" />
            <span>{projectionStateLabel(month)}</span>
          </div>
        {/if}
        {#if month.projection}
          <div class="projection-note" role="status">
            <Clock size={14} aria-hidden="true" />
            <span>Projectie vanuit {month.projection.sourceYear}, {month.projection.entryCount} regel{month.projection.entryCount === 1 ? "" : "s"}.</span>
          </div>
        {/if}

        <div class="month-ledger">
          {#each sections as section}
            <section class:expense-section={section !== "inkomsten"} class:income-section={section === "inkomsten"} class="budget-section" aria-label={SECTION_LABELS[section]}>
            <div class:income={section === "inkomsten"} class:fixed={section === "vaste_kosten"} class:variable={section === "variabele_kosten"} class="section-title">
              {#if section === "inkomsten"}
                <Coins size={15} />
              {:else if section === "vaste_kosten"}
                <ShieldCheck size={15} />
              {:else}
                <ShoppingBasket size={15} />
              {/if}
              <strong>{SECTION_LABELS[section]}</strong>
              <span>{formatMoneyCents(sectionTotal(month, section))}</span>
            </div>

            {#if section === "inkomsten"}
              <div class="entry-row carry-entry" data-transfer-row="true">
                <span class="party-cell">Overdracht</span>
                <span class="description-text">Resterend van vorige maand</span>
                <strong class="amount-cell">{formatDecimalCents(total?.startCents ?? 0)}</strong>
                <span class="transfer-spacer actions-cell" aria-hidden="true"></span>
              </div>
            {/if}

            {#each subcategoriesFor(section) as subcategory}
              {@const groupedEntries = entriesFor(month, section, subcategory.id)}
              {@const subcategoryTotal = total?.bySubcategoryCents[subcategory.id] ?? 0}
              <div class="subcategory-row" data-entry-count={groupedEntries.length}>
                <span>{subcategory.name}</span>
                <strong>{formatMoneyCents(subcategoryTotal)}</strong>
                <span class="subcategory-actions actions-cell">
                  <button
                    class="subcategory-add"
                    type="button"
                    aria-label={`Invoer openen voor ${subcategory.name}`}
                    title={month.locked ? `${monthName(month.month)} is vergrendeld` : `Invoer openen voor ${subcategory.name}`}
                    data-tooltip={month.locked ? "Maand vergrendeld" : `Invoer openen voor ${subcategory.name}`}
                    disabled={month.locked}
                    onclick={() => openDraft(month.month, section, subcategory.id)}
                  >
                    <Plus size={15} />
                  </button>
                </span>
              </div>

              {@const draft = draftFor(month.month, section, subcategory.id)}
              {@const key = draftKey(month.month, section, subcategory.id)}
              {#if !month.locked && isDraftVisible(key, draft)}
                <div
                  class:has-error={Boolean(draft.descriptionError || draft.amountError)}
                  class:has-note={Boolean(draft.comment.trim())}
                  class="entry-row new-entry-row new-entry-panel"
                  data-testid={`draft-${month.month}-${section}-${subcategory.id}`}
                  onfocusout={(event) => maybeCommitOnPanelBlur(event, month, section, subcategory.id)}
                  onfocusin={() => activateMonthForInput(month.month)}
                >
                  <input
                    class="ledger-input party-input"
                    aria-label={`Partij voor ${subcategory.name} in ${monthName(month.month)}`}
                    bind:value={draft.party}
                    list="party-suggestions"
                    placeholder={section === "inkomsten" ? "Van wie?" : "Bij wie?"}
                    onkeydown={(event) => maybeHandleDraftKey(event, month, section, subcategory.id)}
                  />

                  <label class="field description-field">
                    <input
                      class="ledger-input description-input"
                      aria-describedby={draft.descriptionError ? `description-error-${month.month}-${section}-${subcategory.id}` : undefined}
                      aria-invalid={Boolean(draft.descriptionError)}
                      aria-label={`Omschrijving voor ${subcategory.name} in ${monthName(month.month)}`}
                      bind:value={draft.description}
                      list={labelListId(section)}
                      placeholder="Omschrijving"
                      oninput={() => clearDescriptionError(draft)}
                      onkeydown={(event) => maybeHandleDraftKey(event, month, section, subcategory.id)}
                    />
                    {#if draft.descriptionError}
                      <small id={`description-error-${month.month}-${section}-${subcategory.id}`} class="field-error">{draft.descriptionError}</small>
                    {/if}
                  </label>

                  <label class="field amount-field">
                    <input
                      class="ledger-input"
                      aria-describedby={draft.amountError ? `amount-error-${month.month}-${section}-${subcategory.id}` : undefined}
                      aria-invalid={Boolean(draft.amountError)}
                      aria-label={`Bedrag voor ${subcategory.name} in ${monthName(month.month)}`}
                      bind:value={draft.amountText}
                      inputmode="decimal"
                      placeholder="0,00"
                      oninput={() => clearAmountError(draft)}
                      onkeydown={(event) => maybeHandleDraftKey(event, month, section, subcategory.id)}
                    />
                    {#if draft.amountError}
                      <small id={`amount-error-${month.month}-${section}-${subcategory.id}`} class="field-error">{draft.amountError}</small>
                    {/if}
                  </label>

                  <span class="row-actions actions-cell">
                    <button
                      class:has-note={Boolean(draft.comment.trim())}
                      class="note-row"
                      type="button"
                      aria-label={`Uitgebreide melding voor ${subcategory.name}`}
                      title={`Uitgebreide melding voor ${subcategory.name}`}
                      data-tooltip="Uitgebreide melding"
                      onpointerdown={(event) => event.preventDefault()}
                      onclick={() => openDraftNote(month.month, section, subcategory)}
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button
                      class="add-entry"
                      type="button"
                      aria-label={`Nieuwe regel toevoegen aan ${subcategory.name}`}
                      title={`Nieuwe regel toevoegen aan ${subcategory.name}`}
                      data-tooltip="Regel toevoegen"
                      onclick={() => commitDraft(month, section, subcategory.id)}
                    >
                      <Plus size={16} />
                    </button>
                  </span>
                </div>
              {/if}

              {#if groupedEntries.length > 0}
                {#each groupedEntries as entry}
                  {#if editingEntryId === entry.id}
                    <div
                      class:has-error={Boolean(editDraft.descriptionError || editDraft.amountError)}
                      class="entry-row edit-row"
                      data-edit-entry={entry.id}
                      data-testid={`edit-${entry.id}`}
                      onfocusin={() => activateMonthForInput(month.month)}
                    >
                      <input
                        class="ledger-input party-input"
                        aria-label={`Partij bewerken voor ${entry.description}`}
                        bind:value={editDraft.party}
                        list="party-suggestions"
                        onkeydown={(event) => maybeHandleEditKey(event, entry)}
                      />
                      <span class="description-cell">
                        <input
                          class="ledger-input description-input"
                          aria-describedby={editDraft.descriptionError ? `edit-description-error-${entry.id}` : undefined}
                          aria-invalid={Boolean(editDraft.descriptionError)}
                          aria-label={`Omschrijving bewerken voor ${entry.description}`}
                          bind:value={editDraft.description}
                          list={labelListId(entry.section)}
                          oninput={() => clearDescriptionError(editDraft)}
                          onkeydown={(event) => maybeHandleEditKey(event, entry)}
                        />
                        <button
                          class:has-note={Boolean(editDraft.comment.trim())}
                          class="note-row"
                          type="button"
                          aria-label={`Uitgebreide melding bewerken voor ${entry.description}`}
                          title="Uitgebreide melding"
                          data-tooltip="Uitgebreide melding"
                          onpointerdown={(event) => event.preventDefault()}
                          disabled={month.locked}
                          onclick={() => openEditNote(entry)}
                        >
                          <MessageCircle size={14} />
                        </button>
                        {#if editDraft.descriptionError}
                          <small id={`edit-description-error-${entry.id}`} class="field-error">{editDraft.descriptionError}</small>
                        {/if}
                      </span>
                      <label class="edit-amount">
                        <input
                          class="ledger-input"
                          aria-describedby={editDraft.amountError ? `edit-error-${entry.id}` : undefined}
                          aria-invalid={Boolean(editDraft.amountError)}
                          aria-label={`Bedrag bewerken voor ${entry.description}`}
                          bind:value={editDraft.amountText}
                          inputmode="decimal"
                          oninput={() => clearAmountError(editDraft)}
                          onkeydown={(event) => maybeHandleEditKey(event, entry)}
                        />
                        {#if editDraft.amountError}
                          <small id={`edit-error-${entry.id}`} class="field-error">{editDraft.amountError}</small>
                        {/if}
                      </label>
                      <span class="row-actions actions-cell">
                        <button class="save-row" type="button" aria-label="Wijziging bewaren" title="Wijziging bewaren" data-tooltip="Wijziging bewaren" disabled={month.locked} onclick={() => saveEdit(entry)}><Check size={15} /></button>
                        <button type="button" aria-label="Bewerken annuleren" title="Bewerken annuleren" data-tooltip="Bewerken annuleren" onclick={cancelEdit}><X size={15} /></button>
                      </span>
                    </div>
                    {#if deleteConfirmEntryId === entry.id}
                      <div class="delete-confirm-row" data-testid={`delete-confirm-${entry.id}`}>
                        <span>Deze regel verwijderen?</span>
                        <button class="danger-row" type="button" aria-label="Verwijderen bevestigen" disabled={month.locked} onclick={() => deleteEntry(month, entry)}>Verwijderen</button>
                        <button type="button" aria-label="Verwijderen annuleren" onclick={cancelDelete}>Annuleren</button>
                      </div>
                    {:else}
                      <button class="delete-request-row" type="button" aria-label={`Verwijderen voorbereiden: ${entry.description}`} title={month.locked ? `${monthName(month.month)} is vergrendeld` : "Verwijderen voorbereiden"} data-tooltip={month.locked ? "Maand vergrendeld" : "Verwijderen voorbereiden"} disabled={month.locked} onclick={() => requestDelete(entry)}>
                        <Trash2 size={15} />
                        Verwijderen
                      </button>
                    {/if}
                  {:else}
                    <div class:recent-row={recentEntryId === entry.id} class="entry-row" data-entry-row={entry.id}>
                      <span class="party-cell" title={entry.party || "-"}>{entry.party || "-"}</span>
                      <span class:has-note={Boolean(entry.comment)} class="description-text" title={entry.description}>
                        <span>{entry.description}</span>
                        {#if entry.comment}
                          <button class="note-indicator" type="button" aria-label={`Melding bekijken: ${entry.description}`} title={month.locked ? `${monthName(month.month)} is vergrendeld` : "Melding bekijken"} data-tooltip={month.locked ? "Maand vergrendeld" : "Melding bekijken"} disabled={month.locked} onclick={() => openEntryNote(entry)}><MessageCircle size={12} /></button>
                        {/if}
                      </span>
                      <strong class="amount-cell">{formatDecimalCents(entry.amountCents)}</strong>
                      <span class="row-actions actions-cell">
                        <button type="button" aria-label={`Regel bewerken: ${entry.description}`} title={month.locked ? `${monthName(month.month)} is vergrendeld` : "Regel bewerken"} data-tooltip={month.locked ? "Maand vergrendeld" : "Regel bewerken"} disabled={month.locked} onclick={() => startEdit(month, entry)}><Pencil size={15} /></button>
                      </span>
                    </div>
                  {/if}
                {/each}
              {/if}
            {/each}

            {#each uncategorizedEntries(month, section) as entry}
              {#if editingEntryId === entry.id}
                <div
                  class:has-error={Boolean(editDraft.descriptionError || editDraft.amountError)}
                  class="entry-row edit-row"
                  data-edit-entry={entry.id}
                  data-testid={`edit-${entry.id}`}
                  onfocusin={() => activateMonthForInput(month.month)}
                >
                  <input
                    class="ledger-input party-input"
                    aria-label={`Partij bewerken voor ${entry.description}`}
                    bind:value={editDraft.party}
                    list="party-suggestions"
                    onkeydown={(event) => maybeHandleEditKey(event, entry)}
                  />
                  <span class="description-cell">
                    <input
                      class="ledger-input description-input"
                      aria-describedby={editDraft.descriptionError ? `edit-description-error-${entry.id}` : undefined}
                      aria-invalid={Boolean(editDraft.descriptionError)}
                      aria-label={`Omschrijving bewerken voor ${entry.description}`}
                      bind:value={editDraft.description}
                      list={labelListId(entry.section)}
                      oninput={() => clearDescriptionError(editDraft)}
                      onkeydown={(event) => maybeHandleEditKey(event, entry)}
                    />
                    <button
                      class:has-note={Boolean(editDraft.comment.trim())}
                      class="note-row"
                      type="button"
                      aria-label={`Uitgebreide melding bewerken voor ${entry.description}`}
                      title="Uitgebreide melding"
                      data-tooltip="Uitgebreide melding"
                      onpointerdown={(event) => event.preventDefault()}
                      disabled={month.locked}
                      onclick={() => openEditNote(entry)}
                    >
                      <MessageCircle size={14} />
                    </button>
                    {#if editDraft.descriptionError}
                      <small id={`edit-description-error-${entry.id}`} class="field-error">{editDraft.descriptionError}</small>
                    {/if}
                  </span>
                  <label class="edit-amount">
                    <input
                      class="ledger-input"
                      aria-describedby={editDraft.amountError ? `edit-error-${entry.id}` : undefined}
                      aria-invalid={Boolean(editDraft.amountError)}
                      aria-label={`Bedrag bewerken voor ${entry.description}`}
                      bind:value={editDraft.amountText}
                      inputmode="decimal"
                      oninput={() => clearAmountError(editDraft)}
                      onkeydown={(event) => maybeHandleEditKey(event, entry)}
                    />
                    {#if editDraft.amountError}
                      <small id={`edit-error-${entry.id}`} class="field-error">{editDraft.amountError}</small>
                    {/if}
                  </label>
                  <span class="row-actions actions-cell">
                    <button class="save-row" type="button" aria-label="Wijziging bewaren" title="Wijziging bewaren" data-tooltip="Wijziging bewaren" disabled={month.locked} onclick={() => saveEdit(entry)}><Check size={15} /></button>
                    <button type="button" aria-label="Bewerken annuleren" title="Bewerken annuleren" data-tooltip="Bewerken annuleren" onclick={cancelEdit}><X size={15} /></button>
                  </span>
                </div>
                {#if deleteConfirmEntryId === entry.id}
                  <div class="delete-confirm-row" data-testid={`delete-confirm-${entry.id}`}>
                    <span>Deze regel verwijderen?</span>
                    <button class="danger-row" type="button" aria-label="Verwijderen bevestigen" title="Verwijderen bevestigen" data-tooltip="Verwijderen bevestigen" disabled={month.locked} onclick={() => deleteEntry(month, entry)}>Verwijderen</button>
                    <button type="button" aria-label="Verwijderen annuleren" title="Verwijderen annuleren" data-tooltip="Verwijderen annuleren" onclick={cancelDelete}>Annuleren</button>
                  </div>
                {:else}
                    <button class="delete-request-row" type="button" aria-label={`Verwijderen voorbereiden: ${entry.description}`} title={month.locked ? `${monthName(month.month)} is vergrendeld` : "Verwijderen voorbereiden"} data-tooltip={month.locked ? "Maand vergrendeld" : "Verwijderen voorbereiden"} disabled={month.locked} onclick={() => requestDelete(entry)}>
                    <Trash2 size={15} />
                    Verwijderen
                  </button>
                {/if}
              {:else}
                <div class:recent-row={recentEntryId === entry.id} class="entry-row" data-entry-row={entry.id}>
                  <span class="party-cell" title={entry.party || "-"}>{entry.party || "-"}</span>
                  <span class:has-note={Boolean(entry.comment)} class="description-text" title={entry.description}>
                    <span>{entry.description}</span>
                    {#if entry.comment}
                      <button class="note-indicator" type="button" aria-label={`Melding bekijken: ${entry.description}`} title={month.locked ? `${monthName(month.month)} is vergrendeld` : "Melding bekijken"} data-tooltip={month.locked ? "Maand vergrendeld" : "Melding bekijken"} disabled={month.locked} onclick={() => openEntryNote(entry)}><MessageCircle size={12} /></button>
                    {/if}
                  </span>
                  <strong class="amount-cell">{formatDecimalCents(entry.amountCents)}</strong>
                  <span class="row-actions actions-cell">
                    <button type="button" aria-label={`Regel bewerken: ${entry.description}`} title={month.locked ? `${monthName(month.month)} is vergrendeld` : "Regel bewerken"} data-tooltip={month.locked ? "Maand vergrendeld" : "Regel bewerken"} disabled={month.locked} onclick={() => startEdit(month, entry)}><Pencil size={15} /></button>
                  </span>
                </div>
              {/if}
            {/each}
            </section>
          {/each}
        </div>

        <footer class="month-footer">
          <span class="month-footer-stat">
            <em>Maandverschil</em>
            <strong class:negative={(total?.differenceCents ?? 0) < 0}>{formatMoneyCents(total?.differenceCents ?? 0)}</strong>
          </span>
          <span class="month-footer-stat">
            <em>Eindsaldo</em>
            <strong class:negative={(total?.restCents ?? 0) < 0}>{formatMoneyCents(total?.restCents ?? 0)}</strong>
          </span>
        </footer>
      </div>
    {/each}
    <div class="board-spacer" aria-hidden="true"></div>
    <button class="year-loop-card" type="button" title="Terug naar begin" data-tooltip="Terug naar begin" onclick={() => selectMonth(1)}>
      <span>Januari</span>
      <strong>Terug naar begin</strong>
    </button>
  </section>
  {/if}

  {#if notePopup}
    <div class="note-overlay" role="presentation">
      <div class="note-popup" role="dialog" aria-modal="true" aria-labelledby="note-popup-title" data-testid="note-popup">
        <header>
          <MessageCircle size={18} aria-hidden="true" />
          <div>
            <h2 id="note-popup-title">Uitgebreide melding</h2>
            <p>{notePopup.title}</p>
          </div>
        </header>
        <textarea
          aria-label="Uitgebreide melding"
          bind:value={noteText}
          placeholder="Voeg hier extra uitleg, context of een geheugensteun toe."
          oninput={() => (noteCancelWarning = false)}
          onkeydown={maybeHandleNoteKey}
        ></textarea>
        {#if noteCancelWarning}
          <p class="note-warning" role="alert">Deze melding is nog niet bewaard.</p>
        {/if}
        <footer>
          {#if noteCancelWarning}
            <button class="danger-note" type="button" aria-label="Melding sluiten zonder bewaren" title="Melding sluiten zonder bewaren" data-tooltip="Sluiten zonder bewaren" onclick={closeNotePopup}>Toch sluiten</button>
          {:else}
            <button type="button" aria-label="Melding annuleren" title="Melding annuleren" data-tooltip="Melding annuleren" onclick={requestCloseNotePopup}>Annuleren</button>
          {/if}
          <button class="save-note" type="button" aria-label="Melding bewaren" title="Melding bewaren" data-tooltip="Melding bewaren" onclick={saveNotePopup}>Bewaren</button>
        </footer>
      </div>
    </div>
  {/if}

  <footer class="status-bar">
    <span class="status-mode">{appMode === "demo" ? "Leermodus" : "Productie"} - {saveStatus}</span>
    <strong>{statusCenterLabel()}</strong>
    <span class="status-date" title={`${currentDateLabel} ${currentClock}`}>
      <span class="date-label">{currentDateLabel}</span>
      <Clock size={14} aria-hidden="true" />
      {currentClock}
    </span>
  </footer>
</main>
