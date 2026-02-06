import 'next-auth'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            email: string
            name: string
            role: 'ADMIN' | 'MANAGER' | 'USER'
        }
    }

    interface User {
        role: 'ADMIN' | 'MANAGER' | 'USER'
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role: 'ADMIN' | 'MANAGER' | 'USER'
        id: string
    }
}
