<script lang="ts">
  import { onMount } from "svelte";
  import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Download,
    History,
    Lock,
    MessageCircle,
    Moon,
    Plus,
    RotateCcw,
    ScrollText,
    Settings,
    Shield,
    Sun,
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
    subcategoryId: string;
    amountError: string;
  }

  const storageKey = "abacus.fictionalProfile.v1";
  const sections: Section[] = ["inkomsten", "vaste_kosten", "variabele_kosten"];
  const initialBook = fictionalSampleBook();

  let book = $state(initialBook);
  let activeMonth = $state(1);
  let evening = $state(false);
  let drafts = $state<Record<string, DraftEntry>>(createDrafts(initialBook));
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

  function scrollRailToItem(railSelector: string, itemSelector: string): void {
    const rail = document.querySelector(railSelector);
    const item = document.querySelector(itemSelector);
    if (!(rail instanceof HTMLElement) || !(item instanceof HTMLElement)) return;

    rail.scrollTo({
      left: item.offsetLeft - (rail.clientWidth - item.clientWidth) / 2,
      behavior: "smooth",
    });
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

  function draftKey(monthNumber: number, section: Section): string {
    return `${monthNumber}:${section}`;
  }

  function draftFor(monthNumber: number, section: Section): DraftEntry {
    const key = draftKey(monthNumber, section);
    return drafts[key] ?? emptyDraft(section);
  }

  function commitDraft(month: BudgetMonth, section: Section): void {
    const key = draftKey(month.month, section);
    const draft = drafts[key];
    if (!draft) return;

    const party = section === "inkomsten" ? "" : draft.party.trim();
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
      subcategoryId: draft.subcategoryId || null,
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
      subcategoryId: draft.subcategoryId,
      amountError: "",
    };
    activeMonth = month.month;
  }

  function maybeHandleDraftKey(event: KeyboardEvent, month: BudgetMonth, section: Section): void {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft(month, section);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      resetDraft(month.month, section);
    }
  }

  function maybeCommitOnPanelBlur(event: FocusEvent, month: BudgetMonth, section: Section): void {
    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget;
    if (currentTarget instanceof HTMLElement && relatedTarget instanceof Node && currentTarget.contains(relatedTarget)) return;
    commitDraft(month, section);
  }

  function resetDraft(monthNumber: number, section: Section): void {
    const key = draftKey(monthNumber, section);
    const currentSubcategoryId = drafts[key]?.subcategoryId;
    drafts[key] = {
      ...emptyDraft(section),
      subcategoryId: currentSubcategoryId || emptyDraft(section).subcategoryId,
    };
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
        initialDrafts[draftKey(month.month, section)] = emptyDraft(section, sourceBook);
      }
    }

    return initialDrafts;
  }

  function emptyDraft(section: Section, sourceBook = book): DraftEntry {
    return {
      party: "",
      description: "",
      amountText: "",
      amountError: "",
      subcategoryId:
        sourceBook.subcategories
          .filter((subcategory) => subcategory.section === section && !subcategory.hidden)
          .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "nl-BE"))[0]
          ?.id ?? "",
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
      <article
        class:active-card={activeMonth === month.month}
        class="month-card"
        aria-label={monthName(month.month)}
        data-month-card={month.month}
      >
        <header class="month-header">
          <img src={monthImage(month.month)} alt="" />
          <div>
            <span>Maand {month.month}</span>
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
          <span>Nota</span>
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
              <div class="subcategory-row">
                <span>{subcategory.name}</span>
                <strong>{formatMoneyCents(total?.bySubcategoryCents[subcategory.id] ?? 0)}</strong>
              </div>

              {#if groupedEntries.length > 0}
                {#each groupedEntries as entry}
                  <div class="entry-row">
                    <span>{entry.party || "-"}</span>
                    <span>{entry.description}</span>
                    <strong>{formatDecimalCents(entry.amountCents)}</strong>
                    <button type="button" aria-label="Nota"><MessageCircle size={15} /></button>
                  </div>
                {/each}
              {/if}
            {/each}

            {#each uncategorizedEntries(month, section) as entry}
              <div class="entry-row">
                <span>{entry.party || "-"}</span>
                <span>{entry.description}</span>
                <strong>{formatDecimalCents(entry.amountCents)}</strong>
                <button type="button" aria-label="Nota"><MessageCircle size={15} /></button>
              </div>
            {/each}

            {#if true}
              {@const draft = draftFor(month.month, section)}
              <div
                class:has-error={Boolean(draft.amountError)}
                class="new-entry-panel"
                data-testid={`draft-${month.month}-${section}`}
                onfocusout={(event) => maybeCommitOnPanelBlur(event, month, section)}
              >
                <label class="field category-field">
                  <span>Subcategorie</span>
                  <select aria-label={`Subcategorie voor ${SECTION_LABELS[section]} in ${monthName(month.month)}`} bind:value={draft.subcategoryId}>
                    {#each subcategoriesFor(section) as subcategory}
                      <option value={subcategory.id}>{subcategory.name}</option>
                    {/each}
                  </select>
                </label>

                {#if section !== "inkomsten"}
                  <label class="field">
                    <span>Partij</span>
                    <input
                      aria-label={`Partij voor ${SECTION_LABELS[section]} in ${monthName(month.month)}`}
                      bind:value={draft.party}
                      placeholder="Bij wie?"
                      onkeydown={(event) => maybeHandleDraftKey(event, month, section)}
                    />
                  </label>
                {/if}

                <label class="field label-field">
                  <span>Omschrijving</span>
                  <input
                    aria-label={`Omschrijving voor ${SECTION_LABELS[section]} in ${monthName(month.month)}`}
                    bind:value={draft.description}
                    placeholder={section === "inkomsten" ? "Nieuwe inkomsten" : "Nieuwe uitgave"}
                    onkeydown={(event) => maybeHandleDraftKey(event, month, section)}
                  />
                </label>

                <label class="field amount-field">
                  <span>Bedrag</span>
                  <input
                    aria-describedby={draft.amountError ? `amount-error-${month.month}-${section}` : undefined}
                    aria-invalid={Boolean(draft.amountError)}
                    aria-label={`Bedrag voor ${SECTION_LABELS[section]} in ${monthName(month.month)}`}
                    bind:value={draft.amountText}
                    inputmode="decimal"
                    placeholder="0,00"
                    oninput={() => clearAmountError(draft)}
                    onkeydown={(event) => maybeHandleDraftKey(event, month, section)}
                  />
                  {#if draft.amountError}
                    <small id={`amount-error-${month.month}-${section}`} class="field-error">{draft.amountError}</small>
                  {/if}
                </label>

                <button class="add-entry" type="button" aria-label="Nieuwe regel toevoegen" onclick={() => commitDraft(month, section)}>
                  <Plus size={16} />
                </button>
              </div>
            {/if}
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
      </article>
    {/each}
  </section>

  <footer class="status-bar">
    <span>{saveStatus}</span>
    <strong>{monthName(activeMonth)} geselecteerd</strong>
    <span>Eindsaldo jaar {formatMoneyCents(totals.endCents)}</span>
  </footer>
</main>
