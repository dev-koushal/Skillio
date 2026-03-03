import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverURL } from "../App";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async (params) => {
    setLoading(true);
    try 
    {
            // note: axios.post(url, data, config)
        const { data } = await axios.post(
          serverURL + "/api/auth/sendotp",
          { email },
          { withCredentials: true }
        );
        console.log(data);
        setStep(2);
        toast(data.message);
    } catch (error) {
        console.log(error);
        toast(error.response.data.message);
    }finally{
        setLoading(false);
    }
  }

  const verifyOtp = async (params) => {
    setLoading(true);
    try {
        const { data } = await axios.post(
          serverURL + "/api/auth/verifyotp",
          { email, otp },
          { withCredentials: true }
        );
        console.log(data);
        setStep(3);
        toast(data.message);
    } catch (error) {
         console.log(error);
        toast(error.response.data.message);
    }finally{
        setLoading(false);
    }
  }
  const resetPassword = async (params) => {
    setLoading(true);
    try {
        if(password != confirmPassword ){
            toast.error("password not match")
        }
        const { data } = await axios.post(
          serverURL + "/api/auth/resetpassword",
          { email, password: password },
          { withCredentials: true }
        );
        console.log(data);
        toast.success(data.message);
        navigate("/login")
    } catch (error) {
         console.log(error);
        toast(error.response.data.message);
    }finally{
        setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-black rounded-2xl p-8">

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1 text-xs mb-5 text-gray-500 hover:text-black"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>

            <h2 className="text-xl font-bold mb-6">Forgot Password</h2>

            <div className="flex items-center border rounded-lg px-3 mb-6">
              <Mail size={16} className="text-gray-400" />
              <input
                type="email"
                placeholder="Enter email"
                className="flex-1 py-3 outline-none text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              onClick={sendOtp}
              className="w-full py-3 bg-black text-white rounded-lg text-sm font-semibold cursor-pointer"
              disabled={loading}
            >
             {loading? <ClipLoader size={20} color="white"/> :<span>Send OTP</span>}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1 text-xs mb-5 text-gray-500 hover:text-black cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>

            <h2 className="text-xl font-bold mb-6">Enter OTP</h2>

            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6 digit OTP"
              className="w-full border rounded-lg px-4 py-3 text-center text-lg mb-6 outline-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-lg text-sm font-semibold cursor-pointer"
            >
             {loading? <ClipLoader size={20} color="white"/> :<span>Verify OTP</span>}
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1 text-xs mb-5 text-gray-500 hover:text-black cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>

            <h2 className="text-xl font-bold mb-6 cursor-pointer" disabled={loading} onClick={resetPassword}> {loading? <ClipLoader size={20} color="white"/> :<span>Reset Password</span>}</h2>

            <div className="flex items-center border rounded-lg px-3 mb-4">
              <Lock size={16} className="text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                className="flex-1 py-3 outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className="flex items-center border rounded-lg px-3 mb-6">
              <Lock size={16} className="text-gray-400" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                className="flex-1 py-3 outline-none text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button className="w-full py-3 bg-black text-white rounded-lg text-sm font-semibold cursor-pointer">
              Reset Password
            </button>
          </div>
        )}

      </div>
    </div>
  );
}