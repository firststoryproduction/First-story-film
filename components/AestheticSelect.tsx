'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    heightClass?: string
}

export default function AestheticSelect({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    label,
    required = false,
    disabled = false,
    heightClass = 'h-9'
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
                <label className="block text-sm font-normal text-gray-900 mb-2">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}

            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    "w-full bg-white border border-gray-300 rounded-lg px-4 flex items-center justify-between transition-all duration-200",
                    heightClass,
                    "hover:border-gray-400",
                    isOpen && "border-indigo-600 ring-1 ring-indigo-500 bg-white",
                    disabled && "opacity-50 cursor-not-allowed bg-gray-50",
                    !selectedOption && "text-gray-400"
                )}
            >
                <span className={cn("text-sm transition-all truncate font-normal leading-none", selectedOption ? "text-black" : "text-gray-400")}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <ChevronDown
                    size={12}
                    className={cn(
                        "text-indigo-600 transition-transform duration-500",
                        isOpen && "rotate-180 text-indigo-700"
                    )}
                />
            </button>

            {/* CURVED DROPDOWN MENU */}
            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full min-w-[160px] bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="max-h-40 overflow-y-auto custom-scrollbar text-sm">
                        {options.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-600 text-sm font-normal">
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
                                            "w-full px-3 py-2 rounded-lg text-left text-sm transition-all flex items-center justify-between group",
                                            value === option.id
                                                ? "bg-indigo-600 text-white font-medium"
                                                : "text-gray-900 hover:bg-gray-50 hover:text-indigo-600 font-normal"
                                        )}
                                    >
                                        <span className="whitespace-nowrap">{option.name}</span>
                                        {value === option.id && <Check size={12} className="shrink-0 ml-2" />}
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
