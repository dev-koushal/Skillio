import React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { serverURL } from "../App";
import { setUserData } from "../redux/userSlice";

const useGetCurrentUser = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await axios.get(serverURL + "/api/user/getcurrentuser", {
          withCredentials: true,
        });
        // Only set userData if a valid user object was returned
        if (
          result?.data &&
          (result.data._id || result.data.id || result.data.userId)
        ) {
          dispatch(setUserData(result.data));
        } else {
          dispatch(setUserData(null));
        }
      } catch (error) {
        if (error.response?.status === 401) {
          dispatch(setUserData(null)); // only logout if unauthorized
        } else {
          console.log(error); // server issue, keep user
        }
      }
    };
    fetchUser();
  }, [dispatch,userData]);
};

export default useGetCurrentUser;
