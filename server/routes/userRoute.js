import express from 'express'
import isAuth from '../middleware/isAuth.js';
import { getCurrentUser, updateProfile, changePassword } from '../controller/userController.js';
import upload from '../middleware/multer.js'

const userRouter = express.Router();

userRouter.get("/getcurrentuser", isAuth, getCurrentUser);
userRouter.post("/profile", isAuth, upload.single("profilePicture"), updateProfile);
userRouter.post("/changepassword", isAuth, changePassword);

export default userRouter;