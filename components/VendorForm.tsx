import { X, Loader2 } from "lucide-react";

interface VendorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    studio_name: string;
    contact_person: string;
    mobile: string;
    email: string;
    location: string;
    notes: string;
  };
  setFormData: (data: any) => void;
  isEditing: boolean;
  isLoading?: boolean;
}

export default function VendorForm({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  isLoading = false,
}: VendorFormProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">
            {isEditing ? "Edit Vendor" : "New Vendor"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={onSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="p-5 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Studio Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={formData.studio_name}
                  onChange={(e) =>
                    setFormData({ ...formData, studio_name: e.target.value })
                  }
                  placeholder="e.g. Dream Wedding Films"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  placeholder="Full Name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1 block">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    maxLength={10}
                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={formData.mobile}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/[^0-9]/g, "")
                        .slice(0, 10);
                      setFormData({ ...formData, mobile: val });
                    }}
                    placeholder="10-digit number"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-1 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@studio.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Location
                </label>
                <input
                  type="text"
                  className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g. Mumbai, Maharashtra"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-1 block">
                  Notes / Description (Optional)
                </label>
                <textarea
                  className="w-full min-h-[60px] px-3 py-2 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any additional details..."
                />
              </div>
            </div>
          </div>
          <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-md transition-all flex items-center gap-2"
            >
              {isLoading && <Loader2 size={15} className="animate-spin" />}
              {isEditing ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
