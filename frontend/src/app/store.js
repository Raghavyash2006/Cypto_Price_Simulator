import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import gamificationReducer from '../features/gamification/gamificationSlice';
import uiReducer from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    gamification: gamificationReducer,
    ui: uiReducer
  }
});