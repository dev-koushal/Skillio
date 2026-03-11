import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import "react-toastify/dist/ReactToastify.css";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import useGetCurrentUser from "./hooks/useGetCurrentUser";
import ForgetPassword from "./pages/ForgetPassword";
import EditProfile from "./pages/EditProfile";
import Dashboard from "./pages/Educator/Dashboard";
import Courses from "./pages/Educator/Courses";
import CreateCourses from "./pages/Educator/CreateCourses";
import useGetCreatorCourse from './hooks/getCreatorCourse'
import EditCourse from "./pages/Educator/EditCourse";
import getPublishedCourse from "./hooks/getPublishedCourse";
import AllCourses from "./pages/AllCourses";
export const serverURL = "http://localhost:3000";

function App() {
  const { userData } = useSelector((store) => store.user);

  // Fetch user on app start
  useGetCurrentUser();
  useGetCreatorCourse();
  getPublishedCourse();
 
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={!userData? <Signup /> : <Navigate to="/"/>} />

        {/* Protected Route */}
        <Route
          path="/profile"
          element={userData? <Profile /> : <Navigate to="/signup" />}
        />
        {/* forgot-password should be accessible when NOT logged in */}
        <Route
          path="/forget"
          element={<ForgetPassword />}
        />
        <Route
          path="/editprofile"
          element={userData? <EditProfile /> : <Navigate to="/signup" />}
        />
        <Route
          path="/allcourses"
          element={userData? <AllCourses /> : <Navigate to="/signup" />}
        />
        <Route
          path="/dashboard"
          element={userData?.role==="educator"? <Dashboard/> : <Navigate to="/signup" />}
        />
        <Route
          path="/courses"
          element={userData?.role==="educator"? <Courses/> : <Navigate to="/signup" />}
        />
        <Route
          path="/createcourses"
          element={userData?.role==="educator"? <CreateCourses/> : <Navigate to="/signup" />}
        />
        <Route
          path="/editcourse/:courseId"
          element={userData?.role==="educator"? <EditCourse/> : <Navigate to="/signup" />}
        />
      </Routes>

      <ToastContainer position="top-right" autoClose={1500} />
    </BrowserRouter>
  );
}

export default App;

