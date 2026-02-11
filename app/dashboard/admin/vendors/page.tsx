'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, Building2, User, Smartphone, Mail, MapPin, CheckCircle, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Vendor } from '@/types/database'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'

export default function VendorsPage() {
    const router = useRouter()
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const ITEMS_PER_PAGE = 10
    const [showModal, setShowModal] = useState(false)
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const [formData, setFormData] = useState({
        studio_name: '',
        contact_person: '',
        mobile: '',
        email: '',
        location: '',
        notes: ''
    })

    useEffect(() => {
        fetchVendors()
    }, [currentPage, searchTerm])

    const fetchVendors = async () => {
        try {
            setLoading(true)
            const start = (currentPage - 1) * ITEMS_PER_PAGE
            const end = start + ITEMS_PER_PAGE - 1

            let query = (supabase.from('vendors') as any)
                .select('*', { count: 'exact' })

            if (searchTerm) {
                query = query.or(`studio_name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%`)
            }

            const { data, error, count } = await query
                .order('studio_name')
                .range(start, end)

            if (error) throw error
            setVendors(data || [])
            setTotalCount(count || 0)
        } catch (error) {
            console.error('Error fetching vendors:', error)
        } finally {
            setLoading(false)
        }
    }

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const mobileRegex = /^[0-9]{10}$/

            if (formData.email && !emailRegex.test(formData.email)) {
                showNotification('Please enter a valid email address.', 'error')
                setLoading(false)
                return
            }

            if (!mobileRegex.test(formData.mobile)) {
                showNotification('Please enter a valid 10-digit mobile number.', 'error')
                setLoading(false)
                return
            }

            if (editingVendor) {
                const { error } = await (supabase
                    .from('vendors') as any)
                    .update(formData)
                    .eq('id', editingVendor.id)
                if (error) throw error
                showNotification('Vendor updated successfully!')
            } else {
                // Use Admin API to bypass RLS for vendor creation
                const { data: { session } } = await supabase.auth.getSession()
                const response = await fetch('/api/admin/create-vendor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify(formData)
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Failed to create vendor')
                }
                showNotification('Vendor registered successfully!')
            }

            setShowModal(false)
            resetForm()
            fetchVendors()
        } catch (error: any) {
            console.error('Error saving vendor:', error)
            showNotification(error.message || 'Something went wrong while saving.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return

        try {
            const { error } = await (supabase
                .from('vendors') as any)
                .delete()
                .eq('id', id)
            if (error) throw error
            showNotification('Vendor deleted successfully')
            fetchVendors()
        } catch (error: any) {
            console.error('Error deleting vendor:', error)
            showNotification(error.message || 'Error deleting vendor', 'error')
        }
    }

    const openEditModal = (vendor: Vendor) => {
        setEditingVendor(vendor)
        setFormData({
            studio_name: vendor.studio_name,
            contact_person: vendor.contact_person,
            mobile: vendor.mobile,
            email: vendor.email || '',
            location: vendor.location || '',
            notes: vendor.notes || ''
        })
        setShowModal(true)
    }

    const resetForm = () => {
        setEditingVendor(null)
        setFormData({ studio_name: '', contact_person: '', mobile: '', email: '', location: '', notes: '' })
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
    const paginatedVendors = vendors

    useEffect(() => {
        if (currentPage !== 1) setCurrentPage(1)
    }, [searchTerm])

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-72">
            <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center">
                            <Building2 size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">Vendors & Studios</h1>
                        </div>
                    </div>
                </div>

                {/* Main Operations Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">

                    {/* Toolbar Inside Card */}
                    <div className="px-6 py-4 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-[320px] group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search by studio or contact name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-500 shadow-inner" />
                        </div>
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="w-full md:w-auto px-5 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center space-x-2 group shrink-0 shadow-lg shadow-indigo-100/50"
                        >
                            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Add Vendor</span>
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto relative">
                        {loading && vendors.length === 0 ? (
                            <div className="h-32 flex items-center justify-center w-full">
                                <Spinner />
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/80 border-b border-slate-200">
                                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Studio Details</th>
                                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Location</th>
                                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contact Person</th>
                                        <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contact Info</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedVendors.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <div className="inline-flex p-5 bg-slate-50 rounded-full mb-3">
                                                    <Building2 size={28} className="text-slate-200" />
                                                </div>
                                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">No vendors found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedVendors.map((vendor, vIdx) => (
                                            <tr
                                                key={vendor.id}
                                                className="hover:bg-indigo-50/30 transition-colors group/row cursor-pointer"
                                                onClick={() => router.push(`/dashboard/admin/vendors/view/${vendor.id}`)}
                                            >
                                                <td className="px-6 py-1.5">
                                                    <div className="text-[14px] font-bold text-slate-900 group-hover/row:text-indigo-700 transition-colors flex items-center">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${['bg-indigo-400', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400'][vIdx % 4]} mr-3 opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100`} />
                                                        {vendor.studio_name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1.5">
                                                    <div className="flex items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                                                        <MapPin size={13} className="mr-2 text-sky-400" />
                                                        {vendor.location || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1.5">
                                                    <div className="text-[11px] text-slate-500 font-bold flex items-center">
                                                        <User size={12} className="mr-2 text-amber-500" />
                                                        {vendor.contact_person}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1.5">
                                                    <div className="flex flex-col space-y-0.5">
                                                        <div className="text-[11px] text-slate-500 font-bold flex items-center">
                                                            <Smartphone size={12} className="mr-2 text-sky-400" />
                                                            {vendor.mobile}
                                                        </div>
                                                        {vendor.email && (
                                                            <div className="text-[10px] text-slate-500 font-bold ml-5">
                                                                {vendor.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1.5">
                                                    <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => router.push(`/dashboard/admin/vendors/view/${vendor.id}`)}
                                                            className="w-7 h-7 flex items-center justify-center text-emerald-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                                                            title="View Vendor Details"
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(vendor)}
                                                            className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                                                            title="Edit Vendor"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(vendor.id)}
                                                            className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                                                            title="Delete Vendor"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
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
                    <div className="p-4 border-t border-slate-50 bg-slate-50/20">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage} />
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-aesthetic-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-aesthetic" onClick={e => e.stopPropagation()}>
                        <div className="mb-6">
                            <h2 className="text-xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">
                                {editingVendor ? 'Edit Vendor' : 'New Vendor'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Studio Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-aesthetic h-11 px-4 text-sm"
                                    value={formData.studio_name}
                                    onChange={e => setFormData({ ...formData, studio_name: e.target.value })}
                                    placeholder="e.g. Dream Wedding Films" />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Contact Person</label>
                                <input
                                    type="text"
                                    required
                                    className="input-aesthetic h-11 px-4 text-sm"
                                    value={formData.contact_person}
                                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Full Name" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Mobile Number</label>
                                    <input
                                        type="tel"
                                        required
                                        pattern="[0-9]{10}"
                                        maxLength={10}
                                        className="input-aesthetic h-11 px-4 text-sm"
                                        value={formData.mobile}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                                            setFormData({ ...formData, mobile: val })
                                        }}
                                        placeholder="10-digit number" />
                                </div>
                                <div>
                                    <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Email Address</label>
                                    <input
                                        type="email"
                                        className="input-aesthetic h-11 px-4 text-sm"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@studio.com" />
                                </div>
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Location</label>
                                <input
                                    type="text"
                                    className="input-aesthetic h-11 px-4 text-sm"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Mumbai, Maharashtra" />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Notes / Description (Optional)</label>
                                <textarea
                                    className="input-aesthetic min-h-[60px] p-4 text-sm resize-none"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Any additional details..." />
                            </div>
                            <div className="flex space-x-3 pt-4 border-t border-slate-50">
                                <button type="submit" className="flex-1 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100/50 transition-all duration-300">
                                    {editingVendor ? 'Update' : 'Save'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-11 bg-white text-slate-500 hover:text-slate-600 border border-slate-100 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Proper Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl border ${notification.type === 'success'
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'bg-rose-500 border-rose-400 text-white'
                        }`}>
                        {notification.type === 'success' ? (
                            <CheckCircle size={18} className="text-white" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">!</div>
                        )}
                        <p className="text-[11px] font-black uppercase tracking-widest">{notification.message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

