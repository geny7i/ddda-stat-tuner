export const VOCATION_IDS = {
  fighter: "fighter",
  strider: "strider",
  mage: "mage",
  warrior: "warrior",
  ranger: "ranger",
  sorcerer: "sorcerer",
  assassin: "assassin",
  magick_archer: "magick_archer",
  mystic_knight: "mystic_knight",
} as const;

export type VocationId = (typeof VOCATION_IDS)[keyof typeof VOCATION_IDS];

export const VOCATIONS: readonly VocationId[] = Object.values(VOCATION_IDS);

const vocationIdSet = new Set<string>(VOCATIONS);

export function isVocationId(value: unknown): value is VocationId {
  return typeof value === "string" && vocationIdSet.has(value);
}
