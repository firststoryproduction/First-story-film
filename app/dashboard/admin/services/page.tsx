'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, Briefcase, Calendar, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service } from '@/types/database'
import Pagination from '@/components/Pagination'

export default function ServicesPage() {
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
    }, [router])

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
            <div className="lg:ml-72 min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin"></div>
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
                            <Briefcase size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">Services</h1>
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
                                placeholder="Search by service name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-50/50 border-none rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 shadow-inner"
                            />
                        </div>
                        <button 
                            onClick={openCreateModal} 
                            className="w-full md:w-auto px-5 h-9 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center space-x-2 group shrink-0 shadow-lg shadow-indigo-100"
                        >
                            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span>Add Service</span>
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30">
                                    <th className="px-12 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Service Name</th>
                                    <th className="px-12 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date Created</th>
                                    <th className="px-12 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedServices.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center">
                                            <div className="inline-flex p-5 bg-slate-50 rounded-full mb-3">
                                                <Briefcase size={28} className="text-slate-200" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No services found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedServices.map((service) => (
                                        <tr key={service.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                            <td className="px-12 py-0.5">
                                                <div className="text-sm font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors flex items-center">
                                                    <div className="w-1 h-1 rounded-full bg-indigo-200 mr-3 opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100" />
                                                    {service.name}
                                                </div>
                                            </td>
                                            <td className="px-12 py-0.5">
                                                <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <Calendar size={10} className="mr-2 text-indigo-300" />
                                                    {new Date(service.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-12 py-0.5">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <button
                                                        onClick={() => openEditModal(service)}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id)}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100"
                                                        title="Delete"
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

            {/* Modal */}
            {showModal && (
                <div className="modal-aesthetic-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-aesthetic max-w-sm rounded-[2.5rem] p-10 animate-scale-up" onClick={e => e.stopPropagation()}>
                        <div className="mb-6">
                            <h2 className="text-xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">
                                {editingService ? 'Refine Service' : 'New Service'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Service Name</label>
                                <input
                                    type="text"
                                    value={serviceName}
                                    onChange={(e) => setServiceName(e.target.value)}
                                    className="input-aesthetic h-11 px-4 text-sm"
                                    placeholder="e.g., Wedding Highlight"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                                <button type="submit" className="flex-1 h-11 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 transition-all duration-300">
                                    {editingService ? 'Official Update' : 'Official Create'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 h-11 bg-white text-slate-300 hover:text-slate-600 border border-slate-100 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
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
