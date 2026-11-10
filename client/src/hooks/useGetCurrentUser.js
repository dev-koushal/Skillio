import { useEffect } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";
import { clearAuthSession } from "../services/authStorage";

const useGetCurrentUser = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const result = await api.get("/api/user/getcurrentuser");
        if (isMounted) {
          if (result?.data && (result.data._id || result.data.id || result.data.userId)) {
            dispatch(setUserData(result.data));
          } else {
            clearAuthSession();
            dispatch(setUserData(null));
          }
        }
      } catch (error) {
        // Only clear credentials if the server explicitly rejected the token as unauthenticated / revoked
        if (error.response?.status === 401 && isMounted) {
          clearAuthSession();
          dispatch(setUserData(null));
        } else {
          // Transient network or server error: preserve cached session for offline/resilient MNC UX
          console.warn("[CurrentUser] Revalidation note:", error.message);
        }
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);
};

export default useGetCurrentUser;
