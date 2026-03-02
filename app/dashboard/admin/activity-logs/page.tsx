"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import AestheticSelect from "@/components/AestheticSelect";
import Badge from "@/components/Badge";
import Table from "@/components/Table";
import ConfirmationDialog from "@/components/ConfirmationDialog";

// ── helpers ────────────────────────────────────────────────────────────────
function fmtDate(ts: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl border ${
          type === "success"
            ? "bg-emerald-500 border-emerald-400 text-white"
            : "bg-rose-500 border-rose-400 text-white"
        }`}
      >
        {type === "success" ? (
          <CheckCircle size={18} />
        ) : (
          <AlertCircle size={18} />
        )}
        <p className="text-xs font-bold uppercase tracking-widest">{msg}</p>
      </div>
    </div>
  );
}

type Log = {
  id: string;
  user_id: string | null;
  user_name: string;
  action_type: string;
  module_name: string;
  record_id: string | null;
  description: string;
  status: string;
  ip_address: string | null;
  created_at: string;
};

const ACTION_COLORS: Record<
  string,
  "emerald" | "sky" | "rose" | "amber" | "slate"
> = {
  CREATE: "emerald",
  UPDATE: "sky",
  DELETE: "rose",
  LOGIN: "amber",
  LOGOUT: "slate",
};

// ── Main Content ───────────────────────────────────────────────────────────
function ActivityLogContent() {
  const [token, setToken] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const [filters, setFilters] = useState({
    search: "",
    date_from: "",
    date_to: "",
    action_type: "",
    module_name: "",
    status: "",
  });

  // Delete by date range
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRange, setDeleteRange] = useState({ from: "", to: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const notify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    const qp = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (filters.date_from) qp.set("date_from", filters.date_from);
    if (filters.date_to) qp.set("date_to", filters.date_to);
    if (filters.action_type) qp.set("action_type", filters.action_type);
    if (filters.module_name) qp.set("module_name", filters.module_name);
    if (filters.status) qp.set("status", filters.status);
    if (filters.search) qp.set("search", filters.search);

    const r = await fetch(`/api/activity-logs?${qp}`, { headers: h });
    if (r.status === 403) {
      setLogs([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    const d = await r.json();
    setLogs(d.data || []);
    setTotalCount(d.count || 0);
    setLoading(false);
  }, [token, page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const resetFilters = () => {
    setFilters({
      search: "",
      date_from: "",
      date_to: "",
      action_type: "",
      module_name: "",
      status: "",
    });
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRange.from || !deleteRange.to)
      return notify("Both From and To dates are required", "error");
    setDeleting(true);
    const r = await fetch("/api/activity-logs", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date_from: deleteRange.from,
        date_to: deleteRange.to,
      }),
    });
    const d = await r.json();
    setDeleting(false);
    setShowDeleteConfirm(false);
    setShowDeleteModal(false);
    if (!r.ok) return notify(d.error || "Delete failed", "error");
    notify(d.message || "Logs deleted!");
    load();
  };

  // CSV export (respects current filters)
  const exportCSV = () => {
    if (!logs.length) return notify("No data to export", "error");
    const headers = [
      "Date & Time",
      "User",
      "Action",
      "Module",
      "Record ID",
      "Description",
      "Status",
      "IP Address",
    ];
    const rows = logs.map((l) => [
      fmtDate(l.created_at),
      l.user_name,
      l.action_type,
      l.module_name,
      l.record_id || "",
      `"${l.description.replace(/"/g, '""')}"`,
      l.status,
      l.ip_address || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("CSV exported!");
  };

  const totalPages = Math.ceil(totalCount / LIMIT);
  const IC =
    "w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all";

  // Distinct module names for filter dropdown
  const moduleOptions = [
    "Accounts",
    "Income",
    "Expense",
    "Income Categories",
    "Expense Categories",
    "Jobs",
    "Vendors",
    "Staff",
    "Services",
    "Activity Logs",
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-5 px-2">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black">Activity Log</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                System audit trail — all user actions
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportCSV}
              className="flex items-center space-x-1.5 px-4 h-9 border border-gray-300 bg-white hover:bg-gray-50 text-slate-700 rounded-lg text-sm font-medium transition-all"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                setDeleteRange({ from: "", to: "" });
                setShowDeleteModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              <Trash2 size={14} />
              <span>Delete Logs</span>
            </button>
          </div>
        </div>

        {/* Filter + Table combined card */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-end gap-2">
            {/* Search */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Search
              </label>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  className="pl-8 pr-3 h-9 w-52 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Search description…"
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, search: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                From Date
              </label>
              <input
                type="date"
                className={IC + " w-36"}
                value={filters.date_from}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, date_from: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                To Date
              </label>
              <input
                type="date"
                className={IC + " w-36"}
                value={filters.date_to}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, date_to: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            {/* Action Type */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Action
              </label>
              <div className="w-[140px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Actions" },
                    { id: "CREATE", name: "Create" },
                    { id: "UPDATE", name: "Update" },
                    { id: "DELETE", name: "Delete" },
                    { id: "LOGIN", name: "Login" },
                    { id: "LOGOUT", name: "Logout" },
                  ]}
                  value={filters.action_type}
                  onChange={(v) => {
                    setFilters((f) => ({ ...f, action_type: v }));
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Module */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Module
              </label>
              <div className="w-[170px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Modules" },
                    ...moduleOptions.map((m) => ({ id: m, name: m })),
                  ]}
                  value={filters.module_name}
                  onChange={(v) => {
                    setFilters((f) => ({ ...f, module_name: v }));
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Status
              </label>
              <div className="w-[130px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Status" },
                    { id: "Success", name: "Success" },
                    { id: "Failed", name: "Failed" },
                  ]}
                  value={filters.status}
                  onChange={(v) => {
                    setFilters((f) => ({ ...f, status: v }));
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Reset */}
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1.5 px-3 h-9 border border-gray-300 rounded-lg text-slate-600 hover:bg-gray-50 text-xs font-medium transition-all whitespace-nowrap"
            >
              <RefreshCw size={12} />
            </button>
          </div>
          <Table
            columns={[
              { key: "created_at", header: "Date & Time", align: "left" },
              { key: "user_name", header: "User", align: "left" },
              { key: "action_type", header: "Action", align: "left" },
              { key: "module_name", header: "Module", align: "left" },
              { key: "description", header: "Description", align: "left" },
              { key: "status", header: "Status", align: "center" },
              { key: "ip_address", header: "IP Address", align: "left" },
            ]}
            data={logs}
            loading={loading}
            emptyIcon={<ShieldCheck size={28} className="text-slate-200" />}
            emptyMessage="No activity logs found."
            renderCell={(column, log: Log) => {
              if (column.key === "created_at")
                return (
                  <span className="text-slate-600 text-xs font-medium whitespace-nowrap">
                    {fmtDate(log.created_at)}
                  </span>
                );
              if (column.key === "user_name")
                return (
                  <span className="font-medium text-slate-800 text-sm">
                    {log.user_name}
                  </span>
                );
              if (column.key === "action_type")
                return (
                  <Badge color={ACTION_COLORS[log.action_type] ?? "slate"}>
                    {log.action_type}
                  </Badge>
                );
              if (column.key === "module_name")
                return (
                  <span className="text-slate-600 text-sm">
                    {log.module_name}
                  </span>
                );
              if (column.key === "description")
                return (
                  <span className="text-slate-500 text-sm max-w-xs truncate block">
                    {log.description}
                  </span>
                );
              if (column.key === "status")
                return (
                  <Badge color={log.status === "Success" ? "emerald" : "rose"}>
                    {log.status}
                  </Badge>
                );
              if (column.key === "ip_address")
                return (
                  <span className="text-slate-400 text-xs">
                    {log.ip_address || "—"}
                  </span>
                );
              return null;
            }}
          />

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">{totalCount} total records</p>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:bg-gray-50 disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-slate-600 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:bg-gray-50 disabled:opacity-40 transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete by Date Range Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black flex items-center gap-2">
                <Trash2 size={16} className="text-rose-500" />
                Delete Logs by Date Range
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                All activity logs within the selected date range will be{" "}
                <strong className="text-rose-600">permanently deleted</strong>.
                This action cannot be undone.
              </p>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  From Date *
                </label>
                <input
                  type="date"
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 outline-none"
                  value={deleteRange.from}
                  onChange={(e) =>
                    setDeleteRange((r) => ({ ...r, from: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  To Date *
                </label>
                <input
                  type="date"
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-rose-500 outline-none"
                  value={deleteRange.to}
                  onChange={(e) =>
                    setDeleteRange((r) => ({ ...r, to: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!deleteRange.from || !deleteRange.to)
                    return notify("Both dates are required", "error");
                  setShowDeleteConfirm(true);
                }}
                className="px-4 py-2.5 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-all flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={showDeleteConfirm}
        title="Confirm Log Deletion"
        confirmText="Yes, Delete"
        cancelText="Cancel"
        message={
          <span>
            Delete all logs from <strong>{deleteRange.from}</strong> to{" "}
            <strong>{deleteRange.to}</strong>? This is irreversible.
          </span>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {notification && (
        <Toast msg={notification.message} type={notification.type} />
      )}
    </div>
  );
}

export default function ActivityLogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
          <div className="text-slate-400 text-sm">Loading…</div>
        </div>
      }
    >
      <ActivityLogContent />
    </Suspense>
  );
}
