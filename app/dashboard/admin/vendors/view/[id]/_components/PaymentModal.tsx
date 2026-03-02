"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Search, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface PaymentFormState {
  amount: string;
  date: string;
  note: string;
  invoice_ids: string[];
  account_id: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentForm: PaymentFormState;
  setPaymentForm: React.Dispatch<React.SetStateAction<PaymentFormState>>;
  handleAddPayment: (e: React.FormEvent) => void;
  savedInvoices: any[];
  recentJobs: any[];
  payments: any[];
  accounts: { id: string; account_name: string; is_default: boolean }[];
}

export default function PaymentModal({
  isOpen,
  onClose,
  paymentForm,
  setPaymentForm,
  handleAddPayment,
  savedInvoices,
  payments,
  accounts,
}: PaymentModalProps) {
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  if (!isOpen) return null;

  // Calculate how much has already been paid per invoice
  const getPaidForInvoice = (invId: string) =>
    payments
      .filter((p) => p.invoice_id === invId)
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  // Remaining balance = total_amount - already paid
  const getRemaining = (inv: any) =>
    Math.max(0, Number(inv.total_amount || 0) - getPaidForInvoice(inv.id));

  const selectedInvoices = savedInvoices.filter((i) =>
    paymentForm.invoice_ids.includes(i.id),
  );
  // Total of remaining balances for selected invoices
  const totalFromInvoices = selectedInvoices.reduce(
    (s, inv) => s + getRemaining(inv),
    0,
  );
  // Only show invoices that still have a balance AND are not already selected
  const filteredInvoices = savedInvoices.filter(
    (inv) =>
      !paymentForm.invoice_ids.includes(inv.id) &&
      getRemaining(inv) > 0 &&
      inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase()),
  );

  const handleSelectInvoice = (inv: any) => {
    const newIds = [...paymentForm.invoice_ids, inv.id];
    const newTotal = savedInvoices
      .filter((i) => newIds.includes(i.id))
      .reduce((s, i) => s + getRemaining(i), 0);
    setPaymentForm({
      ...paymentForm,
      invoice_ids: newIds,
      amount: String(newTotal),
    });
    setInvoiceSearch("");
    setShowInvoiceDropdown(false);
  };

  const handleRemoveInvoice = (invId: string) => {
    const newIds = paymentForm.invoice_ids.filter((i) => i !== invId);
    const newTotal = savedInvoices
      .filter((i) => newIds.includes(i.id))
      .reduce((s, i) => s + getRemaining(i), 0);
    setPaymentForm({
      ...paymentForm,
      invoice_ids: newIds,
      amount: newIds.length ? String(newTotal) : "",
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Record Payment
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Link to an invoice marks all jobs complete automatically
            </p>
          </div>
          <button
            title="Close"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAddPayment} className="p-6 space-y-4">
          {/* Invoice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Invoice
              {paymentForm.invoice_ids.length > 0 && (
                <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  {paymentForm.invoice_ids.length} selected
                </span>
              )}
              <span className="ml-1.5 text-xs text-indigo-600 font-normal">
                auto-marks all invoice jobs as Complete
              </span>
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={invoiceSearch}
                onChange={(e) => {
                  setInvoiceSearch(e.target.value);
                  setShowInvoiceDropdown(true);
                }}
                onFocus={() => setShowInvoiceDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowInvoiceDropdown(false), 150)
                }
                placeholder="Search and select invoices..."
                className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              {showInvoiceDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-44 overflow-y-auto">
                  {filteredInvoices.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-gray-400 italic">
                      No more invoices
                    </p>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onMouseDown={() => handleSelectInvoice(inv)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 text-gray-800 cursor-pointer"
                      >
                        <span className="font-medium">
                          {inv.invoice_number}
                        </span>
                        <div className="flex items-center space-x-2 shrink-0 ml-2 text-xs text-gray-500">
                          <span>
                            {inv.job_ids?.length || 0} job
                            {(inv.job_ids?.length || 0) !== 1 ? "s" : ""}
                          </span>
                          <span className="font-semibold text-indigo-600">
                            {formatCurrency(getRemaining(inv))}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Selected Invoices Table */}
            {selectedInvoices.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Invoice
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">
                        Remove
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedInvoices.map((inv) => (
                      <tr key={inv.id} className="bg-white">
                        <td className="px-3 py-2 text-xs font-medium text-gray-800">
                          {inv.invoice_number}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-gray-700">
                          {formatCurrency(getRemaining(inv))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            title="Remove"
                            onClick={() => handleRemoveInvoice(inv.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-3 py-2 text-xs font-bold text-gray-700">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-indigo-700">
                        {formatCurrency(totalFromInvoices)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                <div className="px-3 py-2 bg-indigo-50 border-t border-indigo-100">
                  <p className="text-xs text-indigo-600 flex items-center space-x-1">
                    <CheckCircle2 size={11} />
                    <span>
                      {selectedInvoices.reduce(
                        (s, inv) => s + (inv.job_ids?.length || 0),
                        0,
                      )}{" "}
                      job(s) will be marked Complete
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account <span className="text-rose-500">*</span>
            </label>
            <select
              title="Account"
              value={paymentForm.account_id}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, account_id: e.target.value })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border px-3"
              required
            >
              <option value="">Select Account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-rose-500">*</span>
              {paymentForm.invoice_ids.length > 0 && (
                <span className="ml-1.5 text-xs text-indigo-600 font-normal">
                  (auto-filled from invoice)
                </span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm"></span>
              </div>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border"
                placeholder="0.00"
                required
                min="1"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={paymentForm.date}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, date: e.target.value })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border px-3"
              required
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={paymentForm.note}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, note: e.target.value })
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border px-3"
              placeholder="e.g. advance, final payment"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
