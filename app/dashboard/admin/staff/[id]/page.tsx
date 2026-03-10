"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  Mail,
  Smartphone,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Percent,
  ExternalLink,
  X,
  Eye,
  AlertCircle,
  Zap,
  ClipboardList,
  Clock,
  MapPin,
  FileText,
  Edit2,
  LayoutList,
  CreditCard,
  Plus,
  Trash2,
  Wallet,
  History,
  Banknote,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { User, Service } from "@/types/database";
import Badge from "@/components/Badge";
import Tooltip from "@/components/Tooltip";
import StaffForm from "@/components/StaffForm";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "USER" as "ADMIN" | "MANAGER" | "USER",
  });
  const [editCommissions, setEditCommissions] = useState<
    { serviceId: string; percentage: number; paymentType: string }[]
  >([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    totalEarnt: 0,
  });

  // Payment State
  const [activeTab, setActiveTab] = useState<"jobs" | "payments">("jobs");
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    amount: "",
    month: new Date().toISOString().slice(0, 7),
  });
  const [salarySubmitting, setSalarySubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    account_id: "",
  });
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    remaining: 0,
    salaryPaid: 0,
    advancePaid: 0,
  });
  const [accounts, setAccounts] = useState<
    { id: string; account_name: string; is_default: boolean }[]
  >([]);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<
    string | null
  >(null);

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
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

      // Update local state
      setJobs((prev) =>
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
      // Fetch User
      const { data: userData, error: userError } = await (
        supabase.from("users") as any
      )
        .select("*")
        .eq("id", id)
        .single();

      if (userError) throw userError;
      setUser(userData);

      // Fetch Commissions
      const { data: commData, error: commError } = await (
        supabase.from("staff_service_configs") as any
      )
        .select("*, services(name)")
        .eq("staff_id", id);

      if (commError) throw commError;
      setCommissions(commData || []);

      // Fetch Jobs
      const { data: jobsData, error: jobsError } = await (
        supabase.from("jobs") as any
      )
        .select(
          "*, services(name), vendors(id, studio_name, contact_person, mobile, email)",
        )
        .eq("staff_id", id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Calculate Stats
      const completed = (jobsData || []).filter(
        (j: any) => j.status === "COMPLETED",
      );

      // Total commission from ALL jobs (pending + completed) = total payable to staff
      const totalAllComm = (jobsData || []).reduce(
        (sum: number, j: any) => sum + Number(j.commission_amount || 0),
        0,
      );

      setStats({
        totalJobs: (jobsData || []).length,
        completedJobs: completed.length,
        totalEarnt: totalAllComm,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await (supabase.from("staff_payments") as any)
        .select("*")
        .eq("staff_id", id)
        .order("payment_date", { ascending: false });

      if (error) {
        // If table doesn't exist yet, we just ignore for now to prevent crashing
        console.warn(
          "Could not fetch payments (table might be missing):",
          error,
        );
        return;
      }

      setPayments(data || []);
    } catch (err) {
      console.error("Error in fetchPayments:", err);
    }
  };

  useEffect(() => {
    if (user && stats) {
      const totalPaid = payments.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0,
      );
      const salaryPaid = payments
        .filter((p) => p.payment_type === "salary")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const advancePaid = payments
        .filter((p) => p.payment_type !== "salary")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      setPaymentStats({
        totalPaid,
        remaining: stats.totalEarnt - totalPaid,
        salaryPaid,
        advancePaid,
      });
    }
  }, [payments, stats, user]);

  const fetchAccounts = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/accounting/accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        setAccounts(json.data);
        // Pre-select default account
        const def = json.data.find((a: any) => a.is_default) || json.data[0];
        if (def) {
          setPaymentForm((prev) => ({ ...prev, account_id: def.id }));
        }
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.amount) return;

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const { data, error } = await (supabase.from("staff_payments") as any)
        .insert({
          staff_id: id,
          amount: Number(paymentForm.amount),
          payment_date: paymentForm.date,
          note: paymentForm.note,
          account_id: paymentForm.account_id || null,
          created_by: currentUser?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setPayments([data, ...payments]);
      setShowPaymentModal(false);
      const def = accounts.find((a) => a.is_default) || accounts[0];
      setPaymentForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
        account_id: def?.id || "",
      });
      showNotification("Payment added successfully");
    } catch (error: any) {
      console.error("Error adding payment:", error);
      showNotification(error.message || "Failed to add payment", "error");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await (supabase.from("staff_payments") as any)
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      setPayments(payments.filter((p) => p.id !== paymentId));
      showNotification("Payment deleted successfully");
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      showNotification("Failed to delete payment", "error");
    }
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryForm.amount) return;
    setSalarySubmitting(true);
    try {
      const [year, month] = salaryForm.month.split("-");
      const monthLabel = new Date(
        Number(year),
        Number(month) - 1,
        1,
      ).toLocaleString("en-IN", { month: "long", year: "numeric" });

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const { data, error } = await (supabase.from("staff_payments") as any)
        .insert({
          staff_id: id,
          amount: Number(salaryForm.amount),
          payment_date: `${salaryForm.month}-01`,
          note: `Staff Salary - ${monthLabel}`,
          payment_type: "salary",
          account_id: paymentForm.account_id || null,
          created_by: currentUser?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      setPayments([data, ...payments]);
      setShowSalaryModal(false);
      setSalaryForm({
        amount: "",
        month: new Date().toISOString().slice(0, 7),
      });
      showNotification("Salary payment recorded successfully");
    } catch (error: any) {
      console.error("Error adding salary:", error);
      showNotification(error.message || "Failed to record salary", "error");
    } finally {
      setSalarySubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPayments();
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("name");
        if (!error && data) setServices(data);
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    fetchServices();
  }, []);

  const isSalaryStaff = commissions.some(
    (c: any) => c.payment_type === "salary",
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  if (!user)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
        <p className="text-gray-500 font-medium text-sm">User not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-indigo-600 font-medium flex items-center text-sm hover:text-indigo-700"
        >
          <ArrowLeft size={16} className="mr-2" /> Go Back
        </button>
      </div>
    );

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "rose";
      case "MANAGER":
        return "amber";
      case "USER":
      default:
        return "indigo";
    }
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
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
    setFormData({
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      password: "",
      role: (user.role || "USER") as "ADMIN" | "MANAGER" | "USER",
    });
    setEditCommissions(
      (commissions || []).map((comm) => ({
        serviceId: comm.service_id,
        percentage: Number(comm.commission_percent ?? comm.percentage ?? 0),
        paymentType: (comm as any).payment_type || "commission",
      })),
    );
    setShowPasswordField(false);
    setShowEditModal(true);
  };

  const handleAddCommission = () => {
    setEditCommissions([
      ...editCommissions,
      { serviceId: "", percentage: 0, paymentType: "commission" },
    ]);
  };

  const handleRemoveCommission = (index: number) => {
    const next = [...editCommissions];
    next.splice(index, 1);
    setEditCommissions(next);
  };

  const updateCommission = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const next = [...editCommissions];
    if (field === "serviceId") next[index].serviceId = value as string;
    if (field === "percentage") next[index].percentage = Number(value);
    if (field === "paymentType") next[index].paymentType = value as string;
    setEditCommissions(next);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const updateResponse = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          role: formData.role,
          password: formData.password || undefined,
        }),
      });

      if (!updateResponse.ok) {
        const result = await updateResponse.json();
        throw new Error(result.error || "Failed to update user");
      }

      await supabase.from("staff_service_configs").delete().eq("staff_id", id);

      if (editCommissions.length > 0) {
        const validCommissions = editCommissions
          .filter((c) => c.serviceId !== "")
          .map((c) => ({
            staff_id: id,
            service_id: c.serviceId,
            percentage: c.paymentType === "salary" ? 0 : c.percentage,
            payment_type: c.paymentType || "commission",
          }));

        if (validCommissions.length > 0) {
          const { error: commError } = await (
            supabase.from("staff_service_configs") as any
          ).insert(validCommissions);
          if (commError) throw commError;
        }
      }

      setShowEditModal(false);
      showNotification("User updated successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error updating user:", error);
      showNotification(
        error.message || "Error occurred while updating user.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-4 py-6 lg:px-6">
        {/* Header Section */}
        {/* Header Section */}
        {/* Header Section */}
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
              {user.name}
            </h1>

            <div className="hidden sm:block h-6 w-px bg-gray-200"></div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Mail size={14} className="mr-1.5 text-gray-400" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center">
                <Smartphone size={14} className="mr-1.5 text-gray-400" />
                <span>{user.mobile || "N/A"}</span>
              </div>
              <div className="flex items-center">
                <Badge color={getRoleColor(user.role) as any}>
                  {formatRole(user.role)}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenEditModal}
            className="w-10 h-10 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium flex items-center justify-center shrink-0"
          >
            <Edit2 size={18} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Commission Settings Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">Services : </span>{" "}
              {commissions.length === 0 ? (
                <span className="text-gray-500 italic">
                  No services configured
                </span>
              ) : (
                commissions.map((comm: any, index: number) => (
                  <span key={comm.id}>
                    {comm.services?.name}{" "}
                    {comm.payment_type === "salary" ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">
                        Salary
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                        {comm.percentage}%
                      </span>
                    )}
                    {index < commissions.length - 1 && " | "}
                  </span>
                ))
              )}
            </p>
          </div>

          <div className="flex items-center space-x-1 mb-6 bg-white p-1.5 rounded-lg border border-gray-200 w-fit shadow-sm">
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
              <span>Payment History</span>
            </button>
          </div>

          {/* Job History Section */}
          {activeTab === "jobs" && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h2 className="text-base font-semibold text-gray-900">
                  Job History
                </h2>
                <div className="bg-indigo-600 px-3 py-1 rounded-md text-white text-xs font-medium">
                  {jobs.length} Jobs
                </div>
              </div>

              <div className="overflow-x-auto">
                {jobs.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <ClipboardList size={20} />
                    </div>
                    <p className="text-sm text-gray-500">
                      No jobs assigned to this staff member yet.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Studio</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        {!isSalaryStaff && (
                          <th className="px-4 py-3 text-right">Commission</th>
                        )}
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {jobs.map((job) => (
                        <tr
                          key={job.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedJob({ ...job, staff: user });
                            setShowViewModal(true);
                          }}
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {job.services?.name}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (job.vendor_id)
                                  router.push(
                                    `/dashboard/admin/vendors/view/${job.vendor_id}`,
                                  );
                              }}
                            >
                              <Building2
                                size={13}
                                className="mr-1.5 text-gray-400 shrink-0"
                              />
                              {job.vendors?.studio_name || "Unknown"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div className="flex items-center">
                              <Calendar
                                size={13}
                                className="mr-1.5 text-gray-400 shrink-0"
                              />
                              {new Date(job.job_due_date).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge color={getStatusColor(job.status) as any}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(job.amount)}
                          </td>
                          {!isSalaryStaff && (
                            <td className="px-4 py-3 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 text-xs font-medium">
                                {formatCurrency(job.commission_amount)}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <Tooltip text="View Details" position="left">
                              <button
                                className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all mx-auto"
                                title="View Details"
                              >
                                <Eye size={14} />
                              </button>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Payment History Section */}
          {activeTab === "payments" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Payment Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isSalaryStaff ? (
                  <>
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">
                          Total Salary Paid
                        </h3>
                        <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                          <Banknote size={20} />
                        </div>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-violet-600">
                          {formatCurrency(paymentStats.salaryPaid)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          Salary
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">
                          Advance Paid
                        </h3>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                          <DollarSign size={20} />
                        </div>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-indigo-600">
                          {formatCurrency(paymentStats.advancePaid)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          Advance
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">
                          Total Disbursed
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
                          All Payments
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-500">
                          Total Payable
                        </h3>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                          <Banknote size={20} />
                        </div>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-gray-900">
                          {formatCurrency(stats.totalEarnt)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          Total Earnings
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
                  </>
                )}
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                  <h2 className="text-base font-semibold text-gray-900">
                    Payment History
                  </h2>
                  <div className="flex items-center space-x-2">
                    {isSalaryStaff && (
                      <button
                        onClick={() => setShowSalaryModal(true)}
                        className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                      >
                        <Banknote size={16} />
                        <span>Pay Salary</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    >
                      <Plus size={16} />
                      <span>Add Payment</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Note</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No payments recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <Calendar
                                  size={14}
                                  className="mr-2 text-gray-400"
                                />
                                {new Date(
                                  payment.payment_date,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <div className="flex items-center space-x-2">
                                {payment.payment_type === "salary" && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700 shrink-0">
                                    Salary
                                  </span>
                                )}
                                <span>{payment.note || "-"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() =>
                                  setConfirmDeletePaymentId(payment.id)
                                }
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                title="Delete Payment"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Banknote size={18} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Pay Salary
                </h3>
              </div>
              <button
                onClick={() => setShowSalaryModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSalary} className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="salary-month"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Month
                </label>
                <input
                  id="salary-month"
                  type="month"
                  title="Select month"
                  value={salaryForm.month}
                  onChange={(e) =>
                    setSalaryForm({ ...salaryForm, month: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm h-10 border px-3"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="salary-amount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Salary Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    id="salary-amount"
                    type="number"
                    value={salaryForm.amount}
                    onChange={(e) =>
                      setSalaryForm({ ...salaryForm, amount: e.target.value })
                    }
                    className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm h-10 border"
                    placeholder="0.00"
                    required
                    min="1"
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account
                  </label>
                  <select
                    title="Select account"
                    value={paymentForm.account_id}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        account_id: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm h-10 border px-3 bg-white"
                  >
                    <option value="">Select account…</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name}
                        {acc.is_default ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSalaryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={salarySubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60"
                >
                  {salarySubmitting ? "Saving…" : "Record Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
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

              {accounts.length > 0 && (
                <div>
                  <label
                    htmlFor="payment-account"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Account
                  </label>
                  <select
                    id="payment-account"
                    title="Select account"
                    value={paymentForm.account_id}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        account_id: e.target.value,
                      })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border px-3 bg-white"
                  >
                    <option value="">Select account…</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name}
                        {acc.is_default ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={paymentForm.note}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, note: e.target.value })
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-10 border px-3"
                  placeholder="e.g. advance, settlement"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setShowViewModal(false)}
          />
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                  <ClipboardList size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 leading-none mb-1">
                    {selectedJob.services?.name}
                  </h2>
                  <div className="flex items-center text-xs text-gray-500">
                    <Building2 size={12} className="mr-1.5 text-gray-400" />
                    {selectedJob.vendors?.studio_name}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 rounded-md transition-all"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Side */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        General Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                            <UserIcon size={16} />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-medium text-gray-600">
                              Assigned To
                            </span>
                            <span className="text-sm font-normal text-gray-900 truncate">
                              {selectedJob.staff?.name || "Unassigned"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                            <Building2 size={16} />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-medium text-gray-600">
                              Studio Contact
                            </span>
                            <div className="flex flex-col">
                              <span className="text-sm font-normal text-gray-900 truncate">
                                {selectedJob.vendors?.contact_person || "N/A"}
                              </span>
                              {selectedJob.vendors?.email && (
                                <span className="text-xs text-gray-600 leading-none mt-0.5">
                                  {selectedJob.vendors?.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <FileText size={14} className="mr-2 text-indigo-500" />
                        Work Description
                      </h3>
                      <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                        <p className="text-sm font-normal text-gray-900 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                          {selectedJob.description ||
                            "No description provided."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        Location
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <div className="w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                            <MapPin size={16} />
                          </div>
                          <div className="flex flex-col min-w-0 pt-0.5">
                            <span className="text-xs font-medium text-gray-600 mb-1">
                              Job Data Location
                            </span>
                            <span className="text-sm font-normal text-gray-900 whitespace-pre-wrap leading-tight break-words overflow-wrap-anywhere">
                              {selectedJob.data_location || "Pending"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-md border border-indigo-200">
                          <div className="w-8 h-8 rounded-md bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                            <ExternalLink size={16} />
                          </div>
                          <div className="flex flex-col min-w-0 pt-0.5">
                            <span className="text-xs font-medium text-indigo-600 mb-1">
                              Job Final Location
                            </span>
                            <span className="text-sm font-normal text-indigo-900 whitespace-pre-wrap leading-tight break-words overflow-wrap-anywhere">
                              {selectedJob.final_location || "Pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side (Financials & Date) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-gray-50 rounded-md border border-gray-200 p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        Production Status
                      </h3>
                      <div className="space-y-2">
                        <button
                          onClick={() =>
                            handleStatusUpdate(selectedJob.id, "PENDING")
                          }
                          className={`w-full py-2 px-4 flex items-center justify-center rounded-md transition-all space-x-2 border ${selectedJob.status === "PENDING" ? "bg-amber-400 text-white border-amber-500" : "bg-white text-gray-600 border-gray-300"}`}
                        >
                          <Clock size={12} />
                          <span className="text-xs font-medium">Pending</span>
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(selectedJob.id, "IN_PROGRESS")
                          }
                          className={`w-full py-2 px-4 flex items-center justify-center rounded-md transition-all space-x-2 border ${selectedJob.status === "IN_PROGRESS" ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-gray-600 border-gray-300"}`}
                        >
                          <Zap size={12} />
                          <span className="text-xs font-medium">
                            In-Progress
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            handleStatusUpdate(selectedJob.id, "COMPLETED")
                          }
                          className={`w-full py-2 px-4 flex items-center justify-center rounded-md transition-all space-x-2 border ${selectedJob.status === "COMPLETED" ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300"}`}
                        >
                          <CheckCircle2 size={12} />
                          <span className="text-xs font-medium">Complete</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        Production Deadline
                      </p>
                      <div className="flex items-center space-x-2">
                        <Calendar className="text-rose-500" size={14} />
                        <p className="text-base font-medium text-rose-600">
                          {new Date(
                            selectedJob.job_due_date,
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <h3 className="text-xs font-medium text-gray-600 mb-2">
                        Financial Summary
                      </h3>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xl font-medium text-gray-900">
                            {formatCurrency(selectedJob.amount)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-600 mb-0.5">
                            Commission
                          </p>
                          <div className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 text-xs font-medium">
                            +{formatCurrency(selectedJob.commission_amount)}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                          Total Invoice
                        </span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatCurrency(Number(selectedJob.amount || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <StaffForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateUser}
        modalMode="edit"
        showPasswordField={showPasswordField}
        onShowPasswordField={() => setShowPasswordField(true)}
        formData={formData}
        setFormData={setFormData}
        services={services}
        commissions={editCommissions}
        onAddCommission={handleAddCommission}
        onRemoveCommission={handleRemoveCommission}
        onUpdateCommission={updateCommission}
        submitting={submitting}
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

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-8 right-8 z-[100] flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-500 animate-in slide-in-from-bottom-10 ${notification.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}
    </div>
  );
}
