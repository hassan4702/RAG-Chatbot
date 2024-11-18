import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  messages: [],
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages(state, action) {
      state.messages = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
    },
  },
});


export const { setMessages, clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;
