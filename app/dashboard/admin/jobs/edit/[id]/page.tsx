'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Info, AlertCircle, Percent } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service, Vendor, User as StaffUser } from '@/types/database'
import { formatCurrency, calculateCommission } from '@/lib/utils'
import AestheticSelect from '@/components/AestheticSelect'

export default function EditJobPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const jobId = params.id as string

    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<Service[]>([])
    const [vendors, setVendors] = useState<Vendor[]>([])
    const [staffList, setStaffList] = useState<StaffUser[]>([])

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
        fetchJobDetails()
    }, [])

    const fetchJobDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', jobId)
                .single()

            if (error) throw error
            if (data) {
                const job = data as any
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
                setFormData(prev => ({ ...prev, amount: job.amount }))
            }
        } catch (error) {
            console.error('Error fetching job:', error)
            alert('Error fetching job details.')
            router.push('/dashboard/admin/jobs')
        }
    }

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
                // Do not reset selectedStaff here on edit load, only if manually changed? 
                // Actually for edit, if service changes, we might want to warn or reset.
                // But initially on load, selectedService is set, then this runs.
                // We should ensure we don't wipe selectedStaff if it matches the new list.
                return
            }

            // Fetch staff who have configuration for this service
            const { data, error } = await (supabase
                .from('staff_service_configs') as any)
                .select(`
                    staff_id,
                    percentage,
                    due_date,
                    users!staff_service_configs_staff_id_fkey(id, name)
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

                // If the currently selected staff is NOT in this new list, maybe we should keep them visible?
                // For now, standard logic:

            } else {
                setFilteredStaffList([])
            }
        }

        fetchStaffByService()
    }, [selectedService])

    // Update percentage when staff is selected (logic similar to new job, but careful not to unnecessary override if explicitly set?)
    // In this simple version, we stick to the config percentage for the assigned staff/service combo.
    useEffect(() => {
        if (selectedStaff && filteredStaffList.length > 0) {
            const staff = filteredStaffList.find(s => s.id === selectedStaff)
            if (staff) {
                setStaffPercentage((staff as any).default_percentage || 0)
            }
        }
    }, [selectedStaff, filteredStaffList])

    const commission = calculateCommission(formData.amount, staffPercentage)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        setLoading(true)
        try {
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
                .eq('id', jobId)

            if (error) throw error
            router.push('/dashboard/admin/jobs')
        } catch (error: any) {
            console.error('Error updating job:', error)
            alert(error.message || 'Error occurred while updating the job.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 p-8 lg:p-12">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={() => router.push('/dashboard/admin/jobs')}
                    className="flex items-center text-slate-500 hover:text-indigo-600 mb-8 transition-colors group cursor-pointer font-bold text-sm"
                >
                    <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Jobs
                </button>

                <div className="mb-10">
                    <div className="h-1 w-20 bg-indigo-600 rounded-full mb-6" />
                    <h1 className="text-4xl font-bold text-slate-900 mb-2 font-heading tracking-tight">Edit Production Job</h1>
                    <p className="text-slate-500 font-medium">Update job details and assignment configuration.</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="card-aesthetic">
                            <div className="flex items-center space-x-3 mb-8 border-b border-slate-100 pb-6">
                                <h2 className="text-xl font-bold text-slate-900 font-heading">General Details</h2>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <AestheticSelect
                                        label="Production Studio (Vendor)"
                                        required
                                        options={vendors.map(v => ({ id: v.id, name: v.studio_name }))}
                                        value={selectedVendor}
                                        onChange={setSelectedVendor}
                                        placeholder="Select Vendor..."
                                    />
                                    <AestheticSelect
                                        label="Service / Job Type"
                                        required
                                        options={services.map(s => ({ id: s.id, name: s.name }))}
                                        value={selectedService}
                                        onChange={setSelectedService}
                                        placeholder="Select Service..."
                                    />
                                </div>

                                <div>
                                    <label className="label">Work Description <span className="text-rose-500">*</span></label>
                                    <textarea
                                        className="input-aesthetic min-h-[160px] resize-none"
                                        placeholder="Provide clear instructions for the staff..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="label">Data Location (Source)</label>
                                    <textarea
                                        className="input-aesthetic min-h-[80px] py-4 resize-none"
                                        placeholder="Paste source folder path or raw data link..."
                                        value={formData.data_location}
                                        onChange={e => setFormData({ ...formData, data_location: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="label">Final Location (Destination)</label>
                                    <textarea
                                        className="input-aesthetic min-h-[80px] py-4 resize-none"
                                        placeholder="Intended destination for finished files..."
                                        value={formData.final_location}
                                        onChange={e => setFormData({ ...formData, final_location: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Assignment & Financials */}
                    <div className="space-y-8">
                        <section className="card-aesthetic border-t-4 border-t-indigo-600">
                            <h2 className="text-xl font-bold text-slate-900 mb-8 font-heading">Assignment</h2>
                            <div className="space-y-8">
                                <AestheticSelect
                                    label="Assign User"
                                    required
                                    disabled={!selectedService}
                                    options={filteredStaffList.map(s => ({ id: s.id, name: s.name }))}
                                    value={selectedStaff}
                                    onChange={setSelectedStaff}
                                    placeholder={selectedService ? 'Select Assigned User...' : 'Choose Service First'}
                                />

                                {selectedStaff && (
                                    <div>
                                        <label className="label">Job Due Date (Date & Time) <span className="text-rose-500">*</span></label>
                                        <input
                                            type="datetime-local"
                                            className="input-aesthetic"
                                            value={formData.job_due_date}
                                            onChange={e => setFormData({ ...formData, job_due_date: e.target.value })}
                                            required
                                        />
                                    </div>
                                )}

                                <div className="pt-8 border-t border-slate-100">
                                    <label className="label">Job Total Amount (Base) <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                        <input
                                            type="number"
                                            className="input-aesthetic pl-10 font-bold text-xl text-slate-900"
                                            placeholder="0"
                                            value={formData.amount || ''}
                                            onFocus={(e) => e.target.select()}
                                            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                            required
                                            min="0"
                                        />
                                    </div>
                                    <div className="mt-4 flex justify-between bg-indigo-50 p-4 rounded-xl">
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Calculated Commission</span>
                                        <span className="text-sm font-black text-indigo-600">{formatCurrency(commission)}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <AestheticSelect
                                        label="Job Status"
                                        required
                                        options={[
                                            { id: 'PENDING', name: 'PENDING' },
                                            { id: 'IN_PROGRESS', name: 'IN PROGRESS' },
                                            { id: 'COMPLETED', name: 'COMPLETED' }
                                        ]}
                                        value={formData.status}
                                        onChange={(val) => setFormData({ ...formData, status: val })}
                                    />
                                </div>


                                <button
                                    type="submit"
                                    disabled={loading || Boolean(selectedStaff && staffPercentage === null)}
                                    className="btn-aesthetic w-full flex justify-center items-center h-16"
                                >
                                    <Save size={20} className="mr-2" />
                                    {loading ? 'Processing...' : 'Update Job Details'}
                                </button>
                            </div>
                        </section>
                    </div>
                </form>
            </div>
        </div>
    )
}
