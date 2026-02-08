'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, X, Percent } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Service } from '@/types/database'

export default function NewUserPage() {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<Service[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)

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
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)
            fetchServices()
        }
        init()
    }, [router])

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
            // 1. Create User via our API route (handles both auth and profile)
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    mobile: formData.mobile,
                    role: 'USER'
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to create user')

            const newUserId = result.id

            // 2. Save Commission Configs if any
            if (commissions.length > 0) {
                const validCommissions = commissions
                    .filter(c => c.serviceId !== '')
                    .map(c => ({
                        staff_id: newUserId,
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
        <div className="min-h-screen bg-[#f8fafc] lg:ml-72 p-4 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-slate-500 hover:text-indigo-600 mb-6 transition-colors group cursor-pointer font-bold text-[11px] uppercase tracking-widest"
                >
                    <ArrowLeft size={14} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Users
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-1 font-heading tracking-tight uppercase leading-none">Register New User</h1>
                </div>

                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                    {/* Profile Section */}
                    <section className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden p-6 lg:p-8">
                        <div className="flex items-center space-x-3 mb-6 border-b border-slate-50 pb-4">
                            <h2 className="text-lg font-black text-slate-900 font-heading uppercase tracking-tight">Personal Information</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Full Name</label>
                                <input
                                    type="text"
                                    className="input-aesthetic h-12 px-4 text-sm"
                                    placeholder="Enter full name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Email Address</label>
                                <input
                                    type="email"
                                    className="input-aesthetic h-12 px-4 text-sm"
                                    placeholder="name@firststory.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Mobile Number</label>
                                <input
                                    type="tel"
                                    className="input-aesthetic h-12 px-4 text-sm"
                                    placeholder="+91 00000 00000"
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Initial Password</label>
                                <input
                                    type="password"
                                    className="input-aesthetic h-12 px-4 text-sm"
                                    placeholder="Set temporary password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </section>

                    {/* Commission Configuration Section */}
                    <section className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl overflow-hidden p-6 lg:p-8">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                            <h2 className="text-lg font-black text-slate-900 font-heading uppercase tracking-tight">Service Commissions</h2>
                            <button
                                type="button"
                                onClick={handleAddCommission}
                                className="inline-flex items-center px-4 h-8 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                            >
                                <Plus size={14} className="mr-2" /> Add Service
                            </button>
                        </div>

                        {commissions.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 italic text-xs">
                                No commissions configured. Add services to define rates.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {commissions.map((comm, index) => (
                                    <div key={index} className="flex items-end space-x-3 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex-1">
                                            <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Select Service</label>
                                            <select
                                                className="input-aesthetic h-12 px-4 text-sm w-full"
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
                                        <div className="w-32">
                                            <label className="label text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 block">Percentage (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input-aesthetic h-12 px-4 pr-10 text-sm font-bold w-full"
                                                    value={comm.percentage || ''}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={e => updateCommission(index, 'percentage', e.target.value)}
                                                    required
                                                    min="0"
                                                    max="100"
                                                />
                                                <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCommission(index)}
                                            className="h-12 w-12 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Form Actions */}
                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-slate-900 text-white rounded-[1rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center h-12 shadow-lg shadow-indigo-100"
                        >
                            <Save size={16} className="mr-2" />
                            {loading ? 'Processing...' : 'Official Save User'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/dashboard/admin/staff')}
                            className="w-full bg-white text-slate-400 hover:text-slate-600 rounded-[1rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center h-12 border border-slate-100"
                        >
                            Cancel Onboarding
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
