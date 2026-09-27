"use client";

// ============================================================
// «Джинн» — персонаж Football Akinator
// ============================================================
// Своя интерпретация: добродушный-хитрый джинн из футбольного
// мяча. Моргает, прищуривается, жестикулирует в зависимости
// от фазы игры. Чистый SVG + CSS-анимации.
// ============================================================

export type GenieMood =
  | "idle" // стоит, смотрит
  | "thinking" // задумался (вопрос)
  | "reveal" // «Я думаю, это...»
  | "happy" // угадал!
  | "sad"; // не угадал

interface Props {
  mood: GenieMood;
  /** Размер в px (шрифт масштабируется) */
  size?: number;
  className?: string;
}

export function Genie({ mood, size = 220, className }: Props) {
  const eyeOpen = mood === "sad" ? 0.5 : 1;
  const browTilt = mood === "thinking" ? -6 : mood === "reveal" ? 4 : 0;
  const mouthPath =
    mood === "happy"
      ? "M 88 138 Q 110 158 132 138" // широкая улыбка
      : mood === "sad"
        ? "M 92 148 Q 110 138 128 148" // грустная
        : mood === "reveal"
          ? "M 100 144 Q 110 150 120 144" // хитрая улыбка
          : "M 96 142 Q 110 148 124 142"; // лёгкая

  const handUp = mood === "reveal" || mood === "happy";

  return (
    <div
      className={`genie-wrap ${className ?? ""}`}
      style={{ width: size, height: size * 0.95 }}
    >
      <svg
        viewBox="0 0 220 209"
        width={size}
        height={size * 0.95}
        aria-hidden="true"
      >
        {/* Аура / волшебный дым */}
        <ellipse
          cx="110"
          cy="180"
          rx="85"
          ry="18"
          fill="url(#genieShadow)"
          opacity="0.5"
        />
        <defs>
          <radialGradient id="genieShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="genieBall" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#f5f3ff" />
            <stop offset="60%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#a78bfa" />
          </radialGradient>
          <linearGradient id="genieTorch" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Искры вокруг (только в happy/reveal) */}
        {(mood === "happy" || mood === "reveal") && (
          <g className="genie-sparks">
            <circle cx="35" cy="50" r="3" fill="#fbbf24">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="185" cy="40" r="4" fill="#a78bfa">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="200" cy="120" r="3" fill="#fbbf24">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="18" cy="120" r="3" fill="#f59e0b">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* Тело-мяч (футбольный, но волшебный) */}
        <g className="genie-body">
          <circle cx="110" cy="110" r="72" fill="url(#genieBall)" />
          {/* Пятиугольники футбольного мяча */}
          <g opacity="0.18" fill="#4c1d95">
            <polygon points="110,48 124,58 119,74 101,74 96,58" />
            <polygon points="55,105 67,98 76,110 67,122 54,118" />
            <polygon points="165,105 176,118 163,122 154,110" />
            <polygon points="80,160 94,154 102,166 92,178 78,174" />
            <polygon points="140,160 154,174 142,178 132,166" />
          </g>
          {/* Швы мяча */}
          <g
            stroke="#7c3aed"
            strokeWidth="1.5"
            opacity="0.25"
            fill="none"
          >
            <path d="M110 48 L119 74 M110 48 L96 58" />
            <path d="M55 105 L67 98 M55 105 L54 118" />
            <path d="M165 105 L154 110 M165 105 L176 118" />
          </g>
          {/* Блик */}
          <ellipse
            cx="88"
            cy="82"
            rx="20"
            ry="12"
            fill="#ffffff"
            opacity="0.55"
            transform="rotate(-20 88 82)"
          />
        </g>

        {/* Платок-турбан (джинн) */}
        <g className="genie-turban">
          <path
            d="M 42 78 Q 60 40 110 38 Q 160 40 178 78 Q 150 62 110 60 Q 70 62 42 78 Z"
            fill="#7c3aed"
          />
          <path
            d="M 42 78 Q 70 62 110 60 Q 150 62 178 78 Q 150 74 110 73 Q 70 74 42 78 Z"
            fill="#6d28d9"
          />
          {/* Перо на турбане */}
          <path
            d="M 110 38 Q 118 18 132 14 Q 124 30 122 40 Z"
            fill="#fbbf24"
          />
          {/* Застёжка */}
          <circle cx="110" cy="52" r="5" fill="#fbbf24" />
          <circle cx="110" cy="52" r="2.5" fill="#f59e0b" />
        </g>

        {/* Глаза */}
        <g className="genie-eyes">
          {/* Брови */}
          <path
            d={`M 78 88 Q 90 84 ${98 + browTilt / 3} 88`}
            stroke="#312e81"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${browTilt} 88 88)`}
          />
          <path
            d={`M 122 88 Q 130 84 ${142 - browTilt / 3} 88`}
            stroke="#312e81"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${-browTilt} 132 88)`}
          />
          {/* Белки + зрачки (хитрый прищур при thinking/reveal) */}
          <g
            style={{
              transformOrigin: "110px 100px",
              transform: `scaleY(${eyeOpen})`,
              transition: "transform 0.3s ease",
            }}
          >
            <ellipse cx="88" cy="100" rx="11" ry="11" fill="#ffffff" />
            <ellipse cx="132" cy="100" rx="11" ry="11" fill="#ffffff" />
            <circle cx="90" cy="101" r="5" fill="#312e81" />
            <circle cx="134" cy="101" r="5" fill="#312e81" />
            <circle cx="92" cy="99" r="1.8" fill="#ffffff" />
            <circle cx="136" cy="99" r="1.8" fill="#ffffff" />
          </g>
          {/* Веки прищур */}
          {(mood === "thinking" || mood === "reveal") && (
            <path
              d="M 77 96 Q 88 92 99 96 M 121 96 Q 132 92 143 96"
              stroke="#312e81"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </g>

        {/* Нос */}
        <ellipse cx="110" cy="116" rx="6" ry="4.5" fill="#c4b5fd" />

        {/* Рот */}
        <path
          d={mouthPath}
          stroke="#312e81"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {mood === "happy" && (
          <path
            d="M 98 140 Q 110 152 122 140 Q 110 146 98 140 Z"
            fill="#f87171"
            opacity="0.7"
          />
        )}

        {/* Руки (появляются в reveal/happy) */}
        <g
          className="genie-hands"
          style={{
            opacity: handUp ? 1 : 0,
            transform: handUp
              ? "translateY(0px)"
              : "translateY(12px)",
            transition: "all 0.4s ease",
          }}
        >
          {/* Левая рука — машет */}
          <g className={mood === "happy" ? "genie-hand-wave" : ""}>
            <path
              d="M 40 130 Q 22 122 18 104 Q 30 108 38 118 Z"
              fill="#a78bfa"
            />
            <circle cx="19" cy="103" r="7" fill="#c4b5fd" />
          </g>
          {/* Правая рука — поднимает */}
          <g
            className={mood === "happy" ? "genie-hand-wave-r" : ""}
          >
            <path
              d="M 180 130 Q 198 118 202 100 Q 190 106 182 118 Z"
              fill="#a78bfa"
            />
            <circle cx="201" cy="99" r="7" fill="#c4b5fd" />
          </g>
        </g>
      </svg>

      {/* CSS-анимации (не встраиваем в SVG — чтобы работало со всеми mood) */}
      <style>{`
        .genie-wrap {
          position: relative;
          animation: genieFloat 3.2s ease-in-out infinite;
        }
        .genie-wrap svg {
          display: block;
          width: 100%;
          height: 100%;
        }
        @keyframes genieFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes handWave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-14deg); }
          75% { transform: rotate(10deg); }
        }
        .genie-hand-wave {
          transform-origin: 38px 130px;
          animation: handWave 1.1s ease-in-out infinite;
        }
        .genie-hand-wave-r {
          transform-origin: 182px 130px;
          animation: handWave 1.1s ease-in-out infinite reverse;
        }
        @keyframes thinkingBob {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
      `}</style>
    </div>
  );
}
