import React, { useEffect, useState } from "react";
import { useParams,useNavigate } from "react-router-dom";
import { ArrowLeft, GalleryThumbnails, Lock, PauseCircle, PlayCircle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedCourse } from "../redux/courseSlice";
import axios from 'axios'
import { Star } from "lucide-react";
import {serverURL} from '../App'
import blank_profile from '/blank_Profile.avif'
import CourseCard from "../components/CourseCard";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
function ViewCourses() {
  const navigate = useNavigate();
  const {courseId}= useParams();
  const { courseData, selectedCourse } = useSelector((state) => state.course);
  const {userData} = useSelector(state=>state.user)
 
  const dispatch = useDispatch();
  const [selectedLecture,setSelectedLecture] = useState(null);
  const[creatorData,setCreatorData] =useState(null);
  const[creatorCourses,setCreatorCourses] =useState(null); 
  const [isEnrolled,setIsEnrolled] = useState(false)
  const[rating,setRating] = useState(0);
  const[comment,setComment] = useState("")

  const[loading,setLoading]  = useState(false)
  const fetchCourseData = async () => {
    courseData.map((course) => {
      if (course._id === courseId) {
        // console.log(course);
        dispatch(setSelectedCourse(course));
        // console.log(selectedCourse);
        return null
      }
    });
  };

  

  useEffect(()=>{
    const handleCreator = async () => {
      if(selectedCourse?.creator){
      try {
         const result = await axios.post(serverURL+"/api/course/creator",{userId:selectedCourse?.creator} ,{withCredentials:true})
        //  console.log(result.data);
         setCreatorData(result.data)
      } catch (error) {
        console.log(error);
      } 
    }
    }
    handleCreator()
  },[selectedCourse])

  
  const checkEnrollment = ()=>{
    const verify = userData?.enrolledCourses?.some(c=>(typeof c === 'string' ? c : c._id).toString()===courseId?.toString()
  )
  if(verify){
    setIsEnrolled(true)
  }
  }
  useEffect(()=>{
    if(creatorData?._id && courseData.length > 0){
      const creatorCourse = courseData.filter((course)=>
        course.creator === creatorData?._id && course._id !== courseId
      )
      setCreatorCourses(creatorCourse)
    }
  },[creatorData,courseData])

  useEffect(()=>{
    fetchCourseData()
    checkEnrollment()
  },[courseData,courseId,userData])
  
  const handleEnroll = async (userId,courseId) => {
    try {
      const orderData = await axios.post(serverURL+"/api/order/razorpay-order", { userId, courseId},{withCredentials:true})
      console.log(orderData);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency : 'INR',
        name:"Skillio",
        description:"COURSE ENROLLMENT PAYMENT",
        order_id:orderData.data.id,
        handler: async function (res) {
          console.log("Razorpay Response",res);
          try {
            const verifyPayment = await axios.post(serverURL+"/api/order/verifypayment",{...res,courseId,userId},{withCredentials:true})
            setIsEnrolled(true)
            toast.success(verifyPayment.data.message)
          } catch (error) {
            toast.error(error.res.data.message)
          }
        }
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      console.log({error});
      toast.error("Something went wrong while enrolling!!")   
    } 
  }

  const handleReview = async () => {
    setLoading(true);
    try {
      const result = await axios.post(serverURL+`/api/review/createreview`, {rating,comment,courseId},{withCredentials:true})

      toast.success("Review Added")
      
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message)
    }finally{
      setLoading(false);
      setRating(0);
      setComment("");
    }
  }
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
                    <span className="text-gray-400 text-sm ">(1,200 Reviews)</span>
                </div>
                <div className="mt-1.5">
                    <span className="text-lg font-semibold text-black ">₹{selectedCourse?.price}</span>{" "}
                    <span className="line-through text-sm text-gray-400">₹{(selectedCourse?.price)*1.5}</span>
                </div>

                <ul className="text-sm text-gray-700 space-y-1 pt-2">
                    <li>✅ 10+ hours of video content</li>
                    <li>✅ Lifetime acess to the course</li>
                </ul>
                {!isEnrolled? <button className="bg-black text-white px-6 py-2 rounded hover:bg-gray-700 mt-3 cursor-pointer" onClick={()=>handleEnroll(userData._id,courseId)}>Enroll Now</button>: <button className="bg-green-100 text-green-500 px-6 py-2 rounded hover:bg-gray-700 mt-3 cursor-pointer" onClick={()=>navigate(`/viewlecture/${courseId}`)}>Watch Now</button>}
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
                    <button  disabled={!lecture.isPreviewFree} onClick={()=>{
                      if(lecture.isPreviewFree){
                        setSelectedLecture(lecture);
                      }}
                    } key={index} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 text-left${lecture.isPreviewFree?"hover:bg-gray-100 cursor-pointer border-gray-300":"cursor-not-allowed opacity-60 border-gray-200"} relative`}>
                      <span className="text-lg text-gray-700">
                        {lecture.isPreviewFree ? <PlayCircle size={20}/> : <Lock size={20}/> }
                      </span>
                        <span className="text-sm font-medium text-gray-800">{lecture?.lectureTitle}</span>
                    
                    </button>
                ))}
            </div>
            </div>

            {/* Right */}
            <div className="bg-white w-full md:w-3/5 p-2 md:p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="aspect-video w-full rounded-lg overflow-hidden mb-4 bg-black flex items-center justify-center">
              {selectedLecture?.videoUrl ? <video
               className="w-full h-full object-cover" src={selectedLecture?.videoUrl} controls/> :
              <span className="text-white  text-xs md:text-sm">Buy Course to continue your Learning.</span>}
            </div>
            </div>
        </div>

        <div className="mt-8 border-t p-6">
          <h2 className="text-xl font-semibold mb-2">
            Write a Reviews
          </h2>
          <div className="mb-4 ">
            <div className="flex gap-1 mb-2">
              {
                [1,2,3,4,5].map((star)=>(
                  <Star key={star} 
                  onClick={()=>setRating(star)} className={star<=rating?
                    "fill-amber-300":
                    "fill-gray-400"
                  } />
                ))
              }
            </div>
            <textarea onChange={(e)=>setComment(e.target.value)} value={comment} name="" id="" className="w-full border border-gray-300 rounded-lg p-2 " placeholder="Write your Reviews here...." rows={3}/>
            <button className="bg-black text-white mt-3 px-4 py-2  rounded hover:bg-gray-800" disabled={loading} onClick={handleReview}>{loading? <ClipLoader size={20} color="white"/> : "Submit Review"}</button>
          </div>
        </div>
      </div>
      {/* For crator Infoooo */}
      <div className="ml-0 md:ml-10">
              <div className=" flex items-center gap-4 pt-4 border-t">
                {creatorData?.profilePicture?<img src={creatorData.profilePicture} alt="Pfp" className="w-16 h-16 rounded-full object-cover border border-gray-500" />:<img src={blank_profile} alt="Pfp" className="w-16 h-16 rounded-full object-cover border border-gray-500"/>}
                <div>
                  <h2 className="text-lg font-semibold">{creatorData?.name}</h2>
                  <p className="md:text-sm text-gray-600 text-2">{creatorData?.description}</p>
                  <p className="md:text-sm text-gray-600 text-2">{creatorData?.email}</p>
                </div>
              </div>

            <div>
              <p className="text-xl font-semibold mb-2 mt-4">Other Courses From {creatorData?.name}-</p>
            </div>
            <div className="w-full transition-all duration-300 py-6 flex items-center justify-center  flex-wrap gap-6 lg:px-20">
              {
                creatorCourses?.map((course,ind)=>
                  (
                  <CourseCard key={ind} thumbnail={course.thumbnail} id={course._id} price={course.price} title={course.title} category={course.category} />
                ))
              }
            </div>
      </div>
    </div>
  );
}

export default ViewCourses;
