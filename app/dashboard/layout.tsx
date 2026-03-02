"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  FileBarChart,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import Spinner from "../../components/Spinner";
import Sidebar from "../../components/Sidebar";
import type { Session } from "@supabase/supabase-js";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null); // Start as null to avoid "USER" flicker
  const [userName, setUserName] = useState<string>("");
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("sidebarCollapsed");
      if (savedState !== null) {
        setIsSidebarCollapsed(savedState === "true");
      }
    }
  }, []);

  const handleToggleSidebarCollapse = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  const fetchProfile = async (userId: string) => {
    // Prevent redundant fetches if we already have the profile for this user
    if (session?.user?.id === userId && userRole !== null) {
      console.log("[LAYOUT] ⏭️ Skipping profile fetch - already have role", {
        userId,
        currentRole: userRole,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log("[LAYOUT] 🔍 Fetching profile", {
      userId,
      currentRole: userRole,
      timestamp: new Date().toISOString(),
    });

    try {
      // CRITICAL: Role MUST come from users table, NOT from auth
      // The users table has the role field (ADMIN, MANAGER, USER)
      // Auth only provides authentication, not authorization roles
      const { data: profile, error } = await supabase
        .from("users")
        .select("role, name")
        .eq("id", userId)
        .single(); // Use single() for better type safety and error handling

      // Type assertion for partial select result
      type ProfileResult = { role: string; name: string } | null;
      const typedProfile = profile as ProfileResult;

      console.log("[LAYOUT] 📊 Profile fetch response from users table", {
        userId,
        hasData: !!typedProfile,
        role: typedProfile?.role,
        name: typedProfile?.name,
        error: error?.message,
        errorCode: error?.code,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error("[LAYOUT] ❌ Profile fetch error from users table:", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId,
          timestamp: new Date().toISOString(),
        });

        // CRITICAL: Always set a role, even on error, to prevent stuck loader
        // If user doesn't exist in users table, that's a data issue
        // But we'll default to USER role to prevent blocking
        console.log(
          "[LAYOUT] ⚠️ Setting default role USER due to error (user may not exist in users table)",
        );
        setUserRole("USER");
        setUserName(""); // Clear name on error
        return;
      }

      if (typedProfile) {
        // CRITICAL: Role comes from users.role, NOT from auth
        const newRole =
          typedProfile.role &&
          ["ADMIN", "MANAGER", "USER"].includes(typedProfile.role)
            ? typedProfile.role
            : "USER"; // Fallback to USER if invalid role

        console.log(
          "[LAYOUT] ✅ Profile loaded from users table - SETTING ROLE",
          {
            userId,
            role: newRole, // From users.role column
            name: typedProfile.name,
            previousRole: userRole,
            timestamp: new Date().toISOString(),
          },
        );

        // CRITICAL: Always set role, even if it's the same
        // This ensures state is updated and components re-render
        setUserRole(newRole);
        setUserName(typedProfile.name || "");

        console.log("[LAYOUT] ✅ Role and name state updated", {
          userId,
          newRole,
          newName: typedProfile.name || "",
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log(
          "[LAYOUT] ⚠️ No profile found in users table, using default USER role",
          {
            userId,
            timestamp: new Date().toISOString(),
          },
        );
        // CRITICAL: Always set role, even if profile is null
        setUserRole("USER");
        setUserName("");
      }
    } catch (err) {
      console.error("[LAYOUT] ❌ Unexpected profile error:", err);
      if (userRole === null) {
        console.log("[LAYOUT] ⚠️ Setting default role USER due to exception");
        setUserRole("USER");
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    let renderCount = 0;
    renderCount++;
    let sessionInitialized = false; // Track if session was set by onAuthStateChange

    console.log("[LAYOUT] 🚀 useEffect triggered", {
      renderCount,
      loading,
      hasSession: !!session,
      userRole,
      timestamp: new Date().toISOString(),
    });

    // CRITICAL FIX: Only use timeout as absolute last resort
    // Don't force false states if onAuthStateChange is handling it
    const timeout = setTimeout(() => {
      if (mounted && loading && !sessionInitialized) {
        console.warn(
          "[LAYOUT] ⏰ Loading timeout - no session initialized yet",
          {
            renderCount,
            hasSession: !!session,
            timestamp: new Date().toISOString(),
          },
        );
        // Only set loading false if we truly have no session
        // Don't override if onAuthStateChange is working
        if (!session) {
          setLoading(false);
          if (userRole === null) {
            console.log(
              "[LAYOUT] ⚠️ Setting default role USER due to timeout (no session)",
            );
            setUserRole("USER");
          }
        }
      }
    }, 15000); // Increased timeout since onAuthStateChange should handle it

    const init = async () => {
      try {
        console.log("[LAYOUT] 🔄 Init started (for page refresh scenario)", {
          renderCount,
          hasExistingSession: !!session,
          timestamp: new Date().toISOString(),
        });

        // CRITICAL FIX: Only run init if we don't already have a session
        // init() handles both: new logins (redirect from login page) and page refreshes
        if (session?.user) {
          console.log("[LAYOUT] ⏭️ Skipping init - session already exists", {
            userId: session.user.id,
            timestamp: new Date().toISOString(),
          });
          if (mounted) {
            setLoading(false);
            clearTimeout(timeout);
          }
          return;
        }

        // Check session: works for both new logins and page refreshes
        const { data, error } = await supabase.auth.getSession();

        console.log("[LAYOUT] 📊 Session check (page refresh)", {
          hasSession: !!data?.session,
          userId: data?.session?.user?.id,
          error: error?.message,
          timestamp: new Date().toISOString(),
        });

        if (mounted) {
          if (data?.session?.user) {
            console.log(
              "[LAYOUT] ✅ Session found (page refresh), setting session and fetching profile",
              {
                userId: data.session.user.id,
                timestamp: new Date().toISOString(),
              },
            );
            sessionInitialized = true;
            setSession(data.session);
            await fetchProfile(data.session.user.id);
            console.log("[LAYOUT] ✅ Init complete (page refresh)", {
              userId: data.session.user.id,
              userRole,
              timestamp: new Date().toISOString(),
            });
            setLoading(false);
            clearTimeout(timeout);
          } else {
            // Not logged in - redirect to login
            console.log(
              "[LAYOUT] ⚠️ No session found (page refresh), redirecting to login",
              {
                timestamp: new Date().toISOString(),
              },
            );
            setLoading(false);
            clearTimeout(timeout);
            router.push("/login");
            return;
          }
        }
      } catch (error) {
        console.error("[LAYOUT] ❌ Init error:", error);
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
          // On error, redirect to login for safety
          router.push("/login");
        }
      }
    };

    // Run init if we don't have a session yet
    // init() handles: new logins (after redirect from login page) and page refreshes
    // When user logs in and redirects to /dashboard, session state is null initially,
    // so init() runs, gets session from cookies, and fetches profile
    if (!session) {
      init();
    } else {
      console.log("[LAYOUT] ⏭️ Skipping init - session already exists", {
        userId: session.user.id,
        timestamp: new Date().toISOString(),
      });
      setLoading(false);
      clearTimeout(timeout);
    }

    // REMOVED: onAuthStateChange subscription
    // Why removed:
    // 1. User wants manual refresh only, no automatic updates
    // 2. No WebSocket/real-time subscriptions needed
    // 3. Session is checked on page load via init() function
    // 4. Login flow works: login page redirects → layout init() gets session → profile fetched
    // 5. Logout is handled by logout button which redirects to /login
    //
    // Session management is now:
    // - On page load: init() checks session and fetches profile
    // - On login: redirect to /dashboard → init() runs → session found → profile fetched
    // - On logout: logout button → signOut() → redirect to /login
    // - No automatic subscriptions or event listeners

    return () => {
      console.log("[LAYOUT] 🧹 Cleanup", {
        timestamp: new Date().toISOString(),
      });
      mounted = false;
      clearTimeout(timeout);
      // No subscriptions to clean up - removed onAuthStateChange
    };
    // CRITICAL FIX: Add session to dependencies to avoid stale closure
    // But use a ref or functional updates in callbacks to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep empty - we use functional updates in callbacks

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (!session) return null;

  const isAdmin = userRole === "ADMIN";
  const isManager = userRole === "MANAGER";

  const adminNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/admin/jobs", icon: ClipboardList, label: "Jobs" },
    { href: "/dashboard/admin/vendors", icon: Building2, label: "Vendors" },
    { href: "/dashboard/admin/services", icon: Briefcase, label: "Services" },
    { href: "/dashboard/admin/staff", icon: Users, label: "Users" },
    {
      href: "/dashboard/admin/accounting",
      icon: BarChart3,
      label: "Accounting",
    },
    {
      href: "/dashboard/admin/reports",
      icon: FileBarChart,
      label: "Reports",
    },
    {
      href: "/dashboard/admin/activity-logs",
      icon: ShieldCheck,
      label: "Activity Log",
    },
  ];

  const managerNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/admin/vendors", icon: Building2, label: "Vendors" },
    { href: "/dashboard/admin/jobs", icon: ClipboardList, label: "Jobs" },
  ];

  const staffNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/staff/my-jobs", icon: ClipboardList, label: "My Jobs" },
  ];

  const navItems = isAdmin
    ? adminNavItems
    : isManager
      ? managerNavItems
      : staffNavItems;

  return (
    <div
      className="min-h-screen bg-[#f1f5f9] text-slate-800 font-body selection:bg-indigo-500/20"
      style={
        {
          "--sidebar-offset": isSidebarCollapsed ? "4.75rem" : "16rem",
        } as CSSProperties
      }
    >
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        navItems={navItems}
        pathname={pathname}
        userName={userName}
        userRole={userRole}
        session={session}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Aesthetic Light Workspace Wrapper */}
      <div className="min-h-screen">{children}</div>
    </div>
  );
}
