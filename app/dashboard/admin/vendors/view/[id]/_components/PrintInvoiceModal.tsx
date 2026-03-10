"use client";

import { useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  vendor: any;
  recentJobs: any[];
}

export default function PrintInvoiceModal({
  isOpen,
  onClose,
  invoice,
  vendor,
  recentJobs,
}: PrintInvoiceModalProps) {
  useEffect(() => {
    if (!isOpen || !invoice) return;

    const printJobs = recentJobs.filter((j) => invoice.job_ids?.includes(j.id));

    const isCommission = (invoice.payment_type ?? "commission") !== "salary";

    const date = new Date(invoice.created_at).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const jobRows = printJobs
      .map(
        (job, idx) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">${idx + 1}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827;">
            ${job.service?.name ?? ""}
            ${!isCommission && job.staff?.name ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${job.staff.name}</div>` : ""}
          </td>
          ${isCommission ? `<td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right;color:#ef4444;font-size:12px;">${formatCurrency(job.commission_amount || 0)}</td>` : ""}
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;color:#111827;">${formatCurrency(job.amount)}</td>
        </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
    body{background:#fff;color:#111;}
    @media print{@page{margin:20mm;}}
  </style>
</head>
<body>
  <div style="max-width:750px;margin:0 auto;padding:32px;">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;border-bottom:2px solid #e5e7eb;margin-bottom:24px;">
      <div>
        <h1 style="font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:2px;">INVOICE</h1>
        <p style="font-size:13px;color:#6b7280;margin-top:6px;">Invoice # <strong style="color:#111;font-family:monospace;">${invoice.invoice_number}</strong></p>
        <p style="font-size:12px;color:#9ca3af;margin-top:4px;">Date: ${date}</p>
        <span style="display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.5px;${isCommission ? "background:#ede9fe;color:#6d28d9;" : "background:#d1fae5;color:#065f46;"}">
          ${isCommission ? "COMMISSION" : "SALARY"}
        </span>
      </div>
      <div style="text-align:right;">
        <p style="font-size:13px;font-weight:700;color:#111;">First Story Production</p>
        <p style="font-size:11px;color:#6b7280;margin-top:4px;">Production Studio</p>
      </div>
    </div>

    <!-- From / To -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;padding-bottom:24px;border-bottom:1px solid #f3f4f6;margin-bottom:24px;">
   
      <div>
        <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">To,</p>
        <p style="font-size:13px;font-weight:600;color:#111;">${vendor.studio_name ?? ""}</p>
        ${vendor.contact_person ? `<p style="font-size:11px;color:#374151;margin-top:4px;">${vendor.contact_person}</p>` : ""}
        ${vendor.mobile ? `<p style="font-size:11px;color:#374151;">${vendor.mobile}</p>` : ""}
        ${vendor.email ? `<p style="font-size:11px;color:#374151;">${vendor.email}</p>` : ""}
        ${vendor.location ? `<p style="font-size:11px;color:#374151;">${vendor.location}</p>` : ""}
      </div>
    </div>

    <!-- Jobs Table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb;">
          <th style="padding:8px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">#</th>
          <th style="padding:8px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">${isCommission ? "Service Name" : "Service Name / Staff"}</th>
          ${isCommission ? `<th style="padding:8px;text-align:right;font-size:11px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:1px;">Commission</th>` : ""}
          <th style="padding:8px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Amount</th>
        </tr>
      </thead>
      <tbody>${jobRows}</tbody>
    </table>

    <!-- Total -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div style="min-width:240px;">
        ${
          isCommission && invoice.total_commission > 0
            ? `
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding-bottom:8px;margin-bottom:8px;border-bottom:1px dashed #e5e7eb;">
          <span>Commission</span>
          <span style="color:#ef4444;">${formatCurrency(invoice.total_commission)}</span>
        </div>`
            : ""
        }
        <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#111;border-top:2px solid #4f46e5;padding-top:12px;">
          <span>Total Amount</span>
          <span style="color:#4f46e5;">${formatCurrency(invoice.total_amount)}</span>
        </div>
      </div>
    </div>

    ${
      invoice.note
        ? `
    <!-- Note -->
    <div style="padding:12px;background:#f9fafb;border-radius:6px;margin-bottom:24px;">
      <p style="font-size:12px;color:#6b7280;"><strong>Note:</strong> ${invoice.note}</p>
    </div>`
        : ""
    }

    <!-- Footer -->
    <div style="border-top:1px solid #f3f4f6;padding-top:16px;text-align:center;">
      <p style="font-size:11px;color:#9ca3af;">Generated by First Story Production Management System • ${date}</p>
    </div>

  </div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow!.onafterprint = () => {
        document.body.removeChild(iframe);
      };
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 100);
    }

    onClose();
  }, [isOpen, invoice]);

  return null;
}
