// Persistent money and upgrades — survives across raids.
// Separate from GameState so the shop UI and tests can import it
// without pulling in the Three.js module graph.

export type UpgradeId =
  | "stamina"
  | "flashlight"
  | "battery"
  | "health"
  | "speed"
  | "capacity";

export interface UpgradeDef {
  name: string; // Russian
  cost: number;
  desc: string;
  maxLevel: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  stamina: {
    name: "Выносливость",
    cost: 2000,
    desc: "+25% к максимуму выносливости за уровень",
    maxLevel: 3,
  },
  flashlight: {
    name: "Фонарик",
    cost: 1500,
    desc: "Усиленный фонарик: +40% яркость и дальность",
    maxLevel: 1,
  },
  battery: {
    name: "Батарея",
    cost: 1000,
    desc: "+50% к ёмкости батареи фонарика за уровень",
    maxLevel: 3,
  },
  health: {
    name: "Броня",
    cost: 3000,
    desc: "Монстр должен бить дольше, чтобы убить (буфер)",
    maxLevel: 1,
  },
  speed: {
    name: "Скорость",
    cost: 2500,
    desc: "+10% к скорости передвижения за уровень",
    maxLevel: 3,
  },
  capacity: {
    name: "Рюкзак",
    cost: 4000,
    desc: "+20 кг к пределу переноски за уровень",
    maxLevel: 3,
  },
};

export interface EconomyState {
  money: number;
  raidLevel: number;
  upgrades: Record<UpgradeId, number>;
  totalEarned: number;
  raidsWon: number;
  raidsLost: number;
  bestExtraction: number;
}

const STORAGE_KEY = "maze-extract-save";

function defaultEconomy(): EconomyState {
  return {
    money: 0,
    raidLevel: 1,
    upgrades: {
      stamina: 0,
      flashlight: 0,
      battery: 0,
      health: 0,
      speed: 0,
      capacity: 0,
    },
    totalEarned: 0,
    raidsWon: 0,
    raidsLost: 0,
    bestExtraction: 0,
  };
}

export function loadEconomy(): EconomyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const def = defaultEconomy();
      return {
        money: saved.money ?? 0,
        raidLevel: Math.max(1, saved.raidLevel ?? 1),
        upgrades: { ...def.upgrades, ...(saved.upgrades ?? {}) },
        totalEarned: saved.totalEarned ?? 0,
        raidsWon: saved.raidsWon ?? 0,
        raidsLost: saved.raidsLost ?? 0,
        bestExtraction: saved.bestExtraction ?? 0,
      };
    }
  } catch {}
  return defaultEconomy();
}

export function saveEconomy(e: EconomyState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(e));
  } catch {}
}

/**
 * Attempt to buy an upgrade. Returns the updated EconomyState on success,
 * null if the player can't afford it or it's already maxed.
 */
export function buyUpgrade(
  e: EconomyState,
  id: UpgradeId
): EconomyState | null {
  const def = UPGRADES[id];
  const current = e.upgrades[id] ?? 0;
  if (current >= def.maxLevel) return null;
  // Cost scales ×2 per level purchased
  const cost = def.cost * Math.pow(2, current);
  if (e.money < cost) return null;
  return {
    ...e,
    money: e.money - cost,
    upgrades: { ...e.upgrades, [id]: current + 1 },
  };
}

/** Cost of the next level of an upgrade (for UI display). */
export function upgradeCost(e: EconomyState, id: UpgradeId): number {
  const current = e.upgrades[id] ?? 0;
  return UPGRADES[id].cost * Math.pow(2, current);
}
