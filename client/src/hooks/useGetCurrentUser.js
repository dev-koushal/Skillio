import { useEffect } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";

const useGetCurrentUser = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await api.get("/api/user/getcurrentuser");
        if (result?.data && (result.data._id || result.data.id || result.data.userId)) {
          dispatch(setUserData(result.data));
        } else {
          dispatch(setUserData(null));
        }
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          dispatch(setUserData(null));
        } else {
          console.warn("[CurrentUser] Fetch error:", error.message);
        }
      }
    };
    fetchUser();
  }, [dispatch]);
};

export default useGetCurrentUser;
