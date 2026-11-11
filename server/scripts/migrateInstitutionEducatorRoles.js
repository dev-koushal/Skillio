import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/connectDB.js";
import User from "../models/userModel.js";
import InstitutionMembership from "../models/institutionMembershipModel.js";

try {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database connection is not ready; educator role migration was not applied.");
  }

  // Raw collection updates allow this one-time migration after the model enum has
  // already removed the retired role value. It is safe to run more than once.
  const [users, memberships] = await Promise.all([
    User.collection.updateMany({ role: "tenant_admin" }, { $set: { role: "educator" } }),
    InstitutionMembership.collection.updateMany({ role: "tenant_admin" }, { $set: { role: "educator" } }),
  ]);

  console.log(`Converted ${users.modifiedCount} user role(s) and ${memberships.modifiedCount} membership role(s) to educator.`);
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
