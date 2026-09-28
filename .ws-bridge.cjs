// WS bridge: browser → ws://localhost:9443 → squid CONNECT tunnel → wss://supabase
const http = require("http");
const crypto = require("crypto");
const tls = require("tls");

const PORT = 9443;
const PROXY = { host: "192.168.8.2", port: 3128 };
const SUPABASE_HOST = "wkxxdixxieiyjgreepvv.supabase.co";
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function connectThroughProxy(targetHost, wsKey, targetPath, subprotocols) {
  return new Promise((resolve, reject) => {
    const conn = http.request({
      host: PROXY.host,
      port: PROXY.port,
      method: "CONNECT",
      path: `${targetHost}:443`,
      headers: { Host: `${targetHost}:443` },
    });
    conn.on("connect", (res, proxySocket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`CONNECT failed: ${res.statusCode}`));
        return;
      }
      const tlsSocket = tls.connect({
        socket: proxySocket,
        servername: targetHost,
        rejectUnauthorized: false,
      });
      tlsSocket.on("secureConnect", () => {
        const upstreamKey = crypto.randomBytes(16).toString("base64");
        const lines = [
          `GET ${targetPath} HTTP/1.1`,
          `Host: ${targetHost}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Key: ${upstreamKey}`,
          "Sec-WebSocket-Version: 13",
        ];
        // Pass through subprotocols (e.g. "phoenix", "token=...")
        if (subprotocols) lines.push(`Sec-WebSocket-Protocol: ${subprotocols}`);
        lines.push("", "");
        tlsSocket.write(lines.join("\r\n"));

        let buf = "";
        const onData = (chunk) => {
          buf += chunk.toString("binary");
          const idx = buf.indexOf("\r\n\r\n");
          if (idx === -1) return;
          const headerPart = buf.slice(0, idx);
          const rest = buf.slice(idx + 4);
          tlsSocket.removeListener("data", onData);
          if (!headerPart.includes("101")) {
            reject(new Error("WS handshake failed: " + headerPart.slice(0, 300)));
            tlsSocket.destroy();
            return;
          }
          console.log("[ws-bridge] upstream 101 OK");
          resolve({ socket: tlsSocket, leftover: rest });
        };
        tlsSocket.on("data", onData);
        tlsSocket.setTimeout(10000, () => {
          reject(new Error("upstream handshake timeout"));
          tlsSocket.destroy();
        });
      });
      tlsSocket.on("error", reject);
    });
    conn.on("error", reject);
    conn.setTimeout(15000, () => {
      reject(new Error("CONNECT timeout"));
      conn.destroy();
    });
    conn.end();
  });
}

const server = http.createServer();

server.on("upgrade", (req, clientSocket) => {
  const url = new URL(req.url, "http://localhost");
  const target = url.searchParams.get("target");
  if (!target) {
    clientSocket.write("HTTP/1.1 400 Bad Request\r\n\r\ntarget required");
    clientSocket.destroy();
    return;
  }
  const tUrl = new URL(target);
  if (tUrl.hostname !== SUPABASE_HOST || tUrl.protocol !== "wss:") {
    clientSocket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    clientSocket.destroy();
    return;
  }
  const browserWsKey = req.headers["sec-websocket-key"];
  console.log("[ws-bridge] client upgrade from", clientSocket.remoteAddress);

  const subprotocols = req.headers["sec-websocket-protocol"] || undefined;
  connectThroughProxy(tUrl.hostname, browserWsKey, tUrl.pathname + tUrl.search, subprotocols)
    .then(({ socket: upstream, leftover }) => {
      // Send 101 to the browser client
      const accept = crypto
        .createHash("sha1")
        .update(browserWsKey + WS_GUID)
        .digest("base64");
      clientSocket.write(
        [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${accept}`,
          "",
          "",
        ].join("\r\n")
      );
      console.log("[ws-bridge] 101 sent to client");

      // Forward leftover data from upstream handshake
      if (leftover && leftover.length > 0) {
        clientSocket.write(Buffer.from(leftover, "binary"));
      }

      // Bidirectional relay using explicit data handlers
      let closed = false;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        try { clientSocket.destroy(); } catch {}
        try { upstream.destroy(); } catch {}
      };

      upstream.on("data", (chunk) => {
        if (!closed) {
          clientSocket.write(chunk, () => {
            // ignore write errors
          });
        }
      });
      clientSocket.on("data", (chunk) => {
        if (!closed) {
          upstream.write(chunk, () => {
            // ignore write errors
          });
        }
      });

      upstream.on("error", (e) => {
        console.error("[ws-bridge] upstream error:", e.message);
        cleanup();
      });
      clientSocket.on("error", (e) => {
        console.error("[ws-bridge] client error:", e.message);
        cleanup();
      });
      upstream.on("close", () => {
        console.log("[ws-bridge] upstream closed");
        cleanup();
      });
      clientSocket.on("close", () => {
        console.log("[ws-bridge] client closed");
        cleanup();
      });
    })
    .catch((e) => {
      console.error("[ws-bridge] error:", e.message);
      clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n" + e.message);
      clientSocket.destroy();
    });
});

server.listen(PORT, () => {
  console.log(`[ws-bridge] listening on ws://localhost:${PORT}`);
});
