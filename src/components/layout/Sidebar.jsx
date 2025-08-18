import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  Activity, 
  ClipboardList, 
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  X
} from 'lucide-react'
import { useRealtimeFirestore } from '@/hooks/useFirestore'
import { useMemo } from 'react'

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const location = useLocation()
  const { data: leads, loading: leadsLoading } = useRealtimeFirestore('leads')

  // FUNÇÃO CORRIGIDA: Verificar se uma data é hoje
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

  // CÁLCULO CORRIGIDO: Usar os nomes corretos dos campos
  const stats = useMemo(() => {
    if (leadsLoading || !leads || leads.length === 0) {
      return {
        totalLeads: 0,
        leadsHoje: 0,
        agendamentosHoje: 0,
        receitaHoje: 0
      }
    }

    console.log('🔍 SIDEBAR: Analisando leads para estatísticas:', leads.length)
    console.log('📋 SIDEBAR: Exemplo de lead:', leads[0])

    // CORREÇÃO 1: Usar o nome correto do campo de data
    const leadsHoje = leads.filter(lead => {
      // Tentar ambos os formatos de campo de data
      const dataRegistro = lead.data_registro_contato || lead.dataRegistroContato
      const isHoje = isToday(dataRegistro)
      
      if (isHoje) {
        console.log('✅ SIDEBAR: Lead de hoje encontrado:', {
          nome: lead.nome_paciente || lead.nomePackiente,
          data: dataRegistro
        })
      }
      
      return isHoje
    })

    console.log(`📊 SIDEBAR: ${leadsHoje.length} leads encontrados para hoje`)

    // CORREÇÃO 2: Agendamentos de hoje - usar nomes corretos dos campos
    const agendamentosHoje = leadsHoje.filter(lead => {
      // Verificar diferentes formas de indicar agendamento
      const agendado = lead.agendado === true
      const statusAgendado = ['Agendado', 'agendado', 'AGENDADO', 'Confirmado', 'confirmado'].includes(lead.status)
      
      return agendado || statusAgendado
    }).length

    console.log(`📅 SIDEBAR: ${agendamentosHoje} agendamentos hoje`)

    // CORREÇÃO 3: Receita de hoje - leads convertidos hoje
    const leadsConvertidosHoje = leadsHoje.filter(lead => {
      const statusConvertido = ['Convertido', 'convertido', 'CONVERTIDO'].includes(lead.status)
      const orcamentoFechado = lead.orcamento_fechado === 'Total' || lead.orcamento_fechado === 'Parcial'
      
      return statusConvertido || orcamentoFechado
    })

    console.log(`💰 SIDEBAR: ${leadsConvertidosHoje.length} leads convertidos hoje`)

    // CORREÇÃO 4: Cálculo correto da receita
    const receitaHoje = leadsConvertidosHoje.reduce((total, lead) => {
      // Usar os nomes corretos dos campos de valor
      const valorOrcado = lead.valor_orcado || lead.valorOrcado || 0
      const valorFechadoParcial = lead.valor_fechado_parcial || lead.valorFechadoParcial || 0
      const orcamentoStatus = lead.orcamento_fechado || lead.orcamentoFechado

      let valorParaUsar = 0

      if (orcamentoStatus === 'Parcial' && valorFechadoParcial > 0) {
        valorParaUsar = valorFechadoParcial
      } else if (orcamentoStatus === 'Total' || lead.status === 'Convertido') {
        valorParaUsar = valorOrcado
      }

      // Converter string para número se necessário
      if (typeof valorParaUsar === 'string') {
        valorParaUsar = parseFloat(valorParaUsar.replace(/[R$\s.,]/g, '').replace(',', '.')) || 0
      }

      console.log(`💵 SIDEBAR: Lead ${lead.nome_paciente || lead.nomePackiente} contribui com R$ ${valorParaUsar}`)

      return total + valorParaUsar
    }, 0)

    console.log(`💸 SIDEBAR: Receita total hoje: R$ ${receitaHoje}`)

    return {
      totalLeads: leads.length,
      leadsHoje: leadsHoje.length,
      agendamentosHoje,
      receitaHoje
    }
  }, [leads, leadsLoading])

  // Configuração da navegação com contador dinâmico
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      description: 'Visão geral'
    },
    { 
      name: 'Leads', 
      href: '/leads', 
      icon: UserPlus,
      description: 'Gestão de leads',
      badge: stats.totalLeads
    },
    { 
      name: 'Médicos', 
      href: '/medicos', 
      icon: Users,
      description: 'Profissionais'
    },
    { 
      name: 'Especialidades', 
      href: '/especialidades', 
      icon: Activity,
      description: 'Áreas médicas'
    },
    { 
      name: 'Procedimentos', 
      href: '/procedimentos', 
      icon: ClipboardList,
      description: 'Serviços'
    },
    { 
      name: 'Relatórios', 
      href: '/relatorios', 
      icon: BarChart3,
      description: 'Análises'
    }
  ]

  // Função para formatar valores em reais
  const formatCurrency = (value) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    })
  }

  // Função para lidar com clique em links no mobile
  const handleLinkClick = () => {
    // Fechar o sidebar no mobile quando um link for clicado
    if (window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Header com botão de fechar no mobile */}
          <div className="flex flex-col items-center gap-3 p-6 border-b border-gray-800">
            {/* Botão de fechar no mobile */}
            <div className="flex w-full justify-between items-center lg:hidden">
              <div></div> {/* Spacer */}
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-center">
              <img 
                src="/Younv-Official.png" 
                alt="Younv" 
                className="h-12 w-auto"
              />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold">Clinical CRM</h1>
              <p className="text-sm text-gray-400">v2.0</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-gray-400">{item.description}</div>
                    </div>
                  </div>
                  {item.badge && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* RESUMO RÁPIDO CORRIGIDO */}
          <div className="p-4 border-t border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-3">RESUMO DE HOJE</h3>
            
            {leadsLoading ? (
              <div className="space-y-3">
                <div className="animate-pulse bg-gray-700 h-4 rounded"></div>
                <div className="animate-pulse bg-gray-700 h-4 rounded"></div>
                <div className="animate-pulse bg-gray-700 h-4 rounded"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">Novos Leads</span>
                  </div>
                  <span className="text-lg font-bold text-blue-400">{stats.leadsHoje}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-400" />
                    <span className="text-sm">Agendamentos</span>
                  </div>
                  <span className="text-lg font-bold text-green-400">{stats.agendamentosHoje}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">Receita</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-400">
                    R$ {formatCurrency(stats.receitaHoje)}
                  </span>
                </div>

                {/* Indicador de atualização */}
                <div className="text-xs text-gray-500 text-center mt-3 pt-2 border-t border-gray-700">
                  {stats.totalLeads > 0 ? (
                    `${stats.totalLeads} leads total`
                  ) : (
                    'Nenhum lead cadastrado'
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <div className="text-center">
              <p className="text-sm font-medium">Younv Consultoria</p>
              <p className="text-xs text-gray-400">Sistema de Gestão</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
