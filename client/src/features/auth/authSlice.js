import { createSlice } from '@reduxjs/toolkit';

// Security model:
// - The refresh token lives in an HttpOnly cookie set by the server; JS never
//   sees it, so XSS cannot steal the session.
// - The access token is kept in memory only (this Redux store). On a page
//   reload the app silently calls /auth/refresh to get a fresh one.
// - Only the user profile is persisted, so the UI can render immediately
//   while the silent refresh runs.
const loadPersistedUser = () => {
  try {
    const raw = localStorage.getItem('authUser');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// One-time migration: older builds stored tokens in localStorage
localStorage.removeItem('auth');

const persistedUser = loadPersistedUser();

const initialState = {
  user: persistedUser,
  accessToken: null,
  isAuthenticated: false,
  // True while the app attempts a silent refresh on startup
  isBootstrapping: Boolean(persistedUser),
};

function persistUser(user) {
  if (user) {
    localStorage.setItem('authUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('authUser');
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { user, accessToken } = action.payload;
      if (user !== undefined) {
        state.user = user;
        persistUser(user);
      }
      if (accessToken !== undefined) state.accessToken = accessToken;
      state.isAuthenticated = Boolean(state.accessToken);
      state.isBootstrapping = false;
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      persistUser(state.user);
    },
    bootstrapFinished(state) {
      state.isBootstrapping = false;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isBootstrapping = false;
      persistUser(null);
    },
  },
});

export const { setCredentials, updateUser, bootstrapFinished, logout } = authSlice.actions;
export default authSlice.reducer;
