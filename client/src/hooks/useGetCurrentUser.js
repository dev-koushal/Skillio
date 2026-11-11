import { useEffect } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";
import { clearAuthSession, getAuthToken } from "../services/authStorage";

const useGetCurrentUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;
    const tokenAtRequestStart = getAuthToken();

    const fetchUser = async () => {
      try {
        const result = await api.get("/api/user/getcurrentuser");

        // Ignore a stale startup response if login/signup changed sessions while it was in flight.
        if (!mounted || getAuthToken() !== tokenAtRequestStart) return;

        if (result?.data?.code === "MEMBERSHIP_LOOKUP_UNAVAILABLE") {
          console.warn("[CurrentUser] Membership lookup is temporarily unavailable.");
        } else if (result?.data && (result.data._id || result.data.id || result.data.userId)) {
          dispatch(setUserData(result.data));
        } else {
          clearAuthSession();
          dispatch(setUserData(null));
        }
      } catch (error) {
        if (!mounted) return;

        // Do not let an old unauthenticated request erase a session created after it started.
        const sessionIsUnchanged = getAuthToken() === tokenAtRequestStart;
        if (error.response?.data?.code === "MEMBERSHIP_LOOKUP_UNAVAILABLE") {
          console.warn("[CurrentUser] Membership lookup is temporarily unavailable.");
        } else if (error.response?.status === 401 && sessionIsUnchanged) {
          clearAuthSession();
          dispatch(setUserData(null));
        } else if (error.response?.status !== 401) {
          // Preserve cached session data during transient network or server failures.
          console.warn("[CurrentUser] Revalidation note:", error.message);
        }
      }
    };

    fetchUser();
    return () => {
      mounted = false;
    };
  }, [dispatch]);
};

export default useGetCurrentUser;
