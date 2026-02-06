import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { supabaseAdmin } from './supabase'
import { User } from '../types/database'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const { data: user, error } = await supabaseAdmin
                    .from('users')
                    .select('*')
                    .eq('email', credentials.email)
                    .single()

                if (error || !user) return null

                const isValid = await bcrypt.compare(credentials.password, user.password)
                if (!isValid) return null

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role as 'ADMIN' | 'MANAGER' | 'USER'
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as 'ADMIN' | 'MANAGER' | 'USER'
                session.user.id = token.id as string
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt'
    },
    secret: process.env.NEXTAUTH_SECRET || 'temporary-secret-for-development'
}
