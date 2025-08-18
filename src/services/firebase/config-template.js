// Configuração do Firebase - TEMPLATE
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

// SUBSTITUA PELAS SUAS CREDENCIAIS DO FIREBASE
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJECT_ID.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
  measurementId: "SEU_MEASUREMENT_ID" // Opcional
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

