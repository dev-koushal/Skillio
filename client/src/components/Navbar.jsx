import React, { useState } from "react";
import logo from "/skillio.png";
import { BookCheck, MenuIcon, User2Icon, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setUserData } from "../redux/userSlice";
import { toast } from "react-toastify";
import { serverURL } from "../App";

function Navbar() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [option, setOption] = useState(false);
  const [showHam, setShowHam] = useState(false);

  const handleLogout = async () => {
    try {
      await axios.get(serverURL + "/api/auth/logout", {
        withCredentials: true,
      });
      dispatch(setUserData(null));
      navigate("/");
      toast.success("Logout successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  };

  return (
    <div className="bg-black text-white w-full flex items-center relative  ">
      {/* Main Container */}
      <div className="flex justify-between items-center w-full  mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="h-20 sm:h-24 w-20 sm:w-24 flex items-center justify-center " onClick={()=>navigate("/")}>
          <img
            src={logo}
            alt="Skillio"
            className="h-12 sm:h-14 w-full object-contain"
          />
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex mr-5 gap-4 items-center relative">
          {!userData && (
            <div className="border-2 border-cyan-900 rounded-full p-1.5 hover:bg-gray-600/90 cursor-pointer ">
              <User2Icon size={28} />
            </div>
          )}

          {userData && (
            <div
              onClick={() => setOption(!option)}
              className="flex w-10 h-10 border-2 border-cyan-900 rounded-full items-center justify-center overflow-hidden cursor-pointer"
            >
              {userData?.profilePicture ? (
                <img
                  src={userData.profilePicture}
                  className="w-full h-full object-cover"
                />
              ) : (
                userData?.name?.charAt(0)?.toUpperCase() || "?"
              )}
            </div>
          )}

          {userData?.role === "educator" && (
            <button
              onClick={() => navigate("/dashboard")}
              className="border-2 border-cyan-900 hover:bg-gray-600/90 text-sm px-4 py-2 rounded-sm cursor-pointer"
            >
              Dashboard
            </button>
          )}

          {!userData ? (
            <button
              onClick={() => navigate("/login")}
              className="bg-cyan-900 hover:bg-gray-600/90 text-sm px-4 py-2 rounded-sm cursor-pointer"
            >
              Login
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="bg-cyan-900 hover:bg-gray-600/90 text-sm px-4 py-2 rounded-sm cursor-pointer"
            >
              Logout
            </button>
          )}

          {/* Profile Dropdown */}
          <div
            className={`${
              !option ? "hidden" : "absolute"
            } top-16 right-10 w-48 bg-gray-800/60 rounded-xl p-4 flex flex-col gap-2 z-50 `}
          >
            <span
              onClick={() => {
                navigate("/profile");
                setOption(false);
              }}
              className="hover:bg-gray-600/90 rounded-lg px-2 py-2 w-full bg-cyan-950 flex cursor-pointer z-50"
            >
              <User2Icon className="mr-2" /> My Profile
            </span>
            <span
              onClick={() => navigate("/courses")}
              className="hover:bg-gray-600/90 rounded-lg px-2 py-2 w-full bg-cyan-950 flex cursor-pointer"
            >
              <BookCheck className="mr-2" /> My Courses
            </span>
          </div>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden text-cyan-900">
          <MenuIcon size={30} onClick={() => setShowHam(true)} />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed top-0 left-0 w-full h-full bg-black/95 flex flex-col items-center justify-center gap-6 transition-transform duration-300 ${
          showHam ? "translate-x-0" : "translate-x-full"
        } md:hidden z-50`}
      >
        <X
          size={36}
          className="absolute top-6 right-6 text-cyan-900 cursor-pointer"
          onClick={() => setShowHam(false)}
        />
        <span
          className="bg-cyan-900 px-6 py-3 rounded-sm w-1/2 text-center hover:bg-gray-600/90"
          onClick={() => {
            navigate("/profile");
            setShowHam(false);
          }}
        >
          Profile
        </span>
        <span
          onClick={() => navigate("/courses")}
          className="bg-cyan-900 px-6 py-3 rounded-sm w-1/2 text-center hover:bg-gray-600/90"
        >
          My courses
        </span>

        {!userData ? (
          <button
            onClick={() => navigate("/login")}
            className="bg-cyan-900 px-6 py-3 rounded-sm w-1/2 text-center hover:bg-gray-600/90"
          >
            Login
          </button>
        ) : (
          <>
            <button
              onClick={handleLogout}
              className="bg-cyan-900 px-6 py-3 rounded-sm w-1/2 text-center hover:bg-gray-600/90"
            >
              Logout
            </button>
          </>
        )}
        {userData?.role === "educator" && (
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-cyan-900 px-6 py-3 rounded-sm w-1/2 text-center hover:bg-gray-600/90"
          >
            Dashboard
          </button>
        )}
      </div>
    </div>
  );
}

export default Navbar;
