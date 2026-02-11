"use client"

import { useState, useEffect, use } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import {
    Building2,
    User,
    Smartphone,
    Mail,
    MapPin,
    ArrowLeft,
    AlertCircle,
    Trash2,
    CheckCircle2,
    Zap,
    Clock,
    Edit2,
    X,
    ClipboardList,
    ExternalLink,
    FileText,
    Briefcase,
    Calendar,
    Eye
} from "lucide-react"
import Spinner from "@/components/Spinner"
import { formatCurrency, calculateCommission } from "@/lib/utils"

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [vendor, setVendor] = useState<any>(null)
    const [recentJobs, setRecentJobs] = useState<any[]>([])
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
            setRecentJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
            if (selectedJob?.id === jobId) {
                setSelectedJob((prev: any) => prev ? { ...prev, status: newStatus } : null)
            }
        } catch (error) {
            console.error('Error updating status:', error)
            showNotification('Failed to update status', 'error')
        }
    }

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch vendor details
            const { data: vendorData, error: vendorError } = await (supabase
                .from('vendors') as any)
                .select('*')
                .eq('id', id)
                .single()

            if (vendorError) throw vendorError
            setVendor(vendorData)

            // Fetch recent jobs for this vendor with staff details
            const { data: jobsData, error: jobsError } = await (supabase
                .from('jobs') as any)
                .select(`
                    *,
                    service:services(name),
                    staff:users!staff_id(id, name, email, mobile)
                `)
                .eq('vendor_id', id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (jobsError) throw jobsError
            setRecentJobs(jobsData || [])

        } catch (error) {
            console.error("Error fetching vendor details:", error)
        } finally {
            // setLoading(false) // This line will be handled by the useEffect's then block or timeout
        }
    }

    useEffect(() => {
        let mounted = true;

        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('VendorDetailPage: Loading timeout triggered');
                setLoading(false);
            }
        }, 5000);

        fetchData().then(() => {
            if (mounted) {
                setLoading(false);
                clearTimeout(timeout);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    if (loading) return <Spinner className="py-24" />
    if (!vendor) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f5f9] lg:ml-72">
            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Vendor not found</p>
            <button onClick={() => router.back()} className="mt-4 text-indigo-600 font-bold flex items-center text-[10px] uppercase">
                <ArrowLeft size={16} className="mr-2" /> Go Back
            </button>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-800 lg:ml-72">
            <div className="w-full px-4 py-6 lg:px-8">
                {/* Header Section */}
                <div className="mb-8 space-y-4">
                    <button
                        onClick={() => router.back()}
                        className="group flex items-center space-x-2 text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all shadow-sm">
                            <ArrowLeft size={12} />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest">Back to Vendors</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center space-x-6">
                            <div className="w-20 h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200/50">
                                <Building2 size={36} className="text-indigo-600" />
                            </div>
                            <div className="flex flex-col lg:flex-row lg:items-center gap-y-3 lg:gap-x-10">
                                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                    {vendor.studio_name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 lg:border-l lg:border-slate-200 lg:pl-10 h-fit">
                                    <div className="flex items-center text-[12px] font-black text-slate-800 uppercase tracking-[0.15em]">
                                        <User size={14} className="mr-2 text-indigo-600" />
                                        {vendor.contact_person}
                                    </div>
                                    <div className="flex items-center text-[12px] font-black text-slate-800 uppercase tracking-[0.15em] border-l border-slate-200 pl-6">
                                        <Smartphone size={14} className="mr-2 text-indigo-600" />
                                        {vendor.mobile}
                                    </div>
                                    <div className="flex items-center text-[12px] font-black text-slate-800 uppercase tracking-[0.15em] border-l border-slate-200 pl-6">
                                        <Mail size={14} className="mr-2 text-indigo-600" />
                                        {vendor.email || "Not provided"}
                                    </div>
                                    <div className="flex items-center text-[12px] font-black text-slate-800 uppercase tracking-[0.15em] border-l border-slate-200 pl-6">
                                        <MapPin size={14} className="mr-2 text-indigo-600" />
                                        {vendor.location || "Not specified"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push(`/dashboard/admin/vendors`)} // Assuming modal edit on main page for now
                                className="px-6 h-12 bg-white border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center space-x-2 shadow-sm"
                            >
                                <Edit2 size={14} />
                                <span>Edit Profile</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto space-y-3 pb-8">
                    {/* Integrated Wing: Notes & History */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                        {/* Section 1: Studio Notes */}
                        <div className="p-4 border-b border-slate-50">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 flex items-center">
                                <FileText size={12} className="mr-2" />
                                Studio Notes
                            </h3>
                            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                    {vendor.notes || "No additional notes for this vendor."}
                                </p>
                            </div>
                        </div>

                        {/* Section 2: Project History */}
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/10">
                            <div>
                                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Job History</h2>
                            </div>
                            <div className="bg-indigo-600 px-3 py-1 rounded-lg text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                                {recentJobs.length} Jobs Total
                            </div>
                        </div>

                        <div className="flex-1">
                            {recentJobs.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300">
                                        <ClipboardList size={18} />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No jobs associated with this studio yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {recentJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            onClick={() => {
                                                setSelectedJob({ ...job, vendor: vendor });
                                                setShowViewModal(true);
                                            }}
                                            className="px-5 py-3 hover:bg-slate-50 transition-all cursor-pointer group flex items-center justify-between"
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${job.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' :
                                                    job.status === 'PENDING' ? 'bg-amber-50 border-amber-100 text-amber-500' :
                                                        'bg-indigo-50 border-indigo-100 text-indigo-500'
                                                    }`}>
                                                    {job.status === 'COMPLETED' ? <CheckCircle2 size={18} /> :
                                                        job.status === 'PENDING' ? <Clock size={18} /> :
                                                            <Zap size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-3 mb-0.5">
                                                        <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                                                            {job.service?.name}
                                                        </p>
                                                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${job.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600' :
                                                            job.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' :
                                                                'bg-indigo-600 text-white border-indigo-700'
                                                            }`}>
                                                            {job.status === 'IN_PROGRESS' ? 'IN-PROGRESS' :
                                                                job.status === 'COMPLETED' ? 'COMPLETE' :
                                                                    job.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <div className="flex items-center">
                                                            <Calendar size={10} className="mr-1" />
                                                            {new Date(job.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <span className="text-slate-200">|</span>
                                                        <div className="flex items-center">
                                                            <User size={10} className="mr-1" />
                                                            {job.staff?.name || 'Unassigned'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <div className="text-right mr-3 hidden sm:block">
                                                    <p className="text-[12px] font-black text-slate-900">₹{Number(job.amount).toLocaleString('en-IN')}</p>
                                                    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Comm: ₹{Number(job.commission_amount).toLocaleString('en-IN')}</p>
                                                </div>
                                                <button
                                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-all shadow-sm"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{selectedJob.service?.name}</h2>
                                    <div className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <Building2 size={12} className="mr-1.5 text-indigo-400" />
                                        {selectedJob.vendor?.studio_name}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => router.push(`/dashboard/admin/jobs`)}
                                    className="px-5 h-9 bg-white border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center space-x-2 shadow-sm"
                                >
                                    <Edit2 size={14} />
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
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-500 pl-4">General Details</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-center space-x-4 p-4 bg-slate-50/80 rounded-2xl group transition-all hover:bg-slate-100 border border-slate-100/50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors shadow-sm">
                                                        <User size={18} />
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
                                                            <span className="text-sm font-bold text-slate-900 truncate tracking-tight">{selectedJob.vendor?.contact_person || "N/A"}</span>
                                                            {selectedJob.vendor?.email && <span className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">{selectedJob.vendor?.email}</span>}
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
                                                <p className="text-base font-bold text-slate-800 leading-relaxed italic relative z-10 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                                    {selectedJob.description || "No description provided."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Location</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-start space-x-4 p-4 bg-slate-50/80 rounded-2xl group transition-all hover:bg-slate-100 border border-slate-100/50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors shadow-sm shrink-0">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0 pt-0.5">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Source location</span>
                                                        <span className="text-sm font-bold text-slate-900 tracking-tight whitespace-pre-wrap leading-tight break-words overflow-wrap-anywhere">{selectedJob.data_location || "Pending"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-start space-x-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/20 group transition-all hover:bg-indigo-50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                                        <ExternalLink size={18} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0 pt-0.5">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Output location</span>
                                                        <span className="text-sm font-bold text-indigo-900 tracking-tight whitespace-pre-wrap leading-tight break-words overflow-wrap-anywhere">{selectedJob.final_location || "Pending"}</span>
                                                    </div>
                                                </div>
                                            </div>
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
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Commission</p>
                                                    <div className="inline-flex items-center px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 font-black text-sm">
                                                        -{formatCurrency(selectedJob.commission_amount)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-200/40 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Profit</span>
                                                <span className="text-lg font-black text-indigo-600">{formatCurrency(Number(selectedJob.amount || 0) - Number(selectedJob.commission_amount || 0))}</span>
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
