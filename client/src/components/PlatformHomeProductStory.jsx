import React from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  FileText,
  LockKeyhole,
  Play,
  Plus,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import "./PlatformHomeProductStory.css";

function EducatorWorkspaceVisual() {
  return (
    <div className="home-story-window" role="img" aria-label="Educator workspace showing course setup, curriculum, study notes, and publishing">
      <div className="home-story-window-bar">
        <span className="home-story-window-mark"><Building2 size={15} /></span>
        <span>Course builder</span>
        <span className="home-story-status">Draft</span>
      </div>
      <div className="home-story-window-body">
        <nav className="home-story-window-nav" aria-label="Educator workspace sections">
          <span className="home-story-nav-active"><BookOpen size={14} /> Courses</span>
          <span><Users size={14} /> Students</span>
        </nav>
        <div className="home-story-window-content">
          <p className="home-story-window-kicker">Course setup</p>
          <h3>Build a course</h3>
          <div className="home-story-setup-steps">
            <div className="home-story-setup-step home-story-setup-step-active"><span>01</span><strong>Course details</strong><Check size={14} /></div>
            <div className="home-story-setup-step"><span>02</span><strong>Curriculum</strong><Video size={14} /></div>
            <div className="home-story-setup-step"><span>03</span><strong>Pricing &amp; visibility</strong><ArrowRight size={14} /></div>
          </div>
          <div className="home-story-lesson-tools">
            <span><Plus size={15} /> Add video lesson</span>
            <span><FileText size={15} /> Attach study notes</span>
          </div>
          <div className="home-story-window-action">Publish course <ArrowRight size={14} /></div>
        </div>
      </div>
    </div>
  );
}

function StudentWorkspaceVisual() {
  return (
    <div className="home-story-window" role="img" aria-label="Student workspace showing a course overview, curriculum, video lessons, and resources">
      <div className="home-story-window-bar">
        <span className="home-story-window-mark"><BookOpen size={15} /></span>
        <span>Learning space</span>
        <span className="home-story-window-context"><Building2 size={13} /> Selected institution</span>
      </div>
      <div className="home-story-student-content">
        <p className="home-story-window-kicker">Course page</p>
        <div className="home-story-student-title">
          <div><h3>Learn from one course space</h3><p>Course overview, lessons, and study materials</p></div>
          <span className="home-story-play-mark"><Play size={17} fill="currentColor" /></span>
        </div>
        <div className="home-story-course-tabs"><span>Overview</span><span className="is-active">Curriculum</span><span>Notes &amp; Resources</span></div>
        <div className="home-story-learning-row"><span><Video size={15} /></span><strong>Video lessons</strong><ArrowRight size={14} /></div>
        <div className="home-story-learning-row"><span><FileText size={15} /></span><strong>Notes and study resources</strong><ArrowRight size={14} /></div>
      </div>
    </div>
  );
}

function InstitutionAccessVisual() {
  return (
    <div className="home-story-access-visual" role="img" aria-label="A student account is checked against active institution membership before the institution course catalog is returned">
      <div className="home-story-access-node">
        <span className="home-story-access-icon"><Users size={19} /></span>
          <span><small>Account</small><strong>Signed-in student</strong></span>
      </div>
      <div className="home-story-access-link"><span /><ArrowDown size={16} /></div>
      <div className="home-story-access-boundary">
        <div className="home-story-boundary-label"><ShieldCheck size={14} /> Active membership</div>
        <div className="home-story-access-node home-story-access-node-selected">
          <span className="home-story-access-icon"><Building2 size={19} /></span>
          <span><small>Selected institution</small><strong>Institution course catalog</strong></span>
          <Check size={16} />
        </div>
      </div>
      <div className="home-story-access-denied"><LockKeyhole size={16} /><span>Other institution catalogs</span><span className="home-story-denied-label">No membership</span></div>
    </div>
  );
}

export default function PlatformHomeProductStory() {
  return (
    <div className="home-story">
      <section className="home-story-audiences" aria-labelledby="home-story-audiences-title">
        <div className="home-story-wrap">
          <header className="home-story-heading">
            <p className="home-story-kicker">For educators and students</p>
            <h2 id="home-story-audiences-title">Tools for teaching and learning</h2>
            <p>Educators build and manage courses. Students find their institution’s courses, lessons, and study resources in one place.</p>
          </header>
          <div className="home-story-audience-grid">
            <article className="home-story-audience">
              <div className="home-story-audience-copy">
                <span className="home-story-audience-label"><Users size={15} /> For educators</span>
                <h3>Create courses and manage access</h3>
                <p>Build a curriculum with video lessons and notes, publish it to your institution, then invite students or manage course access.</p>
              </div>
              <EducatorWorkspaceVisual />
            </article>
            <article className="home-story-audience">
              <div className="home-story-audience-copy">
                <span className="home-story-audience-label"><BookOpen size={15} /> For students</span>
                <h3>Study with your institution</h3>
                <p>Choose your institution during sign in or sign up. Its catalog, course curriculum, video lessons, and resources stay together.</p>
              </div>
              <StudentWorkspaceVisual />
            </article>
          </div>
        </div>
      </section>

      <section className="home-story-security" aria-labelledby="home-story-security-title">
        <div className="home-story-wrap home-story-security-grid">
          <div className="home-story-security-copy">
            <p className="home-story-kicker">Institution-based access</p>
            <h2 id="home-story-security-title">Course access follows membership</h2>
            <p>Skillio checks a student’s active institution membership before returning that institution’s catalog, course details, or lessons.</p>
          </div>
          <InstitutionAccessVisual />
        </div>
      </section>
    </div>
  );
}
