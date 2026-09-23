import { serializeCharacter, type CharacterInfo } from "../../domain";

export function buildShareUrl(
  character: CharacterInfo,
  currentUrl: string,
): string {
  const url = new URL(currentUrl);
  const params = new URLSearchParams({ c: serializeCharacter(character) });
  url.hash = `/restore?${params.toString()}`;
  return url.toString();
}
