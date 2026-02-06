'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, X, Percent } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service } from '@/types/database'
import bcrypt from 'bcryptjs'

export default function NewUserPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<Service[]>([])

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobile: '',
        password: '',
    })

    // Commission Config State
    const [commissions, setCommissions] = useState<{ serviceId: string, percentage: number }[]>([])

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (session?.user.role !== 'ADMIN') {
            router.push('/dashboard')
        } else {
            fetchServices()
        }
    }, [status, session, router])

    const fetchServices = async () => {
        const { data, error } = await supabase.from('services').select('*').order('name')
        if (!error && data) setServices(data)
    }

    const handleAddCommission = () => {
        setCommissions([...commissions, { serviceId: '', percentage: 0 }])
    }

    const handleRemoveCommission = (index: number) => {
        const newCommissions = [...commissions]
        newCommissions.splice(index, 1)
        setCommissions(newCommissions)
    }

    const updateCommission = (index: number, field: string, value: string | number) => {
        const newCommissions = [...commissions]
        if (field === 'serviceId') newCommissions[index].serviceId = value as string
        if (field === 'percentage') newCommissions[index].percentage = Number(value)
        setCommissions(newCommissions)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Hash the password
            const hashedPassword = await bcrypt.hash(formData.password, 10)

            // 2. Create User record via Supabase Admin (since regular signup might be disabled or handled differently)
            // Note: In a real production app, you might use a Supabase Edge Function to avoid leaking service role key or use Supabase Auth Admin API
            const { data: userData, error: userError } = await (supabase
                .from('users') as any)
                .insert([{
                    name: formData.name,
                    email: formData.email,
                    password: hashedPassword,
                    mobile: formData.mobile,
                    role: 'STAFF'
                }])
                .select()
                .single()

            if (userError) throw userError

            // 3. Save Commission Configs if any
            if (commissions.length > 0) {
                const validCommissions = commissions
                    .filter(c => c.serviceId !== '')
                    .map(c => ({
                        staff_id: userData.id,
                        service_id: c.serviceId,
                        percentage: c.percentage
                    }))

                if (validCommissions.length > 0) {
                    const { error: commError } = await (supabase
                        .from('staff_service_configs') as any)
                        .insert(validCommissions)

                    if (commError) throw commError
                }
            }

            router.push('/dashboard/admin/staff')
        } catch (error: any) {
            console.error('Error creating user:', error)
            alert(error.message || 'Error occurred while creating user.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 p-4 lg:p-6">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-slate-500 hover:text-indigo-600 mb-2 transition-colors group cursor-pointer font-bold text-[10px]"
                >
                    <ArrowLeft size={12} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
                    Back to Users
                </button>

                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 mb-0.5 font-heading tracking-tight">Register New User</h1>
                    <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">Onboard a new creative member to the studio team.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Profile Section */}
                    <section className="card-aesthetic p-5">
                        <div className="flex items-center space-x-3 mb-4 border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] font-heading">Personal Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                            <div>
                                <label className="label text-[9px] mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    className="input-aesthetic h-10 py-0"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label text-[9px] mb-1.5">Email Address</label>
                                <input
                                    type="email"
                                    className="input-aesthetic h-10 py-0"
                                    placeholder="name@firststory.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label text-[9px] mb-1.5">Mobile Number</label>
                                <input
                                    type="tel"
                                    className="input-aesthetic h-10 py-0"
                                    placeholder="+91 00000 00000"
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label text-[9px] mb-1.5">Initial Password</label>
                                <input
                                    type="password"
                                    className="input-aesthetic h-10 py-0"
                                    placeholder="Set temporary password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    {/* Commission Configuration Section */}
                    <section className="card-aesthetic p-5">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] font-heading">Service Commissions</h2>
                            <button
                                type="button"
                                onClick={handleAddCommission}
                                className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                            >
                                <Plus size={12} className="mr-1.5" /> Add Service
                            </button>
                        </div>

                        {commissions.length === 0 ? (
                            <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 italic text-[10px]">
                                No commissions configured. Add services to define rates.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                {commissions.map((comm, index) => (
                                    <div key={index} className="flex items-end space-x-3 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex-1">
                                            <label className="label text-[9px] mb-1">Select Service</label>
                                            <select
                                                className="input-aesthetic h-10 py-0"
                                                value={comm.serviceId}
                                                onChange={e => updateCommission(index, 'serviceId', e.target.value)}
                                                required
                                            >
                                                <option value="">Choose service...</option>
                                                {services.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-28">
                                            <label className="label text-[9px] mb-1">Percentage (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input-aesthetic h-10 py-0 pr-8"
                                                    value={comm.percentage || ''}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => updateCommission(index, 'percentage', e.target.value)}
                                                    required
                                                    min="0"
                                                    max="100"
                                                />
                                                <Percent size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCommission(index)}
                                            className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Form Actions */}
                    <div className="flex space-x-3 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-aesthetic flex-1 flex justify-center items-center h-11 text-xs"
                        >
                            <Save size={16} className="mr-2" />
                            {loading ? 'Processing...' : 'Save User Profile'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard/admin/staff')}
                            className="btn-aesthetic-secondary flex-1 h-11 text-xs"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
