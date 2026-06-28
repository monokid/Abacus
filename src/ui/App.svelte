<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Check,
    CheckCircle2,
    Download,
    History,
    Lock,
    MessageCircle,
    Moon,
    Pencil,
    Plus,
    RotateCcw,
    ScrollText,
    Settings,
    Shield,
    Sun,
    X,
  } from "@lucide/svelte";
  import { yearTotals } from "../core/calc";
  import { formatMoneyCents, formatDecimalCents, parseMoneyToCents } from "../core/money";
  import { validateBook } from "../core/model";
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

  interface DraftEntry {
    party: string;
    description: string;
    amountText: string;
    amountError: string;
  }

  const storageKey = "abacus.fictionalProfile.v1";
  const sections: Section[] = ["inkomsten", "vaste_kosten", "variabele_kosten"];
  const initialBook = fictionalSampleBook();

  let book = $state(initialBook);
  let activeMonth = $state(1);
  let evening = $state(false);
  let drafts = $state<Record<string, DraftEntry>>(createDrafts(initialBook));
  let editingEntryId = $state<string | null>(null);
  let editDraft = $state<DraftEntry>(emptyDraft());
  let storageReady = $state(false);
  let saveStatus = $state("Voorbeeldgegevens");

  const selectedYear = $derived.by(() => {
    const year = book.years[0];
    if (!year) throw new Error("Geen voorbeeldjaar gevonden.");
    return year;
  });

  const totals = $derived(yearTotals(selectedYear));
  const months = [
    { name: "Januari", image: januariImage },
    { name: "Februari", image: februariImage },
    { name: "Maart", image: maartImage },
    { name: "April", image: aprilImage },
    { name: "Mei", image: meiImage },
    { name: "Juni", image: juniImage },
    { name: "Juli", image: juliImage },
    { name: "Augustus", image: augustusImage },
    { name: "September", image: septemberImage },
    { name: "Oktober", image: oktoberImage },
    { name: "November", image: novemberImage },
    { name: "December", image: decemberImage },
  ];

  onMount(() => {
    const savedBook = localStorage.getItem(storageKey);
    if (savedBook) {
      try {
        const parsedBook = JSON.parse(savedBook) as Book;
        const issues = validateBook(parsedBook);
        if (issues.length === 0) {
          book = parsedBook;
          drafts = createDrafts(parsedBook);
          saveStatus = "Voorbeeldgegevens lokaal geladen";
        } else {
          saveStatus = "Lokaal voorbeeldbestand genegeerd";
        }
      } catch {
        saveStatus = "Lokaal voorbeeldbestand kon niet gelezen worden";
      }
    }

    storageReady = true;
    window.setTimeout(() => selectMonth(activeMonth), 120);
  });

  $effect(() => {
    if (!storageReady) return;
    localStorage.setItem(storageKey, JSON.stringify(book));
    saveStatus = "Voorbeeldgegevens lokaal bewaard";
  });

  function monthName(monthNumber: number): string {
    return months[monthNumber - 1]?.name ?? `Maand ${monthNumber}`;
  }

  function monthImage(monthNumber: number): string {
    return months[monthNumber - 1]?.image ?? januariImage;
  }

  function selectMonth(monthNumber: number): void {
    activeMonth = monthNumber;

    requestAnimationFrame(() => {
      scrollRailToItem(".board", `[data-month-card="${monthNumber}"]`);
      scrollRailToItem(".month-tabs", `[data-month-tab="${monthNumber}"]`);
    });
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

    rail.scrollTo({
      left: item.offsetLeft - (rail.clientWidth - item.clientWidth) / 2,
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

  function commitDraft(month: BudgetMonth, section: Section, subcategoryId: string): void {
    const key = draftKey(month.month, section, subcategoryId);
    const draft = drafts[key];
    if (!draft) return;

    const party = draft.party.trim();
    const description = draft.description.trim();
    const amountText = draft.amountText.trim();
    if (!party && !description && !amountText) return;

    if (!isValidAmountText(amountText)) {
      draft.amountError = "Controleer het bedrag.";
      return;
    }

    month.entries.push({
      id: `demo-${month.month}-${section}-${Date.now()}`,
      section,
      subcategoryId,
      date: `${selectedYear.year}-${String(month.month).padStart(2, "0")}-01`,
      party,
      description: description || "Nieuwe regel",
      amountCents: amountText ? parseMoneyToCents(amountText) : null,
      comment: "",
      createdAt: Date.now(),
    });

    drafts[key] = {
      party: "",
      description: "",
      amountText: "",
      amountError: "",
    };
    activeMonth = month.month;
  }

  function startEdit(month: BudgetMonth, entry: Entry): void {
    activeMonth = month.month;
    editingEntryId = entry.id;
    editDraft = {
      party: entry.party,
      description: entry.description,
      amountText: formatDecimalCents(entry.amountCents),
      amountError: "",
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
    editingEntryId = null;
    editDraft = emptyDraft();
  }

  function cancelEdit(): void {
    editingEntryId = null;
    editDraft = emptyDraft();
  }

  function maybeHandleDraftKey(event: KeyboardEvent, month: BudgetMonth, section: Section, subcategoryId: string): void {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(month, section, subcategoryId);
    }

    if (event.key === "Escape") {
      event.preventDefault();
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
      cancelEdit();
    }
  }

  function maybeCommitOnPanelBlur(event: FocusEvent, month: BudgetMonth, section: Section, subcategoryId: string): void {
    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget;
    if (currentTarget instanceof HTMLElement && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;
    commitDraft(month, section, subcategoryId);
  }

  function resetDraft(monthNumber: number, section: Section, subcategoryId: string): void {
    drafts[draftKey(monthNumber, section, subcategoryId)] = emptyDraft();
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
    };
  }
</script>

<main class:evening>
  <header class="app-header">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">
        <Shield size={28} strokeWidth={1.8} />
      </div>
      <div>
        <h1>Abacus</h1>
        <p>Jaarbegroting {selectedYear.year}</p>
      </div>
    </div>

    <nav class="toolbar" aria-label="Hoofdnavigatie">
      <button class="tool active" type="button"><CalendarDays size={18} />Jaar</button>
      <button class="tool" type="button"><RotateCcw size={18} />Bewerken</button>
      <button class="tool" type="button"><Settings size={18} />Instellingen</button>
      <button class="tool" type="button"><Shield size={18} />Veiligheid</button>
      <button class="tool" type="button"><History size={18} />Historiek</button>
    </nav>

    <div class="header-actions">
      <button class="icon-button" type="button" aria-label="Weergave wisselen" onclick={() => (evening = !evening)}>
        {#if evening}
          <Sun size={19} />
        {:else}
          <Moon size={19} />
        {/if}
      </button>
      <button class="primary-action" type="button"><Download size={18} />Overzicht</button>
    </div>
  </header>

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
        data-month-tab={month.month}
        onclick={() => selectMonth(month.month)}
      >
        <span>{month.month}</span>
        <strong>{monthName(month.month)}</strong>
        <em>{formatMoneyCents(total?.restCents ?? 0)}</em>
      </button>
    {/each}
  </section>

  <section class="board" aria-label="Maandkaarten">
    {#each selectedYear.months as month}
      {@const total = monthTotal(month.month)}
      <div
        class:active-card={activeMonth === month.month}
        class="month-card"
        aria-label={monthName(month.month)}
        aria-pressed={activeMonth === month.month}
        data-month-card={month.month}
        onclick={(event) => selectCardFromClick(event, month.month)}
        onkeydown={(event) => selectCardFromKey(event, month.month)}
        role="button"
        tabindex="0"
      >
        <header class="month-header">
          <img src={monthImage(month.month)} alt="" />
          <div class="month-title">
            <h2>{monthName(month.month)}</h2>
          </div>
          <div class="month-tools">
            <button type="button" aria-label="Vorige maand" disabled={month.month === 1} onclick={() => selectMonth(month.month - 1)}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" aria-label="Volgende maand" disabled={month.month === 12} onclick={() => selectMonth(month.month + 1)}>
              <ChevronRight size={18} />
            </button>
            <button type="button" aria-label="Controle"><CheckCircle2 size={18} /></button>
            <button type="button" aria-label="Opmerkingen"><MessageCircle size={18} /></button>
            <button type="button" aria-label="Maand afsluiten"><Lock size={18} /></button>
          </div>
        </header>

        <div class="carry-row">
          <span>Resterend van vorige maand</span>
          <strong>{formatMoneyCents(total?.startCents ?? 0)}</strong>
        </div>

        <div class="grid-head">
          <span>Partij</span>
          <span>Omschrijving</span>
          <span>Bedrag</span>
          <span>Bewerk</span>
        </div>

        {#each sections as section}
          <section class="budget-section" aria-label={SECTION_LABELS[section]}>
            <div class:income={section === "inkomsten"} class:fixed={section === "vaste_kosten"} class:variable={section === "variabele_kosten"} class="section-title">
              <ScrollText size={16} />
              <strong>{SECTION_LABELS[section]}</strong>
              <span>{formatMoneyCents(sectionTotal(month, section))}</span>
            </div>

            {#each subcategoriesFor(section) as subcategory}
              {@const groupedEntries = entriesFor(month, section, subcategory.id)}
              {@const subcategoryTotal = total?.bySubcategoryCents[subcategory.id] ?? 0}
              <div class="subcategory-row">
                <span>{subcategory.name}</span>
                <strong>{formatMoneyCents(subcategoryTotal)}</strong>
              </div>

              {@const draft = draftFor(month.month, section, subcategory.id)}
              <div
                class:has-error={Boolean(draft.amountError)}
                class="new-entry-panel"
                data-testid={`draft-${month.month}-${section}-${subcategory.id}`}
                onfocusout={(event) => maybeCommitOnPanelBlur(event, month, section, subcategory.id)}
                onfocusin={() => activateMonthForInput(month.month)}
              >
                <label class="field">
                  <span>Partij</span>
                  <input
                    aria-label={`Partij voor ${subcategory.name} in ${monthName(month.month)}`}
                    bind:value={draft.party}
                    placeholder={section === "inkomsten" ? "Van wie?" : "Bij wie?"}
                    onkeydown={(event) => maybeHandleDraftKey(event, month, section, subcategory.id)}
                  />
                </label>

                <label class="field label-field">
                  <span>Omschrijving</span>
                  <input
                    aria-label={`Omschrijving voor ${subcategory.name} in ${monthName(month.month)}`}
                    bind:value={draft.description}
                    placeholder={section === "inkomsten" ? "Nieuwe inkomsten" : "Nieuwe uitgave"}
                    onkeydown={(event) => maybeHandleDraftKey(event, month, section, subcategory.id)}
                  />
                </label>

                <label class="field amount-field">
                  <span>Bedrag</span>
                  <input
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

                <button
                  class="add-entry"
                  type="button"
                  aria-label={`Nieuwe regel toevoegen aan ${subcategory.name}`}
                  onclick={() => commitDraft(month, section, subcategory.id)}
                >
                  <Plus size={16} />
                </button>
              </div>

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
                        aria-label={`Partij bewerken voor ${entry.description}`}
                        bind:value={editDraft.party}
                        onkeydown={(event) => maybeHandleEditKey(event, entry)}
                      />
                      <input
                        aria-label={`Omschrijving bewerken voor ${entry.description}`}
                        bind:value={editDraft.description}
                        onkeydown={(event) => maybeHandleEditKey(event, entry)}
                      />
                      <label class="edit-amount">
                        <input
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
                      <span class="row-actions">
                        <button class="save-row" type="button" aria-label="Wijziging bewaren" onclick={() => saveEdit(entry)}><Check size={15} /></button>
                        <button type="button" aria-label="Bewerken annuleren" onclick={cancelEdit}><X size={15} /></button>
                      </span>
                    </div>
                  {:else}
                    <div class="entry-row" data-entry-row={entry.id}>
                      <span>{entry.party || "-"}</span>
                      <span>{entry.description}</span>
                      <strong>{formatDecimalCents(entry.amountCents)}</strong>
                      <span class="row-actions">
                        <button type="button" aria-label={`Regel bewerken: ${entry.description}`} onclick={() => startEdit(month, entry)}><Pencil size={15} /></button>
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
                    aria-label={`Partij bewerken voor ${entry.description}`}
                    bind:value={editDraft.party}
                    onkeydown={(event) => maybeHandleEditKey(event, entry)}
                  />
                  <input
                    aria-label={`Omschrijving bewerken voor ${entry.description}`}
                    bind:value={editDraft.description}
                    onkeydown={(event) => maybeHandleEditKey(event, entry)}
                  />
                  <label class="edit-amount">
                    <input
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
                  <span class="row-actions">
                    <button class="save-row" type="button" aria-label="Wijziging bewaren" onclick={() => saveEdit(entry)}><Check size={15} /></button>
                    <button type="button" aria-label="Bewerken annuleren" onclick={cancelEdit}><X size={15} /></button>
                  </span>
                </div>
              {:else}
                <div class="entry-row" data-entry-row={entry.id}>
                  <span>{entry.party || "-"}</span>
                  <span>{entry.description}</span>
                  <strong>{formatDecimalCents(entry.amountCents)}</strong>
                  <span class="row-actions">
                    <button type="button" aria-label={`Regel bewerken: ${entry.description}`} onclick={() => startEdit(month, entry)}><Pencil size={15} /></button>
                  </span>
                </div>
              {/if}
            {/each}
          </section>
        {/each}

        <footer class="month-footer">
          <span>
            Maandverschil
            <strong class:negative={(total?.differenceCents ?? 0) < 0}>{formatMoneyCents(total?.differenceCents ?? 0)}</strong>
          </span>
          <span>
            Eindsaldo
            <strong class:negative={(total?.restCents ?? 0) < 0}>{formatMoneyCents(total?.restCents ?? 0)}</strong>
          </span>
        </footer>
      </div>
    {/each}
  </section>

  <footer class="status-bar">
    <span>{saveStatus}</span>
    <strong>{monthName(activeMonth)} geselecteerd</strong>
    <span>Eindsaldo jaar {formatMoneyCents(totals.endCents)}</span>
  </footer>
</main>
