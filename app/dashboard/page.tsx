"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users,
  Building2,
  ClipboardList,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Activity,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import Spinner from "../../components/Spinner";

const fmt = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  iconBg: string;
  iconColor: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-md transition-all">
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}
      >
        <Icon size={20} className={iconColor} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("USER");
  const [loading, setLoading] = useState(true);

  // ADMIN financial stats
  const [finance, setFinance] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    accountBalances: [] as any[],
    incomeByCategory: [] as { name: string; amount: number }[],
    expenseByCategory: [] as { name: string; amount: number }[],
  });

  // Jobs & operational stats
  const [ops, setOps] = useState({
    totalJobs: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
    totalUsers: 0,
    totalVendors: 0,
  });

  // For staff: recent jobs
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!mounted || !session) {
          setLoading(false);
          return;
        }

        const tok = session.access_token;

        const { data: profile } = await supabase
          .from("users")
          .select("role, name")
          .eq("id", session.user.id)
          .single();

        const role = (profile as any)?.role || "USER";
        const name =
          (profile as any)?.name ||
          session.user.email?.split("@")[0] ||
          "Member";
        if (mounted) {
          setUserRole(role);
          setUserName(name);
        }

        if (role === "ADMIN" || role === "MANAGER") {
          const [summaryRes, jobsRes, usersRes, vendorsRes] = await Promise.all(
            [
              fetch("/api/accounting/summary", {
                headers: { Authorization: `Bearer ${tok}` },
              }),
              supabase.from("jobs").select("status", { count: "exact" }),
              role === "ADMIN"
                ? supabase
                    .from("users")
                    .select("id", { count: "exact", head: true })
                : Promise.resolve({ count: 0 }),
              role === "ADMIN"
                ? supabase
                    .from("vendors")
                    .select("id", { count: "exact", head: true })
                : Promise.resolve({ count: 0 }),
            ],
          );

          if (summaryRes.ok) {
            const s = await summaryRes.json();
            if (mounted)
              setFinance({
                totalIncome: s.totalIncome || 0,
                totalExpense: s.totalExpense || 0,
                netProfit: s.netProfit || 0,
                accountBalances: s.accountBalances || [],
                incomeByCategory: (s.incomeByCategory || []).slice(0, 5),
                expenseByCategory: (s.expenseByCategory || []).slice(0, 5),
              });
          }

          const { data: jobs, count: totalJobs } = jobsRes as any;
          const safeJobs = (jobs || []) as { status: string }[];
          if (mounted)
            setOps({
              totalJobs: totalJobs || 0,
              inProgress: safeJobs.filter((j) => j.status === "IN_PROGRESS")
                .length,
              completed: safeJobs.filter((j) => j.status === "COMPLETED")
                .length,
              pending: safeJobs.filter((j) => j.status === "PENDING").length,
              totalUsers: (usersRes as any).count || 0,
              totalVendors: (vendorsRes as any).count || 0,
            });
        } else {
          const { data: jobs, count } = await (supabase as any)
            .from("jobs")
            .select("status", { count: "exact" })
            .eq("staff_id", session.user.id);

          const safeJobs = (jobs || []) as { status: string }[];
          if (mounted)
            setOps((o) => ({
              ...o,
              totalJobs: count || 0,
              inProgress: safeJobs.filter((j) => j.status === "IN_PROGRESS")
                .length,
              completed: safeJobs.filter((j) => j.status === "COMPLETED")
                .length,
              pending: safeJobs.filter((j) => j.status === "PENDING").length,
            }));

          const { data: rj } = await (supabase as any)
            .from("jobs")
            .select("*, service:services(name), vendor:vendors(studio_name)")
            .eq("staff_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(5);
          if (mounted) setRecentJobs(rj || []);
        }
      } catch (e) {
        console.error("[Dashboard]", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = userRole === "ADMIN";
  const isManager = userRole === "MANAGER";
  const isAdminOrManager = isAdmin || isManager;

  const maxIncome = Math.max(
    ...finance.incomeByCategory.map((c) => c.amount),
    1,
  );
  const maxExpense = Math.max(
    ...finance.expenseByCategory.map((c) => c.amount),
    1,
  );

  return (
    <main className="lg:ml-[var(--sidebar-offset)] p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome back,{" "}
            <span className="text-indigo-600">{userName || "Member"}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Spinner className="w-4" /> Loadingâ€¦
          </div>
        )}
      </div>

      {/* â”€â”€ ADMIN / MANAGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isAdminOrManager && (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Income"
              value={fmt(finance.totalIncome)}
              icon={TrendingUp}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              sub="All time"
            />
            <StatCard
              label="Total Expense"
              value={fmt(finance.totalExpense)}
              icon={TrendingDown}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              sub="All time"
            />
            <StatCard
              label="Net Profit"
              value={fmt(finance.netProfit)}
              icon={BarChart3}
              iconBg={finance.netProfit >= 0 ? "bg-indigo-50" : "bg-amber-50"}
              iconColor={
                finance.netProfit >= 0 ? "text-indigo-600" : "text-amber-600"
              }
              sub={finance.netProfit >= 0 ? "In profit" : "In loss"}
            />
            <StatCard
              label="Total Jobs"
              value={ops.totalJobs}
              icon={ClipboardList}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              sub={`${ops.inProgress} in progress`}
            />
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Jobs Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Jobs Overview
                </h2>
                <Link
                  href="/dashboard/admin/jobs"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  View All <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: "Total Jobs",
                    value: ops.totalJobs,
                    color: "bg-blue-500",
                  },
                  {
                    label: "In Progress",
                    value: ops.inProgress,
                    color: "bg-amber-500",
                  },
                  {
                    label: "Completed",
                    value: ops.completed,
                    color: "bg-emerald-500",
                  },
                  {
                    label: "Pending",
                    value: ops.pending,
                    color: "bg-slate-300",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-sm text-slate-600">{label}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Balances */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Account Balances
                </h2>
                <Link
                  href="/dashboard/admin/accounting"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Manage <ArrowRight size={11} />
                </Link>
              </div>
              {finance.accountBalances.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No accounts yet
                </p>
              ) : (
                <div className="space-y-3">
                  {finance.accountBalances.slice(0, 4).map((acc: any) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Wallet size={13} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-700 truncate">
                          {acc.account_name}
                        </span>
                        {acc.is_default && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-bold ${acc.current_balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {fmt(acc.current_balance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

     

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                href: "/dashboard/admin/jobs",
                icon: ClipboardList,
                label: "Jobs",
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                href: "/dashboard/admin/accounting",
                icon: BarChart3,
                label: "Accounting",
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
              {
                href: "/dashboard/admin/vendors",
                icon: Building2,
                label: "Vendors",
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                href: "/dashboard/admin/reports",
                icon: Activity,
                label: "Reports",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
            ].map(({ href, icon: Icon, label, color, bg }) => (
              <Link
                key={href}
                href={href}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} group-hover:scale-110 transition-transform`}
                >
                  <Icon size={17} className={color} />
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {label}
                </span>
                <ArrowRight
                  size={13}
                  className="ml-auto text-slate-300 group-hover:text-indigo-400 transition-colors"
                />
              </Link>
            ))}
          </div>
        </>
      )}

      {/* â”€â”€ STAFF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!isAdminOrManager && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Jobs"
              value={ops.totalJobs}
              icon={ClipboardList}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
            />
            <StatCard
              label="In Progress"
              value={ops.inProgress}
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Completed"
              value={ops.completed}
              icon={CheckCircle2}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              label="Pending"
              value={ops.pending}
              icon={Calendar}
              iconBg="bg-slate-100"
              iconColor="text-slate-500"
            />
          </div>

          {recentJobs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Recent Jobs
                </h2>
                <Link
                  href="/dashboard/staff/my-jobs"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  View All <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-2">
                {recentJobs.map((job: any) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/staff/my-jobs/view/${job.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 size={15} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700">
                          {job.service?.name || "Job"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {job.vendor?.studio_name || "Individual"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs text-slate-400 hidden sm:block">
                        {new Date(job.job_due_date).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${job.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : job.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}
                      >
                        {job.status === "IN_PROGRESS"
                          ? "IN PROGRESS"
                          : job.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
