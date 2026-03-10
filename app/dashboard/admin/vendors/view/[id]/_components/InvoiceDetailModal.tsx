"use client";

import { X, Edit2, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any | null;
  vendor: any;
  jobs: any[]; // all recentJobs
  getJobRemainingAmount: (jobId: string) => number;
  onEdit: (inv: any) => void;
  onPrint: (inv: any) => void;
}

export default function InvoiceDetailModal({
  isOpen,
  onClose,
  invoice,
  vendor,
  jobs,
  getJobRemainingAmount,
  onEdit,
  onPrint,
}: InvoiceDetailModalProps) {
  if (!isOpen || !invoice) return null;

  const invoiceJobs = jobs.filter((j) => invoice.job_ids?.includes(j.id));

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Invoice Details
            </h2>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">
              {invoice.invoice_number}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              title="Edit Invoice"
              onClick={() => {
                onClose();
                onEdit(invoice);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-md transition-colors"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              title="Print Invoice"
              onClick={() => {
                onClose();
                onPrint(invoice);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
            >
              <Printer size={13} /> Print
            </button>
            <button
              title="Close"
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* Vendor & Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TO */}
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
              <p className="text-sm font-medium text-gray-900 mb-1">
                Invoice Note
              </p>
              <div className="w-full px-3 py-2.5 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 min-h-[100px]">
                {invoice.note ? (
                  <span>{invoice.note}</span>
                ) : (
                  <span className="text-gray-400 italic">No note</span>
                )}
              </div>
            </div>
          </div>

          {/* Date row */}
          <div className="flex items-center gap-6 text-sm text-gray-600 bg-gray-50 rounded-md border border-gray-200 px-4 py-2.5">
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Invoice #
              </span>
              <p className="font-semibold text-gray-900 mt-0.5">
                {invoice.invoice_number}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Date
              </span>
              <p className="font-medium text-gray-700 mt-0.5">
                {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                Jobs
              </span>
              <p className="font-medium text-gray-700 mt-0.5">
                {invoice.job_ids?.length || 0} job
                {(invoice.job_ids?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Jobs table */}
          {invoiceJobs.length > 0 ? (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Job Name
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoiceJobs.map((job) => {
                    const remaining = getJobRemainingAmount(job.id);
                    const isPartial = remaining < Number(job.amount || 0);
                    return (
                      <tr key={job.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 text-sm">
                            {job.service?.name}
                          </p>
                          {job.job_due_date && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Due:{" "}
                              {new Date(job.job_due_date).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-gray-800 text-sm">
                            {formatCurrency(isPartial ? remaining : job.amount)}
                          </span>
                          {isPartial && (
                            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                              Partial
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-indigo-700">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic px-1">
              No jobs linked to this invoice.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
