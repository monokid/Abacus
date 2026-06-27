import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import http from "node:http";
import { chromium } from "playwright-core";

const port = 5174;
const baseUrl = `http://127.0.0.1:${port}`;
const storageKey = "abacus.fictionalProfile.v1";
const screenshotDir = "test-results/smoke";

let devServer = null;

try {
  await mkdir(screenshotDir, { recursive: true });

  if (!(await isServerReady())) {
    devServer = spawn(npmCommand(), ["run", "dev", "--", "--port", String(port), "--strictPort"], {
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
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: "networkidle" });
  await expectVisibleText(page, "Jaarbegroting 2026");
  await captureScreenshot(page, "01-initial-board.png");
  await expectCompactTopUi(page);
  await expectMonthHeaderLayout(page, "eerste laadbeurt");
  await expectNoMonthNumberLabels(page);
  await expectCategoryInputs(page);
  await focusInactiveMonthInput(page, 2);
  await expectActiveMonthVisible(page, 2);
  await expectFocusedInputInMonth(page, 2);
  await page.keyboard.press("Escape");
  await navigateToMonth(page, 1);
  await expectActiveMonthVisible(page, 1);
  await expectDraftPanelsContained(page, "eerste laadbeurt");
  await tabToIncomeAddButton(page);
  await expectFocusedElementContained(page, "tab naar plusknop");
  await expectDraftPanelsContained(page, "tab naar plusknop");
  await expectScrollbarsHidden(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectMonthTabsVisible(page, "na terug naar bovenzijde");
  await navigateToMonth(page, 9);
  await expectActiveMonthVisible(page, 9);
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
  await expectMonthTabsVisible(page, "na volgende maand op kaart");
  await navigateWithCardButton(page, 10, "Vorige maand", 9);
  await expectActiveMonthVisible(page, 9);
  await fillExpense(page, {
    party: "Testwinkel",
    description: "Test uitgave rooktest",
    amount: "12,34",
  });
  await expectVisibleText(page, "Test uitgave rooktest");
  await expectVisibleText(page, "12,34");

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

  await page.reload({ waitUntil: "networkidle" });
  await expectVisibleText(page, "Test uitgave rooktest");
  await expectVisibleText(page, "Klik weg rooktest");
  await expectDraftPanelsContained(page, "na verversen");

  if (runtimeErrors.length > 0) {
    throw new Error(`Browserfouten:\n${runtimeErrors.join("\n")}`);
  }

  await browser.close();
  console.log("Input smoke test passed.");
} finally {
  if (devServer) devServer.kill();
}

async function fillExpense(page, { party, description, amount }) {
  const draft = page.locator('[data-testid="draft-9-vaste_kosten-sub-vast-wonen"]');
  await draft.locator('input[aria-label^="Partij"]').fill(party);
  await draft.locator('input[aria-label^="Omschrijving"]').fill(description);
  const amountInput = draft.locator('input[aria-label^="Bedrag"]');
  await amountInput.fill(amount);
  await amountInput.press("Enter");
}

async function focusInactiveMonthInput(page, monthNumber) {
  const input = page.locator(`[data-testid="draft-${monthNumber}-inkomsten-sub-ink-pensioen"] input[aria-label^="Omschrijving"]`);
  await input.click();
  await input.fill("Klad invoer");
}

async function expectFocusedInputInMonth(page, monthNumber) {
  const issue = await page.evaluate((targetMonthNumber) => {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLInputElement)) return "Actieve focus staat niet in een invoerveld.";

    const card = activeElement.closest(".month-card");
    if (!(card instanceof HTMLElement)) return "Invoerveld staat niet in een maandkaart.";
    if (card.dataset.monthCard !== String(targetMonthNumber)) return "Invoerveld staat niet in de verwachte maandkaart.";

    return "";
  }, monthNumber);

  if (issue) throw new Error(`Invoerfocuscontrole faalde voor maand ${monthNumber}: ${issue}`);
}

async function clearInvalidExpenseDraft(page) {
  const draft = page.locator('[data-testid="draft-9-vaste_kosten-sub-vast-wonen"]');
  await draft.locator('input[aria-label^="Bedrag"]').press("Escape");
}

async function fillVariableAndCommitOnBlur(page) {
  const draft = page.locator('[data-testid="draft-9-variabele_kosten-sub-var-gezondheid"]');
  await draft.locator('input[aria-label^="Partij"]').fill("Apotheek");
  await draft.locator('input[aria-label^="Omschrijving"]').fill("Klik weg rooktest");
  await draft.locator('input[aria-label^="Bedrag"]').fill("7,89");
  await page.locator("h1").click();
}

async function fillIncomeAndCancel(page) {
  const draft = page.locator('[data-testid="draft-9-inkomsten-sub-ink-pensioen"]');
  await draft.locator('input[aria-label^="Omschrijving"]').fill("Wordt geannuleerd");
  await draft.locator('input[aria-label^="Omschrijving"]').press("Escape");
}

async function tabToIncomeAddButton(page) {
  const draft = page.locator('[data-testid="draft-1-inkomsten-sub-ink-pensioen"]');
  await draft.locator('input[aria-label^="Bedrag"]').focus();
  await page.keyboard.press("Tab");
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
        panelIssues.push(`Paneel ${index + 1}: inhoud is breder dan het paneel.`);
      }
      if (panelRect.left < cardRect.left - tolerance || panelRect.right > cardRect.right + tolerance) {
        panelIssues.push(`Paneel ${index + 1}: paneel valt buiten de maandkaart.`);
      }

      for (const child of Array.from(panel.children)) {
        const childRect = child.getBoundingClientRect();
        if (childRect.left < panelRect.left - tolerance || childRect.right > panelRect.right + tolerance) {
          panelIssues.push(`Paneel ${index + 1}: veld valt buiten het paneel.`);
        }
      }

      return panelIssues;
    });
  });

  if (issues.length > 0) {
    throw new Error(`Visuele invoercontrole faalde (${label}):\n${issues.join("\n")}`);
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
    if (style.transform === "none") return "Actieve maandkaart heeft geen subtiele lift.";
    if (Number(style.zIndex || "0") < 1) return "Actieve maandkaart ligt niet zichtbaar boven buurkaarten.";

    return "";
  }, monthNumber);

  if (issue) throw new Error(`Actieve-kaartcontrole faalde voor maand ${monthNumber}: ${issue}`);
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
    if (panels.length === 0) return "Geen categorie-invoerpanelen gevonden.";
    if (panels.some((panel) => panel.querySelector("select"))) return "Een invoerrij bevat nog een categorie-dropdown.";

    for (const panel of panels) {
      const heading = panel.previousElementSibling;
      if (!heading?.classList.contains("subcategory-row")) return "Een invoerrij staat niet direct onder een categorietitel.";
    }

    const categoryRows = Array.from(document.querySelectorAll(".subcategory-row"));
    if (categoryRows.length === 0) return "Geen categorietitelrijen gevonden.";
    if (categoryRows.some((row) => !/€\s?[\d.,-]+/.test(row.textContent ?? ""))) return "Een categorietitel mist een subtotaal.";

    return "";
  });

  if (issue) throw new Error(`Categorie-invoercontrole faalde: ${issue}`);
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
      const cardIssues = [];

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

async function expectScrollbarsHidden(page) {
  const issue = await page.evaluate(() => {
    for (const selector of [".month-tabs", ".board"]) {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return `${selector} ontbreekt.`;
      const style = getComputedStyle(element);
      if (style.scrollbarWidth !== "none") return `${selector} toont mogelijk een horizontale scrollbalk.`;
    }

    return "";
  });

  if (issue) throw new Error(`Scrollbalkcontrole faalde: ${issue}`);
}

async function captureScreenshot(page, filename) {
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
