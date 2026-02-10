'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, ArrowRight, Mail, Lock, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const message = searchParams.get('message')
        if (message) {
            setSuccessMessage(message)
            // Clear message after 5 seconds
            const timer = setTimeout(() => setSuccessMessage(''), 5000)
            return () => clearTimeout(timer)
        }
    }, [searchParams])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError(error.message)
            } else {
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full max-w-[480px] z-10 p-8">
            {/* Brand Identity */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-xl mb-8">
                    <Sparkles className="text-indigo-600" size={32} />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 font-heading tracking-tight mb-2 uppercase">
                    FIRST STORY <span className="text-indigo-600">FILMS</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Studio Management System</p>
            </div>

            {/* Aesthetic Login Card */}
            <div className="card-aesthetic p-10 bg-white/80 backdrop-blur-xl border-white shadow-2xl">
                <div className="mb-10">
                    <h2 className="text-2xl font-bold text-slate-900 font-heading tracking-tight">Sign In</h2>
                    <p className="text-slate-500 text-sm mt-1">Ready for the next production?</p>
                </div>

                {successMessage && (
                    <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-5 py-4 rounded-2xl mb-8 text-xs font-bold flex items-center animate-fade-in">
                        <CheckCircle2 size={16} className="mr-3 shrink-0" />
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-2xl mb-8 text-xs font-bold flex items-center animate-shake">
                        <ShieldAlert size={16} className="mr-3 shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1">
                            Email Address
                        </label>
                        <div className="relative group">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-aesthetic pl-12 h-14"
                                placeholder="name@firststory.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 ml-1">
                            Password
                        </label>
                        <div className="relative group">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-aesthetic pl-12 h-14"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-aesthetic w-full h-14 mt-4 flex items-center justify-center space-x-3 group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Enter Studio</span>
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

            </div>

            <p className="text-center text-slate-300 text-[10px] mt-12 uppercase tracking-[0.4em] font-black">
                © 2026 First Story Films
            </p>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-body">
            {/* Soft Ambient Glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[100px] pointer-events-none" />

            <Suspense fallback={<div>Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    )
}
