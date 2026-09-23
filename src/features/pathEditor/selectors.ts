import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import {
  calculateStatus,
  getComparisonRows,
  getLevelRangeById,
} from "../../domain";

export const selectEditorState = (state: RootState) => state.editor;

export const selectCharacterInfo = createSelector(
  [selectEditorState],
  ({ path, weightClass }) => ({ vocationPath: path, weightClass }),
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

export const selectComparisonRows = createSelector(
  [
    (state: RootState) => state.editor.activeRange,
    (state: RootState) => state.editor.focusedStats,
  ],
  (rangeId, focusedStats) =>
    getComparisonRows(getLevelRangeById(rangeId), focusedStats),
);
