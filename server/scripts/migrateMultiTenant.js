import mongoose from "mongoose";
import dotenv from "dotenv";
import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Review from "../models/reviewModel.js";

dotenv.config();

const runMigration = async () => {
  const isDryRun = process.argv.includes("--dry-run");
  const isRollback = process.argv.includes("--rollback");

  console.log("--------------------------------------------------");
  console.log(" MULTI-TENANT DATA MIGRATION");
  console.log(` Mode: ${isDryRun ? "DRY RUN (no writes)" : isRollback ? "ROLLBACK" : "APPLY"}`);
  console.log("--------------------------------------------------");

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("Error: MONGO_URI is missing from environment variables.");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.");

    if (isRollback) {
      console.log("Rollback mode requested. This operation removes multi-tenant indexes and unsets tenantId.");
      if (!isDryRun) {
        await User.updateMany({}, { $unset: { tenantId: 1 } });
        await Course.updateMany({}, { $unset: { tenantId: 1 } });
        await Lecture.updateMany({}, { $unset: { tenantId: 1, courseId: 1 } });
        await Review.updateMany({}, { $unset: { tenantId: 1 } });
        console.log("Rollback completed: tenantId unset across all collections.");
      }
      process.exit(0);
    }

    // Step 1: Ensure Default Tenant
    let defaultTenant = await Tenant.findOne({ slug: "default" });
    if (!defaultTenant) {
      console.log("Creating default tenant ('Skillio Academy')...");
      if (!isDryRun) {
        defaultTenant = await Tenant.create({
          name: "Skillio Academy",
          slug: "default",
          logo: "/skillio.png",
          favicon: "/skillio.png",
          primaryColor: "#164e63",
          secondaryColor: "#0f172a",
          title: "Learn Without Limits",
          subtitle: "A modern learning platform where educators build powerful courses and students master real skills.",
          organizationName: "Skillio Academy",
          status: "active",
        });
      } else {
        defaultTenant = { _id: new mongoose.Types.ObjectId(), slug: "default", name: "Skillio Academy (Mock)" };
      }
      console.log(`Default tenant established: ${defaultTenant._id}`);
    } else {
      console.log(`Existing default tenant found: ${defaultTenant._id} (${defaultTenant.name})`);
    }

    // Step 2: Ensure Localhost / Subdomain Test Tenants (Physics & Coding)
    const testTenants = [
      {
        name: "Physics Academy",
        slug: "physics",
        title: "Master Physics from Basics to Advanced",
        subtitle: "Comprehensive physics curricula crafted for school and university students.",
        primaryColor: "#1e3a8a",
        secondaryColor: "#0f172a",
        organizationName: "Physics Academy",
        status: "active",
      },
      {
        name: "Coding Academy",
        slug: "coding",
        title: "Master Modern Software Engineering",
        subtitle: "Full-stack web development, system design, and AI tooling with industry experts.",
        primaryColor: "#065f46",
        secondaryColor: "#0f172a",
        organizationName: "Coding Academy",
        status: "active",
      },
      {
        name: "ABC Academy",
        slug: "abcacademy",
        title: "Excellence in Executive Education",
        subtitle: "Accelerate your career with accredited programs and mentorship.",
        primaryColor: "#7c2d12",
        secondaryColor: "#0f172a",
        organizationName: "ABC Academy",
        status: "active",
      }
    ];

    for (const t of testTenants) {
      const exists = await Tenant.findOne({ slug: t.slug });
      if (!exists && !isDryRun) {
        const created = await Tenant.create(t);
        console.log(`Created test tenant: ${created.slug} (${created.name})`);
      }
    }

    // Step 3: Clean up legacy global unique email index if present
    try {
      const userCollection = mongoose.connection.collection("users");
      const indexes = await userCollection.indexes();
      const legacyEmailIndex = indexes.find(
        (idx) => idx.name === "email_1" && idx.unique && Object.keys(idx.key).length === 1
      );
      if (legacyEmailIndex) {
        console.log("Dropping legacy single-field unique index on email_1...");
        if (!isDryRun) {
          await userCollection.dropIndex("email_1");
          console.log("Dropped email_1 index successfully.");
        }
      }
    } catch (err) {
      console.log("Note on index inspection:", err.message);
    }

    // Step 4: Associate orphaned Users with default tenant
    const orphanedUsers = await User.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    console.log(`Orphaned Users without tenantId: ${orphanedUsers}`);
    if (orphanedUsers > 0 && !isDryRun) {
      const res = await User.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );
      console.log(`Migrated ${res.modifiedCount} users to default tenant.`);
    }

    // Step 5: Associate orphaned Courses with default tenant
    const orphanedCourses = await Course.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    console.log(`Orphaned Courses without tenantId: ${orphanedCourses}`);
    if (orphanedCourses > 0 && !isDryRun) {
      const res = await Course.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );
      console.log(`Migrated ${res.modifiedCount} courses to default tenant.`);
    }

    // Step 6: Associate orphaned Lectures with default tenant and link courseId
    const orphanedLectures = await Lecture.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    console.log(`Orphaned Lectures without tenantId: ${orphanedLectures}`);
    if (orphanedLectures > 0 && !isDryRun) {
      await Lecture.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );

      // Backfill courseId from Course.lectures array if missing
      const courses = await Course.find({ lectures: { $exists: true, $ne: [] } });
      for (const course of courses) {
        if (course.lectures && course.lectures.length > 0) {
          await Lecture.updateMany(
            { _id: { $in: course.lectures }, courseId: { $exists: false } },
            { $set: { courseId: course._id, tenantId: course.tenantId } }
          );
        }
      }
      console.log(`Migrated lectures and backfilled courseId references.`);
    }

    // Step 7: Associate orphaned Reviews with default tenant
    const orphanedReviews = await Review.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    console.log(`Orphaned Reviews without tenantId: ${orphanedReviews}`);
    if (orphanedReviews > 0 && !isDryRun) {
      const res = await Review.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );
      console.log(`Migrated ${res.modifiedCount} reviews to default tenant.`);
    }

    // Step 8: Build and sync all schema indexes
    if (!isDryRun) {
      console.log("Synchronizing schema indexes...");
      await Tenant.syncIndexes();
      await User.syncIndexes();
      await Course.syncIndexes();
      await Lecture.syncIndexes();
      await Review.syncIndexes();
      console.log("All indexes synchronized successfully.");
    }

    console.log("--------------------------------------------------");
    console.log(" MIGRATION COMPLETED SUCCESSFULLY");
    console.log("--------------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();

