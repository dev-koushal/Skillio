import React, { useEffect } from "react";
import { useParams,useNavigate } from "react-router-dom";
import { ArrowLeft, GalleryThumbnails } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedCourse } from "../redux/courseSlice";
import { Star } from "lucide-react";
function ViewCourses() {
  const navigate = useNavigate();
  const {courseId}= useParams();
  const { courseData, selectedCourse } = useSelector((state) => state.course);
  
  const dispatch = useDispatch();

  const fetchCourseData = async () => {
    courseData.map((course) => {
      if (course._id === courseId) {
        console.log(course);
        dispatch(setSelectedCourse(course));
        console.log(selectedCourse);
        return null
      }
    });
  };

  useEffect(()=>{
    fetchCourseData()
  },[courseData,courseId])
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white shadow-md rounded-xl p-6 space-y-6 relative">
        <div className="flex flex-col md:flex-row gap-6">
          {/* thumbnail */}
          <div className="w-full md:w-1/2">
            <ArrowLeft
              className="text-black w-6 h-6 cursor-pointer mb-4"
              onClick={() => navigate("/")}
            />
            {selectedCourse?.thumbnail?<img src={selectedCourse?.thumbnail} alt="" className="rounded-xl w-sm object-cover" />:<GalleryThumbnails color="gray" size={300}/>}
          </div>

          {/* courseInfo */}
          <div className="flex-1 space-y-2  md:mt-10 lg:-ml-30">
            <h2 className="text-xl font-bold">{selectedCourse?.title}</h2>
            <p className="text-gray-600 md:text-md text-sm -mt-2 ">{selectedCourse?.subTitle}</p>

            <div className="flex items-start flex-col justify-between">
                <div className="text-yellow-500 font-medium flex gap-1 items-center justify-start">
                    <span className="flex items-center justify-start gap-1 text-sm"><Star size={14}/>5</span>
                    <span className="text-gray-400 text-sm">(1,200 Reviews)</span>
                </div>
                <div >
                    <span className="text-lg font-semibold text-black">₹{selectedCourse?.price}</span>{" "}
                    <span className="line-through text-sm text-gray-400">₹{(selectedCourse?.price)*1.5}</span>
                </div>

                <ul className="text-sm text-gray-700 space-y-1 pt-2">
                    <li>✅ 10+ hours of video content</li>
                    <li>✅ Lifetime acess to the course</li>
                </ul>
                <button className="bg-black text-white px-6 py-2 rounded hover:bg-gray-700 mt-3 cursor-pointer">Enroll Now</button>
            </div>
          </div>
        </div>

        <div>
            <h2 className="text-xl font-semibold mb-2">What You'll Learn</h2>
            <ul className="list-disc pl-6  text-gray-700 space-y-1">
                <li>Learn {selectedCourse?.category} from Experienced Educator.</li>
            </ul>
        </div>
        <div>
            <h2 className="text-xl font-semibold mb-2">This Course is For</h2>
            <ul className="list-disc pl-6  text-gray-700 space-y-1">
                <li>{selectedCourse?.level} learner seaking help to level up in there professional journey.</li>
            </ul>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
            <div className="bg-white w-full md:w-2/5 p-6 rounded-2xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-1 text-gray-800">Course Curriculum</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedCourse?.lectures?.length} Lectures</p>
            <div className="flex flex-col gap-3">
                {selectedCourse?.lectures?.map((lecture,index)=>(
                    <button key={index} className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-left">{
                        lecture?.lectureTitle
                    }</button>
                ))}
            </div>
            </div>
        </div>
      </div>
    </div>
  );
}

export default ViewCourses;
