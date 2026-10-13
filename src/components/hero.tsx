"use client";

// ============================================================
// HERO — full-screen hero section (self-contained)
// Dark luxury-football theme: background video, giant
// headline, bottom-left copy. No other content.
// ============================================================

import { useEffect, useRef } from "react";
import Link from "next/link";
import "./hero.css";

const VIDEO_SRC =
  "https://cdn.sceneai.art/Hero section video file (2)/37091057-3719-4207-815c-745ebf57aeb4.mp4";

const GRADIENT_OVERLAY =
  "linear-gradient(180deg, rgba(8,8,10,0.55) 0%, rgba(8,8,10,0.15) 30%, rgba(8,8,10,0.25) 55%, rgba(8,8,10,0.92) 100%)";

// Пункты меню: реальные маршруты сайта, в духе промпта
const NAV_LINKS = [
  { href: "/", label: "Игры", active: true },
  { href: "/leaderboard", label: "Рейтинг", active: false },
  { href: "/quiz/online", label: "Викторина", active: false },
  { href: "/login", label: "Профиль", active: false },
];

export function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Непрерывное воспроизведение видео: play() на mount, на каждом
  // "pause"/"ended"/"loadedmetadata"/"canplay", при возврате на вкладку
  // (visibilitychange) и раз в секунду watchdog-интервалом.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const play = () => {
      try {
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        /* ignore */
      }
    };

    play();
    const interval = setInterval(() => {
      if (video.paused) play();
    }, 1000);

    const resume = () => {
      if (document.visibilityState === "visible") play();
    };

    video.addEventListener("pause", play);
    video.addEventListener("ended", play);
    video.addEventListener("loadedmetadata", play);
    video.addEventListener("canplay", play);
    document.addEventListener("visibilitychange", resume);

    return () => {
      clearInterval(interval);
      video.removeEventListener("pause", play);
      video.removeEventListener("ended", play);
      video.removeEventListener("loadedmetadata", play);
      video.removeEventListener("canplay", play);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  return (
    <section className="hero">
      <video
        ref={videoRef}
        className="hero__video"
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      <div className="hero__overlay" style={{ background: GRADIENT_OVERLAY }} />

      {/* Navbar */}
      <nav className="hero__nav">
        <div className="hero__nav-links">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`hero__nav-link${l.active ? " is-active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <a href="/" className="hero__logo">
          FOOTBALL&nbsp;DRAFT
        </a>
        <Link href="/grid/online" className="hero__browse">
          Создать комнату <span>→</span>
        </Link>
      </nav>

      {/* Giant headline */}
      <h1 className="hero__headline">DRAFT</h1>

      {/* Bottom-left copy */}
      <div className="hero__copy">
        <h2 className="hero__heading">
          Сыграй в футбольные игры с друзьями сегодня
        </h2>
        <p className="hero__text">
          Онлайн-игры без регистрации: сетка 9, викторины и рейтинги — создай
          комнату, скинь код другу и выходи на поле через минуту.
        </p>
        <Link href="/grid/online" className="hero__cta">
          ИГРАТЬ СЕЙЧАС <span>↗</span>
        </Link>
      </div>
    </section>
  );
}
