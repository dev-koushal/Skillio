import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import "react-toastify/dist/ReactToastify.css";

import ScrollToTop from "./components/ScrollToTop";
import { TenantProvider } from "./context/TenantContext";
import TenantSwitcher from "./components/common/TenantSwitcher";
import { serverURL } from "./services/api";

import useGetCurrentUser from "./hooks/useGetCurrentUser";
import useGetCreatorCourse from "./hooks/getCreatorCourse";
import useGetPublishedCourse from "./hooks/useGetPublishedCourse";
import useGetAllReviews from "./hooks/useGetAllReviews";

import Home from "./pages/Home";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignUp"));
const Profile = lazy(() => import("./pages/Profile"));
const ForgetPassword = lazy(() => import("./pages/ForgetPassword"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Dashboard = lazy(() => import("./pages/Educator/Dashboard"));
const Courses = lazy(() => import("./pages/Educator/Courses"));
const CreateCourses = lazy(() => import("./pages/Educator/CreateCourses"));
const EditCourse = lazy(() => import("./pages/Educator/EditCourse"));
const AllCourses = lazy(() => import("./pages/AllCourses"));
const CreateLecture = lazy(() => import("./pages/Educator/CreateLecture"));
const EditLecture = lazy(() => import("./pages/Educator/EditLecture"));
const ViewCourses = lazy(() => import("./pages/ViewCourses"));
const ViewLectures = lazy(() => import("./pages/ViewLectures"));
const MyEnrolledCourses = lazy(() => import("./pages/MyEnrolledCourses"));

export { serverURL };

function AppRoutes() {
  const { userData } = useSelector((store) => store.user);

  // Initialize global data hooks
  useGetCurrentUser();
  useGetCreatorCourse();
  useGetPublishedCourse();
  useGetAllReviews();

  return (
    <>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="w-full h-screen bg-black flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-cyan-800 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-gray-400 text-xs font-mono tracking-wider">LOADING APPLICATION...</p>
          </div>
        }
      >
        <Routes>
          {/* Public / Landing Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/allcourses" element={<AllCourses />} />
          <Route path="/viewcourse/:courseId" element={<ViewCourses />} />

          {/* Auth Routes */}
          <Route path="/login" element={!userData ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!userData ? <Signup /> : <Navigate to="/" />} />
          <Route path="/forget" element={<ForgetPassword />} />

          {/* Authenticated Student Routes */}
          <Route
            path="/profile"
            element={userData ? <Profile /> : <Navigate to="/login" />}
          />
          <Route
            path="/editprofile"
            element={userData ? <EditProfile /> : <Navigate to="/login" />}
          />
          <Route
            path="/mycourses"
            element={userData ? <MyEnrolledCourses /> : <Navigate to="/login" />}
          />
          <Route
            path="/viewlecture/:courseId"
            element={userData ? <ViewLectures /> : <Navigate to="/login" />}
          />

          {/* Educator / Management Routes */}
          <Route
            path="/dashboard"
            element={
              userData?.role === "educator" || userData?.role === "tenant_admin" || userData?.role === "platform_admin" ? (
                <Dashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/courses"
            element={
              userData?.role === "educator" || userData?.role === "tenant_admin" || userData?.role === "platform_admin" ? (
                <Courses />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/createcourses"
            element={
              userData?.role === "educator" || userData?.role === "tenant_admin" || userData?.role === "platform_admin" ? (
                <CreateCourses />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/editcourse/:courseId"
            element={
              userData?.role === "educator" || userData?.role === "tenant_admin" || userData?.role === "platform_admin" ? (
                <EditCourse />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/createlecture/:courseId"
            element={
              userData?.role === "educator" || userData?.role === "tenant_admin" || userData?.role === "platform_admin" ? (
                <CreateLecture />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/editlecture/:courseId/:lectureId"
            element={
              userData?.role === "educator" || userData?.role === "tenant_admin" || userData?.role === "platform_admin" ? (
                <EditLecture />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Development Tenant Switcher */}
      <TenantSwitcher />

      <ToastContainer
        position="top-right"
        autoClose={2000}
        theme="dark"
        toastClassName="bg-gray-900 border border-gray-800 text-white"
      />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TenantProvider>
        <AppRoutes />
      </TenantProvider>
    </BrowserRouter>
  );
}

export default App;
