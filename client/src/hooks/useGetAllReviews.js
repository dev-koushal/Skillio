import { useEffect } from "react";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { setReviewData } from "../redux/reviewSlice";

const useGetAllReviews = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const result = await api.get("/api/review/getreview");
        dispatch(setReviewData(result.data));
      } catch (error) {
        console.warn("[Reviews] Fetch error:", error.message);
      }
    };
    fetchReviews();
  }, [dispatch]);
};

export default useGetAllReviews;
