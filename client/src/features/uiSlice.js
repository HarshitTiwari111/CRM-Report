import { createSlice } from '@reduxjs/toolkit';

const getInitialTheme = () => {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    theme: getInitialTheme(),
    settingsModalOpen: false,
  },
  reducers: {
    openSidebar(state) {
      state.sidebarOpen = true;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme(state, action) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    openSettingsModal(state) {
      state.settingsModalOpen = true;
    },
    closeSettingsModal(state) {
      state.settingsModalOpen = false;
    },
  },
});

export const {
  openSidebar,
  closeSidebar,
  toggleSidebar,
  setTheme,
  toggleTheme,
  openSettingsModal,
  closeSettingsModal,
} = uiSlice.actions;
export default uiSlice.reducer;
