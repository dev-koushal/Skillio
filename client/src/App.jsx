import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./assets/pages/Home";
import Login from "./assets/pages/Login";
import Signup from "./assets/pages/Signup";

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
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
