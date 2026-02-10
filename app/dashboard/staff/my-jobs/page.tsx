'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  CheckCircle2, 
  Search, 
  Clock, 
  Building2, 
  Layout, 
  Zap, 
  Eye, 
  X, 
  FileText, 
  ClipboardList 
} from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import Pagination from '../../../../components/Pagination'
import Spinner from '../../../../components/Spinner'

export default function MyJobsPage() {
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Modal States
    const [showViewModal, setShowViewModal] = useState(false)
    const [selectedJob, setSelectedJob] = useState<any>(null)
    const [modalLoading, setModalLoading] = useState(false)

    // Action state
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setCurrentUser(user)
                    await fetchMyJobs(user.id)
                } else {
                    setLoading(false)
                }
            } catch (error) {
                console.error('Init error:', error)
                setLoading(false)
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
                ...extraData,
                updated_at: new Date().toISOString()
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

            // Local state update for immediate feedback
            setJobs(prevJobs => prevJobs.map(j => 
                j.id === jobId ? { ...j, ...updatePayload } : j
            ));

            // Also update selectedJob if it's the one being modified in the modal
            if (selectedJob && selectedJob.id === jobId) {
                setSelectedJob((prev: any) => ({ ...prev, ...updatePayload }));
            }

            // fetchMyJobs(currentUser?.id) // Optional: refetch from server to be sure
        } catch (error: any) {
            console.error('Error updating status:', error.message || error)
        } finally {
            setActionLoading(null)
        }
    }

    const openViewModal = (job: any) => {
        setSelectedJob(job)
        setShowViewModal(true)
    }

    const closeModal = () => {
        setShowViewModal(false)
        setSelectedJob(null)
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
                <div className="absolute inset-0 bg-[#f1f5f9] z-50 flex items-center justify-center py-24">
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
                                {jobs.length > 0 && (
                                    <span className="text-[9px] bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-black tracking-widest">
                                        {jobs.length} ACTIVE
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
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-600 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search by studio or job description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-500 shadow-inner"
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
                                                <p className="text-slate-500 mt-4 text-xs font-bold uppercase tracking-widest">No assigned benchmarks in your production roster.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedJobs.map((job) => (
                                        <tr 
                                            key={job.id} 
                                            onClick={() => openViewModal(job)}
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
                                                <div className="text-[12px] text-slate-500 font-bold leading-relaxed max-w-[250px] line-clamp-1 italic">
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
                                                <div className="flex items-center text-[11px] text-slate-500 font-bold tracking-wider">
                                                    <Calendar size={13} className="mr-2 text-indigo-300" />
                                                    {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.id, 'PENDING')}
                                                        disabled={actionLoading === job.id}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-100 hover:text-amber-400 hover:border-amber-200'}`}
                                                        title="Mark as Pending"
                                                    >
                                                        <Clock size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.id, 'IN_PROGRESS')}
                                                        disabled={actionLoading === job.id}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'IN_PROGRESS' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-100 hover:text-indigo-600 hover:border-indigo-200'}`}
                                                        title="Mark as In-Progress"
                                                    >
                                                        <Zap size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(job.id, 'COMPLETED')}
                                                        disabled={actionLoading === job.id}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-100 hover:text-emerald-500 hover:border-emerald-200'}`}
                                                        title="Mark as Completed"
                                                    >
                                                        <CheckCircle2 size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <div className="w-[1px] h-4 bg-slate-100 mx-1" />
                                                    <button
                                                        onClick={() => openViewModal(job)}
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

            {/* View Modal */}
            {showViewModal && selectedJob && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                                    <ClipboardList size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Production Details</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Job ID: {selectedJob.id.slice(0, 8)}</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-7 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left Side (Main Content) */}
                                <div className="lg:col-span-8 space-y-8">
                                    <section>
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Production Brief</h3>
                                        </div>
                                        <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 p-7 relative overflow-hidden group">
                                            <FileText className="absolute top-6 right-6 text-slate-200/50 group-hover:text-indigo-500/10 transition-colors" size={120} />
                                            <div className="relative z-10">
                                                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3">Service Name</h4>
                                                <p className="text-3xl font-black text-slate-900 mb-6 leading-tight tracking-tight uppercase">{selectedJob.service?.name}</p>
                                                
                                                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Work Description</h4>
                                                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-100 shadow-sm">
                                                    <p className="text-slate-700 font-bold leading-relaxed italic">
                                                        "{selectedJob.description || 'No specific instructions provided.'}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center space-x-4 mb-4">
                                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                                    <Building2 size={20} />
                                                </div>
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Partner Studio (Vendor)</h4>
                                            </div>
                                            <p className="text-xl font-black text-slate-900 tracking-tight uppercase">{selectedJob.vendor?.studio_name || 'Individual Client'}</p>
                                        </div>

                                        <div className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center space-x-4 mb-4">
                                                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
                                                    <Calendar size={20} />
                                                </div>
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Submission Deadline</h4>
                                            </div>
                                            <p className="text-xl font-black text-rose-600 tracking-tight font-mono uppercase">
                                                {new Date(selectedJob.job_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </section>
                                </div>

                                {/* Right Side (Technical & Status) */}
                                <div className="lg:col-span-4 space-y-6">
                                    <div className="bg-slate-50/80 rounded-[2rem] border border-slate-100 p-7 space-y-3">
                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Update Status</h3>
                                            <div className="space-y-2">
                                                <button 
                                                    onClick={() => handleUpdateStatus(selectedJob.id, 'PENDING')}
                                                    disabled={actionLoading === selectedJob.id}
                                                    className={`w-full py-2.5 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 border shadow-sm ${selectedJob.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500 shadow-md shadow-amber-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-amber-50'}`}
                                                >
                                                    <Clock size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Pending</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(selectedJob.id, 'IN_PROGRESS')}
                                                    disabled={actionLoading === selectedJob.id}
                                                    className={`w-full py-2.5 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 border shadow-sm ${selectedJob.status === 'IN_PROGRESS' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-indigo-50'}`}
                                                >
                                                    <Zap size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">In-Progress</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(selectedJob.id, 'COMPLETED')}
                                                    disabled={actionLoading === selectedJob.id}
                                                    className={`w-full py-2.5 px-6 flex items-center justify-center rounded-xl transition-all space-x-2 border shadow-sm ${selectedJob.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-emerald-50'}`}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Complete</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-200/60 space-y-4">
                                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Technical Specs</h3>
                                            <div className="space-y-3">
                                                <div className="flex flex-col group/tech">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover/tech:text-indigo-600 transition-colors">Raw Source Path</span>
                                                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-900 group-hover/tech:border-indigo-100 transition-all truncate shadow-sm">
                                                        {selectedJob.data_location || 'Not Specified'}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col group/tech">
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 group-hover/tech:text-indigo-700 transition-colors">Final Delivery Target</span>
                                                    <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/30 text-[11px] font-bold text-indigo-900 group-hover/tech:border-indigo-200 transition-all truncate shadow-sm">
                                                        {selectedJob.final_location || 'To be updated'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <Clock size={16} className="text-slate-500" />
                                            <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Assignment Timeline</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-slate-500">ASSIGNED</span>
                                                <span className="font-black text-slate-300">{new Date(selectedJob.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            {selectedJob.started_at && (
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-indigo-400 uppercase tracking-widest">STARTED</span>
                                                    <span className="font-black text-indigo-200">{new Date(selectedJob.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            )}
                                            {selectedJob.completed_at && (
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-emerald-400 uppercase tracking-widest">FINISHED</span>
                                                    <span className="font-black text-emerald-200">{new Date(selectedJob.completed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference No: FSF-PROD-{selectedJob.id.slice(0, 4)}</span>
                            <button 
                                onClick={closeModal}
                                className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-slate-200"
                            >
                                Close & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
