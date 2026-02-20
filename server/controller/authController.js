import validator from 'validator';
import bcrypt, { truncates } from 'bcryptjs';
import { genToken } from '../config/token.js';
import User from '../models/userModel.js'


export const signUp = async(req,res)=>{
   try {
     const {name, email,password, role } = req.body;
    let existingUser = await User.findOne({email});
    if(existingUser){
        return res.status(400).json({message:"User already exist!"});
    }
    if(!validator.isEmail(email)){
        return res.status(400).json({message:"Email should be valid!"});
    }
    if(password.length<8){
        return res.status(400).json({message:"Password need atleast 8 characters!"});
    }
    let hashPassword = await bcrypt.hash(password,10);

    const user = await User.create({
        name,
        email,
        password:hashPassword,
        role
    })
    

    let token = await genToken(user._id)

    res.cookie("token",token,{
        httpOnly:true,
        secure:false, //need to update as now it is running on the local machine
        samesite:"Strict",
        maxAge:7*24*60*60*1000 
    })

    const safeUser = user.toObject();
    delete safeUser.password;
    return res.status(201).json({success:true,message:"User created successfully!",user:safeUser});

   } catch (error) {
     return res.status(400).json({message:`SignUp error ${error}`})
   }
}

export const login = async (req,res)=>{
    try {
        const{email,password,role} =req.body;
        let user = await User.findOne({email}).select("+password");

        if(!user){
            return res.status(400).json({message:"User not register!"})
        }

        if(role!= user.role ){
            return res.status(400).json({message:"Role doesn't match!"})
        }
       
        const isMatch = await bcrypt.compare(password,user.password);
       
        if(!isMatch){
            return res.status(400).json({message:"Wrong password!"})
        }

        let token = await genToken(user._id);
        
        res.cookie("token",token,{
        httpOnly:true,
        secure:false, //need to update as now it is running on the local machine
        samesite:"strict",
        maxAge:7*24*60*60*1000 
    })
        user.password = undefined;
        return res.status(200).json({success: true,message: "Login successful!",user});

    } catch (error) {
         return res.status(400).json({message:`Login error ${error}`})
    }
}

export const logout = async (req,res) => {
    try {
       await res.clearCookie("token")
       return res.status(200).json({message:"Logged successfully!"})
    } catch (error) {
        return res.status(400).json({message:`Logout error ${error}`})
    }
}