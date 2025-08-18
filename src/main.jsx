import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Verificar se o elemento root existe
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Elemento root não encontrado!')
} else {
  console.log('Elemento root encontrado, iniciando aplicação...')
  
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

