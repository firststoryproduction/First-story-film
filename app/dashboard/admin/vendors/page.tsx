'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, Building2, User, Smartphone, Mail, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Vendor } from '@/types/database'
import Pagination from '@/components/Pagination'

export default function VendorsPage() {
    const router = useRouter()
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const [showModal, setShowModal] = useState(false)
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

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
    }, [router])

    const fetchVendors = async () => {
        try {
            const { data, error } = await (supabase
                .from('vendors') as any)
                .select('*')
                .order('studio_name')

            if (error) throw error
            setVendors(data || [])
        } catch (error) {
            console.error('Error fetching vendors:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            const mobileRegex = /^[0-9]{10}$/

            if (formData.email && !emailRegex.test(formData.email)) {
                alert('Please enter a valid email address.')
                setLoading(false)
                return
            }

            if (!mobileRegex.test(formData.mobile)) {
                alert('Please enter a valid 10-digit mobile number.')
                setLoading(false)
                return
            }

            if (editingVendor) {
                const { error } = await (supabase
                    .from('vendors') as any)
                    .update(formData)
                    .eq('id', editingVendor.id)
                if (error) throw error
            } else {
                const { error } = await (supabase
                    .from('vendors') as any)
                    .insert([formData])
                if (error) throw error
            }

            setShowModal(false)
            resetForm()
            fetchVendors()
        } catch (error: any) {
            console.error('Error saving vendor:', error)
            alert(`Error: ${error.message || 'Something went wrong while saving.'}`)
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
            fetchVendors()
        } catch (error) {
            console.error('Error deleting vendor:', error)
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

    const filteredVendors = vendors.filter(v =>
        v.studio_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.mobile.includes(searchTerm) ||
        (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE)
    const paginatedVendors = filteredVendors.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    if (loading && vendors.length === 0) {
        return (
            <div className="lg:ml-72 min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0369A1]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 lg:ml-72">
            <div className="w-full px-2 py-4 lg:px-4 lg:py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-slide-up px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] shadow-lg shadow-indigo-100 flex items-center justify-center">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">Vendors & Studios</h1>
                        </div>
                    </div>
                </div>

                {/* Main Operations Card */}
                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden animate-slide-up [animation-delay:200ms]">
                    
                    {/* Toolbar Inside Card */}
                    <div className="px-12 py-5 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-[350px] group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search by studio or contact name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-50/50 border-none rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                            />
                        </div>
                        <button 
                            onClick={() => { resetForm(); setShowModal(true); }} 
                            className="w-full md:w-auto px-5 h-9 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center space-x-2 group shrink-0 shadow-lg shadow-indigo-100"
                        >
                            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Add Vendor</span>
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30">
                                    <th className="px-12 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Studio Details</th>
                                    <th className="px-12 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Person</th>
                                    <th className="px-12 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Info</th>
                                    <th className="px-12 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedVendors.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="inline-flex p-5 bg-slate-50 rounded-full mb-3">
                                                <Building2 size={28} className="text-slate-200" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No vendors found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedVendors.map((vendor) => (
                                        <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                            <td className="px-12 py-0.5">
                                                <div className="text-sm font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors flex items-center">
                                                    <div className="w-1 h-1 rounded-full bg-indigo-200 mr-3 opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100" />
                                                    {vendor.studio_name}
                                                </div>
                                                <div className="text-[9px] text-slate-400 font-bold mt-0.5 ml-4">{vendor.location || 'No Location Set'}</div>
                                            </td>
                                            <td className="px-12 py-0.5">
                                                <div className="text-[10px] text-slate-400 font-bold flex items-center">
                                                    <User size={10} className="mr-2 text-indigo-300" />
                                                    {vendor.contact_person}
                                                </div>
                                            </td>
                                            <td className="px-12 py-0.5">
                                                <div className="flex flex-col space-y-0.5">
                                                    <div className="text-[10px] text-slate-400 font-bold flex items-center">
                                                        <Smartphone size={10} className="mr-2 text-indigo-300" />
                                                        {vendor.mobile}
                                                    </div>
                                                    {vendor.email && (
                                                        <div className="text-[9px] text-slate-300 font-bold ml-4">
                                                            {vendor.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-12 py-0.5">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <button
                                                        onClick={() => openEditModal(vendor)}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"
                                                        title="Edit Vendor"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(vendor.id)}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"
                                                        title="Delete Vendor"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Container */}
                    <div className="p-4 border-t border-slate-50 bg-slate-50/20">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal-aesthetic-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-aesthetic" onClick={e => e.stopPropagation()}>
                        <div className="mb-6">
                            <h2 className="text-xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">
                                {editingVendor ? 'Refine Vendor' : 'New Vendor'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Studio Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-aesthetic h-11 px-4 text-sm"
                                    value={formData.studio_name}
                                    onChange={e => setFormData({ ...formData, studio_name: e.target.value })}
                                    placeholder="e.g. Dream Wedding Films"
                                />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Contact Person</label>
                                <input
                                    type="text"
                                    required
                                    className="input-aesthetic h-11 px-4 text-sm"
                                    value={formData.contact_person}
                                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Full Name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Mobile Number</label>
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
                                        placeholder="10-digit number"
                                    />
                                </div>
                                <div>
                                    <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Email Address</label>
                                    <input
                                        type="email"
                                        className="input-aesthetic h-11 px-4 text-sm"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@studio.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Location</label>
                                <input
                                    type="text"
                                    className="input-aesthetic h-11 px-4 text-sm"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Mumbai, Maharashtra"
                                />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Notes / Description (Optional)</label>
                                <textarea
                                    className="input-aesthetic min-h-[60px] p-4 text-sm resize-none"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Any additional details..."
                                />
                            </div>
                            <div className="flex space-x-3 pt-4 border-t border-slate-50">
                                <button type="submit" className="flex-1 h-11 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 transition-all duration-300">
                                    {editingVendor ? 'Official Update' : 'Official Save'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-11 bg-white text-slate-300 hover:text-slate-600 border border-slate-100 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
