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

async function checkUrl(url) {
  try {
    let response = await fetchWithTimeout(url, { method: "HEAD" });
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
    console.log(`[${result.ok ? "OK" : "FAIL"}] ${result.status} ${url}${suffix}${detail}`);
  }

  const failures = results.filter(result => !result.ok);
  console.log(`\nSummary: ${results.length - failures.length}/${results.length} URLs passed.`);

  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) {
      const detail = failure.error ? ` (${failure.error})` : "";
      console.log(`- ${failure.status} ${failure.url}${detail}`);
    }
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
