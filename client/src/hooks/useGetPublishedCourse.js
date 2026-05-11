import axios from 'axios'
import React, { useEffect } from 'react'
import { serverURL } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setCourseData } from '../redux/courseSlice';

function useGetPublishedCourse() {
    const dispatch = useDispatch();
    const { userData } = useSelector((store) => store.user || {});

    useEffect(() => {
        const getCourseData = async (params) => {
            try {
                const result = await axios.get(serverURL + "/api/course/getpublished", {
                    withCredentials: true,
                });
                dispatch(setCourseData(result.data));
            } catch (error) {
                console.log(error);
            }
        };

        // Run on mount and whenever the authenticated user changes
        getCourseData();
    }, [dispatch, userData]);
}

export default useGetPublishedCourse

