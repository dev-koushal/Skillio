import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Users, Rocket, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useTenant } from "../context/TenantContext";

const features = [
  {
    icon: <BookOpen size={22} />,
    title: "Structured Curriculum",
    desc: "Sequential, milestone-driven learning paths designed for verified comprehension.",
  },
  {
    icon: <Users size={22} />,
    title: "Dedicated Academies",
    desc: "Independent spaces for coaching centers, colleges, and expert educators.",
  },
  {
    icon: <Rocket size={22} />,
    title: "Resource Ecosystem",
    desc: "Downloadable PDF lecture notes, formula cheat sheets, and practical exercises.",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "Strict Course Access",
    desc: "Server-verified payment and enrollment access with complete data isolation.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function About() {
  const { tenant } = useTenant();
  const tenantName = tenant?.name || "Skillio Academy";

  return (
    <section id="about" className="bg-white text-[#1c1917] px-4 sm:px-6 lg:px-8 py-20 border-t border-[#e8e5dc]">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto text-center space-y-3 mb-16"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-[#b45309] bg-[#f2efe9] px-3 py-1 rounded-full border border-[#e8e5dc]">
          About The Platform
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1c1917] tracking-tight">
          Modern Education Infrastructure
        </h2>
        <p className="text-xs sm:text-base text-[#57534e] max-w-xl mx-auto leading-relaxed">
          {tenantName} provides high-performance video streaming, organized lecture notes, verified teacher tooling, and clean student experiences.
        </p>
      </motion.div>

      {/* Grid of features */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            variants={item}
            className="p-6 rounded-2xl bg-[#f8f7f4] border border-[#e8e5dc] hover:border-[#1e3a8a]/40 transition shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e5dc] text-[#1e3a8a] flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-bold text-sm sm:text-base text-[#1c1917]">{f.title}</h3>
              <p className="text-xs sm:text-sm text-[#78716c] leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

export default About;
