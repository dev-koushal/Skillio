import { useState } from "react";
import { Github, Mail, Lock, Eye, EyeOff, Waves, Signature, User2 } from "lucide-react";
import logo from '/skillio.png'
import loginPicture from '../../assets/SkillioLogin.png'
import { Link } from "react-router-dom";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);

  const[name,setName] = useState("");
  const[email,setEmail] = useState("");
  const[password,setPassword] = useState("");
  const[role,setRole] = useState("student");

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-8">
      {/* Card */}
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex" style={{ maxHeight: "630px" }}>

        {/* Left — Form */}
        <div className="flex flex-col justify-center w-full lg:w-1/2 bg-gray-950 px-8 sm:px-12 py-12">
          {/* Logo */}
          <div className="mb-8">
            <img src={logo} className="w-16 h-12"/>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Sign up to register
            </h1>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* name*/}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Name
              </label>
              <div className="relative">
                <User2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                onChange={(e)=>{setName(e.target.value)}}
                value={name}
                  type="name"
                  placeholder="Enter the name"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  onChange={(e)=>{setEmail(e.target.value)}}
                  value={email}
                  type="email"
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
                  onChange={(e)=>{setPassword(e.target.value)}}
                  value={password}
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button

                  onClick={()=>setShowPassword(!showPassword)}
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <Eye />
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex gap-4 items-center justify-between pt-1 text-white">
             <div className="flex gap-4"><label htmlFor="student" >
                Student{" "}
                <input onClick={()=>setRole("student")} value={role} defaultChecked  name="role" type="radio" id="student"/>
             </label>
             <label htmlFor="educator">
                Educator{" "}
                <input onClick={()=>setRole("educator")} value={role}  name="role" type="radio" id="educator" className=""/>
             </label></div>

             <div>
                <p className="text-sm text-blue-600 cursor-pointer">forget password?</p>
             </div>
            </div>


            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white font-semibold py-2.5 rounded-lg transition-all duration-150 text-sm tracking-wide shadow-lg shadow-indigo-500/20 mt-1"
            >
              Sign in
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-500 whitespace-nowrap">Or continue with</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white text-sm font-medium py-2.5 rounded-lg transition-all">
              <Signature />
              Google
            </button>
            <button className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white text-sm font-medium py-2.5 rounded-lg transition-all">
              <Link to="/login">Login?</Link>
            </button>
          </div>
        </div>

        {/* Right — Photo, hidden on small screens */}
        <div className="hidden lg:block h-158 border-8  lg:w-1/2 relative bg-black overflow-hidden">
          <img
            src={loginPicture}
            alt="Workspace"
            className=" w-full h-full object-cover rounded-xl"
          />
        </div>

      </div>
    </div>
  );
}