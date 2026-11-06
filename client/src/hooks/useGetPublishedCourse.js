import { useEffect } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { setCourseData } from "../redux/courseSlice";

const useGetPublishedCourse = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const getCourses = async () => {
      try {
        const result = await api.get("/api/course/getpublished");
        dispatch(setCourseData(result.data));
      } catch (error) {
        console.warn("[PublishedCourses] Fetch error:", error.message);
      }
    };
    getCourses();
  }, [dispatch]);
};

export default useGetPublishedCourse;
