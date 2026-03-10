"use client";

import { X, Trash2, Search, Loader2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingInvoiceId: string | null;
  vendor: any;
  invoiceJobIds: string[];
  invoiceNote: string;
  setInvoiceNote: (note: string) => void;
  jobSearchQuery: string;
  setJobSearchQuery: (q: string) => void;
  showJobDropdown: boolean;
  setShowJobDropdown: (v: boolean) => void;
  toggleInvoiceJob: (id: string) => void;
  handleSaveInvoice: () => void;
  isSavingInvoice: boolean;
  selectedInvoiceJobs: any[];
  filteredJobsForInvoice: any[];
  invoiceTotalAmount: number;
  invoiceTotalCommission: number;
  invoicePaymentType: string;
  setInvoicePaymentType: (v: string) => void;
  getStatusLabel: (status: string) => string;
  getJobRemainingAmount: (jobId: string) => number;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  editingInvoiceId,
  vendor,
  invoiceJobIds,
  invoiceNote,
  setInvoiceNote,
  jobSearchQuery,
  setJobSearchQuery,
  showJobDropdown,
  setShowJobDropdown,
  toggleInvoiceJob,
  handleSaveInvoice,
  isSavingInvoice,
  selectedInvoiceJobs,
  filteredJobsForInvoice,
  invoiceTotalAmount,
  invoiceTotalCommission,
  invoicePaymentType,
  setInvoicePaymentType,
  getStatusLabel,
  getJobRemainingAmount,
}: InvoiceModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (showJobDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showJobDropdown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">
            {editingInvoiceId ? "Edit Invoice" : "Create Invoice"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="space-y-4">
            {/* From & To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* <div className="bg-gray-50 rounded-md border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  From
                </p>
                <p className="font-semibold text-gray-900 text-sm">
                  First Story Production
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Production Studio
                </p>
              </div> */}
              <div className="bg-gray-50 rounded-md border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  To,
                </p>
                <p className="font-semibold text-gray-900 text-sm">
                  {vendor.studio_name}
                </p>
                {vendor.contact_person && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {vendor.contact_person}
                  </p>
                )}
                {vendor.mobile && (
                  <p className="text-xs text-gray-600">{vendor.mobile}</p>
                )}
                {vendor.email && (
                  <p className="text-xs text-gray-600">{vendor.email}</p>
                )}
                {vendor.location && (
                  <p className="text-xs text-gray-600">{vendor.location}</p>
                )}
              </div>
              {/* Invoice Note */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Invoice Note
                </label>
                <textarea
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                  placeholder="e.g. Thank you for your business"
                  rows={5}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Payment Type */}
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Payment Type <span className="text-rose-500">*</span>
              </label>
              <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setInvoicePaymentType("commission")}
                  className={`px-5 py-2 text-sm font-medium transition-colors ${
                    invoicePaymentType === "commission"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Commission
                </button>
                <button
                  type="button"
                  onClick={() => setInvoicePaymentType("salary")}
                  className={`px-5 py-2 text-sm font-medium border-l border-gray-300 transition-colors ${
                    invoicePaymentType === "salary"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Salary
                </button>
              </div>
            </div>

            {/* Job Selection & Note */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              {/* Job Selection */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Select Jobs <span className="text-rose-500">*</span>
                  {invoiceJobIds.length > 0 && (
                    <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {invoiceJobIds.length} selected
                    </span>
                  )}
                </label>

                {/* Search + Dropdown */}
                <div className="relative">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      value={jobSearchQuery}
                      onChange={(e) => {
                        setJobSearchQuery(e.target.value);
                        setShowJobDropdown(true);
                      }}
                      onFocus={() => setShowJobDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowJobDropdown(false), 150)
                      }
                      placeholder="Search and select jobs..."
                      className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  {showJobDropdown && dropdownRect && (
                    <div
                      style={{
                        position: "fixed",
                        top: dropdownRect.top,
                        left: dropdownRect.left,
                        width: dropdownRect.width,
                        zIndex: 9999,
                      }}
                      className="bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto"
                    >
                      {filteredJobsForInvoice.length === 0 ? (
                        <p className="px-3 py-2.5 text-xs text-gray-400 italic">
                          No pending jobs found
                        </p>
                      ) : (
                        filteredJobsForInvoice.map((job) => (
                          <button
                            key={job.id}
                            type="button"
                            onMouseDown={() => {
                              if (!invoiceJobIds.includes(job.id)) {
                                toggleInvoiceJob(job.id);
                                setJobSearchQuery("");
                              }
                            }}
                            disabled={invoiceJobIds.includes(job.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors border-b border-gray-100 last:border-0 ${
                              invoiceJobIds.includes(job.id)
                                ? "bg-indigo-50 text-indigo-400 cursor-not-allowed"
                                : "hover:bg-gray-50 text-gray-800 cursor-pointer"
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-sm truncate">
                                {job.service?.name}
                              </span>
                              {job.job_due_date && (
                                <span className="text-xs text-gray-400 mt-0.5">
                                  Due:{" "}
                                  {new Date(
                                    job.job_due_date,
                                  ).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-3">
                              <span className="text-sm font-semibold text-gray-700">
                                {formatCurrency(getJobRemainingAmount(job.id))}
                              </span>
                              {getJobRemainingAmount(job.id) <
                                Number(job.amount || 0) && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                                  Partial
                                </span>
                              )}
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                  job.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {getStatusLabel(job.status)}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Jobs Table */}
                {selectedInvoiceJobs.length > 0 && (
                  <div className="mt-3 border border-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                            Job Name
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
                        {selectedInvoiceJobs.map((job) => (
                          <tr key={job.id} className="bg-white">
                            <td className="px-3 py-2 text-gray-800 font-medium text-xs">
                              {job.service?.name}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 text-xs">
                              {formatCurrency(getJobRemainingAmount(job.id))}
                              {getJobRemainingAmount(job.id) <
                                Number(job.amount || 0) && (
                                <span className="ml-1 text-xs text-amber-600">
                                  (partial)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => toggleInvoiceJob(job.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        {invoicePaymentType === "commission" &&
                          invoiceTotalCommission > 0 && (
                            <tr>
                              <td className="px-3 py-2 text-xs text-gray-500">
                                Commission Info
                              </td>
                              <td className="px-3 py-2 text-right text-xs text-rose-500 font-medium">
                                {formatCurrency(invoiceTotalCommission)}
                              </td>
                              <td />
                            </tr>
                          )}
                        <tr>
                          <td className="px-3 py-2 text-xs font-bold text-gray-700">
                            Total
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-indigo-700">
                            {formatCurrency(invoiceTotalAmount)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={isSavingInvoice || invoiceJobIds.length === 0}
            className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md transition-all flex items-center gap-2"
          >
            {isSavingInvoice && <Loader2 size={15} className="animate-spin" />}
            {editingInvoiceId ? "Update Invoice" : "Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
