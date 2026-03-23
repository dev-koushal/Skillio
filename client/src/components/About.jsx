import React from "react";
import { motion } from "framer-motion";
import { BookOpen, Users, Rocket, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: <BookOpen size={26} />,
    title: "Structured Learning",
    desc: "Clear path from basics → advanced with real projects.",
  },
  {
    icon: <Users size={26} />,
    title: "Community",
    desc: "Peer learning + doubt solving ecosystem.",
  },
  {
    icon: <Rocket size={26} />,
    title: "Career Ready",
    desc: "Built for internships & product-based companies.",
  },
  {
    icon: <ShieldCheck size={26} />,
    title: "Secure",
    desc: "Safe payments and reliable platform.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

function About() {
  return (
    <div id="about" className="min-h-screen bg-black text-white px-6 py-20">
      
      {/* HERO */}
      <motion.div
        variants={item}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="max-w-5xl mx-auto text-center"
      >
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
          Learn. Build. Get Hired.
        </h1>

        <p className="text-gray-400 mt-6 text-lg max-w-2xl mx-auto">
          Your all-in-one LMS to master DSA, development, and real-world skills.
        </p>
      </motion.div>

      {/* FEATURES */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 max-w-6xl mx-auto"
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            variants={item}
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition"
          >
            <div className="mb-4 text-cyan-400">{f.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-gray-400">{f.desc}</p>

            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-linear-to-br from-cyan-500/10 to-purple-500/10" />
          </motion.div>
        ))}
      </motion.div>

      {/* MISSION */}
      <motion.div
        variants={item}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="max-w-4xl mx-auto mt-24 text-center"
      >
        <h2 className="text-3xl font-semibold">Why this platform?</h2>

        <p className="text-gray-400 mt-4 leading-relaxed">
          Focused on execution — projects, DSA, and real interview prep.
        </p>
      </motion.div>
    </div>
  );
}

export default About;