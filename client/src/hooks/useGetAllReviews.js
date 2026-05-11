import axios from 'axios'
import React, { useEffect } from 'react'
import { serverURL } from '../App'
import { useDispatch } from 'react-redux'
import { setReviewData } from '../redux/reviewSlice';

function useGetAllReviews() {
  const dispatch = useDispatch();
    useEffect(()=>{
        const allReviews=  async () => {
            try {
                const result  = await axios.get(serverURL+"/api/review/getreview", {withCredentials:true})

                dispatch(setReviewData(result.data))
                // console.log(result.data);
            } catch (error) {
                console.log(error);
            }
        }
        allReviews();
    },[])
}

export default useGetAllReviews