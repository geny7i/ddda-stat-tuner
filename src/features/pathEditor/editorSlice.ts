import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  addToPath,
  adjustPath,
  type CharacterInfo,
  type CharacterType,
  validateCharacterInfo,
  validateVocationPath,
  LEVEL_RANGES,
  removeAllFromPath,
  removeFromPath,
  replaceInPath,
  type LevelRangeId,
  type PathAdjustmentRequest,
  type VocationId,
  type VocationPath,
  STAT_IDS,
  type StatId,
  type WeightClass,
} from "../../domain";

export type EditorState = {
  characterType: CharacterType;
  path: VocationPath;
  weightClass: WeightClass;
  activeRange: LevelRangeId;
  focusedStats: StatId[];
};

const initialState: EditorState = {
  characterType: "arisen",
  path: { onlyLv1: [], forLv10: [], forLv100: [], forLv200: [] },
  weightClass: "m",
  activeRange: "onlyLv1",
  focusedStats: [...STAT_IDS],
};

const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    setActiveRange(state, action: PayloadAction<LevelRangeId>) {
      state.activeRange = action.payload;
    },
    setWeightClass(state, action: PayloadAction<WeightClass>) {
      state.weightClass = action.payload;
    },
    toggleFocusedStat(state, action: PayloadAction<StatId>) {
      const index = state.focusedStats.indexOf(action.payload);
      if (index < 0) state.focusedStats.push(action.payload);
      else state.focusedStats.splice(index, 1);
    },
    restoreCharacter(state, action: PayloadAction<CharacterInfo>) {
      const { vocationPath, weightClass, characterType } =
        validateCharacterInfo(action.payload);
      state.characterType = characterType;
      state.weightClass = weightClass;
      for (const { id } of LEVEL_RANGES) state.path[id] = [...vocationPath[id]];
      state.activeRange =
        LEVEL_RANGES.find(({ id }) => vocationPath[id].length > 0)?.id ??
        "onlyLv1";
    },
    addSteps(
      state,
      action: PayloadAction<{
        range: LevelRangeId;
        vocation: VocationId;
        count: number;
      }>,
    ) {
      const { range, vocation, count } = action.payload;
      const next = addToPath(
        state.path,
        range,
        vocation,
        count,
        state.characterType,
      );
      if (next !== state.path) state.path[range] = [...next[range]];
    },
    replaceStep(
      state,
      action: PayloadAction<{
        range: LevelRangeId;
        source: VocationId;
        target: VocationId;
      }>,
    ) {
      const { range, source, target } = action.payload;
      const next = replaceInPath(
        state.path,
        range,
        source,
        target,
        state.characterType,
      );
      if (next !== state.path) state.path[range] = [...next[range]];
    },
    removeStep(
      state,
      action: PayloadAction<{ range: LevelRangeId; vocation: VocationId }>,
    ) {
      const { range, vocation } = action.payload;
      const next = removeFromPath(state.path, range, vocation);
      if (next !== state.path) state.path[range] = [...next[range]];
    },
    removeAllSteps(
      state,
      action: PayloadAction<{ range: LevelRangeId; vocation: VocationId }>,
    ) {
      const { range, vocation } = action.payload;
      const next = removeAllFromPath(state.path, range, vocation);
      if (next !== state.path) state.path[range] = [...next[range]];
    },
    applyAdjustment(state, action: PayloadAction<PathAdjustmentRequest>) {
      const result = adjustPath(
        state.path,
        action.payload,
        state.characterType,
      );
      if (result.changedCount === 0) return;
      for (const { id } of LEVEL_RANGES) state.path[id] = [...result.path[id]];
    },
    applyRoundingAdjustment(
      state,
      action: PayloadAction<{ expected: CharacterInfo; path: VocationPath }>,
    ) {
      if (state.characterType !== action.payload.expected.characterType) return;
      if (state.weightClass !== action.payload.expected.weightClass) return;
      for (const { id } of LEVEL_RANGES) {
        const current = state.path[id];
        const expected = action.payload.expected.vocationPath[id];
        if (
          current.length !== expected.length ||
          current.some((vocation, index) => vocation !== expected[index])
        )
          return;
      }
      const path = validateVocationPath(
        action.payload.path,
        state.characterType,
      );
      for (const { id } of LEVEL_RANGES) {
        state.path[id] = [...path[id]];
      }
    },
  },
});

export const {
  setActiveRange,
  setWeightClass,
  toggleFocusedStat,
  restoreCharacter,
  addSteps,
  replaceStep,
  removeStep,
  removeAllSteps,
  applyAdjustment,
  applyRoundingAdjustment,
} = editorSlice.actions;
export const editorReducer = editorSlice.reducer;
