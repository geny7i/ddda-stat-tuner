import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import {
  calculateStatus,
  countUnfilledLevels,
  getComparisonRows,
  getLevelRangeById,
} from "../../domain";

export const selectEditorState = (state: RootState) => state.editor;

export const selectCharacterInfo = createSelector(
  [selectEditorState],
  ({ path, weightClass, characterType }) => ({
    vocationPath: path,
    weightClass,
    characterType,
  }),
);

export const selectCurrentStatus = createSelector(
  [selectCharacterInfo],
  calculateStatus,
);

export const selectCurrentLevel = createSelector(
  [selectEditorState],
  ({ path }) =>
    Object.values(path).reduce((sum, steps) => sum + steps.length, 0),
);

export const selectUnfilledCount = createSelector(
  [(state: RootState) => state.editor.path],
  countUnfilledLevels,
);

export const selectComparisonRows = createSelector(
  [
    (state: RootState) => state.editor.activeRange,
    (state: RootState) => state.editor.focusedStats,
    (state: RootState) => state.editor.characterType,
  ],
  (rangeId, focusedStats, characterType) =>
    getComparisonRows(getLevelRangeById(rangeId), focusedStats, characterType),
);
