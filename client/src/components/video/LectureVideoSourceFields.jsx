import React, { useEffect, useState } from "react";
import { CheckCircle2, Link2, LoaderCircle, UploadCloud } from "lucide-react";
import api from "../../services/api";
import FieldFeedback from "../common/FieldFeedback";
import { buildYouTubeEmbedUrl } from "../../utils/youtubeVideo";

const noop = () => {};

export default function LectureVideoSourceFields({
  idPrefix,
  provider,
  onProviderChange,
  youtubeUrl,
  onYoutubeUrlChange,
  videoFile,
  onVideoFileChange,
  onValidatedVideoIdChange = noop,
  currentProvider = "",
  currentVideoId = "",
}) {
  const [validatedVideoId, setValidatedVideoId] = useState("");
  const [validationState, setValidationState] = useState({ status: "idle", message: "" });

  useEffect(() => {
    const savedUrl = currentVideoId ? `https://www.youtube.com/watch?v=${currentVideoId}` : "";
    if (provider === "youtube" && currentProvider === "youtube" && currentVideoId && youtubeUrl === savedUrl) {
      setValidatedVideoId(currentVideoId);
      onValidatedVideoIdChange(currentVideoId);
      setValidationState({ status: "valid", message: "Saved YouTube video" });
    }
  }, [provider, currentProvider, currentVideoId, youtubeUrl, onValidatedVideoIdChange]);

  const handleUrlChange = (event) => {
    onYoutubeUrlChange(event.target.value);
    setValidatedVideoId("");
    onValidatedVideoIdChange("");
    setValidationState({ status: "idle", message: "" });
  };

  const validateVideo = async () => {
    setValidationState({ status: "loading", message: "Checking YouTube link…" });
    setValidatedVideoId("");
    onValidatedVideoIdChange("");
    try {
      const { data } = await api.post("/api/course/youtube/validate", { youtubeUrl });
      if (!data?.success || !data.videoId) throw new Error("We could not verify that YouTube link.");
      setValidatedVideoId(data.videoId);
      onValidatedVideoIdChange(data.videoId);
      onYoutubeUrlChange(data.canonicalUrl || youtubeUrl);
      setValidationState({ status: "valid", message: "YouTube video detected. Embedding may still depend on the creator’s settings." });
    } catch (error) {
      setValidationState({ status: "error", message: error.response?.data?.message || error.message || "Enter a supported YouTube video URL." });
    }
  };

  const selectProvider = (nextProvider) => {
    if (nextProvider !== provider) onVideoFileChange(null);
    onProviderChange(nextProvider);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-bold uppercase tracking-wider text-[#44403c]">Lecture Video</legend>
      <div className="grid grid-cols-2 gap-2">
        {[{ value: "upload", label: "Upload Video", icon: UploadCloud }, { value: "youtube", label: "YouTube Video", icon: Link2 }].map(({ value, label, icon: Icon }) => (
          <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${provider === value ? "border-[#5b3cc4] bg-[#f5f2ff] text-[#4b2fa8]" : "border-[#e8e5dc] bg-white text-[#57534e] hover:border-[#c4b5fd]"}`}>
            <input type="radio" name={`${idPrefix}-video-provider`} value={value} checked={provider === value} onChange={() => selectProvider(value)} className="accent-[#5b3cc4]" />
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {provider === "youtube" ? (
        <div className="space-y-2 rounded-xl border border-[#e8e5dc] bg-[#faf9f6] p-3">
          <label htmlFor={`${idPrefix}-youtube-url`} className="block text-xs font-semibold text-[#44403c]">YouTube URL</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id={`${idPrefix}-youtube-url`} name={`${idPrefix}-youtube-url`} type="url" inputMode="url" autoComplete="off" spellCheck={false} aria-invalid={validationState.status === "error"} value={youtubeUrl} onChange={handleUrlChange} placeholder="https://youtu.be/…" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#d6d3c9] bg-white px-3 text-sm text-[#1c1917] outline-none focus-visible:ring-2 focus-visible:ring-[#5b3cc4]" />
            <button type="button" onClick={validateVideo} disabled={!youtubeUrl.trim() || validationState.status === "loading"} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#d6d3c9] bg-white px-3 text-xs font-bold text-[#4b2fa8] hover:bg-[#f5f2ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b3cc4] disabled:cursor-not-allowed disabled:opacity-50">
              {validationState.status === "loading" ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              Validate Video
            </button>
          </div>
          <FieldFeedback type={validationState.status === "error" ? "error" : "success"}>{validationState.message}</FieldFeedback>
          {validatedVideoId && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} aria-hidden="true" /> Preview</p>
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <iframe src={buildYouTubeEmbedUrl(validatedVideoId)} title="YouTube lecture preview" className="h-full w-full border-0" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-[#e8e5dc] bg-[#faf9f6] p-3">
          {currentProvider && <p className="text-xs text-[#57534e]">Current source: <span className="font-semibold text-[#1c1917]">{currentProvider === "youtube" ? "YouTube" : currentProvider === "bunny" ? "Bunny Stream" : "Uploaded video"}</span></p>}
          <label htmlFor={`${idPrefix}-video-file`} className="block text-xs font-semibold text-[#44403c]">{currentProvider && currentProvider !== "youtube" ? "Replace video file" : "Video file"}</label>
          <input id={`${idPrefix}-video-file`} name={`${idPrefix}-video-file`} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => onVideoFileChange(event.target.files?.[0] || null)} className="w-full text-xs text-[#57534e] file:mr-2 file:min-h-9 file:rounded-lg file:border-0 file:bg-white file:px-3 file:text-xs file:font-semibold file:text-[#4b2fa8] file:shadow-sm" />
          {videoFile && <p className="break-all text-xs text-[#57534e]">Selected: <span className="font-semibold">{videoFile.name}</span></p>}
          {currentProvider === "youtube" && <p className="text-xs text-amber-800">Choose a video file to switch away from the saved YouTube source. Existing uploaded streams are kept when replaced.</p>}
        </div>
      )}
    </fieldset>
  );
}
