import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright-core";

const port = 5174;
const baseUrl = `http://127.0.0.1:${port}`;
const storageKey = "abacus.fictionalProfile.v1";

let devServer = null;

try {
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
  await expectDraftPanelsContained(page, "eerste laadbeurt");
  await tabToIncomeAddButton(page);
  await expectFocusedElementContained(page, "tab naar plusknop");
  await expectDraftPanelsContained(page, "tab naar plusknop");
  await expectScrollbarsHidden(page);
  await navigateToMonth(page, 9);
  await expectActiveMonthVisible(page, 9);
  await expectMonthTabsVisible(page, "na klik op maandknop");
  await navigateWithCardButton(page, 9, "Volgende maand", 10);
  await expectActiveMonthVisible(page, 10);
  await expectMonthTabsVisible(page, "na volgende maand op kaart");
  await navigateWithCardButton(page, 10, "Vorige maand", 9);
  await expectActiveMonthVisible(page, 9);
  await navigateToMonth(page, 1);
  await expectActiveMonthVisible(page, 1);
  await expectMonthTabsVisible(page, "terug naar januari");

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
  const draft = page.locator('[data-testid="draft-1-vaste_kosten"]');
  await draft.locator('input[aria-label^="Partij"]').fill(party);
  await draft.locator('input[aria-label^="Omschrijving"]').fill(description);
  const amountInput = draft.locator('input[aria-label^="Bedrag"]');
  await amountInput.fill(amount);
  await amountInput.press("Enter");
}

async function clearInvalidExpenseDraft(page) {
  const draft = page.locator('[data-testid="draft-1-vaste_kosten"]');
  await draft.locator('input[aria-label^="Bedrag"]').press("Escape");
}

async function fillVariableAndCommitOnBlur(page) {
  const draft = page.locator('[data-testid="draft-1-variabele_kosten"]');
  await draft.locator('input[aria-label^="Partij"]').fill("Apotheek");
  await draft.locator('input[aria-label^="Omschrijving"]').fill("Klik weg rooktest");
  await draft.locator('input[aria-label^="Bedrag"]').fill("7,89");
  await page.locator("h1").click();
}

async function fillIncomeAndCancel(page) {
  const draft = page.locator('[data-testid="draft-1-inkomsten"]');
  await draft.locator('input[aria-label^="Omschrijving"]').fill("Wordt geannuleerd");
  await draft.locator('input[aria-label^="Omschrijving"]').press("Escape");
}

async function tabToIncomeAddButton(page) {
  const draft = page.locator('[data-testid="draft-1-inkomsten"]');
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
  const previousScrollLeft = await page.locator(".board").evaluate((board) => board.scrollLeft);
  await page.locator(`[data-month-tab="${monthNumber}"]`).click();
  await page.waitForFunction(
    ({ monthNumber: targetMonthNumber, previousScrollLeft: scrollLeftBefore }) => {
      const board = document.querySelector(".board");
      const activeCard = document.querySelector(`[data-month-card="${targetMonthNumber}"]`);
      if (!(board instanceof HTMLElement) || !(activeCard instanceof HTMLElement)) return false;

      const cardRect = activeCard.getBoundingClientRect();
      const active = activeCard.classList.contains("active-card");
      const visible = cardRect.left >= -1 && cardRect.right <= window.innerWidth + 1;
      const moved = targetMonthNumber === 1 ? board.scrollLeft < scrollLeftBefore : board.scrollLeft > scrollLeftBefore;
      return active && visible && moved;
    },
    { monthNumber, previousScrollLeft },
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

async function expectActiveMonthVisible(page, monthNumber) {
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
