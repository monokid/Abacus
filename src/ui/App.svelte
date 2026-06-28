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
    History,
    Lock,
    MessageCircle,
    Moon,
    Pencil,
    Plus,
    RotateCcw,
    Settings,
    Shield,
    ShieldCheck,
    ShoppingBasket,
    Sun,
    Trash2,
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
    moveSubcategory as moveBookSubcategory,
    renameSubcategory as renameBookSubcategory,
    subcategoryUsage,
    updateRecurringRule as updateBookRecurringRule,
    validateBook,
  } from "../core/model";
  import { syncRecurringEntriesForBook } from "../core/recurring";
  import { fictionalSampleBook } from "../core/sample-data";
  import { SECTION_LABELS, type Section } from "../core/sections";
  import type { Book, BudgetMonth, Entry, RecurringFrequency, RecurringRule, Subcategory } from "../core/model";

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

  interface BackupFile {
    app?: string;
    exportedAt?: string;
    mode?: AppMode;
    book?: Book;
  }

  type AppMode = "demo" | "production";
  type AppView = "year" | "edit" | "settings" | "safety" | "history";
  type SettingsTab = "data" | "categories" | "rules";
  type NoteTarget =
    | { kind: "draft"; monthNumber: number; section: Section; subcategoryId: string; title: string }
    | { kind: "edit"; entryId: string; title: string }
    | { kind: "entry"; entryId: string; title: string };

  const demoStorageKey = "abacus.demo.2026.v2";
  const productionStorageKey = "abacus.book.v1";
  const modeStorageKey = "abacus.mode.v1";
  const historyStorageKey = "abacus.history.v1";
  const viewLabels: Record<AppView, string> = {
    year: "Jaar",
    edit: "Bewerken",
    settings: "Instellingen",
    safety: "Veiligheid",
    history: "Historiek",
  };
  const settingsTabLabels: Record<SettingsTab, string> = {
    data: "Gegevens",
    categories: "Categorieen",
    rules: "Vaste regels",
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
  const initialBook = fictionalSampleBook();
  const today = new Date();

  let book = $state(initialBook);
  let appMode = $state<AppMode>("demo");
  let activeView = $state<AppView>("year");
  let activeSettingsTab = $state<SettingsTab>("data");
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
  let restoreInput: HTMLInputElement | null = $state(null);

  const selectedYear = $derived.by(() => {
    const year = book.years[0];
    if (!year) throw new Error("Geen voorbeeldjaar gevonden.");
    return year;
  });

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
          book = parsedBook;
          drafts = createDrafts(parsedBook);
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

    book = fallbackBook;
    drafts = createDrafts(fallbackBook);
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

      book = restoredBook;
      syncRecurringEntriesForBook(book);
      drafts = createDrafts(book);
      expandedDraftKey = null;
      editingEntryId = null;
      deleteConfirmEntryId = null;
      activeMonth = currentMonthInSelectedYear ?? 1;
      safetyMessage = `${file.name} teruggezet in ${appMode === "demo" ? "leermodus" : "echte modus"}.`;
      recordHistory("Back-up teruggezet", `${file.name} teruggezet in ${appMode === "demo" ? "leermodus" : "echte modus"}.`);
      requestAnimationFrame(() => selectMonth(activeMonth));
    } catch {
      safetyMessage = "Back-upbestand kon niet gelezen worden.";
      recordHistory("Herstel mislukt", `${file.name} kon niet gelezen worden.`);
    }
  }

  function resetCurrentMode(): void {
    const modeLabel = appMode === "demo" ? "leermodus" : "echte modus";
    if (!window.confirm(`Wil je de ${modeLabel} opnieuw starten? Dit vervangt de lokale gegevens in deze modus.`)) return;

    const nextBook = defaultBookForMode(appMode);
    book = nextBook;
    syncRecurringEntriesForBook(book);
    drafts = createDrafts(book);
    expandedDraftKey = null;
    editingEntryId = null;
    deleteConfirmEntryId = null;
    safetyMessage = `${appMode === "demo" ? "Leermodus" : "Echte modus"} opnieuw gestart.`;
    recordHistory("Gegevens opnieuw gestart", `${appMode === "demo" ? "Leermodus" : "Echte modus"} opnieuw gestart.`);
    requestAnimationFrame(() => selectMonth(currentMonthInSelectedYear ?? 1));
  }

  function defaultBookForMode(mode: AppMode): Book {
    return mode === "demo" ? fictionalSampleBook() : createEmptyBook(2026);
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
    storageReady = true;
    recordHistory("Gegevensmodus gewijzigd", `${previousMode === "demo" ? "Leren" : "Echt"} naar ${nextMode === "demo" ? "Leren" : "Echt"}.`);
    requestAnimationFrame(() => selectMonth(activeMonth));
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

  function centerMonth(monthNumber: number, focusCard = false, resetVertical = false): void {
    activeMonth = monthNumber;

    requestAnimationFrame(() => {
      scrollRailToItem(".board", `[data-month-card="${monthNumber}"]`, resetVertical);
      scrollRailToItem(".month-tabs", `[data-month-tab="${monthNumber}"]`);
      if (focusCard) {
        const card = document.querySelector(`[data-month-card="${monthNumber}"]`);
        if (card instanceof HTMLElement) card.focus({ preventScroll: true });
      }
    });
  }

  function selectMonth(monthNumber: number): void {
    centerMonth(monthNumber, true, true);
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
    centerMonth(monthNumber);
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

  function selectCardFromClick(event: MouseEvent, monthNumber: number): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, input, select, textarea, a")) return;

    selectMonth(monthNumber);
  }

  function selectCardFromKey(event: KeyboardEvent, monthNumber: number): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, input, select, textarea, a")) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
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
        const key = draftKey(month.month, subcategory.section, subcategory.id);
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

  function statusCenterLabel(): string {
    return activeView === "year" ? `${monthName(activeMonth)} geselecteerd` : viewLabels[activeView];
  }

  function openSettingsTab(tab: SettingsTab): void {
    activeSettingsTab = tab;
    activeView = "settings";
  }

  function totalEntryCount(): number {
    return selectedYear.months.reduce((sum, month) => sum + month.entries.length, 0);
  }

  function manualEntryCount(): number {
    return selectedYear.months.reduce((sum, month) => sum + month.entries.filter((entry) => !isRecurringEntry(entry)).length, 0);
  }

  function configuredSubcategoryCount(): number {
    return book.subcategories.filter((subcategory) => !subcategory.hidden).length;
  }

  function activeRuleCount(): number {
    return book.recurringRules.filter((rule) => rule.active).length;
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
      updateBookRecurringRule(book, ruleId, patch);
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

  function draftKey(monthNumber: number, section: Section, subcategoryId: string): string {
    return `${monthNumber}:${section}:${subcategoryId}`;
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

  function openDraft(monthNumber: number, section: Section, subcategoryId: string): void {
    const key = draftKey(monthNumber, section, subcategoryId);
    expandedDraftKey = key;
    centerMonth(monthNumber);

    requestAnimationFrame(() => {
      const input = document.querySelector(`[data-testid="draft-${monthNumber}-${section}-${subcategoryId}"] input[aria-label^="Partij"]`);
      if (input instanceof HTMLInputElement) input.focus();
    });
  }

  function commitDraft(month: BudgetMonth, section: Section, subcategoryId: string): void {
    const key = draftKey(month.month, section, subcategoryId);
    const draft = drafts[key];
    if (!draft) return;

    const party = draft.party.trim();
    const description = draft.description.trim();
    const amountText = draft.amountText.trim();
    const comment = draft.comment.trim();
    if (!party && !description && !amountText) return;

    if (!isValidAmountText(amountText)) {
      draft.amountError = "Controleer het bedrag.";
      return;
    }

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
    centerMonth(month.month);
    editingEntryId = entry.id;
    deleteConfirmEntryId = null;
    editDraft = {
      party: entry.party,
      description: entry.description,
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
    const amountText = editDraft.amountText.trim();
    if (!isValidAmountText(amountText)) {
      editDraft.amountError = "Controleer het bedrag.";
      return;
    }

    entry.party = editDraft.party.trim();
    entry.description = editDraft.description.trim() || "Nieuwe regel";
    entry.amountCents = amountText ? parseMoneyToCents(amountText) : null;
    entry.comment = editDraft.comment.trim();
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
    deleteConfirmEntryId = entry.id;
  }

  function cancelDelete(): void {
    deleteConfirmEntryId = null;
  }

  function deleteEntry(month: BudgetMonth, entry: Entry): void {
    const index = month.entries.findIndex((item) => item.id === entry.id);
    if (index < 0) return;

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
    const year = sourceBook.years[0];
    const initialDrafts: Record<string, DraftEntry> = {};
    if (!year) return initialDrafts;

    for (const month of year.months) {
      for (const section of sections) {
        for (const subcategory of sourceBook.subcategories.filter((item) => item.section === section && !item.hidden)) {
          initialDrafts[draftKey(month.month, section, subcategory.id)] = emptyDraft();
        }
      }
    }

    return initialDrafts;
  }

  function emptyDraft(): DraftEntry {
    return {
      party: "",
      description: "",
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
    noteText = editDraft.comment;
    noteInitialText = editDraft.comment;
    noteCancelWarning = false;
    notePopup = { kind: "edit", entryId: entry.id, title: entry.description };
    focusNotePopup();
  }

  function openEntryNote(entry: Entry): void {
    noteText = entry.comment;
    noteInitialText = entry.comment;
    noteCancelWarning = false;
    notePopup = { kind: "entry", entryId: entry.id, title: entry.description };
    focusNotePopup();
  }

  function saveNotePopup(): void {
    const comment = noteText.trim();

    if (notePopup?.kind === "draft") {
      const key = draftKey(notePopup.monthNumber, notePopup.section, notePopup.subcategoryId);
      drafts[key] = {
        ...(drafts[key] ?? emptyDraft()),
        comment,
      };
    } else if (notePopup?.kind === "edit") {
      editDraft.comment = comment;
    } else if (notePopup?.kind === "entry") {
      const entry = findEntry(notePopup.entryId);
      if (entry) entry.comment = comment;
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

    <section class="year-menu-card" aria-label="Jaaroverzicht">
      <strong>{selectedYear.year}</strong>
      <span>Start {formatMoneyCents(selectedYear.startBalanceCents)}</span>
      <span>Eind {formatMoneyCents(totals.endCents)}</span>
    </section>

    <nav class="toolbar" aria-label="Hoofdnavigatie">
      <button class:active={activeView === "year"} class="tool" type="button" title="Jaaroverzicht" data-tooltip="Jaaroverzicht" onclick={() => (activeView = "year")}><CalendarDays size={16} /><span class="tool-label">Jaar</span></button>
      <button class:active={activeView === "edit"} class="tool" type="button" title="Bewerken" data-tooltip="Bewerken" onclick={() => (activeView = "edit")}><RotateCcw size={16} /><span class="tool-label">Bewerken</span></button>
      <button class:active={activeView === "settings"} class="tool" type="button" title="Instellingen" data-tooltip="Instellingen" onclick={() => (activeView = "settings")}><Settings size={16} /><span class="tool-label">Instellingen</span></button>
      <button class:active={activeView === "safety"} class="tool" type="button" title="Veiligheid" data-tooltip="Veiligheid" onclick={() => (activeView = "safety")}><Shield size={16} /><span class="tool-label">Veiligheid</span></button>
      <button class:active={activeView === "history"} class="tool" type="button" title="Historiek" data-tooltip="Historiek" onclick={() => (activeView = "history")}><History size={16} /><span class="tool-label">Historiek</span></button>
    </nav>

    <div class="header-actions">
      <button class="icon-button" type="button" aria-label="Weergave wisselen" title="Weergave wisselen" data-tooltip="Weergave wisselen" onclick={() => (evening = !evening)}>
        {#if evening}
          <Sun size={19} />
        {:else}
          <Moon size={19} />
        {/if}
      </button>
      <button class="primary-action" type="button" title="Overzicht maken" data-tooltip="Overzicht maken" onclick={exportYearOverview}><Download size={18} />Overzicht</button>
    </div>
  </header>

  {#if activeView !== "year"}
    <section class="menu-page" aria-label={activeView === "settings" ? "Instellingen" : "Menu"}>
      {#if activeView === "settings"}
        <header>
          <h2>Instellingen</h2>
          <p>Kies rustig wat je wil aanpassen. Elke instelling blijft op zijn eigen pagina.</p>
        </header>
        <nav class="settings-tabs" aria-label="Instellingen onderdelen">
          <button class:active={activeSettingsTab === "data"} type="button" aria-pressed={activeSettingsTab === "data"} onclick={() => (activeSettingsTab = "data")}>{settingsTabLabels.data}</button>
          <button class:active={activeSettingsTab === "categories"} type="button" aria-pressed={activeSettingsTab === "categories"} onclick={() => (activeSettingsTab = "categories")}>{settingsTabLabels.categories}</button>
          <button class:active={activeSettingsTab === "rules"} type="button" aria-pressed={activeSettingsTab === "rules"} onclick={() => (activeSettingsTab = "rules")}>{settingsTabLabels.rules}</button>
        </nav>

        {#if activeSettingsTab === "data"}
          <section class="settings-card settings-panel" aria-label="Gegevensmodus">
            <div>
              <strong>Gegevensmodus</strong>
              <span>{appMode === "demo" ? "Leermodus gebruikt de fictieve begroting 2026." : "Echte modus bewaart apart van de leermodus."}</span>
            </div>
            <div class="mode-switch" aria-label="Gegevensmodus">
              <button class:active={appMode === "demo"} type="button" onclick={() => switchMode("demo")}>Leren</button>
              <button class:active={appMode === "production"} type="button" onclick={() => switchMode("production")}>Echt</button>
            </div>
          </section>
        {:else if activeSettingsTab === "categories"}
          <section class="settings-block" aria-label="Categorieen beheren">
            <header>
              <div>
                <h3>Categorieen</h3>
                <p>Beheer de subcategorieen die onder elke hoofdgroep in de maandkaarten verschijnen.</p>
              </div>
              {#if subcategoryMessage}
                <span class="settings-message" role="status">{subcategoryMessage}</span>
              {/if}
            </header>

            <div class="category-settings-grid">
              {#each sections as section}
                {@const sectionSubcategories = settingsSubcategoriesFor(section)}
                <article class:income-settings={section === "inkomsten"} class:fixed-settings={section === "vaste_kosten"} class:variable-settings={section === "variabele_kosten"} class="category-settings-card">
                  <h4>{SECTION_LABELS[section]}</h4>
                  <div class="subcategory-editor-list">
                    {#each sectionSubcategories as subcategory, index}
                      <div class="subcategory-editor-row">
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
                        <span>{subcategoryUsageLabel(subcategory.id)}</span>
                        <button type="button" aria-label={`${subcategory.name} omhoog`} title="Omhoog" data-tooltip="Omhoog" disabled={index === 0} onclick={() => moveSubcategory(subcategory.id, -1)}>
                          <ArrowUp size={15} />
                        </button>
                        <button type="button" aria-label={`${subcategory.name} omlaag`} title="Omlaag" data-tooltip="Omlaag" disabled={index === sectionSubcategories.length - 1} onclick={() => moveSubcategory(subcategory.id, 1)}>
                          <ArrowDown size={15} />
                        </button>
                      </div>
                    {/each}
                  </div>

                  <div class="subcategory-add-row">
                    <input
                      aria-label={`Nieuwe subcategorie voor ${SECTION_LABELS[section]}`}
                      bind:value={newSubcategoryNames[section]}
                      placeholder="Nieuwe subcategorie"
                      onkeydown={(event) => maybeAddSubcategoryFromKey(event, section)}
                    />
                    <button type="button" aria-label={`Subcategorie toevoegen aan ${SECTION_LABELS[section]}`} title="Toevoegen" data-tooltip="Toevoegen" onclick={() => addSubcategory(section)}>
                      <Plus size={16} />
                    </button>
                  </div>
                </article>
              {/each}
            </div>
          </section>
        {:else}
          <section class="settings-block" aria-label="Regels beheren">
            <header>
              <div>
                <h3>Vaste regels</h3>
                <p>Beheer terugkerende posten. Aanpassingen worden meteen opnieuw toegepast op het jaar.</p>
              </div>
              {#if recurringRuleMessage}
                <span class="settings-message" role="status">{recurringRuleMessage}</span>
              {/if}
            </header>

            <div class="rule-card-list">
              {#each book.recurringRules as rule}
                <article class:inactive-rule={!rule.active} class="rule-card">
                  <div class="rule-card-main">
                    <label class="rule-switch">
                      <input
                        aria-label={`Regel actief: ${rule.description}`}
                        checked={rule.active}
                        type="checkbox"
                        onchange={(event) => applyRecurringRuleChange(rule.id, { active: checkboxValue(event) })}
                      />
                      <span>{rule.active ? "Actief" : "Uit"}</span>
                    </label>
                    <div class="rule-card-summary">
                      <strong>{rule.description}</strong>
                      <span>{SECTION_LABELS[rule.section]} / {ruleSubcategoryLabel(rule)} / {rulePartyLabel(rule)} / {ruleScheduleLabel(rule)}</span>
                    </div>
                    <strong class="rule-card-amount">{formatMoneyCents(rule.amountCents ?? 0)}</strong>
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
                          value={rule.party}
                          onblur={(event) => applyRecurringRuleChange(rule.id, { party: inputValue(event) })}
                        />
                      </label>
                      <label>
                        <span>Omschrijving</span>
                        <input
                          aria-label={`Omschrijving voor regel ${rule.description}`}
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
                        <select aria-label={`Herhaling voor regel ${rule.description}`} value={rule.frequency} onchange={(event) => updateRuleFrequency(rule, frequencyFromValue(inputValue(event)))}>
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
            </div>

            <section class="new-rule-panel" aria-label="Nieuwe vaste regel">
              <header>
                <h4>Nieuwe maandelijkse regel</h4>
                <p>Gebruik dit voor vaste posten zoals huur, pensioen, telecom of terugkerende cashregels.</p>
              </header>
              <div class="new-rule-grid">
                <label>
                  <span>Hoofdgroep</span>
                  <select
                    aria-label="Hoofdgroep voor nieuwe regel"
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
                  <input aria-label="Partij voor nieuwe regel" bind:value={newRuleDraft.party} placeholder="Bij wie?" onkeydown={maybeAddMonthlyRuleFromKey} />
                </label>
                <label>
                  <span>Omschrijving</span>
                  <input aria-label="Omschrijving voor nieuwe regel" bind:value={newRuleDraft.description} placeholder="Wat komt elke maand terug?" onkeydown={maybeAddMonthlyRuleFromKey} />
                </label>
                <label>
                  <span>Bedrag</span>
                  <input aria-label="Bedrag voor nieuwe regel" bind:value={newRuleDraft.amountText} inputmode="decimal" placeholder="0,00" onkeydown={maybeAddMonthlyRuleFromKey} />
                </label>
                <label>
                  <span>Herhaling</span>
                  <select
                    aria-label="Herhaling voor nieuwe regel"
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
                      onkeydown={maybeAddMonthlyRuleFromKey}
                    />
                  </label>
                {/if}
                <label>
                  <span>Vanaf</span>
                  <select
                    aria-label="Startmaand voor nieuwe regel"
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
          </section>
        {/if}
      {:else if activeView === "edit"}
        <header>
          <h2>Bewerken</h2>
          <p>Beheer de structuur achter de maandkaarten zonder in de jaarweergave te zoeken.</p>
        </header>
        <section class="menu-card-grid" aria-label="Bewerkopties">
          <article class="menu-card">
            <div class="menu-card-icon"><Settings size={20} /></div>
            <div>
              <h3>Categorieen beheren</h3>
              <p>{configuredSubcategoryCount()} actieve subcategorieen staan klaar onder inkomsten, vaste kosten en variabele kosten.</p>
            </div>
            <button type="button" class="inline-action" onclick={() => openSettingsTab("categories")}>Open categorieen</button>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><RotateCcw size={20} /></div>
            <div>
              <h3>Vaste regels beheren</h3>
              <p>{activeRuleCount()} actieve regels vullen het voorbeeldjaar automatisch aan.</p>
            </div>
            <button type="button" class="inline-action" onclick={() => openSettingsTab("rules")}>Open vaste regels</button>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><CalendarDays size={20} /></div>
            <div>
              <h3>Gegevensmodus</h3>
              <p>{appMode === "demo" ? "Leermodus is actief. Je werkt in de fictieve begroting 2026." : "Echte modus is actief. Deze gegevens staan apart van leermodus."}</p>
            </div>
            <button type="button" class="inline-action" onclick={() => openSettingsTab("data")}>Open gegevens</button>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><Trash2 size={20} /></div>
            <div>
              <h3>Opnieuw starten</h3>
              <p>Vervang alleen de huidige modus door een verse start. Maak eerst een back-up als je twijfelt.</p>
            </div>
            <button type="button" class="inline-action danger-action" onclick={resetCurrentMode}>Start opnieuw</button>
          </article>
        </section>
        <section class="settings-block" aria-label="Bewerkstatus">
          <header>
            <div>
              <h3>Wat staat er nu in dit jaar?</h3>
              <p>Een snelle controle voordat je categorieen of regels aanpast.</p>
            </div>
          </header>
          <div class="status-tile-grid">
            <div class="status-tile"><span>Boekingen</span><strong>{totalEntryCount()}</strong></div>
            <div class="status-tile"><span>Handmatig</span><strong>{manualEntryCount()}</strong></div>
            <div class="status-tile"><span>Vaste regels</span><strong>{book.recurringRules.length}</strong></div>
            <div class="status-tile"><span>Eindsaldo</span><strong>{formatMoneyCents(totals.endCents)}</strong></div>
          </div>
        </section>
      {:else if activeView === "safety"}
        <header>
          <h2>Veiligheid</h2>
          <p>Maak een leesbare back-up, zet een gecontroleerd bestand terug, en kijk of de gegevens gezond zijn.</p>
        </header>
        <section class="menu-card-grid" aria-label="Veiligheidsstatus">
          <article class="menu-card">
            <div class="menu-card-icon"><FileCheck size={20} /></div>
            <div>
              <h3>Gegevenscontrole</h3>
              <p>{validationIssues.length === 0 ? "Geen modelproblemen gevonden." : `${validationIssues.length} aandachtspunt${validationIssues.length === 1 ? "" : "en"} gevonden.`}</p>
            </div>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><CheckCircle2 size={20} /></div>
            <div>
              <h3>Lokale opslag</h3>
              <p>{appMode === "demo" ? "Leermodus gebruikt eigen lokale opslag." : "Echte modus gebruikt eigen lokale opslag."} Status: {saveStatus.toLowerCase()}.</p>
            </div>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><Lock size={20} /></div>
            <div>
              <h3>Gescheiden modi</h3>
              <p>Leren en Echt blijven apart, zodat testen de echte gegevens niet overschrijft.</p>
            </div>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><Download size={20} /></div>
            <div>
              <h3>Back-up maken</h3>
              <p>Download een leesbaar JSON-bestand van de huidige modus. Dit is handig voor herstel of analyse.</p>
            </div>
            <button type="button" class="inline-action" onclick={exportBackup}>Maak back-up</button>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><Upload size={20} /></div>
            <div>
              <h3>Back-up terugzetten</h3>
              <p>Kies een Abacus JSON-bestand. De app controleert het bestand voordat het lokale boek wordt vervangen.</p>
            </div>
            <button type="button" class="inline-action" onclick={chooseRestoreFile}>Kies bestand</button>
            <input bind:this={restoreInput} class="hidden-file-input" type="file" accept="application/json,.json" onchange={restoreBackup} />
          </article>
        </section>
        <section class="settings-block" aria-label="Controlelijst veiligheid">
          <header>
            <div>
              <h3>Controlelijst</h3>
              <p>Deze controle kijkt of het huidige boek past bij het gegevensmodel.</p>
            </div>
            {#if safetyMessage}
              <span class="settings-message" role="status">{safetyMessage}</span>
            {/if}
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
        <header>
          <h2>Historiek</h2>
          <p>Een rustig overzicht van wat recent in het jaar staat. Volledige undo/redo komt later.</p>
        </header>
        <section class="settings-block" aria-label="Recente boekingen">
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
            <div class="history-list">
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
        <section class="settings-block" aria-label="Wijzigingen">
          <header>
            <div>
              <h3>Wijzigingen vanaf nu</h3>
              <p>Acties die je vanaf deze versie doet, komen hier bovenaan te staan.</p>
            </div>
          </header>
          {#if visibleHistoryEvents.length === 0}
            <div class="empty-state">
              <Clock size={18} />
              <span>Nog geen wijzigingen geregistreerd sinds deze functie actief is.</span>
            </div>
          {:else}
            <div class="event-list">
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
        <section class="menu-card-grid" aria-label="Historiek samenvatting">
          <article class="menu-card">
            <div class="menu-card-icon"><History size={20} /></div>
            <div>
              <h3>Wijzigingen</h3>
              <p>Nieuwe acties worden nu gelogd. Volledige undo/redo komt later als aparte veilige functie.</p>
            </div>
          </article>
          <article class="menu-card">
            <div class="menu-card-icon"><Coins size={20} /></div>
            <div>
              <h3>Jaarstand</h3>
              <p>Start {formatMoneyCents(selectedYear.startBalanceCents)} en eind {formatMoneyCents(totals.endCents)}.</p>
            </div>
          </article>
        </section>
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
        class="month-card"
        aria-label={monthName(month.month)}
        aria-pressed={activeMonth === month.month}
        data-month-card={month.month}
        style={monthThemeStyle(month.month)}
        onclick={(event) => selectCardFromClick(event, month.month)}
        onfocusin={() => activateMonthForInput(month.month)}
        onkeydown={(event) => selectCardFromKey(event, month.month)}
        role="button"
        tabindex="0"
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
            <button type="button" aria-label="Controle" title="Controle" data-tooltip="Controle"><CheckCircle2 size={18} /></button>
            <button type="button" aria-label="Opmerkingen" title="Opmerkingen" data-tooltip="Opmerkingen"><MessageCircle size={18} /></button>
            <button type="button" aria-label="Maand afsluiten" title="Maand afsluiten" data-tooltip="Maand afsluiten"><Lock size={18} /></button>
          </div>
        </header>

        <div class="grid-head">
          <span class="party-head">Partij</span>
          <span class="description-head">Omschrijving</span>
          <span class="amount-head">Bedrag</span>
          <span class="action-head">Actie</span>
        </div>

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
                    title={`Invoer openen voor ${subcategory.name}`}
                    data-tooltip={`Invoer openen voor ${subcategory.name}`}
                    onclick={() => openDraft(month.month, section, subcategory.id)}
                  >
                    <Plus size={15} />
                  </button>
                </span>
              </div>

              {@const draft = draftFor(month.month, section, subcategory.id)}
              {@const key = draftKey(month.month, section, subcategory.id)}
              {#if isDraftVisible(key, draft)}
                <div
                  class:has-error={Boolean(draft.amountError)}
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
                    placeholder={section === "inkomsten" ? "Van wie?" : "Bij wie?"}
                    onkeydown={(event) => maybeHandleDraftKey(event, month, section, subcategory.id)}
                  />

                  <input
                    class="ledger-input description-input"
                    aria-label={`Omschrijving voor ${subcategory.name} in ${monthName(month.month)}`}
                    bind:value={draft.description}
                    placeholder="Omschrijving"
                    onkeydown={(event) => maybeHandleDraftKey(event, month, section, subcategory.id)}
                  />

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
                      class:has-error={Boolean(editDraft.amountError)}
                      class="entry-row edit-row"
                      data-edit-entry={entry.id}
                      data-testid={`edit-${entry.id}`}
                      onfocusin={() => activateMonthForInput(month.month)}
                    >
                      <input
                        class="ledger-input party-input"
                        aria-label={`Partij bewerken voor ${entry.description}`}
                        bind:value={editDraft.party}
                        onkeydown={(event) => maybeHandleEditKey(event, entry)}
                      />
                      <span class="description-cell">
                        <input
                          class="ledger-input description-input"
                          aria-label={`Omschrijving bewerken voor ${entry.description}`}
                          bind:value={editDraft.description}
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
                          onclick={() => openEditNote(entry)}
                        >
                          <MessageCircle size={14} />
                        </button>
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
                        <button class="save-row" type="button" aria-label="Wijziging bewaren" title="Wijziging bewaren" data-tooltip="Wijziging bewaren" onclick={() => saveEdit(entry)}><Check size={15} /></button>
                        <button type="button" aria-label="Bewerken annuleren" title="Bewerken annuleren" data-tooltip="Bewerken annuleren" onclick={cancelEdit}><X size={15} /></button>
                      </span>
                    </div>
                    {#if deleteConfirmEntryId === entry.id}
                      <div class="delete-confirm-row" data-testid={`delete-confirm-${entry.id}`}>
                        <span>Deze regel verwijderen?</span>
                        <button class="danger-row" type="button" aria-label="Verwijderen bevestigen" onclick={() => deleteEntry(month, entry)}>Verwijderen</button>
                        <button type="button" aria-label="Verwijderen annuleren" onclick={cancelDelete}>Annuleren</button>
                      </div>
                    {:else}
                      <button class="delete-request-row" type="button" aria-label={`Verwijderen voorbereiden: ${entry.description}`} title="Verwijderen voorbereiden" data-tooltip="Verwijderen voorbereiden" onclick={() => requestDelete(entry)}>
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
                          <button class="note-indicator" type="button" aria-label={`Melding bekijken: ${entry.description}`} title="Melding bekijken" data-tooltip="Melding bekijken" onclick={() => openEntryNote(entry)}><MessageCircle size={12} /></button>
                        {/if}
                      </span>
                      <strong class="amount-cell">{formatDecimalCents(entry.amountCents)}</strong>
                      <span class="row-actions actions-cell">
                        <button type="button" aria-label={`Regel bewerken: ${entry.description}`} title="Regel bewerken" data-tooltip="Regel bewerken" onclick={() => startEdit(month, entry)}><Pencil size={15} /></button>
                      </span>
                    </div>
                  {/if}
                {/each}
              {/if}
            {/each}

            {#each uncategorizedEntries(month, section) as entry}
              {#if editingEntryId === entry.id}
                <div
                  class:has-error={Boolean(editDraft.amountError)}
                  class="entry-row edit-row"
                  data-edit-entry={entry.id}
                  data-testid={`edit-${entry.id}`}
                  onfocusin={() => activateMonthForInput(month.month)}
                >
                  <input
                    class="ledger-input party-input"
                    aria-label={`Partij bewerken voor ${entry.description}`}
                    bind:value={editDraft.party}
                    onkeydown={(event) => maybeHandleEditKey(event, entry)}
                  />
                  <span class="description-cell">
                    <input
                      class="ledger-input description-input"
                      aria-label={`Omschrijving bewerken voor ${entry.description}`}
                      bind:value={editDraft.description}
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
                      onclick={() => openEditNote(entry)}
                    >
                      <MessageCircle size={14} />
                    </button>
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
                    <button class="save-row" type="button" aria-label="Wijziging bewaren" title="Wijziging bewaren" data-tooltip="Wijziging bewaren" onclick={() => saveEdit(entry)}><Check size={15} /></button>
                    <button type="button" aria-label="Bewerken annuleren" title="Bewerken annuleren" data-tooltip="Bewerken annuleren" onclick={cancelEdit}><X size={15} /></button>
                  </span>
                </div>
                {#if deleteConfirmEntryId === entry.id}
                  <div class="delete-confirm-row" data-testid={`delete-confirm-${entry.id}`}>
                    <span>Deze regel verwijderen?</span>
                    <button class="danger-row" type="button" aria-label="Verwijderen bevestigen" title="Verwijderen bevestigen" data-tooltip="Verwijderen bevestigen" onclick={() => deleteEntry(month, entry)}>Verwijderen</button>
                    <button type="button" aria-label="Verwijderen annuleren" title="Verwijderen annuleren" data-tooltip="Verwijderen annuleren" onclick={cancelDelete}>Annuleren</button>
                  </div>
                {:else}
                    <button class="delete-request-row" type="button" aria-label={`Verwijderen voorbereiden: ${entry.description}`} title="Verwijderen voorbereiden" data-tooltip="Verwijderen voorbereiden" onclick={() => requestDelete(entry)}>
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
                      <button class="note-indicator" type="button" aria-label={`Melding bekijken: ${entry.description}`} title="Melding bekijken" data-tooltip="Melding bekijken" onclick={() => openEntryNote(entry)}><MessageCircle size={12} /></button>
                    {/if}
                  </span>
                  <strong class="amount-cell">{formatDecimalCents(entry.amountCents)}</strong>
                  <span class="row-actions actions-cell">
                    <button type="button" aria-label={`Regel bewerken: ${entry.description}`} title="Regel bewerken" data-tooltip="Regel bewerken" onclick={() => startEdit(month, entry)}><Pencil size={15} /></button>
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
