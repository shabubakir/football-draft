/**
 * CS2 case-opening sounds — real Valve audio from game files.
 * Uses Web Audio API for reliable, low-latency playback.
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

// ---------- Web Audio setup ----------
let ctx: AudioContext | null = null;
let bufferCache: Map<string, AudioBuffer> = new Map();

function getCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/**
 * Load an audio file into an AudioBuffer (cached).
 */
async function getBuffer(src: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(src);
  if (cached) return cached;
  try {
    const res = await fetch(src);
    const arrayBuf = await res.arrayBuffer();
    const audioCtx = getCtx();
    if (!audioCtx) return null;
    const buf = await audioCtx.decodeAudioData(arrayBuf);
    bufferCache.set(src, buf);
    return buf;
  } catch {
    return null;
  }
}

/**
 * Preload all sound buffers. Call once on mount.
 */
export async function preloadSounds() {
  const files = [
    "/sounds/buttonclick.wav",
    "/sounds/case_unlock.wav",
    "/sounds/case_scroll.wav",
    "/sounds/item_drop1_common.wav",
    "/sounds/item_drop2_uncommon.wav",
    "/sounds/item_drop3_rare.wav",
    "/sounds/item_drop4_mythical.wav",
    "/sounds/item_drop5_legendary.wav",
    "/sounds/case_awarded_common.wav",
    "/sounds/case_awarded_uncommon.wav",
    "/sounds/case_awarded_rare.wav",
    "/sounds/case_awarded_mythical.wav",
    "/sounds/case_awarded_ancient.wav",
  ];
  await Promise.allSettled(files.map((f) => getBuffer(f)));
}

/**
 * Play an AudioBuffer immediately (or as soon as it loads).
 */
function playBuffer(src: string, volume = 1) {
  if (muted) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;

  const doPlay = (buf: AudioBuffer) => {
    try {
      const source = audioCtx.createBufferSource();
      source.buffer = buf;
      const gain = audioCtx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(audioCtx.destination);
      source.start(0);
    } catch {
      // ignore
    }
  };

  const cached = bufferCache.get(src);
  if (cached) {
    doPlay(cached);
  } else {
    // Load in background, play when ready
    getBuffer(src).then((buf) => {
      if (buf) doPlay(buf);
    });
  }
}

// ---------- Sound mappings ----------

/** Button click (short blip) */
export function playClick() {
  playBuffer("/sounds/buttonclick.wav", 0.8);
}

/** Case unlock sound (play when spin starts) */
export function playUnlock() {
  playBuffer("/sounds/case_unlock.wav", 0.7);
}

/**
 * Single scroll tick — play once per card passing under the marker.
 * Short, percussive click. Synced with animation in the component.
 */
export function playScroll() {
  playBuffer("/sounds/case_scroll.wav", 0.35);
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
  playBuffer(sounds[tier] ?? sounds[0], 0.9);
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
  playBuffer(sounds[tier] ?? sounds[0], 0.8);
}

/**
 * Full reveal sequence: drop sound + awarded fanfare.
 * For tier 4 (knife/glove) plays the legendary/ancient fanfare.
 */
export function playFullReveal(tier: 0 | 1 | 2 | 3 | 4) {
  playReveal(tier);
  if (!muted) {
    setTimeout(() => playAwarded(tier), 600);
  }
}
