import express from "express";
import isAuth from "../middleware/isAuth.js";
import requireEducatorInstitution from "../middleware/requireEducatorInstitution.js";
import requireNoteCatalogAccess from "../middleware/requireNoteCatalogAccess.js";
import noteUploadFields from "../middleware/noteUpload.js";
import {
  createNote,
  getEducatorNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getInstitutionTopics,
  createInstitutionTopic,
  getStudentNotes,
  getStudentNoteDetails,
  createNoteOrder,
  verifyNotePayment,
  claimFreeNote,
  createViewerSession,
  getNotePage,
} from "../controller/noteController.js";

const noteRouter = express.Router();

const handleNoteUpload = (req, res, next) => {
  noteUploadFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload file. Please check file format and size.",
      });
    }
    next();
  });
};

// Public / Student Catalog & Details
noteRouter.get("/student", isAuth, requireNoteCatalogAccess, getStudentNotes);
noteRouter.get("/topics", isAuth, requireNoteCatalogAccess, getInstitutionTopics);
noteRouter.get("/:id", isAuth, requireNoteCatalogAccess, getStudentNoteDetails);

// Student Purchase & Reading (Requires student auth)
noteRouter.post("/:noteId/order", isAuth, createNoteOrder);
noteRouter.post("/verify-payment", isAuth, verifyNotePayment);
noteRouter.post("/:noteId/claim-free", isAuth, requireNoteCatalogAccess, claimFreeNote);
noteRouter.post("/:id/viewer-session", isAuth, requireNoteCatalogAccess, createViewerSession);
noteRouter.get("/:id/pages/:pageNumber", isAuth, requireNoteCatalogAccess, getNotePage);

// Educator Management (Requires educator auth + owned institution)
noteRouter.post("/", isAuth, requireEducatorInstitution, handleNoteUpload, createNote);
noteRouter.get("/educator/list", isAuth, requireEducatorInstitution, getEducatorNotes);
noteRouter.get("/educator/:id", isAuth, requireEducatorInstitution, getNoteById);
noteRouter.put("/:id", isAuth, requireEducatorInstitution, handleNoteUpload, updateNote);
noteRouter.delete("/:id", isAuth, requireEducatorInstitution, deleteNote);
noteRouter.post("/topics", isAuth, requireEducatorInstitution, createInstitutionTopic);

export default noteRouter;
