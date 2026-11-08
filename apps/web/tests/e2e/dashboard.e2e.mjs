// End-to-end checks against a running build of the web app and live devnet.
//   E2E_BASE_URL   server under test (default http://localhost:3123)
//   KENMARK_RPC_URL devnet RPC for the independent on-chain reads
//   E2E_SHOTS      directory to write screenshots into (optional)
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getBase58Decoder, getBase58Encoder } from "@solana/kit";
import { Browser, sleep } from "./cdp.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3123";
const RPC = process.env.KENMARK_RPC_URL ?? "https://api.devnet.solana.com";
const SHOTS = process.env.E2E_SHOTS;
const SAS_PROGRAM = "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const synthetic = JSON.parse(
  readFileSync(join(root, "validation/devnet-attestations.json"), "utf8"),
);
const realWorld = JSON.parse(
  readFileSync(join(root, "validation/real-world-attestations.json"), "utf8"),
);
const reportsDir = join(root, "validation/test-results");

const base58 = { encode: getBase58Encoder(), decode: getBase58Decoder() };
const hexToBase58 = (hex) => base58.decode.decode(Uint8Array.from(Buffer.from(hex, "hex")));
const base58ToHex = (addr) => Buffer.from(base58.encode.encode(addr)).toString("hex");

// ---------- expected values, derived independently of the app's own code ----------
const syntheticByAddress = new Map();
for (const row of synthetic) syntheticByAddress.set(row.attestationAddress, row);
const expected = {
  records: [
    ...[...syntheticByAddress.values()].map((r) => ({
      attestation: r.attestationAddress,
      programBase58: hexToBase58(r.programId),
      programHex: r.programId,
      status: r.fields.verificationStatus,
      binaryHash: r.fields.binaryHash,
      test: r.test,
      credential: r.credential,
    })),
    ...realWorld.map((r) => ({
      attestation: r.attestationAddress,
      programBase58: r.programId,
      programHex: base58ToHex(r.programId),
      status: r.derivedStatus,
      binaryHash: r.osecSnapshot.on_chain_hash,
      test: "registry-cross-check",
      credential: null,
    })),
  ],
};
expected.total = expected.records.length;
expected.programs = new Set(expected.records.map((r) => r.programHex)).size;
expected.verified = expected.records.filter((r) => r.status === "Verified").length;
expected.mismatch = expected.records.filter((r) => r.status === "Mismatch").length;
expected.credentials = [...new Set(synthetic.map((r) => r.credential))];
expected.tests = new Set(expected.records.map((r) => r.test)).size;
expected.named = new Set(
  expected.records
    .filter(
      (r) =>
        realWorld.some((w) => w.programId === r.programBase58) ||
        r.programBase58 === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    )
    .map((r) => r.programHex),
).size;

let checksPassed = 0;
let checksTotal = 0;
for (const file of readdirSync(reportsDir).filter((f) => f.endsWith(".md"))) {
  const md = readFileSync(join(reportsDir, file), "utf8");
  const headline = md.match(/\*\*Result:\s*(PASS|FAIL)\*\*/);
  if (headline) {
    checksTotal++;
    if (headline[1] === "PASS") checksPassed++;
  }
  for (const m of md.matchAll(/\*\*Round-trip result:\*\*\s*(PASS|FAIL)/g)) {
    checksTotal++;
    if (m[1] === "PASS") checksPassed++;
  }
}
expected.checks = `${checksPassed}/${checksTotal}`;
expected.checksPct = `${Math.round((checksPassed / checksTotal) * 100)}%`;

// The public endpoint throttles getProgramAccounts; back off on 429 rather than fail the run.
async function rpc(method, params, attempt = 0) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) {
    if (json.error.code === 429 && attempt < 5) {
      await sleep(2000 * (attempt + 1));
      return rpc(method, params, attempt + 1);
    }
    throw new Error(JSON.stringify(json.error));
  }
  return json.result;
}

async function liveCounts() {
  const discriminator = base58.decode.decode(new Uint8Array([2]));
  const counts = {};
  for (const credential of expected.credentials) {
    const accounts = await rpc("getProgramAccounts", [
      SAS_PROGRAM,
      {
        encoding: "base64",
        commitment: "confirmed",
        dataSlice: { offset: 0, length: 0 },
        filters: [
          { memcmp: { offset: 0, bytes: discriminator } },
          { memcmp: { offset: 33, bytes: credential } },
        ],
      },
    ]);
    counts[credential] = accounts.length;
    await sleep(1500);
  }
  return counts;
}

// ---------- harness ----------
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail && !ok ? ` — ${detail}` : ""}`);
}
async function step(name, fn) {
  try {
    await fn();
  } catch (err) {
    check(name, false, err instanceof Error ? err.message : String(err));
  }
}
async function shot(page, name) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot(join(SHOTS, `${name}.png`));
}

// ---------- API ----------
await step("api", async () => {
  const exportRes = await fetch(`${BASE}/api/export`);
  check(
    "export responds with a JSON attachment",
    exportRes.ok && /attachment/.test(exportRes.headers.get("content-disposition") ?? ""),
  );
  const exported = await exportRes.json();
  check(
    `export has ${expected.total} records`,
    exported.records?.length === expected.total,
    `got ${exported.records?.length}`,
  );
  const exportedSet = new Set(exported.records.map((r) => r.attestation));
  check(
    "export covers every artifact attestation",
    expected.records.every((r) => exportedSet.has(r.attestation)),
  );

  const accounts = await rpc("getMultipleAccounts", [
    expected.records.map((r) => r.attestation),
    { encoding: "base64", commitment: "confirmed" },
  ]);
  const missing = expected.records.filter((_, i) => !accounts.value[i]);
  check(
    "every exported attestation exists on devnet",
    missing.length === 0,
    `missing ${missing.map((m) => m.attestation).join(",")}`,
  );

  const bad = await fetch(`${BASE}/api/lookup?program=not-an-address`);
  check("lookup rejects an invalid address with 400", bad.status === 400);
  const none = await fetch(`${BASE}/api/lookup?program=11111111111111111111111111111111`);
  const noneJson = await none.json();
  check(
    "lookup returns an empty list for a program without attestations",
    none.ok && noneJson.decoded?.length === 0,
  );

  const programs = [...new Set(expected.records.map((r) => r.programBase58))];
  let found = 0;
  for (const program of programs) {
    const res = await fetch(`${BASE}/api/lookup?program=${program}`);
    const json = await res.json();
    const ours = expected.records.filter((r) => r.programBase58 === program);
    const decodedSet = new Set((json.decoded ?? []).map((d) => d.attestation));
    const hit = ours.every((r) => decodedSet.has(r.attestation));
    if (hit) found++;
    else
      check(
        `lookup finds artifact attestations for ${program}`,
        false,
        json.error ?? `decoded ${[...decodedSet].join(",")}`,
      );
    await sleep(1200);
  }
  check(
    `lookup finds the artifact attestations for all ${programs.length} programs`,
    found === programs.length,
    `${found}/${programs.length}`,
  );

  const notFound = await fetch(`${BASE}/dashboard/nope`);
  check("unknown dashboard route is a 404", notFound.status === 404);
});

const live = await liveCounts();
const liveTotal = Object.values(live).reduce((a, b) => a + b, 0);

// ---------- browser ----------
const browser = await Browser.launch();
console.log(`browser: ${browser.name}`);
const page = await browser.newPage({ width: 1800, height: 1200 });
const phoenix = realWorld.find((r) => r.subject === "Phoenix").programId;

await step("overview", async () => {
  await page.goto(`${BASE}/dashboard`);
  await page.waitFor(`document.querySelector('[data-testid="kpi-attestations"]') !== null`);
  const attr = (sel, a) =>
    page.eval(`document.querySelector(${JSON.stringify(sel)})?.getAttribute(${JSON.stringify(a)})`);
  check(
    "overview: attestation KPI matches the artifact",
    (await attr('[data-testid="kpi-attestations"]', "data-value")) === String(expected.total),
  );
  check(
    "overview: program KPI matches the artifact",
    (await attr('[data-testid="kpi-programs"]', "data-value")) === String(expected.programs),
  );
  check(
    `overview: checks KPI is ${expected.checksPct} (${expected.checks})`,
    (await attr('[data-testid="kpi-checks"]', "data-value")) === expected.checksPct &&
      (await attr('[data-testid="kpi-checks"]', "data-delta")) === expected.checks,
  );
  check(
    "overview: verified KPI matches the artifact",
    (await attr('[data-testid="kpi-verified"]', "data-value")) === String(expected.verified),
  );
  const onDevnet = await attr('[data-testid="kpi-ondevnet"]', "data-value");
  check(
    `overview: live on-devnet KPI matches an independent RPC count (${liveTotal})`,
    onDevnet === String(liveTotal),
    `page shows ${onDevnet}`,
  );

  const shares = await page.eval(
    `[...document.querySelectorAll('[data-testid="share-item"]')].map((e) => [e.dataset.label, Number(e.dataset.pct)])`,
  );
  const verifiedPct = Math.round((expected.verified / expected.total) * 100);
  check(
    "overview: verified share matches",
    shares.find(([l]) => l === "Verified")?.[1] === verifiedPct,
    JSON.stringify(shares),
  );

  check(
    `overview: one pin per program (${expected.programs})`,
    (await page.count('[data-testid="program-pin"]')) === expected.programs,
  );
  check(
    `overview: callouts for the ${expected.named} named programs`,
    (await page.count('[data-testid="pin-callout"]')) === expected.named,
  );
  const overlap = await page.eval(`(() => {
    const card = document.querySelector('[data-testid="status-card"]').getBoundingClientRect();
    const form = document.querySelector('[data-testid="program-field"] p').getBoundingClientRect();
    const pins = [...document.querySelectorAll('[data-testid="program-pin"]')].map((p) => p.getBoundingClientRect());
    const hits = (r) => (r.right > card.left && r.left < card.right && r.bottom > card.top && r.top < card.bottom) || r.top < form.bottom + 36;
    return pins.filter(hits).length;
  })()`);
  check(
    "overview: no pin sits under the status card or the search row",
    overlap === 0,
    `${overlap} overlapping`,
  );

  check(
    `overview: source table lists ${expected.tests} sources`,
    (await page.count('[data-testid="source-row"]')) === expected.tests,
  );
  await page.clickText("Synthetic", '[role="group"][aria-label="Filter sources"]');
  check(
    "overview: synthetic filter hides the registry row",
    (await page.count('[data-testid="source-row"]')) === expected.tests - 1,
  );
  await page.clickText("Real-world", '[role="group"][aria-label="Filter sources"]');
  check(
    "overview: real-world filter leaves one row",
    (await page.count('[data-testid="source-row"]')) === 1,
  );
  await page.clickText("All", '[role="group"][aria-label="Filter sources"]');
  await page.clickText("Source", "table");
  const labels = await page.eval(
    `[...document.querySelectorAll('[data-testid="source-row"]')].map((r) => r.dataset.label)`,
  );
  const sorted = [...labels].sort((a, b) => a.localeCompare(b));
  check(
    "overview: sorting by source orders rows alphabetically",
    JSON.stringify(labels) === JSON.stringify(sorted),
    labels.join(" | "),
  );
  check(
    "overview: chart draws one bar per source",
    (await page.eval(`document.querySelector('[data-testid="combo-chart"]')?.dataset.bars`)) ===
      String(expected.tests),
  );
  await page.clickText("Real-world", '[role="group"][aria-label="Filter tests"]');
  check(
    "overview: chart filter narrows to the registry group",
    (await page.eval(`document.querySelector('[data-testid="combo-chart"]')?.dataset.bars`)) ===
      "1",
  );
  await shot(page, "e2e-overview-light");

  await page.click('button[aria-label="Dark theme"]');
  check(
    "theme: toggle switches the panel to dark",
    (await page.eval(`document.querySelector('.db')?.dataset.theme`)) === "dark",
  );
  await page.goto(`${BASE}/dashboard`);
  await page.waitFor(`document.querySelector('[data-testid="kpi-attestations"]') !== null`);
  await sleep(300);
  check(
    "theme: dark choice survives a reload",
    (await page.eval(`document.querySelector('.db')?.dataset.theme`)) === "dark",
  );
  await shot(page, "e2e-overview-dark");
  await page.click('button[aria-label="Light theme"]');

  check(
    "toolbar: export links to the JSON download",
    (await page.eval(`document.querySelector('a[href="/api/export"][download]') !== null`)) ===
      true,
  );
  await page.clickText("Refresh");
  await sleep(1500);
  check(
    "toolbar: refresh re-renders without errors",
    (await page.count('[data-testid="kpi-attestations"]')) === 1 && page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );

  await page.type("#field-program", phoenix);
  await page.click('[data-testid="verify-bar"] button[type="submit"]');
  await page.waitFor(`location.pathname === "/dashboard/verify"`);
  await page.waitFor(`document.querySelector('[data-testid="lookup-summary"]') !== null`, {
    timeout: 30000,
  });
  const api = await (await fetch(`${BASE}/api/lookup?program=${phoenix}`)).json();
  const decodedOnPage = await page.count('[data-testid="decoded-attestation"]');
  check(
    `lookup: field search lands on lookup with ${api.decoded.length} decoded attestations`,
    decodedOnPage === api.decoded.length,
    `page ${decodedOnPage}`,
  );
  check(
    "overview: no console errors",
    page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );
});

await step("lookup", async () => {
  page.consoleErrors.length = 0;
  await page.goto(`${BASE}/dashboard/verify`);
  await page.clickText("Kamino");
  await page.waitFor(`document.querySelector('[data-testid="lookup-summary"]') !== null`, {
    timeout: 30000,
  });
  const statuses = await page.eval(
    `[...document.querySelectorAll('[data-testid="decoded-attestation"]')].map((e) => e.dataset.status)`,
  );
  check(
    "lookup: Kamino preset returns an Unknown-status attestation",
    statuses.includes("Unknown"),
    statuses.join(","),
  );
  check(
    "lookup: preset updates the URL",
    (await page.eval(`location.search`)).includes("KaminoLend"),
  );
  await shot(page, "e2e-lookup");

  await page.type("#lookup-program", "definitely-not-base58");
  await page.click('form button[type="submit"]');
  await page.waitFor(`document.querySelector('[role="alert"]') !== null`, { timeout: 15000 });
  check(
    "lookup: invalid input shows the validation error",
    /not a valid/.test(await page.text('[role="alert"]')),
  );

  await page.type("#lookup-program", "11111111111111111111111111111111");
  await page.click('form button[type="submit"]');
  await page.waitFor(`document.querySelector('[data-testid="lookup-empty"]') !== null`, {
    timeout: 30000,
  });
  check("lookup: a program without attestations shows the empty state", true);
  check(
    "lookup: no console errors",
    page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );
});

await step("attestations", async () => {
  page.consoleErrors.length = 0;
  await page.goto(`${BASE}/dashboard/attestations`);
  await page.waitFor(`document.querySelectorAll('[data-testid="attestation-row"]').length > 0`);
  check(
    `attestations: all ${expected.total} rows render`,
    (await page.count('[data-testid="attestation-row"]')) === expected.total,
  );
  await page.type('input[placeholder^="Search"]', "Phoenix");
  check(
    "attestations: search narrows to Phoenix",
    (await page.count('[data-testid="attestation-row"]')) === 1,
  );
  await page.type('input[placeholder^="Search"]', "");
  await page.clickText("Mismatch", '[role="group"][aria-label="Filter by status"]');
  const mismatchRows = await page.eval(
    `[...document.querySelectorAll('[data-testid="attestation-row"]')].map((r) => r.dataset.status)`,
  );
  check(
    `attestations: mismatch filter shows ${expected.mismatch} rows, all Mismatch`,
    mismatchRows.length === expected.mismatch && mismatchRows.every((s) => s === "Mismatch"),
    mismatchRows.join(","),
  );
  await page.clickText("All", '[role="group"][aria-label="Filter by status"]');
  await page.eval(
    `(() => { const s = document.querySelector("select"); s.value = "test3-memcmp"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`,
  );
  await sleep(150);
  const memcmpExpected = expected.records.filter((r) => r.test === "test3-memcmp").length;
  check(
    `attestations: test filter shows the ${memcmpExpected} memcmp rows`,
    (await page.count('[data-testid="attestation-row"]')) === memcmpExpected,
  );
  await page.click('[data-testid="attestation-row"] button[aria-expanded]');
  const detail = await page.text('[data-testid="attestation-detail"]');
  const firstAddress = await page.eval(
    `document.querySelector('[data-testid="attestation-row"]').dataset.attestation`,
  );
  const record = expected.records.find((r) => r.attestation === firstAddress);
  check(
    "attestations: expanded row shows the record's binary hash",
    detail?.includes(record.binaryHash),
    detail?.slice(0, 120),
  );
  await page.eval(
    `(() => { const s = document.querySelector("select"); s.value = "all"; s.dispatchEvent(new Event("change", { bubbles: true })); })()`,
  );
  await page.clickText("Verified at", "table");
  const ts = await page.eval(
    `[...document.querySelectorAll('[data-testid="attestation-row"]')].map((r) => Number(r.dataset.ts))`,
  );
  const ascending = ts.every((v, i) => i === 0 || v >= ts[i - 1]);
  check("attestations: sorting by verification time orders rows", ascending, ts.join(","));
  await shot(page, "e2e-attestations");

  await page.goto(`${BASE}/dashboard/attestations?test=test6-schema-version`);
  await page.waitFor(`document.querySelectorAll('[data-testid="attestation-row"]').length > 0`);
  check(
    "attestations: ?test= preselects the test filter",
    (await page.count('[data-testid="attestation-row"]')) ===
      expected.records.filter((r) => r.test === "test6-schema-version").length,
  );
  await page.goto(`${BASE}/dashboard/attestations?status=Verified`);
  await page.waitFor(`document.querySelectorAll('[data-testid="attestation-row"]').length > 0`);
  check(
    "attestations: ?status= preselects the status filter",
    (await page.count('[data-testid="attestation-row"]')) === expected.verified,
  );
  check(
    "attestations: no console errors",
    page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );
});

await step("issuers", async () => {
  page.consoleErrors.length = 0;
  await page.goto(`${BASE}/dashboard/issuers`);
  await page.waitFor(`document.querySelectorAll('[data-testid="issuer-card"]').length > 0`);
  check(
    `issuers: ${expected.credentials.length} issuer cards`,
    (await page.count('[data-testid="issuer-card"]')) === expected.credentials.length,
  );
  const cards = await page.eval(
    `[...document.querySelectorAll('[data-testid="issuer-card"]')].map((c) => ({ credential: c.dataset.credential, name: c.querySelector("h2").textContent.trim(), live: c.querySelector('[data-testid="issuer-live"]').dataset.value, authority: c.dataset.authority }))`,
  );
  for (const card of cards) {
    check(
      `issuers: ${card.credential.slice(0, 8)}… shows its on-chain name`,
      /^kenmark-v1-issuer-\d$/.test(card.name),
      card.name,
    );
    check(
      `issuers: ${card.credential.slice(0, 8)}… live count matches RPC (${live[card.credential]})`,
      card.live === String(live[card.credential]),
      `page ${card.live}`,
    );
  }
  const first = cards[0];
  await page.clickText(first.name, '[data-testid="issuer-lookup"]');
  await page.waitFor(`document.querySelector('[data-testid="credential-summary"]') !== null`, {
    timeout: 40000,
  });
  const summary = await page.eval(
    `(() => { const e = document.querySelector('[data-testid="credential-summary"]'); return { decoded: Number(e.dataset.decoded), excluded: Number(e.dataset.excluded) }; })()`,
  );
  check(
    `issuers: credential lookup scans every attestation under ${first.credential.slice(0, 8)}… (${live[first.credential]})`,
    summary.decoded + summary.excluded === live[first.credential],
    JSON.stringify(summary),
  );
  check(
    "issuers: credential lookup renders the on-chain name",
    (await page.text('[data-testid="credential-card"]'))?.includes(first.name),
  );
  await page.clickText("Authority", '[role="group"][aria-label="Lookup type"]');
  await page.type("#issuer-address", first.authority);
  await page.click('[data-testid="issuer-lookup"] form button[type="submit"]');
  await page.waitFor(`document.querySelector('[data-testid="authority-summary"]') !== null`, {
    timeout: 40000,
  });
  const creds = await page.eval(
    `[...document.querySelectorAll('[data-testid="credential-card"]')].map((e) => e.dataset.credential)`,
  );
  check(
    "issuers: authority lookup lists the wallet's credential",
    creds.includes(first.credential),
    creds.join(","),
  );
  await page.type("#issuer-address", "not-an-address");
  await page.click('[data-testid="issuer-lookup"] form button[type="submit"]');
  await page.waitFor(`document.querySelector('[role="alert"]') !== null`, { timeout: 15000 });
  check(
    "issuers: invalid address shows the validation error",
    /not a valid/.test(await page.text('[role="alert"]')),
  );
  await shot(page, "e2e-issuers");
  check(
    "issuers: no console errors",
    page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );
});

await step("validation", async () => {
  page.consoleErrors.length = 0;
  await page.goto(`${BASE}/dashboard/validation`);
  await page.waitFor(`document.querySelectorAll('[data-testid="validation-program"]').length > 0`);
  const widgets = await page.eval(
    `[...document.querySelectorAll('[data-testid="validation-program"]')].map((e) => ({ program: e.dataset.program, status: e.dataset.status, pass: e.dataset.pass, live: e.dataset.live }))`,
  );
  const realPrograms = [
    ...new Set(
      expected.records
        .filter(
          (r) =>
            realWorld.some((w) => w.programId === r.programBase58) ||
            r.programBase58 === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        )
        .map((r) => r.programBase58),
    ),
  ];
  check(
    `validation: one widget per real program (${realPrograms.length})`,
    widgets.length === realPrograms.length &&
      realPrograms.every((p) => widgets.some((w) => w.program === p)),
    JSON.stringify(widgets),
  );
  check(
    "validation: statuses span Verified, Mismatch, and Unknown",
    ["Verified", "Mismatch", "Unknown"].every((st) => widgets.some((w) => w.status === st)),
  );
  check(
    "validation: every widget records a passing round-trip",
    widgets.every((w) => w.pass === "PASS"),
    widgets.map((w) => w.pass).join(","),
  );
  check(
    "validation: every widget matches devnet at request time",
    widgets.every((w) => w.live === "match"),
    widgets.map((w) => w.live).join(","),
  );
  check(
    `validation: checks KPI reads ${expected.checks}`,
    (await page.eval(`document.querySelector('[data-testid="kpi-checks"]')?.dataset.value`)) ===
      expected.checks,
  );
  check(
    "validation: widgets link to the live verify",
    (await page.count(
      '[data-testid="validation-program"] a[href^="/dashboard/verify?program="]',
    )) === widgets.length,
  );
  check(
    "validation: schema and reproduce widgets render",
    (await page.count('[data-testid="schema-widget"]')) === 1 &&
      (await page.count('[data-testid="reproduce-widget"]')) === 1,
  );
  await shot(page, "e2e-validation");
  check(
    "validation: no console errors",
    page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );
});

await step("explorer", async () => {
  page.consoleErrors.length = 0;
  await page.goto(`${BASE}/dashboard/explorer`);
  await page.waitFor(`document.querySelector('[data-testid="explorer"]') !== null`);
  for (const label of ["Timeline", "Flow", "Status mix", "By program"]) {
    await page.clickText(label, '[role="group"][aria-label="Explorer view"]');
    await page.waitFor(
      `document.querySelector('[data-testid="explorer-chart"] svg.recharts-surface') !== null`,
      { timeout: 10000 },
    );
    check(
      `explorer: ${label} view draws a chart`,
      (await page.count('[data-testid="explorer-chart"] svg.recharts-surface')) > 0,
    );
  }
  await page.clickText("Transactions", '[role="group"][aria-label="Explorer view"]');
  const rows = await page.count('[data-testid="tx-row"]');
  const unavailable = await page.count('[data-testid="tx-unavailable"]');
  check(
    "explorer: transactions view lists devnet signatures",
    rows > 0 || unavailable === 1,
    `rows ${rows}`,
  );
  if (rows > 0) {
    const sig = await page.eval(
      `document.querySelector('[data-testid="tx-row"] a[href*="explorer.solana.com/tx/"]')?.getAttribute("href")`,
    );
    check(
      "explorer: signatures link to Solana Explorer on devnet",
      typeof sig === "string" && sig.includes("cluster=devnet"),
    );
  }
  await shot(page, "e2e-explorer");
  check(
    "explorer: no console errors",
    page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );
});

await step("landing and docs", async () => {
  page.consoleErrors.length = 0;
  await page.goto(`${BASE}/`);
  check("landing: particle sphere canvas renders", (await page.count("canvas")) === 1);
  for (const [w, h] of [
    [1440, 640],
    [1024, 600],
    [390, 844],
  ]) {
    await page.setViewport(w, h);
    await sleep(200);
    const gap = await page.eval(`(() => {
      const h1 = document.querySelector("h1").getBoundingClientRect();
      const p = document.querySelector("section p").getBoundingClientRect();
      return p.top - h1.bottom;
    })()`);
    check(`landing: headline and intro never overlap at ${w}x${h}`, gap >= 0, `gap ${gap}px`);
  }
  await page.setViewport(1800, 1200);
  await page.goto(`${BASE}/`);
  check(
    "landing: primary nav links to the dashboard",
    (await page.eval(
      `document.querySelector('nav[aria-label="Primary"] a[href="/dashboard"]') !== null`,
    )) === true,
  );
  check(
    "landing: issuer section links to the credential lookup",
    (await page.eval(
      `document.querySelector('a[href="/dashboard/verify?mode=credential"]') !== null`,
    )) === true,
  );
  check(
    "landing: hero call to action opens the dashboard",
    (await page.eval(
      `[...document.querySelectorAll('section a[href="/dashboard"]')].some((a) => a.textContent.trim() === "Open the dashboard")`,
    )) === true,
  );
  check(
    "landing: no console errors",
    page.consoleErrors.length === 0,
    page.consoleErrors.join(" | "),
  );
  await page.goto(`${BASE}/docs`);
  check(
    "docs: sidebar links to the dashboard",
    (await page.eval(`document.querySelector('aside a[href="/dashboard"]') !== null`)) === true,
  );
});

await step("mobile", async () => {
  await page.setViewport(390, 844);
  for (const path of [
    "/",
    "/dashboard",
    "/dashboard/attestations",
    "/dashboard/verify",
    "/dashboard/issuers",
  ]) {
    await page.goto(`${BASE}${path}`);
    await sleep(300);
    const width = await page.eval("document.documentElement.scrollWidth");
    check(`mobile: ${path} has no horizontal overflow`, width <= 390, `scrollWidth ${width}`);
  }
  await page.goto(`${BASE}/dashboard`);
  await shot(page, "e2e-mobile-dashboard");
});

await page.close();
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("failed:");
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
  process.exit(1);
}
