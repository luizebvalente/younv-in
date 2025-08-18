// Configuração temporária para testes (sem Firebase real)
// Para usar Firebase real, substitua pelas suas credenciais

// Mock do Firebase para testes locais
const mockFirebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id"
}

// Simulação básica do Firebase para desenvolvimento
class MockFirebaseApp {
  constructor() {
    console.log('Usando configuração mock do Firebase para desenvolvimento')
  }
}

class MockFirestore {
  constructor() {
    this.data = new Map()
  }
  
  collection(name) {
    return {
      add: (data) => Promise.resolve({ id: Date.now().toString() }),
      get: () => Promise.resolve({ docs: [] }),
      doc: (id) => ({
        get: () => Promise.resolve({ exists: false }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve()
      })
    }
  }
}

class MockAuth {
  constructor() {
    this.currentUser = null
  }
  
  signInWithEmailAndPassword() {
    return Promise.resolve({ user: { uid: 'demo-user', email: 'demo@test.com' } })
  }
  
  createUserWithEmailAndPassword() {
    return Promise.resolve({ user: { uid: 'demo-user', email: 'demo@test.com' } })
  }
  
  signOut() {
    return Promise.resolve()
  }
  
  onAuthStateChanged(callback) {
    // Simular usuário logado para desenvolvimento
    setTimeout(() => callback({ uid: 'demo-user', email: 'demo@test.com', displayName: 'Usuário Demo' }), 100)
    return () => {} // unsubscribe function
  }
}

// Exports para desenvolvimento
export const app = new MockFirebaseApp()
export const db = new MockFirestore()
export const auth = new MockAuth()

export default app

