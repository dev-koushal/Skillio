import { useState } from "react";
import {
  Github,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Waves,
  Signature,
} from "lucide-react";
import logo from "/skillio.png";
import loginPicture from "../assets/SkillioLogin.png";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { serverURL } from "../App";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data } = await axios.post(serverURL+"/api/auth/login",
        { email, password, role },
        { withCredentials: true }
      );

      dispatch(setUserData(data.user));

      toast.success("User Logged in successfully!");
      navigate("/");
    } catch (error) {
      console.log(error?.response || error);

      const message =
        error?.response?.data?.message || error?.message || "An error occurred";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/80 flex items-center justify-center p-4 sm:p-8">
      {/* Card */}
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex"
        style={{ minHeight: "560px" }}
      >
        {/* Left — Form */}
        <div className="flex flex-col justify-center w-full lg:w-1/2 bg-gray-950 px-8 sm:px-12 py-12">
          {/* Logo */}
          <div className="mb-8">
            <img src={logo} className="w-16 h-12" />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Sign in to your account
            </h1>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="flex gap-4 items-center justify-between pt-1 text-white">
              <div className="flex gap-4">
                <label htmlFor="student">
                  Student{" "}
                  <input
                    name="role"
                    type="radio"
                    id="student"
                    value="student"
                    checked={role === "student"}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </label>

                <label htmlFor="educator">
                  Educator{" "}
                  <input
                    name="role"
                    type="radio"
                    id="educator"
                    value="educator"
                    checked={role === "educator"}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </label>
              </div>

              <div onClick={()=>navigate('/forget')}>
                <p className="text-sm text-blue-600 cursor-pointer">
                  forget password?
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-semibold py-2.5 rounded-lg transition-all duration-150 text-sm tracking-wide shadow-lg shadow-indigo-500/20 mt-1"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-500 whitespace-nowrap">
              Or continue with
            </span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white text-sm font-medium py-2.5 rounded-lg transition-all cursor-pointer">
              <Signature />
              Google
            </button>
            <button onClick={()=>navigate('/signup')} className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white text-sm font-medium py-2.5 rounded-lg transition-all cursor-pointer">
              Signup?
            </button>
          </div>
        </div>

        {/* Right — Photo */}
        <div className="hidden lg:block h-150 border-8 lg:w-1/2 relative bg-black">
          <img
            src={loginPicture}
            alt="Workspace"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
