import React from "react";
import logo from "/skillio.png";

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
          <div className="flex gap-4">
            <div
              id="dashboard-btn"
              className="text-lg rounded-2xl p-2 items-center justify-center "
            >
              <button
                type="button"
                className="text-white bg-cyan-900 hover:bg-gray-600/90 focus:ring-4 focus:ring-cyan-900/50 box-border border border-transparent focus:outline-none font-medium leading-5 rounded-base text-sm px-4 py-2.5 text-center inline-flex items-center dark:focus:ring-cyan-900/50 cursor-pointer"
              >
                Dashboard
              </button>
            </div>
            <div className="h-11 w-12 rounded-full flex bg-cyan-50 mt-1.5">
              <p className="items-center justify-center mx-auto text-4xl text-black font-bold mt-1">
                K
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
