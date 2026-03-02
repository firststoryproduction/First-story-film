"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Table from "@/components/Table";
import Badge from "@/components/Badge";
import AestheticSelect from "@/components/AestheticSelect";

// ── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const SOURCE_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  manual: { label: "Manual", color: "#475569", bg: "#f1f5f9" },
  vendor_payment: { label: "Vendor Payment", color: "#b45309", bg: "#fef3c7" },
  staff_payment: { label: "Staff Payment", color: "#6d28d9", bg: "#ede9fe" },
};

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
    <div className="flex space-x-1 bg-slate-100 rounded-lg p-1 w-fit flex-shrink-0">
      {tabs.map(({ key, label, icon: Ic }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center space-x-1.5 px-3 h-8 rounded-md text-xs font-semibold transition-all ${
            active === key
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Ic size={12} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function AccountDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [token, setToken] = useState("");
  const [account, setAccount] = useState<any>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const [tab, setTab] = useState<"in" | "out">("in");
  const [txs, setTxs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  // Filters
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    category_id: "",
    source: "",
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  // Get session token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  // Fetch account info + balance
  const loadAccount = useCallback(async () => {
    if (!token || !id) return;
    setLoadingAccount(true);
    const h = { Authorization: `Bearer ${token}` };
    const [r1, r2] = await Promise.all([
      fetch(`/api/accounting/accounts/${id}`, { headers: h }),
      fetch("/api/accounting/summary", { headers: h }),
    ]);
    const d1 = await r1.json();
    const d2 = await r2.json();
    setAccount(d1.data || null);
    const bal = (d2.accountBalances || []).find((a: any) => a.id === id);
    setCurrentBalance(bal?.current_balance ?? d1.data?.opening_balance ?? 0);
    setLoadingAccount(false);
  }, [token, id]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  // Reset page when tab or filters change
  useEffect(() => {
    setPage(1);
  }, [tab, filters]);

  // Load categories for current tab
  const loadCategories = useCallback(async () => {
    if (!token) return;
    const api =
      tab === "in"
        ? "/api/accounting/income-categories"
        : "/api/accounting/expense-categories";
    const r = await fetch(api, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    setCategories(d.data || []);
  }, [token, tab]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Fetch transactions
  const loadTxs = useCallback(async () => {
    if (!token || !id) return;
    setLoadingTxs(true);
    const h = { Authorization: `Bearer ${token}` };
    const api =
      tab === "in"
        ? "/api/accounting/income-all"
        : "/api/accounting/expenses-all";
    const params: Record<string, string> = {
      page: String(page),
      limit: String(LIMIT),
      account_id: id,
    };
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.source) params.source = filters.source;
    const qp = new URLSearchParams(params);
    const r = await fetch(`${api}?${qp}`, { headers: h });
    const d = await r.json();
    setTxs(d.data || []);
    setTotal(d.count || 0);
    setLoadingTxs(false);
  }, [tab, page, token, id, filters]);

  useEffect(() => {
    loadTxs();
  }, [loadTxs]);

  const totalPages = Math.ceil(total / LIMIT);
  const isIncome = tab === "in";

  const getDate = (tx: any) =>
    tx.date || (isIncome ? tx.income_date : tx.expense_date);
  const getCat = (tx: any) =>
    tx.category ||
    (isIncome ? tx.income_categories?.name : tx.expense_categories?.name) ||
    "—";
  const getSource = (tx: any): string => tx.source || "manual";
  const getRefName = (tx: any) => tx.ref_name || "";

  if (loadingAccount) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20 text-slate-400 text-sm">
        Account not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
        {/* Header — single row */}
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 mb-5 flex items-center gap-3 flex-wrap">
          {/* Back button */}
          <button
            onClick={() =>
              router.push("/dashboard/admin/accounting?section=accounts")
            }
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:text-slate-800 hover:border-gray-300 transition-all shadow-sm flex-shrink-0"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Icon */}
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-white" />
          </div>

          {/* Name + badges */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-800 whitespace-nowrap">
              {account.account_name}
            </h1>
            {account.is_default && (
              <Badge color="amber" icon={Star}>
                Default
              </Badge>
            )}
            <Badge color={account.status === "active" ? "emerald" : "slate"}>
              {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
            </Badge>
            {account.notes && (
              <span className="text-xs text-slate-400">{account.notes}</span>
            )}
          </div>

          {/* Balances */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                Opening Balance
              </p>
              <p className="text-sm font-semibold text-slate-600">
                {fmt(account.opening_balance)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                Current Balance
              </p>
              <p
                className={`text-xl font-black ${currentBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {fmt(currentBalance)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters + Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
            {/* In/Out Tabs */}
            <SubTabs
              tabs={[
                { key: "in", label: "In (Income)", icon: TrendingUp },
                { key: "out", label: "Out (Expense)", icon: TrendingDown },
              ]}
              active={tab}
              onChange={(k) => setTab(k as "in" | "out")}
            />
            <div className="flex flex-wrap items-center gap-3 ml-auto">
              {/* Date From */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide px-0.5">
                  From
                </span>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, date_from: e.target.value }))
                  }
                  className="h-9 px-3 text-xs border border-gray-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {/* Date To */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide px-0.5">
                  To
                </span>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, date_to: e.target.value }))
                  }
                  className="h-9 px-3 text-xs border border-gray-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {/* Category */}
              <div className="flex flex-col gap-0.5 w-[170px]">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide px-0.5">
                  Category
                </span>
                <AestheticSelect
                  label=""
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Categories" },
                    ...categories.map((c) => ({ id: c.id, name: c.name })),
                  ]}
                  value={filters.category_id}
                  onChange={(val) =>
                    setFilters((f) => ({ ...f, category_id: val }))
                  }
                  placeholder="All Categories"
                />
              </div>
              {/* Source */}
              <div className="flex flex-col gap-0.5 w-[160px]">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide px-0.5">
                  Source
                </span>
                <AestheticSelect
                  label=""
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Sources" },
                    { id: "manual", name: "Manual" },
                    { id: "vendor_payment", name: "Vendor Payment" },
                    ...(tab === "out"
                      ? [{ id: "staff_payment", name: "Staff Payment" }]
                      : []),
                  ]}
                  value={filters.source}
                  onChange={(val) => setFilters((f) => ({ ...f, source: val }))}
                  placeholder="All Sources"
                />
              </div>
              {/* Clear */}
              {(filters.date_from ||
                filters.date_to ||
                filters.category_id ||
                filters.source) && (
                <button
                  onClick={() =>
                    setFilters({
                      date_from: "",
                      date_to: "",
                      category_id: "",
                      source: "",
                    })
                  }
                  className="h-9 px-3 flex items-center gap-1.5 text-xs text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <X size={11} /> Clear
                </button>
              )}
            </div>
          </div>
          {/* Row count */}
          <div className="px-6 py-2 border-b border-gray-100">
            <p className="text-xs text-slate-400">
              {total} transaction{total !== 1 ? "s" : ""}
            </p>
          </div>
          <Table
            columns={[
              { key: "date", header: "Date", align: "left" },
              { key: "category", header: "Category", align: "left" },
              { key: "source", header: "Source", align: "left" },
              { key: "remarks", header: "Remarks / Ref", align: "left" },
              { key: "amount", header: "Amount", align: "right" },
            ]}
            data={txs}
            loading={loadingTxs}
            emptyIcon={
              isIncome ? (
                <TrendingUp size={28} className="text-slate-200" />
              ) : (
                <TrendingDown size={28} className="text-slate-200" />
              )
            }
            emptyMessage={`No ${isIncome ? "income" : "expense"} transactions for this account.`}
            renderCell={(column, tx) => {
              if (column.key === "date") {
                const raw = getDate(tx);
                const display = raw ? raw.split("-").reverse().join("-") : "—";
                return (
                  <span className="text-slate-600 text-sm">{display}</span>
                );
              }
              if (column.key === "category")
                return (
                  <span className="text-sm font-medium text-slate-700">
                    {getCat(tx)}
                  </span>
                );
              if (column.key === "source") {
                const src = getSource(tx);
                const s = SOURCE_LABELS[src] || SOURCE_LABELS.manual;
                return (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ color: s.color, backgroundColor: s.bg }}
                  >
                    {s.label}
                  </span>
                );
              }
              if (column.key === "remarks")
                return (
                  <span className="text-xs text-slate-500">
                    {getRefName(tx) ? (
                      <>
                        {getRefName(tx)}
                        {tx.remarks ? ` — ${tx.remarks}` : ""}
                      </>
                    ) : (
                      tx.remarks || "—"
                    )}
                  </span>
                );
              if (column.key === "amount")
                return (
                  <span
                    className={`font-bold text-sm ${isIncome ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    {isIncome ? "+" : "-"}
                    {fmt(Number(tx.amount || 0))}
                  </span>
                );
              return null;
            }}
          />
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)] flex items-center justify-center">
          <div className="text-slate-400 text-sm">Loading…</div>
        </div>
      }
    >
      <AccountDetailContent />
    </Suspense>
  );
}
