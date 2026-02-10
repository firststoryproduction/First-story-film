'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, Square, Pause, ExternalLink, Calendar, MapPin, CheckCircle2, Search, Clock, Building2, ChevronDown, Layout, Zap, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Job } from '@/types/database'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import Pagination from '@/components/Pagination'
import Spinner from '@/components/Spinner'

export default function MyJobsPage() {
    const router = useRouter()
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Action state
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [finalLocation, setFinalLocation] = useState('')
    const [completingJobId, setCompletingJobId] = useState<string | null>(null)
    const [debugCount, setDebugCount] = useState<number | null>(null)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setCurrentUser(user)
                await fetchMyJobs(user.id)
            }
        }
        init()
    }, [])

    const fetchMyJobs = async (userId: string) => {
        setLoading(true)
        console.log('MyJobs: Fetching jobs for user ID:', userId)

        try {
            // Fetch jobs
            const { data, error, count } = await (supabase.from('jobs') as any)
                .select(`
                  *,
                  service:services(name),
                  vendor:vendors(studio_name)
                `, { count: 'exact' })
                .eq('staff_id', userId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('MyJobs: Supabase Error:', error.message, error.code)
                throw error
            }

            console.log('MyJobs: Query successful. Jobs found:', data?.length, 'Count:', count)
            if (data && data.length > 0) {
                console.log('MyJobs: First job sample:', data[0])
            }
            
            setJobs(data || [])
            setDebugCount(count || 0)
        } catch (error: any) {
            console.error('Error fetching jobs:', error.message || error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (jobId: string, newStatus: string, extraData: any = {}) => {
        setActionLoading(jobId)
        try {
            const updatePayload: any = {
                status: newStatus,
                ...extraData
            }

            if (newStatus === 'IN_PROGRESS') {
                updatePayload.started_at = new Date().toISOString()
            }

            if (newStatus === 'COMPLETED') {
                updatePayload.completed_at = new Date().toISOString()
            }

            const { error } = await (supabase.from('jobs') as any)
                .update(updatePayload)
                .eq('id', jobId)

            if (error) throw error

            setCompletingJobId(null)
            setFinalLocation('')
            if (currentUser?.id) {
                await fetchMyJobs(currentUser.id)
            }
        } catch (error: any) {
            console.error('Error updating status:', error.message || error)
        } finally {
            setActionLoading(null)
        }
    }

    const filteredJobs = jobs.filter(job => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const serviceName = job.service?.name?.toLowerCase() || '';
        const description = job.description?.toLowerCase() || '';
        return serviceName.includes(search) || description.includes(search);
    })

    const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE)
    const paginatedJobs = filteredJobs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    return (
        <div className="min-h-screen bg-[#f1f5f9] lg:ml-72 relative">
            {loading && jobs.length === 0 && (
                <div className="absolute inset-0 bg-[#f1f5f9] z-50 flex items-center justify-center">
                    <Spinner />
                </div>
            )}
            <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center">
                            <Layout size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase flex items-center gap-4">
                                My Jobs
                                {debugCount !== null && (
                                    <span className="text-[9px] bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-black tracking-widest">
                                        {debugCount} ASSIGNED
                                    </span>
                                )}
                            </h1>
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
                                placeholder="Search by job details or studio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto relative">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Studio</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Job Type</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Work Description</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Due Date</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Update</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedJobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="animate-pulse">
                                                <CheckCircle2 size={72} className="mx-auto text-slate-100 mb-8" />
                                                <h2 className="text-2xl font-black text-slate-200 uppercase tracking-[0.2em] font-heading">Clear Skies</h2>
                                                <p className="text-slate-400 mt-4 text-xs font-bold uppercase tracking-widest">No assigned benchmarks in your production roster.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedJobs.map((job) => (
                                        <tr 
                                            key={job.id} 
                                            onClick={() => router.push(`/dashboard/staff/my-jobs/view/${job.id}`)}
                                            className="hover:bg-indigo-50/10 transition-colors group/row cursor-pointer"
                                        >
                                            <td className="px-4 py-1.5">
                                                <div className="flex items-center text-[12px] font-bold text-slate-600">
                                                    <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center mr-3 group-hover/row:bg-indigo-600 group-hover/row:text-white transition-colors">
                                                        <Building2 size={13} />
                                                    </div>
                                                    {job.vendor?.studio_name || 'Individual'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <div className="font-bold text-slate-900 text-[14px] group-hover/row:text-indigo-600 transition-colors leading-tight">
                                                    {job.service?.name || 'Manual Project'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <div className="text-[12px] text-slate-400 font-bold leading-relaxed max-w-[250px] line-clamp-1 italic">
                                                    {job.description || 'No description provided'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${job.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600' :
                                                    job.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' :
                                                        'bg-indigo-600 text-white border-indigo-700'
                                                    }`}>
                                                    {job.status === 'IN_PROGRESS' ? 'IN-PROGRESS' : 
                                                     job.status === 'COMPLETED' ? 'COMPLETE' : 
                                                     job.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <div className="flex items-center text-[11px] text-slate-400 font-bold tracking-wider">
                                                    <Calendar size={13} className="mr-2 text-indigo-300" />
                                                    {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.id, 'PENDING')}
                                                        disabled={actionLoading === job.id}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'PENDING' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#F59E0B] hover:border-amber-200'}`}
                                                        title="Mark as Pending"
                                                    >
                                                        <Clock size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.id, 'IN_PROGRESS')}
                                                        disabled={actionLoading === job.id}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'IN_PROGRESS' ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#4F46E5] hover:border-indigo-200'}`}
                                                        title="Mark as In-Progress"
                                                    >
                                                        <Zap size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.id, 'COMPLETED')}
                                                        disabled={actionLoading === job.id}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'COMPLETED' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#10B981] hover:border-emerald-200'}`}
                                                        title="Mark as Completed"
                                                    >
                                                        <CheckCircle2 size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                                                    <button
                                                        onClick={() => router.push(`/dashboard/staff/my-jobs/view/${job.id}`)}
                                                        className="w-8 h-8 flex items-center justify-center bg-white text-slate-500 hover:text-white hover:bg-slate-900 rounded-lg transition-all border border-slate-100 hover:border-slate-900 shadow-sm"
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {paginatedJobs.length > 0 && (
                        <div className="p-4 border-t border-slate-50 bg-slate-50/20">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
