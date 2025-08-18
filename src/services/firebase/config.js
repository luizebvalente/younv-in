// Configuração do Firebase
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// Configuração do Firebase - SUBSTITUA PELOS SEUS DADOS
const firebaseConfig = {
  apiKey: "AIzaSyBtrRjLQR7sLX00VX9zqviOvZmoFqQSYOU",
  authDomain: "younv-db.firebaseapp.com",
  projectId: "younv-db",
  storageBucket: "younv-db.firebasestorage.app",
  messagingSenderId: "690640193086",
  appId: "1:690640193086:web:008d04a0e2f1272dcd736f",
  measurementId: "G-778QW9BKXK"
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

