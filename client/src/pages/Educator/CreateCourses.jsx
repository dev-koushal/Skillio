import axios from 'axios'
import { ArrowLeft } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { serverURL } from '../../App'
import { toast } from 'react-toastify'
import { ClipLoader } from 'react-spinners'

function CreateCourses() {
  const navigate = useNavigate()
  const[title,setTitle] =useState("")
  const[category,setCategory] = useState("")
  const[loading,setLoading] =useState(false)

  const handleCreateCourse = async () => {
    setLoading(true);
    try {
       const {data} = await axios.post(serverURL+"/api/course/create",{title,category},{withCredentials:true})
       console.log(data);
       toast.success("Course Created!!")
       
       navigate("/courses")
    } catch (error) {
      console.log(error);
      toast.error(error.response.data.message)      
    }finally{
      setLoading(false)
    }
  }
  return (
    <div className='flex items-center justify-center min-h-screen bg-white/90'>
      
      <div className='w-105 bg-white shadow-md rounded-md p-6 border'>
        
        {/* Header */}
        <div className='flex items-center gap-3 mb-6'>
          <span className='text-xl cursor-pointer'><ArrowLeft size={20} className='cursor-pointer'onClick={
            ()=>navigate("/courses")
          } /></span>
          <h2 className='text-lg font-semibold'>Create Course</h2>
        </div>

        {/* Course Title */}
        <div className='mb-4'>
          <label className='block text-sm mb-1 font-medium'>
            Course Title
          </label>
          <input
          onChange={(e)=>setTitle(e.target.value)}
            value={title}
            type='text'
            placeholder='Enter Course title'
            className='w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-black'
          />
        </div>

        {/* Category */}
        <div className='mb-6'>
          <label className='block text-sm mb-1 font-medium'>
            Course Category
          </label>
          <select className='w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-black' onChange={(e)=>setCategory(e.target.value)} >
            <option value={""}>Select Category</option>
            <option value={"Development"}>Development</option>
            <option value={"Cyber"}>Cyber</option>
            <option value={"Business"}>Business</option>
            <option value={"AIML"}>AI/ML</option>
            <option value={"Cyber Security"}>Cyber Security</option>
            <option value={"Data Science"}>Data Science</option>
          </select>
        </div>

        {/* Button */}
        <button onClick={handleCreateCourse} className='w-full bg-black text-white py-2 rounded-md hover:opacity-90' disabled={loading}>
         {loading?<ClipLoader size={30} color='white'/> :"Create"}
        </button>

      </div>

    </div>
  )
}

export default CreateCourses