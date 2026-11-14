import React, { useState } from "react";
import { LoaderCircle, Zap } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const FIELD_INSTRUCTIONS = {
  title: "Generate a fresh, clear course title based on the subject and details. Replace the current title; do not repeat it verbatim.",
  category: "Generate the most appropriate subject or topic category for this course. Return only the category text.",
  subTitle: "Generate a fresh, concise headline for this course. Replace the current headline; return only the headline text.",
  description: "Generate a clear course description with the audience, learning topics, and outcomes. Replace the current description.",
};

export default function InlineFieldAIGenerateButton({ field, currentFields, onGenerated, className = "" }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const topic = field === "title"
        ? (currentFields.category?.trim() && currentFields.category.trim() !== "General" ? currentFields.category.trim() : currentFields.title?.trim() || "New course")
        : currentFields.title?.trim() || currentFields.category?.trim() || "New course";
      const { data } = await api.post("/api/ai/write-course", {
        topic,
        prompt: FIELD_INSTRUCTIONS[field],
        currentFields,
        fieldToGenerate: field,
      });
      const value = data?.fields?.[field];
      if (!data?.success || typeof value !== "string" || !value.trim()) {
        throw new Error("No text was generated for this field.");
      }
      onGenerated(value.trim());
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't generate text for this field. Your other fields are unchanged.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={`course-field-ai-button ${className}`}
      onClick={generate}
      disabled={loading}
      aria-label={`Generate ${field === "subTitle" ? "headline" : field} with AI`}
      title={`Generate only this ${field === "subTitle" ? "headline" : field}`}
    >
      {loading ? <LoaderCircle size={15} className="animate-spin" /> : <Zap size={15} fill="currentColor" />}
    </button>
  );
}
