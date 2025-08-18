import { createContext, useContext, useEffect, useState } from 'react'
import authService from '@/services/firebase/auth'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('🔄 Configurando listener de autenticação...')
    
    const unsubscribe = authService.onAuthStateChanged((user) => {
      console.log('👤 Estado de autenticação mudou:', user ? 'Logado' : 'Deslogado')
      
      if (user) {
        // Criar objeto de usuário padronizado
        const userData = {
          uid: user.uid,
          id: user.uid, // Compatibilidade
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
          nome: user.displayName || user.email?.split('@')[0] || 'Usuário' // Compatibilidade
        }
        
        console.log('✅ Usuário logado:', userData)
        setUser(userData)
        
        // IMPORTANTE: Configurar dados globais para o serviço
        if (typeof window !== 'undefined') {
          window.currentUser = userData
          console.log('🌐 Dados do usuário configurados globalmente')
        }
      } else {
        console.log('🚪 Usuário deslogado')
        setUser(null)
        
        // Limpar dados globais
        if (typeof window !== 'undefined') {
          window.currentUser = null
        }
      }
      
      setLoading(false)
    })

    return () => {
      console.log('🔄 Removendo listener de autenticação')
      unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔐 Tentando fazer login...')
      
      const result = await authService.signIn(email, password)
      
      if (result.success) {
        console.log('✅ Login realizado com sucesso')
        // O usuário será definido pelo listener onAuthStateChanged
        return { success: true }
      } else {
        console.error('❌ Erro no login:', result.error)
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error)
      const errorMessage = 'Erro inesperado. Tente novamente.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, displayName) => {
    try {
      setLoading(true)
      setError(null)
      console.log('📝 Tentando criar conta...')
      
      const result = await authService.signUp(email, password, displayName)
      
      if (result.success) {
        console.log('✅ Conta criada com sucesso')
        // O usuário será definido pelo listener onAuthStateChanged
        return { success: true }
      } else {
        console.error('❌ Erro ao criar conta:', result.error)
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao criar conta:', error)
      const errorMessage = 'Erro inesperado. Tente novamente.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      console.log('🚪 Fazendo logout...')
      
      const result = await authService.signOut()
      
      if (result.success) {
        console.log('✅ Logout realizado com sucesso')
        // O usuário será limpo pelo listener onAuthStateChanged
        return { success: true }
      } else {
        console.error('❌ Erro no logout:', result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Erro inesperado no logout:', error)
      return { success: false, error: 'Erro inesperado. Tente novamente.' }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      setError(null)
      console.log('🔄 Enviando e-mail de recuperação...')
      
      const result = await authService.resetPassword(email)
      
      if (result.success) {
        console.log('✅ E-mail de recuperação enviado')
        return { success: true }
      } else {
        console.error('❌ Erro ao enviar e-mail:', result.error)
        setError(result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Erro inesperado na recuperação:', error)
      const errorMessage = 'Erro inesperado. Tente novamente.'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const clearError = () => {
    setError(null)
  }

  // Função para obter informações do usuário atual (compatibilidade)
  const getCurrentUser = () => {
    return user
  }

  // Verificar se o usuário está autenticado
  const isAuthenticated = () => {
    return !!user
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
    getCurrentUser,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}