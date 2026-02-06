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
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }
                setCurrentUser(user)
                await fetchMyJobs(user.id)
            } catch (err) {
                console.error('MyJobs: Error in checkUser:', err)
            } finally {
                setLoading(false)
            }
        }
        checkUser()
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

                <div className="grid grid-cols-1 gap-6 animate-slide-up [animation-delay:400ms]">
                    {paginatedJobs.map((job) => (
                        <div key={job.id} className={`card-aesthetic group relative bg-white border-l-4 p-5 rounded-3xl ${job.status === 'COMPLETED' ? 'border-l-emerald-500' :
                            job.status === 'IN_PROGRESS' ? 'border-l-indigo-600' : 'border-l-slate-200'
                            }`}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 font-body">
                                <div className="flex-1">
                                    <div className="mb-4">
                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight font-heading">{job.service?.name || 'Manual Project'}</h3>
                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                job.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                }`}>
                                                {job.status}
                                            </div>
                                        </div>
                                        <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-2xl bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-0.5">Brief / Description</span>
                                            {job.description}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                                <Building2 size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Studio</p>
                                                <p className="font-bold text-slate-700 text-xs">{job.vendor?.studio_name || 'Individual'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                                <Calendar size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Due Date</p>
                                                <p className="font-bold text-slate-700 text-xs">{new Date(job.job_due_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest ml-1">Update Status</p>
                                    <AestheticSelect
                                        options={[
                                            { id: 'PENDING', name: 'PENDING' },
                                            { id: 'IN_PROGRESS', name: 'IN PROGRESS' },
                                            { id: 'COMPLETED', name: 'COMPLETED' }
                                        ]}
                                        value={job.status}
                                        disabled={actionLoading === job.id}
                                        onChange={(val) => handleUpdateStatus(job.id, val)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredJobs.length === 0 && (
                        <div className="text-center py-40 animate-pulse">
                            <CheckCircle2 size={72} className="mx-auto text-slate-100 mb-8" />
                            <h2 className="text-3xl font-black text-slate-200 uppercase tracking-[0.2em] font-heading">Clear Skies</h2>
                            <p className="text-slate-400 mt-4 text-sm font-bold uppercase tracking-widest">No assigned benchmarks in your production roster.</p>
                        </div>
                    )}

                    {paginatedJobs.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
