import { ArrowLeft } from 'lucide-react';
import React from 'react'
import {useSelector} from 'react-redux'
import { useNavigate } from 'react-router-dom'
function MyEnrolledCourses() {
    const {userData} = useSelector(state=>state.user)
    const navigate = useNavigate();
  return (
    <div className='min-h-screen w-full px-4 py-9 bg-gray-50'>
        <ArrowLeft
              size={28}
              className="hover:cursor-pointer top-10 left-40 md:absolute"
              onClick={() => navigate(`/`)}
            />
        <h1 className='text-3xl text-center font-bold textgray800'>My Enrolled Courses</h1>

        {
          userData?.enrolledCourses.length ===0?(
              <p className='text-gray-500 text-center w-full'>
                You haven't enrolled in any courses yet.
              </p>
          ):(
              <div className='flex items-center  justify-center flex-wrap gap-8 mt-8'>
                {userData?.enrolledCourses?.map((course,ind)=>(
                  <div key={ind} className='bg-white rounded-2xl shadow-md overflow-hidden border'>
                      <img src={course?.thumbnail} alt="" className='w-full h-40 object-cover'/>
                      <div className='p-4'>
                        <h2 className='text-lg font-semibold text-gray-800'>{course?.title}</h2>
                        <p className='text-sm text-gray-600 mb-2'>{course?.category}</p>
                        <p  className='text-sm text-gray-600 mb-2'>{course?.level}</p>
                        <h1 className='px-2 text-center py-2 border-2 bg-black border-black text-white rounded-lg text-4 font-light cursor-pointer mt-2 hover:bg-gray-600' onClick={()=>navigate(`/viewlecture/${course._id}`)}>Watch Now</h1>
                      </div>
                  </div>
                ))}
              </div>
          )
        }

    </div>
  )
  
}

export default MyEnrolledCourses