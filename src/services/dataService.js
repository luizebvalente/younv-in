// Serviço para gerenciar dados no localStorage
class DataService {
  constructor() {
    this.initializeData()
  }

  initializeData() {
    // Inicializar dados padrão se não existirem
    if (!localStorage.getItem('younv_especialidades')) {
      const especialidades = [
        { id: '1', nome: 'Dermatologia', descricao: 'Cuidados com a pele', ativo: true },
        { id: '2', nome: 'Cardiologia', descricao: 'Cuidados cardíacos', ativo: true },
        { id: '3', nome: 'Ortopedia', descricao: 'Cuidados ortopédicos', ativo: true },
        { id: '4', nome: 'Ginecologia', descricao: 'Saúde da mulher', ativo: true },
        { id: '5', nome: 'Pediatria', descricao: 'Cuidados infantis', ativo: true }
      ]
      localStorage.setItem('younv_especialidades', JSON.stringify(especialidades))
    }

    if (!localStorage.getItem('younv_medicos')) {
      const medicos = [
        { 
          id: '1', 
          nome: 'Dr. Carlos Silva', 
          crm: '12345-SP', 
          email: 'carlos@clinica.com', 
          telefone: '(11) 99999-1111', 
          especialidade_id: '1',
          ativo: true,
          data_cadastro: new Date().toISOString()
        },
        { 
          id: '2', 
          nome: 'Dra. Maria Santos', 
          crm: '67890-SP', 
          email: 'maria@clinica.com', 
          telefone: '(11) 99999-2222', 
          especialidade_id: '2',
          ativo: true,
          data_cadastro: new Date().toISOString()
        },
        { 
          id: '3', 
          nome: 'Dr. João Oliveira', 
          crm: '11111-SP', 
          email: 'joao@clinica.com', 
          telefone: '(11) 99999-3333', 
          especialidade_id: '3',
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
        },
        { 
          id: '2', 
          nome: 'Ecocardiograma', 
          valor: 350, 
          duracao: 45, 
          categoria: 'Exame',
          especialidade_id: '2',
          ativo: true
        },
        { 
          id: '3', 
          nome: 'Raio-X Ortopédico', 
          valor: 150, 
          duracao: 15, 
          categoria: 'Exame',
          especialidade_id: '3',
          ativo: true
        }
      ]
      localStorage.setItem('younv_procedimentos', JSON.stringify(procedimentos))
    }

    if (!localStorage.getItem('younv_leads')) {
      const leads = [
        {
          id: '1',
          data_registro_contato: new Date().toISOString(),
          nome_paciente: 'Ana Silva',
          telefone: '(11) 98888-1111',
          data_nascimento: '1985-05-15',
          email: 'ana@email.com',
          canal_contato: 'Instagram',
          solicitacao_paciente: 'Consulta para tratamento de acne',
          medico_agendado_id: '1',
          especialidade_id: '1',
          procedimento_agendado_id: '1',
          agendado: true,
          motivo_nao_agendamento: '',
          outros_profissionais_agendados: false,
          quais_profissionais: '',
          pagou_reserva: true,
          tipo_visita: 'Primeira Visita',
          valor_orcado: 200,
          orcamento_fechado: 'Total',
          follow_up_2: 'Paciente confirmou consulta',
          data_follow_up_2: new Date().toISOString(),
          follow_up_3: '',
          data_follow_up_3: '',
          follow_up_4: '',
          data_follow_up_4: '',
          follow_up_5: '',
          data_follow_up_5: '',
          observacao_geral: 'Paciente muito interessada no tratamento',
          perfil_comportamental_disc: 'Dominante',
          status: 'Convertido'
        },
        {
          id: '2',
          data_registro_contato: new Date().toISOString(),
          nome_paciente: 'Pedro Santos',
          telefone: '(11) 98888-2222',
          data_nascimento: '1978-12-03',
          email: 'pedro@email.com',
          canal_contato: 'Google',
          solicitacao_paciente: 'Dor no peito, precisa de avaliação',
          medico_agendado_id: '2',
          especialidade_id: '2',
          procedimento_agendado_id: '2',
          agendado: false,
          motivo_nao_agendamento: 'Não conseguiu horário compatível',
          outros_profissionais_agendados: false,
          quais_profissionais: '',
          pagou_reserva: false,
          tipo_visita: 'Primeira Visita',
          valor_orcado: 350,
          orcamento_fechado: 'Não',
          follow_up_2: 'Tentativa de reagendamento',
          data_follow_up_2: new Date().toISOString(),
          follow_up_3: '',
          data_follow_up_3: '',
          follow_up_4: '',
          data_follow_up_4: '',
          follow_up_5: '',
          data_follow_up_5: '',
          observacao_geral: 'Paciente demonstrou interesse mas tem restrições de horário',
          perfil_comportamental_disc: 'Estável',
          status: 'Lead'
        }
      ]
      localStorage.setItem('younv_leads', JSON.stringify(leads))
    }
  }

  // Métodos genéricos para CRUD
  getAll(entity) {
    const data = localStorage.getItem(`younv_${entity}`)
    return data ? JSON.parse(data) : []
  }

  getById(entity, id) {
    const items = this.getAll(entity)
    return items.find(item => item.id === id)
  }

  create(entity, item) {
    const items = this.getAll(entity)
    const newItem = {
      ...item,
      id: Date.now().toString(),
      data_cadastro: new Date().toISOString()
    }
    items.push(newItem)
    localStorage.setItem(`younv_${entity}`, JSON.stringify(items))
    return newItem
  }

  update(entity, id, updatedItem) {
    const items = this.getAll(entity)
    const index = items.findIndex(item => item.id === id)
    if (index !== -1) {
      items[index] = { ...items[index], ...updatedItem }
      localStorage.setItem(`younv_${entity}`, JSON.stringify(items))
      return items[index]
    }
    return null
  }

  delete(entity, id) {
    const items = this.getAll(entity)
    const filteredItems = items.filter(item => item.id !== id)
    localStorage.setItem(`younv_${entity}`, JSON.stringify(filteredItems))
    return true
  }

  // Métodos específicos para relatórios
  getLeadsByPeriod(startDate, endDate) {
    const leads = this.getAll('leads')
    return leads.filter(lead => {
      const leadDate = new Date(lead.data_registro_contato)
      return leadDate >= new Date(startDate) && leadDate <= new Date(endDate)
    })
  }

  getConversionRate() {
    const leads = this.getAll('leads')
    const total = leads.length
    const converted = leads.filter(lead => lead.status === 'Convertido').length
    return total > 0 ? (converted / total * 100).toFixed(1) : 0
  }

  getLeadsByChannel() {
    const leads = this.getAll('leads')
    const channels = {}
    leads.forEach(lead => {
      channels[lead.canal_contato] = (channels[lead.canal_contato] || 0) + 1
    })
    return channels
  }

  getMedicoStats() {
    const leads = this.getAll('leads')
    const medicos = this.getAll('medicos')
    const stats = {}
    
    medicos.forEach(medico => {
      const medicoLeads = leads.filter(lead => lead.medico_agendado_id === medico.id)
      stats[medico.nome] = {
        total_leads: medicoLeads.length,
        agendados: medicoLeads.filter(lead => lead.agendado).length,
        convertidos: medicoLeads.filter(lead => lead.status === 'Convertido').length
      }
    })
    
    return stats
  }
}

export default new DataService()

