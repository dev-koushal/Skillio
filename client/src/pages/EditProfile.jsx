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
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans">
      <Navbar />

      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Back Link */}
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Profile
        </button>

        {/* Card */}
        <div className="bg-white border border-[#e8e5dc] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="pb-4 border-b border-[#e8e5dc]">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1917] tracking-tight">
              Edit Your Profile
            </h1>
            <p className="text-xs text-[#78716c] mt-1">
              Update your public name, bio description, and avatar
            </p>
          </div>

          <form onSubmit={submitHandler} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[#eff6ff] border-2 border-[#1e3a8a]/30 flex items-center justify-center text-3xl font-bold text-[#1e3a8a] shrink-0">
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
                  className="inline-flex items-center gap-2 bg-[#faf8f5] hover:bg-[#f1ede4] text-[#1c1917] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#d6d3d1] transition cursor-pointer"
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
                <p className="text-[11px] text-[#78716c]">
                  Recommended: Square JPG or PNG, up to 5MB.
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a] min-h-[44px]"
              />
            </div>

            {/* Description / Bio */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#44403c] mb-1.5">
                Bio / Headline
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share a short summary about your background, interests, or teaching expertise..."
                className="w-full bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl px-4 py-2.5 text-[#1c1917] text-sm focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
              />
            </div>

            {/* Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-5 py-2.5 rounded-xl border border-[#d6d3d1] text-[#78716c] hover:bg-[#f1ede4] text-xs sm:text-sm font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="!bg-[#1e3a8a] hover:!bg-[#172554] text-white font-medium px-6 py-2.5 rounded-xl transition shadow-xs"
              >
                <Save size={16} className="inline-block mr-2" /> Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
