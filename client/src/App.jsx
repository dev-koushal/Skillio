import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Home from "./assets/pages/Home";
import Login from "./assets/pages/Login";
import Signup from "./assets/pages/Signup";
import getCurrentUser from "./hooks/getCurrentUser";

export const serverURL = "http://localhost:3000";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
]);


function App() {
  getCurrentUser();
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
}

export default App;