import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  ArrowLeft,
  Building2,
  Globe,
  Sparkles,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Save,
  Upload,
  Copy,
  Check,
  LayoutDashboard,
  Home,
  Palette,
  Mail,
  Tag,
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

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [institutionType, setInstitutionType] = useState("Academy");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [domainTags, setDomainTags] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e3a8a");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [contactEmail, setContactEmail] = useState("");
  const [logoPreview, setLogoPreview] = useState("/skillio.png");
  const [logoFile, setLogoFile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const colorPresets = [
    { name: "Deep Navy", hex: "#1e3a8a" },
    { name: "Forest Green", hex: "#065f46" },
    { name: "Dark Bronze", hex: "#7c2d12" },
    { name: "Royal Purple", hex: "#581c87" },
    { name: "Slate Charcoal", hex: "#1e293b" },
  ];

  const institutionTypeOptions = [
    "Academy",
    "Coaching Center",
    "School",
    "Bootcamp",
    "University",
    "Private Tutoring Studio",
    "Institute",
  ];

  // 1. Check if the educator already manages an institution
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
          setDomainTags(Array.isArray(t.domainTags) ? t.domainTags.join(", ") : "");
          setPrimaryColor(t.primaryColor || "#1e3a8a");
          setSecondaryColor(t.secondaryColor || "#0f172a");
          setContactEmail(t.settings?.contactEmail || "");
          setLogoPreview(t.logo || "/skillio.png");
        } else if (contextTenant && !contextTenant.isPlatform && contextTenant.slug !== "default") {
          setExistingInstitution(contextTenant);
          setName(contextTenant.name || "");
          setSlug(contextTenant.slug || "");
          setInstitutionType(contextTenant.institutionType || "Academy");
          setDescription(contextTenant.description || "");
          setTitle(contextTenant.title || `Welcome to ${contextTenant.name}`);
          setSubtitle(contextTenant.subtitle || "");
          setDomainTags(Array.isArray(contextTenant.domainTags) ? contextTenant.domainTags.join(", ") : "");
          setPrimaryColor(contextTenant.primaryColor || "#1e3a8a");
          setLogoPreview(contextTenant.logo || "/skillio.png");
        }
      })
      .catch((err) => {
        console.warn("[ManageInstitution] Could not check existing tenant:", err.message);
      })
      .finally(() => {
        if (mounted) setCheckingExisting(false);
      });

    return () => {
      mounted = false;
    };
  }, [contextTenant]);

  // Auto-slugify from name if creating a new institution
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
    toast.success("Public institution link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  // Submit handler: UPDATE if existing, CREATE if new
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userData) {
      toast.info("Please sign in as an educator to manage your institution");
      navigate("/login");
      return;
    }

    if (!name.trim()) {
      toast.error("Please provide an institution name");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("institutionType", institutionType);
      formData.append("title", title.trim() || `Welcome to ${name.trim()}`);
      formData.append("subtitle", subtitle.trim());
      formData.append("description", description.trim());
      formData.append("domainTags", domainTags.trim());
      formData.append("primaryColor", primaryColor);
      formData.append("secondaryColor", secondaryColor);
      formData.append("contactEmail", contactEmail.trim());

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      if (existingInstitution) {
        // UPDATE EXISTING INSTITUTION
        const res = await api.put("/api/tenant/my-institution", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.success) {
          toast.success(res.data.message || "Institution settings saved!");
          if (res.data.tenant) {
            setExistingInstitution(res.data.tenant);
          }
          if (reloadTenant) reloadTenant();
        }
      } else {
        // CREATE FIRST INSTITUTION (One-time only)
        if (!slug.trim() || slug.length < 3) {
          toast.error("Subdomain slug must be at least 3 alphanumeric characters");
          setLoading(false);
          return;
        }

        formData.append("slug", slug.trim());
        const res = await api.post("/api/tenant/create-institution", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data?.success) {
          toast.success(res.data.message || "Institution created successfully!");

          if (res.data.user) {
            dispatch(setUserData(res.data.user));
          }

          if (res.data.tenant?.slug) {
            switchTenant(res.data.tenant.slug);
          }
          navigate("/educator/home");
        }
      }
    } catch (err) {
      console.error("[ManageInstitution Error]", err);
      toast.error(err?.response?.data?.message || "Failed to save institution settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-[#1e3a8a] selection:text-white pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        {/* Top Back & Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/educator/home")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Educator Home</span>
          </button>

          {existingInstitution && (
            <div className="flex items-center gap-2">
              <Link
                to={`/institution/${existingInstitution.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e3a8a] hover:underline px-3 py-1.5 rounded-xl bg-[#eff6ff] border border-[#bfdbfe]"
              >
                <span>View Public Academy</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          )}
        </div>

        {checkingExisting ? (
          <div className="bg-white border border-[#e8e5dc] rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-8 h-8 border-3 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#78716c] uppercase tracking-wider">
              Loading institution workspace...
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
            {/* Header: Differentiate Manage vs Create */}
            <div className="space-y-3 border-b border-[#f2efe9] pb-6">
              {existingInstitution ? (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Single Connected Institution Policy • Managed Institution</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                        Manage {existingInstitution.name}
                      </h1>
                      <p className="text-xs sm:text-sm text-[#78716c] mt-1">
                        Configure branding, curriculum details, domain tags, and theme colors for your academy.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f8f7f4] border border-[#d6d3c9] text-xs font-bold text-[#44403c] hover:bg-[#f2efe9] transition cursor-pointer pressable"
                      >
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copied ? "Link Copied" : "Copy Academy URL"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Informative Policy Callout */}
                  <div className="p-3.5 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e3a8a] flex items-center gap-3">
                    <Building2 size={18} className="shrink-0 text-[#1e3a8a]" />
                    <span>
                      Each educator manages exactly one institution. Your courses, students, and analytics are isolated inside <strong>{existingInstitution.name}</strong>.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff6ff] text-xs font-bold text-[#1e3a8a] border border-[#bfdbfe]">
                    <Sparkles size={14} className="text-[#1e3a8a]" />
                    <span>Independent Institution Setup</span>
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917] tracking-tight">
                      Create Your Institution
                    </h1>
                    <p className="text-xs sm:text-sm text-[#78716c] mt-1">
                      Set up your independent white-label academy with its own courses, verified students, and dedicated branding.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Institution Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Institution Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Apex Coding Academy"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#d6d3c9] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white transition shadow-2xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Subdomain / Slug {existingInstitution ? "(Locked)" : <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative flex items-center">
                    <Globe size={16} className="absolute left-3.5 text-[#78716c]" />
                    <input
                      type="text"
                      required
                      disabled={Boolean(existingInstitution)}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="e.g. apexcoding"
                      className={`w-full pl-10 pr-24 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none font-mono ${
                        existingInstitution
                          ? "bg-[#f8f7f4] border-[#e8e5dc] text-[#78716c] cursor-not-allowed"
                          : "bg-white border-[#d6d3c9] focus:ring-2 focus:ring-[#1e3a8a] text-[#1c1917]"
                      }`}
                    />
                    <span className="absolute right-3.5 text-xs text-[#a8a29e] pointer-events-none">
                      .skillio
                    </span>
                  </div>
                  {existingInstitution && (
                    <p className="text-[10px] text-[#78716c]">
                      Subdomain slug is permanent to protect enrolled student bookmarks.
                    </p>
                  )}
                </div>
              </div>

              {/* Institution Type & Contact Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Institution Type
                  </label>
                  <select
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#d6d3c9] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white transition shadow-2xs font-medium cursor-pointer"
                  >
                    {institutionTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Contact Email
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={16} className="absolute left-3.5 text-[#78716c]" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@academy.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6d3c9] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white transition shadow-2xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Homepage Headline
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Master Practical Coding Skills"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#d6d3c9] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white transition shadow-2xs font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                    Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Industry-led curriculum with verified certifications"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#d6d3c9] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white transition shadow-2xs font-medium"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                  Institution Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your academy's philosophy, educator background, and student objectives..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#d6d3c9] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white transition shadow-2xs font-medium resize-none"
                />
              </div>

              {/* Domain & Category Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#44403c]">
                  Subject & Focus Tags
                </label>
                <div className="relative flex items-center">
                  <Tag size={16} className="absolute left-3.5 text-[#78716c]" />
                  <input
                    type="text"
                    value={domainTags}
                    onChange={(e) => setDomainTags(e.target.value)}
                    placeholder="e.g. Physics, JEE, Advanced Calculus, NEET (comma-separated)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6d3c9] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white transition shadow-2xs font-medium"
                  />
                </div>
                <p className="text-[10px] text-[#78716c]">
                  Helps prospective students discover your academy in the public institution directory.
                </p>
              </div>

              {/* Branding: Logo & Color Theme */}
              <div className="pt-4 border-t border-[#f2efe9] space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                  Branding & Visual System
                </h3>

                {/* Logo Upload & Preview */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc]">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-[#d6d3c9] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    <img
                      src={logoPreview}
                      alt="Institution Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.src = "/skillio.png";
                      }}
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className="text-xs font-bold text-[#1c1917]">Institution Logo</p>
                    <p className="text-[11px] text-[#78716c]">
                      Recommended 256x256 PNG or SVG with transparent background.
                    </p>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#d6d3c9] text-xs font-bold text-[#1e3a8a] hover:bg-blue-50/50 transition cursor-pointer mt-1">
                      <Upload size={13} />
                      <span>Choose New Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Color Palette Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#44403c] flex items-center gap-1.5">
                    <Palette size={14} className="text-[#1e3a8a]" />
                    <span>Primary Accent Color</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setPrimaryColor(preset.hex)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition pressable ${
                          primaryColor === preset.hex
                            ? "border-[#1e3a8a] bg-[#eff6ff] text-[#1e3a8a] shadow-xs"
                            : "border-[#e8e5dc] bg-white text-[#44403c] hover:bg-[#f8f7f4]"
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="institution-form-actions pt-6 border-t border-[#f2efe9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-xs text-[#78716c]">
                  Changes are applied immediately to all public academy pages and course viewers.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/educator/home")}
                    className="px-5 py-2.5 rounded-xl border border-[#d6d3c9] text-xs font-bold text-[#44403c] hover:bg-[#f8f7f4] transition cursor-pointer pressable"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer pressable disabled:opacity-50 min-h-[44px]"
                  >
                    <Save size={16} />
                    <span>{loading ? "Saving Changes..." : existingInstitution ? "Save Institution Settings" : "Create Institution"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CreateInstitution;
