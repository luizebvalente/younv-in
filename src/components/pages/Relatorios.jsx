import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  Users, 
  UserPlus, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Target, 
  Loader2,
  X,
  Eye,
  Phone,
  Mail,
  User,
  ArrowLeft,
  Search
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import firebaseDataService from '@/services/firebaseDataService'

const Relatorios = () => {
  const [leads, setLeads] = useState([])
  const [medicos, setMedicos] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Estados para o modal de leads por médico
  const [selectedMedico, setSelectedMedico] = useState(null)
  const [selectedMedicoLeads, setSelectedMedicoLeads] = useState([])
  const [filteredMedicoLeads, setFilteredMedicoLeads] = useState([])
  const [showMedicoLeads, setShowMedicoLeads] = useState(false)
  const [loadingMedicoLeads, setLoadingMedicoLeads] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [leadsData, medicosData, especialidadesData] = await Promise.all([
        firebaseDataService.getAll('leads'),
        firebaseDataService.getAll('medicos'),
        firebaseDataService.getAll('especialidades')
      ])
      
      setLeads(leadsData)
      setMedicos(medicosData)
      setEspecialidades(especialidadesData)
    } catch (err) {
      console.error('Erro ao carregar dados dos relatórios:', err)
      setError('Erro ao carregar dados dos relatórios. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Função para carregar leads específicos de um médico
  const loadMedicoLeads = async (medico) => {
    try {
      setLoadingMedicoLeads(true)
      setSelectedMedico(medico)
      setSearchTerm('') // Limpar pesquisa ao abrir
      
      // Filtrar leads do médico específico
      const medicoLeads = leads.filter(lead => lead.medico_agendado_id === medico.id)
      
      // Ordenar por data mais recente
      const sortedLeads = medicoLeads.sort((a, b) => {
        const dateA = new Date(a.data_registro_contato || 0)
        const dateB = new Date(b.data_registro_contato || 0)
        return dateB - dateA
      })
      
      setSelectedMedicoLeads(sortedLeads)
      setFilteredMedicoLeads(sortedLeads) // Inicializar lista filtrada
      setShowMedicoLeads(true)
    } catch (err) {
      console.error('Erro ao carregar leads do médico:', err)
      setError('Erro ao carregar leads do médico.')
    } finally {
      setLoadingMedicoLeads(false)
    }
  }

  // Função para filtrar leads baseado na pesquisa
  const handleSearch = (term) => {
    setSearchTerm(term)
    
    if (!term.trim()) {
      setFilteredMedicoLeads(selectedMedicoLeads)
      return
    }
    
    const filtered = selectedMedicoLeads.filter(lead => {
      const searchLower = term.toLowerCase()
      return (
        lead.nome_paciente?.toLowerCase().includes(searchLower) ||
        lead.telefone?.toLowerCase().includes(searchLower) ||
        lead.email?.toLowerCase().includes(searchLower) ||
        lead.canal_contato?.toLowerCase().includes(searchLower) ||
        lead.status?.toLowerCase().includes(searchLower) ||
        lead.solicitacao_paciente?.toLowerCase().includes(searchLower)
      )
    })
    
    setFilteredMedicoLeads(filtered)
  }

  // Fechar modal de leads
  const closeMedicoLeads = () => {
    setShowMedicoLeads(false)
    setSelectedMedico(null)
    setSelectedMedicoLeads([])
    setFilteredMedicoLeads([])
    setSearchTerm('')
  }

  // Cálculos para métricas
  const totalLeads = leads.length
  const agendados = leads.filter(l => l.agendado).length
  const convertidos = leads.filter(l => l.status === 'Convertido').length
  const taxaConversao = totalLeads > 0 ? ((convertidos / totalLeads) * 100).toFixed(1) : 0
  const valorTotal = leads.reduce((sum, lead) => sum + (lead.valor_orcado || 0), 0)
  const valorConvertido = leads
    .filter(l => l.status === 'Convertido')
    .reduce((sum, lead) => sum + (lead.valor_orcado || 0), 0)

  // Dados para gráficos
  const leadsPorCanal = () => {
    const canais = {}
    leads.forEach(lead => {
      canais[lead.canal_contato] = (canais[lead.canal_contato] || 0) + 1
    })
    return Object.entries(canais).map(([canal, quantidade]) => ({
      canal,
      quantidade
    }))
  }

  const leadsPorStatus = () => {
    const status = {}
    leads.forEach(lead => {
      status[lead.status] = (status[lead.status] || 0) + 1
    })
    return Object.entries(status).map(([status, quantidade]) => ({
      status,
      quantidade
    }))
  }

  const medicosPorAtendimento = () => {
    const stats = {}
    medicos.forEach(medico => {
      const medicoLeads = leads.filter(lead => lead.medico_agendado_id === medico.id)
      stats[medico.nome] = {
        nome: medico.nome,
        id: medico.id,
        total: medicoLeads.length,
        convertidos: medicoLeads.filter(lead => lead.status === 'Convertido').length,
        medico: medico // Adicionar objeto completo do médico
      }
    })
    return Object.values(stats).sort((a, b) => b.total - a.total)
  }

  const leadsPorMes = () => {
    const meses = {}
    leads.forEach(lead => {
      const data = new Date(lead.data_registro_contato)
      const mesAno = `${data.getMonth() + 1}/${data.getFullYear()}`
      meses[mesAno] = (meses[mesAno] || 0) + 1
    })
    return Object.entries(meses).map(([mes, quantidade]) => ({
      mes,
      quantidade
    })).slice(-6) // Últimos 6 meses
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Não informado'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      'Lead': 'bg-blue-100 text-blue-800',
      'Agendado': 'bg-yellow-100 text-yellow-800',
      'Convertido': 'bg-green-100 text-green-800',
      'Perdido': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando relatórios...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600">Análises e métricas de performance</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              Todos os leads cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agendados}</div>
            <p className="text-xs text-muted-foreground">
              {totalLeads > 0 ? ((agendados / totalLeads) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertidos}</div>
            <p className="text-xs text-muted-foreground">
              {taxaConversao}% de conversão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaConversao}%</div>
            <p className="text-xs text-muted-foreground">
              Leads → Convertidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Orçado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valorTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Total em orçamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Convertido</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valorConvertido)}</div>
            <p className="text-xs text-muted-foreground">
              {valorTotal > 0 ? ((valorConvertido / valorTotal) * 100).toFixed(1) : 0}% do orçado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads por Canal */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Canal de Contato</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsPorCanal().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsPorCanal()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="canal" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status dos Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsPorStatus().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leadsPorStatus()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, quantidade }) => `${status}: ${quantidade}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantidade"
                  >
                    {leadsPorStatus().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Médicos por Atendimento */}
        <Card>
          <CardHeader>
            <CardTitle>Performance dos Médicos</CardTitle>
          </CardHeader>
          <CardContent>
            {medicosPorAtendimento().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={medicosPorAtendimento()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8884d8" name="Total de Leads" />
                  <Bar dataKey="convertidos" fill="#82ca9d" name="Convertidos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evolução Temporal */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Leads (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsPorMes().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadsPorMes()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="quantidade" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Performance dos Médicos - COM FUNCIONALIDADE DE CLIQUE */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Médicos por Atendimentos</CardTitle>
          <p className="text-sm text-gray-600">Clique no nome do médico para ver a lista de leads</p>
        </CardHeader>
        <CardContent>
          {medicosPorAtendimento().length > 0 ? (
            <div className="space-y-4">
              {medicosPorAtendimento().map((medico, index) => (
                <div 
                  key={medico.nome} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => loadMedicoLeads(medico.medico)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-blue-600 hover:text-blue-800 flex items-center">
                        {medico.nome}
                        <Eye className="h-4 w-4 ml-2" />
                      </p>
                      <p className="text-sm text-gray-500">
                        {medico.total} leads • {medico.convertidos} convertidos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {medico.total > 0 ? ((medico.convertidos / medico.total) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-sm text-gray-500">Taxa de conversão</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum dado de médicos disponível.</p>
              <p className="text-gray-400 text-sm">Cadastre médicos e leads para ver os relatórios.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal/Painel de Leads por Médico */}
      {showMedicoLeads && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header do Modal */}
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Leads de {selectedMedico?.nome}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {filteredMedicoLeads.length} de {selectedMedicoLeads.length} leads
                    {searchTerm && ` (filtrados por "${searchTerm}")`}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeMedicoLeads}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeMedicoLeads}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Barra de Pesquisa */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Pesquisar por nome, telefone, email, canal ou status..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearch('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingMedicoLeads ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando leads...</span>
                </div>
              ) : selectedMedicoLeads.length > 0 ? (
                filteredMedicoLeads.length > 0 ? (
                  <div className="space-y-4">
                    {filteredMedicoLeads.map((lead) => (
                    <Card key={lead.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <User className="h-5 w-5 text-gray-400" />
                              <h3 className="font-semibold text-lg text-gray-900">
                                {lead.nome_paciente}
                              </h3>
                              <Badge className={getStatusBadgeColor(lead.status)}>
                                {lead.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="h-4 w-4 mr-2" />
                                  {lead.telefone || 'Não informado'}
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {lead.email || 'Não informado'}
                                </div>
                                <div className="flex items-center text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {formatDate(lead.data_registro_contato)}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">Canal:</span>
                                  <span className="ml-2 text-gray-600">{lead.canal_contato || 'Não informado'}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">Agendado:</span>
                                  <span className="ml-2 text-gray-600">{lead.agendado ? 'Sim' : 'Não'}</span>
                                </div>
                                {lead.valor_orcado > 0 && (
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-700">Valor:</span>
                                    <span className="ml-2 text-gray-600">{formatCurrency(lead.valor_orcado)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {lead.solicitacao_paciente && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Solicitação:</span> {lead.solicitacao_paciente}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Nenhum lead encontrado para "{searchTerm}"</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch('')}
                      className="mt-2"
                    >
                      Limpar pesquisa
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhum lead encontrado para este médico.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Relatorios
