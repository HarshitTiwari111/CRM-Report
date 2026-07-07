import { createSlice } from '@reduxjs/toolkit';

const loadPersistedAuth = () => {
  try {
    const raw = localStorage.getItem('auth');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const persisted = loadPersistedAuth();

const initialState = {
  user: persisted?.user || null,
  accessToken: persisted?.accessToken || null,
  refreshToken: persisted?.refreshToken || null,
  isAuthenticated: Boolean(persisted?.accessToken),
};

function persist(state) {
  localStorage.setItem(
    'auth',
    JSON.stringify({
      user: state.user,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
    })
  );
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { user, accessToken, refreshToken } = action.payload;
      if (user !== undefined) state.user = user;
      if (accessToken !== undefined) state.accessToken = accessToken;
      if (refreshToken !== undefined) state.refreshToken = refreshToken;
      state.isAuthenticated = Boolean(state.accessToken);
      persist(state);
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      persist(state);
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('auth');
    },
  },
});

export const { setCredentials, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
