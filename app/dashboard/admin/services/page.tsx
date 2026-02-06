'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, Briefcase, Calendar, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service } from '@/types/database'
import Pagination from '@/components/Pagination'

export default function ServicesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const [showModal, setShowModal] = useState(false)
    const [editingService, setEditingService] = useState<Service | null>(null)
    const [serviceName, setServiceName] = useState('')

    useEffect(() => {
        fetchServices()
    }, [status, session, router])

    const fetchServices = async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('services')
                .select('*')
                .order('name')

            if (error) throw error
            setServices(data || [])
        } catch (error) {
            console.error('Error fetching services:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingService) {
                const { error } = await (supabase as any)
                    .from('services')
                    .update({ name: serviceName })
                    .eq('id', editingService.id)
                if (error) throw error
            } else {
                const { error } = await (supabase as any)
                    .from('services')
                    .insert([{ name: serviceName }])
                if (error) throw error
            }
            setShowModal(false)
            setServiceName('')
            setEditingService(null)
            fetchServices()
        } catch (error) {
            console.error('Error saving service:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return
        try {
            const { error } = await (supabase as any)
                .from('services')
                .delete()
                .eq('id', id)
            if (error) throw error
            fetchServices()
        } catch (error) {
            console.error('Error deleting service:', error)
            alert('Error deleting service. It may be in use by jobs.')
        }
    }

    const openEditModal = (service: Service) => {
        setEditingService(service)
        setServiceName(service.name)
        setShowModal(true)
    }

    const openCreateModal = () => {
        setEditingService(null)
        setServiceName('')
        setShowModal(true)
    }

    const filteredServices = services.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE)
    const paginatedServices = filteredServices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 lg:ml-72 p-0 lg:p-0">
            <div className="w-full px-3 py-4 lg:px-4 lg:py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4 animate-slide-up">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-3 bg-indigo-50 rounded-2xl">
                                <Briefcase size={24} className="text-indigo-600" />
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight">Services</h1>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up [animation-delay:200ms]">
                    <div className="relative w-full md:w-auto md:min-w-[400px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by service name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-aesthetic pl-12 h-9 text-xs bg-white shadow-sm w-full"
                        />
                    </div>
                    <button onClick={openCreateModal} className="btn-aesthetic h-9 px-4 flex items-center space-x-2 group shrink-0">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="tracking-widest text-xs">Add Service</span>
                    </button>
                </div>

                {/* Services Table List */}
                <div className="card-aesthetic p-0 overflow-hidden bg-white border-none shadow-xl animate-slide-up [animation-delay:400ms]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Service Name</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date Created</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedServices.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <Briefcase size={48} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No services found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedServices.map((service) => (
                                        <tr key={service.id} className="hover:bg-indigo-50/30 transition-colors group/row">
                                            <td className="px-2 py-1">
                                                <div className="text-sm font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors">{service.name}</div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <Calendar size={12} className="mr-2 text-indigo-400" />
                                                    {new Date(service.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(service)}
                                                        className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all cursor-pointer bg-slate-50 border border-transparent hover:border-indigo-100"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id)}
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

            {/* Modal */}
            {showModal && (
                <div className="modal-aesthetic-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-aesthetic" onClick={e => e.stopPropagation()}>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
                                {editingService ? 'Edit Service' : 'Add New Service'}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">Configure service parameters for production.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="label">Service Name</label>
                                <input
                                    type="text"
                                    value={serviceName}
                                    onChange={(e) => setServiceName(e.target.value)}
                                    className="input-aesthetic h-11 bg-slate-50 text-sm"
                                    placeholder="e.g., Wedding Highlight"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-4">
                                <button type="submit" className="btn-aesthetic flex-1 h-11 text-xs tracking-widest">
                                    {editingService ? 'Update Service' : 'Create Service'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-aesthetic-secondary flex-1 h-11 text-xs tracking-widest"
                                >
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
