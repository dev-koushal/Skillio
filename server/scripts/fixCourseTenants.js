import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/connectDB.js";
import Course from "../models/coursesModel.js";
import Tenant from "../models/tenantModel.js";

async function main() {
  await connectDB();

  const oct = await Tenant.findOne({ slug: "oriental-college-of-technology" });
  const hello = await Tenant.findOne({ slug: "hello-academy" });

  if (oct) {
    const res1 = await Course.updateMany(
      { title: { $in: ["Docker from first principle", "English Mastery Course"] } },
      { $set: { tenantId: oct._id, isPublished: true } }
    );
    console.log("Updated courses for Oriental College Of Technology:", res1.modifiedCount);
  }

  if (hello) {
    const res2 = await Course.updateMany(
      { title: "Introduction to Computer Science and Technology" },
      { $set: { isPublished: true, tenantId: hello._id } }
    );
    console.log("Published Introduction to Computer Science for Hello Academy:", res2.modifiedCount);
  }

  const allCourses = await Course.find({}).populate("tenantId", "name slug");
  console.log("Current courses in database:");
  allCourses.forEach((c) => {
    console.log({
      title: c.title,
      isPublished: c.isPublished,
      tenantName: c.tenantId?.name,
      tenantSlug: c.tenantId?.slug,
    });
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
