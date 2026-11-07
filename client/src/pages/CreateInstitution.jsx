import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, Building2, Globe, Sparkles, CheckCircle } from "lucide-react";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";
import { useTenant } from "../context/TenantContext";
import { toast } from "react-toastify";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function CreateInstitution() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { switchTenant } = useTenant();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [institutionType, setInstitutionType] = useState("Academy");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [domainTags, setDomainTags] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e3a8a");
  const [loading, setLoading] = useState(false);

  // Auto-slugify from name if slug not manually changed
  const handleNameChange = (val) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generated);
  };

  const colorPresets = [
    { name: "Deep Navy", hex: "#1e3a8a" },
    { name: "Forest Green", hex: "#065f46" },
    { name: "Dark Bronze", hex: "#7c2d12" },
    { name: "Royal Purple", hex: "#581c87" },
    { name: "Slate Charcoal", hex: "#1e293b" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userData) {
      toast.info("Please sign in or register to create an organization");
      navigate("/login");
      return;
    }

    if (!name.trim() || !slug.trim()) {
      toast.error("Please provide both an institution name and a subdomain slug");
      return;
    }

    if (slug.length < 3) {
      toast.error("Subdomain slug must be at least 3 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/tenant/create-institution", {
        name: name.trim(),
        slug: slug.trim(),
        institutionType,
        description: description.trim(),
        title: title.trim() || `Welcome to ${name.trim()}`,
        domainTags,
        primaryColor,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Institution created successfully!");

        // Update Redux state with updated user role (tenant_admin)
        if (res.data.user) {
          dispatch(setUserData(res.data.user));
        }

        // Switch tenant context to the new institution
        if (res.data.tenant?.slug) {
          switchTenant(res.data.tenant.slug);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error("[CreateInstitution Error]", err);
      toast.error(err?.response?.data?.message || "Failed to create institution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
        <button
          onClick={() => navigate("/institutions")}
          className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Institution Directory
        </button>

        <div className="bg-white border border-[#e8e5dc] rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          {/* Header */}
          <div className="space-y-2 border-b border-[#f2efe9] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f2efe9] text-xs font-semibold text-[#451a03]">
              <Sparkles size={14} className="text-[#b45309]" />
              <span>Multi-Tenant SaaS Academy Builder</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1c1917]">
              Create Your Independent Institution
            </h1>
            <p className="text-xs sm:text-sm text-[#57534e]">
              Launch an isolated white-label education portal. You will be assigned as the Organization Administrator with full control over courses, lectures, notes, and students.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Institution Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                Institution Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Apex Physics Institute, CodeCraft Academy"
                className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#d6d3c9] rounded-xl text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white transition"
              />
            </div>

            {/* Subdomain Slug */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                Subdomain Slug *
              </label>
              <div className="flex rounded-xl overflow-hidden border border-[#d6d3c9] focus-within:ring-2 focus-within:ring-[#1e3a8a]">
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  placeholder="apex-physics"
                  className="w-full px-4 py-3 bg-[#fbfbf9] text-sm text-[#1c1917] focus:outline-none focus:bg-white"
                />
                <span className="bg-[#f2efe9] text-[#78716c] px-4 py-3 text-xs sm:text-sm font-mono flex items-center border-l border-[#d6d3c9] whitespace-nowrap">
                  .mylms.com
                </span>
              </div>
              <p className="text-[11px] text-[#78716c]">
                Your students will access your institution at:{" "}
                <span className="font-mono text-[#1e3a8a] font-semibold">
                  {slug ? `${slug}.mylms.com` : "your-slug.mylms.com"}
                </span>{" "}
                (or <span className="font-mono">{slug || "your-slug"}.lvh.me</span> locally)
              </p>
            </div>

            {/* Type & Domain Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                  Institution Type
                </label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#d6d3c9] rounded-xl text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                >
                  <option value="Academy">Academy</option>
                  <option value="Coaching Center">Coaching Center</option>
                  <option value="Bootcamp">Bootcamp</option>
                  <option value="University">University</option>
                  <option value="Independent Educator">Independent Educator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                  Subject / Domain Tags
                </label>
                <input
                  type="text"
                  value={domainTags}
                  onChange={(e) => setDomainTags(e.target.value)}
                  placeholder="e.g. Physics, JEE, Mathematics (comma separated)"
                  className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#d6d3c9] rounded-xl text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
                />
              </div>
            </div>

            {/* Tagline / Subtitle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                Homepage Tagline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Empowering Next-Generation Physicists"
                className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#d6d3c9] rounded-xl text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                Institution Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what your institution offers..."
                className="w-full px-4 py-3 bg-[#fbfbf9] border border-[#d6d3c9] rounded-xl text-sm text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white"
              />
            </div>

            {/* Primary Brand Color */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403c]">
                Primary Brand Color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {colorPresets.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPrimaryColor(c.hex)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition ${
                      primaryColor === c.hex
                        ? "border-[#1e3a8a] bg-blue-50/60 ring-2 ring-[#1e3a8a]"
                        : "border-[#e8e5dc] hover:bg-[#f2efe9]"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-[#f2efe9] flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Institution...</span>
                  </>
                ) : (
                  <>
                    <Building2 size={16} />
                    <span>Launch Institution</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CreateInstitution;
