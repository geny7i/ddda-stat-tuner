export const CHARACTER_TYPES = ["arisen", "pawn"] as const;
export type CharacterType = (typeof CHARACTER_TYPES)[number];

export function isCharacterType(value: unknown): value is CharacterType {
  return value === "arisen" || value === "pawn";
}

export function assertCharacterType(
  value: unknown,
): asserts value is CharacterType {
  if (!isCharacterType(value)) {
    throw new TypeError(`不明なキャラクター種別: ${String(value)}`);
  }
}
