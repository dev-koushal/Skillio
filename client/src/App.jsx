import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import "react-toastify/dist/ReactToastify.css";

import ScrollToTop from "./components/ScrollToTop";
import { TenantProvider } from "./context/TenantContext";
import { serverURL, getActiveTenantSlug } from "./services/api";

import useGetCurrentUser from "./hooks/useGetCurrentUser";
import useGetCreatorCourse from "./hooks/getCreatorCourse";
import useGetPublishedCourse from "./hooks/useGetPublishedCourse";
import useGetAllReviews from "./hooks/useGetAllReviews";

// Lazy-loaded route components for high performance & code-splitting
const PlatformHome = lazy(() => import("./pages/PlatformHome"));
const InstitutionHome = lazy(() => import("./pages/InstitutionHome"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignUp"));
const Profile = lazy(() => import("./pages/Profile"));
const ForgetPassword = lazy(() => import("./pages/ForgetPassword"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Dashboard = lazy(() => import("./pages/Educator/Dashboard"));
const Courses = lazy(() => import("./pages/Educator/Courses"));
const CreateCourses = lazy(() => import("./pages/Educator/CreateCourses"));
const EditCourse = lazy(() => import("./pages/Educator/EditCourse"));
const CourseBuilder = lazy(() => import("./pages/Educator/CourseBuilder"));
const AllCourses = lazy(() => import("./pages/AllCourses"));
const CreateLecture = lazy(() => import("./pages/Educator/CreateLecture"));
const EditLecture = lazy(() => import("./pages/Educator/EditLecture"));
const ViewCourses = lazy(() => import("./pages/ViewCourses"));
const ViewLectures = lazy(() => import("./pages/ViewLectures"));
const MyEnrolledCourses = lazy(() => import("./pages/MyEnrolledCourses"));
const InstitutionDirectory = lazy(() => import("./pages/InstitutionDirectory"));
const CreateInstitution = lazy(() => import("./pages/CreateInstitution"));

// Lazy-loaded AI Assistant button to keep anonymous landing fast
const AIAssistantButton = lazy(() => import("./components/AIAssistantButton"));

export { serverURL };

/**
 * Root Route Dispatcher:
 * If an institution subdomain is detected (e.g. physics.mylms.com), displays that institution.
 * Otherwise, renders the Skillio SaaS Platform Homepage.
 */
function RootRouteDispatcher() {
  const slug = getActiveTenantSlug();
  if (slug && slug !== "platform" && slug !== "default") {
    return <InstitutionHome />;
  }
  return <PlatformHome />;
}

function AppRoutes() {
  const { userData } = useSelector((store) => store.user);

  // Initialize global data hooks
  useGetCurrentUser();
  useGetCreatorCourse();
  useGetPublishedCourse();
  useGetAllReviews();

  const isEducator =
    userData?.role === "educator" ||
    userData?.role === "tenant_admin" ||
    userData?.role === "platform_admin";

  return (
    <>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="w-full h-screen bg-[#f8f7f4] flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#78716c] text-xs font-bold uppercase tracking-wider">Loading Platform...</p>
          </div>
        }
      >
        <Routes>
          {/* Public Platform & Institution Routes */}
          <Route path="/" element={<RootRouteDispatcher />} />
          <Route path="/institution/:slug" element={<InstitutionHome />} />
          <Route path="/institutions" element={<InstitutionDirectory />} />
          <Route path="/find-institution" element={<Navigate to="/institutions" replace />} />
          <Route path="/allcourses" element={<AllCourses />} />
          <Route path="/viewcourse/:courseId" element={<ViewCourses />} />

          {/* Auth Routes */}
          <Route path="/login" element={!userData ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!userData ? <Signup /> : <Navigate to="/" />} />
          <Route path="/forget" element={<ForgetPassword />} />
          <Route path="/create-institution" element={<CreateInstitution />} />

          {/* Authenticated Student Routes */}
          <Route
            path="/profile"
            element={userData ? <Profile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/editprofile"
            element={userData ? <EditProfile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/mycourses"
            element={userData ? <MyEnrolledCourses /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/viewlecture/:courseId"
            element={userData ? <ViewLectures /> : <Navigate to="/login" replace />}
          />

          {/* Educator / Management Routes */}
          <Route
            path="/dashboard"
            element={isEducator ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/courses"
            element={isEducator ? <Courses /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/builder"
            element={isEducator ? <CourseBuilder /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/builder/:courseId"
            element={isEducator ? <CourseBuilder /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/createcourses"
            element={isEducator ? <CourseBuilder /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/editcourse/:courseId"
            element={isEducator ? <CourseBuilder /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/createlecture/:courseId"
            element={isEducator ? <CreateLecture /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/editlecture/:courseId/:lectureId"
            element={isEducator ? <EditLecture /> : <Navigate to="/login" replace />}
          />

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* AI Assistant is available strictly to authorized educators */}
      {isEducator && (
        <Suspense fallback={null}>
          <AIAssistantButton />
        </Suspense>
      )}

      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme="light"
        toastClassName="bg-white border border-[#e8e5dc] text-[#1c1917] shadow-lg rounded-xl text-xs font-semibold"
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
