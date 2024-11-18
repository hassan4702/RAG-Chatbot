import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    isActive: null,
};

const isActiveSlice = createSlice({
    name: "isActive",
    initialState,
    reducers: {
        setisActive(state, action) {
            state.isActive = action.payload;
        },
        clearisActive(state) {
            state.isActive = false;
        },
    },
});


export const { setisActive, clearisActive } = isActiveSlice.actions;
export default isActiveSlice.reducer;
