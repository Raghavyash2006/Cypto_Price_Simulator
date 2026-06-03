import { createSlice } from '@reduxjs/toolkit';

function getStoredTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedTheme = window.localStorage.getItem('crypto-sim-theme');
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    theme: getStoredTheme()
  },
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
    setTheme(state, action) {
      state.theme = action.payload === 'light' ? 'light' : 'dark';
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    }
  }
});

export const { toggleSidebar, closeSidebar, setTheme, toggleTheme } = uiSlice.actions;
export default uiSlice.reducer;