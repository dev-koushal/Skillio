import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { setUserData } from "../redux/userSlice";
import { setAuthSession } from "../services/authStorage";
import { setStoredTenantSlug } from "../services/tenantStorage";

export default function StudentNeutralHome() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [joiningSlug, setJoiningSlug] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadInstitutions = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await api.get("/api/tenant/directory");
        if (!data?.success || !Array.isArray(data.institutions)) {
          throw new Error("The institution list could not be loaded.");
        }
        if (mounted) setInstitutions(data.institutions);
      } catch (error) {
        if (mounted) {
          setInstitutions([]);
          setLoadError(error.response?.data?.message || "We couldn't load institutions. Check your connection and try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInstitutions();
    return () => { mounted = false; };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return institutions;
    return institutions.filter((item) => [item.name, item.institutionType, item.description, ...(item.domainTags || [])]
      .some((value) => value?.toLowerCase().includes(search)));
  }, [institutions, query]);

  const chooseInstitution = async (slug) => {
    if (!slug || joiningSlug) return;
    setJoiningSlug(slug);
    setSelectionError("");
    try {
      const { data } = await api.post("/api/auth/join-institution", { institutionSlug: slug });
      const hasSelectedMembership = Array.isArray(data?.user?.memberships)
        && data.user.memberships.some((membership) => membership.slug === slug);
      if (!data?.success || !data.token || !data.user || !hasSelectedMembership) {
        throw new Error(data?.message || "We couldn't confirm your institution access. Please try again.");
      }
      setAuthSession(data.token, data.user);
      dispatch(setUserData(data.user));
      setStoredTenantSlug(slug);
      navigate(`/institution/${slug}`);
    } catch (error) {
      setSelectionError(error.response?.data?.message || error.message || "We couldn't join this institution. Please try again.");
    } finally {
      setJoiningSlug(null);
    }
  };

  return (
    <div className="institution-choice-page min-h-screen flex flex-col">
      <Navbar />
      <main className="institution-choice-main">
        <section className="institution-choice-intro">
          <p className="institution-choice-kicker">YOUR LEARNING SPACE</p>
          <h1>Which institution are you studying with{userData?.name ? `, ${userData.name.split(" ")[0]}` : ""}?</h1>
          <p>Join an institution to open its course catalog and learning space. If you were invited, use the invitation link your educator sent you.</p>
          <label className="institution-choice-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search institutions" aria-label="Search institutions" /></label>
        </section>

        <section className="institution-choice-list" aria-label="Available institutions" aria-busy={loading}>
          {loading ? (
            <p className="institution-choice-empty" role="status">Loading institutions...</p>
          ) : loadError ? (
            <div className="institution-choice-feedback" role="alert">
              <p>{loadError}</p>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)}>Try again</button>
            </div>
          ) : filtered.length ? (
            filtered.map((institution) => (
              <button type="button" key={institution._id || institution.slug} className="institution-choice-row" onClick={() => chooseInstitution(institution.slug)} disabled={Boolean(joiningSlug)} aria-busy={joiningSlug === institution.slug}>
                <span className="institution-choice-logo">{institution.logo ? <img src={institution.logo} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.src = "/skillio.png"; }} /> : <Building2 size={18} />}</span>
                <span className="institution-choice-copy"><strong>{institution.name}</strong><span>{institution.institutionType || "Learning institution"}</span></span>
                <span className="institution-choice-action">{joiningSlug === institution.slug ? "Joining..." : "Join institution"}<ArrowRight size={16} /></span>
              </button>
            ))
          ) : (
            <p className="institution-choice-empty">
              {institutions.length ? "No institutions match that search. Try another name." : "No active institutions are available right now."}
            </p>
          )}
          {selectionError && <p className="institution-choice-feedback" role="alert">{selectionError}</p>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
