import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import "react-toastify/dist/ReactToastify.css";
import ScrollToTop from './components/ScrollToTop'
import Home from "./pages/Home";
import useGetCurrentUser from "./hooks/useGetCurrentUser";
import useGetCreatorCourse from "./hooks/getCreatorCourse";
import useGetPublishedCourse from "./hooks/useGetPublishedCourse";
import EditLecture from "./pages/Educator/EditLecture";
import ViewCourses from "./pages/ViewCourses";
import ViewLectures from "./pages/ViewLectures";
import MyEnrolledCourses from "./pages/MyEnrolledCourses";
import useGetAllReviews from "./hooks/useGetAllReviews";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Profile = lazy(() => import("./pages/Profile"));
const ForgetPassword = lazy(() => import("./pages/ForgetPassword"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Dashboard = lazy(() => import("./pages/Educator/Dashboard"));
const Courses = lazy(() => import("./pages/Educator/Courses"));
const CreateCourses = lazy(() => import("./pages/Educator/CreateCourses"));
const EditCourse = lazy(() => import("./pages/Educator/EditCourse"));
const AllCourses = lazy(() => import("./pages/AllCourses"));
const CreateLecture = lazy(() => import("./pages/Educator/CreateLecture"));

export const serverURL = "http://localhost:3000";
function App() {
  const { userData } = useSelector((store) => store.user);
  

  // Fetch user on app start
  useGetCurrentUser();
  useGetCreatorCourse();
  useGetPublishedCourse();
  useGetAllReviews();
 return (
  <BrowserRouter>
  <ScrollToTop/>
    <Suspense fallback={<div className="w-full h-screen bg-black flex">Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={!userData ? <Signup /> : <Navigate to="/" />} />

        <Route
          path="/profile"
          element={userData ? <Profile /> : <Navigate to="/signup" />}
        />
        <Route
          path="/forget"
          element={<ForgetPassword />}
        />
        <Route
          path="/editprofile"
          element={userData ? <EditProfile /> : <Navigate to="/signup" />}
        />
        <Route
          path="/allcourses"
          element={userData ? <AllCourses /> : <Navigate to="/signup" />}
        />
        <Route
          path="/dashboard"
          element={userData?.role === "educator" ? <Dashboard /> : <Navigate to="/signup" />}
        />
        <Route
          path="/courses"
          element={userData?.role === "educator" ? <Courses /> : <Navigate to="/signup" />}
        />
        <Route
          path="/createcourses"
          element={userData?.role === "educator" ? <CreateCourses /> : <Navigate to="/signup" />}
        />
        <Route
          path="/editcourse/:courseId"
          element={userData?.role === "educator" ? <EditCourse /> : <Navigate to="/signup" />}
        />
        <Route
          path="/createlecture/:courseId"
          element={userData?.role === "educator" ? <CreateLecture /> : <Navigate to="/signup" />}
        />
        <Route
          path="/editlecture/:courseId/:lectureId"
          element={userData?.role === "educator" ? <EditLecture /> : <Navigate to="/signup" />}
        />
        <Route
          path="/viewcourse/:courseId"
          element={userData? <ViewCourses /> : <Navigate to="/signup" />}
        />
        <Route
          path="/viewlecture/:courseId"
          element={userData? <ViewLectures /> : <Navigate to="/signup" />}
        />
        <Route
          path="/mycourses"
          element={userData? <MyEnrolledCourses /> : <Navigate to="/signup" />}
        />
      </Routes>
    </Suspense>

    <ToastContainer position="top-right" autoClose={1500} />
  </BrowserRouter>
);
}
export default App;

