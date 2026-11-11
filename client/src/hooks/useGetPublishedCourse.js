import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import api, { getActiveTenantSlug } from "../services/api";
import { setCourseData, clearInstitutionCourses } from "../redux/courseSlice";
import { useTenant } from "../context/TenantContext";
import { getStoredTenantSlug } from "../services/tenantStorage";

const useGetPublishedCourse = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((store) => store.user);
  const { tenant } = useTenant();
  const activeSlug = getActiveTenantSlug() || userData?.tenant?.slug ||
    (tenant?.slug !== "platform" ? tenant?.slug : null) ||
    getStoredTenantSlug() || "default";
  const role = userData?.role || null;
  const membershipKey = (userData?.memberships || []).map((membership) => membership.slug).sort().join(",");

  useEffect(() => {
    let isMounted = true;
    // The cached student profile can briefly lack memberships while /getcurrentuser
    // revalidates. Keep the current course list until that response resolves.
    if (!userData) {
      dispatch(setCourseData([]));
      return () => { isMounted = false; };
    }

    const memberships = membershipKey ? membershipKey.split(",") : [];
    if (role === "student" && !membershipKey) return () => { isMounted = false; };
    if (role === "student" && !memberships.includes(activeSlug)) {
      dispatch(clearInstitutionCourses());
      dispatch(setCourseData([]));
      return () => { isMounted = false; };
    }

    const getCourses = async () => {
      try {
        const result = await api.get(activeSlug && activeSlug !== "default" ? `/api/course/by-institution/${encodeURIComponent(activeSlug)}` : "/api/course/getpublished");
        if (isMounted && Array.isArray(result.data)) {
          dispatch(setCourseData(result.data));
        }
      } catch (error) {
        console.warn("[PublishedCourses] Fetch error:", error.message);
      }
    };

    getCourses();

    return () => {
      isMounted = false;
    };
  }, [dispatch, activeSlug, role, membershipKey, userData?._id]);
};

export default useGetPublishedCourse;
