'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Search, Briefcase, Calendar, Sparkles, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service } from '@/types/database'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'
import Tooltip from '@/components/Tooltip'

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
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3500)
    }


    // Single initialization effect
    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                if (!mounted) return;
                await fetchServices();
            } catch (error) {
                console.error('ServicesPage: Error initializing:', error);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                showNotification('Service updated successfully')
            } else {
                const { error } = await (supabase as any)
                    .from('services')
                    .insert([{ name: serviceName }])
                if (error) throw error
                showNotification('Service created successfully')
            }
            setShowModal(false)
            setServiceName('')
            setEditingService(null)
            fetchServices()
        } catch (error) {
            console.error('Error saving service:', error)
            showNotification('Error saving service', 'error')
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
            showNotification('Service deleted successfully')
            fetchServices()
        } catch (error) {
            console.error('Error deleting service:', error)
            showNotification('Error deleting service. It may be in use by jobs.', 'error')
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


    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-72">
            <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Briefcase size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-black">Services</h1>
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
                                placeholder="Search by service name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-white border border-gray-300 rounded-lg text-sm font-normal focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400" />
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="w-full md:w-auto px-5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 group shrink-0"
                        >
                            <Plus size={14} />
                            <span>Add Service</span>
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto relative">
                        {loading && services.length === 0 ? (
                            <div className="h-32 flex items-center justify-center w-full">
                                <Spinner />
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/80 border-b border-slate-200">
                                        <th className="px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Service Name</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-600 uppercase tracking-wide">Date Created</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wide">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedServices.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={3} className="py-20 text-center">
                                                <div className="inline-flex p-5 bg-slate-50 rounded-full mb-3">
                                                    <Briefcase size={28} className="text-slate-200" />
                                                </div>
                                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">No services found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedServices.map((service, idx) => (
                                            <tr key={service.id} className="hover:bg-indigo-50/30 transition-colors group/row">
                                                <td className="px-6 py-1.5">
                                                    <div className="text-[14px] font-bold text-slate-900 group-hover/row:text-indigo-700 transition-colors flex items-center">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${['bg-indigo-400', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400'][idx % 4]} mr-3 opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100`} />
                                                        {service.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1.5">
                                                    <div className="flex items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                                                        <Calendar size={13} className="mr-2 text-amber-500" />
                                                        {new Date(service.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-1.5">
                                                    <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                        <Tooltip text="Edit">
                                                            <button
                                                                onClick={() => openEditModal(service)}
                                                                className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-sky-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-100 shadow-sm"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                        </Tooltip>
                                                        <Tooltip text="Delete">
                                                            <button
                                                                onClick={() => handleDelete(service.id)}
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
                    <div className="p-4 border-t border-slate-50 bg-slate-50/20">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage} />
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-black">
                                {editingService ? 'Edit Service' : 'New Service'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-900 mb-1 block">Service Name</label>
                                <input
                                    type="text"
                                    value={serviceName}
                                    onChange={(e) => setServiceName(e.target.value)}
                                    className="w-full h-9 px-3 text-sm font-normal border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g., Wedding Highlight"
                                    required
                                    autoFocus />
                            </div>
                            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-all"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-all">
                                    {editingService ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl border ${notification.type === 'success'
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'bg-rose-500 border-rose-400 text-white'
                        }`}>
                        {notification.type === 'success' ? (
                            <CheckCircle size={18} className="text-white" />
                        ) : (
                            <XCircle size={18} className="text-white" />
                        )}
                        <p className="text-[11px] font-black uppercase tracking-widest">{notification.message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

