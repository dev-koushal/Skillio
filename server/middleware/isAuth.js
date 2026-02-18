import jwt, { verify } from 'jsonwebtoken'

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

    req.userID = verifyToken.userID;
    next(); 
    } catch (error) {
        return res.status(500).json({message:`Authentication failed ${error}`})
    }
}

export default isAuth;