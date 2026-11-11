import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/connectDB.js";
import Course from "../models/coursesModel.js";
import Tenant from "../models/tenantModel.js";

// Usage: node server/scripts/fixCourseTenants.js <tenant-slug> <course-id> [course-id ...]
// Takes explicit IDs so similarly named courses can never be reassigned accidentally.
async function main() {
  const [tenantSlug, ...courseIds] = process.argv.slice(2);
  if (!tenantSlug || courseIds.length === 0) {
    throw new Error("Provide a tenant slug and one or more course IDs. No records were changed.");
  }

  await connectDB();
  const tenant = await Tenant.findOne({ slug: tenantSlug.trim().toLowerCase(), status: "active" });
  if (!tenant) throw new Error(`Active institution not found: ${tenantSlug}`);

  const result = await Course.updateMany(
    { _id: { $in: courseIds }, tenantId: { $ne: tenant._id } },
    { $set: { tenantId: tenant._id } }
  );
  console.log(`Assigned ${result.modifiedCount} course(s) to ${tenant.name} (${tenant.slug}).`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.connection.close().catch(() => {});
  });

