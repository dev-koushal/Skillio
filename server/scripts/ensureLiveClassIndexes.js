import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/connectDB.js";
import LiveClass from "../models/liveClassModel.js";

try {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database connection is not ready; live-class indexes were not created.");
  }

  // Creates declared indexes without dropping or rebuilding existing indexes.
  await LiveClass.createIndexes();
  console.log("Live class indexes are ready.");
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
