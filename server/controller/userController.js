import User from '../models/userModel.js'
import uploadCloudinary from '../config/cloudinary.js'
export const getCurrentUser = async (req,res) => {
    try {
        // lookup by id rather than passing undefined or incorrect filter
    const user = await User.findById(req.userId).select("-password");
        if(!user){
            return res.status(404).json({
                message:"User not found!"
            })
        }
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({message:"Error in getting currentUser",error})
    }
}

export const updateProfile = async (req,res) => {
  try {
    const userId = req.userId
    const { name, description } = req.body

    const updateData = { name, description }

    if (req.file) {
      const profilePicture = await uploadCloudinary(req.file.path)
      updateData.profilePicture = profilePicture
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      {returnDocument: 'after' }
    )

    if(!user){
      return res.status(404).json({message:"User not found"})
    }

    return res.status(200).json(user)

  } catch (error) {
    console.log(error)
    return res.status(500).json({message:"Update profile error"})
  }
}