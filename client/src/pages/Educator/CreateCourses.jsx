import React, { useState } from "react";
import { ArrowLeft, BookPlus, Sparkles, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";
import { useTenant } from "../../context/TenantContext";

const SUGGESTED_TOPICS = [
  "General",
  "Spoken English",
  "Grammar",
  "Physics",
  "Mathematics",
  "Programming",
  "Exam Preparation",
  "Business & Career",
];

function CreateCourses() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateCourse = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a course title");
      return;
    }

    setLoading(true);
    try {
      const topicToSave = category.trim() || "General";
      const { data } = await api.post("/api/course/create", {
        title: title.trim(),
        category: topicToSave,
        subTitle: subTitle.trim(),
      });

      toast.success("Course draft initialized! Welcome to the Course Studio.");
      navigate(`/editcourse/${data._id}`);
    } catch (error) {
      console.error("[CreateCourse Error]", error);
      toast.error(error.response?.data?.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  const tenantName = tenant?.name || "your organization";

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-xl bg-white border border-[#e8e5dc] rounded-2xl shadow-sm p-6 sm:p-10 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-[#e8e5dc]">
            <button
              onClick={() => navigate("/courses")}
              className="p-2 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
              aria-label="Back to courses"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#eff6ff] text-[#1e3a8a]">
                  <BookPlus size={18} />
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
                  Create New Course
                </h1>
              </div>
              <p className="text-xs text-[#78716c] mt-0.5">
                Set up the foundations for your new course in {tenantName}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateCourse} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Course Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Practical Spoken English for Professionals"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 sm:py-3 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Subtitle / Headline (Optional)
              </label>
              <input
                type="text"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="e.g. Master everyday conversations, pronunciation, and confidence"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              />
            </div>

            {/* Topic / Subject */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c]">
                  Subject or Topic
                </label>
                <span className="text-[11px] text-[#78716c]">Choose or type any topic</span>
              </div>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Spoken English, Mechanics, Web Development..."
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              />

              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setCategory(topic)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      category === topic
                        ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                        : "bg-[#f8f7f4] border-[#e8e5dc] text-[#57534e] hover:bg-[#f1ede4]"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Studio Workflow Hint */}
            <div className="p-4 bg-[#eff6ff]/60 rounded-xl border border-[#bfdbfe]/60 text-xs text-[#1e3a8a] space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles size={14} /> Course Studio Steps
              </p>
              <p className="text-[#3b82f6]">
                Once created, you'll be able to upload video lectures, attach lecture notes/PDFs, configure pricing, and publish when you're ready.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-semibold py-3 rounded-xl transition shadow-xs min-h-[46px]"
              >
                Create & Open Course Studio
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCourses;
