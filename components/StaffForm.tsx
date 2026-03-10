"use client";

import { X, Plus, Percent, Save } from "lucide-react";
import AestheticSelect from "./AestheticSelect";
import type { Service } from "@/types/database";

interface StaffFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  modalMode: "create" | "edit";
  showPasswordField: boolean;
  onShowPasswordField: () => void;
  formData: {
    name: string;
    email: string;
    mobile: string;
    password: string;
    role: "ADMIN" | "MANAGER" | "USER";
  };
  setFormData: (data: any) => void;
  services: Service[];
  commissions: { serviceId: string; percentage: number; paymentType: string }[];
  onAddCommission: () => void;
  onRemoveCommission: (index: number) => void;
  onUpdateCommission: (
    index: number,
    field: string,
    value: string | number,
  ) => void;
  submitting: boolean;
}

export default function StaffForm({
  isOpen,
  onClose,
  onSubmit,
  modalMode,
  showPasswordField,
  onShowPasswordField,
  formData,
  setFormData,
  services,
  commissions,
  onAddCommission,
  onRemoveCommission,
  onUpdateCommission,
  submitting,
}: StaffFormProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-xl my-8 relative animate-in fade-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-5 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg font-semibold text-black">
              {modalMode === "create"
                ? "Register New User"
                : "Edit User Profile"}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col">
            <div className="p-5 space-y-4">
              {/* Profile Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1 block">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="10-digit number"
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 10);
                      setFormData({ ...formData, mobile: val });
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1 block">
                    Security Password
                  </label>
                  {!showPasswordField && modalMode === "edit" ? (
                    <button
                      type="button"
                      onClick={onShowPasswordField}
                      className="w-full h-9 px-3 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-indigo-600 hover:bg-gray-200 transition-all"
                    >
                      Reset Password
                    </button>
                  ) : (
                    <input
                      type="password"
                      title="Set password"
                      className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder={
                        modalMode === "create"
                          ? "Set password"
                          : "Enter new password"
                      }
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password: e.target.value,
                        })
                      }
                      required={
                        modalMode === "create" ||
                        (modalMode === "edit" && showPasswordField)
                      }
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <AestheticSelect
                    label="Role"
                    heightClass="h-9"
                    value={formData.role}
                    onChange={(val) =>
                      setFormData({ ...formData, role: val as any })
                    }
                    options={[
                      { id: "USER", name: "Staff / User" },
                      { id: "MANAGER", name: "Manager" },
                      { id: "ADMIN", name: "Administrator" },
                    ]}
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-gray-900">Services</p>
                  <button
                    type="button"
                    onClick={onAddCommission}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 px-2.5 py-1 rounded-md"
                  >
                    <Plus size={12} className="mr-1" /> Add Service
                  </button>
                </div>

                {commissions.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded-md p-3 text-center">
                    <p className="text-sm text-gray-600 font-normal">
                      No services configured yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {commissions.map((comm, index) => (
                      <div
                        key={index}
                        className="bg-white p-3 rounded-md border border-gray-200 relative min-w-0"
                      >
                        {/* Salary / Commission Toggle */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-500 font-medium">
                            Type:
                          </span>
                          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateCommission(
                                  index,
                                  "paymentType",
                                  "commission",
                                )
                              }
                              className={`px-3 py-1 text-xs font-medium transition-colors ${
                                (comm.paymentType ?? "commission") ===
                                "commission"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              Commission
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateCommission(
                                  index,
                                  "paymentType",
                                  "salary",
                                )
                              }
                              className={`px-3 py-1 text-xs font-medium border-l border-gray-300 transition-colors ${
                                comm.paymentType === "salary"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              Salary
                            </button>
                          </div>
                        </div>

                        <div
                          className={`grid gap-3 ${
                            (comm.paymentType ?? "commission") === "commission"
                              ? "grid-cols-1 md:grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          <div className="min-w-0">
                            <AestheticSelect
                              label="Service"
                              heightClass="h-9"
                              value={comm.serviceId}
                              onChange={(val) =>
                                onUpdateCommission(index, "serviceId", val)
                              }
                              placeholder="Select Service..."
                              options={services}
                            />
                          </div>
                          {(comm.paymentType ?? "commission") ===
                            "commission" && (
                            <div className="min-w-0">
                              <label className="block text-sm font-medium text-gray-900 mb-1">
                                Rate (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-full h-9 px-3 pr-8 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                  value={comm.percentage || ""}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) =>
                                    onUpdateCommission(
                                      index,
                                      "percentage",
                                      e.target.value,
                                    )
                                  }
                                  required
                                  min="0"
                                  max="100"
                                />
                                <Percent
                                  size={10}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveCommission(index)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white shadow-sm border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-rose-500 transition-all z-10"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end gap-3 bg-gray-50/50 rounded-b-lg">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center transition-all shadow-sm"
              >
                <Save size={14} className="mr-1.5" />{" "}
                {submitting
                  ? "Saving..."
                  : modalMode === "create"
                    ? "Save"
                    : "Update"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
