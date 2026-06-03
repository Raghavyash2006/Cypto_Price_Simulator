import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  claimDailyStreak,
  claimGamificationReward,
  fetchGamificationLeaderboard,
  fetchGamificationOverview
} from '../../services/gamificationApi';

export const loadGamificationOverview = createAsyncThunk('gamification/loadOverview', async (_, thunkAPI) => {
  try {
    return await fetchGamificationOverview();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to load gamification data');
  }
});

export const loadGamificationLeaderboard = createAsyncThunk('gamification/loadLeaderboard', async (limit, thunkAPI) => {
  try {
    const options = typeof limit === 'number' ? { limit } : (limit || {});
    return await fetchGamificationLeaderboard(options.limit, options.sortBy);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to load leaderboard');
  }
});

export const claimStreak = createAsyncThunk('gamification/claimStreak', async (_, thunkAPI) => {
  try {
    return await claimDailyStreak();
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to claim streak');
  }
});

export const claimReward = createAsyncThunk('gamification/claimReward', async ({ rewardType, rewardKey }, thunkAPI) => {
  try {
    return await claimGamificationReward(rewardType, rewardKey);
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Unable to claim reward');
  }
});

const initialState = {
  overview: null,
  leaderboard: [],
  status: 'idle',
  leaderboardStatus: 'idle',
  rewardStatus: 'idle',
  error: null,
  lastReward: null
};

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    clearLastReward(state) {
      state.lastReward = null;
    }
  },
  extraReducers(builder) {
    builder
      .addCase(loadGamificationOverview.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadGamificationOverview.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.overview = action.payload;
      })
      .addCase(loadGamificationOverview.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(loadGamificationLeaderboard.pending, (state) => {
        state.leaderboardStatus = 'loading';
        state.error = null;
      })
      .addCase(loadGamificationLeaderboard.fulfilled, (state, action) => {
        state.leaderboardStatus = 'succeeded';
        state.leaderboard = action.payload.leaderboard || [];
      })
      .addCase(loadGamificationLeaderboard.rejected, (state, action) => {
        state.leaderboardStatus = 'failed';
        state.error = action.payload;
      })
      .addCase(claimStreak.pending, (state) => {
        state.rewardStatus = 'loading';
        state.error = null;
      })
      .addCase(claimStreak.fulfilled, (state, action) => {
        state.rewardStatus = 'succeeded';
        state.lastReward = {
          type: 'streak',
          title: 'Daily streak claimed',
          description: `You extended your streak to ${action.payload.streak} days.`,
          ...action.payload
        };
        if (state.overview) {
          state.overview.user.streak = action.payload.streak;
          state.overview.user.xp += action.payload.xpAward;
          state.overview.summary.rewardXpToday += action.payload.xpAward;
          state.overview.summary.rewardXpWeek += action.payload.xpAward;
        }
      })
      .addCase(claimStreak.rejected, (state, action) => {
        state.rewardStatus = 'failed';
        state.error = action.payload;
      })
      .addCase(claimReward.pending, (state) => {
        state.rewardStatus = 'loading';
        state.error = null;
      })
      .addCase(claimReward.fulfilled, (state, action) => {
        state.rewardStatus = 'succeeded';
        state.lastReward = {
          type: 'mission',
          title: action.meta.arg.rewardType === 'weekly' ? 'Weekly challenge complete' : 'Daily mission complete',
          description: `Reward claimed successfully for ${action.meta.arg.rewardKey}.`,
          ...action.payload
        };
      })
      .addCase(claimReward.rejected, (state, action) => {
        state.rewardStatus = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearLastReward } = gamificationSlice.actions;
export default gamificationSlice.reducer;
