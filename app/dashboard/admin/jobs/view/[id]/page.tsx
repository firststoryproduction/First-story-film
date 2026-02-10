"use client"

import { useState, useEffect, use } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { 
    ClipboardList, 
    Building2, 
    User, 
    Calendar, 
    ArrowLeft, 
    DollarSign, 
    ExternalLink, 
    Clock, 
    CheckCircle2, 
    Zap, 
    MapPin, 
    FileText, 
    Edit2,
    Briefcase,
    Shield,
    AlertCircle
} from "lucide-react"
import Spinner from "@/components/Spinner"

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [job, setJob] = useState<any>(null)

    const fetchJob = async () => {
        try {
            const { data, error } = await (supabase
                .from('jobs') as any)
                .select(`
                    *,
                    service:services(name),
                    vendor:vendors(studio_name, contact_person, mobile, email),
                    staff:users(name, email, mobile)
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            setJob(data)
        } catch (error) {
            console.error("Error fetching job details:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (id) fetchJob()
    }, [id])

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            const updates: any = { 
                status: newStatus,
                updated_at: new Date().toISOString()
            }
            if (newStatus === 'IN_PROGRESS' && !job.started_at) {
                updates.started_at = new Date().toISOString()
            }
            if (newStatus === 'COMPLETED') {
                updates.completed_at = new Date().toISOString()
            }

            const { error } = await (supabase
                .from('jobs') as any)
                .update(updates)
                .eq('id', id)

            if (error) throw error
            fetchJob()
        } catch (error) {
            console.error("Error updating status:", error)
        }
    }

    if (loading) return <Spinner className="py-24" />
    if (!job) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f5f9] lg:ml-72">
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Job assignment not found</p>
            <button onClick={() => router.back()} className="mt-4 text-indigo-600 font-bold flex items-center text-[10px] uppercase">
                <ArrowLeft size={16} className="mr-2" /> Go Back
            </button>
        </div>
    )

    const formatCurrency = (amt: any) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amt || 0))

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-72">
            <div className="w-full px-4 py-6 lg:px-8">
                {/* Header Section */}
                <div className="mb-6 space-y-4">
                    <button 
                        onClick={() => router.back()}
                        className="group flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all shadow-sm">
                            <ArrowLeft size={12} />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest">Back to jobs</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center space-x-6">
                            <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50">
                                <ClipboardList size={28} className="text-indigo-600" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-4 mb-1">
                                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                        {job.service?.name}
                                    </h1>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                        job.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600' :
                                        job.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' :
                                        'bg-indigo-600 text-white border-indigo-700'
                                    }`}>
                                        {job.status}
                                    </span>
                                </div>
                                <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                    <Building2 size={12} className="mr-2 text-indigo-400" />
                                    {job.vendor?.studio_name}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => router.push(`/dashboard/admin/jobs/edit/${job.id}`)}
                                className="px-6 h-10 bg-white border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center space-x-2 shadow-sm"
                            >
                                <Edit2 size={14} />
                                <span>Edit Job</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Master Job Detail Card */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                    {/* Masthead Status */}
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-10">
                        <div>
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Status</h2>
                            <div className="bg-white p-1 rounded-2xl flex items-center shadow-inner border border-slate-200 w-fit">
                                <button 
                                    onClick={() => handleStatusUpdate('PENDING')}
                                    className={`py-2 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 ${job.status === 'PENDING' ? 'bg-amber-400 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-500 font-bold'}`}
                                >
                                    <Clock size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Pending</span>
                                </button>
                                <button 
                                    onClick={() => handleStatusUpdate('IN_PROGRESS')}
                                    className={`py-2 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 ${job.status === 'IN_PROGRESS' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-500 font-bold'}`}
                                >
                                    <Zap size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">In-Progress</span>
                                </button>
                                <button 
                                    onClick={() => handleStatusUpdate('COMPLETED')}
                                    className={`py-2 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 ${job.status === 'COMPLETED' ? 'bg-emerald-500 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-500 font-bold'}`}
                                >
                                    <CheckCircle2 size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Complete</span>
                                </button>
                            </div>
                        </div>

                        <div className="md:text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Deadline Expectation</p>
                            <p className="text-xl font-black text-rose-600 font-mono tracking-tight">
                                {new Date(job.job_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12">
                        {/* Left Wing: Narrative & Data */}
                        <div className="lg:col-span-8 p-8 space-y-8 border-b lg:border-b-0 lg:border-r border-slate-100">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                                    <FileText size={16} className="mr-2 text-indigo-500" />
                                    Work Description
                                </h3>
                                <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100/50">
                                    <p className="text-lg font-bold text-slate-800 leading-relaxed italic">
                                        {job.description || "No description provided."}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">General Details</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Assigned To</p>
                                            <div className="flex items-center space-x-3">
                                                <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                                    <User size={12} />
                                                </div>
                                                <p className="text-sm font-bold text-slate-700">{job.staff?.name}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Studio Contact</p>
                                            <div className="flex items-center space-x-3">
                                                <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                                    <Building2 size={12} />
                                                </div>
                                                <p className="text-sm font-bold text-slate-700">{job.vendor?.contact_person}</p>
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
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Location</span>
                                                <span className="text-sm font-bold text-slate-900 truncate">{job.data_location || "Pending"}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/20 group transition-all hover:bg-indigo-50">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                                <ExternalLink size={18} />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Output Destination</span>
                                                <span className="text-sm font-bold text-indigo-900 truncate">{job.final_location || "Pending"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Wing: Financial Audit */}
                        <div className="lg:col-span-4 p-8 bg-slate-50/50 flex flex-col justify-between">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Financial Audit</h3>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Job Amount</p>
                                            <p className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(job.amount)}</p>
                                        </div>
                                        <div className="text-right pb-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Commission Cost</p>
                                            <div className="inline-flex items-center px-3 py-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 font-black text-lg">
                                                -{formatCurrency(job.commission_amount)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-8 border-t border-slate-200/60">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Financial Summary</p>
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Balance</span>
                                        <span className="text-base font-black text-slate-900">{formatCurrency(Number(job.amount || 0) - Number(job.commission_amount || 0))}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

