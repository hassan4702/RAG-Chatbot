import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  updateSidebar: false,
};

const updateSidebarSlice = createSlice({
  name: "updateSidebar",
  initialState,
  reducers: {
    setupdateSidebar(state, action) {
      state.updateSidebar = action.payload;
    },
    clearupdateSidebar(state) {
      state.updateSidebar = false;
    },
    toggleupdateSidebar(state) {
      state.updateSidebar = !state.updateSidebar;
    },
  },
});

export const { setupdateSidebar, clearupdateSidebar, toggleupdateSidebar } =
  updateSidebarSlice.actions;
export default updateSidebarSlice.reducer;
