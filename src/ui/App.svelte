<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Check,
    CheckCircle2,
    Clock,
    Download,
    HandCoins,
    History,
    Lock,
    MessageCircle,
    Moon,
    Pencil,
    Plus,
    ReceiptEuro,
    RotateCcw,
    Settings,
    Shield,
    ShoppingBasket,
    Sun,
    Trash2,
    X,
  } from "@lucide/svelte";
  import { yearTotals } from "../core/calc";
  import { formatMoneyCents, formatDecimalCents, parseMoneyToCents } from "../core/money";
  import { createEmptyBook, validateBook } from "../core/model";
  import { fictionalSampleBook } from "../core/sample-data";
  import { SECTION_LABELS, type Section } from "../core/sections";
  import type { Book, BudgetMonth, Entry, Subcategory } from "../core/model";

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

  type AppMode = "demo" | "production";
  type NoteTarget =
    | { kind: "draft"; monthNumber: number; section: Section; subcategoryId: string; title: string }
    | { kind: "edit"; entryId: string; title: string }
    | { kind: "entry"; entryId: string; title: string };

  const demoStorageKey = "abacus.demo.2026.v1";
  const productionStorageKey = "abacus.book.v1";
  const modeStorageKey = "abacus.mode.v1";
  const sections: Section[] = ["inkomsten", "vaste_kosten", "variabele_kosten"];
  const initialBook = fictionalSampleBook();
  const today = new Date();

  let book = $state(initialBook);
  let appMode = $state<AppMode>("demo");
  let activeMonth = $state(1);
  let showSettings = $state(false);
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

  const selectedYear = $derived.by(() => {
    const year = book.years[0];
    if (!year) throw new Error("Geen voorbeeldjaar gevonden.");
    return year;
  });

  const totals = $derived(yearTotals(selectedYear));
  const currentMonthInSelectedYear = $derived(selectedYear.year === today.getFullYear() ? today.getMonth() + 1 : null);
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
    saveStatus = appMode === "demo" ? "Leermodus lokaal bewaard" : "Productiebestand lokaal bewaard";
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
          saveStatus = mode === "demo" ? "Leermodus lokaal geladen" : "Productiebestand lokaal geladen";
          return;
        } else {
          saveStatus = mode === "demo" ? "Lokale leermodus genegeerd" : "Lokaal productiebestand genegeerd";
        }
      } catch {
        saveStatus = mode === "demo" ? "Leermodus kon niet gelezen worden" : "Productiebestand kon niet gelezen worden";
      }
    }

    book = fallbackBook;
    drafts = createDrafts(fallbackBook);
    expandedDraftKey = null;
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
    appMode = nextMode;
    loadBookForMode(nextMode);
    activeMonth = currentMonthInSelectedYear ?? 1;
    storageReady = true;
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

  function selectMonth(monthNumber: number): void {
    activeMonth = monthNumber;

    requestAnimationFrame(() => {
      scrollRailToItem(".board", `[data-month-card="${monthNumber}"]`);
      scrollRailToItem(".month-tabs", `[data-month-tab="${monthNumber}"]`);
    });
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
    activeMonth = monthNumber;

    requestAnimationFrame(() => {
      scrollRailToItem(".month-tabs", `[data-month-tab="${monthNumber}"]`);
    });
  }

  function scrollRailToItem(railSelector: string, itemSelector: string): void {
    const rail = document.querySelector(railSelector);
    const item = document.querySelector(itemSelector);
    if (!(rail instanceof HTMLElement) || !(item instanceof HTMLElement)) return;

    const railRect = rail.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    rail.scrollTo({
      left: rail.scrollLeft + itemRect.left - railRect.left - (rail.clientWidth - item.clientWidth) / 2,
      behavior: "smooth",
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
    return book.subcategories
      .filter((subcategory) => subcategory.section === section && !subcategory.hidden)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "nl-BE"));
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
    activeMonth = monthNumber;

    requestAnimationFrame(() => {
      scrollRailToItem(".board", `[data-month-card="${monthNumber}"]`);
      scrollRailToItem(".month-tabs", `[data-month-tab="${monthNumber}"]`);
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
    activeMonth = month.month;
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

    <nav class="toolbar" aria-label="Hoofdnavigatie">
      <button class="tool active" type="button" title="Jaaroverzicht" data-tooltip="Jaaroverzicht"><CalendarDays size={18} /><span class="tool-label">Jaar</span></button>
      <button class="tool" type="button" title="Bewerken" data-tooltip="Bewerken"><RotateCcw size={18} /><span class="tool-label">Bewerken</span></button>
      <button class:active={showSettings} class="tool" type="button" title="Instellingen" data-tooltip="Instellingen" onclick={() => (showSettings = !showSettings)}><Settings size={18} /><span class="tool-label">Instellingen</span></button>
      <button class="tool" type="button" title="Veiligheid" data-tooltip="Veiligheid"><Shield size={18} /><span class="tool-label">Veiligheid</span></button>
      <button class="tool" type="button" title="Historiek" data-tooltip="Historiek"><History size={18} /><span class="tool-label">Historiek</span></button>
    </nav>

    <div class="header-actions">
      <button class="icon-button" type="button" aria-label="Weergave wisselen" title="Weergave wisselen" data-tooltip="Weergave wisselen" onclick={() => (evening = !evening)}>
        {#if evening}
          <Sun size={19} />
        {:else}
          <Moon size={19} />
        {/if}
      </button>
      <button class="primary-action" type="button" title="Overzicht maken" data-tooltip="Overzicht maken"><Download size={18} />Overzicht</button>
    </div>
  </header>

  {#if showSettings}
    <section class="settings-panel" aria-label="Instellingen">
      <div>
        <strong>Gegevensmodus</strong>
        <span>{appMode === "demo" ? "Leermodus gebruikt de fictieve begroting 2026." : "Echte modus bewaart apart van de leermodus."}</span>
      </div>
      <div class="mode-switch" aria-label="Gegevensmodus">
        <button class:active={appMode === "demo"} type="button" onclick={() => switchMode("demo")}>Leren</button>
        <button class:active={appMode === "production"} type="button" onclick={() => switchMode("production")}>Echt</button>
      </div>
    </section>
  {/if}

  <section class="year-strip" aria-label="Jaaroverzicht">
    <div class="year-pill active">{selectedYear.year}</div>
    <div class="year-stat">
      <span>Startsaldo</span>
      <strong>{formatMoneyCents(selectedYear.startBalanceCents)}</strong>
    </div>
    <div class="year-stat">
      <span>Totaal inkomsten</span>
      <strong>{formatMoneyCents(totals.incomeCents)}</strong>
    </div>
    <div class="year-stat">
      <span>Totaal uitgaven</span>
      <strong>{formatMoneyCents(totals.outCents)}</strong>
    </div>
  </section>

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
          <span class="action-head" aria-label="Acties"></span>
        </div>

        {#each sections as section}
          <section class="budget-section" aria-label={SECTION_LABELS[section]}>
            <div class:income={section === "inkomsten"} class:fixed={section === "vaste_kosten"} class:variable={section === "variabele_kosten"} class="section-title">
              {#if section === "inkomsten"}
                <HandCoins size={16} />
              {:else if section === "vaste_kosten"}
                <ReceiptEuro size={16} />
              {:else}
                <ShoppingBasket size={16} />
              {/if}
              <strong>{SECTION_LABELS[section]}</strong>
              <span>{formatMoneyCents(sectionTotal(month, section))}</span>
            </div>

            {#if section === "inkomsten"}
              <div class="entry-row carry-entry" data-transfer-row="true">
                <span class="party-cell">Overdracht</span>
                <span class="description-text">Resterend van vorige maand</span>
                <strong class="amount-cell">{formatDecimalCents(total?.startCents ?? 0)}</strong>
                <span class="locked-row" aria-label="Vaste regel" title="Vaste regel" data-tooltip="Vaste regel"><Lock size={14} aria-hidden="true" /></span>
              </div>
            {/if}

            {#each subcategoriesFor(section) as subcategory}
              {@const groupedEntries = entriesFor(month, section, subcategory.id)}
              {@const subcategoryTotal = total?.bySubcategoryCents[subcategory.id] ?? 0}
              <div class="subcategory-row" data-entry-count={groupedEntries.length}>
                <span>{subcategory.name}</span>
                <strong>{formatMoneyCents(subcategoryTotal)}</strong>
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
    <span class="status-date">{currentDateLabel} <Clock size={14} aria-hidden="true" /> {currentClock}</span>
    <strong>{monthName(activeMonth)} geselecteerd</strong>
  </footer>
</main>
