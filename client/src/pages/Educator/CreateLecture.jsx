import React, { useEffect, useState } from 'react'
import { ArrowLeft, Edit, Plus } from "lucide-react";
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios';
import { toast } from 'react-toastify'
import { serverURL } from "../../App"
import {setLectureData} from '../../redux/lectureSlice'
import {} from 'react-spinners'





function CreateLecture() {
    const naviagte = useNavigate();
    const {courseId} = useParams();
    const[loading,setLoading] = useState(false);
    const[lectureTitle,setLectureTitle] = useState("");
    const dispatch = useDispatch();
    const {lectureData} = useSelector(state=>state.lecture);


    // console.log(serverURL);

    const handleCreateLecture = async () => {
        setLoading(true);
        try {
            const result = await axios.post(serverURL + `/api/course/createlecture/${courseId}`,{lectureTitle},{withCredentials:true})
            
            dispatch(setLectureData([...lectureData,result.data.lecture]))

           toast.success("Lecture Added!");
           setLectureTitle("");
        } catch (error) {
            console.log(error);
            toast.error(`failed to create lecture ,${error.response.data.message}`)
        }finally{
            setLoading(false);
        }
    }


    useEffect(()=>{
        const getCourseLecture = async () => {
            try {
                const result = await axios.get(serverURL+`/api/course/courselecture/${courseId}`,{withCredentials:true});
                // console.log(result.data);
                dispatch(setLectureData(result.data.lectures))
            } catch (error) {
                console.log(error);
            }
        }
        getCourseLecture();
    },[])

  return (
    <div className='min-h-screen flex justify-center bg-gray-100 items-center mx-auto'>

        <div className='md:w-140 lg:w-1/2 w-full p-6 m-2 bg-white rounded-lg flex flex-col shadow-md space-y-6'>
            <div>
                <h1 className='text-xl font-semibold mb-2'>Let's Add a Lecture</h1>
                <p className='text-sm text-gray-400'>
                    Enter the title and add your video lecture to enhance your course content.
                </p>
            </div>
            <div>
                <input type="text" placeholder='e.g. Introduction to Mern Stack' className='w-full p-2 rounded-lg bg-white outline-1 outline-gray-300'onChange={(e)=>setLectureTitle(e.target.value)} value={lectureTitle}/>
            </div>
            <div className='flex gap-4 flex-row '>
                <button className='p-2 px-4 gap-2 bg-gray-400/60 flex items-center  rounded-lg shadow-xs cursor-pointer w-fit'>
                   <ArrowLeft size={20}/><p className='text-xs md:text-[16px]' onClick={()=>naviagte(`/editcourse/${courseId}`)}> Back to Course</p></button>
                <button className='p-2 px-4 bg-black text-white flex gap-2 items-center w-fit rounded-lg shadow-xs cursor-pointer disabled:bg-yellow-200' disabled={loading} onClick={handleCreateLecture}>
                   <Plus size={20}/><p className='text-xs md:text-[16px]'> Create Lecture</p></button>
            </div>
                {/* Lectres */}
            <div className='space-y-2'>
             {lectureData?.map((lecture,index)=>(
                <div className=' bg-gray-100 rounded-md flex justify-between items-center p-3 text-sm font-medium text-gray-700'key={index}>
                    <span>{index+1}. {lecture.lectureTitle}</span>
                    <span><Edit size={20} className='hover:text-gray-700 text-gray-500 cursor-pointer' onClick={()=>naviagte(`/editlecture/${courseId}/${lecture._id}`)}/></span>
                </div>
               ))}
            </div>
           
        </div>

    </div>
  )
}

export default CreateLecture