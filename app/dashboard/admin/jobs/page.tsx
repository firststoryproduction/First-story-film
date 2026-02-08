'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Calendar, Building2, Edit2, ClipboardList, Clock, Zap, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Job, Service, Vendor, User as StaffUser } from '@/types/database'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import Pagination from '@/components/Pagination'

export default function JobsPage() {
    const router = useRouter()
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    useEffect(() => {
        fetchJobs()
    }, [router])

    const fetchJobs = async () => {
        try {
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
            const { error } = await supabase
                .from('jobs')
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
            
            // Local state update for immediate feedback
            setJobs(prevJobs => prevJobs.map(j => 
                j.id === jobId ? { ...j, status: newStatus } : j
            ));
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update status. Please check console for details.');
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

    if (loading && jobs.length === 0) {
        return (
            <div className="lg:ml-72 min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0369A1]"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72">
            <div className="w-full px-2 py-4 lg:px-4 lg:py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-slide-up px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] shadow-lg shadow-indigo-100 flex items-center justify-center">
                            <ClipboardList size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">Job Management</h1>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden animate-slide-up [animation-delay:200ms]">
                    
                    {/* Toolbar Inside Card */}
                    <div className="px-6 py-5 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-[350px] group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search by job, staff, vendor or service..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-50/50 border-none rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 shadow-inner"
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

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vendor</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Job Type</th>
                                    <th className="pl-4 pr-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Work Description</th>
                                    <th className="pl-1 pr-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned To</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">job amount</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Job Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Due Date</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedJobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="inline-flex p-5 bg-slate-50 rounded-full mb-3">
                                                <ClipboardList size={28} className="text-slate-200" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">No active productions detected</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedJobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                            <td className="px-4 py-0.5 whitespace-nowrap">
                                                <div className="text-[10px] text-slate-400 font-bold flex items-center">
                                                    <div className="w-1 h-1 rounded-full bg-indigo-200 mr-3 opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100" />
                                                    <Building2 size={10} className="mr-2 text-indigo-300" />
                                                    {job.vendor?.studio_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-0.5 whitespace-nowrap">
                                                <div className="font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors text-[11px] leading-none">{job.service?.name}</div>
                                            </td>
                                            <td className="pl-4 pr-1 py-0.5">
                                                <div className="text-[11px] text-slate-400 font-bold leading-relaxed max-w-[200px] line-clamp-1 italic">{job.description}</div>
                                            </td>
                                            <td className="pl-1 pr-4 py-0.5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors flex items-center">
                                                    {job.staff?.name || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-0.5 whitespace-nowrap">
                                                <div className="text-[11px] font-black text-slate-900">{formatCurrency(job.amount)}</div>
                                                <div className="text-[8px] text-emerald-600 font-black uppercase tracking-wider">Comm: {formatCurrency(job.commission_amount)}</div>
                                            </td>
                                            <td className="px-4 py-0.5 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${job.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600' :
                                                    job.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' :
                                                        'bg-indigo-600 text-white border-indigo-700'
                                                    }`}>
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-0.5 whitespace-nowrap">
                                                <div className="text-[10px] text-slate-400 font-bold flex items-center">
                                                    <Calendar size={10} className="mr-2 text-indigo-300" /> {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-0.5">
                                                <div className="flex items-center justify-center space-x-1.5">
                                                    <button
                                                        onClick={() => handleStatusUpdate(job.id, 'PENDING')}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all border shadow-sm ${job.status === 'PENDING' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'bg-white text-slate-300 border-slate-100 hover:text-[#F59E0B] hover:border-amber-200'}`}
                                                        title="Mark as Pending"
                                                    >
                                                        <Clock size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(job.id, 'IN_PROGRESS')}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all border shadow-sm ${job.status === 'IN_PROGRESS' ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white text-slate-300 border-slate-100 hover:text-[#4F46E5] hover:border-indigo-200'}`}
                                                        title="Mark as In Progress"
                                                    >
                                                        <Zap size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(job.id, 'COMPLETED')}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all border shadow-sm ${job.status === 'COMPLETED' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white text-slate-300 border-slate-100 hover:text-[#10B981] hover:border-emerald-200'}`}
                                                        title="Mark as Completed"
                                                    >
                                                        <CheckCircle2 size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                                                    <button
                                                        onClick={() => router.push(`/dashboard/admin/jobs/edit/${job.id}`)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all border border-slate-100 hover:border-slate-900 shadow-sm"
                                                        title="Edit Job"
                                                    >
                                                        <Edit2 size={14} strokeWidth={2.5} />
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
        </div>
    )
}
