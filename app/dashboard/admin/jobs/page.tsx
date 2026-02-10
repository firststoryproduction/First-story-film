'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Calendar, Building2, Edit2, ClipboardList, Clock, Zap, CheckCircle2, AlertCircle, ExternalLink, Trash2, CheckCircle, XCircle, X, FileText, User as UserIcon, Save, ArrowLeft, Mail, Smartphone, MapPin, DollarSign, Briefcase, FileSearch } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { Job, Service, Vendor, User as StaffUser } from '../../../../types/database'
import { formatCurrency, getStatusColor, getStatusLabel, calculateCommission } from '../../../../lib/utils'
import Pagination from '../../../../components/Pagination'
import Spinner from '../../../../components/Spinner'
import Tooltip from '../../../../components/Tooltip'
import AestheticSelect from '../../../../components/AestheticSelect'

export default function JobsPage() {
    const router = useRouter()
    const [jobs, setJobs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [selectedJob, setSelectedJob] = useState<any>(null)
    const [modalLoading, setModalLoading] = useState(false)

    // Form Data States for Create/Edit
    const [services, setServices] = useState<Service[]>([])
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [filteredStaffList, setFilteredStaffList] = useState<any[]>([])
    const [selectedService, setSelectedService] = useState('')
    const [selectedVendor, setSelectedVendor] = useState('')
    const [selectedStaff, setSelectedStaff] = useState('')
    const [staffPercentage, setStaffPercentage] = useState<number>(0)
    const [formData, setFormData] = useState({
        description: '',
        data_location: '',
        final_location: '',
        job_due_date: '',
        amount: 0,
        status: 'PENDING'
    })

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3000)
    }

    useEffect(() => {
        fetchJobs()
        fetchCommonData()
    }, [])

    const fetchJobs = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    *,
                    service:services(name),
                    vendor:vendors(studio_name, contact_person, mobile, email),
                    staff:users(name, email, mobile)
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

    const fetchCommonData = async () => {
        try {
            const [sRes, vRes] = await Promise.all([
                supabase.from('services').select('*').order('name'),
                supabase.from('vendors').select('*').order('studio_name')
            ])

            if (sRes.data) setServices(sRes.data)
            if (vRes.data) setVendors(vRes.data)
        } catch (error) {
            console.error('Error fetching form data:', error)
        }
    }

    // Effect to fetch staff filtered by selected service
    useEffect(() => {
        const fetchStaffByService = async () => {
            if (!selectedService) {
                setFilteredStaffList([])
                if (showCreateModal) setSelectedStaff('')
                return
            }

            const { data, error } = await (supabase
                .from('staff_service_configs') as any)
                .select(`
                    staff_id,
                    percentage,
                    due_date,
                    users!staff_id(id, name)
                `)
                .eq('service_id', selectedService)

            if (!error && data) {
                const list = data.map((item: any) => ({
                    id: item.users.id,
                    name: item.users.name,
                    default_percentage: item.percentage,
                    default_due_date: item.due_date
                }))
                setFilteredStaffList(list)
            } else {
                setFilteredStaffList([])
            }
        }

        fetchStaffByService()
    }, [selectedService, showCreateModal])

    // Effect to set default commission when staff is selected
    useEffect(() => {
        if (selectedStaff && (showCreateModal || showEditModal)) {
            const staff = filteredStaffList.find(s => s.id === selectedStaff)
            if (staff) {
                setStaffPercentage((staff as any).default_percentage || 0)

                if (showCreateModal && !formData.job_due_date) {
                    const defaultDate = (staff as any).default_due_date
                    if (defaultDate) {
                        const date = new Date(defaultDate)
                        const localDateTime = date.toISOString().slice(0, 16)
                        setFormData(prev => ({ ...prev, job_due_date: localDateTime }))
                    }
                }
            }
        }
    }, [selectedStaff, filteredStaffList, showCreateModal, showEditModal])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalLoading(true);
        try {
            if (selectedJob && showEditModal) {
                await handleUpdateJob(e)
            } else {
                await handleCreateJob(e)
            }
        } catch (error) {
            console.error('Submission error:', error);
            showNotification('An unexpected error occurred.', 'error');
        } finally {
            setModalLoading(false);
        }
    }

    const handleCreateJob = async (e: React.FormEvent) => {
        if (!selectedStaff || !formData.job_due_date) {
            showNotification('Please select a user and set a deadline.', 'error')
            return
        }

        try {
            const commission = calculateCommission(formData.amount, staffPercentage)
            const { error } = await (supabase
                .from('jobs') as any)
                .insert([{
                    service_id: selectedService,
                    vendor_id: selectedVendor || null,
                    staff_id: selectedStaff,
                    description: formData.description,
                    data_location: formData.data_location,
                    final_location: formData.final_location,
                    job_due_date: new Date(formData.job_due_date).toISOString(),
                    status: formData.status,
                    amount: formData.amount,
                    commission_amount: commission,
                }])
                .select()

            if (error) throw error
            showNotification('Job created successfully!')
            closeModal()
            fetchJobs()
        } catch (error: any) {
            console.error('Error creating job:', error)
            showNotification(error.message || 'Error occurred while creating the job.', 'error')
        }
    }

    const handleUpdateJob = async (e: React.FormEvent) => {
        try {
            const commission = calculateCommission(formData.amount, staffPercentage)
            const { error } = await (supabase
                .from('jobs') as any)
                .update({
                    service_id: selectedService,
                    vendor_id: selectedVendor || null,
                    staff_id: selectedStaff,
                    description: formData.description,
                    data_location: formData.data_location,
                    final_location: formData.final_location,
                    job_due_date: new Date(formData.job_due_date).toISOString(),
                    amount: formData.amount,
                    commission_amount: commission,
                    status: formData.status
                })
                .eq('id', selectedJob.id)

            if (error) throw error
            showNotification('Job updated successfully!')
            closeModal()
            fetchJobs()
        } catch (error: any) {
            console.error('Error updating job:', error)
            showNotification(error.message || 'Error occurred while updating the job.', 'error')
        }
    }

    const resetFormData = () => {
        setFormData({
            description: '',
            data_location: '',
            final_location: '',
            job_due_date: '',
            amount: 0,
            status: 'PENDING'
        })
        setSelectedService('')
        setSelectedVendor('')
        setSelectedStaff('')
        setStaffPercentage(0)
    }

    const openEditModal = (job: any) => {
        setSelectedJob(job)
        setFormData({
            description: job.description || '',
            data_location: job.data_location || '',
            final_location: job.final_location || '',
            job_due_date: job.job_due_date ? new Date(job.job_due_date).toISOString().slice(0, 16) : '',
            amount: job.amount || 0,
            status: job.status || 'PENDING'
        })
        setSelectedService(job.service_id)
        setSelectedVendor(job.vendor_id || '')
        setSelectedStaff(job.staff_id || '')
        
        // Find commission percentage from stats if possible, or just fetch again
        // For now, let the useEffect handle it when service/staff are set
        setShowEditModal(true)
    }

    const openViewModal = (job: any) => {
        setSelectedJob(job)
        setShowViewModal(true)
    }

    const closeModal = () => {
        setShowCreateModal(false)
        setShowEditModal(false)
        setShowViewModal(false)
        setSelectedJob(null)
        setModalLoading(false)
        resetFormData()
    }

    const handleStatusUpdate = async (jobId: string, newStatus: string) => {
        try {
            console.log(`Updating job ${jobId} to status ${newStatus}`);
            const { error } = await (supabase
                .from('jobs') as any)
                .update({ 
                    status: newStatus,
                    updated_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
                    completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
                    started_at: newStatus === 'IN_PROGRESS' ? new Date().toISOString() : undefined
                })
                .eq('id', jobId)

            if (error) {
                console.error('Supabase Error:', error);
                throw error;
            }
            
            showNotification(`Job marked as ${newStatus.replace('_', ' ')}`)
            
            // Local state update for immediate feedback
            setJobs(prevJobs => prevJobs.map(j => 
                j.id === jobId ? { ...j, status: newStatus } : j
            ));
        } catch (error) {
            console.error('Error updating status:', error)
            showNotification('Failed to update status', 'error');
        }
    }

    const handleDelete = async (jobId: string) => {
        if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) return

        try {
            const { error } = await (supabase
                .from('jobs') as any)
                .delete()
                .eq('id', jobId)

            if (error) throw error

            showNotification('Job deleted successfully')
            setJobs(prevJobs => prevJobs.filter(j => j.id !== jobId))
        } catch (error) {
            console.error('Error deleting job:', error)
            showNotification('Failed to delete job', 'error')
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

    return (
        <div className="min-h-screen bg-[#f1f5f9] lg:ml-72">
            <div className="w-full px-2 py-4 lg:px-4 lg:py-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 px-2">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center">
                            <ClipboardList size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 font-heading tracking-tight leading-tight uppercase">Job Management</h1>
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
                                placeholder="Search by job, staff, vendor or service..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 h-9 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-500 shadow-inner"
                            />
                        </div>
                        <button
                            onClick={() => { resetFormData(); setShowCreateModal(true); }}
                            className="w-full md:w-auto px-5 h-9 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center space-x-2 group shrink-0 shadow-lg shadow-indigo-100"
                        >
                            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                            <span className="tracking-widest capitalize">Create New Job</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto relative">
                        {loading && jobs.length === 0 ? (
                            <div className="h-32 flex items-center justify-center w-full">
                                <Spinner />
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/80 border-b border-slate-200">
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vendor</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Job Type</th>
                                    <th className="pl-4 pr-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Work Description</th>
                                    <th className="pl-1 pr-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Assigned To</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Amount</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Due Date</th>
                                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedJobs.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="inline-flex p-5 bg-slate-50 rounded-full mb-3">
                                                <ClipboardList size={28} className="text-slate-200" />
                                            </div>
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">No productions detected</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedJobs.map((job) => (
                                        <tr 
                                            key={job.id} 
                                            onClick={() => openViewModal(job)}
                                            className="hover:bg-slate-50/50 transition-colors group/row cursor-pointer"
                                        >
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[11px] text-slate-500 font-bold flex items-center">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 mr-3 opacity-0 group-hover/row:opacity-100 transition-all scale-0 group-hover/row:scale-100" />
                                                    <Building2 size={12} className="mr-2 text-indigo-300" />
                                                    {job.vendor?.studio_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors text-[13px] leading-none flex items-center group/name">
                                                    {job.service?.name}
                                                </div>
                                            </td>
                                            <td className="pl-4 pr-1 py-1.5">
                                                <div className="text-[12px] text-slate-500 font-bold leading-relaxed max-w-[200px] line-clamp-1 italic">{job.description}</div>
                                            </td>
                                            <td className="pl-1 pr-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[13px] font-bold text-slate-900 group-hover/row:text-indigo-600 transition-colors flex items-center">
                                                    {job.staff?.name || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[12px] font-black text-slate-900">{formatCurrency(job.amount)}</div>
                                                <div className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">Comm: {formatCurrency(job.commission_amount)}</div>
                                            </td>
                                            <td className="px-4 py-1.5 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border ${job.status === 'COMPLETED' ? 'bg-emerald-500 text-white border-emerald-600' :
                                                    job.status === 'PENDING' ? 'bg-amber-400 text-white border-amber-500' :
                                                        'bg-indigo-600 text-white border-indigo-700'
                                                    }`}>
                                                    {job.status === 'IN_PROGRESS' ? 'IN-PROGRESS' : 
                                                     job.status === 'COMPLETED' ? 'COMPLETE' : 
                                                     job.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1.5 whitespace-nowrap">
                                                <div className="text-[11px] text-slate-500 font-bold flex items-center">
                                                    <Calendar size={13} className="mr-2 text-indigo-300" /> {new Date(job.job_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5">
                                                <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip text="Pending">
                                                        <button
                                                            onClick={() => handleStatusUpdate(job.id, 'PENDING')}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'PENDING' ? 'bg-[#F59E0B] text-white border-[#F59E0B]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#F59E0B] hover:border-amber-200'}`}
                                                        >
                                                            <Clock size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </Tooltip>

                                                    <Tooltip text="In-Progress">
                                                        <button
                                                            onClick={() => handleStatusUpdate(job.id, 'IN_PROGRESS')}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'IN_PROGRESS' ? 'bg-[#4F46E5] text-white border-[#4F46E5]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#4F46E5] hover:border-indigo-200'}`}
                                                        >
                                                            <Zap size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </Tooltip>

                                                    <Tooltip text="Complete">
                                                        <button
                                                            onClick={() => handleStatusUpdate(job.id, 'COMPLETED')}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border shadow-sm ${job.status === 'COMPLETED' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-white text-slate-500 border-slate-100 hover:text-[#10B981] hover:border-emerald-200'}`}
                                                        >
                                                            <CheckCircle2 size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </Tooltip>

                                                    <div className="w-[1px] h-4 bg-slate-100 mx-1" />

                                                    <Tooltip text="Edit">
                                                        <button
                                                            onClick={() => openEditModal(job)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white text-slate-500 hover:text-white hover:bg-slate-900 rounded-lg transition-all border border-slate-100 hover:border-slate-900 shadow-sm"
                                                        >
                                                            <Edit2 size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </Tooltip>

                                                    <Tooltip text="Delete">
                                                        <button
                                                            onClick={() => handleDelete(job.id)}
                                                            className="w-8 h-8 flex items-center justify-center bg-white text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all border border-slate-100 hover:border-rose-500 shadow-sm"
                                                        >
                                                            <Trash2 size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        )}
                    </div>
                    
                    <div className="p-4 border-t border-slate-50 bg-slate-50/20">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>

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

            {/* View Modal */}
            {showViewModal && selectedJob && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
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
                                    onClick={() => openEditModal(selectedJob)}
                                    className="px-5 h-9 bg-white border border-slate-200 hover:border-indigo-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center space-x-2 shadow-sm"
                                >
                                    <Edit2 size={14} />
                                    <span>Edit Job</span>
                                </button>
                                <button onClick={closeModal} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all shadow-sm">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                {/* Left Side */}
                                <div className="lg:col-span-8 space-y-8">
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center">
                                            <FileText size={16} className="mr-2 text-indigo-500" />
                                            Work Description
                                        </h3>
                                        <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-100/50 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity whitespace-nowrap overflow-hidden">
                                                <Briefcase size={80} />
                                            </div>
                                            <p className="text-base font-bold text-slate-800 leading-relaxed italic relative z-10">
                                                {selectedJob.description || "No description provided."}
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
                                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                                            <UserIcon size={14} />
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-700">{selectedJob.staff?.name}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Studio Contact</p>
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                                            <Building2 size={14} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="text-sm font-bold text-slate-700">{selectedJob.vendor?.contact_person}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold">{selectedJob.vendor?.email}</p>
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
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Location</span>
                                                        <span className="text-sm font-bold text-slate-900 truncate tracking-tight">{selectedJob.data_location || "Pending"}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/20 group transition-all hover:bg-indigo-50">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                                                        <ExternalLink size={18} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Output Destination</span>
                                                        <span className="text-sm font-bold text-indigo-900 truncate tracking-tight">{selectedJob.final_location || "Pending"}</span>
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

            {/* Create / Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal} />
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                                    {(selectedJob && showEditModal) ? <Edit2 size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                                        {(selectedJob && showEditModal) ? 'Edit Production' : 'Post New Production'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master Workflow Management</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <section className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <AestheticSelect
                                            label="Production Studio (Vendor)"
                                            heightClass="h-11"
                                            required
                                            options={vendors.map(v => ({ id: v.id, name: v.studio_name }))}
                                            value={selectedVendor}
                                            onChange={setSelectedVendor}
                                            placeholder="Select Vendor..."
                                        />
                                        <AestheticSelect
                                            label="Service / Job Type"
                                            heightClass="h-11"
                                            required
                                            options={services.map(s => ({ id: s.id, name: s.name }))}
                                            value={selectedService}
                                            onChange={setSelectedService}
                                            placeholder="Select Service..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                                        <AestheticSelect
                                            label="Assign User"
                                            heightClass="h-11"
                                            required
                                            disabled={!selectedService}
                                            options={filteredStaffList.map(s => ({ id: s.id, name: s.name }))}
                                            value={selectedStaff}
                                            onChange={setSelectedStaff}
                                            placeholder={selectedService ? 'Select Assigned User...' : 'Choose Service First'}
                                        />

                                        <div>
                                            <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block ml-1">Job Due Date <span className="text-rose-500">*</span></label>
                                            <input
                                                type="datetime-local"
                                                className="w-full h-8 bg-white border-2 border-slate-100 rounded-full px-4 text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 transition-all duration-300"
                                                value={formData.job_due_date}
                                                onChange={e => setFormData({ ...formData, job_due_date: e.target.value })}
                                                required
                                            />
                                        </div>

                                        <AestheticSelect
                                            label="Job Status"
                                            required
                                            options={[
                                                { id: 'PENDING', name: 'PENDING' },
                                                { id: 'IN_PROGRESS', name: 'IN-PROGRESS' },
                                                { id: 'COMPLETED', name: 'COMPLETE' }
                                            ]}
                                            value={formData.status}
                                            onChange={(val) => setFormData({ ...formData, status: val })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Work Description <span className="text-rose-500">*</span></label>
                                        <textarea
                                            className="input-aesthetic min-h-[100px] resize-none text-sm p-4"
                                            placeholder="Provide clear instructions for the staff..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Data Location (Source)</label>
                                            <input
                                                type="text"
                                                className="input-aesthetic h-12 px-4 text-sm"
                                                placeholder="Source folder path..."
                                                value={formData.data_location}
                                                onChange={e => setFormData({ ...formData, data_location: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Final Location (Destination)</label>
                                            <input
                                                type="text"
                                                className="input-aesthetic h-12 px-4 text-sm"
                                                placeholder="Final destination path..."
                                                value={formData.final_location}
                                                onChange={e => setFormData({ ...formData, final_location: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                        <div>
                                            <label className="label text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2 block">Job Total Amount (Base) <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    className="input-aesthetic h-12 pl-10 font-bold text-lg text-slate-900 border-2 border-slate-50"
                                                    placeholder="0"
                                                    value={formData.amount || ''}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                                    required
                                                    min="0"
                                                />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between px-2">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Commission</span>
                                                <span className="text-xs font-black text-indigo-600">{formatCurrency(calculateCommission(formData.amount, staffPercentage))}</span>
                                            </div>
                                        </div>

                                        <div className="flex space-x-3">
                                            <button
                                                type="button"
                                                onClick={closeModal}
                                                className="flex-1 px-5 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-[1.25rem] font-black text-[11px] uppercase tracking-widest transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={modalLoading || !selectedStaff || !formData.job_due_date}
                                                className="flex-[2] bg-indigo-600 hover:bg-slate-900 text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center h-12 shadow-lg shadow-indigo-100 disabled:opacity-50"
                                            >
                                                <Save size={16} className="mr-2" />
                                                {modalLoading ? 'Processing...' : selectedJob ? 'Update Job' : 'Post Job'}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
