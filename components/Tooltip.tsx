'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
    text: string
    children: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
    return (
        <div className="group relative flex items-center justify-center">
            {children}
            <div className={cn(
                "absolute z-[100] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-none",
                "pointer-events-none whitespace-nowrap px-2.5 py-1.5",
                "bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl",
                position === 'top' && "bottom-full mb-2",
                position === 'bottom' && "top-full mt-2",
                position === 'left' && "right-full mr-2",
                position === 'right' && "left-full ml-2"
            )}>
                {text}
                {/* SMALL ARROW */}
                <div className={cn(
                    "absolute w-2 h-2 bg-slate-900 rotate-45 transition-all",
                    position === 'top' && "left-1/2 -translate-x-1/2 -bottom-1",
                    position === 'bottom' && "left-1/2 -translate-x-1/2 -top-1",
                    position === 'left' && "top-1/2 -translate-y-1/2 -right-1",
                    position === 'right' && "top-1/2 -translate-y-1/2 -left-1"
                )} />
            </div>
        </div>
    )
}
