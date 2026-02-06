'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Calendar, User, Building2, MapPin, ExternalLink, Clock, Edit2, ClipboardList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Job, Service, Vendor, User as StaffUser } from '@/types/database'
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils'
import Pagination from '@/components/Pagination'

export default function JobsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (session?.user.role !== 'ADMIN' && session?.user.role !== 'MANAGER') {
            router.push('/dashboard')
        } else {
            fetchJobs()
        }
    }, [status, session, router])

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
                            <div className="p-3 bg-indigo-50 rounded-2xl">
                                <ClipboardList size={24} className="text-indigo-600" />
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight">Job Management</h1>
                        </div>
                    </div>
                </div>

                <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up [animation-delay:200ms]">
                    <div className="relative w-full md:w-auto md:min-w-[400px]">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search by job, staff, vendor or service..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-aesthetic pl-12 h-9 text-xs bg-white shadow-sm w-full"
                        />
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/admin/jobs/new')}
                        className="btn-aesthetic h-9 px-4 flex items-center space-x-2 group shrink-0"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span className="tracking-widest text-xs">Create New Job</span>
                    </button>
                </div>

                <div className="card-aesthetic p-0 overflow-hidden bg-white border-none shadow-xl animate-slide-up [animation-delay:400ms]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned To</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Job Details</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vendor</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Financials</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Job Status</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Due Date</th>
                                    <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedJobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active productions detected</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedJobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-indigo-50/30 transition-colors group/row">
                                            <td className="px-2 py-1">
                                                <div className="flex items-center text-xs font-black uppercase tracking-widest text-slate-500">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3 text-indigo-600">
                                                        <User size={14} />
                                                    </div>
                                                    {job.staff?.name || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="font-bold text-slate-900 mb-1 group-hover/row:text-indigo-600 transition-colors">{job.service?.name}</div>
                                                <div className="text-xs text-slate-500 line-clamp-1 font-medium">{job.description}</div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center text-sm font-bold text-slate-700">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3 group-hover/row:bg-indigo-600 group-hover/row:text-white transition-colors">
                                                        <Building2 size={14} />
                                                    </div>
                                                    {job.vendor?.studio_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="text-base font-black text-slate-900 font-heading">{formatCurrency(job.amount)}</div>
                                                <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">Comm: {formatCurrency(job.commission_amount)}</div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    job.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                    {job.status}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <div className="flex items-center text-[10px] font-bold text-slate-500 tracking-wider">
                                                    <Calendar size={12} className="mr-2 text-indigo-400" /> {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1">
                                                <button
                                                    onClick={() => router.push(`/dashboard/admin/jobs/edit/${job.id}`)}
                                                    className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg shadow-sm transition-all cursor-pointer bg-slate-50 border border-transparent hover:border-indigo-100"
                                                    title="Edit Job"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
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
        </div>
    )
}
