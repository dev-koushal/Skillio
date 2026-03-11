import React from "react";
import {useSelector} from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, NotebookPen } from 'lucide-react'
function Dashboard() {
  const {userData} = useSelector(state=>state.user)
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen bg-white/90">
      
      <div className="w-full px-6 py-10 bg-gray-100 space-y-10">
         <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-3 py-1 border rounded-lg bg-white/90 hover:bg-gray-100 mb-3 cursor-pointer"
        >
          <ArrowLeft  size={16} /> Back
        </button>
        {/* main section */}
        <div className="max-w-5xl mx-auto bg-white/60 rounded-xl shadow-md p-6 flex flex-col md:flex-row items-center gap-6">
          {
            userData?.photoUrl? <img src={userData?.photoUrl}className="w-28 h-28 rounded-full object-cover border-4 border-black shadow-md text-center" alt="Educator" />: <span className="w-28 h-28 rounded-full border-4 border-black shadow-md text-center text-6xl items-center overflow-hidden">
             {userData.profilePicture? <img src={userData.profilePicture} alt="Pfp" className="  w-full h-full object-cover" /> :userData.name.charAt(0).toUpperCase()}
            </span> 
          }

          <div className="text-center md:text-left space-y-2">
            <h1 className="text-2xl font-bold text-gray-800">Welcome, <br className="md:hidden block"/> {userData?.name||"Educator"}👋  </h1>
            <h1 className="text-xl font-semibold">
              Total Earning: 0 
            </h1>
            <p className="text-gray-600 text-sm">{userData?.description || "Start Creating Courses"}</p>
            <div className="px-2 w-44 text-center py-2 border-2 bg-black text-white rounded-lg text-md font-light flex items-center justify-center cursor-pointer gap-2 mx-auto md:mx-0" onClick={()=>navigate("/courses")}>
             <NotebookPen size={18}/>{" "}{" "} Create Courses
            </div> 
          </div>
        </div>

        {/* graph section */}
        <div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;
