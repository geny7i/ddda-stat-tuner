import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { calculateStatus } from "../../domain";

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
