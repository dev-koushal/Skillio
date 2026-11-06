import React, { useState } from "react";
import { ArrowLeft, BookPlus } from "lucide-react";
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

      toast.success("Course created! Now you can configure details and lectures.");
      navigate(`/editcourse/${data._id}`);
    } catch (error) {
      console.error("[CreateCourse Error]", error);
      toast.error(error.response?.data?.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
            <button
              onClick={() => navigate("/courses")}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
              aria-label="Back to courses"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Create New Course
              </h1>
              <p className="text-xs text-gray-400">
                Set the foundational title and category
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Course Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Full-Stack Web Development"
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-500 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Course Category
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 min-h-[44px]"
              >
                <option value="">Select a Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Create & Continue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCourses;
