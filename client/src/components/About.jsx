import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Users, Rocket, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useTenant } from "../context/TenantContext";

const features = [
  {
    icon: <BookOpen size={24} />,
    title: "Structured Curriculum",
    desc: "Sequential, milestone-driven learning paths designed for real progress.",
  },
  {
    icon: <Users size={24} />,
    title: "Vibrant Community",
    desc: "Collaborate with peers, ask questions, and learn alongside motivated learners.",
  },
  {
    icon: <Rocket size={24} />,
    title: "Career Acceleration",
    desc: "Hands-on projects and industry standards ready for professional portfolios.",
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Enterprise Grade",
    desc: "Secure multi-tenant architecture with encrypted sessions and verified payments.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function About() {
  const { tenant } = useTenant();
  const tenantName = tenant?.name || "Skillio";

  return (
    <section id="about" className="bg-black text-white px-4 sm:px-6 lg:px-8 py-20 border-t border-gray-900">
      {/* Heading */}
      <motion.div
        variants={item}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="max-w-4xl mx-auto text-center"
      >
        <h2 className="text-xs uppercase tracking-widest text-cyan-400 font-bold font-mono mb-3">
          Platform Architecture & Vision
        </h2>
        <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
          Learn. Build. Deliver.
        </h3>
        <p className="text-gray-400 mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {tenant?.heroContent ||
            `${tenantName} provides high-performance educational software designed for seamless course delivery and real skill mastery.`}
        </p>
      </motion.div>

      {/* Feature Cards Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14 max-w-7xl mx-auto"
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            variants={item}
            className="bg-gray-950/80 border border-gray-800/80 rounded-2xl p-6 hover:border-gray-700 transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 flex items-center justify-center mb-4">
              {f.icon}
            </div>
            <h4 className="text-base font-semibold text-white mb-2">{f.title}</h4>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Trust & Guarantee Banner */}
      <div className="max-w-4xl mx-auto mt-16 p-6 rounded-2xl bg-cyan-950/30 border border-cyan-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={24} className="text-cyan-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Verified Multi-Tenant Security</p>
            <p className="text-xs text-gray-400">Strict tenant isolation, encrypted sessions, and scoped course access.</p>
          </div>
        </div>
        <span className="text-xs font-mono uppercase tracking-wider px-3 py-1 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700 shrink-0">
          SOC-2 Ready
        </span>
      </div>
    </section>
  );
}

export default About;
