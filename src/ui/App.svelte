<script lang="ts">
  import {
    CalendarDays,
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
  import { formatMoneyCents, formatDecimalCents } from "../core/money";
  import { fictionalSampleBook } from "../core/sample-data";
  import { SECTION_LABELS, type Section } from "../core/sections";
  import type { BudgetMonth, Entry, Subcategory } from "../core/model";

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

  const book = fictionalSampleBook();
  const selectedYear = book.years[0];

  if (!selectedYear) {
    throw new Error("Geen voorbeeldjaar gevonden.");
  }

  const totals = yearTotals(selectedYear);
  const sections: Section[] = ["inkomsten", "vaste_kosten", "variabele_kosten"];
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

  let activeMonth = $state(1);
  let evening = $state(false);

  function monthName(monthNumber: number): string {
    return months[monthNumber - 1]?.name ?? `Maand ${monthNumber}`;
  }

  function monthImage(monthNumber: number): string {
    return months[monthNumber - 1]?.image ?? januariImage;
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
    <button type="button" class="year-add"><Plus size={17} />Nieuw jaar</button>
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

  <section class="month-tabs" aria-label="Maanden">
    {#each selectedYear.months as month}
      {@const total = monthTotal(month.month)}
      <button
        type="button"
        class:active={activeMonth === month.month}
        onclick={() => (activeMonth = month.month)}
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
      <article class:active-card={activeMonth === month.month} class="month-card" aria-label={monthName(month.month)}>
        <header class="month-header">
          <img src={monthImage(month.month)} alt="" />
          <div>
            <span>Maand {month.month}</span>
            <h2>{monthName(month.month)}</h2>
          </div>
          <div class="month-tools">
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
          <span>Label</span>
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

            <div class="new-row">
              <span>{section === "inkomsten" ? "" : "Nieuwe partij"}</span>
              <span>Nieuwe regel</span>
              <span></span>
              <button type="button" aria-label="Nieuwe regel"><Plus size={15} /></button>
            </div>
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
    <span>Voorbeeldgegevens</span>
    <strong>{monthName(activeMonth)} geselecteerd</strong>
    <span>Eindsaldo jaar {formatMoneyCents(totals.endCents)}</span>
  </footer>
</main>
