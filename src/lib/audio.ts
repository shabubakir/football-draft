/**
 * CS2 case-opening sounds — real Valve audio from game files.
 * Sound files in /public/sounds/ (from caseopeningsimulator.com).
 */

// ---------- Mute state ----------
let muted = false;

export function setMuted(v: boolean) {
  muted = v;
}

export function isMuted() {
  return muted;
}

// ---------- Audio element pool ----------
const pool: Record<string, HTMLAudioElement | null> = {};

function getAudio(src: string): HTMLAudioElement | null {
  if (pool[src]) return pool[src];
  try {
    const el = new Audio(src);
    el.preload = "auto";
    pool[src] = el;
    return el;
  } catch {
    return null;
  }
}

function play(src: string, volume = 1, rate = 1) {
  if (muted) return;
  const el = getAudio(src);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = volume;
    el.playbackRate = rate;
    el.play().catch(() => {});
  } catch {
    // ignore
  }
}

// ---------- Sound mappings ----------

/** Button click (short blip) */
export function playClick() {
  play("/sounds/buttonclick.wav", 0.8);
}

/** Case unlock sound (play when spin starts) */
export function playUnlock() {
  play("/sounds/case_unlock.wav", 0.7);
}

/**
 * Single scroll tick — play once per card passing under the marker.
 * Short, percussive click. Synced with animation in the component.
 */
export function playScroll() {
  play("/sounds/case_scroll.wav", 0.4);
}

/**
 * Item reveal sound based on rarity tier.
 * tier: 0=Mil-Spec, 1=Restricted, 2=Classified, 3=Covert, 4=Rare Special (knife/glove)
 */
export function playReveal(tier: 0 | 1 | 2 | 3 | 4) {
  const sounds: Record<number, string> = {
    0: "/sounds/item_drop1_common.wav",
    1: "/sounds/item_drop2_uncommon.wav",
    2: "/sounds/item_drop3_rare.wav",
    3: "/sounds/item_drop4_mythical.wav",
    4: "/sounds/item_drop5_legendary.wav",
  };
  play(sounds[tier] ?? sounds[0], 0.9);
}

/**
 * Case awarded sound (bigger reveal fanfare) — for knife/glove drops.
 */
export function playAwarded(tier: 0 | 1 | 2 | 3 | 4) {
  const sounds: Record<number, string> = {
    0: "/sounds/case_awarded_common.wav",
    1: "/sounds/case_awarded_uncommon.wav",
    2: "/sounds/case_awarded_rare.wav",
    3: "/sounds/case_awarded_mythical.wav",
    4: "/sounds/case_awarded_ancient.wav",
  };
  play(sounds[tier] ?? sounds[0], 0.8);
}

/**
 * Full reveal sequence: drop sound + awarded fanfare.
 * For tier 4 (knife/glove) plays the legendary/ancient fanfare.
 */
export function playFullReveal(tier: 0 | 1 | 2 | 3 | 4) {
  playReveal(tier);
  // Slight delay for the fanfare to feel like a "boom"
  if (!muted) {
    setTimeout(() => playAwarded(tier), 600);
  }
}
