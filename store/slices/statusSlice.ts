import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StatusState {
  status: string;
}

const initialState: StatusState = {
  status: '',
};

const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    setMessage(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    clearMessage(state) {
      state.status = '';
    },
  },
});

export const { setMessage, clearMessage } = statusSlice.actions;
export default statusSlice.reducer;