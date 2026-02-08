'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Square, Pause, ExternalLink, Calendar, MapPin, CheckCircle2, Search, Clock, Building2, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Job } from '@/types/database'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import Pagination from '@/components/Pagination'
import AestheticSelect from '@/components/AestheticSelect'

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
            await fetchMyJobs()
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

    if (loading && jobs.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] lg:ml-72">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 p-6 lg:p-10 text-slate-900 font-body">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 animate-slide-up">
                    <h1 className="text-3xl font-bold text-slate-900 font-heading tracking-tight uppercase flex items-center gap-4">
                        My Production Queue
                        {debugCount !== null && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-black tracking-widest">
                                {debugCount} ASSIGNED
                            </span>
                        )}
                    </h1>
                </div>

                <div className="mb-6 group animate-slide-up [animation-delay:200ms]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by job name or instructions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-aesthetic pl-12 h-12 bg-white shadow-sm w-full text-sm rounded-2xl"
                        />
                    </div>
                </div>

                <div className="card-aesthetic p-0 bg-white border-none shadow-xl animate-slide-up [animation-delay:400ms] relative z-10">
                    <div className="overflow-visible pb-12">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Job Details</th>
                                    <th className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Studio</th>
                                    <th className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                    <th className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Due Date</th>
                                    <th className="px-4 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 text-right pr-6">Update</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedJobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="animate-pulse">
                                                <CheckCircle2 size={72} className="mx-auto text-slate-100 mb-8" />
                                                <h2 className="text-3xl font-black text-slate-200 uppercase tracking-[0.2em] font-heading">Clear Skies</h2>
                                                <p className="text-slate-400 mt-4 text-sm font-bold uppercase tracking-widest">No assigned benchmarks in your production roster.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedJobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-indigo-50/10 transition-colors group/row">
                                            <td className="px-4 py-0.5">
                                                <div className="font-bold text-slate-900 text-[11px] group-hover/row:text-indigo-600 transition-colors leading-tight mb-0.5">{job.service?.name || 'Manual Project'}</div>
                                                <div className="text-[8px] text-slate-400 line-clamp-1 font-medium">{job.description}</div>
                                            </td>
                                            <td className="px-4 py-0.5">
                                                <div className="flex items-center text-[10px] font-bold text-slate-600">
                                                    <div className="w-5 h-5 bg-slate-100 rounded-lg flex items-center justify-center mr-2 group-hover/row:bg-indigo-600 group-hover/row:text-white transition-colors">
                                                        <Building2 size={10} />
                                                    </div>
                                                    {job.vendor?.studio_name || 'Individual'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-0.5">
                                                <div className={`inline-flex px-1.5 py-0 rounded-full text-[8px] font-black uppercase tracking-widest border ${job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    job.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                    {job.status}
                                                </div>
                                            </td>
                                            <td className="px-4 py-0.5">
                                                <div className="flex items-center text-[8px] font-bold text-slate-500 tracking-wider">
                                                    <Calendar size={10} className="mr-1.5 text-indigo-400" />
                                                    {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-0.5 w-[180px]">
                                                <div className="flex justify-end pr-2">
                                                    <AestheticSelect
                                                        options={[
                                                            { id: 'PENDING', name: 'PENDING' },
                                                            { id: 'IN_PROGRESS', name: 'IN PROGRESS' },
                                                            { id: 'PAUSE', name: 'PAUSE' },
                                                            { id: 'COMPLETED', name: 'COMPLETED' }
                                                        ]}
                                                        value={job.status}
                                                        disabled={actionLoading === job.id}
                                                        onChange={(val) => handleUpdateStatus(job.id, val)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {paginatedJobs.length > 0 && (
                        <div className="p-6 border-t border-slate-50">
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
