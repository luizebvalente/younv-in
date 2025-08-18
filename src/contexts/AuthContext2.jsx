// Context para gerenciar autenticação
import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/firebase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Observar mudanças no estado de autenticação
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email, password) => {
    setLoading(true)
    setError(null)
    
    const result = await authService.signIn(email, password)
    
    if (!result.success) {
      setError(result.error)
    }
    
    setLoading(false)
    return result
  }

  const signUp = async (email, password, displayName) => {
    setLoading(true)
    setError(null)
    
    const result = await authService.signUp(email, password, displayName)
    
    if (!result.success) {
      setError(result.error)
    }
    
    setLoading(false)
    return result
  }

  const signOut = async () => {
    setLoading(true)
    setError(null)
    
    const result = await authService.signOut()
    
    if (!result.success) {
      setError(result.error)
    }
    
    setLoading(false)
    return result
  }

  const resetPassword = async (email) => {
    setError(null)
    
    const result = await authService.resetPassword(email)
    
    if (!result.success) {
      setError(result.error)
    }
    
    return result
  }

  const clearError = () => {
    setError(null)
  }

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext

