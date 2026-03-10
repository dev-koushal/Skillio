import React from "react";
import { ArrowLeft, SquarePen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
function Courses() {
  const navigate = useNavigate();
  const { creatorCourseData } = useSelector((state) => state.course);
  // console.log(creatorCourseData);
  return (
    <div className="bg-white/90 min-h-screen flex">
      <div className="w-screen min-h-screen p-4 sm:p-6 bg-gray-100 ">
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center mb-6 gap-3">
          <div className="flex items-center justify-center gap-3">
            <ArrowLeft
              size={20}
              className="cursor-pointer"
              onClick={() => navigate("/dashboard")}
            />
            <h1 className="text-2xl font-semibold">All Created Courses</h1>
          </div>
          <button
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-500"
            onClick={() => navigate("/createcourses")}
          >
            Create Course
          </button>
        </div>
        {/* largess */}
        <div
          className="hidden md:block
       bg-white rounded-xl shadow p-4 overflow-x-auto"
        >
          <table className="min-w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4">Courses</th>
                <th className="text-left py-3 px-4">Price</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {creatorCourseData.courses?.map((course, index) => (
                <tr
                  key={index}
                  className="border-b hover:bg-gray-50 transition duration-200"
                >
                  <td className="py-3 px-4 flex items-center gap-4">
                    <img
                      src={
                        course.thumbnail ||
                        "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                      }
                      alt="thumbnail"
                      className="w-25 h-14 object-cover rounded-md"
                    />
                    <span>{course.title}</span>
                  </td>

                  <td className="px-4 py-3">${course.price || "NA"}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        course.isPublished
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <SquarePen className="text-gray-600 hover:text-blue-600 cursor-pointer" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-center text-gray-400 mt-6 text-sm ">
            List of your recent courses.
          </p>
        </div>

        {/* smalls */}
        <div className="md:hidden space-y-4">
          {creatorCourseData.courses?.map((course, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow p-4 flex flex-col gap-3"
            >
              <div className="flex gap-4 items-center">
                <img
                  src={
                    course.thumbnail ||
                    "https://thumbs.dreamstime.com/b/no-thumbnail-image-placeholder-forums-blogs-websites-148010362.jpg"
                  }
                  alt=""
                  className="w-16 h-16 rounded-md object-cover"
                />
                <div className="flex-1">
                  <h2 className="font-medium text-sm">{course.title}</h2>
                  <p className="text-gray-600 text-xs mt-1">
                    ${course.price || "NA"}
                  </p>
                </div>
                <SquarePen className="text-gray-600 hover:text-blue-600 cursor-pointer" />
              </div>
              <span
                className={`w-fit px-3 py-1 rounded-full text-xs ${
                  course.isPublished
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {course.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          ))}
          <p className="text-center text-gray-400 mt-6 text-sm ">
            List of your recent courses.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Courses;
