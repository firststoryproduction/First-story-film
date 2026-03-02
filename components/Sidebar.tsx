"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  LucideIcon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import Tooltip from "./Tooltip";
import ConfirmationDialog from "./ConfirmationDialog";

interface SubItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  subItems?: SubItem[];
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  navItems: NavItem[];
  pathname: string;
  userName: string;
  userRole: string | null;
  session: Session | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  navItems,
  pathname,
  userName,
  userRole,
  session,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [showLogout, setShowLogout] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const profileRef = useRef<HTMLDivElement>(null);

  // Auto-expand the parent menu whose child matches the current pathname
  useEffect(() => {
    const activeParent = navItems.find((item) =>
      item.subItems?.some((s) => {
        const subPath = s.href.split("?")[0];
        const subSection = new URLSearchParams(s.href.split("?")[1] || "").get(
          "section",
        );
        const curSection = searchParams.get("section");
        if (subSection)
          return pathname === subPath && curSection === subSection;
        return pathname === subPath || pathname.startsWith(subPath + "/");
      }),
    );
    if (activeParent) setExpandedMenu(activeParent.href);
  }, [pathname, searchParams]);

  // Close logout menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowLogout(false);
      }
    };

    if (showLogout) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLogout]);

  const handleLogout = async () => {
    try {
      // Log logout button press and token for all users and conditions
      console.log("🔴 Confirm Logout button pressed");
      console.log("👤 User Info:", {
        userId: session?.user?.id,
        email: session?.user?.email,
        role: userRole,
        userName: userName,
      });
      console.log(
        "🔑 Access Token:",
        session?.access_token || "No token found",
      );
      console.log("📋 Full Session:", session);

      // 1) Proper Supabase logout (GLOBAL) – wait for it to finish
      console.log("🚪 Attempting to sign out (global)...");
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "global",
      });

      if (signOutError) {
        console.error("❌ Sign out error:", signOutError);
      } else {
        console.log("✅ Sign out successful (global)");
      }

      // 2) Clear all client-side session state in the app
      setShowLogoutDialog(false);
      setShowLogout(false);
      setSidebarOpen(false);

      // 3) Redirect to login page AFTER logout is done
      console.log("🔄 Redirecting to login page...");
      window.location.href = "/login?message=Signed out successfully";
    } catch (error) {
      console.error("❌ Logout error:", error);
      // If anything fails, still try to clear state and redirect
      setShowLogoutDialog(false);
      setShowLogout(false);
      setSidebarOpen(false);
      console.log("🔄 Force redirecting to login page after error...");
      window.location.href = "/login?message=Signed out successfully";
    }
  };

  return (
    <>
      {/* Mobile Navigation Trigger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-6 left-6 z-50 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl"
      >
        {sidebarOpen ? (
          <X size={20} className="text-slate-600" />
        ) : (
          <Menu size={20} className="text-slate-600" />
        )}
      </button>

      {/* Premium Light Sidebar - Collapsible on Desktop */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-3 border-indigo-200 m-2 rounded-xl z-40 flex flex-col transition-all duration-300 ease-in-out group/sidebar
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                    ${isCollapsed ? "lg:w-15 lg:p-1" : "lg:w-62 lg:p-3"} 
                    lg:translate-x-0 w-72 p-4`}
      >
        {/* Desktop Collapse Toggle Button - On Border */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center absolute -right-4 top-5 w-6 h-6 bg-white text-indigo-600 border-2 border-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white hover:border-white hover:shadow-md transition-all duration-300 z-50"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Branding */}
        <div
          className={`transition-all duration-300 ${isCollapsed ? "lg:mb-3 lg:mt-2 mb-2" : "mb-2"}`}
        >
          <div
            className={`flex items-center ${isCollapsed ? "lg:justify-center" : "space-x-2"}`}
          >
            {/* Collapsed: FSP Monogram Badge */}
            <div
              className={`flex-shrink-0 transition-all duration-300 ${isCollapsed ? "lg:flex hidden" : "hidden"}`}
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 ring-2 ring-white">
                <span className="text-white font-black text-sm tracking-tight leading-none select-none">
                  FSP
                </span>
              </div>
            </div>

            {/* Expanded: Full brand name */}
            <div
              className={`transition-all duration-300 overflow-hidden ${isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden" : "opacity-100"}`}
            >
              <div className="flex items-center space-x-2">
                {/* <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
                  <span className="text-white font-black text-[10px] tracking-tight leading-none select-none">FSP</span>
                </div> */}
                <h1 className="text-[18px] mt-2 font-bold font-heading text-black whitespace-nowrap">
                  FIRST STORY{" "}
                  <span className="text-indigo-600">PRODUCTION</span>
                </h1>
              </div>
            </div>

            {/* Mobile: always show full name */}
            <div className={`lg:hidden flex items-center space-x-2`}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-black text-[10px] tracking-tight">
                  FSP
                </span>
              </div>
              <h1 className="text-sm font-bold text-black whitespace-nowrap">
                FIRST STORY <span className="text-indigo-600">PRODUCTION</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav
          className={`transition-all duration-300 ${isCollapsed ? "lg:space-y-0" : "space-y-0.5"}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = !!item.subItems?.length;
            const isChildActive =
              hasSubItems &&
              item.subItems!.some((s) => {
                const subPath = s.href.split("?")[0];
                const subSection = new URLSearchParams(
                  s.href.split("?")[1] || "",
                ).get("section");
                if (subSection)
                  return (
                    pathname === subPath &&
                    searchParams.get("section") === subSection
                  );
                return pathname.startsWith(subPath);
              });
            const isActive = !hasSubItems
              ? pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href + "/"))
              : isChildActive;
            const isExpanded = expandedMenu === item.href;

            // Full expanded nav item (used on mobile always, desktop when not collapsed)
            const fullItem = (
              <div key={item.href}>
                {hasSubItems ? (
                  <button
                    onClick={() =>
                      setExpandedMenu(
                        expandedMenu === item.href ? null : item.href,
                      )
                    }
                    className={`nav-aesthetic mb-0.5 w-full text-left`}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="text-sm font-medium flex-1 text-left whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                    <ChevronRight
                      size={12}
                      className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""} opacity-60`}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`nav-aesthetic mb-1 ${isActive ? "active" : ""}`}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                  </Link>
                )}
                {hasSubItems && isExpanded && (
                  <div className="ml-3 mb-1 pl-3 border-l border-indigo-200 space-y-0.5">
                    {item.subItems!.map((sub) => {
                      const SubIcon = sub.icon;
                      const subPath = sub.href.split("?")[0];
                      const subSection = new URLSearchParams(
                        sub.href.split("?")[1] || "",
                      ).get("section");
                      const isSubActive = subSection
                        ? pathname === subPath &&
                          searchParams.get("section") === subSection
                        : pathname === subPath;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center space-x-2 px-2.5 py-2.5 rounded-lg text-sm transition-all ${
                            isSubActive
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <SubIcon size={20} className="flex-shrink-0" />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );

            return (
              <div key={item.href + "-wrap"}>
                {/* Collapsed desktop: icon only */}
                {isCollapsed && (
                  <div className="hidden lg:block">
                    <Tooltip text={item.label} position="right">
                      <Link
                        href={hasSubItems ? item.subItems![0].href : item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`nav-aesthetic mb-1 ${!hasSubItems && isActive ? "active" : ""} lg:justify-center lg:p-0 lg:w-10 lg:h-10`}
                      >
                        <Icon size={20} className="flex-shrink-0" />
                      </Link>
                    </Tooltip>
                  </div>
                )}
                {/* Expanded or mobile: full item */}
                <div className={isCollapsed ? "lg:hidden" : ""}>{fullItem}</div>
              </div>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Profile / Logout Widget */}
        <div
          ref={profileRef}
          className={`mb-4 relative transition-all duration-300 ${isCollapsed ? "lg:mx-0" : "mx-2"}`}
        >
          {/* Logout Menu */}
          {showLogout && (
            <div
              className={`absolute mb-3 rounded-lg shadow-2xl border border-indigo-200 p-0 animate-in slide-in-from-bottom-2 zoom-in-95 z-50 ${
                isCollapsed
                  ? "lg:bottom-0 lg:left-full lg:ml-2 lg:w-48"
                  : "bottom-full left-0 w-full"
              }`}
            >
              <button
                onClick={() => {
                  setShowLogout(false);
                  setShowLogoutDialog(true);
                }}
                className="w-full p-2 flex items-center justify-between text-rose-600 bg-white hover:bg-rose-50 rounded-lg transition-colors group/logout"
              >
                <span className="text-sm font-medium">Logout</span>
                <LogOut
                  size={16}
                  className="group-hover/logout:translate-x-1 transition-transform"
                />
              </button>
            </div>
          )}

          {/* Profile Toggle */}
          {isCollapsed ? (
            <div className="hidden lg:block">
              <Tooltip text={userName || "User"} position="right">
                <button
                  onClick={() => setShowLogout(!showLogout)}
                  className={`w-full border transition-all duration-300 text-left ${
                    showLogout
                      ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100"
                      : "bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md"
                  } ${
                    isCollapsed
                      ? "lg:p-2 lg:rounded-xl lg:flex lg:justify-center lg:items-center lg:w-11 lg:h-11"
                      : "p-2.5 rounded-xl flex items-center space-x-3"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md transition-all duration-300 ${
                        isCollapsed
                          ? "lg:w-9 lg:h-9 lg:text-xs"
                          : "w-8 h-8 text-xs"
                      }`}
                    >
                      {userName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <div
                    className={`overflow-hidden flex-1 transition-all duration-300 ${isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden" : "lg:w-auto lg:opacity-100"}`}
                  >
                    <p className="font-normal text-sm text-black truncate leading-none mb-1">
                      {userName || "User"}
                    </p>
                    <p className="text-xs font-normal text-gray-600">
                      {userRole}
                    </p>
                  </div>
                  <div
                    className={`text-slate-300 transition-all duration-300 ${showLogout ? "rotate-180 text-indigo-500" : ""} ${isCollapsed ? "lg:hidden" : ""}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </button>
              </Tooltip>
            </div>
          ) : (
            <button
              onClick={() => setShowLogout(!showLogout)}
              className={`w-full border transition-all duration-300 text-left ${
                showLogout
                  ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100"
                  : "bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-md"
              } ${
                isCollapsed
                  ? "lg:p-2 lg:rounded-xl lg:flex lg:justify-center lg:items-center lg:w-11 lg:h-11"
                  : "p-2.5 rounded-xl flex items-center space-x-3"
              }`}
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md transition-all duration-300 ${
                    isCollapsed ? "lg:w-9 lg:h-9 lg:text-xs" : "w-8 h-8 text-xs"
                  }`}
                >
                  {userName?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div
                className={`overflow-hidden flex-1 transition-all duration-300 ${isCollapsed ? "lg:w-0 lg:opacity-0 lg:hidden" : "lg:w-auto lg:opacity-100"}`}
              >
                <p className="font-normal text-sm text-black truncate leading-none mb-1">
                  {userName || "User"}
                </p>
                <p className="text-xs font-normal text-gray-600">{userRole}</p>
              </div>
              <div
                className={`text-slate-300 transition-all duration-300 ${showLogout ? "rotate-180 text-indigo-500" : ""} ${isCollapsed ? "lg:hidden" : ""}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </button>
          )}
        </div>
      </aside>

      <ConfirmationDialog
        open={showLogoutDialog}
        title="Confirm logout"
        message="Are you sure you want to sign out?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
