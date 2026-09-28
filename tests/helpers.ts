// Общие хелперы для QA-тестов
export const ROUTES = [
  "/",
  "/draft",
  "/guess",
  "/career",
  "/quiz/online",
  "/grid/day",
  "/grid/online",
  "/akinator",
  "/geoguessr",
  "/geoguessr/multiplayer",
  "/cs2",
  "/cs2/aim",
  "/cs2/higher-lower",
  "/cs2/map-guess",
  "/cs2/battle",
  "/reaction-test",
  "/login",
  "/register",
  "/profile",
  "/settings",
  "/leaderboard",
  "/legal",
] as const;

// Собирает console errors + page errors во время теста
export function attachConsole(page: import("@playwright/test").Page, sink: { errors: string[]; warnings: string[] }) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      // Игнорируем безобидные: favicon, CORS на шрифты и т.п.
      const t = msg.text();
      if (t.includes("favicon")) return;
      sink.errors.push(t);
    } else if (msg.type() === "warning") {
      sink.warnings.push(msg.text());
    }
  });
  page.on("pageerror", (err) => sink.errors.push("PAGEERROR: " + err.message));
  page.on("requestfailed", (req) => {
    const f = req.failure()?.errorText ?? "";
    if (f && !f.includes("net::ERR_ABORTED")) {
      sink.errors.push(`REQFAIL ${req.method()} ${req.url()} → ${f}`);
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().includes("/api/")) {
      sink.errors.push(`API ${res.status()} ${res.url()}`);
    }
  });
}

// Фiltр: исключает из "критических" известные безобидные ошибки
export function filterCritical(errs: string[]): string[] {
  return errs.filter((e) => !/favicon|404 .*\/_next\/static/i.test(e));
}
