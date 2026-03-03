"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  Download,
  Printer,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import Spinner from "../../../../components/Spinner";

const fmt = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

// Custom date input that displays DD/MM/YYYY but stores YYYY-MM-DD
function DateInputDDMMYYYY({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const displayValue = value ? value.split("-").reverse().join("/") : "";
  return (
    <div className="relative" onClick={() => ref.current?.showPicker?.()}>
      <input
        type="text"
        readOnly
        value={displayValue}
        placeholder="DD/MM/YYYY"
        className={`cursor-pointer ${className ?? ""}`}
      />
      <input
        ref={ref}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        tabIndex={-1}
      />
    </div>
  );
}

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getDefaultDates = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month
  return {
    from: toYMD(from),
    to: toYMD(to),
  };
};

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  accountBalances: {
    id: string;
    account_name: string;
    current_balance: number;
    is_default: boolean;
  }[];
  incomeByCategory: { name: string; amount: number }[];
  expenseByCategory: { name: string; amount: number }[];
}

export default function ReportsPage() {
  const defaults = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [selectedPreset, setSelectedPreset] = useState<string>("This Month");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState("");

  // Get auth token once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
  }, []);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const res = await fetch(`/api/accounting/summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo]);

  // Auto-fetch when token is ready or dates change
  useEffect(() => {
    if (token) fetchReport();
  }, [token, fetchReport]);

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ["Report Period", `${dateFrom} to ${dateTo}`],
      [],
      ["Summary", ""],
      ["Total Income", String(data.totalIncome)],
      ["Total Expense", String(data.totalExpense)],
      ["Net Profit", String(data.netProfit)],
      [
        "Net Margin %",
        data.totalIncome
          ? ((data.netProfit / data.totalIncome) * 100).toFixed(2) + "%"
          : "0%",
      ],
      [],
      ["Account", "Balance"],
      ...data.accountBalances.map((a) => [
        a.account_name,
        String(a.current_balance),
      ]),
      [],
      ["Income Category", "Amount"],
      ...data.incomeByCategory.map((c) => [c.name, String(c.amount)]),
      [],
      ["Expense Category", "Amount"],
      ...data.expenseByCategory.map((c) => [c.name, String(c.amount)]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxIncome = Math.max(
    ...(data?.incomeByCategory.map((c) => c.amount) ?? []),
    1,
  );
  const maxExpense = Math.max(
    ...(data?.expenseByCategory.map((c) => c.amount) ?? []),
    1,
  );
  const netMargin = data?.totalIncome
    ? ((data.netProfit / data.totalIncome) * 100).toFixed(1)
    : "0.0";

  return (
    <main className="lg:ml-[var(--sidebar-offset)] p-4 lg:p-6 print:p-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Financial Reports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Profit &amp; Loss breakdown by date range
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-gray-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!data}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex flex-wrap items-end gap-3 flex-1">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wide">
                From
              </label>
              <DateInputDDMMYYYY
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                  setSelectedPreset("");
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-36"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wide">
                To
              </label>
              <DateInputDDMMYYYY
                value={dateTo}
                onChange={(v) => {
                  setDateTo(v);
                  setSelectedPreset("");
                }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-36"
              />
            </div>
          </div>

          {/* Quick range presets */}
          <div className="flex gap-2 flex-wrap">
            {[
              {
                label: "This Month",
                fn: () => {
                  const d = getDefaultDates();
                  setDateFrom(d.from);
                  setDateTo(d.to);
                  setSelectedPreset("This Month");
                },
              },
              {
                label: "Last Month",
                fn: () => {
                  const now = new Date();
                  const from = new Date(
                    now.getFullYear(),
                    now.getMonth() - 1,
                    1,
                  );
                  const to = new Date(now.getFullYear(), now.getMonth(), 0);
                  setDateFrom(toYMD(from));
                  setDateTo(toYMD(to));
                  setSelectedPreset("Last Month");
                },
              },
              {
                label: "This Year",
                fn: () => {
                  const yr = new Date().getFullYear();
                  setDateFrom(`${yr}-01-01`);
                  setDateTo(`${yr}-12-31`);
                  setSelectedPreset("This Year");
                },
              },
              {
                label: "All Time",
                fn: () => {
                  setDateFrom("2000-01-01");
                  setDateTo(toYMD(new Date()));
                  setSelectedPreset("All Time");
                },
              },
            ].map(({ label, fn }) => (
              <button
                key={label}
                onClick={fn}
                className={`text-[14px] px-3.5 py-1 rounded-full border transition-all ${
                  selectedPreset === label
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-gray-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Print header (only visible in print) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Financial Report</h1>
        <p className="text-sm text-gray-600">
          Period: {dateFrom} to {dateTo}
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-6" />
          <span className="ml-2 text-sm text-slate-400">Loading report…</span>
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Income */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Total Income
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {fmt(data.totalIncome)}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
            </div>

            {/* Total Expense */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Total Expense
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {fmt(data.totalExpense)}
                </p>
              </div>
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                <TrendingDown size={18} className="text-rose-600" />
              </div>
            </div>

            {/* Net Profit */}
            <div
              className={`bg-white rounded-xl border p-5 flex items-center justify-between ${data.netProfit >= 0 ? "border-emerald-200" : "border-rose-200"}`}
            >
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Net Profit
                </p>
                <p
                  className={`text-xl font-bold ${data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {fmt(data.netProfit)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {data.netProfit >= 0 ? "In Profit" : "In Loss"}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.netProfit >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}
              >
                <BarChart3
                  size={18}
                  className={
                    data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }
                />
              </div>
            </div>

            {/* Net Margin */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Net Margin
                </p>
                <p className="text-xl font-bold text-indigo-600">
                  {netMargin}%
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  of total income
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <BarChart3 size={18} className="text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Income vs Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Income by Category */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-500" /> Income by
                Category
              </h2>
              {data.incomeByCategory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No income recorded for this period
                </p>
              ) : (
                <div className="space-y-3.5">
                  {data.incomeByCategory.map((c) => (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 truncate max-w-[60%]">
                          {c.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px]">
                            {data.totalIncome
                              ? ((c.amount / data.totalIncome) * 100).toFixed(1)
                              : 0}
                            %
                          </span>
                          <span className="font-semibold text-emerald-700">
                            {fmt(c.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-emerald-50 rounded-full">
                        <div
                          className="h-2 bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${(c.amount / maxIncome) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between text-xs font-bold">
                    <span className="text-slate-700">Total</span>
                    <span className="text-emerald-700">
                      {fmt(data.totalIncome)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Expense by Category */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <TrendingDown size={14} className="text-rose-500" /> Expense by
                Category
              </h2>
              {data.expenseByCategory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No expenses recorded for this period
                </p>
              ) : (
                <div className="space-y-3.5">
                  {data.expenseByCategory.map((c) => (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 truncate max-w-[60%]">
                          {c.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px]">
                            {data.totalExpense
                              ? ((c.amount / data.totalExpense) * 100).toFixed(
                                  1,
                                )
                              : 0}
                            %
                          </span>
                          <span className="font-semibold text-rose-700">
                            {fmt(c.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-rose-50 rounded-full">
                        <div
                          className="h-2 bg-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${(c.amount / maxExpense) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between text-xs font-bold">
                    <span className="text-slate-700">Total</span>
                    <span className="text-rose-700">
                      {fmt(data.totalExpense)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Balances */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Wallet size={14} className="text-slate-400" /> Account Balances
            </h2>
            {data.accountBalances.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No accounts found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">
                        Account Name
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-500 pb-2">
                        Current Balance
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-500 pb-2 pl-4">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.accountBalances.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <Wallet
                              size={13}
                              className="text-slate-400 shrink-0"
                            />
                            <span className="text-slate-700 font-medium">
                              {acc.account_name}
                            </span>
                            {acc.is_default && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                                DEFAULT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`font-bold text-sm ${acc.current_balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {fmt(acc.current_balance)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right pl-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${acc.current_balance >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                          >
                            {acc.current_balance >= 0 ? "POSITIVE" : "NEGATIVE"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="pt-3 text-xs font-bold text-slate-600">
                        Total Balance
                      </td>
                      <td className="pt-3 text-right">
                        <span
                          className={`font-bold text-sm ${data.accountBalances.reduce((s, a) => s + a.current_balance, 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {fmt(
                            data.accountBalances.reduce(
                              (s, a) => s + a.current_balance,
                              0,
                            ),
                          )}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* P&L Summary Table */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 print:mt-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-indigo-500" /> Profit &amp;
              Loss Summary
            </h2>
            <div className="space-y-0 divide-y divide-gray-100 text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Total Income</span>
                <span className="font-semibold text-emerald-700">
                  {fmt(data.totalIncome)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Total Expense</span>
                <span className="font-semibold text-rose-700">
                  ({fmt(data.totalExpense)})
                </span>
              </div>
              <div className="flex justify-between py-3 font-bold text-base">
                <span className="text-slate-900">Net Profit / (Loss)</span>
                <span
                  className={
                    data.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {fmt(data.netProfit)}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 text-xs">
                  Net Profit Margin
                </span>
                <span className="text-indigo-600 font-semibold text-xs">
                  {netMargin}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
