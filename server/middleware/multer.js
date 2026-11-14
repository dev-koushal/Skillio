import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
let storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'./public')
    },
    filename : (req,file,cb)=>{
        cb(null,`${crypto.randomUUID()}${path.extname(file.originalname || '')}`)
    }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (["free", "paid"].includes(req.body?.accessType)) {
      const error = new Error("Secure notes must use the protected upload flow.");
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  },
})

export default upload
