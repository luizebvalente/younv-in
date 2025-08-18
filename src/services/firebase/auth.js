// Serviços de autenticação Firebase
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth'
import { auth } from './config'

// MODO DE DESENVOLVIMENTO - Para testes sem Firebase real
const DEVELOPMENT_MODE = false // Altere para true apenas para testes locais

class AuthService {
  constructor() {
    this.developmentUser = null
  }

  // Fazer login com email e senha
  async signIn(email, password) {
    if (DEVELOPMENT_MODE) {
      // Modo de desenvolvimento - aceita qualquer credencial
      console.log('🔧 Modo de desenvolvimento ativo - Login simulado')
      
      this.developmentUser = {
        uid: 'dev-user-' + Date.now(),
        email: email,
        displayName: email.split('@')[0] || 'Usuário Dev',
        emailVerified: true
      }
      
      // Simular callback de autenticação
      setTimeout(() => {
        if (this.authCallback) {
          this.authCallback(this.developmentUser)
        }
      }, 100)
      
      return { success: true, user: this.developmentUser }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      return { success: true, user: userCredential.user }
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) }
    }
  }

  // Criar nova conta
  async signUp(email, password, displayName) {
    if (DEVELOPMENT_MODE) {
      // Modo de desenvolvimento - simula criação de conta
      console.log('🔧 Modo de desenvolvimento ativo - Cadastro simulado')
      
      this.developmentUser = {
        uid: 'dev-user-' + Date.now(),
        email: email,
        displayName: displayName || email.split('@')[0] || 'Usuário Dev',
        emailVerified: true
      }
      
      // Simular callback de autenticação
      setTimeout(() => {
        if (this.authCallback) {
          this.authCallback(this.developmentUser)
        }
      }, 100)
      
      return { success: true, user: this.developmentUser }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Atualizar o nome do usuário
      if (displayName) {
        await updateProfile(userCredential.user, { displayName })
      }
      
      return { success: true, user: userCredential.user }
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) }
    }
  }

  // Fazer logout
  async signOut() {
    if (DEVELOPMENT_MODE) {
      console.log('🔧 Modo de desenvolvimento ativo - Logout simulado')
      this.developmentUser = null
      
      // Simular callback de logout
      setTimeout(() => {
        if (this.authCallback) {
          this.authCallback(null)
        }
      }, 100)
      
      return { success: true }
    }

    try {
      await signOut(auth)
      return { success: true }
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) }
    }
  }

  // Resetar senha
  async resetPassword(email) {
    if (DEVELOPMENT_MODE) {
      console.log('🔧 Modo de desenvolvimento ativo - Reset de senha simulado')
      return { success: true }
    }

    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error.code) }
    }
  }

  // Observar mudanças no estado de autenticação
  onAuthStateChanged(callback) {
    if (DEVELOPMENT_MODE) {
      console.log('🔧 Modo de desenvolvimento ativo - Configurando listener simulado')
      this.authCallback = callback
      
      // Se já há um usuário logado, chama o callback
      if (this.developmentUser) {
        setTimeout(() => callback(this.developmentUser), 100)
      } else {
        setTimeout(() => callback(null), 100)
      }
      
      // Retorna função de unsubscribe
      return () => {
        this.authCallback = null
      }
    }

    return onAuthStateChanged(auth, callback)
  }

  // Obter usuário atual
  getCurrentUser() {
    if (DEVELOPMENT_MODE) {
      return this.developmentUser
    }
    return auth.currentUser
  }

  // Verificar se usuário está logado
  isAuthenticated() {
    if (DEVELOPMENT_MODE) {
      return !!this.developmentUser
    }
    return !!auth.currentUser
  }

  // Traduzir códigos de erro para mensagens amigáveis
  getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/email-already-in-use': 'Este email já está em uso',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres',
      'auth/invalid-email': 'Email inválido',
      'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
      'auth/user-disabled': 'Esta conta foi desabilitada',
      'auth/operation-not-allowed': 'Operação não permitida'
    }
    
    return errorMessages[errorCode] || 'Erro desconhecido. Tente novamente'
  }
}

export default new AuthService()

