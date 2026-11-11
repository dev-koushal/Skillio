import { useEffect } from "react";
import api from "../services/api";
import { useDispatch, useSelector } from "react-redux";
import { setCreatorCourseData } from "../redux/courseSlice";
import { useTenant } from "../context/TenantContext";
import { canUseEducatorWorkspace } from "../auth/permissions";

const useGetCreatorCourse = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();
  const tenantSlug = tenant?.slug || null;
  const canManageCourses = canUseEducatorWorkspace(userData);

  useEffect(() => {
    let isMounted = true;

    const creatorCourses = async () => {
      if (!userData || !canManageCourses) {
        dispatch(setCreatorCourseData([]));
        return;
      }

      // Do not leave another user's or institution's course list on screen while
      // the next tenant-scoped request is in flight.
      dispatch(setCreatorCourseData([]));
      try {
        const { data } = await api.get("/api/course/getcreator");
        if (isMounted) dispatch(setCreatorCourseData(data));
      } catch (error) {
        console.warn("[CreatorCourses] Fetch error:", error.message);
      }
    };

    creatorCourses();

    return () => {
      isMounted = false;
    };
  }, [userData?._id, userData?.role, tenantSlug, canManageCourses, dispatch]);
};

export default useGetCreatorCourse;
