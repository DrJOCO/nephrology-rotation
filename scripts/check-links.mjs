import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_FILES = [
  "src/data/constants.ts",
  "src/data/trials.ts",
  "src/data/guides.ts",
];

const URL_PATTERN = /https?:\/\/[^\s"'`<]+/g;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 750;

function normalizeUrl(rawUrl) {
  return rawUrl.replace(/[.;]+$/, "");
}

async function extractUrls(filePath) {
  const content = await fs.readFile(path.join(ROOT, filePath), "utf8");
  const matches = content.match(URL_PATTERN) || [];
  return [...new Set(matches.map(normalizeUrl))];
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldRetry(result) {
  return result.status === "ERR" || (typeof result.status === "number" && result.status >= 500);
}

async function checkUrlOnce(url) {
  try {
    let response;
    try {
      response = await fetchWithTimeout(url, { method: "HEAD" });
    } catch {
      response = await fetchWithTimeout(url, { method: "GET" });
    }
    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(url, { method: "GET" });
    }
    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: "ERR",
      finalUrl: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkUrl(url) {
  let lastResult = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await checkUrlOnce(url);
    lastResult = { ...result, attempts: attempt };
    if (result.ok || !shouldRetry(result) || attempt === MAX_ATTEMPTS) {
      return lastResult;
    }
    await sleep(RETRY_BASE_DELAY_MS * attempt);
  }
  return lastResult;
}

async function main() {
  const urlSet = new Set();
  for (const file of TARGET_FILES) {
    const urls = await extractUrls(file);
    for (const url of urls) urlSet.add(url);
  }

  const urls = [...urlSet].sort();
  console.log(`Checking ${urls.length} URLs from ${TARGET_FILES.length} files...`);

  const results = [];
  for (const url of urls) {
    const result = await checkUrl(url);
    results.push(result);
    const suffix = result.finalUrl && result.finalUrl !== url ? ` -> ${result.finalUrl}` : "";
    const detail = result.error ? ` (${result.error})` : "";
    const attempts = result.attempts && result.attempts > 1 ? ` after ${result.attempts} attempts` : "";
    console.log(`[${result.ok ? "OK" : "FAIL"}] ${result.status} ${url}${suffix}${detail}${attempts}`);
  }

  const failures = results.filter(result => !result.ok);
  console.log(`\nSummary: ${results.length - failures.length}/${results.length} URLs passed.`);

  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) {
      const detail = failure.error ? ` (${failure.error})` : "";
      const attempts = failure.attempts && failure.attempts > 1 ? ` after ${failure.attempts} attempts` : "";
      console.log(`- ${failure.status} ${failure.url}${detail}${attempts}`);
    }
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
