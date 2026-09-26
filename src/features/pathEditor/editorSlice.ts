import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  addToPath,
  adjustPath,
  type CharacterInfo,
  type CharacterType,
  assertCharacterType,
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
  revision: number;
  resetId: number;
  characterType: CharacterType;
  path: VocationPath;
  weightClass: WeightClass;
  activeRange: LevelRangeId;
  focusedStats: StatId[];
};

const initialState: EditorState = {
  revision: 0,
  resetId: 0,
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
    switchCharacterType(state, action: PayloadAction<CharacterType>) {
      assertCharacterType(action.payload);
      if (state.characterType === action.payload) return;
      state.characterType = action.payload;
      for (const { id } of LEVEL_RANGES) state.path[id] = [];
      state.activeRange = "onlyLv1";
      state.revision++;
      state.resetId++;
    },
    setActiveRange(state, action: PayloadAction<LevelRangeId>) {
      state.activeRange = action.payload;
    },
    setWeightClass(state, action: PayloadAction<WeightClass>) {
      if (state.weightClass === action.payload) return;
      state.weightClass = action.payload;
      state.revision++;
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
      state.revision++;
      state.resetId++;
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
      if (next !== state.path) {
        state.path[range] = [...next[range]];
        state.revision++;
      }
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
      if (next !== state.path) {
        state.path[range] = [...next[range]];
        state.revision++;
      }
    },
    removeStep(
      state,
      action: PayloadAction<{ range: LevelRangeId; vocation: VocationId }>,
    ) {
      const { range, vocation } = action.payload;
      const next = removeFromPath(state.path, range, vocation);
      if (next !== state.path) {
        state.path[range] = [...next[range]];
        state.revision++;
      }
    },
    removeAllSteps(
      state,
      action: PayloadAction<{ range: LevelRangeId; vocation: VocationId }>,
    ) {
      const { range, vocation } = action.payload;
      const next = removeAllFromPath(state.path, range, vocation);
      if (next !== state.path) {
        state.path[range] = [...next[range]];
        state.revision++;
      }
    },
    applyAdjustment(state, action: PayloadAction<PathAdjustmentRequest>) {
      const result = adjustPath(
        state.path,
        action.payload,
        state.characterType,
      );
      if (result.changedCount === 0) return;
      state.revision++;
      for (const { id } of LEVEL_RANGES) state.path[id] = [...result.path[id]];
    },
    applyRoundingAdjustment(
      state,
      action: PayloadAction<{
        expected: CharacterInfo;
        expectedRevision: number;
        path: VocationPath;
      }>,
    ) {
      if (state.revision !== action.payload.expectedRevision) return;
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
      state.revision++;
      for (const { id } of LEVEL_RANGES) {
        state.path[id] = [...path[id]];
      }
    },
  },
});

export const {
  switchCharacterType,
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
