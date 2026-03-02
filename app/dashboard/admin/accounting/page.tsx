"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  BookOpen,
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
        className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl border ${type === "success" ? "bg-emerald-500 border-emerald-400 text-white" : "bg-rose-500 border-rose-400 text-white"}`}
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
type Tx = {
  id: string;
  income_date?: string;
  expense_date?: string;
  amount: number;
  remarks: string;
  account_id: string;
  income_category_id?: string;
  expense_category_id?: string;
  accounts: { id: string; account_name: string };
  income_categories?: { id: string; name: string };
  expense_categories?: { id: string; name: string };
  users: { name: string };
};
type Summary = {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  accountBalances: (Account & {
    current_balance: number;
    income: number;
    expense: number;
  })[];
  incomeByCategory: { name: string; amount: number }[];
  expenseByCategory: { name: string; amount: number }[];
};

// ── shared UI ──────────────────────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)" }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full p-6 relative ${wide ? "max-w-lg" : "max-w-md"}`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IR({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function SubTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon: any }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex space-x-1 bg-slate-100 rounded-lg p-1 mb-5 w-fit">
      {tabs.map(({ key, label, icon: Ic }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center space-x-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-all ${active === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Ic size={12} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

const IC =
  "w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all";
const SC = IC + " bg-white";

// ══════════════════════════════════════════════════════════════════════════
// ACCOUNTS TAB — Table View with Search & Status Filter
// ══════════════════════════════════════════════════════════════════════════
function AccountsTab({
  token,
  notify,
}: {
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const h = { Authorization: `Bearer ${token}` };
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balanceMap, setBalanceMap] = useState<Record<string, number>>({});
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
    const bm: Record<string, number> = {};
    (d2.accountBalances || []).forEach((a: any) => {
      bm[a.id] = a.current_balance;
    });
    setBalanceMap(bm);
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
      {/* Main Card */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Toolbar inside card */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative group">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
              />
              <input
                className="pl-9 pr-4 h-9 bg-white border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400 w-56"
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
          <button
            onClick={openAdd}
            className="flex items-center space-x-1.5 px-4 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Add Account</span>
          </button>
        </div>

        {/* Table */}
        <Table
          columns={[
            { key: "account_name", header: "Account Name", align: "left" },
            {
              key: "opening_balance",
              header: "Opening Balance",
              align: "right",
            },
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
            const bal = balanceMap[a.id] ?? Number(a.opening_balance);
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
                    <p className="font-bold text-slate-800 hover:text-indigo-600 transition-colors underline-offset-2 hover:underline">
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
            if (column.key === "current_balance")
              return (
                <span
                  className={`font-bold ${bal >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {fmt(bal)}
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
                      className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
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
                      className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
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

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Account Name *
                </label>
                <input
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.opening_balance}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, opening_balance: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full min-h-[64px] px-3 py-2 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
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
                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
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
                        setForm((f) => ({ ...f, is_default: e.target.checked }))
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
            {/* Footer */}
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
// CATEGORY MANAGEMENT (Sub-tab) — proper table view
// ══════════════════════════════════════════════════════════════════════════
function CategoryTab({
  type,
  token,
  notify,
}: {
  type: "income" | "expense";
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const h = { Authorization: `Bearer ${token}` };
  const api =
    type === "income"
      ? "/api/accounting/income-categories"
      : "/api/accounting/expense-categories";
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(api, { headers: h });
    const d = await r.json();
    setCats(d.data || []);
    setLoading(false);
  }, [token, type]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", status: "active" });
    setShowModal(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || "",
      status: c.status,
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return notify("Name is required", "error");
    setSaving(true);
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

  const del = async (id: string) => {
    const r = await fetch(`${api}?id=${id}`, { method: "DELETE", headers: h });
    const d = await r.json();
    if (!r.ok) return notify(d.error || "Failed to delete", "error");
    notify("Category deleted!");
    load();
  };

  const catColor = type === "income" ? "#059669" : "#e11d48";

  return (
    <div>
      {/* Main Card */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {cats.length} {type === "income" ? "income" : "expense"} categories
          </p>
          <button
            onClick={openAdd}
            className="flex items-center space-x-1.5 px-4 h-9 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{ backgroundColor: catColor }}
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>
        </div>

        {/* Table */}
        <Table
          columns={[
            { key: "name", header: "Name", align: "left" },
            { key: "description", header: "Description", align: "left" },
            { key: "status", header: "Status", align: "center" },
            { key: "actions", header: "Actions", align: "right" },
          ]}
          data={cats}
          loading={loading}
          emptyIcon={<Tag size={28} className="text-slate-200" />}
          emptyMessage="No categories yet."
          renderCell={(column, c) => {
            if (column.key === "name")
              return (
                <div className="flex items-center space-x-2 py-0.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: catColor }}
                  />
                  <span className="font-semibold text-slate-800">{c.name}</span>
                </div>
              );
            if (column.key === "description")
              return (
                <span className="text-slate-500">{c.description || "—"}</span>
              );
            if (column.key === "status")
              return (
                <Badge
                  color={
                    c.status === "active"
                      ? type === "income"
                        ? "emerald"
                        : "rose"
                      : "slate"
                  }
                >
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
                      onClick={() => setDeleteId(c.id)}
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Name *
                </label>
                <input
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Description
                </label>
                <input
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
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
            {/* Footer */}
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
                className="px-4 py-2.5 text-sm font-medium text-white rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: catColor }}
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
        title="Delete Category"
        confirmText="Delete"
        cancelText="Cancel"
        message={<span>Delete this category? This cannot be undone.</span>}
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
// TRANSACTIONS LIST (Sub-tab Tab 1)
// For Income: standard income transactions
// For Expense: merged view (manual + vendor payments + staff payments)
// ══════════════════════════════════════════════════════════════════════════
const SOURCE_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  manual: { label: "Manual", color: "#475569", bg: "#f1f5f9" },
  vendor_payment: { label: "Vendor Payment", color: "#b45309", bg: "#fef3c7" },
  staff_payment: { label: "Staff Payment", color: "#6d28d9", bg: "#ede9fe" },
};

function TransactionsList({
  type,
  token,
  notify,
}: {
  type: "income" | "expense";
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const isIncome = type === "income";
  // Both modules use merged APIs (manual + auto-generated transactions)
  const apiBase = isIncome
    ? "/api/accounting/income-all"
    : "/api/accounting/expenses-all";
  const manualApiBase = isIncome
    ? "/api/accounting/income"
    : "/api/accounting/expenses";
  const catApi = isIncome
    ? "/api/accounting/income-categories"
    : "/api/accounting/expense-categories";
  const h = { Authorization: `Bearer ${token}` };

  const [txs, setTxs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 15;
  const today = new Date().toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    account_id: "",
    category_id: "",
    date_from: "",
    date_to: "",
    source: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: today,
    account_id: "",
    category_id: "",
    amount: "",
    remarks: "",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { account_id, category_id, date_from, date_to, source } = filters;
    const qp = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (account_id) qp.set("account_id", account_id);
    if (category_id) qp.set("category_id", category_id);
    if (date_from) qp.set("date_from", date_from);
    if (date_to) qp.set("date_to", date_to);
    if (source) qp.set("source", source);

    const [r1, r2, r3] = await Promise.all([
      fetch(`${apiBase}?${qp}`, { headers: h }),
      fetch("/api/accounting/accounts", { headers: h }),
      fetch(catApi, { headers: h }),
    ]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    const d3 = await r3.json();
    setTxs(d1.data || []);
    setTotal(d1.count || 0);
    setAccounts(d2.data || []);
    setCats(d3.data || []);
    if (!form.account_id && d2.data?.length) {
      const def = d2.data.find((a: Account) => a.is_default) || d2.data[0];
      setForm((f) => ({ ...f, account_id: def.id }));
    }
    setLoading(false);
  }, [page, filters, token, type]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openAdd = () => {
    const def = accounts.find((a) => a.is_default) || accounts[0];
    setForm({
      date: today,
      account_id: def?.id || "",
      category_id: "",
      amount: "",
      remarks: "",
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.account_id || !form.category_id || !form.amount || !form.date)
      return notify("All fields are required", "error");
    if (parseFloat(form.amount) <= 0)
      return notify("Amount must be > 0", "error");
    setSaving(true);
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
    const r = await fetch(manualApiBase, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) return notify(d.error || "Failed to save", "error");
    notify("Added!");
    setShowModal(false);
    loadAll();
  };

  const del = async (id: string) => {
    const r = await fetch(`${manualApiBase}/${id}`, {
      method: "DELETE",
      headers: h,
    });
    const d = await r.json();
    if (!r.ok) return notify(d.error || "Failed to delete", "error");
    notify("Deleted!");
    loadAll();
  };

  const totalPages = Math.ceil(total / LIMIT);
  const activeCats = cats.filter((c) => c.status === "active");
  const txColor = isIncome ? "#059669" : "#e11d48";

  // Helper to get display values from merged or standard row
  const getDate = (tx: any) =>
    tx.date || (isIncome ? tx.income_date : tx.expense_date);
  const getAcct = (tx: any) => tx.account || tx.accounts?.account_name || "—";
  const getCat = (tx: any) =>
    tx.category ||
    (isIncome ? tx.income_categories?.name : tx.expense_categories?.name) ||
    "—";
  const getCBy = (tx: any) => tx.created_by || tx.users?.name || "—";
  const getAmt = (tx: any) => Number(tx.amount || 0);
  const getSource = (tx: any): string => tx.source || "manual";
  const canDelete = (tx: any) =>
    tx.deletable !== false &&
    (tx.source === "manual" || tx.source === undefined);
  const getRefName = (tx: any) => tx.ref_name || "";

  return (
    <div>
      {/* Main Card */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Account
              </label>
              <div className="w-[200px]">
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
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Category
              </label>
              <div className="w-[200px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Categories" },
                    ...cats.map((c) => ({ id: c.id, name: c.name })),
                  ]}
                  value={filters.category_id}
                  onChange={(v) => {
                    setFilters((f) => ({ ...f, category_id: v }));
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Source
              </label>
              <div className="w-[170px]">
                <AestheticSelect
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Sources" },
                    { id: "manual", name: "Manual Entry" },
                    ...(isIncome
                      ? [{ id: "vendor_payment", name: "Vendor Payments" }]
                      : [{ id: "staff_payment", name: "Staff Payments" }]),
                  ]}
                  value={filters.source}
                  onChange={(v) => {
                    setFilters((f) => ({ ...f, source: v }));
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                From Date
              </label>
              <input
                type="date"
                className={IC}
                value={filters.date_from}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, date_from: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                To Date
              </label>
              <input
                type="date"
                className={IC}
                value={filters.date_to}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, date_to: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center space-x-1.5 px-4 h-9 text-white rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{ backgroundColor: txColor }}
          >
            <Plus size={14} />
            <span>Add {isIncome ? "Income" : "Expense"}</span>
          </button>
        </div>

        <Table
          columns={[
            { key: "date", header: "Date", align: "left" as const },
            { key: "source", header: "Source", align: "left" as const },
            { key: "account", header: "Account", align: "left" as const },
            {
              key: "category",
              header: "Category / Ref",
              align: "left" as const,
            },
            { key: "remarks", header: "Remarks", align: "left" as const },
            { key: "created_by", header: "Created By", align: "left" as const },
            { key: "amount", header: "Amount", align: "right" as const },
            { key: "actions", header: "Actions", align: "right" as const },
          ]}
          data={txs}
          loading={loading}
          emptyIcon={
            isIncome ? (
              <TrendingUp size={28} className="text-slate-200" />
            ) : (
              <TrendingDown size={28} className="text-slate-200" />
            )
          }
          emptyMessage={`No ${isIncome ? "income" : "expenses"} found.`}
          renderCell={(column, tx) => {
            const src = getSource(tx);
            const srcMeta = SOURCE_LABELS[src] || SOURCE_LABELS.manual;
            const refName = getRefName(tx);
            if (column.key === "date")
              return (
                <span className="text-slate-600 font-medium whitespace-nowrap">
                  {getDate(tx)}
                </span>
              );
            if (column.key === "source")
              return (
                <Badge
                  color={
                    src === "vendor_payment"
                      ? "amber"
                      : src === "staff_payment"
                        ? "purple"
                        : "slate"
                  }
                >
                  {srcMeta.label}
                </Badge>
              );
            if (column.key === "account")
              return <span className="text-slate-700">{getAcct(tx)}</span>;
            if (column.key === "category")
              return (
                <div>
                  <Badge color={isIncome ? "emerald" : "rose"}>
                    {getCat(tx)}
                  </Badge>
                  {refName && (
                    <p className="text-[10px] text-slate-400 mt-0.5 ml-1">
                      {refName}
                    </p>
                  )}
                </div>
              );
            if (column.key === "remarks")
              return (
                <span className="text-slate-500 max-w-[120px] truncate block">
                  {tx.remarks || "—"}
                </span>
              );
            if (column.key === "created_by")
              return (
                <span className="text-slate-500 text-xs">{getCBy(tx)}</span>
              );
            if (column.key === "amount")
              return (
                <span className="font-bold" style={{ color: txColor }}>
                  {fmt(getAmt(tx))}
                </span>
              );
            if (column.key === "actions")
              return (
                <div className="flex items-center justify-end space-x-1">
                  {canDelete(tx) ? (
                    <Tooltip text="Delete">
                      <button
                        onClick={() => setDeleteId(tx.id)}
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
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">{total} total records</p>
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

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">
                Add {isIncome ? "Income" : "Expense"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Date *
                </label>
                <input
                  type="date"
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
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
                  className="w-full min-h-[72px] px-3 py-2 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  value={form.remarks}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, remarks: e.target.value }))
                  }
                  placeholder="Optional notes…"
                />
              </div>
            </div>
            {/* Footer */}
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
                className="px-4 py-2.5 text-sm font-medium text-white rounded-md transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ backgroundColor: txColor }}
              >
                {saving && <RefreshCw size={14} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleteId}
        title="Delete Transaction"
        confirmText="Delete"
        cancelText="Cancel"
        message={<span>Delete this transaction? This cannot be undone.</span>}
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
// INCOME MODULE — 2 sub-tabs: Incomes + Income Category
// ══════════════════════════════════════════════════════════════════════════
function IncomeModule({
  token,
  notify,
}: {
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const [sub, setSub] = useState("transactions");
  return (
    <div>
      <SubTabs
        tabs={[
          { key: "transactions", label: "Incomes", icon: List },
          { key: "categories", label: "Income Category", icon: Tag },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "transactions" && (
        <TransactionsList type="income" token={token} notify={notify} />
      )}
      {sub === "categories" && (
        <CategoryTab type="income" token={token} notify={notify} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EXPENSE MODULE — 2 sub-tabs: Expenses + Expense Category
// ══════════════════════════════════════════════════════════════════════════
function ExpenseModule({
  token,
  notify,
}: {
  token: string;
  notify: (m: string, t?: "success" | "error") => void;
}) {
  const [sub, setSub] = useState("transactions");
  return (
    <div>
      <SubTabs
        tabs={[
          { key: "transactions", label: "Expenses", icon: List },
          { key: "categories", label: "Expense Category", icon: Tag },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "transactions" && (
        <TransactionsList type="expense" token={token} notify={notify} />
      )}
      {sub === "categories" && (
        <CategoryTab type="expense" token={token} notify={notify} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LEDGER / REPORTS
// ══════════════════════════════════════════════════════════════════════════
function ReportsModule({ token }: { token: string }) {
  const h = { Authorization: `Bearer ${token}` };
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    account_id: "",
    date_from: "",
    date_to: "",
  });
  const [accounts, setAccounts] = useState<Account[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const qp = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    );
    const [r1, r2] = await Promise.all([
      fetch(`/api/accounting/summary?${qp}`, { headers: h }),
      fetch("/api/accounting/accounts", { headers: h }),
    ]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    setSummary(d1);
    setAccounts(d2.data || []);
    setLoading(false);
  }, [filters, token]);

  useEffect(() => {
    load();
  }, [load]);

  const StatCard = ({
    label,
    amount,
    color,
    icon: Ic,
  }: {
    label: string;
    amount: number;
    color: string;
    icon: any;
  }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          <Ic size={16} style={{ color }} />
        </div>
      </div>
      <p
        className="text-2xl font-black"
        style={{ color: amount < 0 ? "#e11d48" : color }}
      >
        {fmt(Math.abs(amount))}
      </p>
      {amount < 0 && <p className="text-xs text-rose-500 mt-0.5">Net Loss</p>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Filters Card */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                Account
              </label>
              <div className="w-[200px]">
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
                  onChange={(v) => setFilters((f) => ({ ...f, account_id: v }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                From Date
              </label>
              <input
                type="date"
                className={IC + " w-36"}
                value={filters.date_from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_from: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">
                To Date
              </label>
              <input
                type="date"
                className={IC + " w-36"}
                value={filters.date_to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, date_to: e.target.value }))
                }
              />
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center space-x-1.5 px-4 h-9 border border-gray-300 rounded-lg text-slate-600 hover:bg-gray-50 text-sm font-medium transition-all whitespace-nowrap"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        summary && (
          <>
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Total Income"
                amount={summary.totalIncome}
                color="#059669"
                icon={TrendingUp}
              />
              <StatCard
                label="Total Expense"
                amount={summary.totalExpense}
                color="#e11d48"
                icon={TrendingDown}
              />
              <StatCard
                label="Net Profit / Loss"
                amount={summary.netProfit}
                color={summary.netProfit >= 0 ? "#4f46e5" : "#e11d48"}
                icon={BarChart3}
              />
            </div>

            {/* Account Ledger */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Account Ledger
                </h3>
              </div>
              <Table
                columns={[
                  { key: "account", header: "Account", align: "left" },
                  { key: "opening", header: "Opening Balance", align: "right" },
                  { key: "income", header: "Total Income", align: "right" },
                  { key: "expense", header: "Total Expense", align: "right" },
                  { key: "closing", header: "Closing Balance", align: "right" },
                ]}
                data={summary.accountBalances}
                loading={false}
                onRowClick={(a) =>
                  router.push(`/dashboard/admin/accounting/accounts/${a.id}`)
                }
                emptyIcon={<Wallet size={28} className="text-slate-200" />}
                emptyMessage="No account data."
                renderCell={(column, a) => {
                  if (column.key === "account")
                    return (
                      <div className="flex items-center space-x-2 py-0.5">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Wallet size={14} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {a.account_name}
                          </p>
                          {a.is_default && (
                            <Badge color="amber" icon={Star}>
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  if (column.key === "opening")
                    return (
                      <span className="text-slate-600 font-medium">
                        {fmt(a.opening_balance)}
                      </span>
                    );
                  if (column.key === "income")
                    return (
                      <span className="text-emerald-600 font-semibold">
                        +{fmt(a.income)}
                      </span>
                    );
                  if (column.key === "expense")
                    return (
                      <span className="text-rose-600 font-semibold">
                        -{fmt(a.expense)}
                      </span>
                    );
                  if (column.key === "closing")
                    return (
                      <span
                        className={`font-black text-base ${
                          a.current_balance >= 0
                            ? "text-indigo-600"
                            : "text-rose-600"
                        }`}
                      >
                        {fmt(a.current_balance)}
                      </span>
                    );
                  return null;
                }}
              />
            </div>

            {/* Category Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Income Summary */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center space-x-2">
                  <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <TrendingUp size={14} className="text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Income Summary by Category
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  {summary.incomeByCategory.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No income data.
                    </p>
                  ) : (
                    summary.incomeByCategory.map((c, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700">
                            {c.name}
                          </span>
                          <span className="text-sm font-bold text-emerald-600">
                            {fmt(c.amount)}
                          </span>
                        </div>
                        <div className="bg-emerald-50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (c.amount / (summary.totalIncome || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Expense Summary */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center space-x-2">
                  <div className="w-7 h-7 bg-rose-50 rounded-lg flex items-center justify-center">
                    <TrendingDown size={14} className="text-rose-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Expense Summary by Category
                  </h3>
                </div>
                <div className="p-5 space-y-4">
                  {summary.expenseByCategory.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                      No expense data.
                    </p>
                  ) : (
                    summary.expenseByCategory.map((c, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700">
                            {c.name}
                          </span>
                          <span className="text-sm font-bold text-rose-600">
                            {fmt(c.amount)}
                          </span>
                        </div>
                        <div className="bg-rose-50 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (c.amount / (summary.totalExpense || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — section driven by ?section= URL param (sidebar navigation)
// ══════════════════════════════════════════════════════════════════════════
function AccountingContent() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "accounts";
  const [token, setToken] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const notify = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const sectionMeta: Record<string, { label: string; desc: string }> = {
    accounts: {
      label: "Account",
      desc: "Manage your financial accounts",
    },
    income: {
      label: "Income",
      desc: "Track income transactions & categories",
    },
    expense: {
      label: "Expense",
      desc: "Track expense transactions & categories",
    },
    reports: {
      label: "Ledger / Reports",
      desc: "Account ledger, summaries & financial reports",
    },
  };
  const meta = sectionMeta[section] || sectionMeta.accounts;

  return (
    <div className="min-h-screen bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-5 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">{meta.label}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{meta.desc}</p>
          </div>
        </div>

        {/* Content — sidebar drives section */}
        {token ? (
          <div>
            {section === "accounts" && (
              <AccountsTab token={token} notify={notify} />
            )}
            {section === "income" && (
              <IncomeModule token={token} notify={notify} />
            )}
            {section === "expense" && (
              <ExpenseModule token={token} notify={notify} />
            )}
            {section === "reports" && <ReportsModule token={token} />}
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
