import { configureStore } from "@reduxjs/toolkit";
import { editorReducer } from "../features/pathEditor/editorSlice";

export function createAppStore() {
  return configureStore({ reducer: { editor: editorReducer } });
}

export const store = createAppStore();
export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
