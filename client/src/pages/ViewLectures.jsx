import React, { useEffect, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { serverURL } from "../App";

function ViewLectures() {
  const { courseId } = useParams();
  const { courseData } = useSelector((state) => state.course);
  const { userData } = useSelector((state) => state.user);
  const selectedCourse = courseData?.find((course) => course._id === courseId);
  const [creatorData, setCreatorData] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(
    selectedCourse?.lectures[0] || null,
  );
  const navigate = useNavigate();

  useEffect(() => {
    const handleCreator = async () => {
      if (selectedCourse?.creator) {
        try {
          const result = await axios.post(
            serverURL + "/api/course/creator",
            { userId: selectedCourse?.creator },
            { withCredentials: true },
          );
          console.log(result.data);
          setCreatorData(result.data);
        } catch (error) {
          console.log(error);
        }
      }
    };
    handleCreator();
  }, [selectedCourse]);
  console.log(selectedLecture);
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto grid  grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="col-span-2 bg-white rounded-2xl shadow p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeft
              size={18}
              className="hover:cursor-pointer"
              onClick={() => navigate(`/viewcourse/${courseId}`)}
            />
            <h1 className="font-semibold text-lg">{selectedCourse?.title}</h1>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Category: {selectedCourse?.category} • Level:{" "}
            {selectedCourse?.level}
          </p>

          {/* Video */}
          <div className="w-full h-[350px] bg-gray-200 rounded-xl overflow-hidden">
            <video
              src={selectedLecture?.videoUrl}
              controls
              className="w-full h-full object-cover"
            />
          </div>

          <p className="mt-2 text-sm">
            {selectedCourse?.lectures?.[0]?.lectureTitle}
          </p>
        </div>

        {/* RIGHT */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold mb-3">All Lectures</h2>

          <div className="space-y-2">
            {selectedCourse.lectures.length  > 0 ?
            selectedCourse?.lectures?.map((lec, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-lg border hover:bg-gray-50 cursor-pointer"
               onClick={()=>setSelectedLecture(lec)}
              >
                <span className="text-sm">{lec.lectureTitle}</span>
                <Play size={16} />
              </div>
            )):<p className="text-gray-600 items-center text-md">Lectures coming soon....</p>}
          </div>

          {/* Instructor */}
          <div className="mt-6 border-t pt-4 flex items-center gap-3">
            <img
              src={creatorData?.profilePicture}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium">{creatorData?.name}</p>
              <p className="text-xs text-gray-500">{creatorData?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewLectures;
