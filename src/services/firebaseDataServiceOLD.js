// Serviço de dados híbrido Firebase/localStorage - VERSÃO CORRIGIDA COM TAGS
import firestoreService from './firebase/firestore'

class FirebaseDataService {
  constructor() {
    this.useFirebase = true // Ativar Firebase
    this.initializeData()
  }

  // Mapeamento de nomes de coleções
  getCollectionName(entity) {
    const mapping = {
      'especialidades': 'especialidades',
      'medicos': 'medicos', 
      'procedimentos': 'procedimentos',
      'leads': 'leads',
      'tags': 'tags' // NOVO: Adicionado mapeamento para tags
    }
    return mapping[entity] || entity
  }

  // Transformar dados para formato Firebase (camelCase)
  transformToFirebase(entity, data) {
    if (entity === 'leads') {
      return {
        nomePackiente: data.nome_paciente,
        telefone: data.telefone,
        dataNascimento: data.data_nascimento,
        email: data.email,
        canalContato: data.canal_contato,
        solicitacaoPaciente: data.solicitacao_paciente,
        medicoAgendadoId: data.medico_agendado_id,
        especialidadeId: data.especialidade_id,
        procedimentoAgendadoId: data.procedimento_agendado_id,
        agendado: data.agendado,
        motivoNaoAgendamento: data.motivo_nao_agendamento,
        outrosProfissionaisAgendados: data.outros_profissionais_agendados,
        quaisProfissionais: data.quais_profissionais,
        pagouReserva: data.pagou_reserva,
        tipoVisita: data.tipo_visita,
        valorOrcado: data.valor_orcado,
        orcamentoFechado: data.orcamento_fechado,
        // NOVOS CAMPOS PARA MIGRAÇÃO
        valorFechadoParcial: data.valor_fechado_parcial || 0,
        followup1Realizado: data.followup1_realizado || false,
        followup1Data: data.followup1_data || '',
        followup2Realizado: data.followup2_realizado || false,
        followup2Data: data.followup2_data || '',
        followup3Realizado: data.followup3_realizado || false,
        followup3Data: data.followup3_data || '',
        observacaoGeral: data.observacao_geral,
        perfilComportamentalDisc: data.perfil_comportamental_disc,
        status: data.status,
        dataRegistroContato: data.data_registro_contato,
        // NOVO: Tags
        tags: data.tags || []
      }
    }
    // NOVO: Transformação para tags
    if (entity === 'tags') {
      return {
        nome: data.nome,
        cor: data.cor,
        categoria: data.categoria,
        dataCriacao: data.data_criacao || new Date().toISOString(),
        ativo: data.ativo !== undefined ? data.ativo : true
      }
    }
    return data
  }

  // Transformar dados do Firebase para formato frontend (snake_case)
  transformFromFirebase(entity, data) {
    if (entity === 'leads') {
      return {
        id: data.id,
        nome_paciente: data.nomePackiente || data.nome_paciente,
        telefone: data.telefone,
        data_nascimento: data.dataNascimento || data.data_nascimento,
        email: data.email,
        canal_contato: data.canalContato || data.canal_contato,
        solicitacao_paciente: data.solicitacaoPaciente || data.solicitacao_paciente,
        medico_agendado_id: data.medicoAgendadoId || data.medico_agendado_id,
        especialidade_id: data.especialidadeId || data.especialidade_id,
        procedimento_agendado_id: data.procedimentoAgendadoId || data.procedimento_agendado_id,
        agendado: data.agendado,
        motivo_nao_agendamento: data.motivoNaoAgendamento || data.motivo_nao_agendamento,
        outros_profissionais_agendados: data.outrosProfissionaisAgendados || data.outros_profissionais_agendados,
        quais_profissionais: data.quaisProfissionais || data.quais_profissionais,
        pagou_reserva: data.pagouReserva || data.pagou_reserva,
        tipo_visita: data.tipoVisita || data.tipo_visita,
        valor_orcado: data.valorOrcado || data.valor_orcado,
        orcamento_fechado: data.orcamentoFechado || data.orcamento_fechado,
        // NOVOS CAMPOS TRANSFORMADOS
        valor_fechado_parcial: data.valorFechadoParcial || data.valor_fechado_parcial || 0,
        followup1_realizado: data.followup1Realizado || data.followup1_realizado || false,
        followup1_data: data.followup1Data || data.followup1_data || '',
        followup2_realizado: data.followup2Realizado || data.followup2_realizado || false,
        followup2_data: data.followup2Data || data.followup2_data || '',
        followup3_realizado: data.followup3Realizado || data.followup3_realizado || false,
        followup3_data: data.followup3Data || data.followup3_data || '',
        observacao_geral: data.observacaoGeral || data.observacao_geral,
        perfil_comportamental_disc: data.perfilComportamentalDisc || data.perfil_comportamental_disc,
        status: data.status,
        data_registro_contato: data.dataRegistroContato || data.data_registro_contato,
        // NOVO: Tags
        tags: data.tags || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    }
    // NOVO: Transformação para tags
    if (entity === 'tags') {
      return {
        id: data.id,
        nome: data.nome,
        cor: data.cor,
        categoria: data.categoria,
        data_criacao: data.dataCriacao || data.data_criacao,
        ativo: data.ativo !== undefined ? data.ativo : true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    }
    return data
  }

  // ==========================================
  // NOVAS FUNÇÕES PARA TAGS
  // ==========================================

  // Migração para adicionar campo tags aos leads existentes
  async migrateLeadsForTags() {
    if (!this.useFirebase) {
      console.log('Migração só funciona com Firebase ativo')
      return { success: false, message: 'Firebase não está ativo' }
    }

    try {
      console.log('🔄 Iniciando migração de tags...')
      
      const rawLeads = await firestoreService.getAll('leads')
      console.log(`📊 Encontrados ${rawLeads.length} leads para análise`)
      
      let migrated = 0
      let total = rawLeads.length
      const errors = []

      for (const lead of rawLeads) {
        try {
          // Se o lead não tem o campo tags, adiciona array vazio
          if (!lead.hasOwnProperty('tags')) {
            const updatedLead = {
              ...lead,
              tags: []
            }
            
            await firestoreService.update('leads', lead.id, updatedLead)
            migrated++
            console.log(`✅ Lead ${lead.nomePackiente || lead.nome_paciente} migrado`)
          }
        } catch (leadError) {
          console.error(`❌ Erro ao migrar lead ${lead.id}:`, leadError)
          errors.push({
            leadId: lead.id,
            error: leadError.message
          })
        }
      }

      console.log(`🎉 Migração de tags concluída!`)
      console.log(`📈 Estatísticas: ${migrated} de ${total} leads migrados`)

      return {
        success: true,
        message: `Migração concluída! ${migrated} de ${total} leads atualizados.`,
        stats: { total, migrated, errors: errors.length }
      }
    } catch (error) {
      console.error('❌ Erro na migração de tags:', error)
      return {
        success: false,
        message: `Erro na migração: ${error.message}`,
        stats: { total: 0, migrated: 0, errors: 1 }
      }
    }
  }

  // Criar uma nova tag
  async createTag(tagData) {
    if (!this.useFirebase) {
      console.log('Tags só funcionam com Firebase ativo')
      throw new Error('Firebase não está ativo')
    }

    try {
      const firebaseData = this.transformToFirebase('tags', tagData)
      const result = await firestoreService.create('tags', firebaseData)
      
      console.log('✅ Tag criada:', result.id)
      return { success: true, id: result.id }
    } catch (error) {
      console.error('❌ Erro ao criar tag:', error)
      throw error
    }
  }

  // Atualizar uma tag existente
  async updateTag(id, tagData) {
    if (!this.useFirebase) {
      console.log('Tags só funcionam com Firebase ativo')
      throw new Error('Firebase não está ativo')
    }

    try {
      const firebaseData = this.transformToFirebase('tags', tagData)
      await firestoreService.update('tags', id, firebaseData)
      
      console.log('✅ Tag atualizada:', id)
      return { success: true }
    } catch (error) {
      console.error('❌ Erro ao atualizar tag:', error)
      throw error
    }
  }

  // Excluir uma tag (remove de todos os leads também)
  async deleteTag(id) {
    if (!this.useFirebase) {
      console.log('Tags só funcionam com Firebase ativo')
      throw new Error('Firebase não está ativo')
    }

    try {
      console.log('🗑️ Excluindo tag:', id)
      
      // Primeiro, buscar todos os leads que usam esta tag
      const rawLeads = await firestoreService.getAll('leads')
      let leadsUpdated = 0
      
      for (const lead of rawLeads) {
        if (lead.tags && lead.tags.includes(id)) {
          const updatedTags = lead.tags.filter(tagId => tagId !== id)
          await firestoreService.update('leads', lead.id, {
            ...lead,
            tags: updatedTags
          })
          leadsUpdated++
        }
      }
      
      // Depois, excluir a tag
      await firestoreService.delete('tags', id)
      
      console.log(`✅ Tag excluída. ${leadsUpdated} leads atualizados.`)
      return { success: true, leadsUpdated }
    } catch (error) {
      console.error('❌ Erro ao excluir tag:', error)
      throw error
    }
  }

  // Atualizar as tags de um lead específico
  async updateLeadTags(leadId, tags) {
    if (!this.useFirebase) {
      console.log('Tags só funcionam com Firebase ativo')
      throw new Error('Firebase não está ativo')
    }

    try {
      // Buscar o lead atual
      const currentLead = await firestoreService.getById('leads', leadId)
      if (!currentLead) {
        throw new Error('Lead não encontrado')
      }

      // Atualizar apenas o campo tags
      const updatedLead = {
        ...currentLead,
        tags: tags || []
      }

      await firestoreService.update('leads', leadId, updatedLead)
      
      console.log('✅ Tags do lead atualizadas:', leadId)
      return { success: true }
    } catch (error) {
      console.error('❌ Erro ao atualizar tags do lead:', error)
      throw error
    }
  }

  // Buscar leads por tags específicas
  async getLeadsByTags(tagIds) {
    if (!this.useFirebase) {
      console.log('Tags só funcionam com Firebase ativo')
      return []
    }

    try {
      const rawLeads = await firestoreService.getAll('leads')
      const filteredLeads = []
      
      for (const lead of rawLeads) {
        // Verifica se o lead tem pelo menos uma das tags procuradas
        if (lead.tags && tagIds.some(tagId => lead.tags.includes(tagId))) {
          const transformedLead = this.transformFromFirebase('leads', lead)
          filteredLeads.push(transformedLead)
        }
      }
      
      return filteredLeads
    } catch (error) {
      console.error('❌ Erro ao buscar leads por tags:', error)
      throw error
    }
  }

  // Criar tags padrão (executar uma vez)
  async createDefaultTags() {
    if (!this.useFirebase) {
      console.log('Tags só funcionam com Firebase ativo')
      throw new Error('Firebase não está ativo')
    }

    try {
      const defaultTags = [
        { nome: 'Flacidez', cor: '#ef4444', categoria: 'Procedimento' },
        { nome: 'Ginecologia', cor: '#ec4899', categoria: 'Especialidade' },
        { nome: 'Botox', cor: '#8b5cf6', categoria: 'Procedimento' },
        { nome: 'Preenchimento', cor: '#06b6d4', categoria: 'Procedimento' },
        { nome: 'Harmonização', cor: '#10b981', categoria: 'Procedimento' },
        { nome: 'Urgente', cor: '#f59e0b', categoria: 'Prioridade' },
        { nome: 'VIP', cor: '#10b981', categoria: 'Tipo Cliente' },
        { nome: 'Primeira Visita', cor: '#3b82f6', categoria: 'Tipo Cliente' },
        { nome: 'Recorrente', cor: '#6366f1', categoria: 'Tipo Cliente' },
        { nome: 'Follow-up', cor: '#f97316', categoria: 'Prioridade' }
      ]

      const createdTags = []
      let errors = []

      for (const tagData of defaultTags) {
        try {
          const result = await this.createTag(tagData)
          createdTags.push({ id: result.id, ...tagData })
        } catch (error) {
          console.error(`Erro ao criar tag ${tagData.nome}:`, error)
          errors.push({ tag: tagData.nome, error: error.message })
        }
      }

      console.log('✅ Tags padrão criadas:', createdTags.length)
      
      return {
        success: true,
        message: `${createdTags.length} tags padrão criadas com sucesso!`,
        tags: createdTags,
        errors
      }
    } catch (error) {
      console.error('❌ Erro ao criar tags padrão:', error)
      throw error
    }
  }

  // ==========================================
  // FUNÇÕES EXISTENTES (mantidas)
  // ==========================================

  // NOVA FUNÇÃO: Migração de campos ausentes nos leads
  async migrateLeadsFields() {
    if (!this.useFirebase) {
      console.log('Migração só funciona com Firebase ativo')
      return { success: false, message: 'Firebase não está ativo' }
    }

    try {
      console.log('🚀 Iniciando migração de campos dos leads...')
      
      // Buscar todos os leads diretamente do Firestore (sem transformação)
      const rawLeads = await firestoreService.getAll('leads')
      console.log(`📊 Encontrados ${rawLeads.length} leads para análise`)
      
      let migratedCount = 0
      const errors = []
      
      for (const lead of rawLeads) {
        try {
          console.log(`🔍 Analisando lead: ${lead.nomePackiente || lead.nome_paciente} (ID: ${lead.id})`)
          
          // Verificar se os novos campos existem
          const needsMigration = (
            lead.valorFechadoParcial === undefined ||
            lead.followup1Realizado === undefined ||
            lead.followup1Data === undefined ||
            lead.followup2Realizado === undefined ||
            lead.followup2Data === undefined ||
            lead.followup3Realizado === undefined ||
            lead.followup3Data === undefined ||
            lead.tags === undefined // NOVO: Verificar campo tags
          )
          
          if (needsMigration) {
            console.log(`⚡ Migrando lead: ${lead.nomePackiente || lead.nome_paciente}`)
            
            // Criar objeto com TODOS os campos (existentes + novos)
            const updatedLead = {
              // Campos existentes (preservar)
              nomePackiente: lead.nomePackiente || lead.nome_paciente || '',
              telefone: lead.telefone || '',
              dataNascimento: lead.dataNascimento || lead.data_nascimento || '',
              email: lead.email || '',
              canalContato: lead.canalContato || lead.canal_contato || '',
              solicitacaoPaciente: lead.solicitacaoPaciente || lead.solicitacao_paciente || '',
              medicoAgendadoId: lead.medicoAgendadoId || lead.medico_agendado_id || '',
              especialidadeId: lead.especialidadeId || lead.especialidade_id || '',
              procedimentoAgendadoId: lead.procedimentoAgendadoId || lead.procedimento_agendado_id || '',
              agendado: lead.agendado || false,
              motivoNaoAgendamento: lead.motivoNaoAgendamento || lead.motivo_nao_agendamento || '',
              outrosProfissionaisAgendados: lead.outrosProfissionaisAgendados || lead.outros_profissionais_agendados || false,
              quaisProfissionais: lead.quaisProfissionais || lead.quais_profissionais || '',
              pagouReserva: lead.pagouReserva || lead.pagou_reserva || false,
              tipoVisita: lead.tipoVisita || lead.tipo_visita || '',
              valorOrcado: lead.valorOrcado || lead.valor_orcado || 0,
              orcamentoFechado: lead.orcamentoFechado || lead.orcamento_fechado || '',
              observacaoGeral: lead.observacaoGeral || lead.observacao_geral || '',
              perfilComportamentalDisc: lead.perfilComportamentalDisc || lead.perfil_comportamental_disc || '',
              status: lead.status || 'Lead',
              dataRegistroContato: lead.dataRegistroContato || lead.data_registro_contato || new Date().toISOString(),
              
              // NOVOS CAMPOS - GARANTIR EXISTÊNCIA
              valorFechadoParcial: lead.valorFechadoParcial || lead.valor_fechado_parcial || 0,
              followup1Realizado: lead.followup1Realizado || lead.followup1_realizado || false,
              followup1Data: lead.followup1Data || lead.followup1_data || '',
              followup2Realizado: lead.followup2Realizado || lead.followup2_realizado || false,
              followup2Data: lead.followup2Data || lead.followup2_data || '',
              followup3Realizado: lead.followup3Realizado || lead.followup3_realizado || false,
              followup3Data: lead.followup3Data || lead.followup3_data || '',
              
              // NOVO: Campo tags
              tags: lead.tags || []
            }
            
            // Atualizar no Firestore
            await firestoreService.update('leads', lead.id, updatedLead)
            migratedCount++
            
            console.log(`✅ Lead ${lead.nomePackiente || lead.nome_paciente} migrado com sucesso`)
          } else {
            console.log(`⏭️ Lead ${lead.nomePackiente || lead.nome_paciente} já possui todos os campos`)
          }
          
        } catch (leadError) {
          console.error(`❌ Erro ao migrar lead ${lead.id}:`, leadError)
          errors.push({
            leadId: lead.id,
            leadName: lead.nomePackiente || lead.nome_paciente,
            error: leadError.message
          })
        }
      }
      
      console.log(`🎉 Migração concluída!`)
      console.log(`📈 Estatísticas:`)
      console.log(`   - Total de leads: ${rawLeads.length}`)
      console.log(`   - Leads migrados: ${migratedCount}`)
      console.log(`   - Erros: ${errors.length}`)
      
      if (errors.length > 0) {
        console.log(`⚠️ Erros encontrados:`, errors)
      }
      
      return {
        success: true,
        message: `Migração concluída! ${migratedCount} leads foram atualizados.`,
        stats: {
          total: rawLeads.length,
          migrated: migratedCount,
          errors: errors.length
        },
        errors
      }
      
    } catch (error) {
      console.error('❌ Erro durante a migração:', error)
      return {
        success: false,
        message: `Erro durante a migração: ${error.message}`,
        error
      }
    }
  }

  // Inicializar dados padrão
  async initializeData() {
    if (this.useFirebase) {
      await firestoreService.initializeDefaultData()
    } else {
      this.initializeLocalStorageData()
    }
  }

  initializeLocalStorageData() {
    // Dados padrão para localStorage (mantido para compatibilidade)
    if (!localStorage.getItem('younv_especialidades')) {
      const especialidades = [
        { id: '1', nome: 'Dermatologia', descricao: 'Cuidados com a pele', ativo: true },
        { id: '2', nome: 'Cardiologia', descricao: 'Cuidados cardíacos', ativo: true }
      ]
      localStorage.setItem('younv_especialidades', JSON.stringify(especialidades))
    }

    if (!localStorage.getItem('younv_medicos')) {
      const medicos = [
        { 
          id: '1', 
          nome: 'Dr. João Silva', 
          crm: '12345-SP', 
          telefone: '(11) 99999-9999',
          email: 'joao@clinica.com',
          especialidade_id: '1',
          ativo: true,
          data_cadastro: new Date().toISOString()
        }
      ]
      localStorage.setItem('younv_medicos', JSON.stringify(medicos))
    }

    if (!localStorage.getItem('younv_procedimentos')) {
      const procedimentos = [
        { 
          id: '1', 
          nome: 'Consulta Dermatológica', 
          valor: 200, 
          duracao: 30, 
          categoria: 'Consulta',
          especialidade_id: '1',
          ativo: true
        }
      ]
      localStorage.setItem('younv_procedimentos', JSON.stringify(procedimentos))
    }

    if (!localStorage.getItem('younv_leads')) {
      localStorage.setItem('younv_leads', JSON.stringify([]))
    }
  }

  // Métodos genéricos para CRUD
  async getAll(entity) {
    if (this.useFirebase) {
      try {
        const data = await firestoreService.getAll(this.getCollectionName(entity))
        console.log(`Dados brutos do Firebase para ${entity}:`, data) // Debug
        
        // Transformar dados do Firebase para formato frontend
        const transformedData = data.map(item => this.transformFromFirebase(entity, item))
        console.log(`Dados transformados para ${entity}:`, transformedData) // Debug
        
        return transformedData
      } catch (error) {
        console.error('Erro ao buscar dados do Firebase, usando localStorage como fallback')
        return this.getFromLocalStorage(entity)
      }
    } else {
      return this.getFromLocalStorage(entity)
    }
  }

  async getById(entity, id) {
    if (this.useFirebase) {
      try {
        const data = await firestoreService.getById(this.getCollectionName(entity), id)
        return data ? this.transformFromFirebase(entity, data) : null
      } catch (error) {
        console.error('Erro ao buscar dados do Firebase, usando localStorage como fallback')
        const items = this.getFromLocalStorage(entity)
        return items.find(item => item.id === id)
      }
    } else {
      const items = this.getFromLocalStorage(entity)
      return items.find(item => item.id === id)
    }
  }

  async create(entity, item) {
    if (this.useFirebase) {
      try {
        // Transformar dados para o formato Firebase
        const firebaseData = this.transformToFirebase(entity, item)
        console.log(`Criando no Firebase - ${entity}:`, firebaseData) // Debug
        
        const result = await firestoreService.create(this.getCollectionName(entity), firebaseData)
        console.log(`Resultado da criação no Firebase:`, result) // Debug
        
        return this.transformFromFirebase(entity, result)
      } catch (error) {
        console.error('Erro ao criar no Firebase, usando localStorage como fallback')
        return this.createInLocalStorage(entity, item)
      }
    } else {
      return this.createInLocalStorage(entity, item)
    }
  }

  async update(entity, id, updatedItem) {
    if (this.useFirebase) {
      try {
        // Transformar dados para o formato Firebase
        const firebaseData = this.transformToFirebase(entity, updatedItem)
        const result = await firestoreService.update(this.getCollectionName(entity), id, firebaseData)
        return this.transformFromFirebase(entity, result)
      } catch (error) {
        console.error('Erro ao atualizar no Firebase, usando localStorage como fallback')
        return this.updateInLocalStorage(entity, id, updatedItem)
      }
    } else {
      return this.updateInLocalStorage(entity, id, updatedItem)
    }
  }

  async delete(entity, id) {
    if (this.useFirebase) {
      try {
        return await firestoreService.delete(this.getCollectionName(entity), id)
      } catch (error) {
        console.error('Erro ao deletar no Firebase, usando localStorage como fallback')
        return this.deleteFromLocalStorage(entity, id)
      }
    } else {
      return this.deleteFromLocalStorage(entity, id)
    }
  }

  // Métodos localStorage (fallback)
  getFromLocalStorage(entity) {
    const key = `younv_${entity}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  }

  createInLocalStorage(entity, item) {
    const items = this.getFromLocalStorage(entity)
    const newItem = {
      ...item,
      id: Date.now().toString(),
      data_registro_contato: item.data_registro_contato || new Date().toISOString()
    }
    items.push(newItem)
    localStorage.setItem(`younv_${entity}`, JSON.stringify(items))
    return newItem
  }

  updateInLocalStorage(entity, id, updatedItem) {
    const items = this.getFromLocalStorage(entity)
    const index = items.findIndex(item => item.id === id)
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedItem }
      localStorage.setItem(`younv_${entity}`, JSON.stringify(items))
      return items[index]
    }
    return null
  }

  deleteFromLocalStorage(entity, id) {
    const items = this.getFromLocalStorage(entity)
    const filteredItems = items.filter(item => item.id !== id)
    localStorage.setItem(`younv_${entity}`, JSON.stringify(filteredItems))
    return true
  }

  // Métodos específicos para relatórios
  async getLeadsByPeriod(startDate, endDate) {
    if (this.useFirebase) {
      try {
        const data = await firestoreService.getLeadsByPeriod(startDate, endDate)
        return data.map(item => this.transformFromFirebase('leads', item))
      } catch (error) {
        console.error('Erro ao buscar leads por período no Firebase')
        const leads = this.getFromLocalStorage('leads')
        return leads.filter(lead => {
          const leadDate = new Date(lead.data_registro_contato)
          return leadDate >= new Date(startDate) && leadDate <= new Date(endDate)
        })
      }
    } else {
      const leads = this.getFromLocalStorage('leads')
      return leads.filter(lead => {
        const leadDate = new Date(lead.data_registro_contato)
        return leadDate >= new Date(startDate) && leadDate <= new Date(endDate)
      })
    }
  }
  // NOVA MUDANÇA LVALENTE - 14 JUL


  async getConversionRate() {
    if (this.useFirebase) {
      try {
        return await firestoreService.getConversionRate()
      } catch (error) {
        console.error('Erro ao calcular taxa de conversão no Firebase')
        const leads = this.getFromLocalStorage('leads')
        const total = leads.length
        const converted = leads.filter(lead => lead.status === 'Convertido').length
        return total > 0 ? (converted / total * 100).toFixed(1) : 0
      }
    } else {
      const leads = this.getFromLocalStorage('leads')
      const total = leads.length
      const converted = leads.filter(lead => lead.status === 'Convertido').length
      return total > 0 ? (converted / total * 100).toFixed(1) : 0
    }
  }
}

export default new FirebaseDataService()
