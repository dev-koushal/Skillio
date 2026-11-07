import React, { useState } from "react";
import { ArrowLeft, BookPlus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";
import Button from "../../components/common/Button";
import Navbar from "../../components/Navbar";

const CATEGORIES = [
  "Development",
  "Cyber Security",
  "Business",
  "AI/ML",
  "Data Science",
  "UI/UX Design",
  "Cloud & DevOps",
  "Engineering & Science",
];

function CreateCourses() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateCourse = async (e) => {
    e?.preventDefault();
    if (!title || !category) {
      toast.error("Please provide both a course title and category");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/course/create", {
        title: title.trim(),
        category,
      });

      toast.success("Course draft created! Configure curriculum, pricing & resources.");
      navigate(`/editcourse/${data._id}`);
    } catch (error) {
      console.error("[CreateCourse Error]", error);
      toast.error(error.response?.data?.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-lg bg-white border border-[#e8e5dc] rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-[#e8e5dc]">
            <button
              onClick={() => navigate("/courses")}
              className="p-2 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f1ede4] transition cursor-pointer"
              aria-label="Back to courses"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-[#eff6ff] text-[#1e3a8a]">
                  <BookPlus size={18} />
                </span>
                <h1 className="text-xl font-bold text-[#1c1917] tracking-tight">
                  Create New Course
                </h1>
              </div>
              <p className="text-xs text-[#78716c] mt-0.5">
                Set up the course title and category to launch your curriculum studio
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Course Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Full-Stack Web Development & System Design"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] placeholder-[#a8a29e] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Course Category
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-3 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              >
                <option value="">Select a Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3.5 bg-[#f8f7f4] rounded-xl border border-[#e8e5dc] text-xs text-[#78716c] space-y-1">
              <p className="font-semibold text-[#1c1917] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#1e3a8a]" /> What happens next?
              </p>
              <p>
                You will be redirected to the Course Studio where you can upload video lectures, attach study notes & formula PDFs, and configure pricing.
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full !bg-[#1e3a8a] hover:!bg-[#172554] text-white font-medium py-3 rounded-xl transition"
              >
                Create & Continue to Studio
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCourses;
