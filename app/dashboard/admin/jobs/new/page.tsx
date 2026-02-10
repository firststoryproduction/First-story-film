'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Info, AlertCircle, Percent, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service, Vendor, User as StaffUser } from '@/types/database'
import { formatCurrency, calculateCommission } from '@/lib/utils'
import AestheticSelect from '@/components/AestheticSelect'

export default function NewJobPage() {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<Service[]>([])
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [staffList, setStaffList] = useState<StaffUser[]>([])
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 3500)
    }

    // Selection States
    const [selectedService, setSelectedService] = useState('')
    const [selectedVendor, setSelectedVendor] = useState('')
    const [selectedStaff, setSelectedStaff] = useState('')
    const [staffPercentage, setStaffPercentage] = useState<number>(0)
    const [filteredStaffList, setFilteredStaffList] = useState<StaffUser[]>([])

    // Data States
    const [formData, setFormData] = useState({
        description: '',
        data_location: '',
        final_location: '',
        job_due_date: '',
        amount: 0,
        status: 'PENDING'
    })

    useEffect(() => {
        fetchFormData()
    }, [router])

    const fetchFormData = async () => {
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
                setSelectedStaff('')
                return
            }

            // Fetch staff who have configuration for this service
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
    }, [selectedService])

    // Effect to set default commission when staff is selected
    useEffect(() => {
        if (selectedStaff) {
            const staff = filteredStaffList.find(s => s.id === selectedStaff)
            if (staff) {
                setStaffPercentage((staff as any).default_percentage || 0)

                // If there's a default due date configured, set it
                const defaultDate = (staff as any).default_due_date
                if (defaultDate) {
                    // Convert to local format for datetime-local input (YYYY-MM-DDThh:mm)
                    const date = new Date(defaultDate)
                    const localDateTime = date.toISOString().slice(0, 16)
                    setFormData(prev => ({ ...prev, job_due_date: localDateTime }))
                }
            }
        }
    }, [selectedStaff, filteredStaffList])

    const commission = calculateCommission(formData.amount, staffPercentage)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedStaff || !formData.job_due_date) {
            showNotification('Please select a user and set a deadline.', 'error')
            return
        }

        setLoading(true)
        try {
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

            if (error) throw error
            showNotification('Job created successfully!')
            setTimeout(() => router.push('/dashboard/admin/jobs'), 1000)
        } catch (error: any) {
            console.error('Error creating job:', error)
            showNotification(error.message || 'Error occurred while creating the job.', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => router.push('/dashboard/admin/jobs')}
                    className="flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition-colors group cursor-pointer font-bold text-[11px] uppercase tracking-widest"
                >
                    <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Jobs
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-1 font-heading tracking-tight uppercase leading-none">Post New Production Job</h1>
                </div>

                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
                    {/* Main Info */}
                    <div className="space-y-6">
                        <section className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden p-6 lg:p-8">
                            <div className="flex items-center space-x-3 mb-6 border-b border-slate-50 pb-4">
                                <h2 className="text-lg font-black text-slate-900 font-heading uppercase tracking-tight">General Details</h2>
                            </div>
                            <div className="space-y-5">
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
                                        <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block ml-1">Job Due Date <span className="text-rose-500">*</span></label>
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
                                    <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Work Description <span className="text-rose-500">*</span></label>
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
                                        <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Data Location (Source)</label>
                                        <input
                                            type="text"
                                            className="input-aesthetic h-12 px-4 text-sm"
                                            placeholder="Source folder path..."
                                            value={formData.data_location}
                                            onChange={e => setFormData({ ...formData, data_location: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Final Location (Destination)</label>
                                        <input
                                            type="text"
                                            className="input-aesthetic h-12 px-4 text-sm"
                                            placeholder="Final destination path..."
                                            value={formData.final_location}
                                            onChange={e => setFormData({ ...formData, final_location: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                    <div>
                                        <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Job Total Amount (Base) <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
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
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || Boolean(selectedStaff && staffPercentage === null)}
                                        className="w-full bg-indigo-600 hover:bg-slate-900 text-white rounded-[1rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center h-12 shadow-lg shadow-indigo-100"
                                    >
                                        <Save size={16} className="mr-2" />
                                        {loading ? 'Processing...' : 'Post Job'}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </form>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className={`flex items-center space-x-3 px-6 py-3 rounded-2xl shadow-2xl border ${
                        notification.type === 'success' 
                            ? 'bg-emerald-500 border-emerald-400 text-white' 
                            : 'bg-rose-500 border-rose-400 text-white'
                    }`}>
                        {notification.type === 'success' ? (
                            <CheckCircle size={18} className="text-white" />
                        ) : (
                            <XCircle size={18} className="text-white" />
                        )}
                        <p className="text-[11px] font-black uppercase tracking-widest">{notification.message}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
