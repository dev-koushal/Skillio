import validator from "validator";
import bcrypt from "bcryptjs";
import { genToken } from "../config/token.js";
import User from "../models/userModel.js";
import sendMail from "../config/sendMail.js";

export const signUp = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;
    // normalize email for consistency (store/search in lowercase)
    if (email) email = email.trim().toLowerCase();

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "All fields need to filled!",
      });
    }
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exist!" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Email should be valid!" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password need atleast 8 characters!" });
    }
    let hashPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashPassword,
      role,
    });

    let token = await genToken(user._id);

    // Cookie must be sent to frontend on a different origin (different port).
    // During local development we disable secure but use sameSite:none so the
    // browser includes it with `fetch`/axios requests.  In production we use
    // secure cookies and restrict sameSite to strict.
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const safeUser = user.toObject();
    delete safeUser.password;
    return res.status(201).json({
      success: true,
      message: "User created successfully!",
      user: safeUser,
    });
  } catch (error) {
    return res.status(400).json({ message: `SignUp error ${error}` });
  }
};

export const login = async (req, res) => {
  try {
    let { email, password, role } = req.body;
    if (email) email = email.trim().toLowerCase();

    let user = await User.findOne({ email }).select("+password");
    console.log(user);
    if (!user) {
      return res.status(400).json({ message: "User not register!" });
    }

    if (role != user.role) {
      return res.status(400).json({ message: "Role doesn't match!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password!" });
    }

    let token = await genToken(user._id);

    // mirror the same cookie logic used during signup
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    user.password = undefined;
    return res
      .status(200)
      .json({ success: true, message: "Login successful!", user });
  } catch (error) {
    return res.status(400).json({ message: `Login error ${error}` });
  }
};

export const logout = async (req, res) => {
  try {
    await res.clearCookie("token");
    return res.status(200).json({ message: "Logged out successfully!" });
  } catch (error) {
    return res.status(400).json({ message: `Logout error ${error}` });
  }
};

export const sendOtp = async (req,res) => {
  try {
    let { email } = req.body;
    if (email) email = email.trim().toLowerCase();
    let user = await User.findOne({ email });
    console.log(user);
    if(!user){
      return res.status(400).json({message:"User not Found!!"})
    }

    const otp = Math.floor(1000 + Math.random()*9000).toString();

    user.resetOtp = otp;
    user.otpExpires = Date.now()+5*60*1000,
    user.isOtpVerified = false
    

    await user.save();
    await sendMail(email,otp)

    return res.status(200).json({message:"OTP sended!!"})
  } catch (error) {
    return res.status(400).json({message:"OTP error!",error})
  }
}

export const verifyOtp = async (req,res) => {
  try {
    let { email, otp } = req.body;
    if (email) email = email.trim().toLowerCase();
    let user = await User.findOne({ email });
    if(!user || user.resetOtp !=otp || Date.now() >= user.otpExpires ){
      return res.status(400).json({message:"Invalid Otp"})
    }
    user.isOtpVerified = true
    user.resetOtp = undefined
    user.otpExpires = undefined
    await user.save();

    return res.status(200).json({message:"Otp verified Successfully!!"})
  } catch (error) {
     return res.status(400).json({message:`error in Otp verifying${error}`,})
  }
}

export const resetPassword = async (req,res) => {
  try {
    let { email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    let user = await User.findOne({ email }).select("+password");
    if (!user || !user.isOtpVerified) {
      return res.status(400).json({message:"otp need to verify!"});
    }
    const hashPassword = await bcrypt.hash(password,10);
    user.password = hashPassword;
    user.isOtpVerified = false;
    await user.save();
    return res.status(200).json({message:"password reset successful"});
  } catch (error) {
    return res.status(400).json({message:`error in reset password ${error}`});
  }
}