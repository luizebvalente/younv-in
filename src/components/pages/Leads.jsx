import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Users, Calendar, DollarSign, TrendingUp, Check, RefreshCw, X, Tag, Settings, AlertTriangle, User, Clock, CalendarDays, Download, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
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
import LembretesDashboard from '@/components/lembretes/LembretesDashboard'

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
  
  // FORMULÁRIO OTIMIZADO COM NOVOS CAMPOS PARA OUTROS PROFISSIONAIS
  const [formData, setFormData] = useState(() => ({
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
    // NOVOS CAMPOS PARA OUTROS PROFISSIONAIS (5 slots) - COM CAMPOS DE AGENDAMENTO
    outros_profissionais: [
      { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
      { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false }
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
  }))

  // Hook de autenticação
  const { user } = useAuth()

  // FUNÇÃO PARA GERENCIAR OUTROS PROFISSIONAIS
  const handleOutrosProfissionaisChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newOutrosProfissionais = [...prev.outros_profissionais]
      newOutrosProfissionais[index] = {
        ...newOutrosProfissionais[index],
        [field]: value
      }
      
      // Se estiver preenchendo médico ou especialidade, ativar o slot
      if ((field === 'medico_id' || field === 'especialidade_id') && value) {
        newOutrosProfissionais[index].ativo = true
      }
      
      // Se limpar médico E especialidade, desativar o slot
      if (field === 'medico_id' && !value && !newOutrosProfissionais[index].especialidade_id) {
        newOutrosProfissionais[index].ativo = false
      }
      if (field === 'especialidade_id' && !value && !newOutrosProfissionais[index].medico_id) {
        newOutrosProfissionais[index].ativo = false
      }
      
      return {
        ...prev,
        outros_profissionais: newOutrosProfissionais,
        // Atualizar o campo outros_profissionais_agendados baseado na existência de profissionais ativos
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
        data_agendamento: '', 
        ativo: false 
      }
      
      return {
        ...prev,
        outros_profissionais: newOutrosProfissionais,
        outros_profissionais_agendados: newOutrosProfissionais.some(prof => prof.ativo)
      }
    })
  }, [])

  // MEMOIZAÇÕES PARA PERFORMANCE - FILTROS APLICADOS SEM PAGINAÇÃO
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

    // Calcular total de páginas baseado nos leads filtrados
    const pages = Math.ceil(filtered.length / itemsPerPage)
    setTotalPages(pages || 1)
    
    // Se a página atual é maior que o total de páginas, voltar para a primeira
    if (currentPage > pages && pages > 0) {
      setCurrentPage(1)
    }
    
    return filtered
  }, [leads, filteredByDateLeads, showDateFilter, searchTerm, statusFilter, createdByFilter, selectedTagsFilter, itemsPerPage, currentPage])

  // LEADS PAGINADOS - APENAS OS VISÍVEIS NA PÁGINA ATUAL
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
        // NOVOS CAMPOS PARA OUTROS PROFISSIONAIS
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
        { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', procedimento_id: '', valor_agendamento: '', local_agendado: '', ativo: false }
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
      // CARREGAR OUTROS PROFISSIONAIS OU USAR ESTRUTURA PADRÃO
      outros_profissionais: item.outros_profissionais || [
        { medico_id: '', especialidade_id: '', data_agendamento: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', ativo: false },
        { medico_id: '', especialidade_id: '', data_agendamento: '', ativo: false }
      ],
      pagou_reserva: item.pagou_reserva || false,
      tipo_visita: item.tipo_visita || '',
      valor_orcado: item.valor_orcado ? item.valor_orcado.toString() : '',
      orcamento_fechado: item.orcamento_fechado || '',
      valor_fechado_parcial: item.valor_fechado_parcial ? item.valor_fechado_parcial.toString() : '',
      observacao_geral: item.observacao_geral || '',
      perfil_comportamental_disc: item.perfil_comportamental_disc || '',
      status: item.status || 'Lead',
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

  // FUNÇÕES DE MIGRAÇÃO
  const handleUserTrackingMigration = useCallback(async () => {
    try {
      setMigrating(true)
      setError(null)
      
      const result = await firebaseDataService.migrateLeadsForUserTracking()
      
      if (result.success) {
        await loadData()
        alert(`${result.message}\n\nEstatísticas:\n- Total: ${result.stats.total}\n- Migrados: ${result.stats.migrated}\n- Erros: ${result.stats.errors}`)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(`Erro durante a migração de rastreamento: ${err.message}`)
    } finally {
      setMigrating(false)
    }
  }, [loadData])

  const handleFieldMigration = useCallback(async () => {
    try {
      setMigrating(true)
      setError(null)
      
      const result = await firebaseDataService.migrateLeadsFields()
      
      if (result.success) {
        await loadData()
        alert(`${result.message}\n\nEstatísticas:\n- Total: ${result.stats.total}\n- Migrados: ${result.stats.migrated}\n- Erros: ${result.stats.errors}`)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(`Erro durante a migração: ${err.message}`)
    } finally {
      setMigrating(false)
    }
  }, [loadData])

  const handleTagMigration = useCallback(async () => {
    try {
      setMigrating(true)
      setError(null)
      
      const result = await firebaseDataService.migrateLeadsForTags()
      
      if (result.success) {
        await loadData()
        alert(`${result.message}\n\nEstatísticas:\n- Total: ${result.stats.total}\n- Migrados: ${result.stats.migrated}\n- Erros: ${result.stats.errors}`)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(`Erro durante a migração de tags: ${err.message}`)
    } finally {
      setMigrating(false)
    }
  }, [loadData])

  const handleCreateDefaultTags = useCallback(async () => {
    try {
      setMigrating(true)
      setError(null)
      
      const result = await firebaseDataService.createDefaultTags()
      
      if (result.success) {
        await loadData()
        alert(result.message)
      }
    } catch (err) {
      setError(`Erro ao criar tags padrão: ${err.message}`)
    } finally {
      setMigrating(false)
    }
  }, [loadData])



  // FUNÇÕES DE DATA
  const handleQuickDateFilter = useCallback((filter) => {
    const today = new Date()
    let startDate = new Date()
    let endDate = new Date()
    
    switch (filter) {
      case 'hoje':
        startDate = new Date(today.setHours(0, 0, 0, 0))
        endDate = new Date(today.setHours(23, 59, 59, 999))
        break
      case 'ontem':
        startDate = new Date()
        startDate.setDate(today.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        break
      case 'ultima_semana':
        startDate = new Date()
        startDate.setDate(today.getDate() - 7)
        endDate = new Date()
        break
      case 'ultimo_mes':
        startDate = new Date()
        startDate.setMonth(today.getMonth() - 1)
        endDate = new Date()
        break
      case 'ultimo_trimestre':
        startDate = new Date()
        startDate.setMonth(today.getMonth() - 3)
        endDate = new Date()
        break
      case 'ultimo_ano':
        startDate = new Date()
        startDate.setFullYear(today.getFullYear() - 1)
        endDate = new Date()
        break
      case 'esta_semana':
        const dayOfWeek = today.getDay()
        startDate = new Date(today)
        startDate.setDate(today.getDate() - dayOfWeek)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date()
        break
      case 'este_mes':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date()
        break
      case 'este_ano':
        startDate = new Date(today.getFullYear(), 0, 1)
        endDate = new Date()
        break
      default:
        return
    }
    
    setDateFilter({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      quickFilter: filter
    })
  }, [])

  const clearDateFilter = useCallback(() => {
    setDateFilter({
      startDate: '',
      endDate: '',
      quickFilter: ''
    })
    setFilteredByDateLeads(leads)
  }, [leads])

  const filterLeadsByDate = useCallback(() => {
    if (!dateFilter.startDate && !dateFilter.endDate) {
      setFilteredByDateLeads(leads)
      return
    }
    
    const start = dateFilter.startDate ? new Date(dateFilter.startDate) : null
    const end = dateFilter.endDate ? new Date(dateFilter.endDate) : null
    
    if (start) start.setHours(0, 0, 0, 0)
    if (end) end.setHours(23, 59, 59, 999)
    
    const filtered = leads.filter(lead => {
      const leadDate = new Date(lead.data_registro_contato)
      
      if (start && end) {
        return leadDate >= start && leadDate <= end
      } else if (start) {
        return leadDate >= start
      } else if (end) {
        return leadDate <= end
      }
      
      return true
    })
    
    setFilteredByDateLeads(filtered)
  }, [leads, dateFilter.startDate, dateFilter.endDate])

  const exportToCSV = useCallback(() => {
    const leadsToExport = showDateFilter ? filteredByDateLeads : filteredLeads
    
    const headers = [
      'Nome do Paciente',
      'Telefone',
      'Email',
      'Data Nascimento',
      'Canal Contato',
      'Médico Principal',
      'Especialidade Principal',
      'Outros Profissionais',
      'Valor Orçado',
      'Status',
      'Tipo Visita',
      'Data Registro',
      'Criado por',
      'Última Alteração'
    ]
    
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => {
        // Formatar outros profissionais para CSV
        const outrosProfissionais = lead.outros_profissionais?.filter(prof => prof.ativo).map(prof => {
          const medico = medicos.find(m => m.id === prof.medico_id)?.nome || 'N/A'
          const especialidade = especialidades.find(e => e.id === prof.especialidade_id)?.nome || 'N/A'
          const data = prof.data_agendamento ? formatDate(prof.data_agendamento) : 'Sem data'
          return `${medico} (${especialidade}) - ${data}`
        }).join('; ') || 'Nenhum'
        
        return [
          `"${lead.nome_paciente || ''}"`,
          `"${lead.telefone || ''}"`,
          `"${lead.email || ''}"`,
          `"${lead.data_nascimento || ''}"`,
          `"${lead.canal_contato || ''}"`,
          `"${getMedicoNome(lead.medico_agendado_id)}"`,
          `"${getEspecialidadeNome(lead.especialidade_id)}"`,
          `"${outrosProfissionais}"`,
          `"${lead.valor_orcado || 0}"`,
          `"${lead.status || ''}"`,
          `"${lead.tipo_visita || ''}"`,
          `"${formatDate(lead.data_registro_contato)}"`,
          `"${lead.criado_por_nome || ''}"`,
          `"${formatDate(lead.data_ultima_alteracao)}"`
        ].join(',')
      })
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [showDateFilter, filteredByDateLeads, filteredLeads, medicos, especialidades])

  // FUNÇÕES PARA TAGS
  const handleCreateTag = useCallback(async () => {
    if (!tagForm.nome.trim()) return;

    try {
      setSaving(true)
      setError(null)
      
      await firebaseDataService.createTag(tagForm)
      await loadData()
      resetTagForm()
      alert('✅ Tag criada com sucesso!')
    } catch (err) {
      setError('Erro ao criar tag: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [tagForm, loadData])

  const handleUpdateTag = useCallback(async () => {
    if (!tagForm.nome.trim()) return;

    try {
      setSaving(true)
      setError(null)
      
      await firebaseDataService.updateTag(editingTag.id, tagForm)
      await loadData()
      resetTagForm()
      alert('✅ Tag atualizada com sucesso!')
    } catch (err) {
      setError('Erro ao atualizar tag: ' + err.message)
    } finally {
      setSaving(false)
    }
  }, [tagForm, editingTag, loadData])

  const handleDeleteTag = useCallback(async (tagId) => {
    const tag = tags.find(t => t.id === tagId)
    const leadCount = leads.filter(lead => lead.tags?.includes(tagId)).length
    
    const confirmMessage = leadCount > 0 
      ? `Tem certeza que deseja excluir a tag "${tag.nome}"?\n\nEla será removida de ${leadCount} leads.`
      : `Tem certeza que deseja excluir a tag "${tag.nome}"?`
    
    if (confirm(confirmMessage)) {
      try {
        setSaving(true)
        setError(null)
        
        await firebaseDataService.deleteTag(tagId)
        await loadData()
        alert('✅ Tag excluída com sucesso!')
      } catch (err) {
        setError('Erro ao excluir tag: ' + err.message)
      } finally {
        setSaving(false)
      }
    }
  }, [tags, leads, loadData])

  const openEditTagDialog = useCallback((tag) => {
    setEditingTag(tag)
    setTagForm({
      nome: tag.nome,
      cor: tag.cor,
      categoria: tag.categoria
    })
    setIsTagDialogOpen(true)
  }, [])

  const resetTagForm = useCallback(() => {
    setTagForm({
      nome: '',
      cor: '#3b82f6',
      categoria: 'Procedimento'
    })
    setEditingTag(null)
    setIsTagDialogOpen(false)
  }, [])

  const toggleTagFilter = useCallback((tagId) => {
    if (selectedTagsFilter.includes(tagId)) {
      setSelectedTagsFilter(selectedTagsFilter.filter(id => id !== tagId))
    } else {
      setSelectedTagsFilter([...selectedTagsFilter, tagId])
    }
  }, [selectedTagsFilter])

  // FUNÇÕES AUXILIARES OTIMIZADAS
  const getStatusColor = useCallback((status) => {
    const colors = {
      'Lead': 'bg-blue-100 text-blue-800',
      'Convertido': 'bg-green-100 text-green-800',
      'Perdido': 'bg-red-100 text-red-800',
      'Agendado': 'bg-yellow-100 text-yellow-800',
      'Não Agendou': 'bg-gray-100 text-gray-800',
      'Confirmado': 'bg-purple-100 text-purple-800',
      'Faltou': 'bg-orange-100 text-orange-800',
      'Em Conversa': 'bg-amber-100 text-amber-800', 
      'Sem Interação': 'bg-emerald-100 text-emerald-800',
      'Follow 1': 'bg-slate-100 text-slate-800', 
      'Follow 2': 'bg-slate-100 text-slate-800', 
      'Follow 3': 'bg-slate-100 text-slate-800',
      'Follow 7': 'bg-slate-100 text-slate-800' 
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

  useEffect(() => {
    filterLeadsByDate()
  }, [filterLeadsByDate])

  // COMPONENTE PARA GERENCIAR TAGS
  const TagsManagementTab = useCallback(() => {
    const categorias = ['Procedimento', 'Especialidade', 'Prioridade', 'Tipo Cliente', 'Condição', 'Outros']

    return (
      <div className="space-y-6">
        {/* Header da aba Tags */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Gerenciar Tags</h2>
            <p className="text-muted-foreground">Organize e gerencie as tags do sistema</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleTagMigration} 
              disabled={migrating}
              variant="outline"
              className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
            >
              {migrating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  <Tag className="mr-2 h-4 w-4" />
                  Migrar Tags
                </>
              )}
            </Button>
            <Button 
              onClick={handleCreateDefaultTags} 
              disabled={migrating}
              variant="outline"
              className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
            >
              <Tag className="mr-2 h-4 w-4" />
              Tags Padrão
            </Button>
            <Button onClick={() => setIsTagDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Tag
            </Button>
          </div>
        </div>

        {/* Estatísticas das Tags */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tags</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tags.length}</div>
            </CardContent>
          </Card>

          {categorias.slice(0, 3).map(categoria => {
            const count = tags.filter(tag => tag.categoria === categoria).length
            return (
              <Card key={categoria}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{categoria}</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{count}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tags por Categoria */}
        {categorias.map(categoria => {
          const tagsCategoria = tags.filter(tag => tag.categoria === categoria)
          if (tagsCategoria.length === 0) return null

          return (
            <Card key={categoria}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {categoria} ({tagsCategoria.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tagsCategoria.map(tag => {
                    const leadCount = leads.filter(lead => lead.tags?.includes(tag.id)).length
                    
                    return (
                      <div key={tag.id} className="bg-gray-50 rounded-lg border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium"
                            style={{ backgroundColor: tag.cor }}
                          >
                            <Tag className="h-4 w-4" />
                            {tag.nome}
                          </span>
                          
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditTagDialog(tag)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTag(tag.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{leadCount}</span> leads usando esta tag
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {tags.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tag criada</h3>
              <p className="text-gray-600 mb-4">Comece criando sua primeira tag para organizar os leads</p>
              <Button onClick={() => setIsTagDialogOpen(true)}>
                Criar primeira tag
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }, [tags, leads, migrating, handleTagMigration, handleCreateDefaultTags, openEditTagDialog, handleDeleteTag])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando leads...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Navegação por Abas */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeTab === 'leads' ? 'Leads e Pacientes' : 
             activeTab === 'lembretes' ? 'Lembretes e Agendamentos' : 
             'Gerenciamento de Tags'}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === 'leads' 
              ? 'Gerencie leads e acompanhe conversões' 
              : activeTab === 'lembretes'
              ? 'Visualize e gerencie lembretes de consultas e procedimentos'
              : 'Organize e gerencie as tags do sistema'
            }
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeTab === 'leads' ? 'default' : 'outline'}
            onClick={() => setActiveTab('leads')}
          >
            <Users className="mr-2 h-4 w-4" />
            Leads ({leads.length})
          </Button>
          <Button
            variant={activeTab === 'lembretes' ? 'default' : 'outline'}
            onClick={() => setActiveTab('lembretes')}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Lembretes
          </Button>
          <Button
            variant={activeTab === 'tags' ? 'default' : 'outline'}
            onClick={() => setActiveTab('tags')}
          >
            <Tag className="mr-2 h-4 w-4" />
            Tags ({tags.length})
          </Button>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Header da aba Leads com botões */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Lista de Leads</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleUserTrackingMigration} 
                disabled={migrating}
                variant="outline"
                className="bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100"
              >
                {migrating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <User className="mr-2 h-4 w-4" />
                    Migrar Usuários
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleFieldMigration} 
                disabled={migrating}
                variant="outline"
                className="bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100"
              >
                {migrating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Migrar Campos
                  </>
                )}
              </Button>

              <Button
                onClick={exportToCSV}
                variant="outline"
                className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              
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
                  
                  {existingPatient && !editingItem && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Users className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Telefone já registrado!
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            Este número de telefone já pertence ao paciente: <strong>{existingPatient.nome_paciente}</strong>
                            <br />
                            Status atual: {existingPatient.status}
                            <br />
                            <span className="font-medium">Não é possível cadastrar o mesmo telefone novamente.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {existingPatient && editingItem && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Users className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Paciente Recorrente Detectado!
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            Este telefone já está cadastrado para: <strong>{existingPatient.nome_paciente}</strong>
                            <br />
                            Status anterior: {existingPatient.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informações de Rastreamento */}
                  {editingItem && (
                    <Card className="bg-blue-50 border-blue-200 mb-4">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Informações de Rastreamento
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-blue-700">
                              <strong>Criado por:</strong> {editingItem.criado_por_nome || 'Sistema'}
                            </p>
                            <p className="text-blue-600 text-xs">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDateTime(editingItem.data_registro_contato)}
                            </p>
                          </div>
                          <div>
                            <p className="text-blue-700">
                              <strong>Última alteração:</strong> {editingItem.alterado_por_nome || 'Sistema'}
                            </p>
                            <p className="text-blue-600 text-xs">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatDateTime(editingItem.data_ultima_alteracao)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

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
                            {existingPatient && !editingItem && (
                              <p className="text-sm text-red-600 mt-1">
                                ⚠️ Este telefone já está cadastrado para: {existingPatient.nome_paciente}
                              </p>
                            )}
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

                    {/* NOVA SEÇÃO: Outros Profissionais */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <UserPlus className="h-5 w-5" />
                          Outros Profissionais
                        </CardTitle>
                        <CardDescription>
                          Adicione até 5 outros profissionais que também atenderão este paciente
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
                                
                                {/* Primeira linha: Médico, Especialidade, Data */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Médico</label>
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
                                    <label className="text-sm font-medium">Especialidade</label>
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
                                    <label className="text-sm font-medium">Data Agendada</label>
                                    <Input
                                      type="datetime-local"
                                      value={profissional.data_agendamento}
                                      onChange={(e) => handleOutrosProfissionaisChange(index, 'data_agendamento', e.target.value)}
                                      className="h-10"
                                    />
                                  </div>
                                </div>

                                {/* Segunda linha: Procedimento, Valor, Local */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Procedimento</label>
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
                                    <label className="text-sm font-medium">Valor (R$)</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={profissional.valor_agendamento}
                                      onChange={(e) => handleOutrosProfissionaisChange(index, 'valor_agendamento', e.target.value)}
                                      placeholder="0,00"
                                      className="h-10"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Local Agendado</label>
                                    <Input
                                      value={profissional.local_agendado}
                                      onChange={(e) => handleOutrosProfissionaisChange(index, 'local_agendado', e.target.value)}
                                      placeholder="Ex: Consultório 1, Sala de Cirurgia"
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

                    {/* Tags */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Tags Selecionadas</label>
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-lg bg-gray-50">
                              {formData.tags.length > 0 ? (
                                formData.tags.map(tagId => {
                                  const tag = getTagById(tagId)
                                  return tag ? (
                                    <span
                                      key={tagId}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-xs font-medium"
                                      style={{ backgroundColor: tag.cor }}
                                    >
                                      <Tag className="h-3 w-3" />
                                      {tag.nome}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleFormChange('tags', formData.tags.filter(id => id !== tagId))
                                        }}
                                        className="hover:bg-white/20 rounded-full p-1"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ) : null
                                })
                              ) : (
                                <span className="text-gray-500 text-sm">Nenhuma tag selecionada</span>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium mb-2 block">Tags Disponíveis</label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                              {tags
                                .filter(tag => !formData.tags.includes(tag.id))
                                .map(tag => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => {
                                      handleFormChange('tags', [...formData.tags, tag.id])
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-gray-300 hover:border-gray-400 bg-white transition-colors"
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: tag.cor }}
                                    />
                                    {tag.nome}
                                    <span className="text-xs text-gray-500">({tag.categoria})</span>
                                  </button>
                                ))}
                            </div>
                            
                            {tags.length === 0 && (
                              <div className="text-center py-4 text-gray-500">
                                <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Nenhuma tag criada ainda.</p>
                                <p className="text-xs">Vá para a aba "Tags" para criar tags.</p>
                              </div>
                            )}
                          </div>
                        </div>
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

                    {/* Follow-ups */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold">Follow-ups</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[1, 2, 3].map((num) => (
                            <div key={num} className="space-y-3">
                              <label className="text-sm font-medium">Follow-up {num}</label>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={formData[`followup${num}_realizado`]}
                                  onCheckedChange={(checked) => 
                                    handleFormChange(`followup${num}_realizado`, checked)
                                  }
                                />
                                <label className="text-sm">Realizado</label>
                              </div>
                              {formData[`followup${num}_realizado`] && (
                                <Input
                                  type="date"
                                  value={formData[`followup${num}_data`]}
                                  onChange={(e) => handleFormChange(`followup${num}_data`, e.target.value)}
                                  className="h-10"
                                />
                              )}
                            </div>
                          ))}
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
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Total de Leads</CardTitle>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <p className="text-sm text-gray-600 mt-2 flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600 font-medium">Filtrados</span>
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Agendamentos</CardTitle>
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.agendados}</div>
                <p className="text-sm text-gray-600 mt-2 flex items-center">
                  <Calendar className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-green-600 font-medium">Confirmados</span>
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Convertidos</CardTitle>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.convertidos}</div>
                <p className="text-sm text-gray-600 mt-2 flex items-center">
                  <TrendingUp className="h-4 w-4 text-purple-600 mr-1" />
                  <span className="text-purple-600 font-medium">Fechados</span>
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Valor Total</CardTitle>
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-gray-600 mt-2 flex items-center">
                  <DollarSign className="h-4 w-4 text-orange-600 mr-1" />
                  <span className="text-orange-600 font-medium">Receita</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* SEÇÃO: Filtros de Data */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Filtros de Data
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={showDateFilter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowDateFilter(!showDateFilter)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {showDateFilter ? 'Ocultar' : 'Mostrar'} Filtros
                  </Button>
                  {(dateFilter.startDate || dateFilter.endDate) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearDateFilter}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {showDateFilter && (
              <CardContent className="space-y-4">
                {/* Filtros Rápidos */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Filtros Rápidos</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'hoje' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('hoje')}
                    >
                      Hoje
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'ontem' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('ontem')}
                    >
                      Ontem
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'esta_semana' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('esta_semana')}
                    >
                      Esta Semana
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'ultima_semana' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('ultima_semana')}
                    >
                      Última Semana
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'este_mes' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('este_mes')}
                    >
                      Este Mês
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'ultimo_mes' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('ultimo_mes')}
                    >
                      Último Mês
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'ultimo_trimestre' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('ultimo_trimestre')}
                    >
                      Último Trimestre
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'este_ano' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('este_ano')}
                    >
                      Este Ano
                    </Button>
                    <Button
                      size="sm"
                      variant={dateFilter.quickFilter === 'ultimo_ano' ? 'default' : 'outline'}
                      onClick={() => handleQuickDateFilter('ultimo_ano')}
                    >
                      Último Ano
                    </Button>
                  </div>
                </div>

                {/* Seleção Manual de Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Inicial</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({ 
                        ...prev, 
                        startDate: e.target.value,
                        quickFilter: '' 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Final</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({ 
                        ...prev, 
                        endDate: e.target.value,
                        quickFilter: '' 
                      }))}
                    />
                  </div>
                </div>

                {/* Indicador de Filtro Ativo */}
                {(dateFilter.startDate || dateFilter.endDate) && (
                  <div className="bg-white rounded-lg p-3 border border-blue-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Filtrando leads de {' '}
                          <strong>
                            {dateFilter.startDate ? formatDate(dateFilter.startDate) : 'início'}
                          </strong>
                          {' '} até {' '}
                          <strong>
                            {dateFilter.endDate ? formatDate(dateFilter.endDate) : 'hoje'}
                          </strong>
                        </p>
                        <p className="text-sm text-blue-600 font-medium mt-1">
                          {filteredByDateLeads.length} leads encontrados no período
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        Filtro Ativo
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pacientes, médicos..."
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
            
            <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Criado por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os usuários</SelectItem>
                {uniqueCreators.map((creator) => (
                  <SelectItem key={creator} value={creator}>
                    {creator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* NOVO: Seletor de itens por página */}
            <Select value={itemsPerPage.toString()} onValueChange={(value) => changeItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / página</SelectItem>
                <SelectItem value="10">10 / página</SelectItem>
                <SelectItem value="25">25 / página</SelectItem>
                <SelectItem value="50">50 / página</SelectItem>
                <SelectItem value="100">100 / página</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Indicadores visuais dos filtros ativos */}
          <div className="flex flex-wrap gap-2">
            {createdByFilter !== 'Todos' && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                <User className="h-4 w-4" />
                <span>Criado por: {createdByFilter}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-blue-200"
                  onClick={() => setCreatedByFilter('Todos')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {statusFilter !== 'Todos' && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                <Filter className="h-4 w-4" />
                <span>Status: {statusFilter}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-green-200"
                  onClick={() => setStatusFilter('Todos')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {selectedTagsFilter.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
                <Tag className="h-4 w-4" />
                <span>{selectedTagsFilter.length} tag(s) selecionada(s)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-purple-200"
                  onClick={() => setSelectedTagsFilter([])}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {(dateFilter.startDate || dateFilter.endDate) && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">
                <CalendarDays className="h-4 w-4" />
                <span>Período: {dateFilter.startDate || 'início'} até {dateFilter.endDate || 'hoje'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-orange-200"
                  onClick={clearDateFilter}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Filtro por Tags */}
          {tags.length > 0 && (
            <Card className="bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-800">Filtrar por Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border-2 transition-all ${
                        selectedTagsFilter.includes(tag.id)
                          ? 'text-white border-transparent'
                          : 'text-gray-700 bg-white border-gray-300 hover:border-gray-400'
                      }`}
                      style={{
                        backgroundColor: selectedTagsFilter.includes(tag.id) ? tag.cor : 'white',
                        borderColor: selectedTagsFilter.includes(tag.id) ? tag.cor : '#d1d5db'
                      }}
                    >
                      <Tag className="h-3 w-3" />
                      {tag.nome}
                    </button>
                  ))}
                </div>
                {selectedTagsFilter.length > 0 && (
                  <button
                    onClick={() => setSelectedTagsFilter([])}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Limpar filtros de tags
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Leads Table COM PAGINAÇÃO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Lista de Leads
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    Exibindo {paginatedLeads.length} de {filteredLeads.length} leads
                    {filteredLeads.length !== leads.length && (
                      <span> (filtrados de {leads.length} total)</span>
                    )}
                  </span>
                  
                  {/* Navegação de páginas no header */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
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
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto leads-table">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Paciente</th>
                      <th className="text-left p-4">Contato</th>
                      <th className="text-left p-4">Canal</th>
                      <th className="text-left p-4">Médico/Especialidade</th>
                      <th className="text-left p-4">Outros Profissionais</th>
                      <th className="text-left p-4">Valor</th>
                      <th className="text-left p-4">Tags</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Criado por</th>
                      <th className="text-left p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => {
                      const medico = medicos.find(m => m.id === lead.medico_agendado_id)
                      const especialidade = especialidades.find(e => e.id === lead.especialidade_id)
                      const outrosProfissionaisAtivos = lead.outros_profissionais?.filter(prof => prof.ativo) || []
                      
                      return (
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
                            <span className="text-sm">{lead.canal_contato}</span>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              <div className="font-medium">{medico?.nome || 'N/A'}</div>
                              <div className="text-gray-500">{especialidade?.nome || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm max-w-[200px]">
                              {outrosProfissionaisAtivos.length > 0 ? (
                                <div className="space-y-1">
                                  {outrosProfissionaisAtivos.slice(0, 2).map((prof, index) => {
                                    const profMedico = medicos.find(m => m.id === prof.medico_id)
                                    const profEspecialidade = especialidades.find(e => e.id === prof.especialidade_id)
                                    return (
                                      <div key={index} className="flex items-center gap-1">
                                        <UserPlus className="h-3 w-3 text-blue-500" />
                                        <span className="text-xs">
                                          {profMedico?.nome || 'N/A'} ({profEspecialidade?.nome || 'N/A'})
                                        </span>
                                      </div>
                                    )
                                  })}
                                  {outrosProfissionaisAtivos.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{outrosProfissionaisAtivos.length - 2} outros
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Nenhum</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">
                              R$ {(lead.valor_orcado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {lead.tags?.map(tagId => {
                                const tag = getTagById(tagId)
                                return tag ? (
                                  <span
                                    key={tagId}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-white text-xs font-medium"
                                    style={{ backgroundColor: tag.cor }}
                                    title={tag.nome}
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag.nome.length > 8 ? tag.nome.substring(0, 8) + '...' : tag.nome}
                                  </span>
                                ) : null
                              })}
                              {(!lead.tags || lead.tags.length === 0) && (
                                <span className="text-xs text-gray-400">Sem tags</span>
                              )}
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <Badge className={getStatusColor(lead.status)}>
                              {lead.status}
                            </Badge>
                          </td>

                          <td className="p-4">
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="font-medium">{lead.criado_por_nome || 'Sistema'}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatDateTime(lead.data_registro_contato)}
                              </div>
                              {lead.alterado_por_nome && lead.alterado_por_nome !== lead.criado_por_nome && (
                                <div className="text-xs text-gray-400 mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Alt. por {lead.alterado_por_nome}
                                  </span>
                                </div>
                              )}
                            </div>
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
                      )
                    })}
                  </tbody>
                </table>

                {paginatedLeads.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
                    <p className="text-gray-600">
                      {filteredLeads.length === 0 && leads.length > 0
                        ? 'Tente ajustar os filtros para encontrar leads.'
                        : 'Comece criando seu primeiro lead.'}
                    </p>
                  </div>
                )}
              </div>

              {/* CONTROLES DE PAGINAÇÃO */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} até {Math.min(currentPage * itemsPerPage, filteredLeads.length)} de {filteredLeads.length} leads
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                    >
                      Primeira
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>

                    {/* Números das páginas */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Última
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'lembretes' && (
        <LembretesDashboard />
      )}

      {activeTab === 'tags' && (
        <TagsManagementTab />
      )}

      {/* Dialog para Criar/Editar Tag */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Tag *</label>
              <Input
                value={tagForm.nome}
                onChange={(e) => setTagForm({...tagForm, nome: e.target.value})}
                placeholder="Ex: Flacidez, Botox, Urgente..."
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <Select 
                value={tagForm.categoria} 
                onValueChange={(value) => setTagForm({...tagForm, categoria: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Procedimento', 'Especialidade', 'Prioridade', 'Tipo Cliente', 'Condição', 'Outros'].map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
                  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
                  '#8b5cf6', '#a855f7', '#c026d3', '#ec4899', '#f43f5e'
                ].map(cor => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setTagForm({...tagForm, cor})}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      tagForm.cor === cor ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={tagForm.cor}
                onChange={(e) => setTagForm({...tagForm, cor: e.target.value})}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: tagForm.cor }}
              >
                <Tag className="h-4 w-4" />
                {tagForm.nome || 'Nome da Tag'}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={resetTagForm}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={editingTag ? handleUpdateTag : handleCreateTag}
              disabled={!tagForm.nome.trim() || saving}
            >
              {saving ? (editingTag ? 'Salvando...' : 'Criando...') : (editingTag ? 'Salvar' : 'Criar')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Erro</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="mt-2 text-red-600 hover:text-red-800 h-6 px-2"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
