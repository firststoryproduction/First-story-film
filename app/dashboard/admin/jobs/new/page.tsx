'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Info, AlertCircle, Percent } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service, Vendor, User as StaffUser } from '@/types/database'
import { formatCurrency, calculateCommission } from '@/lib/utils'
import AestheticSelect from '@/components/AestheticSelect'

export default function NewJobPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

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
    })

    useEffect(() => {
        // if (status === 'unauthenticated') {
        //     router.push('/login')
        // } else if (session?.user.role !== 'ADMIN') {
        //     router.push('/dashboard')
        // } else {
        fetchFormData()
        // }
    }, [status, session, router])

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
            alert('Please select a user and set a deadline.')
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
                    status: 'PENDING',
                    amount: formData.amount,
                    commission_amount: commission,
                }])

            if (error) throw error
            router.push('/dashboard/admin/jobs')
        } catch (error: any) {
            console.error('Error creating job:', error)
            alert(error.message || 'Error occurred while creating the job.')
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
                    <h1 className="text-4xl font-bold text-slate-900 mb-2 font-heading tracking-tight">Post New Production Job</h1>
                    <p className="text-slate-500 font-medium">Initialize a new production cycle and assign creative leads.</p>
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
                                </div>


                                <button
                                    type="submit"
                                    disabled={loading || Boolean(selectedStaff && staffPercentage === null)}
                                    className="btn-aesthetic w-full flex justify-center items-center h-16"
                                >
                                    <Save size={20} className="mr-2" />
                                    {loading ? 'Processing...' : 'Official Post Job'}
                                </button>
                            </div>
                        </section>
                    </div>
                </form>
            </div>
        </div>
    )
}
