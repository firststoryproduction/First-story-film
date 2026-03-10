"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Calendar,
  Building2,
  Edit2,
  ClipboardList,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  FileText,
  User as UserIcon,
  Save,
  ArrowLeft,
  Mail,
  Smartphone,
  MapPin,
  DollarSign,
  Briefcase,
  FileSearch,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import {
  Job,
  Service,
  Vendor,
  User as StaffUser,
} from "../../../../types/database";
import {
  formatCurrency,
  getStatusColor,
  getStatusLabel,
  calculateCommission,
} from "../../../../lib/utils";
import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import Tooltip from "../../../../components/Tooltip";
import AestheticSelect from "../../../../components/AestheticSelect";
import ConfirmationDialog from "../../../../components/ConfirmationDialog";
import SearchableSelect from "../../../../components/SearchableSelect";
import Badge from "../../../../components/Badge";
import VendorForm from "../../../../components/VendorForm";

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Filter States
  const [filterJobType, setFilterJobType] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [filterVendor, setFilterVendor] = useState("");

  // Sort State
  const [sortBy, setSortBy] = useState<{
    field: "staff_due_date" | "job_due_date" | "status" | null;
    direction: "asc" | "desc";
  }>({ field: null, direction: "desc" });

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Vendor Modal States
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({
    studio_name: "",
    contact_person: "",
    mobile: "",
    email: "",
    location: "",
    notes: "",
  });

  // Form Data States for Create/Edit
  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allStaff, setAllStaff] = useState<StaffUser[]>([]);
  const [filteredStaffList, setFilteredStaffList] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [staffPercentage, setStaffPercentage] = useState<number>(0);
  const [isCommissionManuallySet, setIsCommissionManuallySet] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    data_location: "",
    final_location: "",
    job_due_date: "",
    staff_due_date: "",
    amount: 0,
    commission_amount: 0,
    status: "PENDING",
  });

  const showNotification = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Single initialization effect
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!mounted) return;
        await Promise.allSettled([fetchJobs(), fetchCommonData()]);
      } catch (error) {
        console.error("JobsPage: Error initializing:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // REMOVED: Tab visibility change handler
    // User doesn't want data to refresh when switching tabs

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Re-fetch jobs when pagination, search, filters, or sort changes
  useEffect(() => {
    // Skip initial render (handled by init effect above)
    if (loading) return;

    setLoading(true);
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    searchTerm,
    filterJobType,
    filterAssignedTo,
    filterVendor,
    sortBy,
  ]);

  const fetchJobs = async () => {
    try {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      let query = supabase.from("jobs").select(
        `
                    *,
                    service:services(name),
                    vendor:vendors(studio_name, contact_person, mobile, email),
                    staff:users(name, email, mobile)
                `,
        { count: "exact" },
      );

      // Search only in description
      if (searchTerm) {
        query = query.ilike("description", `%${searchTerm}%`);
      }

      // Apply filters
      if (filterJobType) {
        query = query.eq("service_id", filterJobType);
      }
      if (filterAssignedTo) {
        query = query.eq("staff_id", filterAssignedTo);
      }
      if (filterVendor) {
        query = query.eq("vendor_id", filterVendor);
      }

      // Apply sorting
      if (sortBy.field) {
        query = query.order(sortBy.field, {
          ascending: sortBy.direction === "asc",
        });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error, count } = await query.range(start, end);

      if (error) throw error;
      setJobs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommonData = async () => {
    try {
      await supabase.auth.getUser();
      const [sRes, vRes, staffRes] = await Promise.all([
        supabase.from("services").select("*").order("name"),
        supabase.from("vendors").select("*").order("studio_name"),
        supabase.from("users").select("id, name").order("name"),
      ]);

      if (sRes.data) setServices(sRes.data);
      if (vRes.data) setVendors(vRes.data);
      if (staffRes.data) setAllStaff(staffRes.data);
    } catch (error) {
      console.error("Error fetching common data:", error);
    }
  };

  // Effect to fetch staff filtered by selected service
  useEffect(() => {
    const fetchStaffByService = async () => {
      if (!selectedService) {
        setFilteredStaffList([]);
        if (showCreateModal) setSelectedStaff("");
        return;
      }

      const [usersRes, configRes] = await Promise.all([
        supabase.from("users").select("id, name").order("name"),
        (supabase.from("staff_service_configs") as any)
          .select("staff_id, percentage, due_date")
          .eq("service_id", selectedService),
      ]);

      if (usersRes.data) {
        const configMap: Record<string, any> = {};
        (configRes.data || []).forEach((c: any) => {
          configMap[c.staff_id] = c;
        });
        const list = usersRes.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          default_percentage: configMap[u.id]?.percentage ?? 0,
          default_due_date: configMap[u.id]?.due_date ?? null,
        }));
        setFilteredStaffList(list);
      } else {
        setFilteredStaffList([]);
      }
    };

    fetchStaffByService();
  }, [selectedService, showCreateModal]);

  // Effect to auto-calculate commission when amount or percentage changes
  useEffect(() => {
    if (!isCommissionManuallySet && (showCreateModal || showEditModal)) {
      const autoCommission = calculateCommission(
        formData.amount,
        staffPercentage,
      );
      setFormData((prev) => ({
        ...prev,
        commission_amount: autoCommission,
      }));
    }
  }, [
    formData.amount,
    staffPercentage,
    isCommissionManuallySet,
    showCreateModal,
    showEditModal,
  ]);

  // Effect to set default commission when staff is selected
  useEffect(() => {
    if (selectedStaff && (showCreateModal || showEditModal)) {
      const staff = filteredStaffList.find((s) => s.id === selectedStaff);
      if (staff) {
        setStaffPercentage((staff as any).default_percentage || 0);

        if (showCreateModal && !formData.job_due_date) {
          const defaultDate = (staff as any).default_due_date;
          if (defaultDate) {
            const date = new Date(defaultDate);
            const localDateTime = date.toISOString().slice(0, 16);
            setFormData((prev) => ({ ...prev, job_due_date: localDateTime }));
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaff, filteredStaffList, showCreateModal, showEditModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      if (selectedJob && showEditModal) {
        await handleUpdateJob(e);
      } else {
        await handleCreateJob(e);
      }
    } catch (error) {
      console.error("Submission error:", error);
      showNotification("An unexpected error occurred.", "error");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    if (!selectedStaff || !formData.job_due_date) {
      showNotification("Please select a user and set a deadline.", "error");
      return;
    }

    try {
      const { error } = await (supabase.from("jobs") as any)
        .insert([
          {
            service_id: selectedService,
            vendor_id: selectedVendor || null,
            staff_id: selectedStaff,
            description: formData.description,
            data_location: formData.data_location,
            final_location: formData.final_location,
            job_due_date: new Date(formData.job_due_date).toISOString(),
            staff_due_date: formData.staff_due_date
              ? new Date(formData.staff_due_date).toISOString()
              : null,
            status: formData.status,
            amount: formData.amount,
            commission_amount: formData.commission_amount,
          },
        ])
        .select();

      if (error) throw error;
      showNotification("Job created successfully!");
      closeModal();
      fetchJobs();
    } catch (error: any) {
      console.error("Error creating job:", error);
      showNotification(
        error.message || "Error occurred while creating the job.",
        "error",
      );
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    try {
      const { error } = await (supabase.from("jobs") as any)
        .update({
          service_id: selectedService,
          vendor_id: selectedVendor || null,
          staff_id: selectedStaff,
          description: formData.description,
          data_location: formData.data_location,
          final_location: formData.final_location,
          job_due_date: new Date(formData.job_due_date).toISOString(),
          staff_due_date: formData.staff_due_date
            ? new Date(formData.staff_due_date).toISOString()
            : null,
          amount: formData.amount,
          commission_amount: formData.commission_amount,
          status: formData.status,
        })
        .eq("id", selectedJob.id);

      if (error) throw error;
      showNotification("Job updated successfully!");
      closeModal();
      fetchJobs();
    } catch (error: any) {
      console.error("Error updating job:", error);
      showNotification(
        error.message || "Error occurred while updating the job.",
        "error",
      );
    }
  };

  const resetFormData = () => {
    setFormData({
      description: "",
      data_location: "",
      final_location: "",
      job_due_date: "",
      staff_due_date: "",
      amount: 0,
      commission_amount: 0,
      status: "PENDING",
    });
    setSelectedService("");
    setSelectedVendor("");
    setSelectedStaff("");
    setStaffPercentage(0);
    setIsCommissionManuallySet(false);
  };

  // Vendor Management Functions
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No active session");
      }

      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(vendorFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create vendor");
      }

      const result = await response.json();
      showNotification("Vendor created successfully!");
      setShowVendorModal(false);
      resetVendorForm();

      // Refresh vendors list
      await fetchCommonData();

      // Auto-select the newly created vendor
      if (result && result.id) {
        setSelectedVendor(result.id);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while creating vendor.";
      console.error("Error creating vendor:", error);
      showNotification(message, "error");
    } finally {
      setModalLoading(false);
    }
  };

  const resetVendorForm = () => {
    setVendorFormData({
      studio_name: "",
      contact_person: "",
      mobile: "",
      email: "",
      location: "",
      notes: "",
    });
  };

  const openVendorForm = () => {
    resetVendorForm();
    setShowVendorModal(true);
  };

  const openEditModal = (job: any) => {
    setSelectedJob(job);
    setFormData({
      description: job.description || "",
      data_location: job.data_location || "",
      final_location: job.final_location || "",
      job_due_date: job.job_due_date
        ? new Date(job.job_due_date).toISOString().slice(0, 16)
        : "",
      staff_due_date: job.staff_due_date
        ? new Date(job.staff_due_date).toISOString().slice(0, 16)
        : "",
      amount: job.amount || 0,
      commission_amount: job.commission_amount || 0,
      status: job.status || "PENDING",
    });
    setSelectedService(job.service_id);
    setSelectedVendor(job.vendor_id || "");
    setSelectedStaff(job.staff_id || "");
    setIsCommissionManuallySet(true);

    // Find commission percentage from stats if possible, or just fetch again
    // For now, let the useEffect handle it when service/staff are set
    setShowEditModal(true);
  };

  const openViewModal = (job: any) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedJob(null);
    setModalLoading(false);
    resetFormData();
  };

  const handleStatusUpdate = async (jobId: string, newStatus: string) => {
    try {
      console.log(`Updating job ${jobId} to status ${newStatus}`);
      const { error } = await (supabase.from("jobs") as any)
        .update({
          status: newStatus,
          updated_at:
            newStatus === "COMPLETED" ? new Date().toISOString() : undefined,
          completed_at:
            newStatus === "COMPLETED" ? new Date().toISOString() : undefined,
          started_at:
            newStatus === "IN_PROGRESS" ? new Date().toISOString() : undefined,
        })
        .eq("id", jobId);

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      const statusLabels: { [key: string]: string } = {
        PENDING: "Pending",
        IN_PROGRESS: "In Progress",
        COMPLETED: "Complete",
      };
      showNotification(statusLabels[newStatus] || newStatus);

      // Local state update for immediate feedback
      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)),
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

  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteJobId) return;
    const jobId = deleteJobId;
    setDeleteJobId(null);
    try {
      const { error } = await (supabase.from("jobs") as any)
        .delete()
        .eq("id", jobId);

      if (error) throw error;

      showNotification("Job deleted successfully");
      setJobs((prevJobs) => prevJobs.filter((j) => j.id !== jobId));
    } catch (error) {
      console.error("Error deleting job:", error);
      showNotification("Failed to delete job", "error");
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedJobs = jobs;

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterJobType, filterAssignedTo, filterVendor]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 px-2">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black">Job Management</h1>
            </div>
          </div>
          <button
            onClick={() => {
              resetFormData();
              setShowCreateModal(true);
            }}
            className="px-5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 shrink-0"
          >
            <Plus size={14} />
            <span>Create New Job</span>
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Toolbar Inside Card */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-[280px] group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search by description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 h-9 bg-white border border-gray-300 rounded-lg text-xs font-normal focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* Filters - Job Type */}
              <div className="w-[160px]">
                <AestheticSelect
                  label=""
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Job Types" },
                    ...services.map((s) => ({ id: s.id, name: s.name })),
                  ]}
                  value={filterJobType}
                  onChange={setFilterJobType}
                  placeholder="All Job Types"
                />
              </div>

              {/* Filters - Staff */}
              <div className="w-[160px]">
                <AestheticSelect
                  label=""
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Staff" },
                    ...allStaff.map((s) => ({ id: s.id, name: s.name })),
                  ]}
                  value={filterAssignedTo}
                  onChange={setFilterAssignedTo}
                  placeholder="All Staff"
                />
              </div>

              {/* Filters - Vendor */}
              <div className="w-[160px]">
                <AestheticSelect
                  label=""
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "All Vendors" },
                    ...vendors.map((v) => ({ id: v.id, name: v.studio_name })),
                  ]}
                  value={filterVendor}
                  onChange={setFilterVendor}
                  placeholder="All Vendors"
                />
              </div>

              {/* Sort */}
              <div className="w-[160px]">
                <AestheticSelect
                  label=""
                  heightClass="h-9"
                  textSize="xs"
                  options={[
                    { id: "", name: "Sort By" },
                    { id: "staff_due_date", name: "Staff Due Date" },
                    { id: "job_due_date", name: "Job Due Date" },
                    { id: "status", name: "Status" },
                  ]}
                  value={sortBy.field || ""}
                  onChange={(val) =>
                    setSortBy({
                      field:
                        (val as "staff_due_date" | "job_due_date" | "status") ||
                        null,
                      direction: sortBy.direction,
                    })
                  }
                  placeholder="Sort By"
                />
              </div>

              {sortBy.field && (
                <button
                  onClick={() =>
                    setSortBy({
                      ...sortBy,
                      direction: sortBy.direction === "asc" ? "desc" : "asc",
                    })
                  }
                  className="h-9 w-9 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0"
                >
                  {sortBy.direction === "asc" ? (
                    <ArrowUp size={14} />
                  ) : (
                    <ArrowDown size={14} />
                  )}
                </button>
              )}
            </div>
          </div>

          <Table
            columns={[
              { key: "job_type", header: "Job Type", align: "left" },
              { key: "description", header: "Description", align: "left" },
              { key: "staff", header: "Staff", align: "left" },
              { key: "vendor", header: "Vendor", align: "left" },
              { key: "amount", header: "Amount", align: "left" },
              { key: "status", header: "Status", align: "center" },
              { key: "job_due_date", header: "Job Due Date", align: "left" },
              {
                key: "staff_due_date",
                header: "Staff Due Date",
                align: "left",
              },
              { key: "actions", header: "Actions", align: "right" },
            ]}
            data={paginatedJobs}
            loading={loading}
            emptyIcon={<ClipboardList size={28} className="text-slate-200" />}
            emptyMessage="No productions detected"
            onRowClick={(job) => openViewModal(job)}
            renderCell={(column, job, jIdx) => {
              if (column.key === "job_type") {
                return (
                  <div className="font-semibold text-slate-900 group-hover/row:text-indigo-600 transition-colors text-[14px] leading-none flex items-center group/name">
                    {job.service?.name}
                  </div>
                );
              }
              if (column.key === "description") {
                return (
                  <div className="text-[14px] text-slate-500 font-normal leading-relaxed max-w-[200px] line-clamp-2">
                    {job.description}
                  </div>
                );
              }
              if (column.key === "staff") {
                return (
                  <div className="text-[14px] font-semibold text-slate-900 group-hover/row:text-indigo-600 transition-colors flex items-center">
                    {job.staff?.name || "Unassigned"}
                  </div>
                );
              }
              if (column.key === "vendor") {
                return (
                  <div
                    className="text-[14px] text-slate-900 font-semibold flex items-center hover:text-indigo-600 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (job.vendor_id)
                        router.push(
                          `/dashboard/admin/vendors/view/${job.vendor_id}`,
                        );
                    }}
                  >
                    <Building2 size={14} className="mr-2 text-sky-400" />
                    {job.vendor?.studio_name || "N/A"}
                  </div>
                );
              }
              if (column.key === "amount") {
                return (
                  <div>
                    <div className="text-[14px] font-black text-slate-900">
                      {formatCurrency(job.amount)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">
                      Comm: {formatCurrency(job.commission_amount)}
                    </div>
                  </div>
                );
              }
              if (column.key === "status") {
                const getStatusDetails = (status: string) => {
                  switch (status) {
                    case "COMPLETED":
                      return {
                        color: "emerald",
                        icon: CheckCircle2,
                        label: "Complete",
                      };
                    case "IN_PROGRESS":
                      return { color: "blue", icon: Zap, label: "In Progress" };
                    case "PENDING":
                    default:
                      return { color: "amber", icon: Clock, label: "Pending" };
                  }
                };
                const { color, icon, label } = getStatusDetails(job.status);

                return (
                  <div className="flex justify-center">
                    <Badge color={color as any} icon={icon}>
                      {label}
                    </Badge>
                  </div>
                );
              }
              if (column.key === "job_due_date") {
                return (
                  <div className="text-[13px] text-slate-500 font-bold flex items-center">
                    <Calendar size={14} className="mr-2 text-amber-500" />{" "}
                    {new Date(job.job_due_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                );
              }
              if (column.key === "staff_due_date") {
                return (
                  <div className="text-[13px] text-slate-500 font-bold flex items-center">
                    <Calendar size={14} className="mr-2 text-blue-500" />{" "}
                    {job.staff_due_date
                      ? new Date(job.staff_due_date).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )
                      : "N/A"}
                  </div>
                );
              }
              if (column.key === "actions") {
                return (
                  <div
                    className="flex items-center justify-end space-x-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip text="Pending">
                      <button
                        onClick={() => handleStatusUpdate(job.id, "PENDING")}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === "PENDING" ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-slate-500 border-slate-100 hover:text-[#F59E0B] hover:border-amber-200"}`}
                      >
                        <Clock size={12} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                    <Tooltip text="In-Progress">
                      <button
                        onClick={() =>
                          handleStatusUpdate(job.id, "IN_PROGRESS")
                        }
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === "IN_PROGRESS" ? "bg-[#4F46E5] text-white border-[#4F46E5]" : "bg-white text-slate-500 border-slate-100 hover:text-[#4F46E5] hover:border-indigo-200"}`}
                      >
                        <Zap size={12} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Complete">
                      <button
                        onClick={() => handleStatusUpdate(job.id, "COMPLETED")}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === "COMPLETED" ? "bg-[#10B981] text-white border-[#10B981]" : "bg-white text-slate-500 border-slate-100 hover:text-[#10B981] hover:border-emerald-200"}`}
                      >
                        <CheckCircle2 size={12} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                    <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                    <Tooltip text="Edit">
                      <button
                        onClick={() => openEditModal(job)}
                        className="w-7 h-7 flex items-center justify-center bg-white text-sky-400 hover:text-sky-600 rounded-lg transition-all border border-slate-100 hover:border-slate-100 shadow-sm"
                      >
                        <Edit2 size={12} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Delete">
                      <button
                        onClick={() => setDeleteJobId(job.id)}
                        className="w-7 h-7 flex items-center justify-center bg-white text-rose-400 hover:text-rose-600 rounded-lg transition-all border border-slate-100 hover:border-slate-100 shadow-sm"
                      >
                        <Trash2 size={12} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                  </div>
                );
              }
              return null;
            }}
          />

          <div className="p-4 border-t border-slate-50 bg-slate-50/20">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteJobId}
        title="Delete Job"
        confirmText="Delete"
        message={
          <span>
            Are you sure you want to delete this job?{" "}
            <span className="font-semibold text-slate-700">
              This action cannot be undone.
            </span>
          </span>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteJobId(null)}
      />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-8 right-8 z-[100] flex items-center space-x-4 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-10 ${notification.type === "success" ? "bg-emerald-600 text-white shadow-emerald-200" : "bg-rose-600 text-white shadow-rose-200"}`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={24} />
          ) : (
            <AlertCircle size={24} />
          )}
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              {notification.type === "success"
                ? "System Success"
                : "System Error"}
            </span>
            <span className="text-sm font-bold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm">
                  <ClipboardList size={22} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                    {selectedJob.service?.name}
                  </h2>
                  <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Building2 size={12} className="mr-1.5 text-indigo-400" />
                    {selectedJob.vendor?.studio_name}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={closeModal}
                  className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-100 rounded-lg transition-all shadow-sm"
                >
                  <X size={20} />
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
                                {selectedJob.vendor?.contact_person || "N/A"}
                              </span>
                              {selectedJob.vendor?.email && (
                                <span className="text-xs text-gray-600 leading-none mt-0.5">
                                  {selectedJob.vendor?.email}
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
                            -{formatCurrency(selectedJob.commission_amount)}
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">
                          Net Profit
                        </span>
                        <span className="text-base font-medium text-indigo-600">
                          {formatCurrency(
                            Number(selectedJob.amount || 0) -
                              Number(selectedJob.commission_amount || 0),
                          )}
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

      {/* Create / Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex justify-between items-center border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  {selectedJob && showEditModal
                    ? "Edit Production"
                    : "Post New Production"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="p-5 overflow-y-auto">
                <section className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <SearchableSelect
                          label="Vendor"
                          heightClass="h-10"
                          labelStyle="normal"
                          inputStyle="normal"
                          required
                          options={vendors.map((v) => ({
                            id: v.id,
                            name: v.studio_name,
                          }))}
                          value={selectedVendor}
                          onChange={setSelectedVendor}
                          placeholder="Search Vendor..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={openVendorForm}
                        className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition-colors duration-200 font-medium text-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <SearchableSelect
                      label="Service / Job Type"
                      heightClass="h-10"
                      labelStyle="normal"
                      inputStyle="normal"
                      required
                      options={services.map((s) => ({
                        id: s.id,
                        name: s.name,
                      }))}
                      value={selectedService}
                      onChange={setSelectedService}
                      placeholder="Search Service..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SearchableSelect
                      label="Assign User"
                      heightClass="h-10"
                      required
                      disabled={!selectedService}
                      options={filteredStaffList.map((s) => ({
                        id: s.id,
                        name: s.name,
                      }))}
                      value={selectedStaff}
                      onChange={setSelectedStaff}
                      placeholder={
                        selectedService
                          ? "Select Assigned User..."
                          : "Choose Service First"
                      }
                      labelStyle="normal"
                      inputStyle="normal"
                    />

                    <div>
                      <label className="label text-sm font-normal text-gray-900 mb-1.5 block ml-1">
                        Staff Due Date
                      </label>
                      <input
                        type="date"
                        className="w-full h-10 bg-white border-2 border-slate-100 rounded-lg px-4 text-[12px] uppercase tracking-widest text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 transition-all duration-300"
                        value={formData.staff_due_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            staff_due_date: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="label text-sm font-normal text-gray-900 mb-1.5 block ml-1">
                        Job Due Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        className="w-full h-10 bg-white border-2 border-slate-100 rounded-lg px-4 text-[12px] uppercase tracking-widest text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 transition-all duration-300"
                        value={formData.job_due_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            job_due_date: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label text-sm font-normal text-gray-900 mb-1.5 block">
                      Work Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      className="input-aesthetic min-h-[80px] resize-none text-base p-3"
                      placeholder="Provide clear instructions for the staff..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label text-sm font-normal text-gray-900 mb-1.5 block">
                        Job Data Location
                      </label>
                      <textarea
                        className="input-aesthetic min-h-[70px] py-2.5 px-3 text-base resize-none"
                        placeholder="Source location details..."
                        value={formData.data_location}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            data_location: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="label text-sm font-normal text-gray-900 mb-1.5 block">
                        Job Final Location
                      </label>
                      <textarea
                        className="input-aesthetic min-h-[70px] py-2.5 px-3 text-base resize-none"
                        placeholder="Final destination details..."
                        value={formData.final_location}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            final_location: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div>
                      <label className="label text-sm font-normal text-gray-900 mb-1.5 block">
                        Job Total Amount (Base){" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          className="input-aesthetic h-10 pl-10 font-bold text-base text-slate-900 border-2 border-slate-50"
                          placeholder="0"
                          value={formData.amount || ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              amount: Number(e.target.value),
                            })
                          }
                          required
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label text-sm font-normal text-gray-900 mb-1.5 block mt-2">
                        Staff Commission Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          className="input-aesthetic h-10 pl-10 font-bold text-base text-indigo-600 border-2 border-slate-50"
                          placeholder="0"
                          value={formData.commission_amount || ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              commission_amount: Number(e.target.value),
                            });
                            setIsCommissionManuallySet(true);
                          }}
                          min="0"
                        />
                      </div>
                      {/* <div className="mt-1.5 flex items-center justify-between px-2">
                        <span className="text-xs text-gray-500">
                          Auto: {staffPercentage}% of ₹{formData.amount}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const autoCommission = calculateCommission(
                              formData.amount,
                              staffPercentage,
                            );
                            setFormData({
                              ...formData,
                              commission_amount: autoCommission,
                            });
                            setIsCommissionManuallySet(false);
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium underline"
                        >
                          Reset to Auto
                        </button>
                      </div> */}
                    </div>
                  </div>
                </section>
              </div>
              <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    modalLoading || !selectedStaff || !formData.job_due_date
                  }
                  className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <Save size={16} className="mr-2" />
                  {modalLoading
                    ? "Processing..."
                    : selectedJob
                      ? "Update Job"
                      : "Post Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Form Modal */}
      <VendorForm
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        onSubmit={handleVendorSubmit}
        formData={vendorFormData}
        setFormData={setVendorFormData}
        isEditing={false}
        isLoading={modalLoading}
      />
    </div>
  );
}
