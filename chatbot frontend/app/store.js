import { configureStore } from '@reduxjs/toolkit';
import messagesReducer from './features/messagesSlice';
import isActiveReducer from './features/isActiveSlice';
import updateSidebarReducer from './features/updateSidebarSlice';

const store = configureStore({
  reducer: {
    messages: messagesReducer,
    isActive: isActiveReducer,
    updateSidebar: updateSidebarReducer
  },
});

export default store;