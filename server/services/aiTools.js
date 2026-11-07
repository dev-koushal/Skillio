import { courseService } from "./courseService.js";
import { lectureService } from "./lectureService.js";
import { resourceService } from "./resourceService.js";
import { tenantService } from "./tenantService.js";
import { analyticsService } from "./analyticsService.js";

/**
 * Tool Registry for the AI Teaching Assistant Application Agent.
 * Every tool maps to authoritative backend services with strict multi-tenant authorization.
 */

// Helper to resolve course from args or context
async function resolveTargetCourse({ tenantId, userId, args, context }) {
  if (args.courseId) {
    const course = await courseService.getCourse({ tenantId, courseId: args.courseId });
    if (course) return course;
  }

  if (args.courseTitle || args.title) {
    const title = args.courseTitle || args.title;
    const course = await courseService.findCourseByTitle({ tenantId, userId, title });
    if (course) return course;
  }

  // Active course from frontend context
  if (context?.currentCourseId) {
    const course = await courseService.getCourse({ tenantId, courseId: context.currentCourseId });
    if (course) return course;
  }

  // Fallback to most recent course created by educator
  const courses = await courseService.listCreatorCourses({ tenantId, userId });
  if (courses && courses.length > 0) {
    return courses[0];
  }

  return null;
}

export const TOOL_REGISTRY = {
  // 1. CREATE COURSE
  createCourse: {
    definition: {
      type: "function",
      function: {
        name: "createCourse",
        description: "Create a new course in the educator's academy. Can accept title, description, price, category, level, etc.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "The title of the course, e.g. 'Complete English Mastery'" },
            description: { type: "string", description: "Detailed description of what students will learn" },
            category: { type: "string", description: "Category/subject e.g. 'English', 'Science', 'Coding', 'Business'" },
            subTitle: { type: "string", description: "Catchy subtitle for the course" },
            price: { type: "number", description: "Price in rupees (₹), or 0 for free" },
            level: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"], description: "Target student skill level" },
            isPublished: { type: "boolean", description: "Whether the course is immediately live (default false: saved as draft)" },
          },
          required: ["title"],
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args }) {
      const existing = await courseService.findCourseByTitle({ tenantId, userId, title: args.title });
      if (existing) {
        return {
          success: true,
          message: `A course named "${existing.title}" already exists in your academy. Would you like to add lectures to it or edit its details?`,
          data: { course: existing, isDuplicate: true },
        };
      }

      const course = await courseService.createCourse({
        tenantId,
        userId,
        title: args.title,
        description: args.description || `Comprehensive course on ${args.title}.`,
        category: args.category || "General",
        subTitle: args.subTitle || "",
        price: Number(args.price) || 0,
        level: args.level || "Beginner",
        isPublished: Boolean(args.isPublished),
      });

      return {
        success: true,
        message: `Course "${course.title}" created successfully (saved as Draft, ₹${course.price}). You can now add lectures, notes, or publish it.`,
        data: { course },
      };
    },
  },

  // 2. UPDATE COURSE
  updateCourse: {
    definition: {
      type: "function",
      function: {
        name: "updateCourse",
        description: "Update course metadata such as title, description, price, category, level, or publish status.",
        parameters: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "The ID of the course to update" },
            courseTitle: { type: "string", description: "The existing title of the course to update" },
            newTitle: { type: "string", description: "New title for the course" },
            description: { type: "string", description: "Updated course description" },
            category: { type: "string", description: "Updated course category" },
            price: { type: "number", description: "Updated price (0 for free)" },
            level: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"], description: "Updated difficulty level" },
            isPublished: { type: "boolean", description: "Set published or draft status" },
          },
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Could not find the course to update. Please specify the course title or select a course.");
      }

      const updateData = {};
      if (args.newTitle) updateData.title = args.newTitle;
      if (args.description !== undefined) updateData.description = args.description;
      if (args.category !== undefined) updateData.category = args.category;
      if (args.price !== undefined) updateData.price = Number(args.price);
      if (args.level !== undefined) updateData.level = args.level;
      if (args.isPublished !== undefined) updateData.isPublished = Boolean(args.isPublished);

      const updated = await courseService.updateCourse({
        tenantId,
        userId,
        userRole,
        courseId: course._id,
        updateData,
      });

      return {
        success: true,
        message: `Updated "${updated.title}" successfully: ${Object.keys(updateData).map((k) => `${k} updated`).join(", ")}.`,
        data: { course: updated },
      };
    },
  },

  // 3. PUBLISH / UNPUBLISH COURSE
  publishCourse: {
    definition: {
      type: "function",
      function: {
        name: "publishCourse",
        description: "Publish a course to make it visible to students, or unpublish to revert to draft.",
        parameters: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "The ID of the course to publish or unpublish" },
            courseTitle: { type: "string", description: "Title of the course" },
            isPublished: { type: "boolean", description: "True to make live, false to revert to draft" },
          },
          required: ["isPublished"],
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Please specify which course you would like to publish or unpublish.");
      }

      const updated = await courseService.setPublishStatus({
        tenantId,
        userId,
        userRole,
        courseId: course._id,
        isPublished: Boolean(args.isPublished),
      });

      return {
        success: true,
        message: args.isPublished
          ? `"${updated.title}" is now published and live in your academy catalog! Students can now enroll.`
          : `"${updated.title}" has been moved to Draft and is hidden from public students.`,
        data: { course: updated },
      };
    },
  },

  // 4. DELETE COURSE (High Risk)
  deleteCourse: {
    definition: {
      type: "function",
      function: {
        name: "deleteCourse",
        description: "Permanently delete a course and its associated lectures and resources. Requires explicit confirmation.",
        parameters: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "The ID of the course to delete" },
            courseTitle: { type: "string", description: "Title of the course to delete" },
          },
        },
      },
    },
    riskLevel: "high",
    requiresConfirmation: () => true,
    confirmationMessage: (args) =>
      `Are you sure you want to permanently delete "${args.courseTitle || args.title || "this course"}" and all its lectures and notes? This action cannot be undone.`,
    async execute({ tenantId, userId, userRole, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error(`Course "${args.courseTitle || ""}" not found.`);
      }

      const result = await courseService.deleteCourse({
        tenantId,
        userId,
        userRole,
        courseId: course._id,
      });

      return {
        success: true,
        message: `Course "${result.title}" and all its materials have been permanently removed.`,
        data: { deletedCourseId: course._id },
      };
    },
  },

  // 5. LIST COURSES
  listCourses: {
    definition: {
      type: "function",
      function: {
        name: "listCourses",
        description: "List all courses created by the educator in this academy, including status and price.",
        parameters: {
          type: "object",
          properties: {
            filter: { type: "string", enum: ["all", "published", "draft"], description: "Optional filter for courses" },
          },
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, args }) {
      let courses = await courseService.listCreatorCourses({ tenantId, userId });
      if (args.filter === "published") {
        courses = courses.filter((c) => c.isPublished);
      } else if (args.filter === "draft") {
        courses = courses.filter((c) => !c.isPublished);
      }

      if (courses.length === 0) {
        return {
          success: true,
          message: "You don't have any courses matching that criteria yet.",
          data: { courses: [] },
        };
      }

      const summaryList = courses
        .map((c) => `• "${c.title}" (${c.isPublished ? "Live" : "Draft"}, ₹${c.price}, ${c.lectures?.length || 0} lectures)`)
        .join("\n");

      return {
        success: true,
        message: `Here are your courses (${courses.length} total):\n${summaryList}`,
        data: { courses },
      };
    },
  },

  // 6. GET COURSE DETAILS
  getCourseDetails: {
    definition: {
      type: "function",
      function: {
        name: "getCourseDetails",
        description: "Get detailed information about a course, including lectures and curriculum.",
        parameters: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "Course ID" },
            courseTitle: { type: "string", description: "Course title" },
          },
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Course not found");
      }

      const lecturesSummary = (course.lectures || [])
        .map((l, i) => `${i + 1}. ${l.lectureTitle} (${l.isPreviewFree ? "Free Preview" : "Enrolled Only"})`)
        .join("\n");

      return {
        success: true,
        message: `Course: "${course.title}"\nStatus: ${course.isPublished ? "Published" : "Draft"}\nPrice: ₹${course.price}\nCategory: ${course.category}\nLectures (${course.lectures?.length || 0}):\n${lecturesSummary || "No lectures added yet."}`,
        data: { course },
      };
    },
  },

  // 7. CREATE LECTURE
  createLecture: {
    definition: {
      type: "function",
      function: {
        name: "createLecture",
        description: "Add a new lecture to a course.",
        parameters: {
          type: "object",
          properties: {
            lectureTitle: { type: "string", description: "Title of the lecture" },
            courseId: { type: "string", description: "Target course ID" },
            courseTitle: { type: "string", description: "Target course title" },
            isPreviewFree: { type: "boolean", description: "Whether this lecture is playable as a free preview" },
            videoUrl: { type: "string", description: "Optional video URL or Cloudinary embed" },
          },
          required: ["lectureTitle"],
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Could not find the target course. Please specify which course to add this lecture to.");
      }

      const result = await lectureService.createLecture({
        tenantId,
        userId,
        userRole,
        courseId: course._id,
        lectureTitle: args.lectureTitle,
        isPreviewFree: Boolean(args.isPreviewFree),
        videoUrl: args.videoUrl || "",
      });

      return {
        success: true,
        message: `Lecture "${result.lecture.lectureTitle}" added to "${course.title}".`,
        data: {
          courseId: course._id,
          lecture: result.lecture,
        },
      };
    },
  },

  // 8. UPDATE LECTURE
  updateLecture: {
    definition: {
      type: "function",
      function: {
        name: "updateLecture",
        description: "Update lecture title, video URL, or free preview status.",
        parameters: {
          type: "object",
          properties: {
            lectureId: { type: "string", description: "The ID of the lecture" },
            lectureTitle: { type: "string", description: "Existing title of the lecture" },
            newTitle: { type: "string", description: "New title for the lecture" },
            isPreviewFree: { type: "boolean", description: "Whether free preview is enabled" },
            videoUrl: { type: "string", description: "Video URL" },
            courseId: { type: "string", description: "Parent course ID" },
          },
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args, context }) {
      let targetLecture = null;
      if (args.lectureId) {
        targetLecture = await lectureService.getLecture({ tenantId, lectureId: args.lectureId });
      } else if (args.lectureTitle) {
        const course = await resolveTargetCourse({ tenantId, userId, args, context });
        if (course) {
          targetLecture = await lectureService.findLectureByTitle({
            tenantId,
            courseId: course._id,
            title: args.lectureTitle,
          });
        }
      }

      if (!targetLecture) {
        throw new Error(`Lecture "${args.lectureTitle || ""}" not found.`);
      }

      const updated = await lectureService.updateLecture({
        tenantId,
        userId,
        userRole,
        lectureId: targetLecture._id,
        lectureTitle: args.newTitle,
        isPreviewFree: args.isPreviewFree,
        videoUrl: args.videoUrl,
      });

      return {
        success: true,
        message: `Lecture "${updated.lectureTitle}" updated successfully.`,
        data: { lecture: updated },
      };
    },
  },

  // 9. DELETE LECTURE (High Risk)
  deleteLecture: {
    definition: {
      type: "function",
      function: {
        name: "deleteLecture",
        description: "Permanently delete a lecture from a course. Requires explicit confirmation.",
        parameters: {
          type: "object",
          properties: {
            lectureId: { type: "string", description: "Lecture ID" },
            lectureTitle: { type: "string", description: "Lecture title" },
            courseId: { type: "string", description: "Parent course ID" },
            courseTitle: { type: "string", description: "Parent course title" },
          },
        },
      },
    },
    riskLevel: "high",
    requiresConfirmation: () => true,
    confirmationMessage: (args) =>
      `Are you sure you want to permanently delete the lecture "${args.lectureTitle || "selected lecture"}"?`,
    async execute({ tenantId, userId, userRole, args, context }) {
      let targetLecture = null;
      if (args.lectureId) {
        targetLecture = await lectureService.getLecture({ tenantId, lectureId: args.lectureId });
      } else if (args.lectureTitle) {
        const course = await resolveTargetCourse({ tenantId, userId, args, context });
        if (course) {
          targetLecture = await lectureService.findLectureByTitle({
            tenantId,
            courseId: course._id,
            title: args.lectureTitle,
          });
        }
      }

      if (!targetLecture) {
        throw new Error(`Lecture "${args.lectureTitle || ""}" not found.`);
      }

      const result = await lectureService.deleteLecture({
        tenantId,
        userId,
        userRole,
        lectureId: targetLecture._id,
      });

      return {
        success: true,
        message: `Lecture "${result.lectureTitle}" has been deleted.`,
        data: { deletedLectureId: targetLecture._id },
      };
    },
  },

  // 10. REORDER LECTURES
  reorderLectures: {
    definition: {
      type: "function",
      function: {
        name: "reorderLectures",
        description: "Reorder lectures inside a course.",
        parameters: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "Course ID" },
            courseTitle: { type: "string", description: "Course title" },
            lectureOrder: {
              type: "array",
              items: { type: "string" },
              description: "Array of lecture IDs or titles in the desired sequence",
            },
          },
          required: ["lectureOrder"],
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Course not found for lecture reordering");
      }

      // Map titles to IDs if strings were passed
      const populatedCourse = await courseService.getCourse({ tenantId, courseId: course._id });
      const existingLectures = populatedCourse.lectures || [];

      const newIds = [];
      for (const item of args.lectureOrder) {
        const match = existingLectures.find(
          (l) => l._id.toString() === item || l.lectureTitle.toLowerCase() === item.toLowerCase()
        );
        if (match && !newIds.includes(match._id.toString())) {
          newIds.push(match._id);
        }
      }

      // Append any omitted lectures to the end
      for (const l of existingLectures) {
        if (!newIds.some((id) => id.toString() === l._id.toString())) {
          newIds.push(l._id);
        }
      }

      await courseService.reorderLectures({
        tenantId,
        userId,
        userRole,
        courseId: course._id,
        lectureIds: newIds,
      });

      return {
        success: true,
        message: `Lectures in "${course.title}" reordered successfully.`,
        data: { reorderedCount: newIds.length },
      };
    },
  },

  // 11. COMPOUND: CREATE COURSE AND LECTURES
  compoundCreateCourseAndLectures: {
    definition: {
      type: "function",
      function: {
        name: "compoundCreateCourseAndLectures",
        description: "Create a complete course and immediately attach multiple structured lectures to it in one action.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title of the course" },
            description: { type: "string", description: "Course description" },
            category: { type: "string", description: "Course category" },
            price: { type: "number", description: "Price in rupees (₹)" },
            level: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
            lectureTitles: {
              type: "array",
              items: { type: "string" },
              description: "Array of lecture titles to create and add to the course",
            },
          },
          required: ["title", "lectureTitles"],
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args }) {
      let course = await courseService.findCourseByTitle({ tenantId, userId, title: args.title });
      let isNew = false;

      if (!course) {
        course = await courseService.createCourse({
          tenantId,
          userId,
          title: args.title,
          description: args.description || `Comprehensive course on ${args.title}.`,
          category: args.category || "General",
          price: Number(args.price) || 0,
          level: args.level || "Beginner",
          isPublished: false,
        });
        isNew = true;
      }

      const createdLectures = [];
      for (const lecTitle of args.lectureTitles || []) {
        if (lecTitle && lecTitle.trim()) {
          const lecRes = await lectureService.createLecture({
            tenantId,
            userId,
            userRole,
            courseId: course._id,
            lectureTitle: lecTitle.trim(),
            isPreviewFree: createdLectures.length === 0, // First lecture free preview by default
          });
          createdLectures.push(lecRes.lecture);
        }
      }

      return {
        success: true,
        message: isNew
          ? `Created course "${course.title}" with ${createdLectures.length} lectures (${createdLectures.map((l) => l.lectureTitle).join(", ")}).`
          : `Added ${createdLectures.length} lectures to existing course "${course.title}".`,
        data: {
          course,
          lectures: createdLectures,
        },
      };
    },
  },

  // 12. ADD RESOURCE / STUDY NOTE
  addResource: {
    definition: {
      type: "function",
      function: {
        name: "addResource",
        description: "Attach a study note, PDF, or downloadable resource to a course or specific lecture.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Resource title (e.g. 'Grammar Formula Sheet', 'Chapter 1 Notes')" },
            fileUrl: { type: "string", description: "Document URL or download link" },
            courseId: { type: "string", description: "Course ID" },
            courseTitle: { type: "string", description: "Course title" },
            lectureId: { type: "string", description: "Optional specific lecture ID" },
            lectureTitle: { type: "string", description: "Optional specific lecture title" },
            type: { type: "string", enum: ["pdf", "notes", "formula_sheet", "code", "file", "link"], description: "Resource type" },
            description: { type: "string", description: "Short description of the resource" },
          },
          required: ["title"],
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Target course not found for attaching this resource.");
      }

      let lectureId = args.lectureId || null;
      if (!lectureId && args.lectureTitle) {
        const found = await lectureService.findLectureByTitle({
          tenantId,
          courseId: course._id,
          title: args.lectureTitle,
        });
        if (found) lectureId = found._id;
      }

      const resource = await resourceService.addResource({
        tenantId,
        userId,
        userRole,
        courseId: course._id,
        lectureId,
        title: args.title,
        description: args.description || "",
        type: args.type || "pdf",
        fileUrl: args.fileUrl || "/public/notes-template.pdf",
        fileName: `${args.title}.pdf`,
      });

      return {
        success: true,
        message: `Resource "${resource.title}" attached to "${course.title}" successfully.`,
        data: { resource },
      };
    },
  },

  // 13. LIST RESOURCES
  listResources: {
    definition: {
      type: "function",
      function: {
        name: "listResources",
        description: "List study resources and notes attached to a course.",
        parameters: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "Course ID" },
            courseTitle: { type: "string", description: "Course title" },
          },
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Course not found");
      }

      const resources = await resourceService.listResources({ tenantId, courseId: course._id });
      if (resources.length === 0) {
        return {
          success: true,
          message: `There are no resources attached to "${course.title}" yet.`,
          data: { resources: [] },
        };
      }

      const listStr = resources.map((r) => `• ${r.title} (${r.type})`).join("\n");
      return {
        success: true,
        message: `Resources for "${course.title}":\n${listStr}`,
        data: { resources },
      };
    },
  },

  // 14. DELETE RESOURCE (High Risk)
  deleteResource: {
    definition: {
      type: "function",
      function: {
        name: "deleteResource",
        description: "Permanently delete a study resource or PDF. Requires confirmation.",
        parameters: {
          type: "object",
          properties: {
            resourceId: { type: "string", description: "Resource ID" },
            title: { type: "string", description: "Title of the resource to remove" },
            courseId: { type: "string", description: "Parent course ID" },
          },
        },
      },
    },
    riskLevel: "high",
    requiresConfirmation: () => true,
    confirmationMessage: (args) =>
      `Are you sure you want to permanently delete the study resource "${args.title || "this resource"}"?`,
    async execute({ tenantId, userId, userRole, args, context }) {
      let targetResource = null;
      if (args.resourceId) {
        targetResource = await resourceService.findResourceByTitle({
          tenantId,
          courseId: args.courseId,
          title: args.title,
        });
      }

      if (!targetResource && args.title) {
        const course = await resolveTargetCourse({ tenantId, userId, args, context });
        if (course) {
          targetResource = await resourceService.findResourceByTitle({
            tenantId,
            courseId: course._id,
            title: args.title,
          });
        }
      }

      if (!targetResource) {
        throw new Error(`Resource "${args.title || ""}" not found.`);
      }

      const result = await resourceService.deleteResource({
        tenantId,
        userId,
        userRole,
        resourceId: targetResource._id,
      });

      return {
        success: true,
        message: `Resource "${result.title}" has been deleted.`,
        data: { deletedResourceId: targetResource._id },
      };
    },
  },

  // 15. UPDATE ACADEMY BRANDING
  updateAcademyBranding: {
    definition: {
      type: "function",
      function: {
        name: "updateAcademyBranding",
        description: "Update the academy's branding, name, headline title, description, or theme colors.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Academy name" },
            title: { type: "string", description: "Main headline title on homepage" },
            subtitle: { type: "string", description: "Subtitle/tagline" },
            description: { type: "string", description: "Institution description" },
            primaryColor: { type: "string", description: "Primary brand hex color (e.g. #1e3a8a, #059669)" },
            secondaryColor: { type: "string", description: "Secondary brand hex color" },
          },
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args }) {
      const updated = await tenantService.updateTenantBranding({
        tenantId,
        userId,
        userRole,
        updateData: args,
      });

      return {
        success: true,
        message: `Updated institution branding for "${updated.name}" successfully!`,
        data: { tenant: updated },
      };
    },
  },

  // 16. GET ACADEMY ANALYTICS
  getAcademyAnalytics: {
    definition: {
      type: "function",
      function: {
        name: "getAcademyAnalytics",
        description: "Get performance metrics for the academy: total earnings, active enrolled students, total courses, and top courses.",
        parameters: {
          type: "object",
          properties: {},
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole }) {
      const stats = await analyticsService.getAcademyAnalytics({ tenantId, userId, userRole });
      return {
        success: true,
        message: `Academy Performance:\n• Total Tuition Earnings: ₹${stats.totalRevenue}\n• Active Enrolled Students: ${stats.totalEnrolledStudents}\n• Total Courses: ${stats.totalCourses} (${stats.publishedCourses} Published, ${stats.draftCourses} Draft)\n• Top Courses: ${stats.topCourses.map((c) => `"${c.title}" (${c.studentCount} students)`).join(", ") || "None yet"}`,
        data: { stats },
      };
    },
  },

  // 17. GET COURSE ANALYTICS
  getCourseAnalytics: {
    definition: {
      type: "function",
      function: {
        name: "getCourseAnalytics",
        description: "Get analytics for a specific course: student enrollments, revenue, and average student rating.",
        parameters: {
          type: "object",
          properties: {
            courseId: { type: "string", description: "Course ID" },
            courseTitle: { type: "string", description: "Course title" },
          },
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ tenantId, userId, userRole, args, context }) {
      const course = await resolveTargetCourse({ tenantId, userId, args, context });
      if (!course) {
        throw new Error("Course not found for analytics");
      }

      const stats = await analyticsService.getCourseAnalytics({
        tenantId,
        userId,
        userRole,
        courseId: course._id,
      });

      return {
        success: true,
        message: `Metrics for "${stats.title}":\n• Enrolled Students: ${stats.studentCount}\n• Tuition Revenue: ₹${stats.revenue}\n• Lectures: ${stats.lectureCount}\n• Student Rating: ${stats.avgRating} ★ (${stats.reviewCount} reviews)`,
        data: { stats },
      };
    },
  },

  // 18. GENERATE CURRICULUM OUTLINE
  generateCurriculumOutline: {
    definition: {
      type: "function",
      function: {
        name: "generateCurriculumOutline",
        description: "Generate a structured curriculum outline with topics and lecture titles for an upcoming course.",
        parameters: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Subject or topic of the course, e.g. 'Advanced Spoken English'" },
            level: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"], description: "Skill level" },
            targetAudience: { type: "string", description: "Target audience e.g. 'Working Professionals', 'College Students'" },
            lectureCount: { type: "number", description: "Number of lectures to generate (3-10)" },
          },
          required: ["topic"],
        },
      },
    },
    riskLevel: "low",
    requiresConfirmation: () => false,
    async execute({ args }) {
      const topic = args.topic || "English Speaking";
      const count = Math.min(Math.max(Number(args.lectureCount) || 5, 3), 10);
      const level = args.level || "Beginner";

      const lectures = [
        { title: `1. Introduction & Roadmap for ${topic}`, preview: true },
        { title: `2. Core Fundamentals & Rules`, preview: false },
        { title: `3. Step-by-Step Hands-on Practice`, preview: false },
        { title: `4. Real-World Applications & Edge Cases`, preview: false },
        { title: `5. Practical Drills & Common Mistakes`, preview: false },
        { title: `6. Capstone Project & Fluency Review`, preview: false },
      ].slice(0, count);

      return {
        success: true,
        message: `Here is a structured outline for "${topic}":\n${lectures.map((l) => `• ${l.title}`).join("\n")}\n\nWould you like me to create this course and add these lectures for you?`,
        data: {
          outline: {
            topic,
            level,
            lectures,
          },
        },
      };
    },
  },
};

/**
 * All OpenAI Tool Definitions formatted for the API
 */
export const OPENAI_TOOL_DEFINITIONS = Object.values(TOOL_REGISTRY).map((t) => t.definition);

