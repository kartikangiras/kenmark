// Minimal Chrome DevTools Protocol client on Node's built-in WebSocket.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.BROWSER_BIN,
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/brave-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Connection {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error)
          reject(new Error(`${message.error.message} ${message.error.data ?? ""}`));
        else resolve(message.result);
      } else if (message.method) {
        for (const listener of this.listeners) listener(message);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  close() {
    this.ws.close();
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onopen = () => resolve(new Connection(ws));
    ws.onerror = () => reject(new Error(`could not connect to ${url}`));
  });
}

export class Browser {
  static async launch({ headless = true } = {}) {
    const bin = CANDIDATES.find((c) => existsSync(c));
    if (!bin) throw new Error("No Chromium-based browser found; set BROWSER_BIN.");
    const userDataDir = mkdtempSync(join(tmpdir(), "kenmark-e2e-"));
    const args = [
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-prefers-reduced-motion",
      "about:blank",
    ];
    if (headless) args.unshift("--headless=new");
    const proc = spawn(bin, args, { stdio: "ignore" });
    const portFile = join(userDataDir, "DevToolsActivePort");
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile)) throw new Error("browser did not start");
    const port = Number(readFileSync(portFile, "utf8").split("\n")[0]);
    const http = `http://127.0.0.1:${port}`;
    let version;
    for (let i = 0; i < 50; i++) {
      try {
        version = await (await fetch(`${http}/json/version`)).json();
        break;
      } catch {
        await sleep(100);
      }
    }
    const browser = new Browser();
    browser.proc = proc;
    browser.http = http;
    browser.name = version?.Browser ?? bin;
    browser.conn = await connect(version.webSocketDebuggerUrl);
    return browser;
  }

  async newPage({ width = 1600, height = 1000 } = {}) {
    const { targetId } = await this.conn.send("Target.createTarget", { url: "about:blank" });
    const list = await (await fetch(`${this.http}/json/list`)).json();
    const target = list.find((t) => t.id === targetId);
    const page = new Page(await connect(target.webSocketDebuggerUrl), targetId, this);
    await page.init(width, height);
    return page;
  }

  async close() {
    try {
      await this.conn.send("Browser.close");
    } catch {
      /* already gone */
    }
    this.conn.close();
    this.proc.kill();
  }
}

export class Page {
  constructor(conn, targetId, browser) {
    this.conn = conn;
    this.targetId = targetId;
    this.browser = browser;
    this.consoleErrors = [];
  }

  async init(width, height) {
    await this.conn.send("Page.enable");
    await this.conn.send("Runtime.enable");
    await this.conn.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    this.conn.on((message) => {
      if (message.method === "Runtime.exceptionThrown") {
        this.consoleErrors.push(message.params.exceptionDetails.text ?? "uncaught exception");
      }
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        const text = message.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
        if (!/favicon/i.test(text)) this.consoleErrors.push(text);
      }
    });
  }

  async setViewport(width, height) {
    await this.conn.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
  }

  async goto(url) {
    const loaded = new Promise((resolve) => {
      const off = this.conn.on((m) => {
        if (m.method === "Page.loadEventFired") {
          off();
          resolve();
        }
      });
    });
    await this.conn.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(20000)]);
    await sleep(400);
  }

  async eval(expression) {
    const { result, exceptionDetails } = await this.conn.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails)
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }

  async waitFor(expression, { timeout = 15000, interval = 150 } = {}) {
    const started = Date.now();
    for (;;) {
      const value = await this.eval(expression);
      if (value) return value;
      if (Date.now() - started > timeout) throw new Error(`timed out waiting for: ${expression}`);
      await sleep(interval);
    }
  }

  async click(selector) {
    const ok = await this.eval(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`,
    );
    if (!ok) throw new Error(`no element matches ${selector}`);
    await sleep(120);
  }

  /** Clicks the first element whose text content matches, within an optional scope. */
  async clickText(text, scope = "body") {
    const ok = await this.eval(`(() => {
      const root = document.querySelector(${JSON.stringify(scope)});
      if (!root) return false;
      const el = [...root.querySelectorAll("button, a, summary")].find((e) => e.textContent.trim() === ${JSON.stringify(text)});
      if (!el) return false;
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`no clickable element with text "${text}" in ${scope}`);
    await sleep(120);
  }

  /** Sets a React-controlled input's value and fires the input event. */
  async type(selector, value) {
    const ok = await this.eval(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`no input matches ${selector}`);
    await sleep(80);
  }

  async text(selector) {
    return this.eval(
      `document.querySelector(${JSON.stringify(selector)})?.textContent?.replace(/\\s+/g, " ").trim() ?? null`,
    );
  }

  async count(selector) {
    return this.eval(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
  }

  async screenshot(path) {
    const { writeFileSync } = await import("node:fs");
    const { data } = await this.conn.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    writeFileSync(path, Buffer.from(data, "base64"));
  }

  async close() {
    this.conn.close();
    await this.browser.conn.send("Target.closeTarget", { targetId: this.targetId });
  }
}
