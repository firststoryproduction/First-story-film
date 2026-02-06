'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, Building2, User, Smartphone, Mail, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Vendor } from '@/types/database'
import Pagination from '@/components/Pagination'

export default function VendorsPage() {
    const { data: session, status } = useSession()
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
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (session?.user.role !== 'ADMIN' && session?.user.role !== 'MANAGER') {
            router.push('/dashboard')
        } else {
            fetchVendors()
        }
    }, [status, session, router])

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
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0369A1]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 px-3 py-4 lg:px-4 lg:py-6">
            <div className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4 animate-slide-up">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-3 bg-blue-50 rounded-2xl">
                                <Building2 size={24} className="text-blue-600" />
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight">Vendors & Studios</h1>
                        </div>
                    </div>
                </div>

                <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up [animation-delay:200ms]">
                    <div className="relative w-full md:w-auto md:min-w-[400px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by studio or contact name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-aesthetic pl-12 h-9 text-xs bg-white shadow-sm w-full"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn-aesthetic h-9 px-4 flex items-center space-x-2 group shrink-0"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="tracking-widest text-xs">Add New Vendor</span>
                    </button>
                </div>

                <div className="card-aesthetic p-0 overflow-hidden bg-white border-none shadow-xl animate-slide-up [animation-delay:400ms]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Studio / Vendor</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Person</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mobile Number</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email Address</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Location</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedVendors.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No production studios found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedVendors.map((vendor) => (
                                        <tr key={vendor.id} className="hover:bg-blue-50/30 transition-colors group/row">
                                            <td className="px-2 py-1">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-sm mr-4">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-900 group-hover/row:text-blue-600 transition-colors">{vendor.studio_name}</div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    <User size={14} className="mr-2 text-slate-400" /> {vendor.contact_person}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center text-xs text-slate-500 font-medium">
                                                    <Smartphone size={12} className="mr-2 text-slate-400" /> {vendor.mobile}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center text-xs text-slate-600 font-bold tracking-tight">
                                                    <Mail size={12} className="mr-2 text-indigo-400" /> {vendor.email || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                {vendor.location ? (
                                                    <div className="flex items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                        <MapPin size={14} className="mr-2 text-indigo-400" /> {vendor.location}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Not Set</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(vendor)}
                                                        className="p-1 text-slate-300 hover:text-blue-600 hover:bg-white rounded-lg transition-all cursor-pointer bg-slate-50 border border-transparent hover:border-blue-100"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(vendor.id)}
                                                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all cursor-pointer bg-slate-50 border border-transparent hover:border-rose-100"
                                                        title="Delete"
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

            {showModal && (
                <div className="modal-aesthetic-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-aesthetic" onClick={e => e.stopPropagation()}>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
                                {editingVendor ? 'Edit Vendor Details' : 'Add New Vendor'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">Configure partner information accurately.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Studio/Vendor Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input-aesthetic h-11 text-sm"
                                    value={formData.studio_name}
                                    onChange={e => setFormData({ ...formData, studio_name: e.target.value })}
                                    placeholder="e.g., Pixel Perfect Studios"
                                />
                            </div>
                            <div>
                                <label className="label">Contact Person</label>
                                <input
                                    type="text"
                                    required
                                    className="input-aesthetic h-11 text-sm"
                                    value={formData.contact_person}
                                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="e.g., John Doe"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Mobile Number</label>
                                    <input
                                        type="tel"
                                        required
                                        pattern="[0-9]{10}"
                                        maxLength={10}
                                        className="input-aesthetic h-11 text-sm"
                                        value={formData.mobile}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10)
                                            setFormData({ ...formData, mobile: val })
                                        }}
                                        placeholder="10-digit number"
                                    />
                                </div>
                                <div>
                                    <label className="label">Email Address</label>
                                    <input
                                        type="email"
                                        className="input-aesthetic h-11 text-sm"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@studio.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label">Location</label>
                                <input
                                    type="text"
                                    className="input-aesthetic h-11 text-sm"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Mumbai, Maharashtra"
                                />
                            </div>
                            <div>
                                <label className="label">Notes / Description (Optional)</label>
                                <textarea
                                    className="input-aesthetic min-h-[80px] py-3 text-sm resize-none"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Any additional details about the vendor..."
                                />
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button type="submit" className="btn-aesthetic flex-1 h-11 text-xs tracking-widest">
                                    {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="btn-aesthetic-secondary flex-1 h-11 text-xs tracking-widest">
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
