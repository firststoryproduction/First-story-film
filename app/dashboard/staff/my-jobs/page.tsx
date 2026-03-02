"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Search,
  Clock,
  Building2,
  Layout,
  Zap,
  X,
  FileText,
  MapPin,
  ExternalLink,
  ClipboardList,
  Smartphone,
  Mail,
  Trash2,
  Edit2,
  AlertCircle,
  Eye,
  ArrowLeft,
  MoreVertical,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import Tooltip from "@/components/Tooltip";
import Badge from "@/components/Badge";

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("MyJobsPage: Loading timeout triggered");
        setLoading(false);
      }
    }, 5000);

    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (mounted) {
          if (user) {
            setCurrentUser(user);
          } else {
            setLoading(false);
            clearTimeout(timeout);
          }
        }
      } catch (error) {
        console.error("Init error:", error);
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    };
    init();
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMyJobs(currentUser.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentPage, searchTerm]);

  const fetchMyJobs = async (userId: string) => {
    try {
      // Only show loading spinner on initial load, not during search/pagination
      if (jobs.length === 0) {
        setLoading(true);
      }
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;
      // Fetch jobs
      let query = (supabase.from("jobs") as any)
        .select(
          `
                  *,
                  service:services(name),
                  vendor:vendors(studio_name, contact_person, mobile),
                  staff:users!staff_id(name)
                `,
          { count: "exact" },
        )
        .eq("staff_id", userId);

      if (searchTerm) {
        query = query.ilike("description", `%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) {
        console.error("MyJobs: Supabase Error:", error.message, error.code);
        throw error;
      }

      setJobs(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching jobs:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    jobId: string,
    newStatus: string,
    extraData: any = {},
  ) => {
    setActionLoading(jobId);
    try {
      const updatePayload: any = {
        status: newStatus,
        ...extraData,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "IN_PROGRESS") {
        updatePayload.started_at = new Date().toISOString();
      }

      if (newStatus === "COMPLETED") {
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error } = await (supabase.from("jobs") as any)
        .update(updatePayload)
        .eq("id", jobId);

      if (error) throw error;

      setJobs((prevJobs) =>
        prevJobs.map((j) => (j.id === jobId ? { ...j, ...updatePayload } : j)),
      );

      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob((prev: any) => ({ ...prev, ...updatePayload }));
      }
    } catch (error: any) {
      console.error("Error updating status:", error.message || error);
    } finally {
      setActionLoading(null);
    }
  };

  const openViewModal = (job: any) => {
    setSelectedJob(job);
    setShowViewModal(true);
  };

  const closeModal = () => {
    setShowViewModal(false);
    setSelectedJob(null);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedJobs = jobs;

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] lg:ml-[var(--sidebar-offset)] relative">
      <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
        {/* Modern Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 px-2">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <ClipboardList size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-black">My Job</h1>
              </div>
            </div>{" "}
            {totalCount > 0 && (
              <div className="flex items-center space-x-2 ml-18">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Total:
                </span>
                <Badge
                  color="indigo"
                  className="font-black tracking-wider uppercase"
                >
                  {totalCount} JOBS
                </Badge>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
          {/* Toolbar Inside Card */}
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-[400px] group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Search by studio, job type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 h-11 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {paginatedJobs.length} of {totalCount} jobs
            </div>
          </div>

          <Table
            columns={[
              { key: "studio", header: "Studio", align: "left" },
              { key: "job_type", header: "Job Type", align: "left" },
              { key: "description", header: "Work Description", align: "left" },
              { key: "status", header: "Status", align: "center" },
              { key: "due_date", header: "Due Date", align: "left" },
              { key: "update", header: "Update", align: "center" },
            ]}
            data={paginatedJobs}
            loading={loading && jobs.length === 0}
            emptyIcon={<CheckCircle2 size={72} className="text-slate-200" />}
            emptyMessage="No assigned benchmarks in your production roster."
            onRowClick={(job) => openViewModal(job)}
            renderCell={(column, job) => {
              if (column.key === "studio") {
                return (
                  <div className="flex items-center text-sm font-bold text-slate-700">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3 group-hover/row:bg-indigo-600 group-hover/row:text-white transition-all shadow-sm">
                      <Building2 size={16} />
                    </div>
                    <span className="group-hover/row:text-indigo-600 transition-colors">
                      {job.vendor?.studio_name || "Individual"}
                    </span>
                  </div>
                );
              }
              if (column.key === "job_type") {
                return (
                  <div className="font-black text-slate-900 text-sm group-hover/row:text-indigo-600 transition-colors uppercase tracking-tight">
                    {job.service?.name || "Manual Project"}
                  </div>
                );
              }
              if (column.key === "description") {
                return (
                  <div className="text-sm text-slate-600 font-medium leading-relaxed max-w-[280px] line-clamp-2">
                    {job.description || "No description provided"}
                  </div>
                );
              }
              if (column.key === "status") {
                const statusColor =
                  job.status === "COMPLETED"
                    ? "emerald"
                    : job.status === "PENDING"
                      ? "amber"
                      : "indigo";
                return (
                  <Badge
                    color={statusColor as any}
                    className="font-black uppercase tracking-wider"
                  >
                    {job.status === "IN_PROGRESS"
                      ? "IN-PROGRESS"
                      : job.status === "COMPLETED"
                        ? "COMPLETE"
                        : job.status}
                  </Badge>
                );
              }
              if (column.key === "due_date") {
                return (
                  <div className="flex items-center text-xs text-slate-600 font-bold">
                    <Calendar size={14} className="mr-2 text-indigo-400" />
                    {new Date(job.job_due_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                );
              }
              if (column.key === "update") {
                return (
                  <div
                    className="flex items-center justify-center space-x-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip text="Pending">
                      <button
                        onClick={() => handleUpdateStatus(job.id, "PENDING")}
                        disabled={actionLoading === job.id}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${job.status === "PENDING" ? "bg-amber-400 text-white shadow-md shadow-amber-200" : "bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-500"}`}
                      >
                        <Clock size={16} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                    <Tooltip text="In-Progress">
                      <button
                        onClick={() =>
                          handleUpdateStatus(job.id, "IN_PROGRESS")
                        }
                        disabled={actionLoading === job.id}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${job.status === "IN_PROGRESS" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"}`}
                      >
                        <Zap size={16} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Complete">
                      <button
                        onClick={() => handleUpdateStatus(job.id, "COMPLETED")}
                        disabled={actionLoading === job.id}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm ${job.status === "COMPLETED" ? "bg-emerald-500 text-white shadow-md shadow-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-500"}`}
                      >
                        <CheckCircle2 size={16} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                  </div>
                );
              }
              return null;
            }}
          />

          {paginatedJobs.length > 0 && (
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 w-full max-w-4xl rounded-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-white relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <ClipboardList size={32} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                      {selectedJob.service?.name || "Job Details"}
                    </h2>
                    <p className="text-sm text-indigo-600 font-bold mt-1.5">
                      {selectedJob.vendor?.studio_name || "Individual Client"}
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Close modal"
                  className="w-11 h-11 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side (Main Content) - Takes 2 columns */}
                <div className="lg:col-span-2 space-y-7">
                  {/* General Details */}
                  <section>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">
                      General Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-start space-x-4">
                          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                            <UserIcon size={20} />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-slate-500 mb-1">
                              Assigned To
                            </span>
                            <span className="text-base font-bold text-slate-900">
                              {selectedJob.staff?.name || "You"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-start space-x-4">
                          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                            <Building2 size={20} />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-slate-500 mb-1">
                              Studio Contact
                            </span>
                            <span className="text-base font-bold text-slate-900">
                              {selectedJob.vendor?.studio_name || "Individual"}
                            </span>
                            {selectedJob.vendor?.contact_person && (
                              <span className="text-xs text-slate-500 mt-0.5">
                                {selectedJob.vendor.contact_person}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Work Description */}
                  <section>
                    <div className="flex items-center space-x-2 mb-4">
                      <ClipboardList size={16} className="text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Work Description
                      </h3>
                    </div>
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                      <p className="text-slate-700 font-normal leading-relaxed text-base">
                        {selectedJob.description ||
                          "No specific instructions provided."}
                      </p>
                    </div>
                  </section>

                  {/* Location */}
                  <section>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">
                      Location
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-start space-x-4">
                          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                            <MapPin size={20} />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-indigo-600 mb-1">
                              Job Data Location
                            </span>
                            <span className="text-base font-bold text-slate-900 break-words">
                              {selectedJob.data_location || "Not specified"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-indigo-50/50 rounded-2xl border border-indigo-200 p-5">
                        <div className="flex items-start space-x-4">
                          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                            <ExternalLink size={20} />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-indigo-600 mb-1">
                              Job Final Location
                            </span>
                            <span className="text-base font-bold text-slate-900 break-words">
                              {selectedJob.final_location ||
                                "Pending upload..."}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Side (Status & Actions) */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 sticky top-0 shadow-sm">
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 mb-4">
                        Production Status
                      </h3>
                      <div className="space-y-3">
                        <button
                          onClick={() =>
                            handleUpdateStatus(selectedJob.id, "PENDING")
                          }
                          disabled={actionLoading === selectedJob.id}
                          aria-label="Set status to pending"
                          className={`w-full py-3.5 px-5 flex items-center justify-center rounded-xl transition-all space-x-2.5 font-bold text-sm ${
                            selectedJob.status === "PENDING"
                              ? "bg-amber-400 text-white shadow-md"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-amber-50"
                          }`}
                        >
                          <Clock size={18} />
                          <span>Pending</span>
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateStatus(selectedJob.id, "IN_PROGRESS")
                          }
                          disabled={actionLoading === selectedJob.id}
                          aria-label="Set status to in-progress"
                          className={`w-full py-3.5 px-5 flex items-center justify-center rounded-xl transition-all space-x-2.5 font-bold text-sm ${
                            selectedJob.status === "IN_PROGRESS"
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50"
                          }`}
                        >
                          <Zap size={18} />
                          <span>In-Progress</span>
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateStatus(selectedJob.id, "COMPLETED")
                          }
                          disabled={actionLoading === selectedJob.id}
                          aria-label="Set status to complete"
                          className={`w-full py-3.5 px-5 flex items-center justify-center rounded-xl transition-all space-x-2.5 font-bold text-sm ${
                            selectedJob.status === "COMPLETED"
                              ? "bg-emerald-500 text-white shadow-md"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50"
                          }`}
                        >
                          <CheckCircle2 size={18} />
                          <span>Complete</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100">
                      <h3 className="text-sm font-bold text-slate-700 mb-3">
                        Production Deadline
                      </h3>
                      <div className="flex items-center space-x-3 text-rose-600">
                        <Calendar size={18} />
                        <span className="text-xl font-bold">
                          {new Date(
                            selectedJob.job_due_date,
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {selectedJob.job_charge && (
                      <div className="pt-5 border-t border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">
                          Financial Summary
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-slate-900">
                              ₹{selectedJob.job_charge?.toLocaleString()}
                            </span>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">
                                Commission
                              </div>
                              <div className="text-sm font-bold text-rose-600">
                                -₹
                                {selectedJob.staff_commission?.toLocaleString() ||
                                  "0"}
                              </div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">
                                Net Profit
                              </span>
                              <span className="text-lg font-bold text-indigo-600">
                                ₹
                                {(
                                  (selectedJob.job_charge || 0) -
                                  (selectedJob.staff_commission || 0)
                                ).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
