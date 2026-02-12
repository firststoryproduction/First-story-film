'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Edit2, Trash2, Search, Percent, Smartphone, Mail, Users, X, Save, ArrowLeft, Calendar, ChevronDown, Building2, AlertTriangle, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { User, Service, StaffServiceConfig } from '../../../../types/database'
import Pagination from '../../../../components/Pagination'
import Spinner from '../../../../components/Spinner'
import AestheticSelect from '../../../../components/AestheticSelect'
import Tooltip from '../../../../components/Tooltip'

export default function StaffPage() {
    const router = useRouter()
    const [staff, setStaff] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const ITEMS_PER_PAGE = 10
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Modal & Form State
    const [showModal, setShowModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState<User | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
    const [services, setServices] = useState<Service[]>([])

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3500)
    }
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: 'USER' as 'ADMIN' | 'MANAGER' | 'USER',
    })
    const [commissions, setCommissions] = useState<{ serviceId: string, percentage: number }[]>([])
    const [showPasswordField, setShowPasswordField] = useState(false)


    // Single initialization effect - runs once on mount
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                if (!mounted) return;

                // Run fetches in parallel using Promise.allSettled to avoid one blocking another
                await Promise.allSettled([
                    fetchServices(),
                    fetchStaff()
                ]);

                if (mounted) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) setCurrentUser(user);
                }
            } catch (err) {
                console.error('StaffPage: Init error', err);
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
            const { data, error } = await supabase.from('services').select('*').order('name');
            if (!error && data) setServices(data);
        } catch (e) { console.error(e); }
    };

    const fetchStaff = async () => {
        try {
            const start = (currentPage - 1) * ITEMS_PER_PAGE
            const end = start + ITEMS_PER_PAGE - 1

            let query = supabase
                .from('users')
                .select('*', { count: 'exact' })

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            }

            const { data, error, count } = await query
                .order('name')
                .range(start, end)

            if (error) throw error;
            setStaff(data || []);
            setTotalCount(count || 0)
        } catch (error) {
            console.error('Error fetching staff:', error);
        } finally {
            setLoading(false)
        }
    };

    const handleAddCommission = () => {
        setCommissions([...commissions, { serviceId: '', percentage: 0 }])
    }

    const handleRemoveCommission = (index: number) => {
        const newCommissions = [...commissions]
        newCommissions.splice(index, 1)
        setCommissions(newCommissions)
    }

    const updateCommission = (index: number, field: string, value: string | number) => {
        const newCommissions = [...commissions]
        if (field === 'serviceId') newCommissions[index].serviceId = value as string
        if (field === 'percentage') newCommissions[index].percentage = Number(value)
        setCommissions(newCommissions)
    }

    const handleOpenCreate = () => {
        setModalMode('create')
        setEditingId(null)
        setFormData({ name: '', email: '', mobile: '', password: '', role: 'USER' })
        setCommissions([])
        setShowPasswordField(true)
        setShowModal(true)
    }

    const handleEdit = async (member: User) => {
        setModalMode('edit')
        setEditingId(member.id)
        setFormData({
            name: member.name,
            email: member.email,
            mobile: member.mobile,
            password: '',
            role: member.role as any
        })

        const { data, error } = await supabase
            .from('staff_service_configs')
            .select('*')
            .eq('staff_id', member.id)

        if (!error && data) {
            setCommissions(data.map((c: any) => ({
                serviceId: c.service_id,
                percentage: Number(c.percentage)
            })))
        } else {
            setCommissions([])
        }
        setShowPasswordField(false)
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            let userId = editingId
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const mobileRegex = /^[0-9]{10}$/

            if (!emailRegex.test(formData.email)) {
                showNotification('Please enter a valid email address.', 'error')
                setSubmitting(false)
                return
            }

            if (!mobileRegex.test(formData.mobile)) {
                showNotification('Please enter a valid 10-digit mobile number.', 'error')
                setSubmitting(false)
                return
            }

            if (modalMode === 'create') {
                const response = await fetch('/api/admin/create-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        name: formData.name,
                        role: formData.role,
                        mobile: formData.mobile
                    })
                })

                const data = await response.json()
                if (!response.ok) throw new Error(data.error || 'Failed to create user')
                userId = data.id
            } else {
                if (!editingId) return;
                userId = editingId

                // Update via Admin API to bypass RLS and handle Auth/Public sync
                const updateResponse = await fetch('/api/admin/update-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingId,
                        name: formData.name,
                        email: formData.email,
                        mobile: formData.mobile,
                        role: formData.role,
                        password: formData.password || undefined // Only send if changed
                    })
                })

                if (!updateResponse.ok) {
                    const updateData = await updateResponse.json()
                    throw new Error(updateData.error || 'Failed to update user')
                }

                await supabase.from('staff_service_configs').delete().eq('staff_id', editingId)
            }

            if (formData.role === 'USER' && commissions.length > 0) {
                const validCommissions = commissions
                    .filter(c => c.serviceId !== '')
                    .map(c => ({
                        staff_id: userId,
                        service_id: c.serviceId,
                        percentage: c.percentage
                    }))

                if (validCommissions.length > 0) {
                    const { error: commError } = await (supabase
                        .from('staff_service_configs') as any)
                        .insert(validCommissions)
                    if (commError) throw commError
                }
            }

            setShowModal(false)
            showNotification(modalMode === 'create' ? 'User created successfully' : 'User updated successfully')
            fetchStaff()
        } catch (error: any) {
            console.error('Error saving user:', error)
            showNotification(error.message || 'Error occurred while saving user.', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const confirmDelete = (member: User) => {
        setMemberToDelete(member)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!memberToDelete) return
        setDeleteLoading(true)

        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: memberToDelete.id })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to delete user')

            setShowDeleteModal(false)
            setMemberToDelete(null)
            showNotification('User deleted successfully')
            fetchStaff()
        } catch (error: any) {
            console.error('Error deleting staff:', error)
            showNotification(error.message || 'Error deleting staff. Please try again.', 'error')
        } finally {
            setDeleteLoading(false)
        }
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
    const paginatedStaff = staff

    useEffect(() => {
        if (currentPage !== 1) setCurrentPage(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm])

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-72">
            <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Users size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-black">Users</h1>
                        </div>
                    </div>
                </div>

                {/* Main Operations Card */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

                    {/* Toolbar Inside Card */}
                    <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-[320px] group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-white border border-gray-300 rounded-lg text-sm font-normal focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400" />
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="w-full md:w-auto px-5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 group shrink-0"
                        >
                            <Plus size={14} />
                            <span>Register User</span>
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto relative">
                        {loading && staff.length === 0 ? (
                            <div className="h-32 flex items-center justify-center w-full">
                                <Spinner />
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">User Profile</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Email</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Mobile Number</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide text-center">Role</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedStaff.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="inline-flex p-6 bg-gray-50 rounded-full mb-3">
                                                    <Users size={32} className="text-gray-300" />
                                                </div>
                                                <p className="text-sm font-normal text-gray-600">No users detected</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedStaff.map((member) => (
                                            <tr
                                                key={member.id}
                                                onClick={() => router.push(`/dashboard/admin/staff/${member.id}`)}
                                                className="hover:bg-gray-50 transition-colors group/row cursor-pointer"
                                            >
                                                <td className="px-6 py-3">
                                                    <div className="text-sm font-normal text-gray-900 flex items-center">
                                                        {member.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="text-sm font-normal text-gray-900 flex items-center">
                                                        <Mail size={12} className="mr-2 text-gray-400" />
                                                        {member.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="text-sm font-normal text-gray-900 flex items-center">
                                                        <Smartphone size={12} className="mr-2 text-gray-400" />
                                                        {member.mobile || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${member.role === 'ADMIN' ? 'bg-rose-50 text-rose-700' :
                                                        member.role === 'MANAGER' ? 'bg-amber-50 text-amber-700' :
                                                            'bg-indigo-50 text-indigo-700'
                                                        }`}>
                                                        {member.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-1.5">
                                                    <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
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
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Container */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage} />
                    </div>
                </div>
            </div>

            {/* Registration Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-5 flex justify-between items-center border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-black">
                                {modalMode === 'create' ? 'Register New User' : 'Edit User Profile'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-5 overflow-y-auto">
                                <div className="space-y-4">
                                    {/* Profile Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-900 mb-1 block">Full Name</label>
                                            <input type="text" className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-900 mb-1 block">Mobile Number</label>
                                            <input
                                                type="tel"
                                                pattern="[0-9]{10}"
                                                maxLength={10}
                                                className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="10-digit number"
                                                value={formData.mobile}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                                                    setFormData({ ...formData, mobile: val })
                                                }}
                                                required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-900 mb-1 block">Email Address</label>
                                            <input type="email" className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-900 mb-1 block">Security Password</label>
                                            {!showPasswordField && modalMode === 'edit' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswordField(true)}
                                                    className="w-full h-9 px-3 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-indigo-600 hover:bg-gray-200 transition-all"
                                                >
                                                    Reset Password
                                                </button>
                                            ) : (
                                                <input
                                                    type="password"
                                                    title="Set password"
                                                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    placeholder={modalMode === 'create' ? "Set password" : "Enter new password"}
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    required={modalMode === 'create' || (modalMode === 'edit' && showPasswordField)} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <AestheticSelect
                                                label="Role"
                                                heightClass="h-9"
                                                value={formData.role}
                                                onChange={(val) => setFormData({ ...formData, role: val as any })}
                                                options={[
                                                    { id: 'USER', name: 'Staff / User' },
                                                    { id: 'MANAGER', name: 'Manager' },
                                                    { id: 'ADMIN', name: 'Administrator' }
                                                ]} />
                                        </div>
                                    </div>

                                    {formData.role === 'USER' && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex justify-between items-center mb-3">
                                                <p className="text-sm font-medium text-gray-900">Service</p>
                                                <button type="button" onClick={handleAddCommission} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 px-2.5 py-1 rounded-md">
                                                    <Plus size={12} className="mr-1" /> Add Service
                                                </button>
                                            </div>

                                            {commissions.length === 0 ? (
                                                <div className="border border-dashed border-gray-300 rounded-md p-3 text-center">
                                                    <p className="text-sm text-gray-600 font-normal">No services configured yet.</p>
                                                </div>
                                            ) : (
                                                <div className="max-h-[200px] overflow-y-auto space-y-2">
                                                    {commissions.map((comm, index) => (
                                                        <div key={index} className="bg-white p-3 rounded-md border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                                                            <div>
                                                                <AestheticSelect
                                                                    label="Service"
                                                                    heightClass="h-9"
                                                                    value={comm.serviceId}
                                                                    onChange={(val) => updateCommission(index, 'serviceId', val)}
                                                                    placeholder="Select Service..."
                                                                    options={services} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-900 mb-1">Rate (%)</label>
                                                                <div className="relative">
                                                                    <input type="number" step="0.01" className="w-full h-9 px-3 pr-8 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" value={comm.percentage || ''} onFocus={e => e.target.select()} onChange={e => updateCommission(index, 'percentage', e.target.value)} required min="0" max="100" />
                                                                    <Percent size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                </div>
                                                            </div>
                                                            <button type="button" onClick={() => handleRemoveCommission(index)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white shadow-sm border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-rose-500 transition-all z-10">
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Button Footer */}
                            <div className="p-5 border-t border-gray-200 bg-white flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center transition-all">
                                    <Save size={14} className="mr-1.5" /> {submitting ? 'Saving...' : (modalMode === 'create' ? 'Save' : 'Update')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deletion Confirmation Modal */}
            {showDeleteModal && memberToDelete && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-5">
                            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-lg font-semibold text-black mb-2 text-center">Delete Account?</h3>
                            <p className="text-gray-600 text-sm font-normal leading-relaxed mb-5 text-center">
                                You are about to permanently remove <span className="font-medium text-black">{memberToDelete.name}</span>'s access. This action cannot be undone.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false)
                                        setMemberToDelete(null)
                                    }}
                                    className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteLoading}
                                    className="px-4 py-2.5 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-all"
                                >
                                    {deleteLoading ? 'Processing...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center space-x-3 px-6 py-3 rounded-lg shadow-xl border ${notification.type === 'success'
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'bg-rose-500 border-rose-400 text-white'
                        }`}>
                        {notification.type === 'success' ? (
                            <CheckCircle size={18} className="text-white" />
                        ) : (
                            <XCircle size={18} className="text-white" />
                        )}
                        <p className="text-sm font-medium">{notification.message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

