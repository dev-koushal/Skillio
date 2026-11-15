import React from "react";
import { ArrowLeft } from "lucide-react";

function PageHeader({ title, onBack }) {
  return (
    <header className="border-b border-[#e8e5dc] pb-3 mb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#f2efe9] transition cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-[#1c1917] truncate">{title}</h2>
          <p className="text-[10px] text-[#78716c] uppercase tracking-wider">{title}</p>
        </div>
      </div>
    </header>
  );
}

export default PageHeader;