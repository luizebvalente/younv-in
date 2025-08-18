// Configuração do Firebase
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Configuração do Firebase - SUBSTITUA PELOS SEUS DADOS
const firebaseConfig = {
  apiKey: "AIzaSyANuRQRB4qHMVZUbcjwsWngr9RhznlqB6o",
  authDomain: "younv-in-71d99.firebaseapp.com",
  projectId: "younv-in-71d99",
  storageBucket: "younv-in-71d99.firebasestorage.app",
  messagingSenderId: "493068481415",
  appId: "1:493068481415:web:407c14f2dfccc317a71922",
  measurementId: "G-XXSVMB08CF"
}

// Para desenvolvimento local, você pode usar o emulador
// Descomente as linhas abaixo se quiser usar o emulador local
const USE_EMULATOR = false

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar Firestore
export const db = getFirestore(app)

// Inicializar Authentication
export const auth = getAuth(app)

// Conectar aos emuladores em desenvolvimento (opcional)
if (USE_EMULATOR && process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
    connectAuthEmulator(auth, 'http://localhost:9099')
  } catch (error) {
    console.log('Emuladores já conectados ou não disponíveis')
  }
}

export default app

