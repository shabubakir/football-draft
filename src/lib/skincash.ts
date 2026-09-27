/**
 * Клиент SkinCash API (https://api.skincash.gg).
 *
 * Сетевой слой: на рабочей машине прямые HTTPS-соединения из Node
 * не проходят — единственный доступный выход, который работает,
 * это TCP-прокси. Node-совместимый способ:
 *   TCP → CONNECT hostname:443 через прокси → TLS поверх сокета → HTTP GET.
 *
 * На деплое (Vercel) прокси нет — используется обычный fetch.
 * Режим определяется: если SKINCASH_PROXY / http(s)_proxy заданы — прокси,
 * иначе — прямой fetch.
 */

import net from "net";
import tls from "tls";
import { URL } from "url";

function getProxy(): { host: string; port: number } | null {
  if (process.env.SKINCASH_PROXY) {
    const [host, port] = process.env.SKINCASH_PROXY.split(":");
    if (host && port) return { host, port: Number(port) };
  }
  for (const key of ["http_proxy", "HTTP_PROXY", "https_proxy", "HTTPS_PROXY"]) {
    const v = process.env[key];
    if (v) {
      try {
        const u = new URL(v);
        if (u.hostname && u.port) return { host: u.hostname, port: Number(u.port) };
      } catch {
        // игнорируем
      }
    }
  }
  return null;
}

// Лёгкий sanity-check: если задан прокси, но к нему не подключиться
// (например, Vercel видит env от локальной машины) — отключаем его.
let proxyBroken = false;

/**
 * GET https-запрос. Сначала пробуем прокси (если задан), при его смерти — прямой fetch.
 * Жёсткий таймаут — не вешает caller.
 */
async function rawGet(
  targetUrl: string,
  timeoutMs: number
): Promise<{ status: number; body: string; ms: number }> {
  const started = Date.now();
  const proxy = proxyBroken ? null : getProxy();

  if (proxy) {
    try {
      const r = await proxiedGet(targetUrl, proxy, timeoutMs);
      return { ...r, ms: Date.now() - started };
    } catch {
      proxyBroken = true; // дальше только прямой fetch
    }
  }

  // Прямой fetch (prod / без прокси)
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      signal: ctl.signal,
    });
    const body = await res.text();
    return { status: res.status, body, ms: Date.now() - started };
  } finally {
    clearTimeout(to);
  }
}

function proxiedGet(
  targetUrl: string,
  proxy: { host: string; port: number },
  timeoutMs: number
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    if (!u.hostname) {
      reject(new Error("bad url"));
      return;
    }
    let done = false;

    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(to);
      fn();
    };

    const to = setTimeout(() => {
      finish(() => {
        sock.destroy();
        reject(new Error(`timeout ${timeoutMs}ms`));
      });
    }, timeoutMs);

    const sock = net.connect(proxy.port, proxy.host, () => {
      sock.write(
        `CONNECT ${u.hostname}:443 HTTP/1.1\r\n` +
          `Host: ${u.hostname}:443\r\n` +
          `Proxy-Connection: keep-alive\r\n\r\n`
      );
    });
    sock.setTimeout(timeoutMs);

    let head = "";
    let connected = false;
    sock.on("data", (chunk: Buffer) => {
      if (done) return;
      if (!connected) {
        head += chunk.toString();
        const idx = head.indexOf("\r\n\r\n");
        if (idx < 0) return;
        const statusLine = head.slice(0, idx).split("\r\n")[0] || "";
        const status = parseInt(statusLine.split(" ")[1] ?? "", 10);
        if (!Number.isFinite(status) || status !== 200) {
          finish(() => {
            sock.destroy();
            reject(new Error(`proxy ${status}`));
          });
          return;
        }
        connected = true;
        const t = tls.connect({
          socket: sock,
          servername: u.hostname,
          host: u.hostname,
        });
        let body = "";
        t.on("data", (c: Buffer) => (body += c.toString()));
        t.on("end", () => {
          finish(() => {
            const m = body.match(/HTTP\/1\.[01] (\d+)/);
            resolve({
              status: m ? parseInt(m[1], 10) : 0,
              body: body.split("\r\n\r\n").pop() || "",
            });
          });
        });
        t.on("error", (e: Error) => {
          finish(() => reject(e));
        });
        t.write(
          `GET ${u.pathname + u.search} HTTP/1.1\r\n` +
            `Host: ${u.hostname}\r\n` +
            `Accept: application/json\r\n` +
            `Connection: close\r\n\r\n`
        );
      }
    });
    sock.on("error", (e: Error) => {
      finish(() => reject(e));
    });
    sock.on("timeout", () => {
      finish(() => {
        sock.destroy();
        reject(new Error("socket timeout"));
      });
    });
  });
}

/**
 * Цена предмета на SkinCash. 404 / ошибки → price: null.
 * НЕ бросает исключений.
 */
export async function skincashPrice(
  marketHashName: string,
  timeoutMs = 8000
): Promise<{ status: number; price: number | null; ms: number }> {
  const url = `https://api.skincash.gg/v1/prices/${encodeURIComponent(marketHashName)}`;
  const t0 = Date.now();
  try {
    const r = await rawGet(url, timeoutMs);
    const ms = Date.now() - t0;
    if (process.env.SKINCASH_DEBUG) {
      console.log(`[skincash] ${marketHashName} → ${r.status} ${ms}ms`);
    }
    if (r.status === 200) {
      try {
        const json = JSON.parse(r.body);
        if (typeof json.price === "number") {
          return { status: r.status, price: json.price, ms };
        }
      } catch {
        // не JSON
      }
    }
    return { status: r.status, price: null, ms };
  } catch {
    return { status: 0, price: null, ms: Date.now() - t0 };
  }
}

/**
 * Пакет цен (батчи по 20, параллельно внутри батча).
 * Промахи → просто не попадают в Map.
 */
export async function skincashPrices(
  marketHashNames: string[],
  opts: { perRequestMs?: number; totalMs?: number } = {}
): Promise<Map<string, number>> {
  const per = opts.perRequestMs ?? 8000;
  const totalMs = opts.totalMs ?? 20000;
  const result = new Map<string, number>();

  // Дедупликация (одинаковые market hash names не запрашиваем дважды)
  const unique = [...new Set(marketHashNames)];

  const BATCH = 20;
  const startedAt = Date.now();
  for (let i = 0; i < unique.length; i += BATCH) {
    if (Date.now() - startedAt > totalMs) break;
    const batch = unique.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((name) => skincashPrice(name, per))
    );
    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.price != null && r.price > 0) {
        result.set(batch[j].toLowerCase(), r.price);
      }
    }
  }
  return result;
}
