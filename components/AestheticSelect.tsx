'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface Option {
    id: string
    name: string
}

interface AestheticSelectProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
    required?: boolean
    disabled?: boolean
}

export default function AestheticSelect({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    label,
    required = false,
    disabled = false
}: AestheticSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedOption = options.find(opt => opt.id === value)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative w-full" ref={containerRef}>
            {label && (
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 ml-1">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}

            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "w-full h-11 bg-white border-2 border-slate-100 rounded-xl px-4 flex items-center justify-between transition-all duration-300",
                    "hover:border-slate-200 hover:bg-slate-50/50",
                    isOpen && "border-indigo-600 ring-4 ring-indigo-50 bg-white",
                    disabled && "opacity-50 cursor-not-allowed bg-slate-50",
                    !selectedOption && "text-slate-400"
                )}
            >
                <span className={cn("text-sm transition-all truncate", selectedOption ? "font-bold text-slate-900" : "font-medium")}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <ChevronDown
                    size={20}
                    className={cn(
                        "text-indigo-600 transition-transform duration-500",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* CURVED DROPDOWN MENU */}
            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl p-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.length === 0 ? (
                            <div className="px-4 py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                                No options available
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {options.map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.id)
                                            setIsOpen(false)
                                        }}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl text-left text-sm transition-all flex items-center justify-between group",
                                            value === option.id
                                                ? "bg-indigo-600 text-white font-bold"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600 font-medium"
                                        )}
                                    >
                                        <span className="truncate">{option.name}</span>
                                        {value === option.id && <Check size={16} className="shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden Input for form submission support if needed, though we use state */}
            <input
                type="hidden"
                value={value}
                required={required}
            />
        </div>
    )
}
