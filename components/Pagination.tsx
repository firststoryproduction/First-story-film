'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

    return (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 mt-2">
            <div className="flex items-center text-sm font-normal text-gray-600">
                Page <span className="text-indigo-600 mx-1">{currentPage}</span> of <span className="text-gray-900 ml-1">{totalPages}</span>
            </div>

            <div className="flex items-center space-x-1.5">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200",
                        currentPage === 1
                            ? "border-gray-200 text-gray-300 cursor-not-allowed"
                            : "border-gray-300 text-gray-600 hover:border-indigo-600 hover:text-indigo-600 bg-white"
                    )}
                >
                    <ChevronLeft size={14} />
                </button>

                <div className="hidden sm:flex items-center space-x-1.5">
                    {pages.map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-lg text-sm font-normal transition-all duration-200",
                                currentPage === page
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white text-gray-900 border border-gray-300 hover:border-indigo-600 hover:text-indigo-600"
                            )}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-200",
                        currentPage === totalPages
                            ? "border-gray-200 text-gray-300 cursor-not-allowed"
                            : "border-gray-300 text-gray-600 hover:border-indigo-600 hover:text-indigo-600 bg-white"
                    )}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    )
}
