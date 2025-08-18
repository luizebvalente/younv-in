import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import './App.css'

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Layout Components
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'

// Page Components
import Dashboard from './components/pages/Dashboard'
import Medicos from './components/pages/Medicos'
import Especialidades from './components/pages/Especialidades'
import Procedimentos from './components/pages/Procedimentos'
import Leads from './components/pages/Leads'
import Relatorios from './components/pages/Relatorios'
import Login from './components/pages/Login'

// Componente principal da aplicação autenticada
function AuthenticatedApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/medicos" element={<Medicos />} />
            <Route path="/especialidades" element={<Especialidades />} />
            <Route path="/procedimentos" element={<Procedimentos />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

// Componente que gerencia autenticação
function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium">Carregando sistema...</p>
        </div>
      </div>
    )
  }

  return user ? <AuthenticatedApp /> : <Login />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

export default App

