'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, Percent, Smartphone, Mail, Users, X, Save, ArrowLeft, Calendar, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User, Service, StaffServiceConfig } from '@/types/database'
import Pagination from '@/components/Pagination'
import bcrypt from 'bcryptjs'

export default function StaffPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [staff, setStaff] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    // Modal & Form State
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [services, setServices] = useState<Service[]>([])
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        password: '',
        role: 'USER' as 'ADMIN' | 'MANAGER' | 'USER',
    })
    const [commissions, setCommissions] = useState<{ serviceId: string, percentage: number }[]>([])
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
    const [showPasswordField, setShowPasswordField] = useState(false)

    useEffect(() => {
        // Just load the data without checking role
        fetchStaff()
        fetchServices()
    }, [])

    const fetchServices = async () => {
        const { data, error } = await supabase.from('services').select('*').order('name')
        if (!error && data) setServices(data)
    }

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
            password: '', // Leave empty for no change
            role: member.role as any
        })

        // Fetch commissions
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

            // Validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const mobileRegex = /^[0-9]{10}$/

            if (!emailRegex.test(formData.email)) {
                alert('Please enter a valid email address.')
                setSubmitting(false)
                return
            }

            if (!mobileRegex.test(formData.mobile)) {
                alert('Please enter a valid 10-digit mobile number.')
                setSubmitting(false)
                return
            }

            if (modalMode === 'create') {
                // Call API to create user in Supabase Auth from server-side (to keep Admin logged in)
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
                if (!editingId) {
                    setSubmitting(false)
                    return
                }
                userId = editingId
                // Update User (Profile data in public table)
                const updateData: any = {
                    name: formData.name,
                    email: formData.email,
                    mobile: formData.mobile,
                    role: formData.role
                }

                // Password updates require a different flow in Supabase Auth (Admin API), 
                // for now we'll skip password update in this simple modal or handle it via API too.
                // Let's assume we update profile only here, and handle password separately or via API.

                if (formData.password) {
                    const passResponse = await fetch('/api/admin/update-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: editingId,
                            password: formData.password
                        })
                    })

                    if (!passResponse.ok) {
                        const passData = await passResponse.json()
                        throw new Error(passData.error || 'Failed to update password')
                    }
                }

                const { error: userError } = await (supabase
                    .from('users') as any)
                    .update(updateData)
                    .eq('id', editingId)

                if (userError) throw userError

                // Clear old commissions to resync
                await supabase
                    .from('staff_service_configs')
                    .delete()
                    .eq('staff_id', editingId)
            }

            // Sync Commissions (Only for USER role)
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
            fetchStaff()
        } catch (error: any) {
            console.error('Error saving user:', error)
            alert(error.message || 'Error occurred while saving user.')
        } finally {
            setSubmitting(false)
        }
    }

    const fetchStaff = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('name')

            if (error) throw error
            setStaff(data || [])
        } catch (error) {
            console.error('Error fetching staff:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchStaff()
        } catch (error) {
            console.error('Error deleting staff:', error)
            alert('Error deleting staff. Please try again.')
        }
    }

    const filteredStaff = staff.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)
    const paginatedStaff = filteredStaff.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0369A1]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 px-3 py-4 lg:px-4 lg:py-6">
            <div className="w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4 animate-slide-up">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-3 bg-indigo-50 rounded-2xl">
                                <Users size={24} className="text-indigo-600" />
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight">System Users</h1>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up [animation-delay:200ms]">
                    <div className="relative w-full md:w-auto md:min-w-[400px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-aesthetic pl-12 h-9 text-xs bg-white shadow-sm w-full"
                        />
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="btn-aesthetic h-9 px-4 flex items-center space-x-2 group shrink-0"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="tracking-widest text-xs">Register New User</span>
                    </button>
                </div>

                {/* Staff Table List */}
                <div className="card-aesthetic p-0 overflow-hidden bg-white border-none shadow-xl animate-slide-up [animation-delay:400ms]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User Profile</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mobile Number</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Role</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedStaff.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <Users size={48} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No staff members detected</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedStaff.map((member) => (
                                        <tr key={member.id} className="hover:bg-indigo-50/30 transition-colors group/row">
                                            <td className="px-2 py-1">
                                                <div className="text-sm font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors uppercase tracking-tight">
                                                    {member.name}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="text-xs text-slate-500 font-bold lowercase tracking-tight">
                                                    {member.email}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="text-xs text-slate-500 font-bold tracking-widest">
                                                    {member.mobile || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${member.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    member.role === 'MANAGER' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(member)}
                                                        className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all cursor-pointer bg-slate-50 border border-transparent hover:border-indigo-100"
                                                        title="Edit / Manage Commissions"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(member.id)}
                                                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all cursor-pointer bg-slate-50 border border-transparent hover:border-rose-100"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>

            </div>

            {/* Registration Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* Simplified Modal Content */}
                        <div className="p-8 md:p-10 overflow-y-auto bg-white custom-scrollbar h-full">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 font-heading">
                                        {modalMode === 'create' ? 'Register New User' : 'Edit User Profile'}
                                    </h3>
                                    <p className="text-slate-400 text-[10px] font-medium mt-0.5">Configure system access and profile settings.</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors bg-slate-50 rounded-xl">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Profile Info */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-2">Full Name</label>
                                            <input type="text" className="input-aesthetic h-11 py-0 text-sm" placeholder="John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-2">System Role</label>
                                            <div className="relative">
                                                <div
                                                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                                    className="input-aesthetic h-11 flex items-center justify-between cursor-pointer px-6 bg-white border-slate-200"
                                                >
                                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
                                                        {formData.role === 'USER' ? 'Staff / User' : formData.role === 'MANAGER' ? 'Manager' : 'Administrator'}
                                                    </span>
                                                    <ChevronDown size={14} className={`text-indigo-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>

                                                {isRoleDropdownOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsRoleDropdownOpen(false)} />
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {[
                                                                { value: 'USER', label: 'Staff / User' },
                                                                { value: 'MANAGER', label: 'Manager' },
                                                                { value: 'ADMIN', label: 'Administrator' }
                                                            ].map(opt => (
                                                                <div
                                                                    key={opt.value}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, role: opt.value as any });
                                                                        setIsRoleDropdownOpen(false);
                                                                    }}
                                                                    className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors
                                                                        ${formData.role === opt.value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}
                                                                    `}
                                                                >
                                                                    {opt.label}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-2">Email Address</label>
                                            <input type="email" className="input-aesthetic h-11 py-0 text-sm" placeholder="john@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-2">Mobile Number</label>
                                            <input
                                                type="tel"
                                                pattern="[0-9]{10}"
                                                maxLength={10}
                                                className="input-aesthetic h-11 py-0 text-sm"
                                                placeholder="10-digit number"
                                                value={formData.mobile}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                                                    setFormData({ ...formData, mobile: val })
                                                }}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block ml-2">Security Password</label>
                                        {!showPasswordField && modalMode === 'edit' ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordField(true)}
                                                className="w-full h-11 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-white hover:border-indigo-200 transition-all flex items-center justify-center gap-2 group/reset"
                                            >
                                                <Save size={14} className="group-hover/reset:scale-110 transition-transform" />
                                                Reset User Password
                                            </button>
                                        ) : (
                                            <input
                                                type="password"
                                                title="Set password"
                                                className="input-aesthetic h-11 py-0 text-sm"
                                                placeholder={modalMode === 'create' ? "Set password" : "Enter new password"}
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                required={modalMode === 'create' || (modalMode === 'edit' && showPasswordField)}
                                            />
                                        )}
                                    </div>
                                </div>

                                {formData.role === 'USER' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-2 border-indigo-600 pl-3">Service Benchmark Rates</p>
                                            <button type="button" onClick={handleAddCommission} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                <Plus size={14} className="mr-1" /> Add Service
                                            </button>
                                        </div>

                                        {commissions.length === 0 ? (
                                            <div className="bg-slate-50 rounded-2xl p-6 text-center border border-dashed border-slate-200">
                                                <p className="text-xs text-slate-400 font-medium italic">No services configured yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {commissions.map((comm, index) => (
                                                    <div key={index} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 relative animate-in slide-in-from-top-1">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Service</label>
                                                            <select className="input-aesthetic h-10 py-0 text-xs bg-white" value={comm.serviceId} onChange={e => updateCommission(index, 'serviceId', e.target.value)} required>
                                                                <option value="">Select Service...</option>
                                                                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Rate (%)</label>
                                                            <div className="relative">
                                                                <input type="number" step="0.01" className="input-aesthetic h-10 py-0 text-xs bg-white pr-8" value={comm.percentage || ''} onFocus={e => e.target.select()} onChange={e => updateCommission(index, 'percentage', e.target.value)} required min="0" max="100" />
                                                                <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                                            </div>
                                                        </div>
                                                        <button type="button" onClick={() => handleRemoveCommission(index)} className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all">
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 flex gap-4">
                                    <button type="submit" disabled={submitting} className="btn-aesthetic flex-1 h-11 text-xs flex items-center justify-center tracking-widest">
                                        <Save size={16} className="mr-2" /> {submitting ? 'Saving...' : (modalMode === 'create' ? 'Register Official Profile' : 'Update User Profile')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
