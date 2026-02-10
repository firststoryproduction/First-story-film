'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Calendar, Building2, Edit2, ClipboardList, Clock, Zap, CheckCircle2, ExternalLink, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Job, Service, Vendor, User as StaffUser } from '@/types/database'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'

export default function JobsPage() {
    const router = useRouter()
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
    }

    useEffect(() => {
        fetchJobs()
    }, [])

    const fetchJobs = async () => {
        try {
            setLoading(true)
            // Joining with service, vendor, and staff
            const { data, error } = await supabase
                .from('jobs')
                .select(`
          *,
          service:services(name),
          vendor:vendors(studio_name),
          staff:users(name)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setJobs(data || [])
        } catch (error) {
            console.error('Error fetching jobs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (jobId: string, newStatus: string) => {
        try {
            console.log(`Updating job ${jobId} to status ${newStatus}`);
            const { error } = await (supabase
                .from('jobs') as any)
                .update({ 
                    status: newStatus,
                    updated_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
                    completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
                    started_at: newStatus === 'IN_PROGRESS' ? new Date().toISOString() : undefined
                })
                .eq('id', jobId)

            if (error) {
                console.error('Supabase Error:', error);
                throw error;
            }
            
            showNotification(`Job marked as ${newStatus.replace('_', ' ')}`)
            
            // Local state update for immediate feedback
            setJobs(prevJobs => prevJobs.map(j => 
                j.id === jobId ? { ...j, status: newStatus } : j
            ));
        } catch (error) {
            console.error('Error updating status:', error)
            showNotification('Failed to update status', 'error');
        }
    }

    const handleDelete = async (jobId: string) => {
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return

        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', jobId)

            if (error) throw error

            showNotification('Job deleted successfully')
            setJobs(prevJobs => prevJobs.filter(j => j.id !== jobId))
        } catch (error) {
            console.error('Error deleting job:', error)
            showNotification('Failed to delete job', 'error')
        }
    }

    const filteredJobs = jobs.filter(job =>
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.service?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.staff?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.vendor?.studio_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE)
    const paginatedJobs = filteredJobs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    return (
        <div className="min-h-screen bg-[#f1f5f9] lg:ml-72">
            <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center">
                            <ClipboardList size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">Job Management</h1>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
                    
                    {/* Toolbar Inside Card */}
                    <div className="px-6 py-4 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-[320px] group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search by job, staff, vendor or service..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 shadow-inner"
                            />
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/admin/jobs/new')}
                            className="w-full md:w-auto px-5 h-9 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center space-x-2 group shrink-0 shadow-lg shadow-indigo-100"
                        >
                            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="tracking-widest capitalize">Create New Job</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto relative">
                        {loading && jobs.length === 0 ? (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                <Spinner />
                            </div>
                        ) : null}

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vendor</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Job Type</th>
                                    <th className="pl-4 pr-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Work Description</th>
                                    <th className="pl-1 pr-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Assigned To</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Amount</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Due Date</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedJobs.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="inline-flex p-5 bg-slate-50 rounded-full mb-3">
                                                <ClipboardList size={28} className="text-slate-200" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">No productions detected</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedJobs.map((job) => (
                                        <tr 
                                            key={job.id} 
                                            onClick={() => router.push(`/dashboard/admin/jobs/view/${job.id}`)}
                                            className="hover:bg-slate-50/50 transition-colors group/row cursor-pointer"
                                        >
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[11px] text-slate-400 font-bold flex items-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 mr-3 opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100" />
                                                    <Building2 size={12} className="mr-2 text-indigo-300" />
                                                    {job.vendor?.studio_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors text-[13px] leading-none flex items-center group/name">
                                                    {job.service?.name}
                                                </div>
                                            </td>
                                            <td className="pl-4 pr-1 py-1.5">
                                                <div className="text-[12px] text-slate-400 font-bold leading-relaxed max-w-[200px] line-clamp-1 italic">{job.description}</div>
                                            </td>
                                            <td className="pl-1 pr-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[13px] font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors flex items-center">
                                                    {job.staff?.name || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[12px] font-black text-slate-900">{formatCurrency(job.amount)}</div>
                                                <div className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">Comm: {formatCurrency(job.commission_amount)}</div>
                                            </td>
                                            <td className="px-4 py-1.5 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${job.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600' :
                                                    job.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' :
                                                        'bg-indigo-600 text-white border-indigo-700'
                                                    }`}>
                                                    {job.status === 'IN_PROGRESS' ? 'IN-PROGRESS' : 
                                                     job.status === 'COMPLETED' ? 'COMPLETE' : 
                                                     job.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[11px] text-slate-400 font-bold flex items-center">
                                                    <Calendar size={13} className="mr-2 text-indigo-300" /> {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleStatusUpdate(job.id, 'PENDING')}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'PENDING' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#F59E0B] hover:border-amber-200'}`}
                                                        title="Mark as Pending"
                                                    >
                                                        <Clock size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(job.id, 'IN_PROGRESS')}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'IN_PROGRESS' ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#4F46E5] hover:border-indigo-200'}`}
                                                        title="Mark as In-Progress"
                                                    >
                                                        <Zap size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(job.id, 'COMPLETED')}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'COMPLETED' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#10B981] hover:border-emerald-200'}`}
                                                        title="Mark as Completed"
                                                    >
                                                        <CheckCircle2 size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                                                    <button
                                                        onClick={() => router.push(`/dashboard/admin/jobs/edit/${job.id}`)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white text-slate-500 hover:text-white hover:bg-slate-900 rounded-lg transition-all border border-slate-100 hover:border-slate-900 shadow-sm"
                                                        title="Edit Job"
                                                    >
                                                        <Edit2 size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(job.id)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all border border-slate-100 hover:border-rose-500 shadow-sm"
                                                        title="Delete Job"
                                                    >
                                                        <Trash2 size={14} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 border-t border-slate-50 bg-slate-50/20">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl border ${
                        notification.type === 'success' 
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
