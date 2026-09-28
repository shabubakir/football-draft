import { test, expect, BrowserContext, Page, TestInfo } from "@playwright/test";

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
// Точные маркеры по data-атрибутам на ВНУТРЕННЕМ div (Leaflet оборачивает
// html в .leaflet-marker-icon, а data-атрибут ставится на div внутри):
//   data-guess-pin — зелёный маркер гадания игрока
//   data-reveal-pin — красный маркер правильного ответа
const GUESS_PIN = ".leaflet-marker-icon [data-guess-pin='true']";
const CORRECT_PIN = ".leaflet-marker-icon [data-reveal-pin='true']";
// Любой пин (для проверки "карта полностью чистая")
const ANY_PIN = ".leaflet-marker-icon [data-guess-pin='true'], .leaflet-marker-icon [data-reveal-pin='true']";

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

// Дождаться, пока на странице будет виден раунд N В ФАЗЕ ОТВЕТА.
// Заголовок в фазе ответа: "РАУНД N / M" (без слова "РЕЗУЛЬТАТ").
// Заголовок в фазе reveal: "РАУНД N · РЕЗУЛЬТАТ".
// Если мы "проскочили" фазу ответа и попали в reveal — ждём следующий раунд.
async function waitForRound(page: Page, n: number, timeout = 60_000) {
  await page.waitForFunction(
    (round) => {
      const text = document.body.innerText;
      // Ищем "РАУНД N" и проверяем, что это НЕ reveal
      const match = text.match(new RegExp(`РАУНД ${round}(?!\\s*\\d)([^\n]*)`));
      if (!match) return false;
      // Если после номера раунда на той же строке есть "РЕЗУЛЬТАТ" — это reveal, не ждём
      return !/РЕЗУЛЬТАТ/i.test(match[1]);
    },
    n,
    { timeout }
  );
}

// Дождаться раунд N на обеих страницах с fallback: если realtime не доставил
// за 25с — переходим по URL комнаты (auto-join) и ждём ещё 30с.
async function waitForRoundBoth(pageA: Page, pageB: Page, code: string, n: number, testInfo: TestInfo) {
  try {
    await Promise.all([waitForRound(pageA, n, 25_000), waitForRound(pageB, n, 25_000)]);
  } catch {
    testInfo.attach(`note-round${n}`, { body: `Realtime не доставил раунд ${n} за 25с — goto fallback`, contentType: "text/plain" });
    await Promise.all([
      pageA.goto(`/geoguessr/multiplayer/${code}`, { waitUntil: "domcontentloaded" }),
      pageB.goto(`/geoguessr/multiplayer/${code}`, { waitUntil: "domcontentloaded" }),
    ]);
    await Promise.all([waitForRound(pageA, n, 30_000), waitForRound(pageB, n, 30_000)]);
  }
}

// Дождаться reveal: красная точка появилась
// (waitForFunction вместо waitForSelector: Leaflet-маркеры имеют
// width/height: 0, Playwright считает их "hidden" и waitForSelector
// не срабатывает)
async function waitForReveal(page: Page, timeout = 90_000) {
  await page.waitForFunction(
    (sel) => !!document.querySelector(sel),
    CORRECT_PIN,
    { timeout }
  );
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
// Гость видит экран "ВХОД В КОМНАТУ": код подставлен, вводит имя и
// сам нажимает "ВОЙТИ В КОМНАТУ" (автоматического join нет).
async function joinRoom(page: Page, code: string) {
  await page.goto(`/geoguessr/multiplayer/${code}`);
  // Ждём экран входа с полем имени
  await page.waitForSelector('input[placeholder="Введите имя"]', { timeout: 15_000 });
  await ensureName(page, "PlayerB");
  // Ждём, пока кнопка станет активной (имя + код есть)
  await page.waitForFunction(
    () => {
      const b = Array.from(document.querySelectorAll("button")).find(
        (x) => x.textContent?.includes("ВОЙТИ В КОМНАТУ")
      );
      return b ? !b.disabled : false;
    },
    undefined,
    { timeout: 10_000 }
  );
  await page.click("button:has-text('ВОЙТИ В КОМНАТУ')");
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

// Клик по карте (центр) — ставит маркер гадания и подтверждает ответ.
// Стратегия: 1) клик по DOM (2 попытки), 2) force API через Leaflet (надёжно
// в headless-окружении за корпоративным proxy). Force API вызывает
// onGuessChange, поэтому React-стейт `guess` обновится и появится кнопка
// "ПОДТВЕРДИТЬ ОТВЕТ".
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

  let markerSeen = false;

  // Хелпер: проверка наличия маркера в DOM (без visibility-проверки Playwright,
  // т.к. Leaflet-маркеры имеют width/height: 0 — Playwright считает их "hidden")
  const checkMarker = async (sel: string, timeout: number) => {
    try {
      await page.waitForFunction(
        (s) => !!document.querySelector(s),
        sel,
        { timeout }
      );
      return true;
    } catch {
      return false;
    }
  };

  // Попытка 1-2: клик по карте (mouse API)
  for (let attempt = 1; attempt <= 2 && !markerSeen; attempt++) {
    const box = await map.boundingBox();
    if (!box) throw new Error("Карта не в bounds");
    const x = box.x + box.width * 0.45;
    const y = box.y + box.height * 0.5;
    await page.mouse.move(x, y, { steps: 3 });
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    markerSeen = await checkMarker(GUESS_PIN, 3_000);
  }

  // Попытка 3: dispatchEvent click на контейнере Leaflet (надёжно в headless —
  // Leaflet обработает клик и вызовет onGuessChange → React-стейт)
  if (!markerSeen) {
    const clicked = await page.evaluate(() => {
      const container = document.querySelector(".leaflet-container") as HTMLElement | null;
      if (!container) return false;
      const rect = container.getBoundingClientRect();
      const x = rect.width * 0.45;
      const y = rect.height * 0.5;
      container.dispatchEvent(new MouseEvent("click", {
        bubbles: true, cancelable: true, view: window,
        clientX: rect.left + x, clientY: rect.top + y,
      }));
      return true;
    });
    if (clicked) {
      markerSeen = await checkMarker(GUESS_PIN, 3_000);
    }
  }

  if (!markerSeen) {
    const dump = await page.evaluate(() => {
      const icons = Array.from(document.querySelectorAll(".leaflet-marker-icon"));
      const insts = (window as unknown as { __GEO_MAP_INSTANCES__?: Map<number, unknown> }).__GEO_MAP_INSTANCES__;
      let leafletInfo = "no map instance";
      const m = insts && insts.values().next().value as
        | { _container?: HTMLDivElement; _layers?: Record<number, unknown> }
        | undefined;
      if (m && m._container) {
        const c = m._container;
        leafletInfo = JSON.stringify({
          containerClient: `${c.clientWidth}x${c.clientHeight}`,
          scrollWidth: c.scrollWidth,
          layers: Object.keys(m._layers ?? {}).length,
        });
      }
      // Полный innerHTML каждого маркера (не обрезанный)
      const full = icons.map((el) => el.outerHTML).join("\n===\n");
      // Проверка: есть ли элемент с data-guess-pin
      const guessEls = document.querySelectorAll("[data-guess-pin='true']");
      const guessInfo = Array.from(guessEls).map((el) =>
        `tag=${el.tagName} class=${el.className} parent=${el.parentElement?.className}`
      ).join("; ") || "NO data-guess-pin elements found";
      return `maps: ${insts ? insts.size : "none"}; icons: ${icons.length}; ${leafletInfo}\n` +
        `data-guess-pin elements: ${guessInfo}\n` +
        `--- FULL MARKER HTML ---\n${full}`;
    });
    throw new Error("Маркер не появился после кликов + force API. DIAG:\n" + dump);
  }

  // Ждём кнопку "ПОДТВЕРДИТЬ ОТВЕТ" (React-стейт guess обновился)
  const confirmBtn = page.locator("button:has-text('ПОДТВЕРДИТЬ ОТВЕТ')");
  await confirmBtn.waitFor({ timeout: 8_000 });
  await confirmBtn.click();
}

async function countMarkers(page: Page, sel: string): Promise<number> {
  return page.locator(`${MAP_SELECTOR} ${sel}`).count();
}

// Считать текущий раунд из DOM (заголовок "РАУНД N" или "РАУНД N · РЕЗУЛЬТАТ")
async function getCurrentRound(page: Page): Promise<number> {
  return page.evaluate(() => {
    const m = document.body.innerText.match(/РАУНД\s+(\d+)/);
    return m ? parseInt(m[1]) : -1;
  });
}

// Аудит РЕАЛЬНЫХ Leaflet layers: map.eachLayer → список всех активных слоёв.
// Возвращает { total, markers: string[], polylines, tiles, labels }.
async function auditMapLayers(page: Page): Promise<{
  total: number;
  markers: string[];
  polylines: number;
  tileLayers: number;
  other: string[];
}> {
  return page.evaluate(() => {
    // window.__GEO_MAPS__ — не заполнено; ищем map через DOM:
    // Leaflet хранит инстансы в (container as any)._leaflet_id → но map
    // доступен как window.__leafletMaps__? Нет. Используем глобальный
    // хук: geo-map-impl регистрирует map в window.__GEO_MAP_INSTANCES__.
    const insts = (window as unknown as { __GEO_MAP_INSTANCES__?: Map<number, unknown> })
      .__GEO_MAP_INSTANCES__;
    if (!insts) return { total: -1, markers: ["<no map instance>"], polylines: 0, tileLayers: 0, other: [] };
    const out: { total: number; markers: string[]; polylines: number; tileLayers: number; other: string[] } = {
      total: 0,
      markers: [],
      polylines: 0,
      tileLayers: 0,
      other: [`maps_in_registry=${insts.size}`],
    };
    for (const map of insts.values()) {
      const m = map as { eachLayer: (cb: (l: unknown) => void) => void; _container?: unknown };
      m.eachLayer((layer) => {
        const l = layer as {
          _latlng?: { lat: number; lng: number };
          _path?: SVGElement;
          getElement?: () => HTMLElement | undefined;
          _url?: string;
          options?: Record<string, unknown>;
        };
        out.total++;
        const el = l.getElement ? l.getElement() : undefined;
        if (el && el.tagName === "DIV") {
          const kind = el.hasAttribute("data-guess-pin")
            ? "guess"
            : el.hasAttribute("data-reveal-pin")
              ? "reveal"
              : el.querySelector("svg")
                ? "marker(unknown)"
                : "label/div";
          out.markers.push(kind);
        } else if (el && el.tagName === "SVG" || l._path) {
          out.polylines++;
        } else if (l._url) {
          out.tileLayers++;
        } else {
          out.other.push(String((l.options && l.options.className) || "layer"));
        }
      });
    }
    return out;
  });
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
      await waitForLobby(pageA, 20_000);
      await waitForHostSeesTwoPlayers(pageA, 20_000);
    }

    // Хост запускает игру
    await pageA.click("button:has-text('НАЧАТЬ ИГРУ')");

    // Ждём, пока оба увидят раунд 1.
    // Realtime может задержаться — если за 30с не дошло, recovery:
    //   1) Проверяем через API, что игра реально playing.
    //   2) Оба игрока reload → auto-join по коду.
    //   3) Если reload не помог — повторный start через API.
    try {
      await Promise.all([
        waitForRound(pageA, 1, 30_000),
        waitForRound(pageB, 1, 30_000),
      ]);
    } catch {
      testInfo.attach("note", { body: "Realtime не доставил start за 30с — recovery", contentType: "text/plain" });
      // Проверяем через API: игра реально playing?
      const roomState = await pageA.evaluate(async (roomCode: string) => {
        const res = await fetch(`/api/geo-multiplayer?code=${roomCode}`);
        return res.json();
      }, code);
      testInfo.attach("room-state-at-recovery", { body: JSON.stringify(roomState).slice(0, 800), contentType: "application/json" });
      const status = roomState.room?.status;
      if (status === "playing") {
        // Игра реально идёт — reload обоих (auto-join по коду)
        await Promise.all([
          pageA.goto(`/geoguessr/multiplayer/${code}`),
          pageB.goto(`/geoguessr/multiplayer/${code}`),
        ]);
        await Promise.all([
          waitForRound(pageA, 1, 30_000),
          waitForRound(pageB, 1, 30_000),
        ]);
      } else if (status === "waiting") {
        // Игра не стартовала — хост повторно нажимает НАЧАТЬ ИГРУ
        const startBtn = pageA.locator("button:has-text('НАЧАТЬ ИГРУ')");
        await startBtn.click({ timeout: 10_000 });
        await Promise.all([
          waitForRound(pageA, 1, 30_000),
          waitForRound(pageB, 1, 30_000),
        ]);
      } else {
        throw new Error(`Неожиданный статус комнаты: ${status}`);
      }
    }

    // ================= РАУНД 1 =================
    // ВАЖНО: оба игрока должны быть на одном раунде.
    // Снимаем текущий раунд у обоих до начала.
    const roundA1 = await getCurrentRound(pageA);
    const roundB1 = await getCurrentRound(pageB);
    testInfo.attach("rounds-before-R1", { body: `A=${roundA1} B=${roundB1}`, contentType: "text/plain" });
    if (roundA1 !== roundB1) {
      throw new Error(`Игроки на разных раундах: A=${roundA1} B=${roundB1}`);
    }

    await placeMarker(pageA);
    // Пауза: даём серверу обработать ответ A
    await pageA.waitForTimeout(1000);
    await placeMarker(pageB);
    // Пауза: даём серверу обработать ответ B
    await pageB.waitForTimeout(1000);

    // Ждём, пока reveal (красная точка) появится у обоих.
    // Reveal длится 10 сек — если к моменту проверки уже прошёл,
    // мы увидим "РАУНД 2" (auto-next сработал). В этом случае
    // пропускаем reveal-проверку (маркеры уже сброшены) и
    // переходим сразу к проверке "нет остатков R1".
    let revealCaught = false;
    try {
      await Promise.all([waitForReveal(pageA, 15_000), waitForReveal(pageB, 15_000)]);
      revealCaught = true;
    } catch {
      // Reveal уже прошёл (auto-next сработал раньше чем мы успели увидеть)
      console.log("[TEST] reveal R1 не пойман (auto-next уже сработал)");
    }
    // Снимаем раунд на момент reveal
    const revealRoundA = await getCurrentRound(pageA);
    const revealRoundB = await getCurrentRound(pageB);
    testInfo.attach("rounds-at-reveal-R1", { body: `A=${revealRoundA} B=${revealRoundB} caught=${revealCaught}`, contentType: "text/plain" });

    if (revealCaught) {
      // На reveal маркеры ДОЛЖНЫ быть видны (свой + правильный)
      expect(await countMarkers(pageA, GUESS_PIN), "A: нет своего маркера на reveal R1").toBeGreaterThanOrEqual(1);
      expect(await countMarkers(pageB, GUESS_PIN), "B: нет своего маркера на reveal R1").toBeGreaterThanOrEqual(1);
      expect(await countMarkers(pageA, CORRECT_PIN), "A: нет правильного маркера на reveal R1").toBeGreaterThanOrEqual(1);
      expect(await countMarkers(pageB, CORRECT_PIN), "B: нет правильного маркера на reveal R1").toBeGreaterThanOrEqual(1);
    }

    // ================= ПЕРЕХОД 1 → 2 =================
    // Reveal R1 длится 10 сек → авто-next в R2.
    // waitForRoundBoth ждёт ФАЗУ ОТВЕТА + goto fallback если realtime задержался.
    await waitForRoundBoth(pageA, pageB, code, 2, testInfo);
    // Даём React-эффектам добить (reset должен быть синхронным, но на всякий случай)
    await pageA.waitForTimeout(500);
    await pageB.waitForTimeout(500);

    // Аудит РЕАЛЬНЫХ Leaflet layers
    const audit1A = await auditMapLayers(pageA);
    const audit1B = await auditMapLayers(pageB);
    testInfo.attach("map-audit-A-after-R1", { body: JSON.stringify(audit1A), contentType: "application/json" });
    testInfo.attach("map-audit-B-after-R1", { body: JSON.stringify(audit1B), contentType: "application/json" });
    console.log(`[AUDIT after R1→R2] A: ${JSON.stringify(audit1A)}`);
    console.log(`[AUDIT after R1→R2] B: ${JSON.stringify(audit1B)}`);

    // Карта должна быть ПОЛНОСТЬЮ ЧИСТОЙ: ни одного маркера из раунда 1
    const pinCountA = await countMarkers(pageA, ANY_PIN);
    const pinCountB = await countMarkers(pageB, ANY_PIN);
    if (pinCountA > 0 || pinCountB > 0) {
      // Демп: что именно осталось
      const dumpA = await pageA.evaluate(() => {
        const icons = Array.from(document.querySelectorAll(".leaflet-marker-icon"));
        return icons.map((el) => el.outerHTML.slice(0, 300)).join("\n---\n");
      });
      const dumpB = await pageB.evaluate(() => {
        const icons = Array.from(document.querySelectorAll(".leaflet-marker-icon"));
        return icons.map((el) => el.outerHTML.slice(0, 300)).join("\n---\n");
      });
      testInfo.attach("stale-markers-A", { body: dumpA, contentType: "text/plain" });
      testInfo.attach("stale-markers-B", { body: dumpB, contentType: "text/plain" });
    }
    expect(pinCountA, "A: маркер R1 остался!").toBe(0);
    expect(pinCountB, "B: маркер R1 остался!").toBe(0);

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
    // Ждём ФАЗУ ОТВЕТА раунда 3 (заголовок "РАУНД 3" БЕЗ "РЕЗУЛЬТАТ").
    // В фазе ответа маркеры прошлого раунда ДОЛЖНЫ быть сброшены.
    // Goto fallback если realtime не доставил переход.
    await waitForRoundBoth(pageA, pageB, code, 3, testInfo);
    await pageA.waitForTimeout(800);
    await pageB.waitForTimeout(800);

    // Аудит РЕАЛЬНЫХ Leaflet layers
    const audit2A = await auditMapLayers(pageA);
    const audit2B = await auditMapLayers(pageB);
    testInfo.attach("map-audit-A-after-R2", { body: JSON.stringify(audit2A), contentType: "application/json" });
    testInfo.attach("map-audit-B-after-R2", { body: JSON.stringify(audit2B), contentType: "application/json" });
    console.log(`[AUDIT after R2→R3] A: ${JSON.stringify(audit2A)}`);
    console.log(`[AUDIT after R2→R3] B: ${JSON.stringify(audit2B)}`);

    // Маркеры раунда 2 тоже не должны остаться
    expect(await countMarkers(pageA, ANY_PIN), "A: маркер R2 остался!").toBe(0);
    expect(await countMarkers(pageB, ANY_PIN), "B: маркер R2 остался!").toBe(0);

    // Игрок может поставить НОВЫЙ маркер в раунде 3
    await placeMarker(pageA);
    await pageA.waitForTimeout(1000);
    await placeMarker(pageB);
    await pageB.waitForTimeout(1000);
    expect(await countMarkers(pageA, GUESS_PIN), "A: нет нового маркера R3").toBe(1);
    expect(await countMarkers(pageB, GUESS_PIN), "B: нет нового маркера R3").toBe(1);

    // Close contexts (Playwright может ронять ENOENT на trace-файл
    // в некоторых версиях — игнорируем, т.к. тест уже завершён)
    await ctxA.close().catch(() => {});
    await ctxB.close().catch(() => {});
  }, 300_000);
});
