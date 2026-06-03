import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchCurrentUserRequest,
  loginRequest,
  logoutRequest,
  refreshAuthRequest,
  registerRequest
} from '../../services/authApi';

const tokenKey = 'crypto-sim-token';
const userKey = 'crypto-sim-user';

function readStoredUser() {
  try {
    const serializedUser = localStorage.getItem(userKey);
    return serializedUser ? JSON.parse(serializedUser) : null;
  } catch {
    return null;
  }
}

function persistAuth(user, token) {
  if (token) {
    localStorage.setItem(tokenKey, token);
  }

  if (user) {
    localStorage.setItem(userKey, JSON.stringify(user));
  }
}

function clearAuthStorage() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

const initialState = {
  user: readStoredUser(),
  token: localStorage.getItem(tokenKey),
  isBootstrapping: true,
  status: 'idle',
  error: null
};

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, thunkAPI) => {
  try {
    const payload = {
      ...credentials,
      email: String(credentials.email || '').trim().toLowerCase()
    };
    console.debug('[auth] dispatch loginUser', { email: payload.email });
    return await loginRequest(payload);
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Unable to login'));
  }
});

export const registerUser = createAsyncThunk('auth/registerUser', async (payload, thunkAPI) => {
  try {
    const normalizedPayload = {
      ...payload,
      email: String(payload.email || '').trim().toLowerCase()
    };
    console.debug('[auth] dispatch registerUser', { email: normalizedPayload.email });
    return await registerRequest(normalizedPayload);
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Unable to register'));
  }
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, thunkAPI) => {
  try {
    return await fetchCurrentUserRequest();
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Unable to load profile'));
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, thunkAPI) => {
  try {
    return await logoutRequest();
  } catch (error) {
    return thunkAPI.rejectWithValue(getErrorMessage(error, 'Unable to logout'));
  }
});

export const bootstrapAuth = createAsyncThunk('auth/bootstrapAuth', async (_, thunkAPI) => {
  const state = thunkAPI.getState();
  const storedToken = state?.auth?.token || localStorage.getItem(tokenKey);

  try {
    console.debug('[auth] bootstrap: checking current session', { hasStoredToken: Boolean(storedToken) });
    const currentUserResponse = await fetchCurrentUserRequest();
    return { user: currentUserResponse.user, accessToken: storedToken };
  } catch (error) {
    console.debug('[auth] bootstrap: /me failed, trying refresh', {
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message
    });

    try {
      return await refreshAuthRequest();
    } catch (refreshError) {
      return thunkAPI.rejectWithValue(getErrorMessage(refreshError, 'Unable to refresh session'));
    }
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      state.status = 'idle';
      state.isBootstrapping = false;
      clearAuthStorage();
    }
  },
  extraReducers(builder) {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.isBootstrapping = true;
        state.error = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isBootstrapping = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken || state.token;
        persistAuth(action.payload.user, action.payload.accessToken || state.token);
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        state.isBootstrapping = false;
        state.status = 'idle';
        state.error = null;
        state.user = null;
        state.token = null;
        clearAuthStorage();
        console.debug('[auth] bootstrap failed, cleared stale session', action.payload);
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.isBootstrapping = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isBootstrapping = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        persistAuth(action.payload.user, action.payload.accessToken);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.isBootstrapping = false;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.isBootstrapping = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        persistAuth(action.payload.user, action.payload.accessToken);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        persistAuth(action.payload.user, state.token);
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'idle';
        state.error = null;
        state.isBootstrapping = false;
        clearAuthStorage();
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'idle';
        state.error = null;
        state.isBootstrapping = false;
        clearAuthStorage();
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;