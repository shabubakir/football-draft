"use client";

// Браузерный WebSocket-транспорт для Supabase Realtime, который работает
// и через корпоративный proxy. На dev-машине браузер не может открыть
// wss://<supabase> напрямую, поэтому подключение идёт через
//   ws://localhost:9443/?target=<wss-url>
// (ws-bridge.mjs пробивает CONNECT-туннель через squid до Supabase).
//
// На Vercel / за прямой сетью транспорт НЕ используется — обычный WebSocket.
//
// Транспорт включается, когда NEXT_PUBLIC_USE_WS_PROXY=1 в .env.local
// (ставится только на dev-машине за корпоративным squid).

import type { WebSocketLikeConstructor } from "@supabase/realtime-js";

function useProxy(): boolean {
  return process.env.NEXT_PUBLIC_USE_WS_PROXY === "1";
}

function proxyUrl(wssUrl: string): string {
  const target = encodeURIComponent(wssUrl);
  return `ws://localhost:9443/?target=${target}`;
}

/**
 * Возвращает конструктор WebSocket:
 *  - обычный WebSocket, если прокси не нужен;
 *  - обёртку, которая ходит через ws-bridge — если нужен.
 */
export function getRealtimeTransport(): WebSocketLikeConstructor {
  if (!useProxy()) {
    return WebSocket as unknown as WebSocketLikeConstructor;
  }

  return ((class ProxiedWebSocket {
    private ws: WebSocket;
    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: Event) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    binaryType: "blob" | "arraybuffer" = "blob";
    url: string;
    protocol = "";
    extensions = "";
    bufferedAmount = 0;
    timeout: number | undefined;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;

    constructor(address: string, subprotocols?: string | string[]) {
      this.url = address;
      this.ws = new WebSocket(proxyUrl(address), subprotocols);
      // Устанавливаем обработчики ДО того, как они могут сработать
      this.ws.onopen = (e) => {
        this.protocol = this.ws.protocol;
        this.onopen?.(e);
      };
      this.ws.onclose = (e) => this.onclose?.(e);
      this.ws.onerror = (e) => this.onerror?.(e);
      this.ws.onmessage = (e) => this.onmessage?.(e);
      // Пропускаем binaryType внутрь
      this.ws.binaryType = "arraybuffer";
    }

    get readyState(): number {
      return this.ws.readyState;
    }

    send(data: string) {
      this.ws.send(data);
    }

    close(code?: number, reason?: string) {
      this.ws.close(code, reason);
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      this.ws.addEventListener(type, listener as EventListener);
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      this.ws.removeEventListener(type, listener as EventListener);
    }
  }) as unknown) as WebSocketLikeConstructor;
}
