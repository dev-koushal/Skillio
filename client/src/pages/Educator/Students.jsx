import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  UserPlus,
  X,
  AlertTriangle,
  RefreshCw,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../../services/api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import MobileBottomNav from "../../components/common/MobileBottomNav";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import { useTenant } from "../../context/TenantContext";

export default function InstitutionStudents() {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  // Stats state
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentsWithCourses: 0,
    newStudents: 0,
    totalCourses: 0,
    activeAccessGrants: 0,
  });

  // Students list state
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'withCourses'

  // Selected student for Access Management sheet/modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [studentCourses, setStudentCourses] = useState([]);
  const [accessActionLoading, setAccessActionLoading] = useState(false);

  // Revoke confirmation modal state
  const [revokeTarget, setRevokeTarget] = useState(null); // { courseId, title }

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCourseId, setInviteCourseId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Institution courses list for grant/invite dropdown
  const [institutionCourses, setInstitutionCourses] = useState([]);

  // Fetch educator courses on mount for dropdown
  useEffect(() => {
    api
      .get("/api/course/getcreatorcourse")
      .then(({ data }) => {
        const list = Array.isArray(data.courses) ? data.courses : [];
        if (list.length > 0) {
          setInstitutionCourses(
            list.map((c) => ({ id: c._id, title: c.title }))
          );
        }
      })
      .catch(() => { });
  }, []);

  const handleGenerateLink = async (targetCourseId) => {
    const courseId = targetCourseId || inviteCourseId;
    if (!courseId) {
      toast.error("Please select a course to generate an invitation link");
      return;
    }

    try {
      setGeneratingLink(true);
      const { data } = await api.post("/api/invitations/create", {
        courseId,
        invitedEmail: inviteEmail.trim() || undefined,
        expiresInHours: 168, // 7 days
      });

      if (data.success && data.inviteUrl) {
        setGeneratedInviteUrl(data.inviteUrl);
        navigator.clipboard?.writeText(data.inviteUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
        toast.success("Invitation link generated and copied to clipboard!");
      }
    } catch (err) {
      console.error("[GenerateLink Error]", err);
      toast.error(err?.response?.data?.message || "Failed to generate invitation link");
    } finally {
      setGeneratingLink(false);
    }
  };

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data } = await api.get("/api/institutions/me/stats");
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.warn("Could not load institution stats:", err.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search,
        filter,
      };
      const { data } = await api.get("/api/institutions/me/students", { params });
      if (data.success) {
        setStudents(data.students || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch students:", err);
      toast.error(err?.response?.data?.message || "Failed to load student list");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  // Load stats and students on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch Student Detail for Access Management
  const openAccessManager = async (student) => {
    setSelectedStudent(student);
    setStudentDetailLoading(true);
    try {
      const { data } = await api.get(`/api/institutions/me/students/${student.id}`);
      if (data.success) {
        setStudentCourses(data.courses || []);
        setInstitutionCourses(
          data.courses.map((c) => ({ id: c.courseId, title: c.title }))
        );
      }
    } catch (err) {
      console.error("Failed to load student courses:", err);
      toast.error(err?.response?.data?.message || "Failed to load access details");
    } finally {
      setStudentDetailLoading(false);
    }
  };

  // Grant Access Handler
  const handleGrantAccess = async (courseId, courseTitle) => {
    if (!selectedStudent || !courseId) return;
    try {
      setAccessActionLoading(true);
      const { data } = await api.post(
        `/api/institutions/me/students/${selectedStudent.id}/access`,
        {
          courseId,
          source: "INSTITUTION_GRANTED",
        }
      );
      toast.success(data.message || `Access granted to ${courseTitle}!`);
      // Refresh student access detail and list
      await openAccessManager(selectedStudent);
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to grant course access");
    } finally {
      setAccessActionLoading(false);
    }
  };

  // Revoke Access Handler
  const handleRevokeAccess = async () => {
    if (!selectedStudent || !revokeTarget) return;
    try {
      setAccessActionLoading(true);
      const { data } = await api.delete(
        `/api/institutions/me/students/${selectedStudent.id}/access/${revokeTarget.courseId}`
      );
      toast.success(data.message || `Access revoked for ${revokeTarget.title}`);
      setRevokeTarget(null);
      await openAccessManager(selectedStudent);
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to revoke access");
    } finally {
      setAccessActionLoading(false);
    }
  };

  // Invite Student Handler
  const handleInviteStudent = async (e) => {
    e?.preventDefault();
    if (!inviteEmail || !inviteName) {
      toast.error("Please enter student name and email address");
      return;
    }
    try {
      setInviteLoading(true);
      const { data } = await api.post("/api/institutions/me/students/invite", {
        name: inviteName,
        email: inviteEmail,
        courseId: inviteCourseId || undefined,
      });
      toast.success(data.message || `Student invited to ${tenant?.name || "Academy"}!`);
      setInviteModalOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteCourseId("");
      fetchStudents();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to invite student");
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#1c1917] flex flex-col font-sans pb-20 md:pb-12">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e5dc] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#78716c] mb-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="hover:text-[#1e3a8a] transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Educator Studio</span>
              </button>
              <span>/</span>
              <span className="text-[#1c1917] font-bold">Student Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1c1917]">
              Academy Students
            </h1>
            <p className="text-xs sm:text-sm text-[#78716c] mt-0.5">
              Manage enrollments, grant and revoke course access, and invite learners to{" "}
              <strong>{tenant?.name || "your institution"}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchStudents();
                fetchStats();
              }}
              className="text-xs font-semibold pressable"
            >
              <RefreshCw className="inline-block mr-2" size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setInviteModalOpen(true)}
              className="font-bold shadow-xs pressable gap-2"
            >
              <UserPlus className="inline-block mr-2" size={16} />
              <span>Invite Student</span>
            </Button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                Total Students
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1c1917] mt-2">
              {statsLoading ? "—" : stats.totalStudents}
            </p>
            <span className="text-[11px] text-[#78716c] mt-0.5 block">
              Registered in this academy
            </span>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                Active Learners
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <GraduationCap size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1c1917] mt-2">
              {statsLoading ? "—" : stats.studentsWithCourses}
            </p>
            <span className="text-[11px] text-[#78716c] mt-0.5 block">
              Enrolled in ≥ 1 course
            </span>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                Access Grants
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1c1917] mt-2">
              {statsLoading ? "—" : stats.activeAccessGrants}
            </p>
            <span className="text-[11px] text-[#78716c] mt-0.5 block">
              Teacher & Paid Grants
            </span>
          </div>

          <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                New This Month
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-[#1c1917] mt-2">
              {statsLoading ? "—" : stats.newStudents}
            </p>
            <span className="text-[11px] text-[#78716c] mt-0.5 block">
              Joined within 30 days
            </span>
          </div>
        </div>

        {/* Search, Filter, and Controls Bar */}
        <div className="bg-white border border-[#e8e5dc] rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search students by name or email address..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl text-xs sm:text-sm text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a8a29e] hover:text-[#1c1917]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${filter === "all"
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "bg-[#f8f7f4] text-[#57534e] hover:bg-[#f2efe9]"
                  }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${filter === "active"
                  ? "bg-[#1e3a8a] text-white shadow-xs"
                  : "bg-[#f8f7f4] text-[#57534e] hover:bg-[#f2efe9]"
                  }`}
              >
                Active Members
              </button>
            </div>
          </div>
        </div>

        {/* Student List View */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#78716c] uppercase tracking-wider">
              Loading Academy Students...
            </p>
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            title={search ? "No matching students found" : "No students in this academy yet"}
            description={
              search
                ? `No student matching "${search}" was found. Try clearing your search query.`
                : "Students will appear here as soon as they purchase a course or are granted access."
            }
            primaryActionText="Invite First Student"
            onPrimaryAction={() => setInviteModalOpen(true)}
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-[#e8e5dc] rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#faf9f6] border-b border-[#e8e5dc] text-[11px] font-bold text-[#78716c] uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Enrolled Courses</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2efe9] text-xs sm:text-sm">
                  {students.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-[#fcfbf9] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                            {student.profilePicture ? (
                              <img
                                src={student.profilePicture}
                                alt={student.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              student.name?.charAt(0)?.toUpperCase() || "S"
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#1c1917]">{student.name}</p>
                            <p className="text-xs text-[#78716c]">{student.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {student.courses && student.courses.length > 0 ? (
                            student.courses.map((c) => (
                              <span
                                key={c.courseId}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]"
                              >
                                {c.title}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#a8a29e] italic">No courses</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#57534e]">
                        {new Date(student.joinedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} />
                          Active
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAccessManager(student)}
                          className="font-bold text-xs pressable gap-1.5"
                        >
                          <Shield size={13} />
                          <span>Manage Access</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-white border border-[#e8e5dc] rounded-2xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] font-bold flex items-center justify-center shrink-0 overflow-hidden text-sm">
                        {student.profilePicture ? (
                          <img
                            src={student.profilePicture}
                            alt={student.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          student.name?.charAt(0)?.toUpperCase() || "S"
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1c1917]">{student.name}</p>
                        <p className="text-xs text-[#78716c] truncate max-w-[190px]">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <div className="pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c] block mb-1">
                      Courses ({student.courses?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {student.courses && student.courses.length > 0 ? (
                        student.courses.map((c) => (
                          <span
                            key={c.courseId}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe]"
                          >
                            {c.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#a8a29e] italic">No active enrollments</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#f2efe9] text-xs">
                    <span className="text-[#a8a29e]">
                      Joined {new Date(student.joinedAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAccessManager(student)}
                      className="font-bold text-xs pressable gap-1.5"
                    >
                      <Shield size={13} />
                      <span>Manage Access</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 text-xs font-semibold text-[#78716c]">
                <span>
                  Showing page {page} of {totalPages} ({totalCount} total students)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Access Management Modal / Bottom Sheet */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#e8e5dc] rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f2efe9] bg-[#faf9f6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a] font-bold flex items-center justify-center text-sm">
                  {selectedStudent.name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#1c1917]">
                    Manage Course Access
                  </h3>
                  <p className="text-xs text-[#78716c]">{selectedStudent.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Course List & Status */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                  Courses in {tenant?.name || "This Institution"}
                </p>
                <p className="text-xs text-[#78716c]">
                  Grant or revoke access to individual courses for this student.
                </p>
              </div>

              {studentDetailLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-7 h-7 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-[#78716c]">Loading courses...</p>
                </div>
              ) : studentCourses.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#78716c] bg-[#f8f7f4] rounded-2xl border border-dashed border-[#d6d3c9]">
                  No courses found in this institution. Create courses in Educator Studio first.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {studentCourses.map((course) => {
                    const isGranted = course.hasAccess;
                    return (
                      <div
                        key={course.courseId}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-[#e8e5dc] hover:border-[#cbd5e1] transition gap-3 bg-[#fcfbf9]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#1c1917] truncate">
                              {course.title}
                            </h4>
                            {isGranted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                                <CheckCircle2 size={10} />
                                {course.accessSource === "PURCHASED"
                                  ? "Purchased"
                                  : "Academy Granted"}
                              </span>
                            ) : course.status === "revoked" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
                                <XCircle size={10} />
                                Access Revoked
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f2efe9] text-[#78716c] shrink-0">
                                No Access
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#78716c] mt-0.5">
                            Price: {course.price > 0 ? `₹${course.price}` : "Free"} •{" "}
                            {course.lectureCount} lectures
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isGranted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={accessActionLoading}
                              onClick={() =>
                                setRevokeTarget({
                                  courseId: course.courseId,
                                  title: course.title,
                                })
                              }
                              className="text-xs font-bold text-rose-700 hover:bg-rose-50 border-rose-200 pressable"
                            >
                              Revoke Access
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={accessActionLoading}
                              onClick={() =>
                                handleGrantAccess(course.courseId, course.title)
                              }
                              className="text-xs font-bold pressable"
                            >
                              Grant Access
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#faf9f6] border-t border-[#f2efe9] flex justify-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedStudent(null)}
                className="font-semibold text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      {revokeTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#e8e5dc] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1c1917]">
                Revoke Course Access?
              </h3>
              <p className="text-xs text-[#57534e] mt-1 leading-relaxed">
                Are you sure you want to revoke access to{" "}
                <strong>{revokeTarget.title}</strong> for{" "}
                <strong>{selectedStudent?.name}</strong>?
              </p>
              <p className="text-[11px] text-[#78716c] mt-2">
                * Note: If the student purchased this course, the transaction audit is preserved,
                but active lecture access will be removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokeTarget(null)}
                disabled={accessActionLoading}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRevokeAccess}
                loading={accessActionLoading}
                className="text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white pressable"
              >
                Confirm Revocation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Student Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#e8e5dc] rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f2efe9] bg-[#faf9f6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <h3 className="font-extrabold text-base text-[#1c1917]">
                  Invite Student to Academy
                </h3>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-2 text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInviteStudent} className="p-6 space-y-4">
              <p className="text-xs text-[#78716c]">
                Send an invitation to a student to join{" "}
                <strong>{tenant?.name || "your institution"}</strong>. They will securely receive
                an invitation link to set up their password.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#44403c] mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#44403c] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-2.5 bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#44403c] mb-1">
                  Initial Course Access (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={inviteCourseId}
                    onChange={(e) => {
                      setInviteCourseId(e.target.value);
                      setGeneratedInviteUrl("");
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-[#fcfbf9] border border-[#d6d3d1] rounded-xl text-xs sm:text-sm text-[#1c1917] focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]"
                  >
                    <option value="">No initial course (invite to academy only)</option>
                    {institutionCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  {inviteCourseId && (
                    <button
                      type="button"
                      disabled={generatingLink}
                      onClick={() => handleGenerateLink(inviteCourseId)}
                      className="px-3.5 py-2 bg-[#eff6ff] hover:bg-blue-100 text-[#1e3a8a] border border-[#bfdbfe] rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer pressable"
                      title="Generate a direct invitation link for this course"
                    >
                      <Link2 size={14} />
                      <span className="hidden sm:inline">Get Link</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Display generated invite link if available */}
              {generatedInviteUrl && (
                <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#1e3a8a] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>Single-Use Course Invite Link</span>
                    </span>
                    <span className="text-[11px] text-[#78716c]">Expires in 7 days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className="flex-1 bg-white border border-[#bfdbfe] rounded-lg px-2.5 py-1.5 text-xs text-[#1c1917] select-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(generatedInviteUrl);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 3000);
                        toast.success("Link copied!");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#1e3a8a] text-white text-xs font-bold flex items-center gap-1 hover:bg-[#172554] transition cursor-pointer shrink-0"
                    >
                      {linkCopied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{linkCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f2efe9]">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setInviteModalOpen(false);
                    setGeneratedInviteUrl("");
                  }}
                  disabled={inviteLoading}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={inviteLoading}
                  className="text-xs font-bold pressable"
                >
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

