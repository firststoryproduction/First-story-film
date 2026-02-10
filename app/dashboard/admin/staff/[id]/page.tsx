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
    ClipboardList,
    DollarSign,
    Settings,
    Clock,
    CheckCircle2,
    Building2,
    Percent,
    ExternalLink
} from "lucide-react"
import Spinner from "@/components/Spinner"
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
                    .select('*, services(name), vendors(studio_name)')
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
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
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
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">User</p>
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
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Projects</p>
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

                        {/* 3. Service Commissions List */}
                        <div className="p-6 overflow-hidden bg-white">
                            <div className="flex items-center space-x-2 mb-3">
                                <Percent size={12} className="text-emerald-500" />
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Commissions</h3>
                            </div>
                            <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[64px] custom-scrollbar">
                                {commissions.length === 0 ? (
                                    <span className="text-[10px] font-bold text-slate-500 italic">None</span>
                                ) : (
                                    commissions.map((comm) => (
                                        <div key={comm.id} className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-2">
                                            <span className="text-[9px] font-black text-slate-600 uppercase truncate max-w-[100px]">{comm.services?.name}</span>
                                            <span className="text-[10px] font-black text-indigo-600">{comm.percentage}%</span>
                                        </div>
                                    ))
                                )}
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
                                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Assignment History</h2>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Project / Studio</th>
                                        <th className="px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Due Date</th>
                                        <th className="px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                                        <th className="px-8 py-3 text-right text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Earning</th>
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
                                        jobs.map((job) => (
                                            <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                                <td className="px-8 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[14px] font-bold text-slate-900 leading-none">{job.services?.name}</span>
                                                        <div className="flex items-center text-[11px] text-slate-500 font-bold mt-1.5 uppercase tracking-tight">
                                                            <Building2 size={12} className="mr-1 text-slate-500" />
                                                            {job.vendors?.studio_name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[14px] font-bold text-slate-900 leading-none">{job.services?.name}</span>
                                                        <div className="flex items-center text-[11px] text-slate-500 font-bold mt-1.5 uppercase tracking-tight">
                                                            <Building2 size={12} className="mr-1 text-slate-500" />
                                                            {job.vendors?.studio_name}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-3">
                                                    <div className="flex items-center text-[11px] font-black uppercase tracking-widest text-slate-500">
                                                        <Clock size={14} className="mr-2 text-indigo-300" />
                                                        {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-3">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                        job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        job.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                    }`}>
                                                        {job.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-3 text-right">
                                                    <div className="text-base font-black text-slate-900 leading-tight">₹{Number(job.commission_amount).toLocaleString()}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Base: ₹{Number(job.amount).toLocaleString()}</div>
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
        </div>
    )
}
