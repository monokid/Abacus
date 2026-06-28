import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import http from "node:http";
import { chromium } from "playwright-core";

const port = 5174;
const baseUrl = `http://127.0.0.1:${port}`;
const demoStorageKey = "abacus.demo.2026.v2";
const productionStorageKey = "abacus.book.v1";
const modeStorageKey = "abacus.mode.v1";
const screenshotDir = "test-results/smoke";

let devServer = null;

try {
  await mkdir(screenshotDir, { recursive: true });

  if (!(await isServerReady())) {
    devServer = spawn(devCommand(), devArgs(), {
      cwd: process.cwd(),
      stdio: "ignore",
      shell: false,
    });
    await waitForServer();
  }

  const browser = await chromium.launch({
    executablePath: chromePath(),
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 954, height: 827 });
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await clearStorage(page);
  await page.reload({ waitUntil: "networkidle" });
  await expectVisibleText(page, "Jaarbegroting 2026");
  await expectLearningSampleData(page);
  await captureScreenshot(page, "01-initial-board.png");
  await expectCompactTopUi(page);
  await expectBrandVisualIdentity(page);
  await expectTaskbarTime(page);
  await expectCurrentMonthIndicator(page);
  await expectSeasonalMonthBadges(page);
  await expectMonthFooterSummaries(page, "eerste laadbeurt");
  await expectMonthFootersAligned(page, "eerste laadbeurt");
  await expectBrandReturnsToCurrentMonth(page);
  await expectModeSwitchSeparatesDemo(page);
  await expectTooltips(page);
  await expectMonthHeaderLayout(page, "eerste laadbeurt");
  await expectDistinctSectionIcons(page);
  await expectSectionColorScales(page);
  await expectCarryBalanceInIncomeGrid(page);
  await expectNoTransferLocks(page);
  await expectSpreadsheetColumnDividers(page);
  await expectNoMonthNumberLabels(page);
  await expectQuietActionHeaders(page);
  await expectCategoryInputs(page);
  await expectExcelNumberAlignment(page);
  await expectSavedRowActionColumnSnug(page, "eerste laadbeurt");
  await expectLedgerBreathingRoom(page, "eerste laadbeurt");
  await expectUnifiedLedgerGrid(page, "eerste laadbeurt");
  await openDraft(page, 1, "inkomsten", "sub-ink-pensioen", "Pensioen");
  await expectIncomePartyInputs(page);
  await focusInactiveMonthIncomePartyInput(page, 2);
  await expectActiveMonthVisible(page, 2);
  await expectFocusedInputInMonth(page, 2, "Partij");
  await page.keyboard.press("Escape");
  await navigateToMonth(page, 1);
  await expectActiveMonthVisible(page, 1);
  await expectDraftPanelsContained(page, "eerste laadbeurt");
  await expectIncomeDraftTabOrder(page, 1);
  await expectFocusedElementContained(page, "tab naar plusknop");
  await expectDraftPanelsContained(page, "tab naar plusknop");
  await expectExcelScrollbarsUsable(page, "eerste laadbeurt");
  await expectGlobalScrollbarTheme(page, "eerste laadbeurt");
  await expectMonthLedgerScrollbarsQuiet(page);
  await expectLedgerCanScrollClearOfFooter(page, "eerste laadbeurt");
  await expectCompactLedgerRows(page, "eerste laadbeurt");
  await expectAlternatingLedgerTints(page, "eerste laadbeurt");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectMonthTabsVisible(page, "na terug naar bovenzijde");
  await navigateToMonth(page, 9);
  await expectActiveMonthVisible(page, 9);
  await expectActiveMonthTabProminent(page, 9);
  await expectActiveCardProminent(page, 9);
  await expectActiveCardNotClipped(page, 9);
  await expectMonthHeaderLayout(page, "september actief");
  await captureScreenshot(page, "02-september-active.png");
  await expectMonthTabsVisible(page, "na klik op maandknop");
  await navigateByClickingCard(page, 10);
  await expectActiveMonthVisible(page, 10);
  await expectActiveCardProminent(page, 10);
  await expectActiveCardNotClipped(page, 10);
  await captureScreenshot(page, "03-october-card-click.png");
  await expectMonthHeaderLayout(page, "oktober via kaartklik");
  await navigateToMonth(page, 9);
  await navigateWithCardButton(page, 9, "Volgende maand", 10);
  await expectActiveMonthVisible(page, 10);
  await expectMonthCardFocused(page, 10);
  await expectMonthTabsVisible(page, "na volgende maand op kaart");
  await navigateWithCardButton(page, 10, "Vorige maand", 9);
  await expectActiveMonthVisible(page, 9);
  await expectMonthCardFocused(page, 9);
  await navigateToMonth(page, 12);
  await expectActiveMonthVisible(page, 12);
  await expectActiveCardCenteredEnough(page, 12);
  await captureScreenshot(page, "04-december-centered.png");
  await page.getByRole("button", { name: /Terug naar begin/i }).click();
  await expectActiveMonthVisible(page, 1);
  await expectActiveCardCenteredEnough(page, 1);
  await page.getByRole("button", { name: /Naar jaareinde/i }).click();
  await expectActiveMonthVisible(page, 12);
  await expectActiveCardCenteredEnough(page, 12);
  await navigateToMonth(page, 9);
  await expectOtherMonthButtonCentersCard(page, 10);
  await navigateToMonth(page, 9);
  await fillExpense(page, {
    party: "Testwinkel",
    description: "Test uitgave rooktest met langere omschrijving",
    amount: "12,34",
    note: "Uitgebreide melding rooktest",
  });
  await expectRecentRowGlow(page, "Test uitgave rooktest met langere omschrijving");
  await expectVisibleText(page, "Test uitgave rooktest met langere omschrijving");
  await expectVisibleText(page, "12,34");
  await expectNotePopupFlow(page, "Test uitgave rooktest met langere omschrijving", "Uitgebreide melding rooktest");

  await fillExpense(page, {
    party: "Foute winkel",
    description: "Ongeldig bedrag rooktest",
    amount: "abc",
  });
  await expectVisibleText(page, "Controleer het bedrag.");
  await expectHiddenText(page, "Ongeldig bedrag rooktest");

  await clearInvalidExpenseDraft(page);

  await fillVariableAndCommitOnBlur(page);
  await expectVisibleText(page, "Klik weg rooktest");

  await fillIncomeAndCancel(page);
  await expectHiddenText(page, "Wordt geannuleerd");
  await fillIncomeWithParty(page);
  await expectVisibleText(page, "Pensioenfonds rooktest");
  await expectVisibleText(page, "Inkomen met partij rooktest");
  await expectVisibleText(page, "123,45");
  await editIncomeRow(page);
  await expectVisibleText(page, "Pensioenfonds aangepast");
  await expectVisibleText(page, "Inkomen aangepast rooktest");
  await expectVisibleText(page, "124,56");
  await expectHiddenText(page, "Inkomen met partij rooktest");
  await cancelExpenseEdit(page);
  await expectVisibleText(page, "Test uitgave rooktest met langere omschrijving");
  await expectHiddenText(page, "Niet bewaren rooktest");
  await deleteVariableRow(page);
  await expectHiddenText(page, "Klik weg rooktest");

  await page.reload({ waitUntil: "networkidle" });
  await expectVisibleText(page, "Test uitgave rooktest met langere omschrijving");
  await navigateToMonth(page, 9);
  await expectNotePopupFlow(page, "Test uitgave rooktest met langere omschrijving", "Uitgebreide melding rooktest");
  await expectHiddenText(page, "Klik weg rooktest");
  await expectVisibleText(page, "Pensioenfonds aangepast");
  await expectVisibleText(page, "Inkomen aangepast rooktest");
  await expectDraftPanelsContained(page, "na verversen");
  await auditResponsiveViewports(browser);
  await auditDarkMode(browser);

  if (runtimeErrors.length > 0) {
    throw new Error(`Browserfouten:\n${runtimeErrors.join("\n")}`);
  }

  await browser.close();
  console.log("Input smoke test passed.");
} finally {
  if (devServer) devServer.kill();
}

async function fillExpense(page, { party, description, amount, note }) {
  await openDraft(page, 9, "vaste_kosten", "sub-vast-wonen", "Wonen");
  const draft = page.locator('[data-testid="draft-9-vaste_kosten-sub-vast-wonen"]');
  await draft.locator('input[aria-label^="Partij"]').fill(party);
  await draft.locator('input[aria-label^="Omschrijving"]').fill(description);
  const amountInput = draft.locator('input[aria-label^="Bedrag"]');
  await amountInput.fill(amount);
  if (note) {
    await draft.getByLabel("Uitgebreide melding voor Wonen").click();
    const popup = page.locator('[data-testid="note-popup"]');
    await popup.waitFor({ state: "visible", timeout: 5_000 });
    await popup.getByLabel("Uitgebreide melding").fill(note);
    await captureScreenshot(page, "05-note-popup.png");
    await popup.getByLabel("Melding annuleren").click();
    await expectVisibleText(page, "Deze melding is nog niet bewaard.");
    await popup.getByLabel("Melding bewaren").click();
  }
  await amountInput.press("Enter");
}

async function focusInactiveMonthIncomePartyInput(page, monthNumber) {
  await openDraft(page, monthNumber, "inkomsten", "sub-ink-pensioen", "Pensioen");
  const input = page.locator(`[data-testid="draft-${monthNumber}-inkomsten-sub-ink-pensioen"] input[aria-label^="Partij"]`);
  await input.click();
  await input.fill("Klad partij");
}

async function expectFocusedInputInMonth(page, monthNumber, expectedLabelPrefix) {
  const issue = await page.evaluate(({ targetMonthNumber, labelPrefix }) => {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLInputElement)) return "Actieve focus staat niet in een invoerveld.";
    if (!activeElement.getAttribute("aria-label")?.startsWith(labelPrefix)) {
      return `Focus staat niet in het verwachte ${labelPrefix}-veld.`;
    }

    const card = activeElement.closest(".month-card");
    if (!(card instanceof HTMLElement)) return "Invoerveld staat niet in een maandkaart.";
    if (card.dataset.monthCard !== String(targetMonthNumber)) return "Invoerveld staat niet in de verwachte maandkaart.";

    return "";
  }, { targetMonthNumber: monthNumber, labelPrefix: expectedLabelPrefix });

  if (issue) throw new Error(`Invoerfocuscontrole faalde voor maand ${monthNumber}: ${issue}`);
}

async function expectLearningSampleData(page) {
  const issue = await page.evaluate(() => {
    const text = document.body.textContent ?? "";
    for (const expected of ["Spar", "Nespresso", "mult-phil", "F secure", "Bubar", "hotel BilBerge"]) {
      if (!text.includes(expected)) return `Leerpost ontbreekt: ${expected}.`;
    }
    return "";
  });

  if (issue) throw new Error(`Leermodus-samplecontrole faalde: ${issue}`);
}

async function clearInvalidExpenseDraft(page) {
  const draft = page.locator('[data-testid="draft-9-vaste_kosten-sub-vast-wonen"]');
  await draft.locator('input[aria-label^="Bedrag"]').press("Escape");
}

async function fillVariableAndCommitOnBlur(page) {
  await openDraft(page, 9, "variabele_kosten", "sub-var-gezondheid", "Gezondheid");
  const draft = page.locator('[data-testid="draft-9-variabele_kosten-sub-var-gezondheid"]');
  await draft.locator('input[aria-label^="Partij"]').fill("Apotheek");
  await draft.locator('input[aria-label^="Omschrijving"]').fill("Klik weg rooktest");
  await draft.locator('input[aria-label^="Bedrag"]').fill("7,89");
  await page.locator("h1").click();
}

async function fillIncomeAndCancel(page) {
  await openDraft(page, 9, "inkomsten", "sub-ink-pensioen", "Pensioen");
  const draft = page.locator('[data-testid="draft-9-inkomsten-sub-ink-pensioen"]');
  await draft.locator('input[aria-label^="Partij"]').fill("Pensioenfonds annulering");
  await draft.locator('input[aria-label^="Omschrijving"]').fill("Wordt geannuleerd");
  await draft.locator('input[aria-label^="Omschrijving"]').press("Escape");
}

async function fillIncomeWithParty(page) {
  await openDraft(page, 9, "inkomsten", "sub-ink-pensioen", "Pensioen");
  const draft = page.locator('[data-testid="draft-9-inkomsten-sub-ink-pensioen"]');
  await draft.locator('input[aria-label^="Partij"]').fill("Pensioenfonds rooktest");
  await draft.locator('input[aria-label^="Omschrijving"]').fill("Inkomen met partij rooktest");
  const amountInput = draft.locator('input[aria-label^="Bedrag"]');
  await amountInput.fill("123,45");
  await amountInput.press("Enter");
}

async function editIncomeRow(page) {
  await page.getByLabel("Regel bewerken: Inkomen met partij rooktest").click();
  const editRow = page.locator('[data-testid^="edit-demo-9-inkomsten-"]');
  await expectEditRowsContained(page, "inkomstenregel bewerken");
  await captureScreenshot(page, "05-edit-income-row.png");
  await editRow.locator('input[aria-label^="Partij bewerken"]').fill("Pensioenfonds aangepast");
  await editRow.locator('input[aria-label^="Omschrijving bewerken"]').fill("Inkomen aangepast rooktest");
  await editRow.locator('input[aria-label^="Bedrag bewerken"]').fill("124,56");
  await editRow.getByLabel("Wijziging bewaren").click();
}

async function cancelExpenseEdit(page) {
  await page.getByLabel("Regel bewerken: Test uitgave rooktest met langere omschrijving").click();
  const editRow = page.locator('[data-testid^="edit-demo-9-vaste_kosten-"]');
  await expectEditRowsContained(page, "uitgaveregel bewerken");
  await editRow.locator('input[aria-label^="Omschrijving bewerken"]').fill("Niet bewaren rooktest");
  await editRow.locator('input[aria-label^="Omschrijving bewerken"]').press("Escape");
}

async function deleteVariableRow(page) {
  await page.getByLabel("Regel bewerken: Klik weg rooktest").click();
  await page.getByLabel("Verwijderen voorbereiden: Klik weg rooktest").click();
  await expectVisibleText(page, "Deze regel verwijderen?");
  await expectDeleteConfirmRowsContained(page, "verwijdering voorbereiden");
  await captureScreenshot(page, "06-delete-confirm-row.png");

  await page.getByLabel("Verwijderen annuleren").click();
  await expectHiddenText(page, "Deze regel verwijderen?");
  await page.getByLabel("Verwijderen voorbereiden: Klik weg rooktest").click();
  await page.getByLabel("Verwijderen bevestigen").click();
}

async function expectNotePopupFlow(page, description, expectedNote) {
  await page.getByLabel(`Melding bekijken: ${description}`).click();
  const popup = page.locator('[data-testid="note-popup"]');
  await popup.waitFor({ state: "visible", timeout: 5_000 });
  const noteValue = await popup.getByLabel("Uitgebreide melding").inputValue();
  if (noteValue !== expectedNote) {
    throw new Error(`Melding-popup bevat verkeerde tekst: '${noteValue}'.`);
  }
  await popup.getByLabel("Melding annuleren").click();
  await popup.waitFor({ state: "hidden", timeout: 5_000 });
}

async function auditResponsiveViewports(browser) {
  const viewports = [
    { name: "13-fullscreen-1920.png", width: 1920, height: 1080, month: 9 },
    { name: "14-fullscreen-1366.png", width: 1366, height: 768, month: 9 },
    { name: "07-responsive-small-laptop.png", width: 760, height: 720, month: 9 },
    { name: "08-responsive-narrow.png", width: 390, height: 844, month: 9 },
    { name: "11-responsive-360.png", width: 360, height: 740, month: 9 },
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await clearStorage(page);
    await page.reload({ waitUntil: "networkidle" });
    await navigateToMonth(page, viewport.month);
    await expectActiveMonthVisible(page, viewport.month);
    await expectActiveCardCenteredEnough(page, viewport.month);
    await expectActiveMonthTabProminent(page, viewport.month);
    await expectCurrentMonthIndicator(page);
    await expectSeasonalMonthBadges(page);
    await expectMonthFooterSummaries(page, `${viewport.width}x${viewport.height}`);
    await expectMonthFootersAligned(page, `${viewport.width}x${viewport.height}`);
    await expectMonthHeaderLayout(page, `${viewport.width}x${viewport.height}`);
    await expectSpreadsheetColumnDividers(page);
    await expectExcelScrollbarsUsable(page, `${viewport.width}x${viewport.height}`);
    await expectGlobalScrollbarTheme(page, `${viewport.width}x${viewport.height}`);
    await expectMonthLedgerScrollbarsQuiet(page);
    await expectLedgerCanScrollClearOfFooter(page, `${viewport.width}x${viewport.height}`);
    await expectCompactLedgerRows(page, `${viewport.width}x${viewport.height}`);
    await expectAlternatingLedgerTints(page, `${viewport.width}x${viewport.height}`);
    if (viewport.width >= 1200) await expectFullscreenWorkspace(page, `${viewport.width}x${viewport.height}`);
    await expectSavedRowActionColumnSnug(page, `${viewport.width}x${viewport.height}`);
    await expectDraftPanelsContained(page, `${viewport.width}x${viewport.height}`);
    await expectLedgerBreathingRoom(page, `${viewport.width}x${viewport.height}`);
    if (viewport.width <= 390) {
      const notePopupScreenshot = viewport.width <= 360 ? "12-responsive-360-note-popup.png" : "08-responsive-narrow-note-popup.png";
      await captureDraftNotePopup(page, viewport.month, notePopupScreenshot);
    }
    await expectNoPageHorizontalOverflow(page, `${viewport.width}x${viewport.height}`);
    await expectActiveCardCenteredEnough(page, viewport.month);
    await capturePageScreenshot(page, viewport.name);
    await page.close();
  }
}

async function auditDarkMode(browser) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 954, height: 827 });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await clearStorage(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Weergave wisselen").click();
  await navigateToMonth(page, 9);
  await expectDarkModeMonthHeaders(page);
  await expectCurrentMonthIndicator(page);
  await expectSeasonalMonthBadges(page);
  await expectMonthFooterSummaries(page, "donkere modus");
  await expectMonthFootersAligned(page, "donkere modus");
  await expectSectionColorScales(page);
  await expectMonthHeaderLayout(page, "donkere modus");
  await expectSpreadsheetColumnDividers(page);
  await expectMonthLedgerScrollbarsQuiet(page);
  await expectLedgerCanScrollClearOfFooter(page, "donkere modus");
  await expectSavedRowActionColumnSnug(page, "donkere modus");
  await expectTooltips(page);
  await expectStatusBarDoesNotOverlapCards(page, "donkere modus");
  await captureDraftNotePopup(page, 9, "10-dark-mode-note-popup.png");
  await capturePageScreenshot(page, "09-dark-mode.png");
  await page.close();
}

async function captureDraftNotePopup(page, monthNumber, filename) {
  await openDraft(page, monthNumber, "vaste_kosten", "sub-vast-wonen", "Wonen");
  const draft = page.locator(`[data-testid="draft-${monthNumber}-vaste_kosten-sub-vast-wonen"]`);
  await draft.getByLabel("Uitgebreide melding voor Wonen").click();
  const popup = page.locator('[data-testid="note-popup"]');
  await popup.waitFor({ state: "visible", timeout: 5_000 });
  await capturePageScreenshot(page, filename);
  await popup.getByLabel("Melding annuleren").click();
  await popup.waitFor({ state: "hidden", timeout: 5_000 });
}

async function openDraft(page, monthNumber, section, subcategoryId, label) {
  const draft = page.locator(`[data-testid="draft-${monthNumber}-${section}-${subcategoryId}"]`);
  if ((await draft.count()) > 0 && (await draft.isVisible())) return;

  await page.locator(`[data-month-card="${monthNumber}"]`).getByLabel(`Invoer openen voor ${label}`).click();
  await draft.waitFor({ state: "visible", timeout: 5_000 });
}

async function expectIncomeDraftTabOrder(page, monthNumber) {
  await openDraft(page, monthNumber, "inkomsten", "sub-ink-pensioen", "Pensioen");
  const draftSelector = `[data-testid="draft-${monthNumber}-inkomsten-sub-ink-pensioen"]`;
  await page.locator(`${draftSelector} input[aria-label^="Partij"]`).focus();
  await expectFocusedControl(page, draftSelector, 'input[aria-label^="Partij"]', "tabvolgorde start bij Partij");
  await page.keyboard.press("Tab");
  await expectFocusedControl(page, draftSelector, 'input[aria-label^="Omschrijving"]', "tabvolgorde naar Omschrijving");
  await page.keyboard.press("Tab");
  await expectFocusedControl(page, draftSelector, 'input[aria-label^="Bedrag"]', "tabvolgorde naar Bedrag");
  await page.keyboard.press("Tab");
  await expectFocusedControl(page, draftSelector, "button.note-row", "tabvolgorde naar melding");
  await page.keyboard.press("Tab");
  await expectFocusedControl(page, draftSelector, "button.add-entry", "tabvolgorde naar plusknop");
}

async function expectFocusedControl(page, draftSelector, controlSelector, label) {
  const issue = await page.evaluate(
    ({ panelSelector, selector }) => {
      const panel = document.querySelector(panelSelector);
      if (!(panel instanceof HTMLElement)) return "Invoerpaneel ontbreekt.";

      const expected = panel.querySelector(selector);
      if (!(expected instanceof HTMLElement)) return `Verwacht focusdoel ontbreekt: ${selector}`;
      if (document.activeElement !== expected) {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) return "Geen actief element gevonden.";
        return `Focus staat op ${active.tagName.toLowerCase()} ${active.getAttribute("aria-label") ?? active.textContent?.trim() ?? ""}.`;
      }

      return "";
    },
    { panelSelector: draftSelector, selector: controlSelector },
  );

  if (issue) throw new Error(`Inkomen-tabcontrole faalde (${label}): ${issue}`);
}

async function expectDraftPanelsContained(page, label) {
  const issues = await page.evaluate(() => {
    const tolerance = 1;
    return Array.from(document.querySelectorAll(".new-entry-panel")).flatMap((panel, index) => {
      const card = panel.closest(".month-card");
      if (!card) return [`Paneel ${index + 1}: geen maandkaart gevonden.`];

      const panelRect = panel.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const panelIssues = [];

      if (panel.scrollWidth > panel.clientWidth + tolerance) {
        panelIssues.push(`Invoerrij ${index + 1}: inhoud is breder dan de rij.`);
      }
      if (panelRect.left < cardRect.left - tolerance || panelRect.right > cardRect.right + tolerance) {
        panelIssues.push(`Invoerrij ${index + 1}: rij valt buiten de maandkaart.`);
      }
      if (!panel.classList.contains("entry-row") || !panel.classList.contains("new-entry-row")) {
        panelIssues.push(`Invoerrij ${index + 1}: gebruikt niet dezelfde rijbasis als de ledger.`);
      }

      const style = getComputedStyle(panel);
      if (Number.parseFloat(style.paddingLeft) > 1 || Number.parseFloat(style.paddingRight) > 1) {
        panelIssues.push(`Invoerrij ${index + 1}: heeft nog paneelachtige zijpadding.`);
      }
      if (Number.parseFloat(style.borderTopWidth) > 0 || Number.parseFloat(style.borderLeftWidth) > 0 || Number.parseFloat(style.borderRightWidth) > 0) {
        panelIssues.push(`Invoerrij ${index + 1}: heeft nog een paneelkader.`);
      }
      if (Number.parseFloat(style.borderTopLeftRadius) > 1) {
        panelIssues.push(`Invoerrij ${index + 1}: heeft nog paneelafronding.`);
      }

      for (const child of Array.from(panel.children)) {
        const childRect = child.getBoundingClientRect();
        if (childRect.left < panelRect.left - tolerance || childRect.right > panelRect.right + tolerance) {
          panelIssues.push(`Invoerrij ${index + 1}: veld valt buiten de rij.`);
        }
      }

      return panelIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Visuele invoercontrole faalde (${label}):\n${issues.join("\n")}`);
  }

  await expectUnifiedLedgerGrid(page, label);
}

async function expectUnifiedLedgerGrid(page, label) {
  const issues = await page.evaluate(() => {
    const tolerance = 2;
    const visibleCards = Array.from(document.querySelectorAll(".month-card")).filter((card) => {
      if (!(card instanceof HTMLElement)) return false;
      const rect = card.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth;
    });

    return visibleCards.flatMap((card, cardIndex) => {
      if (!(card instanceof HTMLElement)) return [];
      const head = card.querySelector(".grid-head");
      if (!(head instanceof HTMLElement)) return [`Kaart ${cardIndex + 1}: ledgerkop ontbreekt.`];

      const headCells = Array.from(head.children).filter((child) => child instanceof HTMLElement);
      if (headCells.length < 4) return [`Kaart ${cardIndex + 1}: ledgerkop heeft te weinig kolommen.`];

      const amountRight = headCells[2].getBoundingClientRect().right;
      const actionColumnRect = headCells[3].getBoundingClientRect();
      const rows = Array.from(card.querySelectorAll(".section-title, .subcategory-row, .entry-row"));
      const cardIssues = [];

      for (const row of rows) {
        if (!(row instanceof HTMLElement)) continue;
        const rowRect = row.getBoundingClientRect();
        if (rowRect.width === 0 || rowRect.height === 0) continue;

        const amountElement = amountElementFor(row);
        if (amountElement instanceof HTMLElement) {
          const delta = Math.abs(amountElement.getBoundingClientRect().right - amountRight);
          if (delta > tolerance) {
            cardIssues.push(`${describeRow(row)}: geldkolom wijkt ${Math.round(delta)}px af.`);
          }
        }

        const actionElement = row.querySelector(".row-actions") ?? row.querySelector(".subcategory-actions") ?? row.querySelector(".subcategory-add") ?? row.querySelector(".locked-row");
        if (actionElement instanceof HTMLElement) {
          const actionRect = actionElement.getBoundingClientRect();
          if (actionRect.left < actionColumnRect.left - tolerance || actionRect.right > actionColumnRect.right + tolerance) {
            cardIssues.push(`${describeRow(row)}: actie-element valt buiten de actiekolom.`);
          }
        }
      }

      return cardIssues;
    });

    function describeRow(row) {
      if (row.classList.contains("new-entry-row")) return "Nieuwe invoerrij";
      if (row.classList.contains("edit-row")) return "Bewerkrij";
      if (row.classList.contains("carry-entry")) return "Overdrachtsrij";
      if (row.classList.contains("section-title")) return `Sectietitel '${row.textContent?.trim() ?? ""}'`;
      if (row.classList.contains("subcategory-row")) return `Categorierij '${row.textContent?.trim() ?? ""}'`;
      return `Boekingsrij '${row.textContent?.trim() ?? ""}'`;
    }

    function amountElementFor(row) {
      if (row.classList.contains("section-title")) return row.querySelector(":scope > span");
      if (row.classList.contains("subcategory-row")) return row.querySelector(":scope > strong");
      return row.querySelector(".amount-field input") ?? row.querySelector(".edit-amount input") ?? row.querySelector(":scope > strong");
    }
  });

  if (issues.length > 0) {
    throw new Error(`Ledger-uitlijning faalde (${label}):\n${issues.join("\n")}`);
  }
}

async function expectEditRowsContained(page, label) {
  const issues = await page.evaluate(() => {
    const tolerance = 1;
    return Array.from(document.querySelectorAll(".edit-row")).flatMap((row, index) => {
      const card = row.closest(".month-card");
      if (!card) return [`Bewerkrij ${index + 1}: geen maandkaart gevonden.`];

      const rowRect = row.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const rowIssues = [];

      if (row.scrollWidth > row.clientWidth + tolerance) {
        rowIssues.push(`Bewerkrij ${index + 1}: inhoud is breder dan de rij.`);
      }
      if (rowRect.left < cardRect.left - tolerance || rowRect.right > cardRect.right + tolerance) {
        rowIssues.push(`Bewerkrij ${index + 1}: rij valt buiten de maandkaart.`);
      }

      for (const child of Array.from(row.children)) {
        const childRect = child.getBoundingClientRect();
        if (childRect.left < rowRect.left - tolerance || childRect.right > rowRect.right + tolerance) {
          rowIssues.push(`Bewerkrij ${index + 1}: veld of knop valt buiten de rij.`);
        }
      }

      return rowIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Visuele bewerkcontrole faalde (${label}):\n${issues.join("\n")}`);
  }
}

async function expectDeleteConfirmRowsContained(page, label) {
  const issues = await page.evaluate(() => {
    const tolerance = 1;
    return Array.from(document.querySelectorAll(".delete-confirm-row")).flatMap((row, index) => {
      const card = row.closest(".month-card");
      if (!card) return [`Verwijderrij ${index + 1}: geen maandkaart gevonden.`];

      const rowRect = row.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const rowIssues = [];

      if (row.scrollWidth > row.clientWidth + tolerance) {
        rowIssues.push(`Verwijderrij ${index + 1}: inhoud is breder dan de rij.`);
      }
      if (rowRect.left < cardRect.left - tolerance || rowRect.right > cardRect.right + tolerance) {
        rowIssues.push(`Verwijderrij ${index + 1}: rij valt buiten de maandkaart.`);
      }

      for (const child of Array.from(row.children)) {
        const childRect = child.getBoundingClientRect();
        if (childRect.left < rowRect.left - tolerance || childRect.right > rowRect.right + tolerance) {
          rowIssues.push(`Verwijderrij ${index + 1}: tekst of knop valt buiten de rij.`);
        }
      }

      return rowIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Visuele verwijdercontrole faalde (${label}):\n${issues.join("\n")}`);
  }
}

async function expectFocusedElementContained(page, label) {
  const issue = await page.evaluate(() => {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) return "Geen actief element gevonden.";

    const card = focused.closest(".month-card");
    if (!card) return "Actief element staat niet in een maandkaart.";

    const tolerance = 1;
    const focusedRect = focused.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (focusedRect.left < cardRect.left - tolerance || focusedRect.right > cardRect.right + tolerance) {
      return "Actief element valt buiten de maandkaart.";
    }

    const statusBar = document.querySelector(".status-bar");
    if (statusBar) {
      const statusRect = statusBar.getBoundingClientRect();
      const overlapsVertically = focusedRect.bottom > statusRect.top && focusedRect.top < statusRect.bottom;
      const overlapsHorizontally = focusedRect.right > statusRect.left && focusedRect.left < statusRect.right;
      if (overlapsVertically && overlapsHorizontally) return "Actief element wordt door de statusbalk bedekt.";
    }

    return "";
  });

  if (issue) throw new Error(`Visuele focuscontrole faalde (${label}): ${issue}`);
}

async function expectBrandVisualIdentity(page) {
  const issue = await page.evaluate(() => {
    const mark = document.querySelector(".brand-mark");
    const image = mark?.querySelector("img");
    if (!(mark instanceof HTMLElement) || !(image instanceof HTMLImageElement)) return "Logo ontbreekt.";

    const markStyle = getComputedStyle(mark);
    const imageStyle = getComputedStyle(image);
    const markRect = mark.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const radius = Number.parseFloat(markStyle.borderRadius || "0");

    if (radius > 4) return "Logo staat opnieuw in een rond kader.";
    if (markStyle.overflow === "hidden") return "Logo wordt mogelijk afgesneden.";
    if (imageStyle.objectFit !== "contain") return "Logo wordt niet volledig passend getoond.";
    if (imageRect.width < 42 || imageRect.height < 38) return "Logo is te klein om als identiteit te werken.";
    if (imageRect.left < markRect.left - 6 || imageRect.right > markRect.right + 6) return "Logo valt te ver buiten zijn plek.";
    return "";
  });

  if (issue) throw new Error(`Logocontrole faalde: ${issue}`);
}

async function navigateToMonth(page, monthNumber) {
  await page.locator(`[data-month-tab="${monthNumber}"]`).click();
  await page.waitForFunction(
    (targetMonthNumber) => {
      const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
      if (!(activeCard instanceof HTMLElement)) return false;

      const cardRect = activeCard.getBoundingClientRect();
      const active = activeCard.classList.contains("active-card");
      const visible = cardRect.left >= -1 && cardRect.right <= window.innerWidth + 1;
      return active && visible;
    },
    monthNumber,
    { timeout: 5_000 },
  );
  await expectMonthTabsVisible(page, `maandknop ${monthNumber}`);
}

async function navigateWithCardButton(page, fromMonthNumber, buttonName, expectedMonthNumber) {
  await page.locator(`[data-month-card="${fromMonthNumber}"] button[aria-label="${buttonName}"]`).click();
  await page.waitForFunction(
    (targetMonthNumber) => {
      const activeTab = document.querySelector(`[data-month-tab="${targetMonthNumber}"]`);
      const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
      if (!(activeTab instanceof HTMLElement) || !(activeCard instanceof HTMLElement)) return false;

      const cardRect = activeCard.getBoundingClientRect();
      return (
        activeTab.classList.contains("active") &&
        activeCard.classList.contains("active-card") &&
        cardRect.left >= -1 &&
        cardRect.right <= window.innerWidth + 1
      );
    },
    expectedMonthNumber,
    { timeout: 5_000 },
  );
  await expectMonthTabsVisible(page, `${buttonName} vanaf maand ${fromMonthNumber}`);
}

async function expectOtherMonthButtonCentersCard(page, monthNumber) {
  const card = page.locator(`[data-month-card="${monthNumber}"]`);
  await card.locator('.entry-row:not(.carry-entry) button[aria-label^="Regel bewerken"]').first().click();
  await page.waitForFunction(
    (targetMonthNumber) => {
      const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
      const focused = document.activeElement;
      return (
        activeCard instanceof HTMLElement &&
        activeCard.classList.contains("active-card") &&
        focused instanceof HTMLElement &&
        focused.closest(".month-card") === activeCard
      );
    },
    monthNumber,
    { timeout: 5_000 },
  );
  await expectActiveMonthVisible(page, monthNumber);
  await expectActiveCardCenteredEnough(page, monthNumber);
  await card.getByLabel("Bewerken annuleren").click();
}

async function expectMonthCardFocused(page, monthNumber) {
  const issue = await page.evaluate((targetMonthNumber) => {
    const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
    if (!(activeCard instanceof HTMLElement)) return "Maandkaart ontbreekt.";
    if (document.activeElement !== activeCard) return "Focus staat niet op de geselecteerde maandkaart.";
    return "";
  }, monthNumber);

  if (issue) throw new Error(`Maandkaart-focuscontrole faalde voor maand ${monthNumber}: ${issue}`);
}

async function navigateByClickingCard(page, monthNumber) {
  await page.locator(`[data-month-card="${monthNumber}"] .month-title`).click();
  await page.waitForFunction(
    (targetMonthNumber) => {
      const activeTab = document.querySelector(`[data-month-tab="${targetMonthNumber}"]`);
      const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
      if (!(activeTab instanceof HTMLElement) || !(activeCard instanceof HTMLElement)) return false;

      return activeTab.classList.contains("active") && activeCard.classList.contains("active-card");
    },
    monthNumber,
    { timeout: 5_000 },
  );
}

async function expectActiveMonthVisible(page, monthNumber) {
  await page.waitForFunction(
    (targetMonthNumber) => {
      const activeTab = document.querySelector(`[data-month-tab="${targetMonthNumber}"]`);
      const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
      if (!(activeTab instanceof HTMLElement) || !(activeCard instanceof HTMLElement)) return false;
      if (!activeTab.classList.contains("active") || !activeCard.classList.contains("active-card")) return false;

      const cardRect = activeCard.getBoundingClientRect();
      return cardRect.left >= -1 && cardRect.right <= window.innerWidth + 1;
    },
    monthNumber,
    { timeout: 5_000 },
  );

  const issue = await page.evaluate((targetMonthNumber) => {
    const activeTab = document.querySelector(`[data-month-tab="${targetMonthNumber}"]`);
    const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
    if (!(activeTab instanceof HTMLElement) || !(activeCard instanceof HTMLElement)) return "Maandknop of maandkaart ontbreekt.";
    if (!activeTab.classList.contains("active")) return "Maandknop is niet actief.";
    if (!activeCard.classList.contains("active-card")) return "Maandkaart is niet actief.";

    const cardRect = activeCard.getBoundingClientRect();
    if (cardRect.left < -1 || cardRect.right > window.innerWidth + 1) return "Actieve maandkaart is niet volledig zichtbaar.";

    return "";
  }, monthNumber);

  if (issue) throw new Error(`Maandnavigatie faalde voor maand ${monthNumber}: ${issue}`);
}

async function expectActiveCardProminent(page, monthNumber) {
  const issue = await page.evaluate((targetMonthNumber) => {
    const card = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
    if (!(card instanceof HTMLElement)) return "Actieve maandkaart ontbreekt.";

    const style = getComputedStyle(card);
    if (style.boxShadow === "none") return "Actieve maandkaart heeft geen duidelijke schaduw.";
    if (style.outlineStyle === "none" || Number.parseFloat(style.outlineWidth || "0") < 1) return "Actieve maandkaart mist subtiele glowrand.";
    if (Number(style.zIndex || "0") < 1) return "Actieve maandkaart ligt niet zichtbaar boven buurkaarten.";

    return "";
  }, monthNumber);

  if (issue) throw new Error(`Actieve-kaartcontrole faalde voor maand ${monthNumber}: ${issue}`);
}

async function expectActiveMonthTabProminent(page, monthNumber) {
  const issue = await page.evaluate((targetMonthNumber) => {
    const activeTab = document.querySelector(`[data-month-tab="${targetMonthNumber}"]`);
    if (!(activeTab instanceof HTMLElement)) return "Actieve maandknop ontbreekt.";
    if (activeTab.getAttribute("aria-current") !== "date") return "Actieve maandknop mist aria-current.";

    const style = getComputedStyle(activeTab);
    if (style.boxShadow === "none") return "Actieve maandknop heeft geen duidelijke selectie.";

    const markerStyle = getComputedStyle(activeTab, "::after");
    if (!markerStyle.content || markerStyle.content === "none") return "Actieve maandknop mist visuele markering.";
    if (Number.parseFloat(markerStyle.bottom || "0") > 4) return "Actieve maandlijn staat te hoog en loopt door het bedrag.";
    if (Number.parseFloat(markerStyle.height || "0") > 2.5) return "Actieve maandlijn is te zwaar bij het bedrag.";

    return "";
  }, monthNumber);

  if (issue) throw new Error(`Actieve maandknopcontrole faalde voor maand ${monthNumber}: ${issue}`);
}

async function expectCompactTopUi(page) {
  const issue = await page.evaluate(() => {
    const firstCard = document.querySelector(".month-card");
    const monthTabs = document.querySelector('[data-testid="month-tabs"]');
    const primaryAction = document.querySelector(".primary-action");
    if (!(firstCard instanceof HTMLElement) || !(monthTabs instanceof HTMLElement)) return "Maandkaart of maandbalk ontbreekt.";
    if (!(primaryAction instanceof HTMLElement)) return "Overzichtknop ontbreekt.";

    const firstCardTop = firstCard.getBoundingClientRect().top;
    const tabsBottom = monthTabs.getBoundingClientRect().bottom;
    if (tabsBottom > 260) return `Maandbalk staat te laag (${Math.round(tabsBottom)}px).`;
    if (firstCardTop > 330) return `Maandkaarten beginnen te laag (${Math.round(firstCardTop)}px).`;
    if (document.documentElement.scrollWidth > window.innerWidth + 1) return "Pagina heeft horizontale overloop in de topinterface.";

    const actionRect = primaryAction.getBoundingClientRect();
    if (actionRect.right > window.innerWidth + 1 || actionRect.left < -1) return "Overzichtknop is niet volledig zichtbaar.";

    return "";
  });

  if (issue) throw new Error(`Compactheidscontrole faalde: ${issue}`);
}

async function expectNoPageHorizontalOverflow(page, label) {
  const issue = await page.evaluate(() => {
    const tolerance = 2;
    const rootWidth = document.documentElement.clientWidth;
    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      if (!(element instanceof HTMLElement)) continue;
      if (element.closest(".board, .month-tabs, .toolbar, .header-actions")) continue;
      const rect = element.getBoundingClientRect();
      if (rect.left < -tolerance || rect.right > rootWidth + tolerance) {
        return `Element buiten viewport: ${element.className || element.tagName}.`;
      }
    }

    return "";
  });

  if (issue) throw new Error(`Responsive overloopcontrole faalde (${label}): ${issue}`);
}

async function expectActiveCardNotClipped(page, monthNumber) {
  const issue = await page.evaluate((targetMonthNumber) => {
    const tabs = document.querySelector('[data-testid="month-tabs"]');
    const card = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
    if (!(tabs instanceof HTMLElement) || !(card instanceof HTMLElement)) return "Maandbalk of actieve kaart ontbreekt.";

    const tabsRect = tabs.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    if (cardRect.top < tabsRect.bottom - 1) return "Actieve kaart schuift onder de maandbalk.";
    if (cardRect.top < 0) return "Actieve kaart is bovenaan afgesneden.";

    return "";
  }, monthNumber);

  if (issue) throw new Error(`Actieve-kaart clippingcontrole faalde voor maand ${monthNumber}: ${issue}`);
}

async function expectCategoryInputs(page) {
  const issue = await page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll(".new-entry-panel"));
    if (panels.some((panel) => panel.querySelector("select"))) return "Een invoerrij bevat nog een categorie-dropdown.";

    for (const panel of panels) {
      const heading = panel.previousElementSibling;
      if (!heading?.classList.contains("subcategory-row")) return "Een invoerrij staat niet direct onder een categorietitel.";
    }

    const categoryRows = Array.from(document.querySelectorAll(".subcategory-row"));
    if (categoryRows.length === 0) return "Geen categorietitelrijen gevonden.";
    if (categoryRows.some((row) => !row.querySelector(".subcategory-add"))) return "Een categorietitel mist een invoerknop.";
    if (categoryRows.some((row) => row.querySelector("em"))) return "Een categorietitel toont nog een zichtbaar aantal.";
    if (categoryRows.some((row) => !row.getAttribute("data-entry-count"))) return "Een categorietitel bewaart het aantal niet als metadata.";
    if (categoryRows.some((row) => !/€\s?[\d.,-]+/.test(row.textContent ?? ""))) return "Een categorietitel mist een subtotaal.";

    return "";
  });

  if (issue) throw new Error(`Categorie-invoercontrole faalde: ${issue}`);
}

async function expectIncomePartyInputs(page) {
  const issues = await page.evaluate(() => {
    const incomePanels = Array.from(document.querySelectorAll('.budget-section[aria-label="Inkomsten"] .new-entry-panel'));
    if (incomePanels.length === 0) return ["Geen inkomsten-invoerrijen gevonden."];

    return incomePanels.flatMap((panel, index) => {
      const rowIssues = [];
      const partyInput = panel.querySelector('input[aria-label^="Partij"]');
      const descriptionInput = panel.querySelector('input[aria-label^="Omschrijving"]');
      const amountInput = panel.querySelector('input[aria-label^="Bedrag"]');

      if (!(partyInput instanceof HTMLInputElement)) rowIssues.push(`Inkomstenrij ${index + 1}: Partij-invoer ontbreekt.`);
      if (!(descriptionInput instanceof HTMLInputElement)) rowIssues.push(`Inkomstenrij ${index + 1}: Omschrijving-invoer ontbreekt.`);
      if (!(amountInput instanceof HTMLInputElement)) rowIssues.push(`Inkomstenrij ${index + 1}: Bedrag-invoer ontbreekt.`);

      if (partyInput instanceof HTMLInputElement && descriptionInput instanceof HTMLInputElement && amountInput instanceof HTMLInputElement) {
        const controls = Array.from(panel.querySelectorAll("input, button"));
        const partyIndex = controls.indexOf(partyInput);
        const descriptionIndex = controls.indexOf(descriptionInput);
        const amountIndex = controls.indexOf(amountInput);
        if (!(partyIndex < descriptionIndex && descriptionIndex < amountIndex)) {
          rowIssues.push(`Inkomstenrij ${index + 1}: tabvolgorde is niet Partij, Omschrijving, Bedrag.`);
        }
      }

      return rowIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Partijcontrole voor inkomsten faalde:\n${issues.join("\n")}`);
  }
}

async function expectTaskbarTime(page) {
  const issue = await page.evaluate(() => {
    const statusBar = document.querySelector(".status-bar");
    if (!(statusBar instanceof HTMLElement)) return "Statusbalk ontbreekt.";
    const text = statusBar.textContent ?? "";
    if (!/\d{2}:\d{2}/.test(text)) return "Statusbalk toont geen tijd.";
    if (!/Leermodus|Productie/.test(text)) return "Statusbalk toont geen modus.";
    if (!/\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i.test(text)) return "Statusbalk toont geen lange weekdag.";
    if (!/\b(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/i.test(text)) return "Statusbalk toont geen lange datum.";
    if (/€/.test(text)) return "Statusbalk toont financiële statistieken.";

    const style = getComputedStyle(statusBar);
    if (style.position !== "fixed") return "Statusbalk is niet vast onderaan.";
    if (style.display !== "grid") return "Statusbalk gebruikt geen compacte verdeling.";
    const statusRect = statusBar.getBoundingClientRect();
    if (statusRect.bottom > window.innerHeight + 1) return "Statusbalk valt buiten beeld.";
    const maxHeight = window.innerWidth <= 640 ? 34 : 32;
    if (statusRect.height > maxHeight) return `Statusbalk is te hoog (${Math.round(statusRect.height)}px).`;

    const children = Array.from(statusBar.children).filter((child) => child instanceof HTMLElement);
    if (children.length !== 3) return "Statusbalk heeft niet exact drie zones.";
    if (!children[1]?.textContent?.includes("geselecteerd")) return "Geselecteerde maand staat niet in het midden.";
    if (!children[2]?.classList.contains("status-date")) return "Datum en tijd staan niet rechts.";
    if (getComputedStyle(children[1]).textAlign !== "center") return "Geselecteerde maand is niet centraal uitgelijnd.";
    if (getComputedStyle(children[2]).justifyContent !== "flex-end") return "Datum en tijd zijn niet rechts uitgelijnd.";
    const tops = children.map((child) => child.getBoundingClientRect().top);
    if (Math.max(...tops) - Math.min(...tops) > 4) return "Statusbalk valt uiteen in meerdere regels.";
    return "";
  });

  if (issue) throw new Error(`Taakbalkcontrole faalde: ${issue}`);
  await expectStatusBarDoesNotOverlapCards(page, "taakbalk");
}

async function expectCurrentMonthIndicator(page) {
  const issue = await page.evaluate(() => {
    const currentTab = document.querySelector('[data-current-month="true"]');
    const currentCard = document.querySelector(".month-card.current-month");
    if (!(currentTab instanceof HTMLElement) || !(currentCard instanceof HTMLElement)) return "Huidige maand heeft geen indicator.";

    const tabSun = currentTab.querySelector(".current-sun");
    const cardSun = currentCard.querySelector(".current-card-sun");
    if (!(tabSun instanceof SVGElement)) return "Huidige maand mist zonicoon in maandbalk.";
    if (!(cardSun instanceof SVGElement)) return "Huidige maand mist zonicoon op maandkaart.";

    const tabLine = getComputedStyle(currentTab, "::before");
    const cardLine = getComputedStyle(currentCard, "::before");
    if (!tabLine.content || tabLine.content === "none") return "Huidige maand mist lijn in maandbalk.";
    if (!cardLine.content || cardLine.content === "none") return "Huidige maand mist lijn op kaart.";

    const tabSunColor = getComputedStyle(tabSun).color;
    const cardSunColor = getComputedStyle(cardSun).color;
    if (averageBrightness(tabSunColor) < 70) return `Zonicoon in maandbalk is te donker (${tabSunColor}).`;
    if (averageBrightness(cardSunColor) < 70) return `Zonicoon op kaart is te donker (${cardSunColor}).`;
    return "";

    function averageBrightness(cssColor) {
      const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return 255;
      return (Number(match[1]) + Number(match[2]) + Number(match[3])) / 3;
    }
  });

  if (issue) throw new Error(`Huidige-maandcontrole faalde: ${issue}`);
}

async function expectSeasonalMonthBadges(page) {
  const issues = await page.evaluate(() => {
    const visibleTabs = Array.from(document.querySelectorAll("[data-month-tab]")).filter((tab) => {
      if (!(tab instanceof HTMLElement)) return false;
      const rect = tab.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth;
    });

    return visibleTabs.flatMap((tab, index) => {
      if (!(tab instanceof HTMLElement)) return [];
      const badge = tab.querySelector(".month-number");
      if (!(badge instanceof HTMLElement)) return [`Maandtab ${index + 1}: zonbadge ontbreekt.`];

      const tabStyle = getComputedStyle(tab);
      const badgeStyle = getComputedStyle(badge);
      const badgeRect = badge.getBoundingClientRect();
      const badgeIssues = [];
      if (!tabStyle.getPropertyValue("--month-sun").trim()) badgeIssues.push(`Maandtab ${index + 1}: mist zonkleur.`);
      if (!badgeStyle.backgroundImage.includes("radial-gradient")) badgeIssues.push(`Maandtab ${index + 1}: zonbadge mist kleurschakering.`);
      if (badgeRect.width < 26 || badgeRect.height < 26) badgeIssues.push(`Maandtab ${index + 1}: zonbadge is te klein.`);
      if (averageBrightness(badgeStyle.backgroundColor) < 42 && !badgeStyle.backgroundImage.includes("gradient")) {
        badgeIssues.push(`Maandtab ${index + 1}: zonbadge is te donker.`);
      }
      return badgeIssues;
    });

    function averageBrightness(cssColor) {
      const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return 180;
      return (Number(match[1]) + Number(match[2]) + Number(match[3])) / 3;
    }
  });

  if (issues.length > 0) {
    throw new Error(`Seizoensbadgecontrole faalde:\n${issues.join("\n")}`);
  }
}

async function expectBrandReturnsToCurrentMonth(page) {
  await navigateToMonth(page, 10);
  await page.getByLabel("Ga naar huidige maand").click();
  await page.waitForFunction(() => {
    const currentCard = document.querySelector(".month-card.current-month");
    const currentTab = document.querySelector('[data-current-month="true"]');
    return currentCard?.classList.contains("active-card") && currentTab?.classList.contains("active");
  });
  await expectActiveCardCenteredEnough(page, 6);
}

async function expectModeSwitchSeparatesDemo(page) {
  const headerIssue = await page.evaluate(() => {
    const header = document.querySelector(".app-header");
    if (!(header instanceof HTMLElement)) return "Header ontbreekt.";
    if (header.textContent?.includes("Leren") || header.textContent?.includes("Echt")) {
      return "Gegevensmodus staat nog in de hoofdinterface.";
    }
    return "";
  });
  if (headerIssue) throw new Error(`Moduscontrole faalde: ${headerIssue}`);

  await page.getByRole("button", { name: "Instellingen" }).click();
  await expectVisibleText(page, "Gegevensmodus");
  await page.getByRole("button", { name: "Echt" }).click();
  await expectVisibleText(page, "Productie");
  await page.waitForFunction(() => {
    const text = document.body.textContent ?? "";
    return text.includes("Productie") && !text.includes("Pensioendienst");
  });

  await page.getByRole("button", { name: "Leren" }).click();
  await expectVisibleText(page, "Leermodus");
  await expectVisibleText(page, "Pensioendienst");

  const issue = await page.evaluate(({ demoKey, productionKey, modeKey }) => {
    if (localStorage.getItem(modeKey) !== "demo") return "Modus is niet naar leermodus teruggezet.";
    if (!localStorage.getItem(demoKey)) return "Demo-opslag ontbreekt.";
    if (!localStorage.getItem(productionKey)) return "Productie-opslag ontbreekt na moduswissel.";
    return "";
  }, { demoKey: demoStorageKey, productionKey: productionStorageKey, modeKey: modeStorageKey });

  if (issue) throw new Error(`Moduscontrole faalde: ${issue}`);

  await page.getByRole("button", { name: "Instellingen" }).click();
  await expectHiddenText(page, "Gegevensmodus");
}

async function expectTooltips(page) {
  const issue = await page.evaluate(() => {
    const selectors = [".brand", ".tool", ".icon-button", ".primary-action", ".month-tools button", ".subcategory-add", ".entry-row button"];
    for (const selector of selectors) {
      const elements = Array.from(document.querySelectorAll(selector)).filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (elements.length === 0) continue;
      for (const element of elements) {
        if (!element.getAttribute("aria-label") && !element.textContent?.trim()) return `${selector} mist toegankelijke naam.`;
        if (!element.dataset.tooltip && !element.getAttribute("title")) return `${selector} mist tooltip.`;
      }
    }
    return "";
  });

  if (issue) throw new Error(`Tooltipcontrole faalde: ${issue}`);
}

async function expectDistinctSectionIcons(page) {
  const issue = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll("[data-month-card='6'] .section-title"));
    const paths = titles.map((title) => title.querySelector("svg")?.innerHTML ?? "");
    if (paths.length < 3) return "Niet alle sectietitels hebben een icoon.";
    if (new Set(paths).size !== paths.length) return "Sectie-iconen zijn niet uniek.";
    return "";
  });

  if (issue) throw new Error(`Sectie-icooncontrole faalde: ${issue}`);
}

async function expectSectionColorScales(page) {
  const issue = await page.evaluate(() => {
    const income = document.querySelector(".section-title.income");
    const fixed = document.querySelector(".section-title.fixed");
    const variable = document.querySelector(".section-title.variable");
    if (!(income instanceof HTMLElement) || !(fixed instanceof HTMLElement) || !(variable instanceof HTMLElement)) {
      return "Sectiekoppen ontbreken.";
    }

    const incomeColor = rgb(getComputedStyle(income).color);
    const fixedColor = rgb(getComputedStyle(fixed).color);
    const variableColor = rgb(getComputedStyle(variable).color);
    if (!incomeColor || !fixedColor || !variableColor) return "Sectiekleuren konden niet gelezen worden.";
    if (incomeColor.g <= incomeColor.r) return `Inkomstenkop is niet groener dan rood (${getComputedStyle(income).color}).`;
    if (fixedColor.r <= fixedColor.g) return `Vaste-kostenkop is niet roder dan groen (${getComputedStyle(fixed).color}).`;
    if (variableColor.r <= variableColor.g) return `Variabele-kostenkop is niet roder dan groen (${getComputedStyle(variable).color}).`;

    for (const title of [income, fixed, variable]) {
      const background = getComputedStyle(title).backgroundImage;
      if (background === "none") return "Sectiekop mist subtiele kleurschakering.";
    }
    return "";

    function rgb(value) {
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return null;
      return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
    }
  });

  if (issue) throw new Error(`Sectiekleurcontrole faalde: ${issue}`);
}

async function expectCarryBalanceInIncomeGrid(page) {
  const issue = await page.evaluate(() => {
    const floatingCarry = document.querySelector(".carry-row");
    if (floatingCarry) return "Overdracht staat nog als zwevende balk.";

    const transferRow = document.querySelector("[data-month-card='6'] [data-transfer-row='true']");
    if (!(transferRow instanceof HTMLElement)) return "Overdracht ontbreekt in de inkomsten-grid.";
    if (!transferRow.textContent?.includes("Resterend van vorige maand")) return "Overdracht heeft niet de juiste tekst.";
    if (transferRow.querySelector("button")) return "Overdracht is per ongeluk bewerkbaar.";

    const incomeTitle = transferRow.closest(".budget-section")?.querySelector(".section-title");
    if (!incomeTitle?.textContent?.includes("Inkomsten")) return "Overdracht staat niet bij inkomsten.";
    return "";
  });

  if (issue) throw new Error(`Overdrachtcontrole faalde: ${issue}`);
}

async function expectNoTransferLocks(page) {
  const issue = await page.evaluate(() => {
    for (const transferRow of Array.from(document.querySelectorAll("[data-transfer-row='true']"))) {
      if (!(transferRow instanceof HTMLElement)) continue;
      if (transferRow.querySelector(".locked-row, svg")) return "Overdracht toont nog een slotje.";
      const spacer = transferRow.querySelector(".transfer-spacer");
      if (!(spacer instanceof HTMLElement)) return "Overdracht mist een lege actiecel voor grid-uitlijning.";
    }

    return "";
  });

  if (issue) throw new Error(`Overdracht-slotcontrole faalde: ${issue}`);
}

async function expectQuietActionHeaders(page) {
  const issue = await page.evaluate(() => {
    for (const head of Array.from(document.querySelectorAll(".grid-head"))) {
      if (!(head instanceof HTMLElement)) continue;
      if (/Bewerk/i.test(head.textContent ?? "")) return "Ledgerkop toont nog 'Bewerk'.";

      const actionHead = head.querySelector(".action-head");
      if (!(actionHead instanceof HTMLElement)) return "Ledgerkop mist de actiecel.";
      if ((actionHead.textContent ?? "").trim()) return "Actiekop moet visueel leeg blijven.";

      const amountHead = head.querySelector(".amount-head");
      if (!(amountHead instanceof HTMLElement)) return "Ledgerkop mist de bedragcel.";
      if (getComputedStyle(amountHead).textAlign !== "right") return "Bedragkop is niet rechts uitgelijnd.";
    }

    return "";
  });

  if (issue) throw new Error(`Ledgerkopcontrole faalde: ${issue}`);
}

async function expectExcelNumberAlignment(page) {
  const issue = await page.evaluate(() => {
    const selectors = [".entry-row strong", ".amount-field input", ".edit-amount input", ".subcategory-row strong", ".section-title span"];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        if (!(element instanceof HTMLElement)) continue;
        const style = getComputedStyle(element);
        if (style.textAlign !== "right") return `${selector} is niet rechts uitgelijnd.`;
        if (!style.fontVariantNumeric.includes("tabular") && style.fontVariantNumeric !== "normal") {
          return `${selector} heeft onverwachte cijferstijl.`;
        }
      }
    }
    return "";
  });

  if (issue) throw new Error(`Excel-uitlijning faalde: ${issue}`);
}

async function expectSpreadsheetColumnDividers(page) {
  const issues = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".month-card .grid-head, .month-card .entry-row, .month-card .subcategory-row, .month-card .section-title")).filter(
      (row) => {
        if (!(row instanceof HTMLElement)) return false;
        const rect = row.getBoundingClientRect();
        return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
      },
    );

    return rows.flatMap((row, index) => {
      if (!(row instanceof HTMLElement)) return [];
      const cells = Array.from(row.children).filter((child) => child instanceof HTMLElement);
      if (cells.length < 3) return [];
      const rowIssues = [];
      for (const cell of cells.slice(1)) {
        const style = getComputedStyle(cell);
        if (style.borderLeftStyle === "none" || Number.parseFloat(style.borderLeftWidth || "0") < 1) {
          rowIssues.push(`Rij ${index + 1}: mist verticale kolomlijn.`);
          break;
        }
      }
      return rowIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Spreadsheet-kolomcontrole faalde:\n${issues.join("\n")}`);
  }
}

async function expectSavedRowActionColumnSnug(page, label) {
  const issues = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".month-card .entry-row:not(.new-entry-row):not(.edit-row)")).filter((row) => {
      if (!(row instanceof HTMLElement)) return false;
      const rect = row.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
    });

    return rows.flatMap((row, index) => {
      if (!(row instanceof HTMLElement)) return [];
      const card = row.closest(".month-card");
      const amount = row.querySelector(".amount-cell, :scope > strong");
      const action = row.querySelector(".row-actions button, .locked-row");
      if (!(card instanceof HTMLElement) || !(amount instanceof HTMLElement) || !(action instanceof HTMLElement)) return [];

      const cardRect = card.getBoundingClientRect();
      const amountRect = amount.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      const rowIssues = [];
      const amountToActionGap = actionRect.left - amountRect.right;
      const actionRightInset = cardRect.right - actionRect.right;
      const minExpectedWidth = window.innerWidth >= 760 ? 468 : 0;

      if (amountToActionGap > 24) rowIssues.push(`Rij ${index + 1}: lege ruimte tussen bedrag en knop is te groot (${Math.round(amountToActionGap)}px).`);
      if (actionRightInset < 8) rowIssues.push(`Rij ${index + 1}: knop staat te dicht tegen de rechterrand.`);
      if (minExpectedWidth && cardRect.width < minExpectedWidth) rowIssues.push(`Rij ${index + 1}: maandkaart is nog te smal (${Math.round(cardRect.width)}px).`);
      return rowIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Actiekolomcontrole faalde (${label}):\n${issues.join("\n")}`);
  }
}

async function expectLedgerBreathingRoom(page, label) {
  const issues = await page.evaluate(() => {
    const tolerance = 1;
    const rows = Array.from(document.querySelectorAll(".month-card .entry-row, .month-card .subcategory-row, .month-card .grid-head")).filter((row) => {
      if (!(row instanceof HTMLElement)) return false;
      const rect = row.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
    });

    return rows.flatMap((row, index) => {
      if (!(row instanceof HTMLElement)) return [];
      const card = row.closest(".month-card");
      if (!(card instanceof HTMLElement)) return [];
      const cardRect = card.getBoundingClientRect();
      const rowIssues = [];

      const firstTextCell = row.querySelector(".party-cell, .party-head, .description-head, :scope > span");
      if (firstTextCell instanceof HTMLElement) {
        const cellRect = firstTextCell.getBoundingClientRect();
        if (cellRect.left < cardRect.left + 8 - tolerance) {
          rowIssues.push(`Rij ${index + 1}: tekst staat te dicht tegen de linkerrand.`);
        }
        const paddingLeft = Number.parseFloat(getComputedStyle(firstTextCell).paddingLeft);
        if (paddingLeft < 3) rowIssues.push(`Rij ${index + 1}: tekstcel heeft te weinig interne padding.`);
      }

      const actionCell = row.querySelector(".row-actions, .subcategory-actions, .subcategory-add, .locked-row, .action-head");
      if (actionCell instanceof HTMLElement) {
        const actionRect = actionCell.getBoundingClientRect();
        if (actionRect.right > cardRect.right - 7 + tolerance) {
          rowIssues.push(`Rij ${index + 1}: actiekolom hangt te dicht tegen de rechterrand.`);
        }
        const categoryButton = row.querySelector(".subcategory-add");
        if (categoryButton instanceof HTMLElement) {
          const buttonRect = categoryButton.getBoundingClientRect();
          if (!categoryButton.parentElement?.classList.contains("subcategory-actions")) {
            rowIssues.push(`Rij ${index + 1}: categorie-plusknop mist een eigen actiecelle.`);
          }
          if (buttonRect.width > 34) {
            rowIssues.push(`Rij ${index + 1}: categorie-plusknop is te breed.`);
          }
          if (buttonRect.left <= actionRect.left + 2) {
            rowIssues.push(`Rij ${index + 1}: categorie-plusknop raakt de kolomlijn.`);
          }
        }
      }

      return rowIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Ledger-ademruimtecontrole faalde (${label}):\n${issues.join("\n")}`);
  }
}

async function expectRecentRowGlow(page, description) {
  const issue = await page.evaluate((text) => {
    const row = Array.from(document.querySelectorAll(".entry-row")).find((element) => element.textContent?.includes(text));
    if (!(row instanceof HTMLElement)) return "Nieuwe rij niet gevonden.";
    if (!row.classList.contains("recent-row")) return "Nieuwe rij kreeg geen korte highlight.";

    const style = getComputedStyle(row);
    if (style.animationName === "none" && style.boxShadow === "none") return "Nieuwe rij heeft geen zichtbare feedback.";
    return "";
  }, description);

  if (issue) throw new Error(`Nieuwe-rijcontrole faalde: ${issue}`);
}

async function expectStatusBarDoesNotOverlapCards(page, label) {
  const issue = await page.evaluate(() => {
    const statusBar = document.querySelector(".status-bar");
    if (!(statusBar instanceof HTMLElement)) return "Statusbalk ontbreekt.";
    const statusRect = statusBar.getBoundingClientRect();
    const blockers = Array.from(document.querySelectorAll(".new-entry-panel, .edit-row, .month-footer, :focus")).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.classList.contains("month-card")) return false;
      const rect = element.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
    });

    for (const element of blockers) {
      const rect = element.getBoundingClientRect();
      const overlaps = rect.left < statusRect.right && rect.right > statusRect.left && rect.top < statusRect.bottom && rect.bottom > statusRect.top;
      if (overlaps) return `Statusbalk overlapt ${element.className || element.tagName}.`;
    }
    return "";
  });

  if (issue) throw new Error(`Footer-overlapcontrole faalde (${label}): ${issue}`);
}

async function expectDarkModeMonthHeaders(page) {
  const issue = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main?.classList.contains("evening")) return "Avondmodus is niet actief.";

    const headers = Array.from(document.querySelectorAll(".month-card .month-header")).filter((header) => {
      const rect = header.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth;
    });
    if (headers.length === 0) return "Geen zichtbare maandheaders gevonden.";

    for (const header of headers) {
      if (!(header instanceof HTMLElement)) continue;
      const background = getComputedStyle(header).backgroundColor;
      const color = getComputedStyle(header).color;
      const brightness = averageBrightness(background);
      if (brightness > 96) return `Maandheader is te licht in avondmodus (${background}).`;
      if (averageBrightness(color) < 150) return `Maandheadertekst is te donker in avondmodus (${color}).`;
    }
    return "";

    function averageBrightness(cssColor) {
      const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return 0;
      return (Number(match[1]) + Number(match[2]) + Number(match[3])) / 3;
    }
  });

  if (issue) throw new Error(`Donkere-moduscontrole faalde: ${issue}`);
}

async function expectActiveCardCenteredEnough(page, monthNumber) {
  await page.waitForFunction(
    (targetMonthNumber) => {
      const card = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
      if (!(card instanceof HTMLElement)) return false;
      const rect = card.getBoundingClientRect();
      return Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2) <= 130;
    },
    monthNumber,
    { timeout: 5_000 },
  );

  const issue = await page.evaluate((targetMonthNumber) => {
    const card = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
    if (!(card instanceof HTMLElement)) return "Actieve maandkaart ontbreekt.";

    const rect = card.getBoundingClientRect();
    const centerDelta = Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2);
    if (centerDelta > 130) return `Actieve kaart staat te ver uit het midden (${Math.round(centerDelta)}px).`;
    return "";
  }, monthNumber);

  if (issue) throw new Error(`December-centrering faalde: ${issue}`);
}

async function expectMonthHeaderLayout(page, label) {
  const issues = await page.evaluate(() => {
    const tolerance = 1;
    const visibleCards = Array.from(document.querySelectorAll(".month-card")).filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth;
    });

    return visibleCards.flatMap((card, index) => {
      if (!(card instanceof HTMLElement)) return [];
      const cardRect = card.getBoundingClientRect();
      const header = card.querySelector(".month-header");
      const image = card.querySelector(".month-header img");
      const title = card.querySelector(".month-title");
      const tools = card.querySelector(".month-tools");
      if (!(header instanceof HTMLElement) || !(image instanceof HTMLElement) || !(title instanceof HTMLElement) || !(tools instanceof HTMLElement)) {
        return [`Zichtbare maandkaart ${index + 1}: headeronderdelen ontbreken.`];
      }

      const headerRect = header.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const toolsRect = tools.getBoundingClientRect();
      const headerStyle = getComputedStyle(header);
      const cardIssues = [];

      if (imageRect.width < 68 || imageRect.height < 68) {
        cardIssues.push(`Zichtbare maandkaart ${index + 1}: maandicoon is te klein.`);
      }
      if (!headerStyle.backgroundImage.includes("linear-gradient")) {
        cardIssues.push(`Zichtbare maandkaart ${index + 1}: header mist seizoenskleur.`);
      }

      for (const [name, rect] of [
        ["maandicoon", imageRect],
        ["maandtitel", titleRect],
        ["knoppenrij", toolsRect],
      ]) {
        if (rect.left < cardRect.left - tolerance || rect.right > cardRect.right + tolerance) {
          cardIssues.push(`Zichtbare maandkaart ${index + 1}: ${name} valt buiten de kaart.`);
        }
        if (rect.top < headerRect.top - tolerance || rect.bottom > headerRect.bottom + tolerance) {
          cardIssues.push(`Zichtbare maandkaart ${index + 1}: ${name} valt buiten de header.`);
        }
      }

      if (rectsOverlap(imageRect, titleRect)) cardIssues.push(`Zichtbare maandkaart ${index + 1}: maandicoon en titel overlappen.`);
      if (rectsOverlap(titleRect, toolsRect)) cardIssues.push(`Zichtbare maandkaart ${index + 1}: titel en knoppen overlappen.`);
      if (rectsOverlap(imageRect, toolsRect)) cardIssues.push(`Zichtbare maandkaart ${index + 1}: maandicoon en knoppen overlappen.`);
      if (tools.scrollWidth > tools.clientWidth + tolerance) {
        cardIssues.push(`Zichtbare maandkaart ${index + 1}: knoppenrij is breder dan beschikbaar.`);
      }

      return cardIssues;
    });

    function rectsOverlap(left, right) {
      return left.left < right.right - tolerance && left.right > right.left + tolerance && left.top < right.bottom - tolerance && left.bottom > right.top + tolerance;
    }
  });

  if (issues.length > 0) {
    throw new Error(`Visuele headercontrole faalde (${label}):\n${issues.join("\n")}`);
  }
}

async function expectMonthFooterSummaries(page, label) {
  const issues = await page.evaluate(() => {
    const tolerance = 1;
    const visibleCards = Array.from(document.querySelectorAll(".month-card")).filter((card) => {
      if (!(card instanceof HTMLElement)) return false;
      const rect = card.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth;
    });

    return visibleCards.flatMap((card, index) => {
      if (!(card instanceof HTMLElement)) return [];
      const cardRect = card.getBoundingClientRect();
      const footer = card.querySelector(".month-footer");
      if (!(footer instanceof HTMLElement)) return [`Zichtbare maandkaart ${index + 1}: maandtotalen ontbreken.`];

      const footerRect = footer.getBoundingClientRect();
      const stats = Array.from(footer.querySelectorAll(".month-footer-stat"));
      const cardIssues = [];
      if (stats.length !== 2) cardIssues.push(`Zichtbare maandkaart ${index + 1}: maandtotalen hebben geen twee nette blokken.`);
      if (footerRect.left < cardRect.left - tolerance || footerRect.right > cardRect.right + tolerance) {
        cardIssues.push(`Zichtbare maandkaart ${index + 1}: maandtotalen vallen buiten de kaart.`);
      }

      for (const [statIndex, stat] of stats.entries()) {
        if (!(stat instanceof HTMLElement)) continue;
        const labelNode = stat.querySelector("em");
        const valueNode = stat.querySelector("strong");
        if (!(labelNode instanceof HTMLElement) || !(valueNode instanceof HTMLElement)) {
          cardIssues.push(`Zichtbare maandkaart ${index + 1}: totaal ${statIndex + 1} mist label of bedrag.`);
          continue;
        }

        const statRect = stat.getBoundingClientRect();
        const labelRect = labelNode.getBoundingClientRect();
        const valueRect = valueNode.getBoundingClientRect();
        if (statRect.left < footerRect.left - tolerance || statRect.right > footerRect.right + tolerance) {
          cardIssues.push(`Zichtbare maandkaart ${index + 1}: totaal ${statIndex + 1} valt buiten de totalenrij.`);
        }
        if (labelRect.left < statRect.left - tolerance || valueRect.right > statRect.right + tolerance) {
          cardIssues.push(`Zichtbare maandkaart ${index + 1}: totaal ${statIndex + 1} heeft rommelige horizontale uitlijning.`);
        }
        if (valueRect.left < statRect.left || labelRect.right > statRect.right + 1) {
          cardIssues.push(`Zichtbare maandkaart ${index + 1}: totaal ${statIndex + 1} tekst past niet netjes.`);
        }
      }

      return cardIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Maandtotalencontrole faalde (${label}):\n${issues.join("\n")}`);
  }
}

async function expectMonthFootersAligned(page, label) {
  const issue = await page.evaluate(() => {
    const footers = Array.from(document.querySelectorAll(".month-card .month-footer")).filter((footer) => {
      if (!(footer instanceof HTMLElement)) return false;
      const card = footer.closest(".month-card");
      const rect = footer.getBoundingClientRect();
      const cardRect = card instanceof HTMLElement ? card.getBoundingClientRect() : null;
      return cardRect && cardRect.right > 0 && cardRect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
    });

    if (footers.length < 2) return "";
    const tops = footers.map((footer) => footer.getBoundingClientRect().top);
    const bottoms = footers.map((footer) => footer.getBoundingClientRect().bottom);
    const topDelta = Math.max(...tops) - Math.min(...tops);
    const bottomDelta = Math.max(...bottoms) - Math.min(...bottoms);
    if (topDelta > 3 || bottomDelta > 3) {
      return `Maandtotalen staan niet gelijk (${Math.round(topDelta)}px boven, ${Math.round(bottomDelta)}px onder).`;
    }
    return "";
  });

  if (issue) throw new Error(`Maandtotalen-uitlijncontrole faalde (${label}): ${issue}`);
}

async function expectNoMonthNumberLabels(page) {
  const issue = await page.evaluate(() => {
    const offenders = Array.from(document.querySelectorAll(".month-header")).filter((header) => /Maand\s+\d+/i.test(header.textContent ?? ""));
    return offenders.length > 0 ? "Maandnummerlabel staat nog in de kaartheader." : "";
  });

  if (issue) throw new Error(issue);
}

async function expectMonthTabsVisible(page, label) {
  const issue = await page.evaluate(() => {
    const tabs = document.querySelector('[data-testid="month-tabs"]');
    if (!(tabs instanceof HTMLElement)) return "Maandbalk ontbreekt.";

    const rect = tabs.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return "Maandbalk is niet zichtbaar.";
    if (rect.top < -1) return "Maandbalk is boven beeld geschoven.";

    return "";
  });

  if (issue) throw new Error(`Maandbalkcontrole faalde (${label}): ${issue}`);
}

async function expectExcelScrollbarsUsable(page, label) {
  const issue = await page.evaluate(() => {
    const board = document.querySelector(".board");
    const tabs = document.querySelector(".month-tabs");
    const activeCard = document.querySelector(".month-card.active-card");
    if (!(board instanceof HTMLElement)) return "Maandwerkvlak ontbreekt.";
    if (!(tabs instanceof HTMLElement)) return "Maandbalk ontbreekt.";
    if (!(activeCard instanceof HTMLElement)) return "Actieve maandkaart ontbreekt.";

    const boardStyle = getComputedStyle(board);
    if (boardStyle.scrollbarWidth === "none") return "Maandwerkvlak verbergt de horizontale scrollbar.";
    if (board.scrollWidth <= board.clientWidth + 8) return "Maandwerkvlak heeft geen horizontale scrollruimte.";

    const originalScrollLeft = board.scrollLeft;
    board.scrollLeft = 0;
    const left = board.scrollLeft;
    board.scrollLeft = board.scrollWidth;
    const right = board.scrollLeft;
    board.scrollLeft = originalScrollLeft;
    if (right <= left + 40) return "Horizontale scrollbar beweegt niet bruikbaar.";

    const cardRect = activeCard.getBoundingClientRect();
    if (cardRect.width <= 0 || cardRect.height <= 0) return "Actieve maandkaart is niet zichtbaar na scrollbarcontrole.";

    for (const selector of [".month-tabs"]) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return `${selector} ontbreekt.`;
      const style = getComputedStyle(element);
      if (style.scrollbarWidth !== "none") return `${selector} werd onbedoeld een tweede zichtbare horizontale scrollbar.`;
    }

    return "";
  });

    if (issue) throw new Error(`Excel-scrollcontrole faalde (${label}): ${issue}`);
}

async function expectGlobalScrollbarTheme(page, label) {
  const issue = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    if (rootStyle.scrollbarWidth === "none") return "Globale scrollbarstijl is verborgen in plaats van gethematiseerd.";
    if (window.innerWidth >= 760) {
      const bodyOverflow = getComputedStyle(document.body).overflowY;
      if (bodyOverflow !== "hidden") return `Pagina verbergt de globale verticale scrollbar niet op desktop (${bodyOverflow}).`;
    }
    return "";
  });

  if (issue) throw new Error(`Globale-scrollbarcontrole faalde (${label}): ${issue}`);
}

async function expectCompactLedgerRows(page, label) {
  const issue = await page.evaluate(() => {
    const activeCard = document.querySelector(".month-card.active-card");
    if (!(activeCard instanceof HTMLElement)) return "Actieve maandkaart ontbreekt.";

    const rows = Array.from(activeCard.querySelectorAll(".entry-row:not(.edit-row):not(.new-entry-row), .subcategory-row, .section-title")).filter((row) => {
      if (!(row instanceof HTMLElement)) return false;
      const rect = row.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (rows.length < 10) return "Te weinig zichtbare ledger-rijen voor compactheidscontrole.";

    const tallRow = rows.find((row) => row instanceof HTMLElement && row.getBoundingClientRect().height > 34);
    if (tallRow) return `Ledger-rij is te hoog (${Math.round(tallRow.getBoundingClientRect().height)}px).`;

    const ledger = activeCard.querySelector(".month-ledger");
    if (!(ledger instanceof HTMLElement)) return "Maandledger ontbreekt.";
    const ledgerRect = ledger.getBoundingClientRect();
    const visibleRows = rows.filter((row) => {
      const rect = row.getBoundingClientRect();
      return rect.bottom > ledgerRect.top && rect.top < ledgerRect.bottom;
    });
    if (window.innerWidth >= 1200) {
      const expectedRows = window.innerHeight < 850 ? 13 : 18;
      if (visibleRows.length < expectedRows) return `Fullscreen toont te weinig ledger-rijen (${visibleRows.length}, verwacht ${expectedRows}).`;
    }

    return "";
  });

  if (issue) throw new Error(`Compacte-ledgercontrole faalde (${label}): ${issue}`);
}

async function expectAlternatingLedgerTints(page, label) {
  const issue = await page.evaluate(() => {
    const activeCard = document.querySelector(".month-card.active-card");
    if (!(activeCard instanceof HTMLElement)) return "Actieve maandkaart ontbreekt.";

    const sections = Array.from(activeCard.querySelectorAll(".budget-section"));
    for (const section of sections) {
      if (!(section instanceof HTMLElement)) continue;
      const rows = Array.from(section.querySelectorAll(".entry-row:not(.carry-entry):not(.new-entry-row):not(.edit-row)")).filter((row) => {
        if (!(row instanceof HTMLElement)) return false;
        const rect = row.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (rows.length < 2) continue;
      const backgrounds = new Set(rows.slice(0, 6).map((row) => getComputedStyle(row).backgroundColor));
      if (backgrounds.size < 2) return "Boekingsrijen missen subtiele alternerende tinten.";
      return "";
    }
    return "";
  });

  if (issue) throw new Error(`Rijtintcontrole faalde (${label}): ${issue}`);
}

async function expectFullscreenWorkspace(page, label) {
  const issue = await page.evaluate(() => {
    const board = document.querySelector(".board");
    const activeCard = document.querySelector(".month-card.active-card");
    const statusBar = document.querySelector(".status-bar");
    if (!(board instanceof HTMLElement) || !(activeCard instanceof HTMLElement) || !(statusBar instanceof HTMLElement)) {
      return "Fullscreencontrole mist werkvlak, kaart of footer.";
    }

    const boardRect = board.getBoundingClientRect();
    const cardRect = activeCard.getBoundingClientRect();
    const statusRect = statusBar.getBoundingClientRect();
    if (cardRect.height < window.innerHeight * 0.62) return `Actieve maandkaart benut fullscreenhoogte onvoldoende (${Math.round(cardRect.height)}px).`;
    if (boardRect.bottom > statusRect.top + 2) return "Maandwerkvlak loopt onder de vaste footer.";
    if (boardRect.height < window.innerHeight * 0.62) return "Werkvlak is te laag voor fullscreengebruik.";

    return "";
  });

  if (issue) throw new Error(`Fullscreencontrole faalde (${label}): ${issue}`);
}

async function expectMonthLedgerScrollbarsQuiet(page) {
  const issue = await page.evaluate(() => {
    const ledgers = Array.from(document.querySelectorAll(".month-ledger"));
    if (ledgers.length === 0) return "Maandledger ontbreekt.";
    for (const ledger of ledgers) {
      if (!(ledger instanceof HTMLElement)) continue;
      const rect = ledger.getBoundingClientRect();
      if (rect.right <= 0 || rect.left >= window.innerWidth) continue;
      const style = getComputedStyle(ledger);
      if (style.scrollbarWidth !== "thin") return "Maandkaart gebruikt geen subtiele interne scrollbar.";
      if (style.maskImage !== "none" || style.webkitMaskImage !== "none") return "Maandledger maskeert/fadet regels onderaan.";
      const paddingBottom = Number.parseFloat(style.paddingBottom || "0");
      if (paddingBottom < 64) return "Maandledger heeft te weinig onderruimte boven de vaste totalen.";
    }
    return "";
  });

  if (issue) throw new Error(`Maandledger-scrollcontrole faalde: ${issue}`);
}

async function expectLedgerCanScrollClearOfFooter(page, label) {
  const issue = await page.evaluate(() => {
    const ledgers = Array.from(document.querySelectorAll(".month-ledger")).filter((ledger) => {
      if (!(ledger instanceof HTMLElement)) return false;
      const rect = ledger.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth && ledger.scrollHeight > ledger.clientHeight + 8;
    });
    if (ledgers.length === 0) return "";

    for (const ledger of ledgers) {
      if (!(ledger instanceof HTMLElement)) continue;
      const originalScrollTop = ledger.scrollTop;
      ledger.scrollTop = ledger.scrollHeight;
      const ledgerRect = ledger.getBoundingClientRect();
      const rows = Array.from(ledger.querySelectorAll(".entry-row, .subcategory-row")).filter((row) => {
        if (!(row instanceof HTMLElement)) return false;
        const rect = row.getBoundingClientRect();
        return rect.bottom > ledgerRect.top && rect.top < ledgerRect.bottom;
      });
      const lastRow = rows.at(-1);
      const lastRect = lastRow instanceof HTMLElement ? lastRow.getBoundingClientRect() : null;
      ledger.scrollTop = originalScrollTop;
      if (!lastRect) return "Geen laatste zichtbare rij gevonden na scrollen.";
      if (lastRect.bottom > ledgerRect.bottom - 56) {
        return "Laatste ledger-rij kan niet ruim boven de vaste maandtotalen komen.";
      }
    }
    return "";
  });

  if (issue) throw new Error(`Maandledger-eindcontrole faalde (${label}): ${issue}`);
}

async function captureScreenshot(page, filename) {
  await page.screenshot({
    path: `${screenshotDir}/${filename}`,
    fullPage: false,
  });
}

async function capturePageScreenshot(page, filename) {
  await page.screenshot({
    path: `${screenshotDir}/${filename}`,
    fullPage: false,
  });
}

async function expectVisibleText(page, text) {
  const count = await page.getByText(text, { exact: false }).count();
  if (count === 0) throw new Error(`Tekst niet gevonden: ${text}`);
}

async function expectHiddenText(page, text) {
  const count = await page.getByText(text, { exact: false }).count();
  if (count > 0) throw new Error(`Tekst onverwacht gevonden: ${text}`);
}

async function clearStorage(page) {
  await page.evaluate(
    ({ demoKey, productionKey, modeKey }) => {
      localStorage.removeItem(demoKey);
      localStorage.removeItem(productionKey);
      localStorage.removeItem(modeKey);
    },
    { demoKey: demoStorageKey, productionKey: productionStorageKey, modeKey: modeStorageKey },
  );
}

async function isServerReady() {
  try {
    await request(baseUrl);
    return true;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await isServerReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Lokale previewserver startte niet op tijd.");
}

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) resolve();
      else reject(new Error(`Status ${res.statusCode}`));
    });
    req.on("error", reject);
    req.setTimeout(2_000, () => {
      req.destroy(new Error("Timeout"));
    });
  });
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function devCommand() {
  return process.platform === "win32" ? "cmd.exe" : npmCommand();
}

function devArgs() {
  const args = ["run", "dev", "--", "--port", String(port), "--strictPort"];
  return process.platform === "win32" ? ["/c", npmCommand(), ...args] : args;
}

function chromePath() {
  const candidates =
    process.platform === "win32"
      ? [
          `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${process.env["PROGRAMFILES(X86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];

  const match = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!match) throw new Error("Geen lokale Chrome of Edge gevonden voor de rooktest.");
  return match;
}
