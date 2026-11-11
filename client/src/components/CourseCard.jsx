import React from "react";
import { Link } from "react-router-dom";
import { Star, ArrowUpRight } from "lucide-react";
import { useTenant } from "../context/TenantContext";
import { optimizeImage } from "../utils/imageOptimizer";
import { getStoredTenantSlug } from "../services/tenantStorage";

function CourseCard({ thumbnail, title, subTitle, category, price, id, reviews, creator, enrolledStudents, progress = null }) {
  const { tenant } = useTenant();
  const targetSlug = tenant && !tenant.isPlatform && !["platform", "default"].includes(tenant.slug)
    ? tenant.slug
    : getStoredTenantSlug();
  const coursePath = targetSlug ? `/institution/${targetSlug}/course/${id}` : `/viewcourse/${id}`;
  const reviewCount = Array.isArray(reviews) ? reviews.length : 0;
  const rating = reviewCount
    ? (reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / reviewCount).toFixed(1)
    : null;
  const instructor = creator?.name || tenant?.name;
  const studentCount = Array.isArray(enrolledStudents) ? enrolledStudents.length : typeof enrolledStudents === "number" ? enrolledStudents : null;

  return (
    <article className="course-card">
      <Link to={coursePath} className="course-card-link" aria-label={`View ${title || "course"}`}>
        <div className="course-card-media">
          {thumbnail ? (
            <img src={optimizeImage(thumbnail, 600)} alt={title || "Course"} loading="lazy" />
          ) : (
            <div className="course-card-placeholder" aria-hidden="true"><span>{category || "Course"}</span></div>
          )}
          {category && <span className="course-card-category">{category}</span>}
          {progress !== null && <div className="course-card-progress"><span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>}
        </div>
        <div className="course-card-body">
          {instructor && <p className="course-card-instructor">{instructor}</p>}
          <h3>{title || "Untitled course"}</h3>
          {subTitle && <p className="course-card-subtitle">{subTitle}</p>}
          <div className="course-card-meta">
            <span className="course-card-price">{!price || Number(price) === 0 ? "Free" : `₹${Number(price).toLocaleString("en-IN")}`}</span>
            <span className="course-card-stats">
              {rating && <span className="course-card-rating"><Star size={13} fill="currentColor" /> {rating} <span>({reviewCount})</span></span>}
              {studentCount > 0 && <span>{studentCount.toLocaleString("en-IN")} learners</span>}
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default CourseCard;
