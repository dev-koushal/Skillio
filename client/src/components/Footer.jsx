import React from "react";
import { Github, Linkedin, Twitter } from "lucide-react";

function Footer() {
  return (
    <footer id="footer" className="bg-black text-white border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-8">
        
        {/* LOGO + NAME */}
        <div>
            <img className="w-14 h-12 " src="/skillio.png" alt="logo" />
          <h2 className="text-xl font-semibold tracking-tight ml-1 mt-1">
            Skillio
          </h2>
          <p className="text-gray-400 text-sm mt-2 ml-1">
            Learn. Build. Get Hired.
          </p>
        </div>

        {/* LINKS */}
        <div className="flex flex-col gap-2 text-sm">
          <h3 className="font-semibold mb-2">Quick Links</h3>
          <a href="/" className="text-gray-400 hover:text-white transition">Home</a>
          <a href="/allcourses" className="text-gray-400 hover:text-white transition">Courses</a>
          <a href="#about" className="text-gray-400 hover:text-white transition">About</a>
          <a href="#footer" className="text-gray-400 hover:text-white transition">Contact</a>
        </div>

        {/* SOCIALS */}
        <div>
          <h3 className="font-semibold mb-2 text-sm">Connect</h3>
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition">
              <Github size={20} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <Linkedin size={20} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition">
              <Twitter size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="text-center text-xs text-gray-500 pb-6">
        © {new Date().getFullYear()} Skillio. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;