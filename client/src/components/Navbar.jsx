import React from "react";
import logo from "/skillio.png";
import { CircleGauge, User2Icon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import axios from 'axios'
import {useNavigate } from "react-router-dom";

import { setUserData } from "../redux/userSlice";
import { toast } from "react-toastify";
import { serverURL } from "../App";
function Navbar() {
  const {userData} = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch(); 
 
  const handleLogout = async () => {
    try {
      const result = await axios.get(serverURL+"/api/auth/logout",{withCredentials:true});
      dispatch(setUserData(null));
      console.log("Logout response:", result.data);
      navigate('/');
      toast.success("Logout successfully!");
    } catch (error) {
      console.error("Logout failed:", error.message);
      console.error("Response:", error.response?.data);
      toast.error(error.response?.data?.message || "Logout failed");
    }
  }


  return (
    <>
      <div className="bg-black text-white w-full flex items-center ">
        <div className="flex justify-between items-center w-full mx-auto px-4">
          <div className="h-24 w-24 flex items-center justify-center">
            <img
              src={logo}
              alt="Skillio"
              className="h-14 w-full object-contain mb-2"
            />
          </div>

          <div className="flex gap-4 items-center">
            {!userData && (
              <div className="text-lg border-2 border-cyan-900 rounded-full items-center justify-center p-1.5 hover:bg-gray-600/90 cursor-pointer  ">
                <User2Icon size={30} color="#006075" />
              </div>
            )}

            {userData && (
              <div className="flex text-lg w-10 h-10 text-white border-2 border-cyan-900 rounded-full items-center justify-center p-1.5 hover:bg-gray-600/90 cursor-pointer">
               {userData?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}

            {userData?.role == "educator" && (
              <div className="text-lg rounded-2xl p-2 items-center justify-center ">
                <button
                  type="button"
                  className="text-white border-cyan-900 hover:bg-gray-600/90 focus:ring-4 focus:ring-cyan-900/50 box-border border-2  focus:outline-none font-medium leading-5 rounded-base text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-cyan-900/50 cursor-pointer rounded-sm"
                >
                  Dashboard
                </button>
              </div>
            )}

            {!userData ? (
              <div className="text-lg rounded-2xl p-2 items-center justify-center ">
                  <button 
                  onClick={()=>navigate('/login')}
                    type="button"
                    className="text-white bg-cyan-900 hover:bg-gray-600/90 focus:ring-4 focus:ring-cyan-900/50 box-border border border-transparent focus:outline-none font-medium leading-5 rounded-base text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-cyan-900/50 cursor-pointer"
                  >
                    Login
                  </button>
                
              </div>
            ) : (
              <div className="text-lg rounded-2xl p-2 items-center justify-center ">
                <button
                onClick={handleLogout}
                  type="button"
                  className="text-white bg-cyan-900 hover:bg-gray-600/90 focus:ring-4 focus:ring-cyan-900/50 box-border border border-transparent focus:outline-none font-medium leading-5 rounded-base text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-cyan-900/50 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
