import {
  searchRoundingAdjustment,
  type CharacterInfo,
  type RoundingMultiple,
} from "../../domain";

self.onmessage = (
  event: MessageEvent<{ character: CharacterInfo; multiple: RoundingMultiple }>,
) => {
  const { character, multiple } = event.data;
  self.postMessage(searchRoundingAdjustment(character, multiple));
};
