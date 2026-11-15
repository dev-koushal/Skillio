import express from "express";
import { v2 as cloudinary } from "cloudinary";
import isAuth from "../middleware/isAuth.js";

const uploadRouter = express.Router();

/**
 * GET /api/upload/cloudinary-signature
 * Generates an authorized, time-limited signature for direct browser -> Cloudinary uploads.
 * Bypasses sending heavy image files through Node.js.
 */
uploadRouter.get("/cloudinary-signature", isAuth, async (req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(503).json({
        success: false,
        message: "Cloud storage service is not configured for direct upload.",
      });
    }

    const folder = (req.query.folder || "skillio").toString().trim();
    const timestamp = Math.round(Date.now() / 1000);

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return res.status(200).json({
      success: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    console.error("[Cloudinary Signature Error]", error);
    return res.status(500).json({
      success: false,
      message: "Could not generate upload signature",
      error: error.message,
    });
  }
});

export default uploadRouter;
