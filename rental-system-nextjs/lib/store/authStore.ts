import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'STAFF'
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  isAdmin: () => boolean
  isStaff: () => boolean
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      isAdmin: () => get().user?.role === 'ADMIN',
      isStaff: () => {
        const role = get().user?.role
        return role === 'STAFF' || role === 'ADMIN'
      },
      isAuthenticated: () => !!get().token && !!get().user,
    }),
    {
      name: 'auth-storage',
    }
  )
)
