"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Tag,
  List,
} from "lucide-react";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import Table from "@/components/Table";
import Tooltip from "@/components/Tooltip";
import AestheticSelect from "@/components/AestheticSelect";
import Badge from "@/components/Badge";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

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

// ── types ──────────────────────────────────────────────────────────────────
type Account = {
  id: string;
  account_name: string;
  opening_balance: number;
  notes: string;
  is_default: boolean;
  status: string;
};
type Category = {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
};
type Entry = {
  id: string;
  date: string;
  amount: number;
  entryType: "income" | "expense";
  account: string;
  account_id: string;
  category: string;
  category_id: string;
  remarks: string;
  source: string;
  canDelete: boolean;
  ref_name?: string;
  created_by?: string;
};
type MergedCategory = Category & { type: "income" | "expense" };

const IC =
  "w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all";

// ── Tab Bar (3 top-level tabs) ─────────────────────────────────────────────
function TabBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (t: string) => void;
}) {
  const tabs = [
    { key: "entries", label: "Entries", icon: List },
    { key: "account", label: "Account", icon: Wallet },
    { key: "categories", label: "Categories", icon: Tag },
  ];
  return (
    <div className="flex space-x-0 border-b border-gray-200 mb-5 bg-white px-4 rounded-t-lg">
      {tabs.map(({ key, label, icon: Ic }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center space-x-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px ${
            active === key
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Ic size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ENTRIES TAB — Unified Income + Expense list
// ══════════════════════════════════════════════════════════════════════════
function EntriesTab({
  token,
  notify,
  openTrigger,
}: {
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
  openTrigger?: { type: "income" | "expense"; ts: number } | null;
}) {
  const h = { Authorization: `Bearer ${token}` };
  const today = new Date().toISOString().slice(0, 10);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const [filters, setFilters] = useState({
    search: "",
    entryType: "all",
    account_id: "",
    category_id: "",
    date_from: "",
    date_to: "",
  });

  // modal state
  const [showModal, setShowModal] = useState<"income" | "expense" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "income" | "expense";
  } | null>(null);
  const [form, setForm] = useState({
    date: today,
    account_id: "",
    category_id: "",
    amount: "",
    remarks: "",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { account_id, date_from, date_to } = filters;
    const qp = new URLSearchParams({ limit: "200" });
    if (account_id) qp.set("account_id", account_id);
    if (date_from) qp.set("date_from", date_from);
    if (date_to) qp.set("date_to", date_to);

    const [r1, r2, r3, r4, r5] = await Promise.all([
      fetch(`/api/accounting/income-all?${qp}`, { headers: h }),
      fetch(`/api/accounting/expenses-all?${qp}`, { headers: h }),
      fetch("/api/accounting/accounts", { headers: h }),
      fetch("/api/accounting/income-categories", { headers: h }),
      fetch("/api/accounting/expense-categories", { headers: h }),
    ]);
    const [d1, d2, d3, d4, d5] = await Promise.all([
      r1.json(),
      r2.json(),
      r3.json(),
      r4.json(),
      r5.json(),
    ]);

    const incomeItems: Entry[] = (d1.data || []).map((tx: any) => ({
      id: tx.id,
      date: tx.date || tx.income_date || "",
      amount: Number(tx.amount || 0),
      entryType: "income" as const,
      account: tx.account || tx.accounts?.account_name || "—",
      account_id: tx.account_id || "",
      category: tx.category || tx.income_categories?.name || "—",
      category_id: tx.income_category_id || "",
      remarks: tx.remarks || "",
      source: tx.source || "manual",
      canDelete:
        tx.deletable !== false && (!tx.source || tx.source === "manual"),
      ref_name: tx.ref_name || "",
      created_by: tx.created_by || tx.users?.name || "",
    }));

    const expenseItems: Entry[] = (d2.data || []).map((tx: any) => ({
      id: tx.id,
      date: tx.date || tx.expense_date || "",
      amount: Number(tx.amount || 0),
      entryType: "expense" as const,
      account: tx.account || tx.accounts?.account_name || "—",
      account_id: tx.account_id || "",
      category: tx.category || tx.expense_categories?.name || "—",
      category_id: tx.expense_category_id || "",
      remarks: tx.remarks || "",
      source: tx.source || "manual",
      canDelete:
        tx.deletable !== false && (!tx.source || tx.source === "manual"),
      ref_name: tx.ref_name || "",
      created_by: tx.created_by || tx.users?.name || "",
    }));

    const combined = [...incomeItems, ...expenseItems].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    setEntries(combined);
    setAccounts(d3.data || []);
    setIncomeCategories(d4.data || []);
    setExpenseCategories(d5.data || []);
    if (!form.account_id && d3.data?.length) {
      const def = d3.data.find((a: Account) => a.is_default) || d3.data[0];
      setForm((f) => ({ ...f, account_id: def.id }));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters.account_id, filters.date_from, filters.date_to]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // client-side filter by type, search, category
  const filtered = entries.filter((e) => {
    if (filters.entryType !== "all" && e.entryType !== filters.entryType)
      return false;
    if (
      filters.search &&
      !e.remarks.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    if (filters.category_id && e.category_id !== filters.category_id)
      return false;
    return true;
  });

  // Summary
  const totalIncome = filtered
    .filter((e) => e.entryType === "income")
    .reduce((s, e) => s + e.amount, 0);
  const totalExpense = filtered
    .filter((e) => e.entryType === "expense")
    .reduce((s, e) => s + e.amount, 0);
  const netAmount = totalIncome - totalExpense;
  const totalCount = filtered.length;

  // Client pagination
  const totalPages = Math.ceil(filtered.length / LIMIT);
  const paged = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  // Reset page when local filters change
  useEffect(() => {
    setPage(1);
  }, [filters.entryType, filters.search, filters.category_id]);

  const openAdd = (type: "income" | "expense") => {
    const def = accounts.find((a) => a.is_default) || accounts[0];
    setForm({
      date: today,
      account_id: def?.id || "",
      category_id: "",
      amount: "",
      remarks: "",
    });
    setShowModal(type);
  };

  useEffect(() => {
    if (openTrigger) openAdd(openTrigger.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTrigger]);

  const save = async () => {
    if (!form.account_id || !form.category_id || !form.amount || !form.date)
      return notify("All fields are required", "error");
    if (parseFloat(form.amount) <= 0)
      return notify("Amount must be > 0", "error");
    setSaving(true);
    const isIncome = showModal === "income";
    const body = isIncome
      ? {
          income_date: form.date,
          account_id: form.account_id,
          income_category_id: form.category_id,
          amount: parseFloat(form.amount),
          remarks: form.remarks,
        }
      : {
          expense_date: form.date,
          account_id: form.account_id,
          expense_category_id: form.category_id,
          amount: parseFloat(form.amount),
          remarks: form.remarks,
        };
    const url = isIncome
      ? "/api/accounting/income"
      : "/api/accounting/expenses";
    const r = await fetch(url, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) return notify(d.error || "Failed to save", "error");
    notify("Entry added!");
    setShowModal(null);
    loadAll();
  };

  const del = async () => {
    if (!deleteTarget) return;
    const url =
      deleteTarget.type === "income"
        ? `/api/accounting/income/${deleteTarget.id}`
        : `/api/accounting/expenses/${deleteTarget.id}`;
    const r = await fetch(url, { method: "DELETE", headers: h });
    const d = await r.json();
    if (!r.ok) return notify(d.error || "Failed to delete", "error");
    notify("Entry deleted!");
    setDeleteTarget(null);
    loadAll();
  };

  const activeCats =
    showModal === "income"
      ? incomeCategories.filter((c) => c.status === "active")
      : expenseCategories.filter((c) => c.status === "active");

  // Category options for filter based on selected entry type
  const filterCats =
    filters.entryType === "income"
      ? incomeCategories
      : filters.entryType === "expense"
        ? expenseCategories
        : [...incomeCategories, ...expenseCategories];

  const resetFilters = () => {
    setFilters({
      search: "",
      entryType: "all",
      account_id: "",
      category_id: "",
      date_from: "",
      date_to: "",
    });
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Income",
            value: totalIncome,
            color: "#059669",
            bg: "#f0fdf4",
            Icon: TrendingUp,
            isCount: false,
          },
          {
            label: "Total Expense",
            value: totalExpense,
            color: "#e11d48",
            bg: "#fff1f2",
            Icon: TrendingDown,
            isCount: false,
          },
          {
            label: "Net Amount",
            value: netAmount,
            color: netAmount >= 0 ? "#4f46e5" : "#e11d48",
            bg: "#eef2ff",
            Icon: BarChart3,
            isCount: false,
          },
          {
            label: "Transactions",
            value: totalCount,
            color: "#0891b2",
            bg: "#ecfeff",
            Icon: List,
            isCount: true,
          },
        ].map(({ label, value, color, bg, Icon, isCount }) => (
          <div
            key={label}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: bg }}
              >
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            {isCount ? (
              <p className="text-2xl font-black" style={{ color }}>
                {value}
              </p>
            ) : (
              <p
                className="text-xl font-black"
                style={{ color: value < 0 ? "#e11d48" : color }}
              >
                {value < 0 ? "-" : ""}
                {fmt(Math.abs(value))}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Action & Filter Bar + Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-1">
            {/* Search by Remarks */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Search Remarks
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  className="pl-8 pr-3 h-9 w-44 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Search remarks…"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                From
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
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                To
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

            {/* Entry Type Filter */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Type
              </label>
              <div className="w-[140px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "all", name: "All Types" },
                    { id: "income", name: "Income" },
                    { id: "expense", name: "Expense" },
                  ]}
                  value={filters.entryType}
                  onChange={(v) => {
                    setFilters((f) => ({
                      ...f,
                      entryType: v,
                      category_id: "",
                    }));
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Account Filter */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Account
              </label>
              <div className="w-[180px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Accounts" },
                    ...accounts.map((a) => ({
                      id: a.id,
                      name: a.account_name,
                    })),
                  ]}
                  value={filters.account_id}
                  onChange={(v) => {
                    setFilters((f) => ({ ...f, account_id: v }));
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Category
              </label>
              <div className="w-[180px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Categories" },
                    ...filterCats.map((c) => ({ id: c.id, name: c.name })),
                  ]}
                  value={filters.category_id}
                  onChange={(v) => {
                    setFilters((f) => ({ ...f, category_id: v }));
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
        </div>

        {/* Entries Table */}
        <Table
          columns={[
            { key: "date", header: "Date", align: "left" },
            { key: "type", header: "Type", align: "left" },
            { key: "account", header: "Account", align: "left" },
            { key: "category", header: "Category", align: "left" },
            { key: "amount", header: "Amount", align: "left" },
            { key: "remarks", header: "Remarks", align: "left" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          data={paged}
          loading={loading}
          emptyIcon={<List size={28} className="text-slate-200" />}
          emptyMessage="No entries found."
          renderCell={(column, e: Entry) => {
            if (column.key === "date")
              return (
                <span className="text-slate-600 font-medium whitespace-nowrap">
                  {e.date ? e.date.split("-").reverse().join("-") : "—"}
                </span>
              );
            if (column.key === "type")
              return (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    e.entryType === "income"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {e.entryType === "income" ? (
                    <TrendingUp size={10} />
                  ) : (
                    <TrendingDown size={10} />
                  )}
                  {e.entryType === "income" ? "Income" : "Expense"}
                </span>
              );
            if (column.key === "account")
              return <span className="text-slate-700">{e.account}</span>;
            if (column.key === "category")
              return (
                <div>
                  <Badge color={e.entryType === "income" ? "blue" : "amber"}>
                    {e.category}
                  </Badge>
                  {e.ref_name && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {e.ref_name}
                    </p>
                  )}
                </div>
              );
            if (column.key === "amount")
              return (
                <span
                  className={`font-bold ${
                    e.entryType === "income"
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {e.entryType === "income" ? "" : ""}
                  {fmt(e.amount)}
                </span>
              );
            if (column.key === "remarks")
              return (
                <span className="text-slate-500 max-w-[140px] truncate block">
                  {e.remarks || "—"}
                </span>
              );
            if (column.key === "actions")
              return (
                <div className="flex items-center justify-end">
                  {e.canDelete ? (
                    <Tooltip text="Delete">
                      <button
                        onClick={() =>
                          setDeleteTarget({ id: e.id, type: e.entryType })
                        }
                        className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </Tooltip>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic pr-1">
                      Linked
                    </span>
                  )}
                </div>
              );
            return null;
          }}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {filtered.length} total entries
            </p>
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
          </div>
        )}
      </div>

      {/* Add Income / Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">
                Add {showModal === "income" ? "Income" : "Expense"}
              </h2>
              <button
                onClick={() => setShowModal(null)}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Date *
                </label>
                <input
                  type="date"
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Account *
                </label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.account_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, account_id: e.target.value }))
                  }
                >
                  <option value="">Select account…</option>
                  {accounts
                    .filter((a) => a.status === "active")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Category *
                </label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.category_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category_id: e.target.value }))
                  }
                >
                  <option value="">Select category…</option>
                  {activeCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Remarks
                </label>
                <textarea
                  className="w-full min-h-[72px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  placeholder="Optional notes…"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(null)}
                className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={`px-4 py-2.5 text-sm font-medium text-white rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 ${
                  showModal === "income"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete Entry"
        confirmText="Delete"
        cancelText="Cancel"
        message={<span>Delete this entry? This cannot be undone.</span>}
        onConfirm={del}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ACCOUNT TAB — Account list with Opening Balance, Total In, Total Out,
//               Current Balance, Status, Actions
// ══════════════════════════════════════════════════════════════════════════
function AccountTab({
  token,
  notify,
  openTrigger,
}: {
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
  openTrigger?: number;
}) {
  const h = { Authorization: `Bearer ${token}` };
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountStats, setAccountStats] = useState<
    Record<string, { income: number; expense: number; current_balance: number }>
  >({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    account_name: "",
    opening_balance: "0",
    notes: "",
    is_default: false,
    status: "active",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch("/api/accounting/accounts", { headers: h }),
      fetch("/api/accounting/summary", { headers: h }),
    ]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    setAccounts(d1.data || []);
    const stats: Record<
      string,
      { income: number; expense: number; current_balance: number }
    > = {};
    (d2.accountBalances || []).forEach((a: any) => {
      stats[a.id] = {
        income: a.income || 0,
        expense: a.expense || 0,
        current_balance: a.current_balance || 0,
      };
    });
    setAccountStats(stats);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      account_name: "",
      opening_balance: "0",
      notes: "",
      is_default: false,
      status: "active",
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (openTrigger) openAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTrigger]);

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      account_name: a.account_name,
      opening_balance: String(a.opening_balance),
      notes: a.notes || "",
      is_default: a.is_default,
      status: a.status,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.account_name.trim())
      return notify("Account name is required", "error");
    setSaving(true);
    const body = {
      ...form,
      opening_balance: parseFloat(form.opening_balance) || 0,
    };
    const url = editing
      ? `/api/accounting/accounts/${editing.id}`
      : "/api/accounting/accounts";
    const r = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) return notify(d.error || "Failed to save", "error");
    notify(editing ? "Account updated!" : "Account created!");
    setShowModal(false);
    load();
  };

  const del = async (id: string) => {
    const r = await fetch(`/api/accounting/accounts/${id}`, {
      method: "DELETE",
      headers: h,
    });
    const d = await r.json();
    if (!r.ok) return notify(d.error || "Failed to delete", "error");
    notify("Account deleted!");
    load();
  };

  const filtered = accounts.filter((a) => {
    const matchSearch = a.account_name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="pl-9 pr-4 h-9 bg-white border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-gray-400 w-56"
                placeholder="Search accounts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[140px]">
              <AestheticSelect
                heightClass="h-9"
                textSize="xs"
                options={[
                  { id: "all", name: "All Status" },
                  { id: "active", name: "Active" },
                  { id: "inactive", name: "Inactive" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <Table
          columns={[
            { key: "account_name", header: "Account Name", align: "left" },
            {
              key: "opening_balance",
              header: "Opening Balance",
              align: "right",
            },
            { key: "total_in", header: "Total In", align: "right" },
            { key: "total_out", header: "Total Out", align: "right" },
            {
              key: "current_balance",
              header: "Current Balance",
              align: "right",
            },
            { key: "status", header: "Status", align: "center" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          data={filtered}
          loading={loading}
          emptyIcon={<Wallet size={28} className="text-slate-200" />}
          emptyMessage="No accounts found"
          onRowClick={(a) =>
            router.push(`/dashboard/admin/accounting/accounts/${a.id}`)
          }
          renderCell={(column, a) => {
            const stats = accountStats[a.id] || {
              income: 0,
              expense: 0,
              current_balance: Number(a.opening_balance),
            };
            if (column.key === "account_name")
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/admin/accounting/accounts/${a.id}`);
                  }}
                  className="flex items-center space-x-3 py-1 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wallet size={14} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 hover:text-indigo-600 transition-colors hover:underline underline-offset-2">
                      {a.account_name}
                    </p>
                    {a.is_default && (
                      <Badge color="amber" icon={Star}>
                        Default
                      </Badge>
                    )}
                  </div>
                </button>
              );
            if (column.key === "opening_balance")
              return (
                <span className="text-slate-600 font-medium">
                  {fmt(a.opening_balance)}
                </span>
              );
            if (column.key === "total_in")
              return (
                <span className="text-emerald-600 font-semibold">
                  +{fmt(stats.income)}
                </span>
              );
            if (column.key === "total_out")
              return (
                <span className="text-rose-600 font-semibold">
                  -{fmt(stats.expense)}
                </span>
              );
            if (column.key === "current_balance")
              return (
                <span
                  className={`font-bold ${
                    stats.current_balance >= 0
                      ? "text-indigo-600"
                      : "text-rose-600"
                  }`}
                >
                  {fmt(stats.current_balance)}
                </span>
              );
            if (column.key === "status")
              return (
                <Badge color={a.status === "active" ? "emerald" : "slate"}>
                  {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                </Badge>
              );
            if (column.key === "actions")
              return (
                <div className="flex items-center justify-end space-x-1.5">
                  <Tooltip text="Edit">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(a);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                    >
                      <Edit2 size={13} />
                    </button>
                  </Tooltip>
                  <Tooltip text="Delete">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(a.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>
                </div>
              );
            return null;
          }}
        />
      </div>

      {/* Add / Edit Account Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">
                {editing ? "Edit Account" : "New Account"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Account Name *
                </label>
                <input
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.account_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, account_name: e.target.value }))
                  }
                  placeholder="e.g. Cash, HDFC Bank"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.opening_balance}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      opening_balance: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full min-h-[64px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Any additional details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1 block">
                    Status
                  </label>
                  <select
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          is_default: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      Set as Default
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md transition-all flex items-center gap-2"
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {editing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteId}
        title="Delete Account"
        confirmText="Delete"
        cancelText="Cancel"
        message={<span>Are you sure you want to delete this account?</span>}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB — Merged Income + Expense categories with Type column
// ══════════════════════════════════════════════════════════════════════════
function CategoriesTab({
  token,
  notify,
  openTrigger,
}: {
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
  openTrigger?: number;
}) {
  const h = { Authorization: `Bearer ${token}` };
  const [categories, setCategories] = useState<MergedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MergedCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MergedCategory | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "income",
    status: "active",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch("/api/accounting/income-categories", { headers: h }),
      fetch("/api/accounting/expense-categories", { headers: h }),
    ]);
    const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
    const incCats: MergedCategory[] = (d1.data || []).map((c: Category) => ({
      ...c,
      type: "income" as const,
    }));
    const expCats: MergedCategory[] = (d2.data || []).map((c: Category) => ({
      ...c,
      type: "expense" as const,
    }));
    setCategories(
      [...incCats, ...expCats].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setLoading(false);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", type: "income", status: "active" });
    setShowModal(true);
  };

  useEffect(() => {
    if (openTrigger) openAdd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTrigger]);
  const openEdit = (c: MergedCategory) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || "",
      type: c.type,
      status: c.status,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return notify("Name is required", "error");
    setSaving(true);
    const api =
      form.type === "income"
        ? "/api/accounting/income-categories"
        : "/api/accounting/expense-categories";
    const body = editing ? { ...form, id: editing.id } : form;
    const r = await fetch(api, {
      method: editing ? "PUT" : "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) return notify(d.error || "Failed to save", "error");
    notify(editing ? "Category updated!" : "Category added!");
    setShowModal(false);
    load();
  };

  const del = async (cat: MergedCategory) => {
    const api =
      cat.type === "income"
        ? "/api/accounting/income-categories"
        : "/api/accounting/expense-categories";
    const r = await fetch(`${api}?id=${cat.id}`, {
      method: "DELETE",
      headers: h,
    });
    const d = await r.json();
    if (!r.ok) return notify(d.error || "Failed to delete", "error");
    notify("Category deleted!");
    load();
  };

  const filtered = categories.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="pl-8 pr-3 h-9 w-48 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="Search categories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-[150px]">
              <AestheticSelect
                heightClass="h-9"
                textSize="xs"
                options={[
                  { id: "all", name: "All Types" },
                  { id: "income", name: "Income" },
                  { id: "expense", name: "Expense" },
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            </div>
            <div className="w-[140px]">
              <AestheticSelect
                heightClass="h-9"
                textSize="xs"
                options={[
                  { id: "all", name: "All Status" },
                  { id: "active", name: "Active" },
                  { id: "inactive", name: "Inactive" },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>
        </div>

        {/* Categories Table */}
        <Table
          columns={[
            { key: "name", header: "Category Name", align: "left" },
            { key: "type", header: "Type", align: "left" },
            { key: "status", header: "Status", align: "center" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          data={filtered}
          loading={loading}
          emptyIcon={<Tag size={28} className="text-slate-200" />}
          emptyMessage="No categories found."
          renderCell={(column, c: MergedCategory) => {
            if (column.key === "name")
              return (
                <div className="flex items-center space-x-2 py-0.5">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      c.type === "income" ? "bg-blue-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="font-semibold text-slate-800">{c.name}</span>
                  {c.description && (
                    <span className="text-xs text-slate-400">
                      — {c.description}
                    </span>
                  )}
                </div>
              );
            if (column.key === "type")
              return (
                <Badge color={c.type === "income" ? "emerald" : "rose"}>
                  {c.type === "income" ? "Income" : "Expense"}
                </Badge>
              );
            if (column.key === "status")
              return (
                <Badge color={c.status === "active" ? "emerald" : "slate"}>
                  {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                </Badge>
              );
            if (column.key === "actions")
              return (
                <div className="flex items-center justify-end space-x-1">
                  <Tooltip text="Edit">
                    <button
                      onClick={() => openEdit(c)}
                      className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                    >
                      <Edit2 size={13} />
                    </button>
                  </Tooltip>
                  <Tooltip text="Delete">
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>
                </div>
              );
            return null;
          }}
        />
      </div>

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">
                {editing ? "Edit Category" : "Add Category"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Category Name *
                </label>
                <input
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Category Type *
                </label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  disabled={!!editing}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                {editing && (
                  <p className="text-xs text-slate-400 mt-1">
                    Category type cannot be changed after creation.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Description (Optional)
                </label>
                <input
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Status
                </label>
                <select
                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md transition-all flex items-center gap-2"
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {editing ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteTarget}
        title="Delete Category"
        confirmText="Delete"
        cancelText="Cancel"
        message={<span>Delete this category? This cannot be undone.</span>}
        onConfirm={() => {
          if (deleteTarget) del(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — 3-tab layout: Entries | Account | Categories
// ══════════════════════════════════════════════════════════════════════════
function AccountingContent() {
  const [tab, setTab] = useState("entries");
  const [token, setToken] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [entriesAdd, setEntriesAdd] = useState<{
    type: "income" | "expense";
    ts: number;
  } | null>(null);
  const [accountAdd, setAccountAdd] = useState(0);
  const [categoryAdd, setCategoryAdd] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const notify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-5 px-2">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black">Accounting</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage entries, accounts &amp; categories
              </p>
            </div>
          </div>
          {/* Tab-aware action buttons */}
          <div className="flex items-center space-x-2">
            {tab === "entries" && (
              <>
                <button
                  onClick={() =>
                    setEntriesAdd({ type: "income", ts: Date.now() })
                  }
                  className="flex items-center space-x-1.5 px-4 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Add Income</span>
                </button>
                <button
                  onClick={() =>
                    setEntriesAdd({ type: "expense", ts: Date.now() })
                  }
                  className="flex items-center space-x-1.5 px-4 h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Add Expense</span>
                </button>
              </>
            )}
            {tab === "account" && (
              <button
                onClick={() => setAccountAdd((n) => n + 1)}
                className="flex items-center space-x-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              >
                <Plus size={14} />
                <span>Add Account</span>
              </button>
            )}
            {tab === "categories" && (
              <button
                onClick={() => setCategoryAdd((n) => n + 1)}
                className="flex items-center space-x-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
              >
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            )}
          </div>
        </div>

        {token ? (
          <div>
            {/* Tab Bar */}
            <TabBar active={tab} onChange={setTab} />

            {/* Tab Content */}
            {tab === "entries" && (
              <EntriesTab
                token={token}
                notify={notify}
                openTrigger={entriesAdd}
              />
            )}
            {tab === "account" && (
              <AccountTab
                token={token}
                notify={notify}
                openTrigger={accountAdd}
              />
            )}
            {tab === "categories" && (
              <CategoriesTab
                token={token}
                notify={notify}
                openTrigger={categoryAdd}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 text-sm">
            Loading session…
          </div>
        )}
      </div>
      {notification && (
        <Toast msg={notification.message} type={notification.type} />
      )}
    </div>
  );
}

export default function AccountingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
          <div className="text-slate-400 text-sm">Loading…</div>
        </div>
      }
    >
      <AccountingContent />
    </Suspense>
  );
}
