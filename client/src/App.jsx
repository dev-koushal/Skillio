import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useSelector } from "react-redux";
import "react-toastify/dist/ReactToastify.css";

import ScrollToTop from "./components/ScrollToTop";
import WelcomeModal from "./components/common/WelcomeModal";
import { TenantProvider } from "./context/TenantContext";
import { serverURL, getActiveTenantSlug } from "./services/api";
import { getStoredTenantSlug } from "./services/tenantStorage";

import useGetCurrentUser from "./hooks/useGetCurrentUser";
import useGetCreatorCourse from "./hooks/getCreatorCourse";
import useGetPublishedCourse from "./hooks/useGetPublishedCourse";
import useGetAllReviews from "./hooks/useGetAllReviews";
import { canUseEducatorWorkspace } from "./auth/permissions";

// Lazy-loaded route components for high performance & code-splitting
const PlatformHome = lazy(() => import("./pages/PlatformHome"));
const InstitutionHome = lazy(() => import("./pages/InstitutionHome"));
const InstitutionLiveClass = lazy(() => import("./pages/InstitutionLiveClass"));
const StudentNeutralHome = lazy(() => import("./pages/StudentNeutralHome"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignUp"));
const Profile = lazy(() => import("./pages/Profile"));
const ForgetPassword = lazy(() => import("./pages/ForgetPassword"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Dashboard = lazy(() => import("./pages/Educator/Dashboard"));
const EducatorHome = lazy(() => import("./pages/Educator/EducatorHome"));
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
const CreateInstitution = lazy(() => import("./pages/CreateInstitution"));
const InstitutionStudents = lazy(() => import("./pages/Educator/Students"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));

// Lazy-loaded AI Assistant button to keep anonymous landing fast
const AIAssistantButton = lazy(() => import("./components/AIAssistantButton"));
const VoiceCommandButton = lazy(() => import("./components/VoiceCommandButton"));

export { serverURL };

/**
 * Root Route Dispatcher:
 * - If an authenticated educator arrives, route directly to their institution /educator/home.
 * - If an active institution is detected (e.g. physics.lvh.me or /institution/physics), display that institution.
 * - Otherwise, display the public Skillio SaaS Platform Homepage.
 */
function StudentCoursesDispatcher() {
  const { userData } = useSelector((store) => store.user);
  const isEducator = canUseEducatorWorkspace(userData);

  if (isEducator) {
    return <Courses />;
  }
  if (!userData) return <Navigate to="/login" replace />;

  const memberships = Array.isArray(userData?.memberships) ? userData.memberships : [];
  const storedSlug = getStoredTenantSlug();
  const activeSlug = memberships.find((membership) => membership.slug === storedSlug)?.slug || memberships[0]?.slug;

  if (activeSlug) {
    return <Navigate to={`/institution/${encodeURIComponent(activeSlug)}/courses`} replace />;
  }
  return <Navigate to="/" replace />;
}

function AllCoursesDispatcher() {
  const { userData } = useSelector((store) => store.user);
  if (!userData) return <Navigate to="/login" replace />;
  if (userData?.role === "student") {
    const storedSlug = getStoredTenantSlug();
    const memberships = Array.isArray(userData?.memberships) ? userData.memberships : [];
    const activeSlug = memberships.find((membership) => membership.slug === storedSlug)?.slug || memberships[0]?.slug;

    if (activeSlug) {
      return <Navigate to={`/institution/${encodeURIComponent(activeSlug)}/courses`} replace />;
    }
    return <Navigate to="/" replace />;
  }
  return <AllCourses />;
}

function MyCoursesDispatcher() {
  const { userData } = useSelector((store) => store.user);
  if (!userData) return <Navigate to="/login" replace />;

  if (userData?.role === "student") {
    const storedSlug = getStoredTenantSlug();
    const memberships = Array.isArray(userData?.memberships) ? userData.memberships : [];
    const activeSlug = memberships.find((membership) => membership.slug === storedSlug)?.slug || memberships[0]?.slug;

    if (activeSlug) {
      return <Navigate to={`/institution/${encodeURIComponent(activeSlug)}/my-courses`} replace />;
    }
  }
  return <MyEnrolledCourses />;
}

function ProfileDispatcher() {
  const { userData } = useSelector((store) => store.user);
  if (!userData) return <Navigate to="/login" replace />;

  if (userData?.role === "student") {
    const storedSlug = getStoredTenantSlug();
    const memberships = Array.isArray(userData?.memberships) ? userData.memberships : [];
    const activeSlug = memberships.find((membership) => membership.slug === storedSlug)?.slug || memberships[0]?.slug;

    if (activeSlug) {
      return <Navigate to={`/institution/${encodeURIComponent(activeSlug)}/profile`} replace />;
    }
  }
  return <Profile />;
}

function InstitutionRouteGuard({ children }) {
  const { slug } = useParams();
  const { userData } = useSelector((store) => store.user);
  if (!userData) return <Navigate to="/login" replace />;
  if (userData.role === "student") {
    const memberships = Array.isArray(userData.memberships) ? userData.memberships : [];
    if (!memberships.some((membership) => membership.slug === slug)) return <Navigate to="/" replace />;
  }
  return children;
}

function InstitutionSelectionRoute() {
  const { userData } = useSelector((store) => store.user);
  if (userData?.role === "student") return <StudentNeutralHome />;
  if (!userData) return <Navigate to="/signup?role=student" replace />;
  return <Navigate to={canUseEducatorWorkspace(userData) ? "/educator/home" : "/"} replace />;
}

function RootRouteDispatcher() {
  const { userData } = useSelector((store) => store.user);
  const isEducator = canUseEducatorWorkspace(userData);

  if (isEducator) {
    return <Navigate to="/educator/home" replace />;
  }

  const slug = getActiveTenantSlug();
  if (userData && userData.role !== "student" && slug && slug !== "platform" && slug !== "default") {
    return <InstitutionHome />;
  }

  if (userData?.role === "student") {
    const memberships = Array.isArray(userData.memberships) ? userData.memberships : [];
    const primaryTenantSlug =
      userData.tenant?.slug ||
      (typeof userData.tenantId === "object" ? userData.tenantId?.slug : null);

    const storedSlug = getStoredTenantSlug();
    const validStoredSlug = memberships.find((m) => m.slug === storedSlug)?.slug;

    const selectedTenantSlug = validStoredSlug || memberships[0]?.slug ||
      (memberships.some((membership) => membership.slug === primaryTenantSlug) ? primaryTenantSlug : null);

    if (selectedTenantSlug) {
      return <Navigate to={`/institution/${encodeURIComponent(selectedTenantSlug)}`} replace />;
    }

    // Student has chosen "Select Later" -> neutral student screen, NEVER public platform directory
    return <StudentNeutralHome />;
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

  const isEducator = canUseEducatorWorkspace(userData);

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
          <Route path="/institution/:slug" element={<InstitutionRouteGuard><InstitutionHome /></InstitutionRouteGuard>} />
          <Route path="/institution/:slug/live" element={<InstitutionRouteGuard><InstitutionLiveClass /></InstitutionRouteGuard>} />
          <Route path="/institution/:slug/courses" element={<InstitutionRouteGuard><AllCourses /></InstitutionRouteGuard>} />
          <Route path="/institution/:slug/my-courses" element={<InstitutionRouteGuard><MyEnrolledCourses /></InstitutionRouteGuard>} />
          <Route path="/institution/:slug/course/:courseId" element={<InstitutionRouteGuard><ViewCourses /></InstitutionRouteGuard>} />
          <Route path="/institution/:slug/profile" element={<InstitutionRouteGuard><Profile /></InstitutionRouteGuard>} />
          <Route path="/institutions" element={<InstitutionSelectionRoute />} />
          <Route path="/find-institution" element={<InstitutionSelectionRoute />} />
          <Route path="/allcourses" element={<AllCoursesDispatcher />} />
          <Route path="/viewcourse/:courseId" element={userData ? <ViewCourses /> : <Navigate to="/login" replace />} />

          {/* Course Invitation Acceptance Route */}
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/invite/:token" element={<AcceptInvite />} />

          {/* Auth Routes */}
          <Route
            path="/login"
            element={!userData ? <Login /> : isEducator ? <Navigate to="/educator/home" replace /> : <Navigate to="/" replace />}
          />
          <Route
            path="/signup"
            element={!userData ? <Signup /> : isEducator ? <Navigate to="/educator/home" replace /> : <Navigate to="/" replace />}
          />
          <Route path="/forget" element={<ForgetPassword />} />
          <Route
            path="/create-institution"
            element={isEducator ? <CreateInstitution /> : <Navigate to="/" replace />}
          />
          <Route
            path="/institution/manage"
            element={isEducator ? <CreateInstitution /> : <Navigate to="/" replace />}
          />
          <Route
            path="/educator/institution"
            element={isEducator ? <CreateInstitution /> : <Navigate to="/" replace />}
          />

          {/* Authenticated Student Routes */}
          <Route
            path="/profile"
            element={<ProfileDispatcher />}
          />
          <Route
            path="/editprofile"
            element={userData ? <EditProfile /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/mycourses"
            element={<MyCoursesDispatcher />}
          />
          <Route
            path="/viewlecture/:courseId"
            element={userData ? <ViewLectures /> : <Navigate to="/login" replace />}
          />

          {/* Educator / Management Routes */}
          <Route
            path="/educator/home"
            element={isEducator ? <EducatorHome /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/educator"
            element={<Navigate to="/educator/home" replace />}
          />
          <Route
            path="/dashboard"
            element={isEducator ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/students"
            element={isEducator ? <InstitutionStudents /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/dashboard/students"
            element={isEducator ? <InstitutionStudents /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/courses"
            element={<StudentCoursesDispatcher />}
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
          <AIAssistantButton hideTrigger />
        </Suspense>
      )}
      {isEducator && !/^\/(?:builder|createcourses|editcourse)(?:\/|$)/.test(location.pathname) && (
        <Suspense fallback={null}>
          <VoiceCommandButton />
        </Suspense>
      )}

      {/* Entry Modal for first-time visitors */}
      <WelcomeModal />

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
