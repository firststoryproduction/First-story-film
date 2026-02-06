'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Play, Square, Pause, ExternalLink, Calendar, MapPin, CheckCircle2, Search, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Job } from '@/types/database'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import Pagination from '@/components/Pagination'

export default function MyJobsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    // Action state
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [finalLocation, setFinalLocation] = useState('')
    const [completingJobId, setCompletingJobId] = useState<string | null>(null)
    const [debugCount, setDebugCount] = useState<number | null>(null)

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.id) {
            fetchMyJobs()
        } else if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, session?.user?.id])

    const fetchMyJobs = async () => {
        setLoading(true)
        const userId = session?.user?.id

        try {
            // Fetch jobs - Note: No filter here, we want to see EVERYTHING for this user
            const { data, error, count } = await (supabase.from('jobs') as any)
                .select(`
                  *,
                  service:services(name),
                  vendor:vendors(studio_name)
                `, { count: 'exact' })
                .eq('staff_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error

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
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 p-8 lg:p-14">
            <div className="max-w-6xl mx-auto">
                <div className="mb-12 animate-slide-up">
                    <div className="h-1 w-20 bg-indigo-600 rounded-full mb-6" />
                    <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight mb-2 uppercase flex items-center gap-4">
                        My Production Queue
                        {debugCount !== null && (
                            <span className="text-xs bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full font-black tracking-widest">
                                {debugCount} ASSIGNED
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium">Track your active tasks and manage delivery benchmarks.</p>
                </div>

                <div className="mb-10 group animate-slide-up [animation-delay:200ms]">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by job name or instructions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-aesthetic pl-14 h-16 bg-white shadow-sm w-full"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-10 animate-slide-up [animation-delay:400ms]">
                    {paginatedJobs.map((job) => (
                        <div key={job.id} className={`card-aesthetic group relative bg-white border-l-8 ${job.status === 'COMPLETED' ? 'border-l-emerald-500' :
                            job.status === 'IN_PROGRESS' ? 'border-l-indigo-600' : 'border-l-slate-200'
                            }`}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
                                <div className="flex-1">
                                    <div className="mb-6">
                                        <div className="flex flex-wrap items-center gap-4 mb-2">
                                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-heading">{job.service?.name || 'Manual Project'}</h3>
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                job.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                }`}>
                                                {job.status}
                                            </div>
                                        </div>
                                        <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-2xl">{job.description}</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Studio / Client</p>
                                                <p className="font-bold text-slate-700">{job.vendor?.studio_name || 'Individual Record'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Benchmark Date</p>
                                                <p className="font-bold text-slate-700">{new Date(job.job_due_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 min-w-[280px]">
                                    {job.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleUpdateStatus(job.id, 'IN_PROGRESS')}
                                            disabled={!!actionLoading}
                                            className="btn-aesthetic h-16 bg-indigo-600 text-white hover:bg-indigo-700 border-none shadow-indigo-200/50"
                                        >
                                            {actionLoading === job.id ? 'Processing...' : 'Engage Production'}
                                            {!actionLoading && <Play size={18} className="ml-2 fill-current" />}
                                        </button>
                                    )}

                                    {job.status === 'IN_PROGRESS' && (
                                        <button
                                            onClick={() => setCompletingJobId(job.id)}
                                            className="btn-aesthetic h-16 bg-emerald-600 text-white hover:bg-emerald-700 border-none shadow-emerald-200/50"
                                        >
                                            Deliver Benchmark
                                            <Square size={18} className="ml-2 fill-current" />
                                        </button>
                                    )}

                                    {job.status === 'COMPLETED' && (
                                        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center animate-in zoom-in-95">
                                            <div className="text-emerald-600 font-black text-xs uppercase tracking-widest mb-2 flex items-center justify-center">
                                                <CheckCircle2 size={20} className="mr-2" /> Mission Delivered
                                            </div>
                                            <div className="text-[10px] text-slate-400 truncate max-w-[200px] mx-auto font-bold uppercase tracking-widest" title={job.final_location}>
                                                Loc: {job.final_location || 'Standard Repository'}
                                            </div>
                                        </div>
                                    )}

                                    {job.data_location && (
                                        <a
                                            href={job.data_location}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center px-6 py-4 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all text-[10px] font-black uppercase tracking-widest group/link"
                                        >
                                            Raw Intel Files
                                            <ExternalLink size={14} className="ml-2 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Final Delivery Modal/Drawer (Inline) */}
                            {completingJobId === job.id && (
                                <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500">
                                    <div className="bg-slate-50 p-8 rounded-3xl space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-4">Final Asset Location (Link/Path)</label>
                                            <input
                                                type="text"
                                                value={finalLocation}
                                                onChange={(e) => setFinalLocation(e.target.value)}
                                                placeholder="e.g. https://drive.google.com/..."
                                                className="input-aesthetic h-16 shadow-none"
                                            />
                                        </div>
                                        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-6">
                                            <button
                                                onClick={() => handleUpdateStatus(job.id, 'COMPLETED', { final_location: finalLocation })}
                                                disabled={!finalLocation || !!actionLoading}
                                                className="btn-aesthetic h-16 bg-emerald-600 text-white hover:bg-emerald-700 border-none shadow-emerald-200/50 order-last sm:order-first"
                                            >
                                                Confirm Final Delivery
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCompletingJobId(null);
                                                    setFinalLocation('');
                                                }}
                                                className="btn-aesthetic h-16 bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                                            >
                                                Back to Queue
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Background Decor */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
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

function Building2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
        </svg>
    )
}
