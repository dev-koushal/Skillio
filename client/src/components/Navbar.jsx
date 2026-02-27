import React from "react";
import logo from "/skillio.png";
import {User2Icon} from 'lucide-react'
function Navbar() {
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
            <div
              className="text-lg border-2 border-cyan-900 rounded-full items-center justify-center p-1.5 hover:bg-gray-600/90 cursor-pointer  "
            >
                <User2Icon size={30} color="#006075"/>
            </div>



            <div
              className="text-lg rounded-2xl p-2 items-center justify-center "
            >
              <button
                type="button"
                className="text-white border-cyan-900 hover:bg-gray-600/90 focus:ring-4 focus:ring-cyan-900/50 box-border border-2  focus:outline-none font-medium leading-5 rounded-base text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-cyan-900/50 cursor-pointer rounded-sm"
              >
                Dashboard
              </button>
            </div>
            <div
              className="text-lg rounded-2xl p-2 items-center justify-center "
            >
              <button
                type="button"
                className="text-white bg-cyan-900 hover:bg-gray-600/90 focus:ring-4 focus:ring-cyan-900/50 box-border border border-transparent focus:outline-none font-medium leading-5 rounded-base text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-cyan-900/50 cursor-pointer"
              >
                Login
              </button>
            </div>
            <div
              className="text-lg rounded-2xl p-2 items-center justify-center "
            >
              <button
                type="button"
                className="text-white bg-cyan-900 hover:bg-gray-600/90 focus:ring-4 focus:ring-cyan-900/50 box-border border border-transparent focus:outline-none font-medium leading-5 rounded-base text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-cyan-900/50 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
