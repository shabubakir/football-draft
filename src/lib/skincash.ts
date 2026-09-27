/**
 * Клиент SkinCash API (https://api.skincash.gg).
 *
 * Сетевой слой: на этой машине прямые HTTPS-соединения из Node не работают,
 * а единственный доступный выход — корпоративный прокси. Node-совместимый
 * способ: TCP → CONNECT hostname:443 через прокси → TLS поверх сокета → HTTP.
 *
 * Прокси берётся из env (SKINCASH_PROXY) или из стандартных http(s)_proxy.
 * Если прокси нет/недоступен — возвращаем null (caller фоллит на статику).
 */

import net from "net";
import tls from "tls";
import { URL } from "url";

const PROXY_HOST =
  process.env.SKINCASH_PROXY_HOST || "192.168.8.2";
const PROXY_PORT = Number(
  process.env.SKINCASH_PROXY_PORT ||
    process.env.HTTPS_PROXY?.split(":").pop()?.replace(/^.*:/, "") ||
    3128
);

export interface SkincashPrice {
  status: number;
  price: number | null;
  ms: number;
}

function getProxy(): { host: string; port: number } {
  // SKINCASH_PROXY="host:port" (перекрывает всё)
  if (process.env.SKINCASH_PROXY) {
    const [host, port] = process.env.SKINCASH_PROXY.split(":");
    if (host && port) return { host, port: Number(port) };
  }
  const lower = process.env.http_proxy || process.env.HTTP_PROXY;
  if (lower) {
    const u = new URL(lower);
    if (u.hostname && u.port) return { host: u.hostname, port: Number(u.port) };
  }
  const upper = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (upper) {
    const u = new URL(upper);
    if (u.hostname && u.port) return { host: u.hostname, port: Number(u.port) };
  }
  return { host: PROXY_HOST, port: PROXY_PORT };
}

/**
 * GET https-запрос через прокси-CONNECT с жёстким таймаутом.
 * Возвращает { status, body } — бросает исключение только при таймауте/ошибке сокета.
 */
export function proxiedGet(
  targetUrl: string,
  timeoutMs: number
): Promise<{ status: number; body: string; ms: number }> {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    if (!u.hostname) {
      reject(new Error("bad url"));
      return;
    }
    const proxy = getProxy();
    const started = Date.now();
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
        const t = tls.connect({ socket: sock, servername: u.hostname, host: u.hostname });
        let body = "";
        t.on("data", (c: Buffer) => (body += c.toString()));
        t.on("end", () => {
          finish(() => {
            const m = body.match(/HTTP\/1\.[01] (\d+)/);
            resolve({
              status: m ? parseInt(m[1], 10) : 0,
              body: body.split("\r\n\r\n").pop() || "",
              ms: Date.now() - started,
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
 * Цена предмета на SkinCash. 404 / ошибки → null.
 */
export async function skincashPrice(
  marketHashName: string,
  timeoutMs = 8000
): Promise<SkincashPrice> {
  const url = `https://api.skincash.gg/v1/prices/${encodeURIComponent(marketHashName)}`;
  const t0 = Date.now();
  try {
    const r = await proxiedGet(url, timeoutMs);
    const ms = Date.now() - t0;
    if (r.status === 404) return { status: r.status, price: null, ms };
    if (r.status === 429 || r.status >= 400) return { status: r.status, price: null, ms };
    try {
      const json = JSON.parse(r.body);
      if (typeof json.price === "number") {
        return { status: r.status, price: json.price, ms };
      }
    } catch {
      // не JSON
    }
    return { status: r.status, price: null, ms };
  } catch {
    return { status: 0, price: null, ms: Date.now() - t0 };
  }
}

/**
 * Пакет цен (параллельно через отдельные сокет/прокси-CONNECT).
 * Не бросает исключения — провалившиеся позиции в result имеют price: null.
 */
export async function skincashPrices(
  marketHashNames: string[],
  opts: { perRequestMs?: number; totalMs?: number } = {}
): Promise<Map<string, number>> {
  const per = opts.perRequestMs ?? 8000;
  const totalMs = opts.totalMs ?? 20000;
  const result = new Map<string, number>();

  const BATCH = 20;
  const startedAt = Date.now();
  for (let i = 0; i < marketHashNames.length; i += BATCH) {
    if (Date.now() - startedAt > totalMs) break;
    const batch = marketHashNames.slice(i, i + BATCH);
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
