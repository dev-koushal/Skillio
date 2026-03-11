import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, Mail, FileText, Image, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import blank_profile from "/blank_Profile.avif";
import { serverURL } from "../App";
import { toast } from "react-toastify";

const EditProfile = () => {
  const { userData } = useSelector((store) => store.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: userData?.name || "",
    description: userData?.description || "",
    profilePicture: null,
  });

  const changeHandler = (e) => {
    if (e.target.type === "file") {
      setForm({ ...form, profilePicture: e.target.files[0] });
    } else {
      setForm({ ...form, [e.target.name]: e.target.value });
    }
  };
  

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);

      if (form.profilePicture) {
        formData.append("profilePicture", form.profilePicture);
      }

      const result = await axios.post(
        serverURL + "/api/user/profile",
        formData,
        { withCredentials: true },
      );

      console.log(result.data);
      toast.success("Profile updated successfully");
      navigate("/profile");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const previewImage = form.profilePicture
  ? URL.createObjectURL(form.profilePicture)
  : userData?.profilePicture || blank_profile;

  return (
    <div className="min-h-screen bg-black/90 flex justify-center p-4 md:p-6">
      <div className="w-full max-w-3xl bg-white/90 shadow-md rounded-2xl p-6 md:p-8">
        {/* back */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-2 px-3 py-1 border rounded-lg hover:bg-gray-100 mb-3"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h2 className="text-xl md:text-2xl font-semibold mb-2 flex items-center gap-2">
          <User size={20} /> Edit Profile
        </h2>

        <form onSubmit={submitHandler} className="space-y-4">
          {/* profile */}
          <div className="flex flex-col items-center gap-4 ">
           <label htmlFor="pp">
             <img
              
              src={previewImage}
              alt="profile"
              className="w-24 h-24 rounded-full object-cover border cursor-pointer"
            />
           </label>

            <div className="w-full">
              <label className="flex items-center gap-2 text-sm mb-1">
                <Image size={16} /> Profile Picture
              </label>

              <input
              id="pp"
                type="file"
                name="profilePicture"
                accept="image/*"
                onChange={changeHandler}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* name */}
          <div>
            <label className="flex items-center gap-2 text-sm mb-1">
              <User size={16} /> Name
            </label>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={changeHandler}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          {/* email */}
          <div>
            <label className="flex items-center gap-2 text-sm mb-1">
              <Mail size={16} /> Email
            </label>

            <input
            
              type="email"
              value={userData?.email}
              readOnly
              className="w-full border rounded-lg px-3 py-2 bg-gray-100 "
            />
          </div>

          {/* description */}
          <div>
            <label className="flex items-center gap-2 text-sm mb-1">
              <FileText size={16} /> Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={changeHandler}
              rows="4"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-black text-white px-6 py-2 rounded-lg hover:opacity-90"
          >
            <Save size={16} />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
