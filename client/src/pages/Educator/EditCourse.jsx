import React, { useRef, useState } from "react";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

function EditCourse() {
  const navigate = useNavigate();
  const thumb = useRef
  const [isPublished, setIsPublised] = useState()

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10">
      <div className="w-[850px] bg-white p-8 rounded-md shadow-sm border">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ArrowLeft
              className="cursor-pointer"
              onClick={() => navigate("/courses")}
            />
            <h2 className="text-lg font-semibold">
              Add detail information regarding course
            </h2>
          </div>

          <button className="bg-black text-white px-4 py-2 rounded">
            Go to lectures page
          </button>
        </div>

        {/* Course Actions */}
        <div className="flex gap-3 mb-6">
          {isPublished? <button onClick={()=>setIsPublised(!isPublished)} className="bg-green-200 text-green-700 px-4 py-2 rounded cursor-pointer">
            Click to Publish
          </button>:<button onClick={()=>setIsPublised(!isPublished)} className="bg-red-200 text-red-700 px-4 py-2 rounded cursor-pointer">
            Click to UnPublish
          </button>}
          <button className="bg-red-500 text-white px-4 py-2 rounded">
            Remove Course
          </button>
        </div>

        <h3 className="font-medium mb-4">Basic Course Information</h3>

        {/* Title */}
        <form action="">
        <div className="mb-4">
          <label className="text-sm font-medium">Title</label>
          <input
            name="title"
            placeholder="Course Title"
            className="w-full border rounded px-3 py-2 mt-1"
          />
        </div>

        {/* Subtitle */}
        <div className="mb-4">
          <label className="text-sm font-medium">Subtitle</label>
          <input
            name="subtitle"
            placeholder="Subtitle"
            className="w-full border rounded px-3 py-2 mt-1"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm font-medium">Description</label>
          <textarea
            name="description"
            
            placeholder="Course description"
            rows="4"
            className="w-full border rounded px-3 py-2 mt-1"
          />
        </div>

        {/* Category / Level / Price */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium">Category</label>
            <select
              name="category"
              className="w-full border rounded px-3 py-2 mt-1"
            >
              <option value="">Select Category</option>
              <option value="Development">Development</option>
              <option value="Cyber">Cyber</option>
              <option value="Business">Business</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Course Level</label>
            <select
              name="level"
              className="w-full border rounded px-3 py-2 mt-1"
            >
              <option value="">Select Level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Price (INR)</label>
            <input
              name="price"
              placeholder="₹"
              className="w-full border rounded px-3 py-2 mt-1"
            />
          </div>
        </div>

        {/* Thumbnail */}
        <div className="mb-6">
          <label className="text-sm font-medium block mb-2">
            Course Thumbnail
          </label>

          <label className="w-[200px] h-[120px] border flex items-center justify-center rounded cursor-pointer">
            <input type="file" hidden  />
            <ImagePlus size={40} />
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/courses")}
            className="border px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            
            className="bg-black text-white px-5 py-2 rounded"
          >
            Save
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

export default EditCourse;