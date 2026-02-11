"use client"

import { useState, useEffect, use } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
    User as UserIcon,
    Mail,
    Smartphone,
    Calendar,
    ArrowLeft,
    Briefcase,
    TrendingUp,
    CheckCircle2,
    Building2,
    Percent,
    ExternalLink,
    X,
    Eye,
    AlertCircle,
    Zap,
    ClipboardList,
    Clock,
    MapPin,
    FileText,
    Edit2
} from "lucide-react"
import Spinner from "@/components/Spinner"
import { formatCurrency, calculateCommission } from "@/lib/utils"
import { User, Service, StaffServiceConfig, Job, Vendor } from "@/types/database"

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<User | null>(null)
    const [commissions, setCommissions] = useState<any[]>([])
    const [jobs, setJobs] = useState<any[]>([])
    const [stats, setStats] = useState({
        totalJobs: 0,
        completedJobs: 0,
        totalEarnt: 0
    })
    const [selectedJob, setSelectedJob] = useState<any>(null)
    const [showViewModal, setShowViewModal] = useState(false)
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
    }

    const handleStatusUpdate = async (jobId: string, newStatus: string) => {
        try {
            const { error } = await (supabase
                .from('jobs') as any)
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
                    started_at: newStatus === 'IN_PROGRESS' ? new Date().toISOString() : undefined
                })
                .eq('id', jobId)

            if (error) throw error

            const statusLabels: { [key: string]: string } = {
                'PENDING': 'Pending',
                'IN_PROGRESS': 'In Progress',
                'COMPLETED': 'Complete'
            }
            showNotification(statusLabels[newStatus] || newStatus)

            // Update local state
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
            if (selectedJob?.id === jobId) {
                setSelectedJob((prev: any) => prev ? { ...prev, status: newStatus } : null)
            }
        } catch (error) {
            console.error('Error updating status:', error)
            showNotification('Failed to update status', 'error')
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch User
                const { data: userData, error: userError } = await (supabase
                    .from('users') as any)
                    .select('*')
                    .eq('id', id)
                    .single()

                if (userError) throw userError
                setUser(userData)

                // Fetch Commissions
                const { data: commData, error: commError } = await (supabase
                    .from('staff_service_configs') as any)
                    .select('*, services(name)')
                    .eq('staff_id', id)

                if (commError) throw commError
                setCommissions(commData || [])

                // Fetch Jobs
                const { data: jobsData, error: jobsError } = await (supabase
                    .from('jobs') as any)
                    .select('*, services(name), vendors(id, studio_name, contact_person, mobile, email)')
                    .eq('staff_id', id)
                    .order('created_at', { ascending: false })

                if (jobsError) throw jobsError
                setJobs(jobsData || [])

                // Calculate Stats
                const completed = (jobsData || []).filter((j: any) => j.status === 'COMPLETED')
                const totalComm = completed.reduce((sum: number, j: any) => sum + Number(j.commission_amount || 0), 0)

                setStats({
                    totalJobs: (jobsData || []).length,
                    completedJobs: completed.length,
                    totalEarnt: totalComm
                })

            } catch (error) {
                console.error("Error fetching user details:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    if (loading) return <Spinner className="py-24" />
    if (!user) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] lg:ml-72">
            <p className="text-slate-500 font-black uppercase tracking-widest">User not found</p>
            <button onClick={() => router.back()} className="mt-4 text-indigo-600 font-bold flex items-center">
                <ArrowLeft size={16} className="mr-2" /> Go Back
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 lg:ml-72">
            <div className="w-full px-4 py-8 lg:px-8">
                {/* Back Button & Header */}
                <div className="mb-8 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                            <ArrowLeft size={14} />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest">Back to Users</span>
                    </button>

                    <div className="flex items-center space-x-3">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            user.role === 'MANAGER' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                            }`}>
                            {user.role}
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100/50">
                        {/* 1. Profile & Contact */}
                        <div className="p-6 flex items-center justify-between gap-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
                                    <UserIcon size={20} className="text-white" />
                                </div>
                                <div className="overflow-hidden">
                                    <h1 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none truncate">{user.name}</h1>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">{user.role}</p>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-1 pr-4 border-l border-slate-100 pl-6">
                                <div className="flex items-center space-x-2 text-slate-500">
                                    <Mail size={10} className="shrink-0" />
                                    <span className="text-[10px] font-bold truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-slate-500">
                                    <Smartphone size={10} className="shrink-0" />
                                    <span className="text-[10px] font-bold">{user.mobile || 'No Mobile'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Stats Summary */}
                        <div className="p-6 grid grid-cols-3 gap-0 bg-slate-50/20">
                            <div className="flex flex-col justify-center text-center">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Jobs</p>
                                <p className="text-xl font-black text-slate-900">{stats.totalJobs}</p>
                            </div>
                            <div className="flex flex-col justify-center text-center border-l border-slate-200/50">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Done</p>
                                <p className="text-xl font-black text-emerald-600 truncate">{stats.completedJobs}</p>
                            </div>
                            <div className="flex flex-col justify-center text-center border-l border-slate-200/50">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Earnings</p>
                                <p className="text-xl font-black text-indigo-600 truncate">₹{stats.totalEarnt.toLocaleString()}</p>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="w-full">
                    {/* Job History Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <ClipboardList size={14} />
                                </div>
                                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Job History</h2>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 w-[45%]">Job / Studio</th>
                                        <th className="px-8 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 w-[15%]">Due Date</th>
                                        <th className="px-8 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 w-[20%]">Status</th>
                                        <th className="px-8 py-4 text-right text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 w-[20%]">Earning</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {jobs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">No history records found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        jobs.map((job: any) => (
                                            <tr
                                                key={job.id}
                                                onClick={() => {
                                                    setSelectedJob({ ...job, staff: user });
                                                    setShowViewModal(true);
                                                }}
                                                className="hover:bg-slate-50/50 transition-colors group/row cursor-pointer"
                                            >
                                                <td className="px-8 py-5 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">{job.services?.name}</span>
                                                        <div
                                                            className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-indigo-600 cursor-pointer w-fit transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (job.vendor_id) router.push(`/dashboard/admin/vendors/view/${job.vendor_id}`);
                                                            }}
                                                        >
                                                            <Building2 size={12} className="mr-1.5" />
                                                            {job.vendors?.studio_name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 align-middle text-center">
                                                    <div className="flex items-center justify-center text-[11px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                                        <Clock size={14} className="mr-2 text-indigo-300" />
                                                        {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 align-middle text-center">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        job.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                            'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                        }`}>
                                                        {job.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right align-middle">
                                                    <p className="text-sm font-black text-slate-900 leading-none mb-1.5">
                                                        ₹{Number(job.commission_amount || 0).toLocaleString('en-IN')}
                                                    </p>
                                                    <div className="flex items-center justify-end space-x-1.5">
                                                        <span className="text-[8px] font-black text-indigo-500 bg-indigo-50/50 px-1.5 py-0.5 rounded-sm uppercase tracking-tighter border border-indigo-100">
                                                            {Math.round((Number(job.commission_amount || 0) / Number(job.amount || 1)) * 100)}%
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                                            Base: ₹{Number(job.amount || 0).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {showViewModal && selectedJob && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                                    <ClipboardList size={22} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{selectedJob.services?.name}</h2>
                                    <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <Building2 size={12} className="mr-1.5 text-indigo-400" />
                                        {selectedJob.vendors?.studio_name}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => router.push(`/dashboard/admin/jobs`)}
                                    className="px-5 h-9 bg-white border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center space-x-2 shadow-sm"
                                >
                                    <Edit2 size={14} className="text-slate-400 group-hover:text-indigo-600" />
                                    <span>Edit Job</span>
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all shadow-sm">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left Side */}
                                <div className="lg:col-span-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">General Details</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-4 p-4 bg-slate-50/80 rounded-2xl group transition-all hover:bg-slate-100 border border-slate-100/50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors shadow-sm">
                                                        <UserIcon size={18} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Assigned To</span>
                                                        <span className="text-sm font-bold text-slate-900 truncate tracking-tight">{selectedJob.staff?.name || "Unassigned"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4 p-4 bg-slate-50/80 rounded-2xl group transition-all hover:bg-slate-100 border border-slate-100/50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors shadow-sm">
                                                        <Building2 size={18} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Studio Contact</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900 truncate tracking-tight">{selectedJob.vendors?.contact_person || "N/A"}</span>
                                                            {selectedJob.vendors?.email && <span className="text-[10px] text-slate-500 font-bold">{selectedJob.vendors?.email}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Location</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-4 p-4 bg-slate-50/80 rounded-2xl group transition-all hover:bg-slate-100 border border-slate-100/50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors shadow-sm">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source location</span>
                                                        <span className="text-sm font-bold text-slate-900 truncate tracking-tight">{selectedJob.data_location || "Pending"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/20 group transition-all hover:bg-indigo-50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                                        <ExternalLink size={18} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Output location</span>
                                                        <span className="text-sm font-bold text-indigo-900 truncate tracking-tight">{selectedJob.final_location || "Pending"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center">
                                            <FileText size={16} className="mr-2 text-indigo-500" />
                                            Work Description
                                        </h3>
                                        <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100/50 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity whitespace-nowrap overflow-hidden">
                                                <Briefcase size={80} />
                                            </div>
                                            <p className="text-base font-bold text-slate-800 leading-relaxed italic relative z-10 whitespace-pre-wrap">
                                                {selectedJob.description || "No description provided."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side (Financials & Date) */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-slate-50/80 rounded-[2rem] border border-slate-100 p-7 space-y-3">
                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Production Status</h3>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedJob.id, 'PENDING')}
                                                    className={`w-full py-2.5 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 border shadow-sm ${selectedJob.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200'}`}
                                                >
                                                    <Clock size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Pending</span>
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedJob.id, 'IN_PROGRESS')}
                                                    className={`w-full py-2.5 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 border shadow-sm ${selectedJob.status === 'IN_PROGRESS' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-500 border-slate-200'}`}
                                                >
                                                    <Zap size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">In-Progress</span>
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(selectedJob.id, 'COMPLETED')}
                                                    className={`w-full py-2.5 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 border shadow-sm ${selectedJob.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Complete</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-200/60">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Production Deadline</p>
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="text-rose-500" size={16} />
                                                <p className="text-xl font-black text-rose-600 font-mono tracking-tight">
                                                    {new Date(selectedJob.job_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-200/60 space-y-3">
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Financial Summary</h3>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(selectedJob.amount)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Staff Commission</p>
                                                    <div className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 font-black text-sm">
                                                        +{formatCurrency(selectedJob.commission_amount)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-200/40 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Invoice</span>
                                                <span className="text-lg font-black text-indigo-600">{formatCurrency(Number(selectedJob.amount || 0))}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-8 right-8 z-[100] flex items-center space-x-4 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-10 ${notification.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-rose-600 text-white shadow-rose-200'}`}>
                    {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{notification.type === 'success' ? 'System Success' : 'System Error'}</span>
                        <span className="text-sm font-bold">{notification.message}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
