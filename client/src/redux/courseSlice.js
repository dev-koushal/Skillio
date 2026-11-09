import { createSlice } from "@reduxjs/toolkit";

const courseSlice = createSlice({
  name: "course",
  initialState: {
    creatorCourseData: null,
    courseData: null,
    selectedCourse: null,
  },
  reducers: {
    setCreatorCourseData: (state, action) => {
      state.creatorCourseData = action.payload;
    },
    setCourseData: (state, action) => {
      state.courseData = action.payload;
    },
    setSelectedCourse: (state, action) => {
      state.selectedCourse = action.payload;
    },
    clearInstitutionCourses: (state) => {
      state.courseData = null;
      state.selectedCourse = null;
    },
  },
});

export const {
  setCreatorCourseData,
  setCourseData,
  setSelectedCourse,
  clearInstitutionCourses,
} = courseSlice.actions;

export default courseSlice.reducer;
