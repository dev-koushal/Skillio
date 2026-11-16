import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  Upload,
  Copy,
  Check,
  Mail,
  X,
  Plus,
  Loader2,
  Smartphone,
  Sparkles,
  BookOpen,
  Star,
  Signal,
  Wifi,
  Battery,
} from "lucide-react";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";
import { useTenant } from "../context/TenantContext";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./CreateInstitution.css";

function CreateInstitution() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { tenant: contextTenant, switchTenant, reloadTenant } = useTenant();

  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingInstitution, setExistingInstitution] = useState(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [institutionType, setInstitutionType] = useState("Academy");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [domainTags, setDomainTags] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6d28d9");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [contactEmail, setContactEmail] = useState("");
  const [logoPreview, setLogoPreview] = useState("/skillio.png");
  const [logoFile, setLogoFile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const colorPresets = [
    { name: "Purple", hex: "#6d28d9" },
    { name: "Indigo", hex: "#4338ca" },
    { name: "Slate", hex: "#0f172a" },
    { name: "Emerald", hex: "#047857" },
    { name: "Rose", hex: "#be123c" },
  ];

  const institutionTypeOptions = [
    "Academy",
    "Coaching Center",
    "School",
    "Bootcamp",
    "University",
    "Tutoring Studio",
    "Institute",
  ];

  useEffect(() => {
    let mounted = true;
    setCheckingExisting(true);

    api
      .get("/api/tenant/my-institution")
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.success && data?.hasInstitution && data?.tenant) {
          const t = data.tenant;
          setExistingInstitution(t);
          setName(t.name || "");
          setSlug(t.slug || "");
          setInstitutionType(t.institutionType || "Academy");
          setDescription(t.description || "");
          setTitle(t.title || `Welcome to ${t.name}`);
          setSubtitle(t.subtitle || "");
          setDomainTags(
            Array.isArray(t.domainTags) ? t.domainTags.join(", ") : ""
          );
          setPrimaryColor(t.primaryColor || "#6d28d9");
          setSecondaryColor(t.secondaryColor || "#0f172a");
          setContactEmail(t.settings?.contactEmail || "");
          setLogoPreview(t.logo || "/skillio.png");
        } else if (
          contextTenant &&
          !contextTenant.isPlatform &&
          contextTenant.slug !== "default"
        ) {
          setExistingInstitution(contextTenant);
          setName(contextTenant.name || "");
          setSlug(contextTenant.slug || "");
          setInstitutionType(contextTenant.institutionType || "Academy");
          setDescription(contextTenant.description || "");
          setTitle(contextTenant.title || `Welcome to ${contextTenant.name}`);
          setSubtitle(contextTenant.subtitle || "");
          setDomainTags(
            Array.isArray(contextTenant.domainTags)
              ? contextTenant.domainTags.join(", ")
              : ""
          );
          setPrimaryColor(contextTenant.primaryColor || "#6d28d9");
          setLogoPreview(contextTenant.logo || "/skillio.png");
        }
      })
      .catch((err) => {
        console.warn("[ManageInstitution]", err.message);
      })
      .finally(() => {
        if (mounted) setCheckingExisting(false);
      });

    return () => {
      mounted = false;
    };
  }, [contextTenant]);

  const handleNameChange = (val) => {
    setName(val);
    if (!existingInstitution) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/institution/${slug}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const parsedTags = domainTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const addTag = (raw) => {
    const clean = raw.trim().replace(/,/g, "");
    if (clean && !parsedTags.includes(clean)) {
      setDomainTags([...parsedTags, clean].join(", "));
    }
    setTagInput("");
  };

  const handleKeyDownTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setDomainTags(parsedTags.filter((t) => t !== tagToRemove).join(", "));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userData) {
      toast.info("Please sign in first");
      navigate("/login");
      return;
    }

    if (!name.trim()) {
      toast.error("Institution name is required");
      return;
    }

    setLoading(true);

    try {
      let finalTags = domainTags;
      if (tagInput.trim()) {
        const clean = tagInput.trim().replace(/,/g, "");
        if (clean && !parsedTags.includes(clean)) {
          finalTags = [...parsedTags, clean].join(", ");
        }
      }

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("institutionType", institutionType);
      formData.append("title", title.trim() || `Welcome to ${name.trim()}`);
      formData.append("subtitle", subtitle.trim());
      formData.append("description", description.trim());
      formData.append("domainTags", finalTags.trim());
      formData.append("primaryColor", primaryColor);
      formData.append("secondaryColor", secondaryColor);
      formData.append("contactEmail", contactEmail.trim());

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      if (existingInstitution) {
        const res = await api.put("/api/tenant/my-institution", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.success) {
          toast.success("Saved");
          if (res.data.tenant) setExistingInstitution(res.data.tenant);
          if (reloadTenant) reloadTenant();
        }
      } else {
        if (!slug.trim() || slug.length < 3) {
          toast.error("Slug must be at least 3 characters");
          setLoading(false);
          return;
        }

        formData.append("slug", slug.trim());
        const res = await api.post("/api/tenant/create-institution", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.success) {
          toast.success("Institution created");
          if (res.data.user) dispatch(setUserData(res.data.user));
          if (res.data.tenant?.slug) switchTenant(res.data.tenant.slug);
          navigate("/educator/home");
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  // Reusable Bezel-Less iPhone Student Portal Mockup
  const renderPhoneMockup = () => (
    <div className="relative mx-auto w-[276px] rounded-[42px] bg-zinc-900 p-[5px] shadow-[0_20px_50px_-12px_rgba(109,40,217,0.18),0_0_0_1px_rgba(24,24,27,0.12)] select-none">
      {/* Subtle Side Hardware Buttons */}
      <div className="absolute -left-[2px] top-20 w-[2px] h-6 bg-zinc-700 rounded-l-sm" />
      <div className="absolute -left-[2px] top-28 w-[2px] h-10 bg-zinc-700 rounded-l-sm" />
      <div className="absolute -right-[2px] top-24 w-[2px] h-12 bg-zinc-700 rounded-r-sm" />

      {/* Inner Edge-to-Edge OLED Screen */}
      <div className="relative w-full h-[548px] bg-white rounded-[37px] overflow-hidden flex flex-col">
        {/* iOS Status Bar + Dynamic Island */}
        <div className="relative pt-2 pb-1.5 px-5 flex items-center justify-between text-[10px] font-semibold text-zinc-900 bg-white z-20 shrink-0">
          <span>9:41</span>
          {/* Dynamic Island */}
          <div className="w-[72px] h-[19px] bg-black rounded-full flex items-center justify-end pr-2">
            <span className="w-2 h-2 rounded-full bg-indigo-950/90 ring-1 ring-white/10" />
          </div>
          <div className="flex items-center gap-1 text-zinc-800">
            <Signal size={10} strokeWidth={2.5} />
            <Wifi size={10} strokeWidth={2.5} />
            <Battery size={11} strokeWidth={2.5} />
          </div>
        </div>

        {/* Tiny Safari URL Pill */}
        <div className="px-3 pb-2 bg-white border-b border-zinc-100 shrink-0">
          <div className="h-6 rounded-lg bg-zinc-100/90 px-2.5 flex items-center justify-center gap-1 text-[10px] font-mono text-zinc-500 truncate">
            <Globe size={9} className="text-violet-600 shrink-0" />
            <span className="truncate">{slug || "academy"}.skillio</span>
          </div>
        </div>

        {/* Scrollable Student Portal View */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#fafafa] flex flex-col">
          {/* Student App Navbar */}
          <div className="bg-white px-3.5 py-2.5 flex items-center justify-between border-b border-zinc-100 sticky top-0 z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md border border-zinc-200 bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = "/skillio.png";
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-zinc-900 truncate">
                {name || "Apex Academy"}
              </span>
            </div>
            <span
              className="px-2 py-0.5 rounded-md text-[9px] font-semibold text-white shrink-0 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Join
            </span>
          </div>

          {/* Hero Section (Dynamic Brand Color) */}
          <div
            className="p-4 text-white space-y-2 transition-colors duration-200 relative overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-xs text-[9px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{institutionType}</span>
            </div>

            <h3 className="text-sm font-bold leading-snug line-clamp-2">
              {title || (name ? `Welcome to ${name}` : "Master Practical Skills")}
            </h3>

            <p className="text-[10px] text-white/85 line-clamp-2 leading-relaxed">
              {subtitle || "Live interactive cohorts & verified certificates."}
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-zinc-900 text-[10px] font-bold shadow-2xs">
                <span>Explore Catalog</span>
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-3.5 space-y-3.5 flex-1">
            {/* Bio */}
            <div className="bg-white p-2.5 rounded-xl border border-zinc-200/80 space-y-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                About
              </p>
              <p className="text-[10px] text-zinc-600 line-clamp-3 leading-relaxed">
                {description ||
                  "Welcome to our official learning portal. Enroll in structured courses designed for real-world mastery."}
              </p>
            </div>

            {/* Domain Tags */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                Focus Areas
              </p>
              <div className="flex flex-wrap gap-1">
                {(parsedTags.length > 0
                  ? parsedTags.slice(0, 5)
                  : ["Mathematics", "JEE", "Live Classes"]
                ).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 border border-violet-200/60 text-[9px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Mock Featured Courses */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                  Featured Courses
                </p>
                <span className="text-[9px] font-medium text-violet-600">
                  View all
                </span>
              </div>

              {[
                {
                  courseTitle: "Complete Foundation Batch",
                  lessons: "24 Lessons",
                  rating: "4.9",
                },
                {
                  courseTitle: "Advanced Problem Solving",
                  lessons: "18 Lessons",
                  rating: "5.0",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2.5 rounded-xl border border-zinc-200/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <BookOpen size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-zinc-900 truncate">
                        {item.courseTitle}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                        <span>{item.lessons}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium">
                          <Star size={8} className="fill-amber-400 text-amber-400" />
                          {item.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold px-2 py-1 rounded-md bg-zinc-100 text-zinc-700 shrink-0">
                    Enroll
                  </span>
                </div>
              ))}
            </div>

            {/* Support Footer inside Phone */}
            {contactEmail && (
              <div className="pt-1 text-center">
                <p className="text-[9px] text-zinc-400 truncate">
                  Support: {contactEmail}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="py-1.5 bg-white flex justify-center shrink-0 border-t border-zinc-100">
          <div className="w-24 h-1 rounded-full bg-zinc-900/80" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col font-sans antialiased selection:bg-violet-600 selection:text-white pb-20 sm:pb-0">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5 sm:py-10">
        {/* Top Minimal Header */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/educator/home")}
              className="w-8 h-8 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition shrink-0 cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft size={15} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 truncate">
                  {existingInstitution
                    ? existingInstitution.name
                    : "New Institution"}
                </h1>
                {/* Tiny Amber 1% Accent Badge */}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-[10px] font-medium text-amber-800 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {existingInstitution ? "Live" : "Setup"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate">
                {existingInstitution
                  ? `${existingInstitution.slug}.skillio`
                  : "Configure your academy portal"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mobile-only Preview Toggle Button */}
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(true)}
              className="lg:hidden h-8 px-2.5 rounded-lg border border-violet-200 bg-violet-50 text-xs font-medium text-violet-700 inline-flex items-center gap-1 transition cursor-pointer"
            >
              <Smartphone size={13} />
              <span>Preview</span>
            </button>

            {existingInstitution && (
              <>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Copy size={13} className="text-zinc-500" />
                  )}
                  <span className="hidden sm:inline">
                    {copied ? "Copied" : "Copy URL"}
                  </span>
                </button>

                <Link
                  to={`/institution/${existingInstitution.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-2.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100/70 text-xs font-medium text-violet-700 inline-flex items-center gap-1 transition"
                >
                  <span className="hidden sm:inline">Visit</span>
                  <ExternalLink size={12} />
                </Link>
              </>
            )}
          </div>
        </div>

        {checkingExisting ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-10 flex items-center justify-center gap-2.5 text-xs text-zinc-500">
            <Loader2 size={16} className="animate-spin text-violet-600" />
            <span>Loading workspace...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Vercel Minimalist Form (7 cols) */}
            <form
              onSubmit={handleSubmit}
              className="lg:col-span-7 space-y-4"
            >
              {/* Live Compact Identity Strip */}
              <div className="bg-white border border-zinc-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <label className="relative w-11 h-11 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        e.target.src = "/skillio.png";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <Upload size={13} />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-zinc-900 truncate">
                        {name || "Your Academy Name"}
                      </p>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      />
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400 truncate">
                      {slug || "academy"}.skillio
                    </p>
                  </div>
                </div>

                <label className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[11px] font-medium text-zinc-700 inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition">
                  <Upload size={12} className="text-violet-600" />
                  <span>Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* CARD 1: General Details */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    General
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700">
                        Name <span className="text-violet-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Apex Academy"
                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15 transition"
                      />
                    </div>

                    {/* Slug */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700 flex items-center justify-between">
                        <span>Subdomain</span>
                        {existingInstitution && (
                          <span className="text-[10px] text-zinc-400">
                            Locked
                          </span>
                        )}
                      </label>
                      <div className="relative flex items-center">
                        <Globe
                          size={13}
                          className="absolute left-3 text-zinc-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          required
                          disabled={Boolean(existingInstitution)}
                          value={slug}
                          onChange={(e) =>
                            setSlug(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, "")
                            )
                          }
                          placeholder="apex"
                          className={`w-full h-9 pl-8 pr-16 rounded-lg border text-xs sm:text-sm font-mono focus:outline-none transition ${existingInstitution
                            ? "bg-zinc-50 border-zinc-200 text-zinc-400 cursor-not-allowed"
                            : "bg-white border-zinc-200 text-zinc-900 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15"
                            }`}
                        />
                        <span className="absolute right-2.5 text-[11px] font-mono text-zinc-400 pointer-events-none">
                          .skillio
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Type & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700">
                        Category
                      </label>
                      <select
                        value={institutionType}
                        onChange={(e) => setInstitutionType(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15 transition cursor-pointer"
                      >
                        {institutionTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700">
                        Support Email
                      </label>
                      <div className="relative flex items-center">
                        <Mail
                          size={13}
                          className="absolute left-3 text-zinc-400 pointer-events-none"
                        />
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="help@academy.com"
                          className="w-full h-9 pl-8 pr-3 rounded-lg border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Portal Content & Tags */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Landing Page
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700">
                        Headline
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Master Practical Skills"
                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="Live cohorts & certificates"
                        className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">
                      Bio / Description
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short overview of your academy..."
                      className="w-full p-3 rounded-lg border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15 transition resize-none"
                    />
                  </div>

                  {/* Compact Tags */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700">
                      Subjects
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDownTag}
                        placeholder="Add tag (e.g. JEE, React) + Enter"
                        className="flex-1 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600/15 transition"
                      />
                      <button
                        type="button"
                        onClick={() => addTag(tagInput)}
                        className="h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-medium text-zinc-700 inline-flex items-center gap-1 shrink-0 cursor-pointer transition"
                      >
                        <Plus size={13} />
                        <span>Add</span>
                      </button>
                    </div>

                    {parsedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {parsedTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 border border-violet-200/70 text-[11px] font-medium"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-violet-400 hover:text-violet-900 cursor-pointer"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 3: Theme Color */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-semibold text-zinc-900">
                    Brand Accent
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Applies to your portal buttons & header
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {colorPresets.map((preset) => {
                    const active =
                      primaryColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setPrimaryColor(preset.hex)}
                        title={preset.name}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${active
                          ? "ring-2 ring-offset-2 ring-violet-600 scale-105"
                          : "opacity-80 hover:opacity-100"
                          }`}
                        style={{ backgroundColor: preset.hex }}
                      >
                        {active && <Check size={12} className="text-white" />}
                      </button>
                    );
                  })}

                  <label className="h-7 px-2 rounded-md border border-zinc-200 bg-zinc-50 text-[11px] font-mono text-zinc-600 inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-3.5 h-3.5 rounded-xs border-0 bg-transparent cursor-pointer"
                    />
                    <span>{primaryColor}</span>
                  </label>
                </div>
              </div>

              {/* Bottom Action Bar (Sticky on Mobile, Inline on Desktop) */}
              <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200 px-4 py-3 sm:static sm:bg-transparent sm:border-0 sm:p-0 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate("/educator/home")}
                  className="h-9 px-3.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 sm:flex-initial h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  <span>
                    {loading
                      ? "Saving..."
                      : existingInstitution
                        ? "Save Changes"
                        : "Create Institution"}
                  </span>
                </button>
              </div>
            </form>

            {/* RIGHT COLUMN: Sticky Bezel-Less iPhone Student View (5 cols on Desktop) */}
            <aside className="hidden lg:flex lg:col-span-5 lg:sticky lg:top-12 flex-col items-center">
              <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-zinc-200 shadow-2xs text-[11px] font-medium text-zinc-600">
                <Sparkles size={11} className="text-amber-500" />
                <span>Student Mobile View</span>
              </div>

              {renderPhoneMockup()}
            </aside>
          </div>
        )}
      </main>

      {/* Mobile Modal Drawer for Live iPhone Preview */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[290px] flex items-center justify-between mb-3 text-white">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              Student Mobile Preview
            </span>
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {renderPhoneMockup()}
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CreateInstitution;