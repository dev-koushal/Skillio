import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BookOpen,
  GraduationCap,
  User,
  LayoutDashboard,
  Users,
  BarChart3,
  Building2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useTenant } from "../../context/TenantContext";

export default function MobileBottomNav({ currentInstitution = null }) {
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);
  const { tenant } = useTenant();

  const isEducator =
    userData?.role === "educator" ||
    userData?.role === "tenant_admin" ||
    userData?.role === "platform_admin";

  const activeInstitution =
    currentInstitution ||
    (tenant && !tenant.isPlatform && tenant.slug !== "platform" && tenant.slug !== "default"
      ? tenant
      : null);

  const homePath = activeInstitution ? `/institution/${activeInstitution.slug}` : "/";

  // Navigation Items for Student / Visitor vs Educator
  const studentNavItems = [
    {
      label: "Home",
      path: homePath,
      icon: Home,
      isActive:
        location.pathname === "/" ||
        location.pathname === homePath ||
        (activeInstitution && location.pathname === `/institution/${activeInstitution.slug}`),
    },
    {
      label: "Courses",
      path: activeInstitution ? `/institution/${activeInstitution.slug}/courses` : "/courses",
      icon: BookOpen,
      isActive: location.pathname.includes("/courses") || location.pathname.startsWith("/viewcourse/"),
    },
    {
      label: "My Courses",
      path: userData ? (activeInstitution ? `/institution/${activeInstitution.slug}/my-courses` : "/mycourses") : "/login",
      icon: GraduationCap,
      isActive:
        location.pathname.includes("/my-courses") ||
        location.pathname === "/mycourses" ||
        location.pathname.startsWith("/viewlecture/"),
    },
    {
      label: userData ? "Profile" : "Sign In",
      path: userData ? (activeInstitution ? `/institution/${activeInstitution.slug}/profile` : "/profile") : "/login",
      icon: User,
      isActive:
        location.pathname.includes("/profile") ||
        location.pathname === "/editprofile" ||
        location.pathname === "/login",
    },
  ];

  const educatorNavItems = [
    {
      label: "Home",
      path: "/educator/home",
      icon: Home,
      isActive: location.pathname === "/educator/home" || location.pathname === "/educator",
    },
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      isActive: location.pathname === "/dashboard",
    },
    {
      label: "Courses",
      path: "/courses",
      icon: BookOpen,
      isActive: location.pathname === "/courses" || location.pathname.startsWith("/builder"),
    },
    {
      label: "Students",
      path: "/students",
      icon: Users,
      isActive: location.pathname === "/students" || location.pathname.startsWith("/dashboard/students"),
    },
    {
      label: "Institution",
      path: "/create-institution",
      icon: Building2,
      isActive: location.pathname === "/create-institution",
    },
  ];

  const items = isEducator ? educatorNavItems : studentNavItems;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-[#e8e5dc] pb-safe shadow-lg transition-transform"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 touch-target rounded-xl transition-all select-none ${
                active
                  ? "text-[#1e3a8a] font-bold"
                  : "text-[#78716c] hover:text-[#1c1917] font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all duration-200 ${
                  active ? "bg-[#eff6ff] scale-105" : "bg-transparent"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

