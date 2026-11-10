import { createSlice } from "@reduxjs/toolkit";
import { getCachedUser, updateCachedUser } from "../services/authStorage";

const userSlice = createSlice({
  name: "user",
    initialState: {
      userData: typeof window !== "undefined" ? getCachedUser() : null,
    },
    reducers: {
      setUserData: (state, action) => {
        state.userData = action.payload;
        if (typeof window !== "undefined") {
          updateCachedUser(action.payload);
        }
      },
  },
});

export const { setUserData } = userSlice.actions;
export default userSlice.reducer;