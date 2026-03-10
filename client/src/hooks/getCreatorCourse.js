import { useEffect } from "react";
import { serverURL } from "../App";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setCreatorCourseData } from "../redux/courseSlice";

function useGetCreatorCourse() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  
useEffect(() => {
  const creatorCourses = async () => {
    try {
      const { data } = await axios.get(
        serverURL + "/api/course/getcreator",
        { withCredentials: true }
      );

      dispatch(setCreatorCourseData(data));
      
    } catch (error) {
      console.log(error);
    }
  };

  creatorCourses();
}, [userData]);
}

export default useGetCreatorCourse;