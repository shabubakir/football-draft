import { test, expect, BrowserContext, Page } from "@playwright/test";

// ============================================================================
// REGRESSION: GeoGuessr Multiplayer — маркеры не должны перетекать между раундами.
//
// Баг: после перехода из раунда N в раунд N+1 у одного из игроков на карте
// оставался зелёный маркер (guess) из раунда N.
//
// ROOT CAUSE: в GeoMapImpl эффект, сбрасывающий все маркеры при смене roundKey,
// был объявлен ПОСЛЕ эффектов, создающих маркер гадания и reveal-маркеры.
// React выполняет effects в порядке объявления, поэтому при смене раунда
// (render: reveal с guess=заполнено → новый раунд с roundKey+1) guess-эффект
// ЗАРАНЬЕ пересоздавал старый зелёный маркер, а reveal-эффект добавлял
// correct/label поверх — и только потом "reset" стирал часть, но не всё.
//
// FIX: reset-эффект объявлен ПЕРВЫМ → при смене roundKey сначала все маркеры
// удалены и refs обнулены, и только потом guess/reveal-эффекты могут создать
// маркеры нового раунда (а их там нет — reveal=null, guess=null).
//
// Тест: 2 независимых browser contexts (Player A, Player B), 2 полных цикла
// "ответ → таймер → reveal → переход в следующий раунд", на каждом переходе
// проверяем, что на карте ОБЕИХ игроков нет маркеров прошлого раунда.
//
// Примечание: тест требует, чтобы браузер мог подключиться к Supabase Realtime
// (wss). На dev-машине за корпоративным proxy используется ws-bridge
// (.ws-bridge.cjs, порт 9443) + NEXT_PUBLIC_USE_WS_PROXY=1.
// ============================================================================

const MAP_SELECTOR = ".leaflet-container";
// Зелёный маркер гадания игрока (pinIcon("#059669"))
const GUESS_PIN = "div.leaflet-marker-icon svg path[fill='#059669']";
// Красный маркер правильного ответа (pinIcon("#dc2626"))
const CORRECT_PIN = "div.leaflet-marker-icon svg path[fill='#dc2626']";

// Заполнить поле имени
async function ensureName(page: Page, name: string) {
  const input = page.getByPlaceholder("Введите имя").first();
  await input.fill(name);
  // React обработал onChange
  await page.waitForTimeout(500);
}

// Дождаться, пока на странице появится кнопка "НАЧАТЬ ИГРУ" (лобби)
async function waitForLobby(page: Page, timeout = 20_000) {
  await page.waitForFunction(
    () => /PRIVATE ROOM/.test(document.body.innerText),
    undefined,
    { timeout }
  );
}

// Дождаться, пока на странице будет виден раунд N (заголовок "РАУНД N")
async function waitForRound(page: Page, n: number, timeout = 60_000) {
  await page.waitForFunction(
    (round) => new RegExp(`РАУНД ${round}(?!\\s*\\d)`).test(document.body.innerText),
    n,
    { timeout }
  );
}

// Дождаться reveal: красная точка появилась
async function waitForReveal(page: Page, timeout = 90_000) {
  await page.waitForSelector(CORRECT_PIN, { timeout });
}

// Получить код комнаты из лобби
async function getRoomCode(page: Page): Promise<string> {
  // Страница /geoguessr: режим MULTIPLAYER → экран "ИГРАТЬ С ДРУЗЬЯМИ"
  const mpLink = page.getByRole("link", { name: /ИГРАТЬ С ДРУЗЬЯМИ/i }).first();
  const mpBtn = page.locator("button", { hasText: /ИГРАТЬ С ДРУЗЬЯМИ/i }).first();
  if ((await mpLink.count()) > 0) {
    await mpLink.click();
  } else {
    await mpBtn.click();
  }
  await ensureName(page, "PlayerA");
  // Ждём появления кнопки "ИГРАТЬ С ДРУЗЬЯМИ" (не disabled)
  await page.waitForFunction(
    () => {
      const b = Array.from(document.querySelectorAll("button")).find(
        (x) => x.textContent?.includes("ИГРАТЬ С ДРУЗЬЯМИ")
      );
      return b ? !b.disabled : false;
    },
    undefined,
    { timeout: 10_000 }
  );
  await page.click("button:has-text('ИГРАТЬ С ДРУЗЬЯМИ')");
  await waitForLobby(page);
  // Код комнаты — в span с tracking-[0.3em]
  const code = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll("span"));
    for (const s of spans) {
      const t = (s.textContent || "").trim();
      if (/^[A-Z0-9]{5,8}$/.test(t) && s.className.includes("tracking")) return t;
    }
    const m = document.body.innerText.match(/Код комнаты:\s*([A-Z0-9]{5,8})/);
    return m ? m[1] : "";
  });
  if (!code) throw new Error("Код комнаты не найден");
  return code;
}

// Присоединиться к комнате через URL /geoguessr/multiplayer/CODE
async function joinRoom(page: Page, code: string) {
  await page.goto(`/geoguessr/multiplayer/${code}`);
  // Ждём экран входа с полем имени
  await page.waitForSelector('input[placeholder="Введите имя"]', { timeout: 15_000 });
  await ensureName(page, "PlayerB");
  // Авто-join сработает после ввода имени — ждём лобби
  await waitForLobby(page);
}

// Дождаться, пока хост увидит 2+ игроков в лобби
// Текст в лобби: "ИГРОКИ · 2/8" (заглавные, разделитель — middle dot)
async function waitForHostSeesTwoPlayers(page: Page, timeout = 30_000) {
  await page.waitForFunction(
    () => {
      const m = document.body.innerText.match(/ИГРОКИ\s*·\s*(\d+)/i);
      return m ? parseInt(m[1]) >= 2 : false;
    },
    undefined,
    { timeout }
  );
}

// Клик по карте (центр) — ставит маркер гадания и подтверждает ответ
async function placeMarker(page: Page) {
  const map = page.locator(MAP_SELECTOR);
  // Карта подгружается динамически (ssr:false) — даём 30 сек
  await map.waitFor({ timeout: 30_000 });
  // Ждём, пока Leaflet инициализирует контейнер (внутри появятся слои)
  await page.waitForFunction(
    () => {
      const el = document.querySelector(".leaflet-container");
      return el && el.children.length > 0;
    },
    undefined,
    { timeout: 15_000 }
  );
  // Скроллим карту в зону видимости
  await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // даём Leaflet пересчитать размеры
  // Клик через Playwright locator (автоматически скроллит и ждёт стабильности)
  await map.click({ position: { x: 200, y: 150 } });
  // Маркер должен появиться
  await page.waitForSelector(GUESS_PIN, { timeout: 8_000 });
  // Подтверждаем ответ — без этого гадание не уходит на сервер
  const confirmBtn = page.locator("button:has-text('ПОДТВЕРДИТЬ ОТВЕТ')");
  await confirmBtn.waitFor({ timeout: 5_000 });
  await confirmBtn.click();
}

async function countMarkers(page: Page, sel: string): Promise<number> {
  return page.locator(`${MAP_SELECTOR} ${sel}`).count();
}

test.describe("GeoGuessr MP — сброс маркеров между раундами (regression)", () => {
  test.describe.configure({ timeout: 300_000 });

  test("раунды 1→2 и 2→3: старые маркеры не остаются ни у кого", async ({ browser }, testInfo) => {
    // ---- Player A (хост) ----
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    pageA.on("console", (msg) => {
      if (msg.type() === "error")
        testInfo.attach("A-console-error", { body: msg.text(), contentType: "text/plain" });
    });
    await pageA.goto("/geoguessr");
    await pageA.waitForTimeout(1500);
    const code = await getRoomCode(pageA);
    testInfo.attach("room-code", { body: code, contentType: "text/plain" });

    // ---- Player B (второй контекст — независимый storage) ----
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    pageB.on("console", (msg) => {
      if (msg.type() === "error")
        testInfo.attach("B-console-error", { body: msg.text(), contentType: "text/plain" });
    });
    await joinRoom(pageB, code);

    // Ждём, пока хост увидит второго игрока
    // (realtime может задержаться; если не дошло за 15с — переходим по URL комнаты)
    try {
      await waitForHostSeesTwoPlayers(pageA, 15_000);
    } catch {
      testInfo.attach("note", { body: "Realtime не доставил join — goto room URL", contentType: "text/plain" });
      await pageA.goto(`/geoguessr/multiplayer/${code}`);
      // После загрузки страницы хост должен увидеть себя в лобби (myName из localStorage)
      // Но хост не "join"ится — он должен увидеть лобби как host.
      // Проще: просто reload и подождать.
      await waitForLobby(pageA, 20_000);
      await waitForHostSeesTwoPlayers(pageA, 20_000);
    }

    // Хост запускает игру
    await pageA.click("button:has-text('НАЧАТЬ ИГРУ')");

    // Ждём, пока оба увидят раунд 1
    // (realtime может задержаться; если не дошло — переходим по URL комнаты)
    try {
      await Promise.all([
        waitForRound(pageA, 1, 15_000),
        waitForRound(pageB, 1, 15_000),
      ]);
    } catch {
      testInfo.attach("note", { body: "Realtime не доставил start — goto room URL", contentType: "text/plain" });
      await pageA.goto(`/geoguessr/multiplayer/${code}`);
      await pageB.goto(`/geoguessr/multiplayer/${code}`);
      await Promise.all([
        waitForRound(pageA, 1, 25_000),
        waitForRound(pageB, 1, 25_000),
      ]);
    }

    // ================= РАУНД 1 =================
    await placeMarker(pageA);
    // Пауза: даём серверу обработать ответ A
    await pageA.waitForTimeout(1000);
    await placeMarker(pageB);
    // Пауза: даём серверу обработать ответ B
    await pageB.waitForTimeout(1000);

    // Ждём, пока reveal (красная точка) появится у обоих
    await Promise.all([waitForReveal(pageA), waitForReveal(pageB)]);

    // На reveal маркеры ДОЛЖНЫ быть видны (свой + правильный)
    expect(await countMarkers(pageA, GUESS_PIN), "A: нет своего маркера на reveal R1").toBeGreaterThanOrEqual(1);
    expect(await countMarkers(pageB, GUESS_PIN), "B: нет своего маркера на reveal R1").toBeGreaterThanOrEqual(1);
    expect(await countMarkers(pageA, CORRECT_PIN), "A: нет правильного маркера на reveal R1").toBeGreaterThanOrEqual(1);
    expect(await countMarkers(pageB, CORRECT_PIN), "B: нет правильного маркера на reveal R1").toBeGreaterThanOrEqual(1);

    // ================= ПЕРЕХОД 1 → 2 =================
    // Reveal длится 10 сек → авто-next
    await Promise.all([waitForRound(pageA, 2), waitForRound(pageB, 2)]);

    // Карта должна быть ПОЛНОСТЬЮ ЧИСТОЙ: ни одного маркера из раунда 1
    expect(await countMarkers(pageA, GUESS_PIN), "A: зелёный маркер R1 остался!").toBe(0);
    expect(await countMarkers(pageB, GUESS_PIN), "B: зелёный маркер R1 остался!").toBe(0);
    expect(await countMarkers(pageA, CORRECT_PIN), "A: красный маркер R1 остался!").toBe(0);
    expect(await countMarkers(pageB, CORRECT_PIN), "B: красный маркер R1 остался!").toBe(0);

    // ================= РАУНД 2 =================
    await placeMarker(pageA);
    await pageA.waitForTimeout(1000);
    await placeMarker(pageB);
    await pageB.waitForTimeout(1000);

    // Новый маркер раунда 2 стоит
    expect(await countMarkers(pageA, GUESS_PIN), "A: нет нового маркера R2").toBe(1);
    expect(await countMarkers(pageB, GUESS_PIN), "B: нет нового маркера R2").toBe(1);

    await Promise.all([waitForReveal(pageA), waitForReveal(pageB)]);
    expect(await countMarkers(pageA, CORRECT_PIN), "A: нет правильного маркера R2").toBeGreaterThanOrEqual(1);
    expect(await countMarkers(pageB, CORRECT_PIN), "B: нет правильного маркера R2").toBeGreaterThanOrEqual(1);

    // ================= ПЕРЕХОД 2 → 3 =================
    await Promise.all([waitForRound(pageA, 3), waitForRound(pageB, 3)]);

    // Маркеры раунда 2 тоже не должны остаться
    expect(await countMarkers(pageA, GUESS_PIN), "A: зелёный маркер R2 остался!").toBe(0);
    expect(await countMarkers(pageB, GUESS_PIN), "B: зелёный маркер R2 остался!").toBe(0);
    expect(await countMarkers(pageA, CORRECT_PIN), "A: красный маркер R2 остался!").toBe(0);
    expect(await countMarkers(pageB, CORRECT_PIN), "B: красный маркер R2 остался!").toBe(0);

    // Игрок может поставить НОВЫЙ маркер в раунде 3
    await placeMarker(pageA);
    await pageA.waitForTimeout(1000);
    await placeMarker(pageB);
    await pageB.waitForTimeout(1000);
    expect(await countMarkers(pageA, GUESS_PIN), "A: нет нового маркера R3").toBe(1);
    expect(await countMarkers(pageB, GUESS_PIN), "B: нет нового маркера R3").toBe(1);

    await ctxA.close();
    await ctxB.close();
  }, 300_000);
});
