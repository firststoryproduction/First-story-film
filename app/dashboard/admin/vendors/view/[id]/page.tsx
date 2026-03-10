"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  User,
  Smartphone,
  Mail,
  MapPin,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Calendar,
  Edit2,
  LayoutList,
  Wallet,
  Plus,
  Trash2,
  Banknote,
  History,
  Receipt,
  Printer,
  FileCheck,
  CheckSquare,
} from "lucide-react";
import Spinner from "@/components/Spinner";
import { formatCurrency } from "@/lib/utils";
import Badge from "@/components/Badge";
import VendorForm from "@/components/VendorForm";
import Tooltip from "@/components/Tooltip";
import Table from "@/components/Table";
import InvoiceModal from "./_components/InvoiceModal";
import InvoiceDetailModal from "./_components/InvoiceDetailModal";
import PrintInvoiceModal from "./_components/PrintInvoiceModal";
import JobViewModal from "./_components/JobViewModal";
import { PaymentFormState } from "./_components/PaymentModal";
import PaymentModal from "./_components/PaymentModal";
import PaymentDetailModal from "./_components/PaymentDetailModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";

type ActiveTab = "jobs" | "payments" | "invoice";

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    studio_name: "",
    contact_person: "",
    mobile: "",
    email: "",
    location: "",
    notes: "",
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>("jobs");

  // Payment State
  const [payments, setPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    invoice_ids: [],
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    account_id: "",
  });
  const [paymentStats, setPaymentStats] = useState({
    totalPayable: 0,
    totalPaid: 0,
    remaining: 0,
  });

  // Invoice State (multi-select)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceJobIds, setInvoiceJobIds] = useState<string[]>([]);
  const [invoiceNote, setInvoiceNote] = useState("");
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [viewingPayment, setViewingPayment] = useState<any | null>(null);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const [showPrintInvoiceModal, setShowPrintInvoiceModal] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<any | null>(null);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<
    string[] | null
  >(null);
  const [confirmDeleteInvoiceId, setConfirmDeleteInvoiceId] = useState<
    string | null
  >(null);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [showJobDropdown, setShowJobDropdown] = useState(false);

  const toggleInvoiceJob = (jobId: string) => {
    setInvoiceJobIds((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId],
    );
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setInvoiceJobIds([]);
    setInvoiceNote("");
    setJobSearchQuery("");
    setShowJobDropdown(false);
    setEditingInvoiceId(null);
  };

  const openEditInvoiceModal = (inv: any) => {
    setEditingInvoiceId(inv.id);
    setInvoiceJobIds(inv.job_ids || []);
    setInvoiceNote(inv.note || "");
    setShowInvoiceModal(true);
  };

  const handlePrintSavedInvoice = (inv: any) => {
    setPrintInvoiceData(inv);
    setShowPrintInvoiceModal(true);
  };

  const showNotification = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED") return "emerald";
    if (status === "PENDING") return "amber";
    return "indigo";
  };

  const getStatusLabel = (status: string) => {
    if (status === "IN_PROGRESS") return "In Progress";
    if (status === "COMPLETED") return "Complete";
    return "Pending";
  };

  const handleOpenEditModal = () => {
    setEditFormData({
      studio_name: vendor.studio_name || "",
      contact_person: vendor.contact_person || "",
      mobile: vendor.mobile || "",
      email: vendor.email || "",
      location: vendor.location || "",
      notes: vendor.notes || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await (supabase.from("vendors") as any)
        .update(editFormData)
        .eq("id", id);

      if (error) throw error;

      setVendor({ ...vendor, ...editFormData });
      setShowEditModal(false);
      showNotification("Vendor updated successfully");
    } catch (error) {
      console.error("Error updating vendor:", error);
      showNotification("Failed to update vendor", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await (supabase.from("jobs") as any)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          completed_at:
            newStatus === "COMPLETED" ? new Date().toISOString() : undefined,
          started_at:
            newStatus === "IN_PROGRESS" ? new Date().toISOString() : undefined,
        })
        .eq("id", jobId);

      if (error) throw error;

      const statusLabels: { [key: string]: string } = {
        PENDING: "Pending",
        IN_PROGRESS: "In Progress",
        COMPLETED: "Complete",
      };
      showNotification(statusLabels[newStatus] || newStatus);

      setRecentJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)),
      );
      if (selectedJob?.id === jobId) {
        setSelectedJob((prev: any) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showNotification("Failed to update status", "error");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: vendorData, error: vendorError } = await (
        supabase.from("vendors") as any
      )
        .select("*")
        .eq("id", id)
        .single();

      if (vendorError) throw vendorError;
      setVendor(vendorData);

      // Fetch accounts
      const { data: accountsData } = await (supabase.from("accounts") as any)
        .select("id, account_name, is_default")
        .eq("status", "active")
        .order("is_default", { ascending: false });
      setAccounts(accountsData || []);
      const defAccount =
        (accountsData || []).find((a: any) => a.is_default) ||
        (accountsData || [])[0];
      if (defAccount) {
        setPaymentForm((f) => ({ ...f, account_id: defAccount.id }));
      }

      const { data: jobsData, error: jobsError } = await (
        supabase.from("jobs") as any
      )
        .select(
          `*, service:services(name), staff:users!staff_id(id, name, email, mobile)`,
        )
        .eq("vendor_id", id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setRecentJobs(jobsData || []);

      // Calculate total receivable = sum of all job amounts for this vendor
      const totalPayable = (jobsData || []).reduce(
        (sum: number, j: any) => sum + Number(j.amount || 0),
        0,
      );
      setPaymentStats((prev) => ({ ...prev, totalPayable }));
    } catch (error) {
      console.error("Error fetching vendor details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await (supabase.from("vendor_payments") as any)
        .select(
          "*, job:jobs(id, service:services(name)), invoice:vendor_invoices(id, invoice_number)",
        )
        .eq("vendor_id", id)
        .order("payment_date", { ascending: false });

      if (error) {
        console.warn(
          "Could not fetch vendor payments (table might be missing):",
          error,
        );
        return;
      }

      setPayments(data || []);
    } catch (err) {
      console.error("Error in fetchPayments:", err);
    }
  };

  // Calculate payment status for each job based on invoice payments
  // Priority: oldest job (by due date) gets paid first within multi-job invoices
  // Helper: how much has been paid toward a specific job, across ALL invoices it belongs to
  const getJobTotalPaid = (jobId: string): number => {
    const jobInvoices = savedInvoices.filter((inv) =>
      inv.job_ids?.includes(jobId),
    );
    let totalPaidForJob = 0;
    for (const invoice of jobInvoices) {
      const invoicePayments = payments.filter(
        (p) => p.invoice_id === invoice.id,
      );
      const totalPaidForInvoice = invoicePayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount || 0),
        0,
      );
      if (totalPaidForInvoice <= 0) continue;
      // Distribute oldest-job-first within this invoice
      const invoiceJobs = recentJobs
        .filter((j) => invoice.job_ids?.includes(j.id))
        .sort(
          (a: any, b: any) =>
            new Date(a.job_due_date).getTime() -
            new Date(b.job_due_date).getTime(),
        );
      let rem = totalPaidForInvoice;
      for (const j of invoiceJobs) {
        const amt = Number(j.amount || 0);
        if (j.id === jobId) {
          totalPaidForJob += Math.min(rem, amt);
          break;
        }
        rem -= amt;
        if (rem < 0) rem = 0;
      }
    }
    return totalPaidForJob;
  };

  const getJobPaymentStatus = (
    jobId: string,
  ): "Paid" | "Partially Paid" | "Pending" => {
    const job = recentJobs.find((j) => j.id === jobId);
    if (!job) return "Pending";
    const fullAmt = Number(job.amount || 0);
    const paid = getJobTotalPaid(jobId);
    if (paid <= 0) return "Pending";
    if (paid >= fullAmt) return "Paid";
    return "Partially Paid";
  };

  // Returns the unpaid remaining amount for a job across all invoices
  const getJobRemainingAmount = (jobId: string): number => {
    const job = recentJobs.find((j) => j.id === jobId);
    if (!job) return 0;
    const fullAmt = Number(job.amount || 0);
    return Math.max(0, fullAmt - getJobTotalPaid(jobId));
  };

  useEffect(() => {
    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    setPaymentStats((prev) => ({
      ...prev,
      totalPaid,
      remaining: prev.totalPayable - totalPaid,
    }));
  }, [payments, paymentStats.totalPayable]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount) return;

    try {
      // Generate payment number: PAY-yyyymmdd-XXXX
      const _pNow = new Date();
      const _pYmd =
        _pNow.getFullYear().toString() +
        String(_pNow.getMonth() + 1).padStart(2, "0") +
        String(_pNow.getDate()).padStart(2, "0");
      const _pSeq = String(payments.length + 1).padStart(4, "0");
      const paymentNumber = `PAY-${_pYmd}-${_pSeq}`;

      let insertRows: {
        vendor_id: string;
        invoice_id?: string;
        amount: number;
        payment_date: string;
        note: string | null;
        payment_number: string;
        account_id?: string | null;
      }[] = [];

      if (paymentForm.invoice_ids.length > 0) {
        // Sort invoices by their oldest job's due date (oldest first = highest priority)
        const invWithPriority = paymentForm.invoice_ids
          .map((invId) => {
            const inv = savedInvoices.find((i) => i.id === invId);
            const jobs = recentJobs.filter((j) => inv?.job_ids?.includes(j.id));
            const oldestDate =
              jobs.length > 0
                ? Math.min(
                    ...jobs.map((j) => new Date(j.job_due_date).getTime()),
                  )
                : Infinity;
            return { inv, oldestDate };
          })
          .sort((a, b) => a.oldestDate - b.oldestDate);

        // Distribute user-entered amount: oldest invoice gets paid first
        let remaining = Number(paymentForm.amount);
        insertRows = invWithPriority
          .filter(({ inv }) => inv != null)
          .map(({ inv }) => {
            const allocated = Math.min(
              Number(inv!.total_amount || 0),
              remaining > 0 ? remaining : 0,
            );
            remaining -= allocated;
            return {
              vendor_id: id,
              invoice_id: inv!.id,
              amount: allocated,
              payment_date: paymentForm.date,
              note: paymentForm.note || null,
              payment_number: paymentNumber,
              account_id: paymentForm.account_id || null,
            };
          });
      } else {
        insertRows = [
          {
            vendor_id: id,
            amount: Number(paymentForm.amount),
            payment_date: paymentForm.date,
            note: paymentForm.note || null,
            payment_number: paymentNumber,
            account_id: paymentForm.account_id || null,
          },
        ];
      }

      // Remove rows where no amount was allocated (e.g. amount ran out before this invoice)
      insertRows = insertRows.filter((row) => row.amount > 0);

      // Auto-mark jobs COMPLETED — only for invoices that received their full amount
      const jobIdsToComplete: string[] = [];
      for (const row of insertRows) {
        if (!row.invoice_id) continue;
        const inv = savedInvoices.find((i) => i.id === row.invoice_id);
        if (
          inv?.job_ids?.length &&
          Number(row.amount) >= Number(inv.total_amount || 0)
        ) {
          jobIdsToComplete.push(...inv.job_ids);
        }
      }

      let newPayments: any[] = [];
      const { data, error } = await (supabase.from("vendor_payments") as any)
        .insert(insertRows)
        .select(
          "*, job:jobs(id, service:services(name)), invoice:vendor_invoices(id, invoice_number)",
        );
      if (error) throw error;
      newPayments = data || [];

      if (jobIdsToComplete.length > 0) {
        await (supabase.from("jobs") as any)
          .update({
            status: "COMPLETED",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in("id", jobIdsToComplete);

        setRecentJobs((prev) =>
          prev.map((j) =>
            jobIdsToComplete.includes(j.id) ? { ...j, status: "COMPLETED" } : j,
          ),
        );
      }

      setPayments([...newPayments, ...payments]);
      setShowPaymentModal(false);
      setPaymentForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
        invoice_ids: [],
        account_id:
          accounts.find((a) => a.is_default)?.id || accounts[0]?.id || "",
      });
      const msg =
        jobIdsToComplete.length > 0
          ? `Payment saved & ${jobIdsToComplete.length} job${jobIdsToComplete.length > 1 ? "s" : ""} marked complete!`
          : "Payment recorded successfully";
      showNotification(msg);
    } catch (error: any) {
      console.error("Error adding payment:", error);
      showNotification(error.message || "Failed to add payment", "error");
    }
  };

  const handleDeletePayment = async (paymentIds: string[]) => {
    try {
      const { error } = await (supabase.from("vendor_payments") as any)
        .delete()
        .in("id", paymentIds);

      if (error) throw error;

      setPayments(payments.filter((p) => !paymentIds.includes(p.id)));
      showNotification("Payment deleted successfully");
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      showNotification("Failed to delete payment", "error");
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await (supabase.from("vendor_invoices") as any)
        .select("*")
        .eq("vendor_id", id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("vendor_invoices table not ready:", error.message);
        return;
      }
      setSavedInvoices(data || []);
    } catch (err) {
      console.error("fetchInvoices error:", err);
    }
  };

  const handleSaveInvoice = async () => {
    if (invoiceJobIds.length === 0) {
      showNotification("Select at least one job", "error");
      return;
    }
    setIsSavingInvoice(true);
    try {
      let invoiceNumber: string;
      let saveError: any;

      if (editingInvoiceId) {
        // UPDATE existing invoice
        invoiceNumber =
          savedInvoices.find((i) => i.id === editingInvoiceId)
            ?.invoice_number || "";
        const { error } = await (supabase.from("vendor_invoices") as any)
          .update({
            note: invoiceNote || null,
            job_ids: invoiceJobIds,
            total_amount: invoiceTotalAmount,
            net_total: invoiceTotalAmount,
          })
          .eq("id", editingInvoiceId);
        saveError = error;
      } else {
        // INSERT new invoice
        const _now = new Date();
        const _yyyymmdd =
          _now.getFullYear().toString() +
          String(_now.getMonth() + 1).padStart(2, "0") +
          String(_now.getDate()).padStart(2, "0");
        const _seq = String(savedInvoices.length + 1).padStart(4, "0");
        invoiceNumber = `INV-${_yyyymmdd}-${_seq}`;
        const { error } = await (
          supabase.from("vendor_invoices") as any
        ).insert({
          vendor_id: id,
          invoice_number: invoiceNumber,
          note: invoiceNote || null,
          job_ids: invoiceJobIds,
          total_amount: invoiceTotalAmount,
          net_total: invoiceTotalAmount,
        });
        saveError = error;
      }

      if (saveError) {
        // Extract full Supabase error details
        const detail =
          saveError.message ||
          saveError.details ||
          saveError.hint ||
          saveError.code ||
          JSON.stringify(saveError);
        console.error("Save invoice error:", {
          message: saveError.message,
          details: saveError.details,
          hint: saveError.hint,
          code: saveError.code,
        });
        showNotification(
          detail.includes("relation") || detail.includes("does not exist")
            ? "Table not found ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â run the SQL migration in Supabase first"
            : detail || "Failed to save invoice",
          "error",
        );
        return;
      }
      await fetchInvoices();
      showNotification(
        editingInvoiceId
          ? `Invoice ${invoiceNumber} updated!`
          : `Invoice ${invoiceNumber} saved!`,
      );
      closeInvoiceModal();
    } catch (err: any) {
      const detail = err?.message || err?.details || JSON.stringify(err);
      console.error("Save invoice catch error:", err);
      showNotification(detail || "Failed to save invoice", "error");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await (supabase.from("vendor_invoices") as any)
        .delete()
        .eq("id", invoiceId);
      if (error) throw error;
      setSavedInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      showNotification("Invoice deleted");
    } catch (err: any) {
      showNotification(err.message || "Failed to delete", "error");
    }
  };

  useEffect(() => {
    fetchData();
    fetchPayments();
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner className="py-24" />;
  if (!vendor)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
        <p className="text-gray-500 font-medium text-sm">Vendor not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-indigo-600 font-medium flex items-center text-sm hover:text-indigo-700"
        >
          <ArrowLeft size={16} className="mr-2" /> Go Back
        </button>
      </div>
    );

  const selectedInvoiceJobs = recentJobs.filter((j) =>
    invoiceJobIds.includes(j.id),
  );
  const filteredJobsForInvoice = recentJobs.filter((j) => {
    const ps = getJobPaymentStatus(j.id);
    if (ps === "Paid") return false;
    return (j.service?.name || "")
      .toLowerCase()
      .includes(jobSearchQuery.toLowerCase());
  });
  // For Partially Paid jobs use remaining amount, for others use full amount
  const invoiceTotalAmount = selectedInvoiceJobs.reduce(
    (s, j) => s + getJobRemainingAmount(j.id),
    0,
  );
  const invoiceTotalCommission = selectedInvoiceJobs.reduce(
    (s, j) => s + Number(j.commission_amount || 0),
    0,
  );

  // Returns total paid amount for a specific invoice
  // Returns how much has been paid toward an invoice, based on each job's paid amount
  const getInvoicePaidAmount = (invoiceId: string): number => {
    const inv = savedInvoices.find((i) => i.id === invoiceId);
    if (!inv) return 0;
    return (inv.job_ids || []).reduce((sum: number, jobId: string) => {
      const job = recentJobs.find((j) => j.id === jobId);
      if (!job) return sum;
      return sum + getJobTotalPaid(jobId);
    }, 0);
  };

  // Group payments by payment_number for list view (one row per payment session)
  const groupedPayments = (() => {
    const seen = new Set<string>();
    const result: any[] = [];
    for (const p of payments) {
      const key = p.payment_number || p.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const group = p.payment_number
        ? payments.filter((r) => r.payment_number === p.payment_number)
        : [p];
      const latestTs = Math.max(
        ...group.map((r) => {
          const raw = r.created_at || r.payment_date;
          const ts = raw ? new Date(raw).getTime() : 0;
          return Number.isNaN(ts) ? 0 : ts;
        }),
      );
      result.push({
        ...p,
        _totalAmount: group.reduce((s, r) => s + Number(r.amount || 0), 0),
        _invoiceNumbers: group
          .map((r) => r.invoice?.invoice_number)
          .filter(Boolean) as string[],
        _allIds: group.map((r) => r.id) as string[],
        _sortTs: latestTs,
      });
    }
    return result.sort((a, b) => (b._sortTs || 0) - (a._sortTs || 0));
  })();
  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-4 py-6 lg:px-6">
        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all shadow-sm shrink-0"
            >
              <ArrowLeft size={18} />
            </button>

            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {vendor.studio_name}
            </h1>

            <div className="hidden sm:block h-6 w-px bg-gray-200"></div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <User size={14} className="mr-1.5 text-gray-400" />
                <span>{vendor.contact_person}</span>
              </div>
              <div className="flex items-center">
                <Smartphone size={14} className="mr-1.5 text-gray-400" />
                <span>{vendor.mobile}</span>
              </div>
              {vendor.email && (
                <div className="flex items-center">
                  <Mail size={14} className="mr-1.5 text-gray-400" />
                  <span>{vendor.email}</span>
                </div>
              )}
              {vendor.location && (
                <div className="flex items-center">
                  <MapPin size={14} className="mr-1.5 text-gray-400" />
                  <span>{vendor.location}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleOpenEditModal}
            className="w-10 h-10 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center shrink-0"
            title="Edit Vendor"
          >
            <Edit2 size={18} />
          </button>
        </div>

        <div className="max-w-full mx-auto pb-4 space-y-6">
          {/* Studio Notes */}
          {vendor.notes && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">
                  Studio Notes :{" "}
                </span>{" "}
                {vendor.notes}
              </p>
            </div>
          )}

          {/* Tab Bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-1 bg-white p-1.5 rounded-lg border border-gray-200 w-fit shadow-sm">
              <button
                onClick={() => setActiveTab("jobs")}
                className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 rounded-md transition-all ${
                  activeTab === "jobs"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                }`}
              >
                <LayoutList size={16} />
                <span>Job History</span>
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 rounded-md transition-all ${
                  activeTab === "payments"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                }`}
              >
                <Wallet size={16} />
                <span>Payment</span>
              </button>
              <button
                onClick={() => setActiveTab("invoice")}
                className={`px-4 py-2 text-sm font-medium flex items-center space-x-2 rounded-md transition-all ${
                  activeTab === "invoice"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-indigo-600"
                }`}
              >
                <Receipt size={16} />
                <span>Invoice</span>
              </button>
            </div>
          </div>

          {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ JOB HISTORY TAB ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
          {activeTab === "jobs" && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">
                  Job History
                </h2>
                <div className="bg-indigo-600 px-3 py-1 rounded-md text-white text-xs font-medium">
                  {recentJobs.length} Jobs
                </div>
              </div>

              <Table
                columns={[
                  { key: "service", header: "Service" },
                  { key: "staff", header: "Staff" },
                  { key: "due_date", header: "Due Date" },
                  { key: "status", header: "Status" },
                  { key: "payment_status", header: "Payment Status" },
                  { key: "amount", header: "Amount", align: "right" },
                  { key: "commission", header: "Commission", align: "right" },
                ]}
                data={recentJobs}
                emptyIcon={
                  <ClipboardList size={20} className="text-gray-400" />
                }
                emptyMessage="No jobs associated with this studio yet."
                onRowClick={(job) => {
                  setSelectedJob({ ...job, vendor });
                  setShowViewModal(true);
                }}
                renderCell={(col, job) => {
                  if (col.key === "service")
                    return (
                      <span className="font-medium text-gray-900">
                        {job.service?.name}
                      </span>
                    );
                  if (col.key === "staff")
                    return (
                      <div className="flex items-center text-gray-600">
                        <User
                          size={13}
                          className="mr-1.5 text-gray-400 shrink-0"
                        />
                        {job.staff?.name || "Unassigned"}
                      </div>
                    );
                  if (col.key === "due_date")
                    return (
                      <div className="flex items-center text-gray-600">
                        <Calendar
                          size={13}
                          className="mr-1.5 text-gray-400 shrink-0"
                        />
                        {new Date(job.job_due_date).toLocaleDateString(
                          "en-IN",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </div>
                    );
                  if (col.key === "status")
                    return (
                      <Badge color={getStatusColor(job.status) as any}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    );
                  if (col.key === "payment_status") {
                    const ps = getJobPaymentStatus(job.id);
                    const styles =
                      ps === "Paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : ps === "Partially Paid"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-100 text-gray-500 border-gray-200";
                    return (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${styles}`}
                      >
                        {ps}
                      </span>
                    );
                  }
                  if (col.key === "amount")
                    return (
                      <span className="font-medium text-gray-900">
                        {formatCurrency(job.amount)}
                      </span>
                    );
                  if (col.key === "commission")
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 text-xs font-medium">
                        {formatCurrency(job.commission_amount)}
                      </span>
                    );
                  return null;
                }}
              />
            </div>
          )}

          {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ PAYMENT TAB ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
          {activeTab === "payments" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500">
                      Total Receivable
                    </h3>
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <Banknote size={20} />
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(paymentStats.totalPayable)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      Total Jobs
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500">
                      Total Paid
                    </h3>
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <Wallet size={20} />
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(paymentStats.totalPaid)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      Disbursed
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-500">
                      Pending Amount
                    </h3>
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                      <History size={20} />
                    </div>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-amber-600">
                      {formatCurrency(paymentStats.remaining)}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      Remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-900">
                    Payment History
                  </h2>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    <Plus size={16} />
                    <span>Add Payment</span>
                  </button>
                </div>

                <Table
                  columns={[
                    { key: "payment_number", header: "Payment #" },
                    { key: "date", header: "Date" },
                    { key: "amount", header: "Amount" },
                    { key: "invoice", header: "Invoice" },
                    { key: "note", header: "Note" },
                    { key: "actions", header: "Actions", align: "right" },
                  ]}
                  data={groupedPayments}
                  emptyMessage="No payments recorded yet."
                  onRowClick={(p) => setViewingPayment(p)}
                  renderCell={(col, payment) => {
                    if (col.key === "payment_number")
                      return payment.payment_number ? (
                        <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {payment.payment_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">—</span>
                      );
                    if (col.key === "date")
                      return (
                        <div className="flex items-center text-gray-600">
                          <Calendar size={13} className="mr-2 text-gray-400" />
                          {new Date(payment.payment_date).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </div>
                      );
                    if (col.key === "amount")
                      return (
                        <span className="font-medium text-gray-900">
                          {formatCurrency(
                            payment._totalAmount ?? payment.amount,
                          )}
                        </span>
                      );
                    if (col.key === "invoice") {
                      const nums = (payment._invoiceNumbers as string[]) ?? [];
                      if (nums.length === 0)
                        return (
                          <span className="text-gray-400 italic text-xs">
                            —
                          </span>
                        );
                      return (
                        <div className="flex flex-wrap gap-1">
                          {nums.map((n, i) => (
                            <span
                              key={`${n}-${i}`}
                              className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      );
                    }
                    if (col.key === "note")
                      return (
                        <span className="text-gray-600">
                          {payment.note || (
                            <span className="text-gray-400"></span>
                          )}
                        </span>
                      );
                    if (col.key === "actions")
                      return (
                        <Tooltip text="Delete Payment">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeletePaymentId(
                                payment._allIds ?? [payment.id],
                              );
                            }}
                            className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      );
                    return null;
                  }}
                />
              </div>
            </div>
          )}

          {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ INVOICE TAB ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
          {activeTab === "invoice" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Saved Invoices Table ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCheck size={16} className="text-indigo-600" />
                    <h2 className="text-base font-semibold text-gray-900">
                      Saved Invoices
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md font-medium">
                      {savedInvoices.length} Invoices
                    </span>
                    <button
                      onClick={() => setShowInvoiceModal(true)}
                      className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                    >
                      <Plus size={14} />
                      <span>Add Invoice</span>
                    </button>
                  </div>
                </div>
                <Table
                  columns={[
                    { key: "invoice_number", header: "Invoice #" },
                    { key: "date", header: "Date" },
                    { key: "jobs", header: "Jobs" },
                    { key: "net_total", header: "Total", align: "right" },
                    { key: "paid", header: "Paid", align: "right" },
                    { key: "action", header: "Action", align: "right" },
                  ]}
                  data={savedInvoices}
                  emptyMessage='No invoices saved yet. Click "Add Invoice" to create one.'
                  onRowClick={(inv) => setViewingInvoice(inv)}
                  renderCell={(col, inv) => {
                    if (col.key === "invoice_number")
                      return (
                        <span className="text-xs font-semibold text-gray-900 px-2 py-1 bg-indigo-50 rounded-md">
                          {inv.invoice_number}
                        </span>
                      );
                    if (col.key === "date")
                      return (
                        <span className="text-gray-600">
                          {new Date(inv.created_at).toLocaleDateString(
                            "en-IN",
                            { day: "2-digit", month: "short", year: "numeric" },
                          )}
                        </span>
                      );
                    if (col.key === "jobs")
                      return (
                        <span className="inline-flex items-center space-x-1 text-gray-600">
                          <CheckSquare size={13} className="text-indigo-500" />
                          <span>
                            {inv.job_ids?.length || 0} job
                            {(inv.job_ids?.length || 0) !== 1 ? "s" : ""}
                          </span>
                        </span>
                      );
                    if (col.key === "net_total")
                      return (
                        <span className="font-semibold text-indigo-700">
                          {formatCurrency(inv.total_amount)}
                        </span>
                      );
                    if (col.key === "paid") {
                      const paid = getInvoicePaidAmount(inv.id);
                      const isPaid = paid >= Number(inv.total_amount || 0);
                      const isPartial = paid > 0 && !isPaid;
                      return (
                        <span
                          className={`font-semibold ${
                            isPaid
                              ? "text-emerald-600"
                              : isPartial
                                ? "text-amber-600"
                                : "text-gray-400"
                          }`}
                        >
                          {paid > 0 ? formatCurrency(paid) : "—"}
                        </span>
                      );
                    }
                    if (col.key === "action")
                      return (
                        <div className="flex items-center justify-end space-x-1">
                          <Tooltip text="Edit Invoice">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditInvoiceModal(inv);
                              }}
                              className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                            >
                              <Edit2 size={13} />
                            </button>
                          </Tooltip>
                          <Tooltip text="Print Invoice">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintSavedInvoice(inv);
                              }}
                              className="w-7 h-7 flex items-center justify-center text-emerald-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                            >
                              <Printer size={13} />
                            </button>
                          </Tooltip>
                          <Tooltip text="Delete Invoice">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteInvoiceId(inv.id);
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
            </div>
          )}
        </div>
      </div>

      {/*  Invoice Detail Modal  */}
      <InvoiceDetailModal
        isOpen={viewingInvoice !== null}
        onClose={() => setViewingInvoice(null)}
        invoice={viewingInvoice}
        vendor={vendor}
        jobs={recentJobs}
        getJobRemainingAmount={getJobRemainingAmount}
        onEdit={(inv) => {
          setViewingInvoice(null);
          openEditInvoiceModal(inv);
        }}
        onPrint={(inv) => {
          setViewingInvoice(null);
          handlePrintSavedInvoice(inv);
        }}
      />

      {/*  Add Invoice Modal  */}
      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={closeInvoiceModal}
        editingInvoiceId={editingInvoiceId}
        vendor={vendor}
        invoiceJobIds={invoiceJobIds}
        invoiceNote={invoiceNote}
        setInvoiceNote={setInvoiceNote}
        jobSearchQuery={jobSearchQuery}
        setJobSearchQuery={setJobSearchQuery}
        showJobDropdown={showJobDropdown}
        setShowJobDropdown={setShowJobDropdown}
        toggleInvoiceJob={toggleInvoiceJob}
        handleSaveInvoice={handleSaveInvoice}
        isSavingInvoice={isSavingInvoice}
        selectedInvoiceJobs={selectedInvoiceJobs}
        filteredJobsForInvoice={filteredJobsForInvoice}
        invoiceTotalAmount={invoiceTotalAmount}
        invoiceTotalCommission={invoiceTotalCommission}
        getStatusLabel={getStatusLabel}
        getJobRemainingAmount={getJobRemainingAmount}
      />

      {/*  Print Invoice Modal  */}
      <PrintInvoiceModal
        isOpen={showPrintInvoiceModal}
        onClose={() => setShowPrintInvoiceModal(false)}
        invoice={printInvoiceData}
        vendor={vendor}
        recentJobs={recentJobs}
      />

      {/* Job View Modal */}
      <JobViewModal
        isOpen={showViewModal}
        job={selectedJob}
        onClose={() => setShowViewModal(false)}
        handleStatusUpdate={handleStatusUpdate}
      />

      {/* Payment Detail Modal */}
      <PaymentDetailModal
        isOpen={viewingPayment !== null}
        onClose={() => setViewingPayment(null)}
        payment={viewingPayment}
        payments={payments}
        savedInvoices={savedInvoices}
        vendor={vendor}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        handleAddPayment={handleAddPayment}
        savedInvoices={savedInvoices}
        recentJobs={recentJobs}
        payments={payments}
        accounts={accounts}
        getInvoicePaidAmount={getInvoicePaidAmount}
      />

      {/* Edit Vendor Modal */}
      <VendorForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateVendor}
        formData={editFormData}
        setFormData={setEditFormData}
        isEditing={true}
        isLoading={isSubmitting}
      />

      {/* Delete Payment Confirmation */}
      <ConfirmationDialog
        open={!!confirmDeletePaymentId}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (confirmDeletePaymentId)
            handleDeletePayment(confirmDeletePaymentId);
          setConfirmDeletePaymentId(null);
        }}
        onCancel={() => setConfirmDeletePaymentId(null)}
      />

      {/* Delete Invoice Confirmation */}
      <ConfirmationDialog
        open={!!confirmDeleteInvoiceId}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (confirmDeleteInvoiceId)
            handleDeleteInvoice(confirmDeleteInvoiceId);
          setConfirmDeleteInvoiceId(null);
        }}
        onCancel={() => setConfirmDeleteInvoiceId(null)}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl border ${
              notification.type === "success"
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "bg-rose-500 border-rose-400 text-white"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 size={18} className="text-white" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                !
              </div>
            )}
            <p className="text-[11px] font-black uppercase tracking-widest">
              {notification.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
