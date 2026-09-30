// ============================================================
// POST /api/livekit-token
// ============================================================
// Выдача LiveKit access-токена для голосового чата.
//
// Безопасность:
//  - LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL — только
//    в серверных переменных окружения (Vercel env / .env.local)
//  - Токен валиден 30 минут (ttl: "30m")
//  - Токен привязан к конкретной голосовой комнате (svoya-<roomId>)
//  - Идентичность участника = playerId (из sessionStorage, один на вкладку)
//  - Проверяется членство игрока в игровой комнате (Supabase)
//  - Секреты и токены НЕ логируются
//
// Vercel-совместимость:
//  - Route Handler (nodejs runtime по умолчанию)
//  - JWT-подпись через jose (чистый JS, без нативных модулей)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { isLiveKitConfigured, verifyRoomMembership } from "@/lib/livekit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const roomId = String(body.roomId ?? "");
  const playerId = String(body.playerId ?? "");

  // 1. LiveKit настроен?
  if (!isLiveKitConfigured()) {
    return NextResponse.json(
      { error: "Голосовой чат не настроен (нет LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)" },
      { status: 503 }
    );
  }

  // 2. Валидация членства
  const result = await verifyRoomMembership(roomId, playerId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // 3. Генерация токена
  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: playerId,
        name: result.name,
        ttl: "30m",
      }
    );
    // Привязываем к голосовой комнате svoya-<roomId>
    at.addGrant({
      room: `svoya-${roomId}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    });
    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: process.env.LIVEKIT_URL!,
      room: `svoya-${roomId}`,
    });
  } catch (e) {
    console.error("livekit-token: ошибка генерации токена", (e as Error).message);
    return NextResponse.json(
      { error: "Не удалось выдать токен" },
      { status: 500 }
    );
  }
}
