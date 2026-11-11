import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function FieldFeedback({ id, type = "error", children }) {
  if (!children) return null;
  const success = type === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;
  return <p id={id} role={success ? "status" : "alert"} aria-live="polite" className={`field-feedback ${success ? "field-feedback-success" : "field-feedback-error"}`}><Icon size={14} aria-hidden="true" /><span>{children}</span></p>;
}
