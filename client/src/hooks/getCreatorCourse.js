import { useEffect } from "react";
import api from "../services/api";
import { useDispatch, useSelector } from "react-redux";
import { setCreatorCourseData } from "../redux/courseSlice";

const useGetCreatorCourse = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const creatorCourses = async () => {
      if (!userData || userData.role !== "educator") return;
      try {
        const { data } = await api.get("/api/course/getcreator");
        dispatch(setCreatorCourseData(data));
      } catch (error) {
        console.warn("[CreatorCourses] Fetch error:", error.message);
      }
    };
    creatorCourses();
  }, [userData, dispatch]);
};

export default useGetCreatorCourse;
