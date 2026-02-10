import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility to merge tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Calculate commission amount based on job amount and staff percentage
 * @param amount - Job amount
 * @param percentage - Staff commission percentage (e.g., 10.5 for 10.5%)
 * @returns Calculated commission amount
 */
export function calculateCommission(amount: number, percentage: number): number {
    return (amount * percentage) / 100
}

/**
 * Calculate total working time in hours
 * @param startedAt - Job start timestamp
 * @param completedAt - Job completion timestamp
 * @returns Total hours worked (rounded to 2 decimals)
 */
export function calculateWorkingTime(
    startedAt: Date | null,
    completedAt: Date | null
): number | null {
    if (!startedAt || !completedAt) return null

    const diffMs = completedAt.getTime() - startedAt.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    return Math.round(diffHours * 100) / 100
}

/**
 * Format working time for display
 * @param startedAt - Job start timestamp
 * @param completedAt - Job completion timestamp
 * @returns Formatted time string (e.g., "2h 30m")
 */
export function formatWorkingTime(
    startedAt: Date | null,
    completedAt: Date | null
): string {
    const hours = calculateWorkingTime(startedAt, completedAt)

    if (hours === null) return 'Not started'

    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)

    if (wholeHours === 0) return `${minutes}m`
    if (minutes === 0) return `${wholeHours}h`

    return `${wholeHours}h ${minutes}m`
}

/**
 * Check if job is overdue
 * @param dueDate - Job due date
 * @param status - Current job status
 * @returns true if job is overdue and not complete
 */
export function isJobOverdue(
    dueDate: Date,
    status: 'PENDING' | 'IN_PROGRESS' | 'PAUSE' | 'COMPLETED'
): boolean {
    if (status === 'COMPLETED') return false
    return new Date() > dueDate
}

/**
 * Format currency for display
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "₹10,000")
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount)
}

/**
 * Get status color for UI
 * @param status - Job status
 * @returns Tailwind color class
 */
export function getStatusColor(
    status: 'PENDING' | 'IN_PROGRESS' | 'PAUSE' | 'COMPLETED'
): string {
    const colors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        PAUSE: 'bg-orange-100 text-orange-800',
        COMPLETED: 'bg-green-100 text-green-800'
    }
    return colors[status]
}

/**
 * Get status label for display
 * @param status - Job status
 * @returns Human-readable status label
 */
export function getStatusLabel(
    status: 'PENDING' | 'IN_PROGRESS' | 'PAUSE' | 'COMPLETED'
): string {
    const labels = {
        PENDING: 'Pending',
        IN_PROGRESS: 'In-Progress',
        PAUSE: 'Paused',
        COMPLETED: 'Completed'
    }
    return labels[status]
}
