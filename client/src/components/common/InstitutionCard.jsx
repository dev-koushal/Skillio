import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { optimizeImage } from "../../utils/imageOptimizer";
import { setStoredTenantSlug } from "../../services/tenantStorage";

export default function InstitutionCard({ institution, className = "" }) {
  if (!institution) return null;
  const { name = "Institution", slug, description, institutionType, logo, courseCount, domainTags = [] } = institution;
  return (
    <article className={`institution-card ${className}`}>
      <Link to={`/institution/${slug}`} className="institution-card-link" onClick={() => setStoredTenantSlug(slug)}>
        <div className="institution-card-heading">
          <span className="institution-card-logo">
            {logo ? <img src={optimizeImage(logo, 120)} alt={`${name} logo`} loading="lazy" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}
          </span>
          <span className="institution-card-title"><span>{institutionType || "Institution"}</span><strong>{name}</strong></span>
          <ArrowUpRight size={17} aria-hidden="true" />
        </div>
        {description && <p className="institution-card-description">{description}</p>}
        {domainTags.length > 0 && <div className="institution-card-tags">{domainTags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>}
        <div className="institution-card-footer"><span><BookOpen size={14} />{Number(courseCount) || 0} {Number(courseCount) === 1 ? "course" : "courses"}</span><span>View institution</span></div>
      </Link>
    </article>
  );
}
