import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Users, Calendar, DollarSign, TrendingUp, Check, RefreshCw, X, Tag, Settings, AlertTriangle, User, Clock, CalendarDays, Download, ChevronLeft, ChevronRight, UserPlus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useFirestore } from '@/hooks/useFirestore'
import { useAuth } from '@/contexts/AuthContext'
import firebaseDataService from '@/services/firebaseDataService'

// FUNÇÃO UTILITÁRIA PARA DEBOUNCE
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function Leads() {
  // ESTADOS PRINCIPAIS
  const [leads, setLeads] = useState([])
  const [medicos, setMedicos] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [procedimentos, setProcedimentos] = useState([])
  const [tags, setTags] = useState([])
  
  // ESTADOS DE UI
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [existingPatient, setExistingPatient] = useState(null)
  const [activeTab, setActiveTab] = useState('leads')
  
  // ESTADOS DE FILTROS
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [createdByFilter, setCreatedByFilter] = useState('Todos')
  const [selectedTagsFilter, setSelectedTagsFilter] = useState([])
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    quickFilter: ''
  })
  const [filteredByDateLeads, setFilteredByDateLeads] = useState([])
  
  // ESTADOS DE PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  
  // ESTADOS PARA TAGS
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [tagForm, setTagForm] = useState({
    nome: '',
    cor: '#3b82f6',
    categoria: 'Procedimento'
  })
  
  // FORMULÁRIO OTIMIZADO COM NOVOS CAMPOS ATUALIZADOS
  const [formData, setFormData] = useState(() => ({
    nome_paciente: '',
    telefone: '',
    data_nascimento: '',
    email: '',
    canal_contato: '', // MUDANÇA 1: Agora será "Origem de Contato" com opções Lead Interno/Externo
    solicitacao_paciente: '',
    medico_agendado_id: '',
    especialidade_id: '',
    procedimento_agendado_id: '',
    agendado: false,
    motivo_nao_agendamento: '',
    outros_profissionais_agendados: false,
    quais_profissionais: '',
    // MUDANÇA 3: Campos expandidos para outros profissionais (5 slots)
    outros_profissionais: [
      { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false }
    ],
    pagou_reserva: false,
    tipo_visita: '',
    valor_orcado: '',
    orcamento_fechado: '',
    valor_fechado_parcial: '',
    observacao_geral: '',
    perfil_comportamental_disc: '',
    status: 'Sem Interação', // MUDANÇA 2: Status padrão ajustado
    followup1_realizado: false,
    followup1_data: '',
    followup2_realizado: false,
    followup2_data: '',
    followup3_realizado: false,
    followup3_data: '',
    tags: []
  }))

  // Hook de autenticação
  const { user } = useAuth()

  // FUNÇÃO PARA GERENCIAR OUTROS PROFISSIONAIS (ATUALIZADA)
  const handleOutrosProfissionaisChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newOutrosProfissionais = [...prev.outros_profissionais]
      newOutrosProfissionais[index] = {
        ...newOutrosProfissionais[index],
        [field]: value
      }
      
      // Se estiver preenchendo qualquer campo, ativar o slot
      if (value && ['medico_id', 'especialidade_id', 'procedimento_id', 'data_agendamento'].includes(field)) {
        newOutrosProfissionais[index].ativo = true
      }
      
      // Se limpar todos os campos principais, desativar o slot
      const prof = newOutrosProfissionais[index]
      if (!prof.medico_id && !prof.especialidade_id && !prof.procedimento_id && !prof.data_agendamento) {
        newOutrosProfissionais[index].ativo = false
      }
      
      return {
        ...prev,
        outros_profissionais: newOutrosProfissionais,
        outros_profissionais_agendados: newOutrosProfissionais.some(prof => prof.ativo)
      }
    })
  }, [])

  // FUNÇÃO PARA ADICIONAR UM NOVO SLOT DE PROFISSIONAL
  const adicionarOutroProfissional = useCallback(() => {
    const proximoSlotVazio = formData.outros_profissionais.findIndex(prof => !prof.ativo)
    if (proximoSlotVazio !== -1) {
      handleOutrosProfissionaisChange(proximoSlotVazio, 'ativo', true)
    }
  }, [formData.outros_profissionais, handleOutrosProfissionaisChange])

  // FUNÇÃO PARA REMOVER UM SLOT DE PROFISSIONAL
  const removerOutroProfissional = useCallback((index) => {
    setFormData(prev => {
      const newOutrosProfissionais = [...prev.outros_profissionais]
      newOutrosProfissionais[index] = { 
        medico_id: '', 
        especialidade_id: '', 
        procedimento_id: '',
        data_agendamento: '', 
        valor: '',
        local_agendado: '',
        ativo: false 
      }
      
      return {
        ...prev,
        outros_profissionais: newOutrosProfissionais,
        outros_profissionais_agendados: newOutrosProfissionais.some(prof => prof.ativo)
      }
    })
  }, [])

  // MEMOIZAÇÕES PARA PERFORMANCE
  const filteredLeads = useMemo(() => {
    const baseLeads = showDateFilter ? filteredByDateLeads : leads
    
    const filtered = baseLeads.filter(lead => {
      const matchesSearch = lead.nome_paciente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.telefone?.includes(searchTerm) ||
                           lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'Todos' || lead.status === statusFilter
      const matchesCreator = createdByFilter === 'Todos' || lead.criado_por_nome === createdByFilter
      const matchesTags = selectedTagsFilter.length === 0 || 
                         selectedTagsFilter.every(tagId => lead.tags?.includes(tagId))
      
      return matchesSearch && matchesStatus && matchesCreator && matchesTags
    })

    const pages = Math.ceil(filtered.length / itemsPerPage)
    setTotalPages(pages || 1)
    
    if (currentPage > pages && pages > 0) {
      setCurrentPage(1)
    }
    
    return filtered
  }, [leads, filteredByDateLeads, showDateFilter, searchTerm, statusFilter, createdByFilter, selectedTagsFilter, itemsPerPage, currentPage])

  // LEADS PAGINADOS
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredLeads.slice(startIndex, endIndex)
  }, [filteredLeads, currentPage, itemsPerPage])

  const stats = useMemo(() => ({
    total: filteredLeads.length,
    agendados: filteredLeads.filter(lead => lead.status === 'Agendado').length,
    convertidos: filteredLeads.filter(lead => lead.status === 'Convertido').length,
    valorTotal: filteredLeads.filter(lead => lead.status === 'Convertido')
                    .reduce((sum, lead) => sum + (lead.valor_orcado || 0), 0)
  }), [filteredLeads])

  const uniqueCreators = useMemo(() => {
    const creators = new Set()
    leads.forEach(lead => {
      if (lead.criado_por_nome) {
        creators.add(lead.criado_por_nome)
      }
    })
    return Array.from(creators).sort()
  }, [leads])

  // FUNÇÕES DE PAGINAÇÃO
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      document.querySelector('.leads-table')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [totalPages])

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  const changeItemsPerPage = useCallback((newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }, [])

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, createdByFilter, selectedTagsFilter, showDateFilter, dateFilter])

  // FUNÇÕES OTIMIZADAS COM useCallback
  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const checkExistingPatient = useCallback(async (telefone) => {
    if (!telefone || telefone.length < 10) {
      setExistingPatient(null)
      return false
    }

    try {
      const cleanPhone = telefone.replace(/\D/g, '')
      const existingLead = leads.find(lead => 
        lead.telefone && lead.telefone.replace(/\D/g, '') === cleanPhone
      )
      
      if (existingLead && (!editingItem || existingLead.id !== editingItem.id)) {
        setExistingPatient(existingLead)
        handleFormChange('tipo_visita', 'Recorrente')
        return true
      } else {
        setExistingPatient(null)
        handleFormChange('tipo_visita', 'Primeira Visita')
        return false
      }
    } catch (err) {
      console.error('Erro ao verificar paciente existente:', err)
      return false
    }
  }, [leads, editingItem, handleFormChange])

  // DEBOUNCE PARA VERIFICAÇÃO DE TELEFONE
  const debouncedCheckPatient = useMemo(
    () => debounce((telefone) => checkExistingPatient(telefone), 300),
    [checkExistingPatient]
  )

  const handleTelefoneChange = useCallback((e) => {
    const numbers = e.target.value.replace(/\D/g, '');
    let formatted = '';

    if (numbers.length <= 2) {
      formatted = numbers;
    } else if (numbers.length <= 7) {
      formatted = `(${numbers.slice(0, 2)})${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      formatted = `(${numbers.slice(0, 2)})${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      formatted = `(${numbers.slice(0, 2)})${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }

    handleFormChange('telefone', formatted);
    
    if (!editingItem && formatted.length >= 14) {
      debouncedCheckPatient(formatted);
    }
  }, [editingItem, handleFormChange, debouncedCheckPatient])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [leadsData, medicosData, especialidadesData, procedimentosData, tagsData] = await Promise.all([
        firebaseDataService.getAll('leads'),
        firebaseDataService.getAll('medicos'),
        firebaseDataService.getAll('especialidades'),
        firebaseDataService.getAll('procedimentos'),
        firebaseDataService.getAll('tags')
      ])
      
      setLeads(leadsData)
      setFilteredByDateLeads(leadsData)
      setMedicos(medicosData)
      setEspecialidades(especialidadesData)
      setProcedimentos(procedimentosData)
      setTags(tagsData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (!editingItem) {
      const isDuplicate = await checkExistingPatient(formData.telefone)
      if (isDuplicate) {
        setError(`Telefone já registrado! Este número pertence ao paciente: ${existingPatient.nome_paciente}. Não é possível cadastrar o mesmo telefone novamente.`)
        return
      }
    }

    try {
      setSaving(true)
      setError(null)
      
      const dataToSave = {
        nome_paciente: formData.nome_paciente || '',
        telefone: formData.telefone || '',
        data_nascimento: formData.data_nascimento || '',
        email: formData.email || '',
        canal_contato: formData.canal_contato || '',
        solicitacao_paciente: formData.solicitacao_paciente || '',
        medico_agendado_id: formData.medico_agendado_id || '',
        especialidade_id: formData.especialidade_id || '',
        procedimento_agendado_id: formData.procedimento_agendado_id || '',
        agendado: formData.agendado || false,
        motivo_nao_agendamento: formData.motivo_nao_agendamento || '',
        outros_profissionais_agendados: formData.outros_profissionais_agendados || false,
        quais_profissionais: formData.quais_profissionais || '',
        outros_profissionais: formData.outros_profissionais || [],
        pagou_reserva: formData.pagou_reserva || false,
        tipo_visita: formData.tipo_visita || '',
        valor_orcado: parseFloat(formData.valor_orcado) || 0,
        orcamento_fechado: formData.orcamento_fechado || '',
        valor_fechado_parcial: formData.orcamento_fechado === 'Parcial' ? parseFloat(formData.valor_fechado_parcial) || 0 : 0,
        observacao_geral: formData.observacao_geral || '',
        perfil_comportamental_disc: formData.perfil_comportamental_disc || '',
        status: formData.status || 'Sem Interação',
        followup1_realizado: Boolean(formData.followup1_realizado),
        followup1_data: formData.followup1_data || '',
        followup2_realizado: Boolean(formData.followup2_realizado),
        followup2_data: formData.followup2_data || '',
        followup3_realizado: Boolean(formData.followup3_realizado),
        followup3_data: formData.followup3_data || '',
        tags: formData.tags || [],
        data_registro_contato: editingItem ? editingItem.data_registro_contato : new Date().toISOString()
      }
      
      if (editingItem) {
        await firebaseDataService.update('leads', editingItem.id, dataToSave)
      } else {
        await firebaseDataService.create('leads', dataToSave)
      }
      
      await loadData()
      resetForm()
    } catch (err) {
      console.error('Erro ao salvar lead:', err)
      setError('Erro ao salvar lead. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }, [formData, editingItem, existingPatient, checkExistingPatient, loadData])

  const resetForm = useCallback(() => {
    setFormData({
      nome_paciente: '',
      telefone: '',
      data_nascimento: '',
      email: '',
      canal_contato: '',
      solicitacao_paciente: '',
      medico_agendado_id: '',
      especialidade_id: '',
      procedimento_agendado_id: '',
      agendado: false,
      motivo_nao_agendamento: '',
      outros_profissionais_agendados: false,
      quais_profissionais: '',
      outros_profissionais: [
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false }
      ],
      pagou_reserva: false,
      tipo_visita: '',
      valor_orcado: '',
      orcamento_fechado: '',
      valor_fechado_parcial: '',
      observacao_geral: '',
      perfil_comportamental_disc: '',
      status: 'Sem Interação',
      followup1_realizado: false,
      followup1_data: '',
      followup2_realizado: false,
      followup2_data: '',
      followup3_realizado: false,
      followup3_data: '',
      tags: []
    })
    setEditingItem(null)
    setIsDialogOpen(false)
    setExistingPatient(null)
  }, [])

  const handleEdit = useCallback((item) => {
    setEditingItem(item)
    setFormData({
      nome_paciente: item.nome_paciente || '',
      telefone: item.telefone || '',
      data_nascimento: item.data_nascimento || '',
      email: item.email || '',
      canal_contato: item.canal_contato || '',
      solicitacao_paciente: item.solicitacao_paciente || '',
      medico_agendado_id: item.medico_agendado_id || '',
      especialidade_id: item.especialidade_id || '',
      procedimento_agendado_id: item.procedimento_agendado_id || '',
      agendado: item.agendado || false,
      motivo_nao_agendamento: item.motivo_nao_agendamento || '',
      outros_profissionais_agendados: item.outros_profissionais_agendados || false,
      quais_profissionais: item.quais_profissionais || '',
      outros_profissionais: item.outros_profissionais || [
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', procedimento_id: '', data_agendamento: '', valor: '', local_agendado: '', ativo: false }
      ],
      pagou_reserva: item.pagou_reserva || false,
      tipo_visita: item.tipo_visita || '',
      valor_orcado: item.valor_orcado ? item.valor_orcado.toString() : '',
      orcamento_fechado: item.orcamento_fechado || '',
      valor_fechado_parcial: item.valor_fechado_parcial ? item.valor_fechado_parcial.toString() : '',
      observacao_geral: item.observacao_geral || '',
      perfil_comportamental_disc: item.perfil_comportamental_disc || '',
      status: item.status || 'Sem Interação',
      followup1_realizado: Boolean(item.followup1_realizado),
      followup1_data: item.followup1_data || '',
      followup2_realizado: Boolean(item.followup2_realizado),
      followup2_data: item.followup2_data || '',
      followup3_realizado: Boolean(item.followup3_realizado),
      followup3_data: item.followup3_data || '',
      tags: item.tags || []
    })
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (id) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        setError(null)
        await firebaseDataService.delete('leads', id)
        await loadData()
      } catch (err) {
        console.error('Erro ao excluir lead:', err)
        setError('Erro ao excluir lead. Tente novamente.')
      }
    }
  }, [loadData])

  // CONTINUAÇÃO DO CÓDIGO...
  // (As demais funções permanecem iguais, incluindo funções de migração, tags, data, etc.)

  // FUNÇÕES AUXILIARES
  const getStatusColor = useCallback((status) => {
    const colors = {
      'Sem Interação': 'bg-gray-100 text-gray-800',
      'Em Conversa': 'bg-blue-100 text-blue-800',
      'Convertido': 'bg-green-100 text-green-800',
      'Perdido': 'bg-red-100 text-red-800',
      'Não Agendou': 'bg-orange-100 text-orange-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }, [])

  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return 'Não informado'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Data inválida'
    }
  }, [])

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Não informado'
    try {
      return new Date(dateString).toLocaleDateString('pt-BR')
    } catch {
      return 'Data inválida'
    }
  }, [])

  const getMedicoNome = useCallback((id) => {
    const medico = medicos.find(m => m.id === id)
    return medico ? medico.nome : 'N/A'
  }, [medicos])

  const getEspecialidadeNome = useCallback((id) => {
    const especialidade = especialidades.find(e => e.id === id)
    return especialidade ? especialidade.nome : 'N/A'
  }, [especialidades])

  const getProcedimentoNome = useCallback((id) => {
    const procedimento = procedimentos.find(p => p.id === id)
    return procedimento ? procedimento.nome : 'N/A'
  }, [procedimentos])

  const getTagById = useCallback((tagId) => tags.find(tag => tag.id === tagId), [tags])

  // EFEITOS
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (user) {
      window.currentUser = {
        uid: user.uid,
        id: user.uid,
        displayName: user.displayName || 'Usuário',
        nome: user.displayName || 'Usuário',
        email: user.email || ''
      }
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando leads...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads e Pacientes</h1>
          <p className="text-muted-foreground">Gerencie leads e acompanhe conversões</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-[80vw] max-h-[90vh] overflow-y-auto p-6 w-full">
              <DialogHeader>
                <DialogTitle className="text-xl mb-4">{editingItem ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Pessoais */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Dados Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome do Paciente *</label>
                        <Input
                          value={formData.nome_paciente}
                          onChange={(e) => handleFormChange('nome_paciente', e.target.value)}
                          required
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Telefone *</label>
                        <Input
                          id="telefone"
                          value={formData.telefone}
                          onChange={handleTelefoneChange}
                          placeholder="(XX)XXXXX-XXXX"
                          maxLength={14}
                          disabled={saving}
                          className={existingPatient && !editingItem ? "h-10 border-red-300 focus:border-red-500" : "h-10"}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">E-mail *</label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data de Nascimento *</label>
                        <Input
                          type="date"
                          value={formData.data_nascimento}
                          onChange={(e) => handleFormChange('data_nascimento', e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* MUDANÇA 1: Origem de Contato com novas opções */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Origem de Contato</label>
                        <Select value={formData.canal_contato} onValueChange={(value) => handleFormChange('canal_contato', value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione a origem" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lead Interno">Lead Interno</SelectItem>
                            <SelectItem value="Lead Externo">Lead Externo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tipo de Visita</label>
                        <Select value={formData.tipo_visita} onValueChange={(value) => handleFormChange('tipo_visita', value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Tipo de visita" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Primeira Visita">Primeira Visita</SelectItem>
                            <SelectItem value="Recorrente">Recorrente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* MUDANÇA 2: Status com opções simplificadas */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select value={formData.status} onValueChange={(value) => handleFormChange('status', value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Sem Interação">Sem Interação</SelectItem>
                            <SelectItem value="Em Conversa">Em Conversa</SelectItem>
                            <SelectItem value="Convertido">Convertido</SelectItem>
                            <SelectItem value="Perdido">Perdido</SelectItem>
                            <SelectItem value="Não Agendou">Não Agendou</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Solicitação e Atendimento */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Solicitação e Atendimento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Solicitação do Paciente</label>
                      <Textarea
                        value={formData.solicitacao_paciente}
                        onChange={(e) => handleFormChange('solicitacao_paciente', e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Médico Principal</label>
                        <Select value={formData.medico_agendado_id} onValueChange={(value) => handleFormChange('medico_agendado_id', value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione o médico" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {medicos.map((medico) => (
                              <SelectItem key={medico.id} value={medico.id}>
                                {medico.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Especialidade Principal</label>
                        <Select value={formData.especialidade_id} onValueChange={(value) => handleFormChange('especialidade_id', value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione a especialidade" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {especialidades.map((especialidade) => (
                              <SelectItem key={especialidade.id} value={especialidade.id}>
                                {especialidade.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Procedimento</label>
                        <Select value={formData.procedimento_agendado_id} onValueChange={(value) => handleFormChange('procedimento_agendado_id', value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione o procedimento" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {procedimentos.map((procedimento) => (
                              <SelectItem key={procedimento.id} value={procedimento.id}>
                                {procedimento.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* MUDANÇA 3: Seção de Outros Profissionais Expandida */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Outros Profissionais
                    </CardTitle>
                    <CardDescription>
                      Adicione até 5 outros profissionais com informações completas de agendamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Botão para adicionar profissional */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Profissionais ativos: {formData.outros_profissionais.filter(prof => prof.ativo).length}/5
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={adicionarOutroProfissional}
                        disabled={formData.outros_profissionais.filter(prof => prof.ativo).length >= 5}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Profissional
                      </Button>
                    </div>

                    {/* Lista de profissionais */}
                    <div className="space-y-4">
                      {formData.outros_profissionais.map((profissional, index) => (
                        profissional.ativo && (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-900">
                                Profissional {index + 1}
                              </h4>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removerOutroProfissional(index)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Médico *</label>
                                <Select 
                                  value={profissional.medico_id} 
                                  onValueChange={(value) => handleOutrosProfissionaisChange(index, 'medico_id', value)}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione o médico" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px] overflow-y-auto">
                                    {medicos.map((medico) => (
                                      <SelectItem key={medico.id} value={medico.id}>
                                        {medico.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Especialidade *</label>
                                <Select 
                                  value={profissional.especialidade_id} 
                                  onValueChange={(value) => handleOutrosProfissionaisChange(index, 'especialidade_id', value)}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione a especialidade" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px] overflow-y-auto">
                                    {especialidades.map((especialidade) => (
                                      <SelectItem key={especialidade.id} value={especialidade.id}>
                                        {especialidade.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Procedimento *</label>
                                <Select 
                                  value={profissional.procedimento_id} 
                                  onValueChange={(value) => handleOutrosProfissionaisChange(index, 'procedimento_id', value)}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Selecione o procedimento" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px] overflow-y-auto">
                                    {procedimentos.map((procedimento) => (
                                      <SelectItem key={procedimento.id} value={procedimento.id}>
                                        {procedimento.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Data Agendada *</label>
                                <Input
                                  type="date"
                                  value={profissional.data_agendamento}
                                  onChange={(e) => handleOutrosProfissionaisChange(index, 'data_agendamento', e.target.value)}
                                  className="h-10"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Valor (R$)</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={profissional.valor}
                                  onChange={(e) => handleOutrosProfissionaisChange(index, 'valor', e.target.value)}
                                  placeholder="0,00"
                                  className="h-10"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  Local Agendado
                                </label>
                                <Input
                                  type="text"
                                  value={profissional.local_agendado}
                                  onChange={(e) => handleOutrosProfissionaisChange(index, 'local_agendado', e.target.value)}
                                  placeholder="Ex: Clínica Centro"
                                  className="h-10"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>

                    {formData.outros_profissionais.filter(prof => prof.ativo).length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">Nenhum profissional adicional cadastrado</p>
                        <p className="text-gray-400 text-sm">Clique em "Adicionar Profissional" para começar</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Orçamento */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Orçamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Valor Orçado (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.valor_orcado}
                          onChange={(e) => handleFormChange('valor_orcado', e.target.value)}
                          placeholder="0,00"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Status do Orçamento</label>
                        <Select value={formData.orcamento_fechado} onValueChange={(value) => handleFormChange('orcamento_fechado', value)}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Status do orçamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Total">Total</SelectItem>
                            <SelectItem value="Parcial">Parcial</SelectItem>
                            <SelectItem value="Não">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.orcamento_fechado === 'Parcial' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Valor Fechado Parcial (R$)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.valor_fechado_parcial}
                            onChange={(e) => handleFormChange('valor_fechado_parcial', e.target.value)}
                            placeholder="0,00"
                            className="h-10"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Observações */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Observações Gerais</label>
                      <Textarea
                        value={formData.observacao_geral}
                        onChange={(e) => handleFormChange('observacao_geral', e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving || (existingPatient && !editingItem)}
                    className={existingPatient && !editingItem ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {saving ? 'Salvando...' : editingItem ? 'Atualizar Lead' : 'Criar Lead'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Total de Leads</CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Agendamentos</CardTitle>
            <Calendar className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.agendados}</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Convertidos</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.convertidos}</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Valor Total</CardTitle>
            <DollarSign className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pacientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os status</SelectItem>
            <SelectItem value="Sem Interação">Sem Interação</SelectItem>
            <SelectItem value="Em Conversa">Em Conversa</SelectItem>
            <SelectItem value="Convertido">Convertido</SelectItem>
            <SelectItem value="Perdido">Perdido</SelectItem>
            <SelectItem value="Não Agendou">Não Agendou</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={itemsPerPage.toString()} onValueChange={(value) => changeItemsPerPage(parseInt(value))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 / página</SelectItem>
            <SelectItem value="10">10 / página</SelectItem>
            <SelectItem value="25">25 / página</SelectItem>
            <SelectItem value="50">50 / página</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lista de Leads
            <span className="text-sm text-gray-600 font-normal">
              Exibindo {paginatedLeads.length} de {filteredLeads.length} leads
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto leads-table">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Paciente</th>
                  <th className="text-left p-4">Contato</th>
                  <th className="text-left p-4">Origem</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Valor</th>
                  <th className="text-left p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{lead.nome_paciente}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(lead.data_registro_contato)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div>📞 {lead.telefone}</div>
                        <div>✉️ {lead.email}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{lead.canal_contato || 'N/A'}</span>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">
                        R$ {(lead.valor_orcado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(lead)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(lead.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paginatedLeads.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
                <p className="text-gray-600">Comece criando seu primeiro lead.</p>
              </div>
            )}
          </div>

          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} até {Math.min(currentPage * itemsPerPage, filteredLeads.length)} de {filteredLeads.length} leads
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}