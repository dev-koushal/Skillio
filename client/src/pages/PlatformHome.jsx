import React from "react";
import { ArrowRight, BookOpen, Building2, PlayCircle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PlatformHomeProductStory from "../components/PlatformHomeProductStory";

export default function PlatformHome() {
  const navigate = useNavigate();
  return (
    <div className="platform-home min-h-screen flex flex-col pb-20 md:pb-0">
      <Navbar />
      <main className="platform-main flex-1">
        <section className="platform-hero platform-gateway-hero">
          <div className="platform-wrap platform-hero-grid">
            <div className="platform-hero-copy">
              <p className="platform-eyebrow"><span className="platform-eyebrow-dot" />Skillio learning platform</p>
              <h1 className="platform-title">Your institution’s courses. <span>One focused space.</span></h1>
              <p className="platform-lede">Sign in to continue with your institution, or create an account and choose the academy connected to your studies.</p>
              <div className="platform-actions">
                <button className="platform-button platform-button-primary" onClick={() => navigate("/login")}>Sign in <ArrowRight size={17} /></button>
                <button className="platform-button platform-button-secondary" onClick={() => navigate("/signup")}>Create an account</button>
              </div>
              <div className="platform-proof"><span><ShieldCheck size={16} /> Institution-specific course access</span><span><BookOpen size={16} /> Lessons and resources together</span></div>
            </div>
            <div className="platform-gateway-visual" aria-label="How Skillio connects students to their institution">
              <div className="platform-gateway-step"><span>01</span><div><strong>Your account</strong><small>Sign in or create an account</small></div><Building2 size={19} /></div>
              <div className="platform-gateway-connector" />
              <div className="platform-gateway-step"><span>02</span><div><strong>Your institution</strong><small>Choose the academy for your studies</small></div><ShieldCheck size={19} /></div>
              <div className="platform-gateway-connector" />
              <div className="platform-gateway-step"><span>03</span><div><strong>Your course catalog</strong><small>See courses from that institution</small></div><PlayCircle size={19} /></div>
            </div>
          </div>
        </section>

        <section className="platform-section platform-gateway-details">
          <div className="platform-section-heading">
            <div><p className="platform-kicker">A CLEARER WAY TO GET STARTED</p><h2>One account, the right learning space</h2><p>Choose your institution during sign up or sign in. Skillio keeps your course catalog aligned with that choice.</p></div>
          </div>
          <div className="platform-gateway-benefits">
            <article><span>01</span><BookOpen size={20} /><h3>Courses stay organized</h3><p>See the course catalog for your selected institution.</p></article>
            <article><span>02</span><PlayCircle size={20} /><h3>Learn from each lesson</h3><p>Open video lectures and the resources your educators provide.</p></article>
            <article><span>03</span><Building2 size={20} /><h3>Institutions stay distinct</h3><p>Each academy manages its own learning space and curriculum.</p></article>
          </div>
        </section>
        <PlatformHomeProductStory />
      </main>
      <Footer />
    </div>
  );
}
