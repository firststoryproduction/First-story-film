// TypeScript type definitions for database tables

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER'
export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'PAUSE' | 'COMPLETED'

export interface User {
    id: string
    name: string
    email: string
    role: UserRole
    mobile: string
    created_at: string
    updated_at: string
}

export interface Service {
    id: string
    name: string
    created_at: string
    updated_at: string
}

export interface StaffServiceConfig {
    id: string
    staff_id: string
    service_id: string
    percentage: number
    due_date: string | null
    created_at: string
    updated_at: string
}

export interface Vendor {
    id: string
    studio_name: string
    contact_person: string
    mobile: string
    email: string | null
    location: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface Job {
    id: string
    service_id: string
    vendor_id: string | null
    staff_id: string | null
    description: string
    data_location: string | null
    final_location: string | null
    job_due_date: string
    staff_due_date: string | null
    status: JobStatus
    amount: number
    commission_amount: number
    started_at: string | null
    completed_at: string | null
    created_at: string
    updated_at: string
}

// Database schema type for Supabase client
export interface Database {
    public: {
        Tables: {
            users: {
                Row: User
                Insert: Partial<User> & { name: string; email: string; password: string; role: UserRole; mobile: string }
                Update: Partial<User>
            }
            services: {
                Row: Service
                Insert: { name: string; id?: string; created_at?: string; updated_at?: string }
                Update: Partial<Service>
            }
            staff_service_configs: {
                Row: StaffServiceConfig
                Insert: { staff_id: string; service_id: string; percentage: number; due_date?: string | null; id?: string; created_at?: string; updated_at?: string }
                Update: Partial<StaffServiceConfig>
            }
            vendors: {
                Row: Vendor
                Insert: { studio_name: string; contact_person: string; mobile: string; email?: string | null; location?: string | null; notes?: string | null; id?: string; created_at?: string; updated_at?: string }
                Update: Partial<Vendor>
            }
            jobs: {
                Row: Job
                Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }
                Update: Partial<Job>
            }
        }
    }
}
