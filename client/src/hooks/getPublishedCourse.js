import axios from 'axios'
import React, { useEffect } from 'react'
import { serverURL } from '../App'
import { useDispatch } from 'react-redux'
import { setCourseData } from '../redux/courseSlice';

function getPublishedCourse() {
const dispatch = useDispatch();
  
    useEffect(()=>{
        const getCourseData = async (params) => {
            try {
                const result = await axios.get(serverURL+"/api/course/getpublished",{withCredentials:true})
                dispatch(setCourseData(result.data))
                // console.log(result.data);
            } catch (error) {
                console.log(error);
            }
        }
        getCourseData()
    },[])
}

export default getPublishedCourse