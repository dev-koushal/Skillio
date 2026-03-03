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

export const serverURL = "http://localhost:3000";

function App() {
  const { userData } = useSelector((store) => store.user);

  // Fetch user on app start
  useGetCurrentUser();

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
        <Route
          path="/forget"
          element={userData? <ForgetPassword /> : <Navigate to="/signup" />}
        />
      </Routes>

      <ToastContainer position="top-right" autoClose={1500} />
    </BrowserRouter>
  );
}

export default App;