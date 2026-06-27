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
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: "networkidle" });
  await expectVisibleText(page, "Jaarbegroting 2026");

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
