import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  addToPath,
  adjustPath,
  type CharacterInfo,
  LEVEL_RANGES,
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
  path: VocationPath;
  weightClass: WeightClass;
  activeRange: LevelRangeId;
  focusedStats: StatId[];
};

const initialState: EditorState = {
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
      const { vocationPath, weightClass } = action.payload;
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
      const next = addToPath(state.path, range, vocation, count);
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
      const next = replaceInPath(state.path, range, source, target);
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
    applyAdjustment(state, action: PayloadAction<PathAdjustmentRequest>) {
      const result = adjustPath(state.path, action.payload);
      if (result.changedCount === 0) return;
      for (const { id } of LEVEL_RANGES) state.path[id] = [...result.path[id]];
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
  applyAdjustment,
} = editorSlice.actions;
export const editorReducer = editorSlice.reducer;
