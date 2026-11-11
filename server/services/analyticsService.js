import Course from "../models/coursesModel.js";
import { canManageCourse, isInstitutionOwner } from "../utils/permissions.js";

/**
 * Shared Analytics Service for educators and academy administrators.
 * Multi-tenant safe.
 */
export const analyticsService = {
  /**
   * Get academy-level performance metrics for educator.
   */
  async getAcademyAnalytics({ tenantId, userId, userRole }) {
    if (!tenantId) throw new Error("tenantId is required");

    // Fetch courses owned by the educator or all in tenant for admin
    const filter = { tenantId };
    if (!(await isInstitutionOwner({ tenantId, userId, userRole }))) {
      filter.creator = userId;
    }

    const courses = await Course.find(filter).populate("reviews");

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.isPublished).length;
    const draftCourses = totalCourses - publishedCourses;

    let totalEnrolledStudents = 0;
    let totalRevenue = 0;

    const coursePerformance = courses.map((course) => {
      const studentCount = course.enrolledStudents ? course.enrolledStudents.length : 0;
      const revenue = studentCount * (Number(course.price) || 0);

      totalEnrolledStudents += studentCount;
      totalRevenue += revenue;

      const reviewCount = course.reviews?.length || 0;
      const avgRating = reviewCount > 0
        ? (course.reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewCount).toFixed(1)
        : "5.0";

      return {
        id: course._id,
        title: course.title,
        price: course.price,
        isPublished: course.isPublished,
        studentCount,
        revenue,
        lectureCount: course.lectures?.length || 0,
        avgRating,
      };
    });

    // Sort top performing courses by student enrollment
    coursePerformance.sort((a, b) => b.studentCount - a.studentCount);

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalEnrolledStudents,
      totalRevenue,
      topCourses: coursePerformance.slice(0, 5),
    };
  },

  /**
   * Get course-specific metrics.
   */
  async getCourseAnalytics({ tenantId, userId, userRole, courseId }) {
    if (!courseId) throw new Error("courseId is required");

    const course = await Course.findOne({ _id: courseId, tenantId }).populate("reviews");
    if (!course) {
      throw new Error("Course not found in this academy");
    }

    if (!(await canManageCourse({ course, tenantId, userId, userRole }))) {
      throw new Error("You are not authorized to view analytics for this course");
    }

    const studentCount = course.enrolledStudents ? course.enrolledStudents.length : 0;
    const revenue = studentCount * (Number(course.price) || 0);
    const reviewCount = course.reviews?.length || 0;
    const avgRating = reviewCount > 0
      ? (course.reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewCount).toFixed(1)
      : "5.0";

    return {
      courseId: course._id,
      title: course.title,
      price: course.price,
      isPublished: course.isPublished,
      studentCount,
      revenue,
      lectureCount: course.lectures?.length || 0,
      avgRating,
      reviewCount,
    };
  },
};

