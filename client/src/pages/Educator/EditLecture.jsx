import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import axios from 'axios';
import { toast } from 'react-toastify';
import { setLectureData } from '../../redux/lectureSlice';
import {serverURL} from '../../App'

function EditLecture() {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { lectureData } = useSelector((state) => state.lecture);

  const selectedLecture = lectureData.find(
    (lecture) => lecture._id === lectureId
  );

  const [lectureTitle, setLectureTitle] = useState(
    selectedLecture?.lectureTitle || ''
  );
  const [videoUrl, setVideoUrl] = useState('');
  const [isPreviewFree, setIsPreviewFree] = useState(
    selectedLecture?.isPreviewFree || false
  );
  const [loading, setLoading] = useState(false);
  const [loading1, setLoading1] = useState(false);

  const handleEditLecture = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('lectureTitle', lectureTitle);
    formData.append('isPreviewFree', isPreviewFree);

    if (videoUrl) {
      formData.append('videoUrl', videoUrl);
    }

    setLoading(true);

    try {
      const result = await axios.post(
        serverURL+ `/api/course/editlecture/${lectureId}`,
        formData,
        { withCredentials: true }
      );

      const updatedLecture = result.data;

      const updatedLectures = lectureData.map((lecture) =>
        lecture._id === lectureId ? updatedLecture : lecture
      );

      dispatch(setLectureData(updatedLectures));

      toast.success('Lecture Updated!');
      navigate(`/createlecture/${courseId}`);
    } catch (error) {
      console.log(error);
      toast.error(
        `Error Updating Lecture, ${error.response?.data?.message || 'Something went wrong'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLecture = async () => {
    try {
      setLoading1(true);

      await axios.delete(
        serverURL +`/api/course/removelecture/${lectureId}`,
        { withCredentials: true }
      );

      const filteredLectures = lectureData.filter(
        (lecture) => lecture._id !== lectureId
      );

      dispatch(setLectureData(filteredLectures));

      toast.success('Lecture Removed!');
      navigate(`/createlecture/${courseId}`);
    } catch (error) {
      console.log(error);
      toast.error(
        `Error Removing Lecture, ${error.response?.data?.message || 'Something went wrong'}`
      );
    } finally {
      setLoading1(false);
    }
  };

  if (!selectedLecture) {
    return (
      <section className="min-h-screen bg-[#efefef] p-4 sm:p-6 md:p-8 flex justify-center items-center">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-3">
            Lecture not found
          </h2>
          <button
            type="button"
            onClick={() => navigate(`/createlecture/${courseId}`)}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#efefef] p-4 sm:p-6 md:p-8 flex justify-center items-center">
      <form
        onSubmit={handleEditLecture}
        className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-sm sm:p-6 md:p-8"
      >
        <button
          type="button"
          onClick={() => navigate(`/createlecture/${courseId}`)}
          className="mb-5 flex items-center gap-2 text-[22px] font-semibold text-slate-800 sm:mb-6 cursor-pointer"
        >
          <ArrowLeft size={22} />
          <span>Update Your Lecture</span>
        </button>

        <button
          type="button"
          onClick={handleRemoveLecture}
          className="mb-6 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition cursor-pointer hover:bg-red-700"
          disabled={loading1}
        >
          Remove Lecture
        </button>

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          type="text"
          className="mb-5 w-full rounded-md border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
          value={lectureTitle}
          onChange={(e) => setLectureTitle(e.target.value)}
        />

        <label className="mb-2 block text-sm font-medium text-slate-700">
          Video
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideoUrl(e.target.files[0])}
          className="mb-5 w-full rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-600 file:px-4 file:py-3 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
        />

        <label className="mb-8 flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPreviewFree}
            onChange={() => setIsPreviewFree(!isPreviewFree)}
            className="h-4 w-4 accent-black"
          />
          <span>Is this video FREE</span>
        </label>

        {loading && (
          <p className="mb-4 text-sm text-slate-600">
            Uploading lecture, please wait...
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
        >
          {loading ? <ClipLoader size={22} color='white' /> : 'Update Lecture'}
        </button>
      </form>
    </section>
  );
}

export default EditLecture;