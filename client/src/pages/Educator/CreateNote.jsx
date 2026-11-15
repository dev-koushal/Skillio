import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftCircle,
  Check,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useTenant } from "../../context/TenantContext";
import { hasEducatorInstitution } from "../../auth/permissions";
import RequireInstitutionModal from "../../components/common/RequireInstitutionModal";
import NoteCover from "../../components/notes/NoteCover";
import PageHeader from "../../components/common/PageHeader";
import { compressImage, directUploadImage } from "../../utils/imageCompressor";

const MAX_PDF_SIZE = 25 * 1024 * 1024;
const MAX_COVER_SIZE = 5 * 1024 * 1024;

const fieldClass = (hasError = false) =>
  `w-full min-h-12 rounded-xl border bg-white px-4 py-3 text-[15px] text-[#29233a] outline-none transition-all placeholder:text-[#aaa5b5] ${hasError
    ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
    : "border-[#e5e1ec] hover:border-[#d4cee0] focus:border-[#7057c8] focus:ring-4 focus:ring-[#7057c8]/10"
  }`;

export default function CreateNote() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { tenant } = useTenant();
  const { userData } = useSelector((state) => state.user);

  const accent = tenant?.primaryColor || "#7057c8";

  // Premium secondary accent.
  const premiumAccent = "#d59a3a";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState("");
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [accessType, setAccessType] = useState("paid");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");
  const [videoProvider, setVideoProvider] = useState("");
  const [videoId, setVideoId] = useState("");
  const [relatedCourseId, setRelatedCourseId] = useState("");
  const [availableCourses, setAvailableCourses] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [pdfFile, setPdfFile] = useState(null);
  const [existingPdfName, setExistingPdfName] = useState("");
  const [existingPageCount, setExistingPageCount] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("ready");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [customCover, setCustomCover] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [processingNoteId, setProcessingNoteId] = useState("");
  const [publishWhenReady, setPublishWhenReady] = useState(false);

  useEffect(() => {
    if (!hasEducatorInstitution(userData, tenant)) {
      setShowReqModal(true);
    }
  }, [userData, tenant]);

  useEffect(() => {
    let active = true;

    const loadTopics = async () => {
      setTopicsLoading(true);
      setTopicsError("");

      try {
        const { data } = await api.get("/api/notes/topics");

        if (active && data?.success && Array.isArray(data.topics)) {
          setTopics(data.topics);
        }
      } catch {
        if (active) {
          setTopicsError("Topics could not be loaded. Try again.");
        }
      } finally {
        if (active) {
          setTopicsLoading(false);
        }
      }
    };

    loadTopics();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditing) return undefined;

    let active = true;

    const loadNote = async () => {
      try {
        setLoading(true);

        const { data } = await api.get(`/api/notes/educator/${id}`);

        if (!active || !data?.success || !data.note) return;

        const note = data.note;

        setTitle(note.title || "");
        setDescription(note.description || "");
        setShowDescription(Boolean(note.description));
        setTopic(note.topic || "");
        setTags(Array.isArray(note.tags) ? note.tags.join(", ") : "");
        setAccessType(note.accessType || "paid");
        setPrice(note.price == null ? "" : String(note.price));
        setVideoProvider(note.referenceVideo?.provider || "");
        setVideoId(note.referenceVideo?.videoId || "");
        setRelatedCourseId(
          note.relatedCourseId?._id || note.relatedCourseId || "",
        );
        setExistingPdfName(note.fileName || "Study material.pdf");
        setExistingPageCount(note.pageCount || 0);
        setProcessingStatus(note.processingStatus || "ready");
        setCustomCover(Boolean(note.thumbnail));
        setCoverPreview(note.thumbnail || "");

        setShowAdvanced(
          Boolean(
            note.tags?.length ||
            note.referenceVideo?.provider ||
            note.relatedCourseId,
          ),
        );
      } catch {
        toast.error("Couldn't load this note. Try again.");
        navigate("/educator/notes");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadNote();

    return () => {
      active = false;
    };
  }, [id, isEditing, navigate]);

  useEffect(() => {
    if (!isEditing) return undefined;

    let active = true;

    api
      .get("/api/course/institution-courses")
      .then(({ data }) => {
        if (active && Array.isArray(data?.courses)) {
          setAvailableCourses(data.courses);
        }
      })
      .catch(() => {
        if (active) {
          setAvailableCourses([]);
        }
      });

    return () => {
      active = false;
    };
  }, [isEditing]);

  useEffect(() => {
    if (!coverFile) return undefined;

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  useEffect(() => {
    if (!processingNoteId) return undefined;

    let active = true;
    let timer;

    const checkProcessing = async () => {
      try {
        const { data } = await api.get(
          `/api/notes/educator/${processingNoteId}`,
        );

        if (!active || !data?.note) return;

        const currentStatus = data.note.processingStatus;

        setProcessingStatus(currentStatus);

        if (currentStatus === "failed") {
          setProcessingNoteId("");

          toast.error(
            "PDF processing failed. The note was saved as a draft; edit it to try another PDF.",
          );

          navigate("/educator/notes");
          return;
        }

        if (currentStatus === "ready") {
          if (publishWhenReady) {
            const formData = new FormData();
            formData.append("status", "published");

            try {
              await api.put(`/api/notes/${processingNoteId}`, formData, {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              });

              if (!active) return;

              toast.success("Your note is published.");
            } catch {
              if (!active) return;

              toast.error(
                "Your PDF is ready, but the note is still a draft. You can publish it from Edit Note.",
              );
            }
          } else {
            toast.success("PDF ready. Your draft is saved.");
          }

          if (active) {
            navigate("/educator/notes");
          }

          return;
        }
      } catch {
        if (!active) return;
      }

      if (active) {
        timer = window.setTimeout(checkProcessing, 3500);
      }
    };

    timer = window.setTimeout(checkProcessing, 3500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [processingNoteId, publishWhenReady, navigate]);

  const clearError = (key) => {
    setErrors((current) => {
      if (!current[key]) return current;

      const next = { ...current };
      delete next[key];

      return next;
    });
  };

  const handlePdfChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setErrors((current) => ({
        ...current,
        pdf: "Choose a PDF file.",
      }));

      event.target.value = "";
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      setErrors((current) => ({
        ...current,
        pdf: "PDF must be 25 MB or smaller.",
      }));

      event.target.value = "";
      return;
    }

    setPdfFile(file);

    setErrors((current) => {
      const next = { ...current };
      delete next.pdf;
      return next;
    });
  };

  const [directCoverUrl, setDirectCoverUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);

  const handleCoverChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        cover: "Choose a JPG, PNG, or WebP image.",
      }));

      event.target.value = "";
      return;
    }

    if (file.size > MAX_COVER_SIZE) {
      setErrors((current) => ({
        ...current,
        cover: "Cover image must be 5 MB or smaller.",
      }));

      event.target.value = "";
      return;
    }

    setCoverFile(file);
    setCustomCover(true);
    setCoverUploading(true);

    try {
      const url = await directUploadImage(file, {
        folder: "skillio/notes",
        maxWidth: 800,
        maxHeight: 1000,
        quality: 0.82,
      });
      setDirectCoverUrl(url);
      setCoverFile(null);
      toast.success("Cover image uploaded!");
    } catch (err) {
      console.warn("[Direct Note Cover Fallback]", err.message);
      try {
        const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 1000 });
        setCoverFile(compressed);
      } catch {
        setCoverFile(file);
      }
    } finally {
      setCoverUploading(false);
    }

    setErrors((current) => {
      const next = { ...current };
      delete next.cover;
      return next;
    });
  };

  const handleCreateTopic = async () => {
    const cleanName = newTopic.trim();

    if (!cleanName) return;

    if (cleanName.length > 120) {
      setErrors((current) => ({
        ...current,
        topic: "Topic must be 120 characters or fewer.",
      }));

      return;
    }

    try {
      setCreatingTopic(true);

      const { data } = await api.post("/api/notes/topics", {
        name: cleanName,
      });

      const savedName = data?.topic?.name || cleanName;

      setTopics((current) =>
        [...new Set([...current, savedName])].sort((a, b) =>
          a.localeCompare(b),
        ),
      );

      setTopic(savedName);
      setNewTopic("");
      setAddingTopic(false);
      clearError("topic");
    } catch {
      setErrors((current) => ({
        ...current,
        topic: "Topic couldn't be created. Try again.",
      }));
    } finally {
      setCreatingTopic(false);
    }
  };

  const validate = (publishState) => {
    const nextErrors = {};

    if (!pdfFile && !existingPdfName) {
      nextErrors.pdf = "Choose a study PDF.";
    }

    if (!title.trim()) {
      nextErrors.title = "Enter a title.";
    } else if (title.trim().length > 180) {
      nextErrors.title = "Title must be 180 characters or fewer.";
    }

    if (!topic.trim()) {
      nextErrors.topic = "Choose an institution topic.";
    }

    if (accessType === "paid") {
      const amount = Number(price);

      if (
        !price ||
        !Number.isFinite(amount) ||
        amount < 0.01 ||
        amount > 1_000_000
      ) {
        nextErrors.price = "Enter a price from ₹0.01 to ₹10,00,000.";
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();

      return false;
    }

    if (
      publishState === "published" &&
      processingStatus !== "ready" &&
      isEditing &&
      !pdfFile
    ) {
      setErrors((current) => ({
        ...current,
        pdf: "Wait for PDF processing to finish before publishing.",
      }));

      return false;
    }

    return true;
  };

  const handleSubmit = async (publishState) => {
    if (processingNoteId || submitting || !validate(publishState)) {
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("topic", topic.trim());
      formData.append("accessType", accessType);
      formData.append("price", accessType === "free" ? "0" : price);
      formData.append("status", publishState);
      formData.append("thumbnailType", customCover ? "custom" : "generated");

      if (showAdvanced) {
        if (tags) formData.append("tags", tags);
        if (videoProvider) formData.append("referenceVideoProvider", videoProvider);
        if (videoId?.trim()) formData.append("referenceVideoId", videoId.trim());
        if (relatedCourseId) formData.append("relatedCourseId", relatedCourseId);
      }

      if (pdfFile) {
        formData.append("file", pdfFile);
      }

      if (directCoverUrl) {
        formData.append("thumbnail", directCoverUrl);
      } else if (coverFile) {
        formData.append("thumbnail", coverFile);
      }

      const response = isEditing
        ? await api.put(`/api/notes/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        : await api.post("/api/notes", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

      const note = response.data?.note;

      if (note?.processingStatus === "processing") {
        if (publishState === "published" && note._id) {
          setProcessingNoteId(note._id);
          setPublishWhenReady(true);
          setProcessingStatus("processing");

          toast.info(
            "PDF processing started. We'll publish the note automatically when it's ready.",
          );

          return;
        }

        toast.info("PDF processing started. Your note is saved as a draft.");
      } else {
        toast.success(
          publishState === "published"
            ? isEditing
              ? "Note updated and published."
              : "Note published."
            : isEditing
              ? "Draft saved."
              : "Note saved as a draft.",
        );
      }

      navigate("/educator/notes");
    } catch (error) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (
        status === 400 &&
        /price/i.test(serverMessage || "")
      ) {
        setErrors((current) => ({
          ...current,
          price: serverMessage || "Enter a valid price for this note.",
        }));
        toast.error(serverMessage || "Enter a valid price for this note.");
      } else if (
        status === 400 &&
        /topic/i.test(serverMessage || "")
      ) {
        setErrors((current) => ({
          ...current,
          topic: serverMessage || "Choose a valid institution topic.",
        }));
        toast.error(serverMessage || "Choose a valid institution topic.");
      } else if (
        status === 400 &&
        /title/i.test(serverMessage || "")
      ) {
        setErrors((current) => ({
          ...current,
          title: serverMessage || "Enter a valid title.",
        }));
        toast.error(serverMessage || "Enter a valid title.");
      } else if (
        status === 400 &&
        /pdf|file/i.test(serverMessage || "")
      ) {
        setErrors((current) => ({
          ...current,
          pdf: serverMessage || "Check the uploaded PDF file.",
        }));
        toast.error(serverMessage || "Check the uploaded PDF file.");
      } else if (status === 503) {
        toast.error(
          serverMessage ||
          "Secure PDF storage is temporarily unavailable. Try again later.",
        );
      } else {
        toast.error(
          serverMessage ||
          "Couldn't save the note. Check your details and try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#faf9fd] text-sm text-[#777281]">
        <div className="flex items-center gap-2">
          <LoaderCircle size={17} className="animate-spin text-[#7057c8]" />
          Loading note…
        </div>
      </div>
    );
  }

  const pdfName = pdfFile?.name || existingPdfName;

  const pdfSize = pdfFile
    ? `${(pdfFile.size / (1024 * 1024)).toFixed(1)} MB`
    : "";

  const canPublish =
    processingStatus === "ready" || !isEditing || Boolean(pdfFile);

  return (
    <div className="min-h-screen bg-[#faf9fd] pb-28 text-[#29233a] sm:pb-12">
      <main className="mx-auto w-full max-w-4xl px-4 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            to="/educator/notes"
            className="mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[#716b7d] transition hover:bg-white hover:text-[#4c4163]"
          >
            <ArrowLeftCircle size={16} />
            <span>Notes</span>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[28px] font-bold tracking-[-0.04em] text-[#282035] sm:text-[34px]">
                {isEditing ? "Edit note" : "Create note"}
              </h1>

              {!isEditing && (
                <span
                  className="hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] sm:inline-flex"
                  style={{
                    backgroundColor: `${premiumAccent}15`,
                    color: premiumAccent,
                  }}
                >
                  Study material
                </span>
              )}
            </div>

            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#777281]">
              {isEditing
                ? "Update your study material and publish changes when ready."
                : "Add a study PDF and publish it for your students."}
            </p>
          </div>
        </div>

        {/* Processing banner */}
        {processingNoteId && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-[#ddd5f3] bg-[#f4f0ff]">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7057c8] text-white shadow-sm">
                <LoaderCircle size={18} className="animate-spin" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#3f315f]">
                  Processing your PDF
                </p>

                <p className="mt-1 text-xs leading-5 text-[#6d6380]">
                  Your note will be published automatically when secure PDF
                  processing is complete.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProcessingNoteId("");
                  setPublishWhenReady(false);

                  toast.info(
                    "Your note will remain a draft while the PDF finishes processing.",
                  );

                  navigate("/educator/notes");
                }}
                className="shrink-0 rounded-lg px-2.5 py-2 text-xs font-bold text-[#5d4a8a] transition hover:bg-white"
              >
                Save draft
              </button>
            </div>

            <div className="h-1 w-full overflow-hidden bg-[#e8e0fa]">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#7057c8]" />
            </div>
          </div>
        )}

        <form
          onSubmit={(event) => event.preventDefault()}
          className="overflow-hidden rounded-3xl border border-[#e8e4ef] bg-white shadow-[0_12px_45px_rgba(45,32,72,0.06)]"
        >
          {/* ================================
              STUDY MATERIAL
          ================================= */}
          <section
            aria-labelledby="study-material-heading"
            className="p-4 sm:p-7"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0ebff] text-[#7057c8]">
                <FileText size={19} />
              </div>

              <div>
                <h2
                  id="study-material-heading"
                  className="text-[15px] font-bold text-[#30283d]"
                >
                  Study material
                </h2>

                <p className="mt-0.5 text-xs text-[#8a8492]">
                  Upload one PDF · Maximum 25 MB
                </p>
              </div>
            </div>

            <label
              htmlFor="note-pdf"
              className={`group block cursor-pointer rounded-2xl border-2 border-dashed p-5 transition-all sm:p-7 ${errors.pdf
                ? "border-red-300 bg-red-50/40"
                : pdfName
                  ? "border-[#cfc4eb] bg-[#faf8ff] hover:border-[#b7a8dc]"
                  : "border-[#e2dfe8] bg-[#fcfbfd] hover:border-[#b8a9dc] hover:bg-[#faf8ff]"
                }`}
            >
              <input
                id="note-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdfChange}
                className="sr-only"
                aria-describedby={errors.pdf ? "pdf-error" : "pdf-help"}
              />

              {pdfName ? (
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7057c8] text-white shadow-sm shadow-[#7057c8]/20">
                    <Check size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#30283d]">
                      {pdfName}
                    </p>

                    <p className="mt-1 text-xs text-[#85808e]">
                      {pdfFile
                        ? `${pdfSize} · PDF selected`
                        : `${existingPageCount || "—"} pages · ${processingStatus === "ready"
                          ? "Ready"
                          : processingStatus === "failed"
                            ? "Failed"
                            : "Processing"
                        }`}
                    </p>
                  </div>

                  <div className="hidden shrink-0 rounded-lg bg-[#f0ebff] px-3 py-2 text-xs font-bold text-[#7057c8] sm:block">
                    Change PDF
                  </div>

                  <Upload
                    size={18}
                    className="shrink-0 text-[#8e869f] sm:hidden"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0ebff] text-[#7057c8] transition group-hover:scale-105 group-hover:bg-[#e9e2fb]">
                    <Upload size={20} />
                  </div>

                  <p className="text-sm font-bold text-[#30283d]">
                    Choose a study PDF
                  </p>

                  <p id="pdf-help" className="mt-1.5 text-xs text-[#8a8492]">
                    PDF only · Up to 25 MB
                  </p>
                </div>
              )}
            </label>

            {errors.pdf && (
              <p
                id="pdf-error"
                className="mt-2 text-xs font-medium text-red-600"
              >
                {errors.pdf}
              </p>
            )}
          </section>

          <div className="h-px bg-[#eeeaf3]" />

          {/* ================================
              DETAILS
          ================================= */}
          <section
            aria-labelledby="details-heading"
            className="space-y-5 p-4 sm:p-7"
          >
            <div>
              <h2
                id="details-heading"
                className="text-[15px] font-bold text-[#30283d]"
              >
                Details
              </h2>

              <p className="mt-1 text-xs text-[#8a8492]">
                Give your students enough information to understand what they're
                getting.
              </p>
            </div>

            {/* Title */}
            <div>
              <label
                htmlFor="note-title"
                className="mb-2 block text-xs font-bold text-[#595263]"
              >
                Title <span className="text-red-500">*</span>
              </label>

              <input
                id="note-title"
                type="text"
                maxLength={180}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearError("title");
                }}
                placeholder="e.g. Complete DBMS Revision Notes"
                className={`${fieldClass(Boolean(errors.title))} text-base font-medium sm:text-[15px]`}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : undefined}
              />

              {errors.title && (
                <p
                  id="title-error"
                  className="mt-2 text-xs font-medium text-red-600"
                >
                  {errors.title}
                </p>
              )}
            </div>

            {/* Topic */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="note-topic"
                  className="block text-xs font-bold text-[#595263]"
                >
                  Topic <span className="text-red-500">*</span>
                </label>

                {!addingTopic && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingTopic(true);
                      clearError("topic");
                    }}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#7057c8] transition hover:bg-[#f4f0ff]"
                  >
                    <Plus size={14} />
                    Create topic
                  </button>
                )}
              </div>

              {addingTopic ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    maxLength={120}
                    value={newTopic}
                    onChange={(event) => {
                      setNewTopic(event.target.value);
                      clearError("topic");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateTopic();
                      }

                      if (event.key === "Escape") {
                        setAddingTopic(false);
                      }
                    }}
                    placeholder="New topic name"
                    className={fieldClass(Boolean(errors.topic))}
                    aria-label="New topic name"
                  />

                  <button
                    type="button"
                    disabled={creatingTopic || !newTopic.trim()}
                    onClick={handleCreateTopic}
                    className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: accent }}
                  >
                    {creatingTopic ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}

                    <span className="hidden sm:inline">Add</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddingTopic(false);
                      setNewTopic("");
                    }}
                    className="inline-flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#e5e1ec] text-[#777281] transition hover:bg-[#faf9fd]"
                    aria-label="Cancel creating topic"
                  >
                    <X size={17} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="note-topic"
                    value={topic}
                    onChange={(event) => {
                      setTopic(event.target.value);
                      clearError("topic");
                    }}
                    className={`${fieldClass(
                      Boolean(errors.topic),
                    )} appearance-none pr-10`}
                    aria-invalid={Boolean(errors.topic)}
                    disabled={topicsLoading || Boolean(topicsError)}
                  >
                    <option value="">
                      {topicsLoading
                        ? "Loading topics…"
                        : topicsError
                          ? "Topics unavailable"
                          : "Select a topic"}
                    </option>

                    {topics.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8d8797]"
                  />
                </div>
              )}

              {errors.topic && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  {errors.topic}
                </p>
              )}

              {topicsError && (
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-red-600">
                  <span>{topicsError}</span>

                  <button
                    type="button"
                    onClick={() => {
                      setTopicsLoading(true);
                      setTopicsError("");

                      api
                        .get("/api/notes/topics")
                        .then(({ data }) =>
                          setTopics(
                            Array.isArray(data?.topics) ? data.topics : [],
                          ),
                        )
                        .catch(() =>
                          setTopicsError(
                            "Topics could not be loaded. Try again.",
                          ),
                        )
                        .finally(() => setTopicsLoading(false));
                    }}
                    className="font-bold underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Cover */}
            {/* Cover Image */}
            <div className="rounded-2xl border border-[#ebe7f0] bg-white">
              <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1edff] text-[#7057c8]">
                    <ImageIcon size={18} strokeWidth={2} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#30283d]">
                        Cover image
                      </h3>

                      <span className="rounded-full bg-[#f4eee2] px-2 py-0.5 text-[10px] font-semibold text-[#a2762e]">
                        Optional
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-[#898390]">
                      {customCover
                        ? "Custom cover uploaded."
                        : "A cover will be generated automatically."}
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="note-cover"
                  className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[#ddd8e5] bg-white px-3.5 text-xs font-semibold text-[#51495e] transition hover:border-[#bfb6cf] hover:bg-[#faf9fd]"
                >
                  <ImageIcon size={14} />

                  {customCover ? "Change" : "Upload"}
                </label>

                <input
                  id="note-cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  className="sr-only"
                />
              </div>

              {/* Custom cover uploaded */}
              {customCover && coverPreview && (
                <div className="border-t border-[#eeeaf3] px-4 py-3 sm:px-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf8f1] text-[#37885a]">
                        <Check size={14} />
                      </div>

                      <span className="text-xs font-medium text-[#625b6b]">
                        Custom cover ready
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview("");
                        setCustomCover(false);
                      }}
                      className="text-xs font-semibold text-[#817a89] hover:text-[#51495e]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {errors.cover && (
              <p className="mt-2 text-xs font-medium text-red-600">
                {errors.cover}
              </p>
            )}

            {errors.cover && (
              <p className="mt-2 text-xs font-medium text-red-600">
                {errors.cover}
              </p>
            )}

            {errors.cover && (
              <p className="-mt-2 text-xs font-medium text-red-600">
                {errors.cover}
              </p>
            )}

            {/* Description */}
            <div>
              <button
                type="button"
                onClick={() => setShowDescription((current) => !current)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-xs font-bold text-[#777281] transition hover:text-[#51495e]"
                aria-expanded={showDescription}
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showDescription ? "rotate-180" : ""
                    }`}
                />

                {description
                  ? "Edit description"
                  : "Add a description (optional)"}
              </button>

              {showDescription && (
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add a short description for your students"
                  className="mt-2 w-full resize-y rounded-xl border border-[#e5e1ec] bg-white px-4 py-3 text-[15px] text-[#29233a] outline-none transition placeholder:text-[#aaa5b5] focus:border-[#7057c8] focus:ring-4 focus:ring-[#7057c8]/10"
                />
              )}
            </div>

            {/* Advanced */}
            {isEditing && (
              <div className="border-t border-[#eeeaf3] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((current) => !current)}
                  className="flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left transition hover:bg-[#faf9fd]"
                  aria-expanded={showAdvanced}
                >
                  <div>
                    <p className="text-sm font-bold text-[#51495e]">
                      Advanced options
                    </p>

                    <p className="mt-0.5 text-xs text-[#928b99]">
                      Tags, reference video and related course
                    </p>
                  </div>

                  <ChevronDown
                    size={17}
                    className={`text-[#8a8492] transition-transform ${showAdvanced ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showAdvanced && (
                  <div className="mt-4 grid gap-4 rounded-2xl bg-[#faf9fd] p-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="note-tags"
                        className="mb-2 block text-xs font-bold text-[#595263]"
                      >
                        Search tags
                      </label>

                      <input
                        id="note-tags"
                        value={tags}
                        onChange={(event) => setTags(event.target.value)}
                        placeholder="Separate tags with commas"
                        className={fieldClass()}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="note-video-provider"
                        className="mb-2 block text-xs font-bold text-[#595263]"
                      >
                        Reference video
                      </label>

                      <div className="relative">
                        <select
                          id="note-video-provider"
                          value={videoProvider}
                          onChange={(event) =>
                            setVideoProvider(event.target.value)
                          }
                          className={`${fieldClass()} appearance-none pr-10`}
                        >
                          <option value="">None</option>
                          <option value="youtube">YouTube</option>
                          <option value="bunny">Bunny Stream</option>
                        </select>

                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8d8797]"
                        />
                      </div>

                      {videoProvider && (
                        <input
                          value={videoId}
                          onChange={(event) => setVideoId(event.target.value)}
                          placeholder={
                            videoProvider === "youtube"
                              ? "YouTube ID or link"
                              : "Bunny video ID"
                          }
                          className={`${fieldClass()} mt-2`}
                        />
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="note-related-course"
                        className="mb-2 block text-xs font-bold text-[#595263]"
                      >
                        Related course
                      </label>

                      <div className="relative">
                        <select
                          id="note-related-course"
                          value={relatedCourseId}
                          onChange={(event) =>
                            setRelatedCourseId(event.target.value)
                          }
                          className={`${fieldClass()} appearance-none pr-10`}
                        >
                          <option value="">None — standalone note</option>

                          {availableCourses.map((course) => (
                            <option key={course._id} value={course._id}>
                              {course.title}
                            </option>
                          ))}
                        </select>

                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8d8797]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <div className="h-px bg-[#eeeaf3]" />

          {/* ================================
              ACCESS
          ================================= */}
          <section aria-labelledby="pricing-heading" className="p-4 sm:p-7">
            <div className="mb-4">
              <h2
                id="pricing-heading"
                className="text-[15px] font-bold text-[#30283d]"
              >
                Access
              </h2>

              <p className="mt-1 text-xs text-[#8a8492]">
                Choose whether students can access this note for free or by
                purchasing it.
              </p>
            </div>

            <div className="grid grid-cols-2 rounded-2xl bg-[#f6f3fa] p-1.5">
              {[
                {
                  value: "free",
                  label: "Free",
                },
                {
                  value: "paid",
                  label: "Paid",
                },
              ].map((option) => {
                const active = accessType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAccessType(option.value);

                      if (option.value === "free") {
                        setPrice("");
                        clearError("price");
                      }
                    }}
                    aria-pressed={active}
                    className={`min-h-12 rounded-xl px-3 text-sm font-bold transition-all ${active
                      ? "bg-white text-[#4f3e78] shadow-[0_2px_8px_rgba(45,32,72,0.08)]"
                      : "text-[#85808e] hover:text-[#5e5668]"
                      }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {active && (
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              option.value === "paid" ? premiumAccent : accent,
                          }}
                        />
                      )}

                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {accessType === "paid" && (
              <div className="mt-5 max-w-sm">
                <label
                  htmlFor="note-price"
                  className="mb-2 block text-xs font-bold text-[#595263]"
                >
                  Price <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold"
                    style={{ color: premiumAccent }}
                  >
                    ₹
                  </span>

                  <input
                    id="note-price"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => {
                      setPrice(event.target.value);
                      clearError("price");
                    }}
                    placeholder="149"
                    className={`${fieldClass(
                      Boolean(errors.price),
                    )} pl-9 text-base font-semibold`}
                    aria-invalid={Boolean(errors.price)}
                    aria-describedby={errors.price ? "price-error" : undefined}
                  />
                </div>

                {errors.price && (
                  <p
                    id="price-error"
                    className="mt-2 text-xs font-medium text-red-600"
                  >
                    {errors.price}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ================================
              ACTIONS
          ================================= */}
          <section className="border-t border-[#eeeaf3] bg-[#fbfafd] p-4 sm:px-7 sm:py-5">
            {processingStatus !== "ready" && isEditing && !pdfFile && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#e8e1f5] bg-white px-3.5 py-3 text-xs text-[#777281]">
                <AlertCircle
                  size={15}
                  className="mt-0.5 shrink-0 text-[#8b7aaf]"
                />

                <span>
                  PDF is {processingStatus}. You can save a draft now, then
                  publish when it is ready.
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting || Boolean(processingNoteId)}
                onClick={() => handleSubmit("draft")}
                className="min-h-12 rounded-xl border border-[#ded9e7] bg-white px-5 text-sm font-bold text-[#625b6b] transition hover:border-[#cfc8da] hover:bg-[#faf9fd] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save draft"}
              </button>

              <button
                type="button"
                disabled={
                  submitting || Boolean(processingNoteId) || !canPublish
                }
                onClick={() => handleSubmit("published")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-[0_5px_15px_rgba(112,87,200,0.2)] transition-all hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:min-w-[170px]"
                style={{
                  backgroundColor: accent,
                }}
              >
                {submitting && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}

                {submitting
                  ? "Uploading…"
                  : isEditing
                    ? "Publish changes"
                    : "Publish note"}
              </button>
            </div>
          </section>
        </form>
      </main>

      <RequireInstitutionModal
        isOpen={showReqModal}
        onClose={() => {
          setShowReqModal(false);
          navigate("/educator/home");
        }}
      />

      {/* Mobile sticky publish action */}
      {!processingNoteId && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e7e2ed] bg-white/95 p-3 backdrop-blur-md sm:hidden">
          <div className="mx-auto flex max-w-4xl gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("draft")}
              className="min-h-12 flex-1 rounded-xl border border-[#ded9e7] bg-white px-3 text-sm font-bold text-[#625b6b] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save draft"}
            </button>

            <button
              type="button"
              disabled={submitting || !canPublish}
              onClick={() => handleSubmit("published")}
              className="min-h-12 flex-[1.5] rounded-xl px-4 text-sm font-bold text-white shadow-sm disabled:opacity-50"
              style={{
                backgroundColor: accent,
              }}
            >
              {submitting
                ? "Uploading…"
                : isEditing
                  ? "Publish changes"
                  : "Publish note"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
