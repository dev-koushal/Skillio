import { useEffect } from "react";
import { useDispatch } from "react-redux";
import api, { getActiveTenantSlug } from "../services/api";
import { setCourseData, clearInstitutionCourses } from "../redux/courseSlice";
import { useTenant } from "../context/TenantContext";

const useGetPublishedCourse = () => {
  const dispatch = useDispatch();
  const { tenant } = useTenant();
  const activeSlug = tenant?.slug || getActiveTenantSlug() || "default";

  useEffect(() => {
    let isMounted = true;
    const getCourses = async () => {
      try {
        // Prevent stale courses from rendering across institutions during transition
        dispatch(clearInstitutionCourses());

        const result = await api.get("/api/course/getpublished");
        if (isMounted) {
          dispatch(setCourseData(result.data));
        }
      } catch (error) {
        console.warn("[PublishedCourses] Fetch error:", error.message);
        if (isMounted) {
          dispatch(setCourseData([]));
        }
      }
    };

    getCourses();

    return () => {
      isMounted = false;
    };
  }, [dispatch, activeSlug]);
};

export default useGetPublishedCourse;
