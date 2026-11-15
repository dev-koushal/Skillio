import User from "./userModel.js";
import Course from "./coursesModel.js";
import Lecture from "./lectureModel.js";
import Review from "./reviewModel.js";
import Tenant from "./tenantModel.js";
import Resource from "./resourceModel.js";
import InstitutionMembership from "./institutionMembershipModel.js";
import CourseAccess from "./courseAccessModel.js";
import Invitation from "./invitationModel.js";
import Session from "./sessionModel.js";
import AiActionLog from "./aiActionLogModel.js";
import LiveClass from "./liveClassModel.js";
import ResourceEntitlement from "./resourceEntitlementModel.js";
import PaymentWebhookEvent from "./paymentWebhookEventModel.js";
import Note from "./noteModel.js";
import Topic from "./topicModel.js";
import NoteEntitlement from "./noteEntitlementModel.js";
import NoteViewerSession from "./noteViewerSessionModel.js";
import NoteAccessLog from "./noteAccessLogModel.js";

// Ensure all Mongoose schemas are pre-registered on app startup
export {
  User,
  Course,
  Lecture,
  Review,
  Tenant,
  Resource,
  InstitutionMembership,
  CourseAccess,
  Invitation,
  Session,
  AiActionLog,
  LiveClass,
  ResourceEntitlement,
  PaymentWebhookEvent,
  Note,
  Topic,
  NoteEntitlement,
  NoteViewerSession,
  NoteAccessLog,
};
