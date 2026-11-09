import Tenant from "../models/tenantModel.js";
import User from "../models/userModel.js";
import Course from "../models/coursesModel.js";
import Lecture from "../models/lectureModel.js";
import Review from "../models/reviewModel.js";

/**
 * Initializes default tenants and migrates legacy orphaned documents
 * on server start. Idempotent and safe to run on every startup.
 */
export const ensureDefaultTenants = async () => {
  try {
    // 1. Ensure Default Tenant
    let defaultTenant = await Tenant.findOne({ slug: "default" });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        name: "Skillio Academy",
        slug: "default",
        logo: "/skillio.png",
        favicon: "/skillio.png",
        primaryColor: "#1e3a8a",
        secondaryColor: "#0f172a",
        title: "Learn Without Limits",
        subtitle: "A modern learning platform where educators build powerful courses and students master real skills.",
        heroContent: "Access industry-vetted courses designed to bridge the gap between where you are and where you want to be.",
        organizationName: "Skillio Academy",
        institutionType: "Academy",
        description: "Comprehensive multidisciplinary courses in technology, engineering, and creative skills.",
        domainTags: ["Technology", "Engineering", "Design"],
        status: "active",
      });
      console.log(`[Multi-Tenant] Created default tenant (${defaultTenant.name}, ID: ${defaultTenant._id})`);
    }

    // 2. Only seed demo tenants if explicitly requested in test environment
    if (process.env.SEED_TEST_TENANTS === "true" && process.env.NODE_ENV === "test") {
      const seedTenants = [
        {
          name: "English Academy",
          slug: "english",
          title: "Master English with Practical Confidence",
          subtitle: "Build fluent speaking skills, correct grammar, and ace IELTS or corporate interviews.",
          primaryColor: "#0f766e",
          secondaryColor: "#042f2e",
          organizationName: "English Academy",
          institutionType: "Language Institute",
          description: "Specialized language training for spoken fluency, IELTS band 8+, corporate communication, and vocabulary.",
          domainTags: ["English", "IELTS", "Communication"],
          status: "active",
        },
        {
          name: "Physics Academy",
          slug: "physics",
          title: "Master Physics from Basics to Advanced",
          subtitle: "Comprehensive physics curricula crafted for school and university students.",
          primaryColor: "#1e3a8a",
          secondaryColor: "#0f172a",
          organizationName: "Physics Academy",
          institutionType: "Coaching Center",
          description: "Premier preparation for competitive exams and university physics with in-depth lectures and problem sets.",
          domainTags: ["Physics", "JEE", "Science"],
          status: "active",
        },
      ];

      for (const seed of seedTenants) {
        const exists = await Tenant.findOne({ slug: seed.slug });
        if (!exists) {
          await Tenant.create(seed);
          console.log(`[Multi-Tenant] Seeded test tenant: ${seed.slug} (${seed.name})`);
        }
      }
    }

    // 3. Migrate orphaned documents
    const orphanedUsers = await User.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    if (orphanedUsers > 0) {
      const res = await User.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );
      console.log(`[Multi-Tenant] Migrated ${res.modifiedCount} legacy users to default tenant.`);
    }

    const orphanedCourses = await Course.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    if (orphanedCourses > 0) {
      const res = await Course.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );
      console.log(`[Multi-Tenant] Migrated ${res.modifiedCount} legacy courses to default tenant.`);
    }

    const orphanedLectures = await Lecture.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    if (orphanedLectures > 0) {
      await Lecture.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );

      // Backfill courseId if missing
      const courses = await Course.find({ lectures: { $exists: true, $ne: [] } });
      for (const course of courses) {
        if (course.lectures && course.lectures.length > 0) {
          await Lecture.updateMany(
            { _id: { $in: course.lectures }, courseId: { $exists: false } },
            { $set: { courseId: course._id, tenantId: course.tenantId } }
          );
        }
      }
      console.log(`[Multi-Tenant] Migrated legacy lectures to default tenant.`);
    }

    const orphanedReviews = await Review.countDocuments({
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    });
    if (orphanedReviews > 0) {
      const res = await Review.updateMany(
        { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
        { $set: { tenantId: defaultTenant._id } }
      );
      console.log(`[Multi-Tenant] Migrated ${res.modifiedCount} legacy reviews to default tenant.`);
    }
  } catch (error) {
    console.error("[Multi-Tenant] Error during tenant initialization:", error.message);
  }
};

