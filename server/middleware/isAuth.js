import jwt from 'jsonwebtoken'

const isAuth = async (req,res,next) => {
    try {
    let {token} = req.cookies ;

    if(!token){
        return res.status(401).json({message:"User doesn't exist!"})
    }

    const verifyToken = jwt.verify(token,process.env.JWT_SECRET);

    if(!verifyToken){
        return res.status(401).json({message:"User doesn't have valid authentication!!"})
    }

    // JWT payload uses `userId` (lowercase) so make sure we read that consistently
    req.userId = verifyToken.userId;
    next(); 
    } catch (error) {
        return res.status(401).json({message:`Authentication failed ${error}`})
    }
}

export default isAuth;