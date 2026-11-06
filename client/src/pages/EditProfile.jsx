import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, FileText, Image, Save, ArrowLeft, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";
import { setUserData } from "../redux/userSlice";
import Button from "../components/common/Button";
import Navbar from "../components/Navbar";

const EditProfile = () => {
  const { userData } = useSelector((store) => store.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(userData?.name || "");
  const [description, setDescription] = useState(userData?.description || "");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewImage, setPreviewImage] = useState(userData?.profilePicture || "");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description.trim());

      if (profilePicture) {
        formData.append("profilePicture", profilePicture);
      }

      const result = await api.post("/api/user/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      dispatch(setUserData(result.data));
      toast.success("Profile updated successfully!");
      navigate("/profile");
    } catch (error) {
      console.error("[EditProfile Error]", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Back Link */}
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Profile
        </button>

        {/* Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="pb-4 border-b border-gray-800">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Edit Your Profile
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Update your public name, bio description, and avatar
            </p>
          </div>

          <form onSubmit={submitHandler} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-cyan-950 border-2 border-cyan-800 flex items-center justify-center text-3xl font-bold text-cyan-200 shrink-0">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <label
                  htmlFor="profile-picture-upload"
                  className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-lg border border-gray-700 transition cursor-pointer"
                >
                  <UploadCloud size={16} /> Choose Photo
                </label>
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                />
                <p className="text-[11px] text-gray-400">
                  Recommended: Square JPG or PNG, up to 5MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500 min-h-[44px]"
              />
            </div>

            {/* Description / Bio */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Bio / Headline
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of your learning journey or teaching background..."
                className="w-full bg-gray-950 border border-gray-700/80 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs sm:text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="px-6"
              >
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
