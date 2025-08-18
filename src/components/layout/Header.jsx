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

const Header = ({ onMenuClick }) => {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout do header...')
      await signOut()
      console.log('✅ Logout realizado com sucesso')
    } catch (error) {
      console.error('❌ Erro no logout:', error)
    }
  }

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
      // Pegar a parte antes do @ do email
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

  // Função para verificar se é administrador (baseado no email ou outras regras)
  const getUserRole = (user) => {
    if (!user) return 'Visitante'
    
    // Você pode customizar essas regras conforme necessário
    const adminEmails = ['admin@younv.com', 'luiz@younv.com']
    
    if (adminEmails.includes(user.email)) {
      return 'Administrador'
    }
    
    // Verificar se é email da empresa
    if (user.email?.includes('@younv.com')) {
      return 'Usuário Younv'
    }
    
    return 'Usuário'
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

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
              3
            </Badge>
          </Button>

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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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