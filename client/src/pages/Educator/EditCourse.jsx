import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios'
import { serverURL } from '../../App'
import { toast } from 'react-toastify'

import { ClipLoader } from 'react-spinners'
import { useDispatch, useSelector } from "react-redux";
import { setCourseData } from "../../redux/courseSlice";


function EditCourse() {
  const navigate = useNavigate();
  const {courseId} = useParams();
  const thumb = useRef
  const [isPublished, setIsPublised] = useState()
  const [selectCourse,setSelectCourse] = useState(null)
  const [title,setTitle] = useState("")
  const [subTitle,setSubTitle] = useState("")
  const [description,setDescription] = useState("")
  const [category,setCategory] = useState("")
  const [level,setlevel] = useState("")
  const [price,setPrice] = useState("")
  const [frontendImage,setFrontendImage] = useState("")
  const [backendImage,setBackendImage] = useState("")
  const[loading,setLoading] = useState(false)
  const[loading1,setLoading1] = useState(false)
  const dispatch = useDispatch()
  const {courseData} = useSelector(state=>state.course)





  const handleThumbnail = (e) =>{
    const file = e.target.files[0]
    setBackendImage(file)
    setFrontendImage(URL.createObjectURL(file))
  }


 const getCourseById = async () => {
  try {
    
      const result = await axios.get(serverURL+`/api/course/getcourse/${courseId}`,{withCredentials:true})

     setSelectCourse(result.data);
    //  console.log(result.data);
  } catch (error) {
    
    console.log(error);
  }
 }

 useEffect(()=>{
    if(selectCourse){
        setTitle(selectCourse.title||"") 
        setSubTitle(selectCourse.subTitle || "")
        setDescription(selectCourse.description || "")
        setCategory(selectCourse.category||"")
        setlevel(selectCourse.level || "")
        setPrice(selectCourse.price || "")
        setFrontendImage(selectCourse.thumbnail || "")
        setIsPublised(selectCourse?.isPublished)
    }
 },[selectCourse])
useEffect(()=>{
  getCourseById();
},[])

const handleEditCourse = async () => {
 setLoading(true);
   const formData = new FormData
   formData.append("title",title)
   formData.append("subTitle",subTitle)
   formData.append("description",description)
   formData.append("category",category)
   formData.append("level",level)
   formData.append("price",price)
   formData.append("thumbnail",backendImage)
   formData.append("isPublished",isPublished)
  try {
      const result = await axios.post(serverURL+`/api/course/editcourse/${courseId}`, formData ,{withCredentials:true})
      // console.log(result.data);
      const updateData = result.data
      if(updateData.isPublished){
        const updateCourses = courseData.map(c=>c._id==courseId ? updateData: c)

        if(!courseData.some(c._id === courseId)){
          updateCourses.push(updateData)
        }
        dispatch(setCourseData(updateCourses))
      }else{
          const filterCourses = courseData.filter(c=>c._id !== courseId)
          dispatch(setCourseData(filterCourses))
      }


      toast.success("Course edited successfully")
  } catch (error) {
    console.log(error);
    toast.error(error.response.data.message);
  }finally{
    setLoading(false);
    navigate("/courses")
  }
}
const handleRemoveCourse = async () => {
  setLoading1(true)
  try {
    let result = await axios.delete(serverURL+`/api/course/remove/${courseId}`,{withCredentials:true})
    const filterCourse = courseData.filter(c=>c._id !== courseId)
    dispatch(setCourseData(filterCourse))
    toast.success("Course deleted successfully");
  } catch (error) {
    console.log(error);
    toast.error(error.response.data.message);
  }finally{
    setLoading1(false)
    navigate("/courses")
  }
}
  return (
  <div className="min-h-screen bg-gray-100 flex justify-center px-3 py-5 sm:px-5 md:px-8">
    <div className="w-full max-w-5xl bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        
        <div className="flex items-start sm:items-center gap-3">
          <ArrowLeft
            className="cursor-pointer shrink-0 mt-1 sm:mt-0"
            onClick={() => navigate("/courses")}
          />

          <h2 className="text-base sm:text-lg md:text-xl font-semibold leading-snug">
            Add detail information regarding course
          </h2>
        </div>

        <button
          className="bg-black text-white px-4 py-2 rounded cursor-pointer w-full sm:w-auto"
          onClick={() => navigate(`/createlecture/${selectCourse?._id}`)}
        >
          Go to lectures page
        </button>
      </div>

      {/* Course Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {!isPublished ? (
          <button
            onClick={() => setIsPublised(!isPublished)}
            className="bg-green-200 text-green-700 px-4 py-2 rounded cursor-pointer w-full sm:w-auto"
          >
            Click to Publish
          </button>
        ) : (
          <button
            onClick={() => setIsPublised(!isPublished)}
            className="bg-red-200 text-red-700 px-4 py-2 rounded cursor-pointer w-full sm:w-auto"
          >
            Click to UnPublish
          </button>
        )}

        <button
          onClick={handleRemoveCourse}
          className="bg-red-500 text-white px-4 py-2 rounded cursor-pointer w-full sm:w-auto"
          disabled={loading1}
        >
          Remove Course
        </button>
      </div>

      <h3 className="font-medium mb-4 text-sm sm:text-base">
        Basic Course Information
      </h3>

      <form onSubmit={(e) => e.preventDefault()}>

        {/* Title */}
        <div className="mb-4">
          <label className="text-sm font-medium">Title</label>
          <input
            name="title"
            placeholder="Course Title"
            className="w-full border rounded px-3 py-2 mt-1 text-sm sm:text-base"
            onChange={(e) => setTitle(e.target.value)}
            value={title}
          />
        </div>

        {/* Subtitle */}
        <div className="mb-4">
          <label className="text-sm font-medium">Subtitle</label>
          <input
            name="subtitle"
            placeholder="Subtitle"
            className="w-full border rounded px-3 py-2 mt-1 text-sm sm:text-base"
            onChange={(e) => setSubTitle(e.target.value)}
            value={subTitle}
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-sm font-medium">Description</label>
          <textarea
            name="description"
            placeholder="Course description"
            rows="4"
            className="w-full border rounded px-3 py-2 mt-1 text-sm sm:text-base"
            onChange={(e) => setDescription(e.target.value)}
            value={description}
          />
        </div>

        {/* Category / Level / Price */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div>
            <label className="text-sm font-medium">Category</label>

            <select
              name="category"
              className="w-full border rounded px-3 py-2 mt-1 text-sm sm:text-base"
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            >
              <option value={""}>Select Category</option>
              <option value={"Development"}>Development</option>
              <option value={"Cyber"}>Cyber</option>
              <option value={"Business"}>Business</option>
              <option value={"AIML"}>AI/ML</option>
              <option value={"Cyber Security"}>Cyber Security</option>
              <option value={"Data Science"}>Data Science</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Course Level</label>

            <select
              name="level"
              className="w-full border rounded px-3 py-2 mt-1 text-sm sm:text-base"
              onChange={(e) => setlevel(e.target.value)}
              value={level}
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
              className="w-full border rounded px-3 py-2 mt-1 text-sm sm:text-base"
              onChange={(e) => setPrice(e.target.value)}
              value={price}
            />
          </div>
        </div>

        {/* Thumbnail */}
        <div className="mb-6">
          <label className="text-sm font-medium block mb-2">
            Course Thumbnail
          </label>

          <label className="w-full max-w-[240px] h-[140px] border flex items-center justify-center rounded-xl cursor-pointer overflow-hidden">
            <input onChange={handleThumbnail} type="file" hidden />

            {frontendImage ? (
              <img
                src={frontendImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <ImagePlus size={40} />
            )}
          </label>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/courses")}
            className="border px-4 py-2 rounded cursor-pointer w-full sm:w-auto"
          >
            Cancel
          </button>

          <button
            className="bg-black text-white px-5 py-2 rounded cursor-pointer w-full sm:w-auto flex justify-center items-center"
            onClick={handleEditCourse}
          >
            {loading ? (
              <ClipLoader size={20} color="white" />
            ) : (
              "Save"
            )}
          </button>
        </div>

      </form>
    </div>
  </div>
);
}

export default EditCourse;