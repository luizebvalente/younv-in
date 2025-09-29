import { Menu, LogOut, User, Search, Bell, Settings, Wifi, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtimeFirestore } from '@/hooks/useFirestore'
import { useState, useMemo } from 'react'

const Header = ({ onMenuClick }) => {
  const { user, signOut } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Carregar leads em tempo real
  const { data: leads, loading: leadsLoading } = useRealtimeFirestore('leads')

  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout do header...')
      await signOut()
      console.log('✅ Logout realizado com sucesso')
    } catch (error) {
      console.error('❌ Erro no logout:', error)
    }
  }

  // Função para verificar se uma data é hoje
  const isToday = (dateString) => {
    if (!dateString) return false
    
    try {
      const date = new Date(dateString)
      const today = new Date()
      
      // Normalizar as datas para comparar apenas dia/mês/ano
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      return dateOnly.getTime() === todayOnly.getTime()
    } catch (error) {
      console.error('Erro ao verificar data:', error)
      return false
    }
  }

  // Calcular leads de hoje
  const leadsHoje = useMemo(() => {
    if (leadsLoading || !leads || leads.length === 0) {
      return []
    }

    const hoje = leads.filter(lead => {
      // Tentar ambos os formatos de campo de data
      const dataRegistro = lead.data_registro_contato || lead.dataRegistroContato
      return isToday(dataRegistro)
    })

    console.log(`📊 HEADER: ${hoje.length} leads encontrados para hoje`)
    return hoje
  }, [leads, leadsLoading])

  // Calcular estatísticas de hoje
  const statsHoje = useMemo(() => {
    const agendamentosHoje = leadsHoje.filter(lead => {
      const agendado = lead.agendado === true
      const statusAgendado = ['Agendado', 'agendado', 'AGENDADO', 'Confirmado', 'confirmado'].includes(lead.status)
      return agendado || statusAgendado
    }).length

    const convertidosHoje = leadsHoje.filter(lead => {
      const statusConvertido = ['Convertido', 'convertido', 'CONVERTIDO'].includes(lead.status)
      return statusConvertido
    }).length

    return {
      total: leadsHoje.length,
      agendamentos: agendamentosHoje,
      convertidos: convertidosHoje
    }
  }, [leadsHoje])

  const getUserInitials = (user) => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = (user) => {
    if (user?.displayName) {
      return user.displayName
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'Usuário'
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getUserRole = (user) => {
    if (!user) return 'Visitante'
    
    const adminEmails = ['admin@younv.com', 'luiz@younv.com']
    
    if (adminEmails.includes(user.email)) {
      return 'Administrador'
    }
    
    if (user.email?.includes('@younv.com')) {
      return 'Usuário Younv'
    }
    
    return 'Usuário'
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'Não informado'
    
    try {
      return new Date(dateString).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Data inválida'
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">Y</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Clinical CRM</h1>
              <p className="text-sm text-gray-500">Sistema de Gestão</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Sistema Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">Firebase Conectado</span>
            </div>
          </div>
        </div>

        {/* Search and actions */}
        <div className="flex items-center space-x-4">
          {/* Search bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar pacientes, médicos..."
              className="pl-10 pr-4 py-2 w-80 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500 transition-colors"
            />
          </div>

          {/* NOTIFICAÇÕES - SINO FUNCIONAL */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {/* Badge com contador dinâmico */}
                {statsHoje.total > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-blue-500 text-white text-xs flex items-center justify-center animate-pulse">
                    {statsHoje.total > 99 ? '99+' : statsHoje.total}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Atividade de Hoje</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {getCurrentTime()}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Estatísticas do dia */}
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{statsHoje.total}</div>
                    <div className="text-xs text-blue-600 font-medium">Novos Leads</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">{statsHoje.agendamentos}</div>
                    <div className="text-xs text-green-600 font-medium">Agendados</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{statsHoje.convertidos}</div>
                    <div className="text-xs text-purple-600 font-medium">Convertidos</div>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />
              
              {/* Lista dos últimos leads de hoje */}
              <DropdownMenuLabel className="text-xs text-gray-500 uppercase tracking-wider">
                Últimos Leads de Hoje ({leadsHoje.length})
              </DropdownMenuLabel>
              
              <div className="max-h-48 overflow-y-auto">
                {leadsHoje.length > 0 ? (
                  leadsHoje.slice(0, 5).map((lead) => (
                    <DropdownMenuItem key={lead.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {(lead.nome_paciente || lead.nomePackiente || 'N').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {lead.nome_paciente || lead.nomePackiente || 'Nome não informado'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-2">
                          <span>{formatTime(lead.data_registro_contato || lead.dataRegistroContato)}</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            lead.status === 'Convertido' ? 'bg-green-100 text-green-800' :
                            lead.status === 'Agendado' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {lead.status || 'Lead'}
                          </span>
                        </div>
                        {lead.telefone && (
                          <div className="text-xs text-gray-400 mt-1">
                            📞 {lead.telefone}
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm">Nenhum lead hoje ainda</p>
                    <p className="text-xs text-gray-400">Novos leads aparecerão aqui</p>
                  </div>
                )}
              </div>
              
              {leadsHoje.length > 5 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                    <span className="w-full">Ver todos os {leadsHoje.length} leads de hoje</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5 text-gray-600" />
          </Button>

          {/* User profile */}
          <div className="flex items-center space-x-3">
            {/* User info - only show on larger screens */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {getUserDisplayName(user)}
              </p>
              <p className="text-xs text-gray-500">{getUserRole(user)}</p>
            </div>
            
            {/* Botão Sair direto */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full sm:hidden">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                    <span className="text-white font-medium text-sm">
                      {getUserInitials(user)}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-xs">
                          {getUserInitials(user)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {getUserDisplayName(user)}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground mt-1">
                          {getUserRole(user)}
                        </p>
                      </div>
                    </div>
                    {user?.email && (
                      <div className="pt-1 border-t">
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatar apenas visual para desktop */}
            <div className="hidden sm:block">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-medium text-sm">
                  {getUserInitials(user)}
                </span>
              </div>
            </div>
          </div>

          {/* Last sync time */}
          <div className="hidden lg:block text-right">
            <p className="text-xs text-gray-500">
              Última sincronização: {getCurrentTime()}
            </p>
            {user && (
              <p className="text-xs text-gray-400">
                Logado como: {getUserDisplayName(user)}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
