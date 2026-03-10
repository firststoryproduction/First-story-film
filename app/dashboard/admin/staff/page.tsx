"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Smartphone,
  Mail,
  Users,
  ArrowLeft,
  Calendar,
  ChevronDown,
  Building2,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { User, Service, StaffServiceConfig } from "../../../../types/database";
import Pagination from "../../../../components/Pagination";
import Table from "../../../../components/Table";
import Badge from "../../../../components/Badge";
import Tooltip from "../../../../components/Tooltip";
import ConfirmationDialog from "../../../../components/ConfirmationDialog";
import StaffForm from "../../../../components/StaffForm";

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  const showNotification = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "USER" as "ADMIN" | "MANAGER" | "USER",
  });
  const [commissions, setCommissions] = useState<
    { serviceId: string; percentage: number; paymentType: string }[]
  >([]);
  const [paymentType, setPaymentType] = useState("commission");
  const [showPasswordField, setShowPasswordField] = useState(false);

  // Single initialization effect - runs once on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        if (!mounted) return;

        // Run fetches in parallel using Promise.allSettled to avoid one blocking another
        await Promise.allSettled([fetchServices(), fetchStaff()]);

        if (mounted) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) setCurrentUser(user);
        }
      } catch (err) {
        console.error("StaffPage: Init error", err);
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
  }, []); // Only run once on mount

  // Re-fetch when pagination or search changes
  useEffect(() => {
    // Skip initial render (handled by init effect above)
    if (loading) return;

    setLoading(true);
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name");
      if (!error && data) setServices(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStaff = async () => {
    try {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      let query = supabase.from("users").select("*", { count: "exact" });

      if (searchTerm) {
        query = query.or(
          `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`,
        );
      }

      const { data, error, count } = await query
        .order("name")
        .range(start, end);

      if (error) throw error;
      setStaff(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCommission = () => {
    setCommissions([
      ...commissions,
      { serviceId: "", percentage: 0, paymentType: paymentType },
    ]);
  };

  const handlePaymentTypeChange = (type: string) => {
    setPaymentType(type);
    setCommissions(commissions.map((c) => ({ ...c, paymentType: type })));
  };

  const handleRemoveCommission = (index: number) => {
    const newCommissions = [...commissions];
    newCommissions.splice(index, 1);
    setCommissions(newCommissions);
  };

  const updateCommission = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const newCommissions = [...commissions];
    if (field === "serviceId")
      newCommissions[index].serviceId = value as string;
    if (field === "percentage")
      newCommissions[index].percentage = Number(value);
    if (field === "paymentType")
      newCommissions[index].paymentType = value as string;
    setCommissions(newCommissions);
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      mobile: "",
      password: "",
      role: "USER",
    });
    setCommissions([]);
    setPaymentType("commission");
    setShowPasswordField(true);
    setShowModal(true);
  };

  const handleEdit = async (member: User) => {
    setModalMode("edit");
    setEditingId(member.id);
    setFormData({
      name: member.name,
      email: member.email,
      mobile: member.mobile,
      password: "",
      role: member.role as any,
    });

    const { data, error } = await supabase
      .from("staff_service_configs")
      .select("*")
      .eq("staff_id", member.id);

    if (!error && data) {
      const mapped = data.map((c: any) => ({
        serviceId: c.service_id,
        percentage: Number(c.percentage),
        paymentType: c.payment_type || "commission",
      }));
      setCommissions(mapped);
      // Set global paymentType from first service, default to commission
      setPaymentType(mapped[0]?.paymentType ?? "commission");
    } else {
      setCommissions([]);
      setPaymentType("commission");
    }
    setShowPasswordField(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let userId = editingId;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const mobileRegex = /^[0-9]{10}$/;

      if (!emailRegex.test(formData.email)) {
        showNotification("Please enter a valid email address.", "error");
        setSubmitting(false);
        return;
      }

      if (!mobileRegex.test(formData.mobile)) {
        showNotification(
          "Please enter a valid 10-digit mobile number.",
          "error",
        );
        setSubmitting(false);
        return;
      }

      if (modalMode === "create") {
        const response = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: formData.role,
            mobile: formData.mobile,
          }),
        });

        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Failed to create user");
        userId = data.id;
      } else {
        if (!editingId) return;
        userId = editingId;

        // Update via Admin API to bypass RLS and handle Auth/Public sync
        const updateResponse = await fetch("/api/admin/update-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name: formData.name,
            email: formData.email,
            mobile: formData.mobile,
            role: formData.role,
            password: formData.password || undefined, // Only send if changed
          }),
        });

        if (!updateResponse.ok) {
          const updateData = await updateResponse.json();
          throw new Error(updateData.error || "Failed to update user");
        }

        await supabase
          .from("staff_service_configs")
          .delete()
          .eq("staff_id", editingId);
      }

      if (commissions.length > 0) {
        const validCommissions = commissions
          .filter((c) => c.serviceId !== "")
          .map((c) => ({
            staff_id: userId,
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

      setShowModal(false);
      showNotification(
        modalMode === "create"
          ? "User created successfully"
          : "User updated successfully",
      );
      fetchStaff();
    } catch (error: any) {
      console.error("Error saving user:", error);
      showNotification(
        error.message || "Error occurred while saving user.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (member: User) => {
    setMemberToDelete(member);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    setDeleteLoading(true);

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberToDelete.id }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to delete user");

      setShowDeleteModal(false);
      setMemberToDelete(null);
      showNotification("User deleted successfully");
      fetchStaff();
    } catch (error: any) {
      console.error("Error deleting staff:", error);
      showNotification(
        error.message || "Error deleting staff. Please try again.",
        "error",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedStaff = staff;

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-[var(--sidebar-offset)]">
      <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 px-2">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black">Users</h1>
            </div>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 shrink-0"
          >
            <Plus size={14} />
            <span>Register User</span>
          </button>
        </div>

        {/* Main Operations Card */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Toolbar Inside Card */}
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-[320px] group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"
                size={14}
              />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 h-9 bg-white border border-gray-300 rounded-lg text-sm font-normal focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Table */}
          <Table
            columns={[
              { key: "name", header: "Name", align: "left" },
              { key: "email", header: "Email", align: "left" },
              { key: "mobile", header: "Mobile Number", align: "left" },
              { key: "role", header: "Role", align: "center" },
              { key: "actions", header: "Actions", align: "right" },
            ]}
            data={paginatedStaff}
            loading={loading}
            emptyIcon={<Users size={28} className="text-slate-200" />}
            emptyMessage="No users detected"
            onRowClick={(member) =>
              router.push(`/dashboard/admin/staff/${member.id}`)
            }
            renderCell={(column, member) => {
              if (column.key === "name") {
                return (
                  <div className="text-sm font-bold text-slate-900 group-hover/row:text-indigo-700 transition-colors flex items-center">
                    {member.name}
                  </div>
                );
              }
              if (column.key === "email") {
                return (
                  <div className="text-xs text-slate-500 font-bold flex items-center">
                    <Mail size={12} className="mr-2 text-sky-400" />
                    {member.email}
                  </div>
                );
              }
              if (column.key === "mobile") {
                return (
                  <div className="text-xs text-slate-500 font-bold flex items-center">
                    <Smartphone size={12} className="mr-2 text-amber-500" />
                    {member.mobile || "N/A"}
                  </div>
                );
              }
              if (column.key === "role") {
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
                  return (
                    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
                  );
                };

                return (
                  <div className="flex justify-center">
                    <Badge color={getRoleColor(member.role) as any}>
                      {formatRole(member.role)}
                    </Badge>
                  </div>
                );
              }
              if (column.key === "actions") {
                return (
                  <div
                    className="flex items-center justify-end space-x-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip text="Edit">
                      <button
                        onClick={() => handleEdit(member)}
                        className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                      >
                        <Edit2 size={13} />
                      </button>
                    </Tooltip>
                    <Tooltip text="Delete">
                      <button
                        onClick={() => confirmDelete(member)}
                        className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                      >
                        <Trash2 size={13} />
                      </button>
                    </Tooltip>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Pagination Container */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <StaffForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        modalMode={modalMode}
        showPasswordField={showPasswordField}
        onShowPasswordField={() => setShowPasswordField(true)}
        formData={formData}
        setFormData={setFormData}
        paymentType={paymentType}
        onPaymentTypeChange={handlePaymentTypeChange}
        services={services}
        commissions={commissions}
        onAddCommission={handleAddCommission}
        onRemoveCommission={handleRemoveCommission}
        onUpdateCommission={updateCommission}
        submitting={submitting}
      />

      <ConfirmationDialog
        open={showDeleteModal}
        title="Delete user"
        message={
          <span>
            You are about to permanently remove{" "}
            <span className="font-semibold">{memberToDelete?.name}</span>'s
            access. This action cannot be undone.
          </span>
        }
        confirmText={deleteLoading ? "Processing..." : "Delete"}
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => {
          if (deleteLoading) return;
          setShowDeleteModal(false);
          setMemberToDelete(null);
        }}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center space-x-3 px-6 py-3 rounded-lg shadow-xl border ${
              notification.type === "success"
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "bg-rose-500 border-rose-400 text-white"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle size={18} className="text-white" />
            ) : (
              <XCircle size={18} className="text-white" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
