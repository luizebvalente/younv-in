// Serviços do Firestore - VERSÃO CORRIGIDA
import { 
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './config'

class FirestoreService {
  // Métodos genéricos para CRUD

  // CORREÇÃO: Obter todos os documentos de uma coleção com ordenação adequada
  async getAll(collectionName, orderByField = 'createdAt', orderDirection = 'desc') {
    try {
      // CORREÇÃO: Para leads, usar 'dataRegistroContato' como campo de ordenação principal
      if (collectionName === 'leads') {
        orderByField = 'dataRegistroContato'
      }

      console.log(`🔍 Buscando ${collectionName} ordenados por ${orderByField} ${orderDirection}`)
      
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, orderDirection)
      )
      const querySnapshot = await getDocs(q)
      
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Converter timestamps para strings ISO
        ...this.convertTimestamps(doc.data())
      }))

      console.log(`✅ Encontrados ${results.length} documentos em ${collectionName}`)
      return results
    } catch (error) {
      console.error(`❌ Erro ao buscar ${collectionName}:`, error)
      
      // CORREÇÃO: Se der erro na ordenação, tentar buscar sem ordenação
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        console.log(`⚠️ Tentando buscar ${collectionName} sem ordenação...`)
        try {
          const querySnapshot = await getDocs(collection(db, collectionName))
          const results = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            ...this.convertTimestamps(doc.data())
          }))
          
          // Ordenar manualmente no cliente
          if (collectionName === 'leads') {
            results.sort((a, b) => {
              const dateA = new Date(a.dataRegistroContato || a.createdAt || 0)
              const dateB = new Date(b.dataRegistroContato || b.createdAt || 0)
              return dateB - dateA // Mais recente primeiro
            })
          }
          
          console.log(`✅ Busca sem ordenação bem-sucedida: ${results.length} documentos`)
          return results
        } catch (fallbackError) {
          console.error(`❌ Erro mesmo sem ordenação:`, fallbackError)
          throw fallbackError
        }
      }
      throw error
    }
  }

  // Obter documento por ID
  async getById(collectionName, id) {
    try {
      console.log(`🔍 Buscando documento ${id} em ${collectionName}`)
      
      const docRef = doc(db, collectionName, id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const result = {
          id: docSnap.id,
          ...docSnap.data(),
          ...this.convertTimestamps(docSnap.data())
        }
        console.log(`✅ Documento ${id} encontrado`)
        return result
      } else {
        console.log(`⚠️ Documento ${id} não encontrado em ${collectionName}`)
        return null
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar documento ${id} em ${collectionName}:`, error)
      throw error
    }
  }

  // CORREÇÃO: Criar novo documento com timestamps adequados
  async create(collectionName, data) {
    try {
      console.log(`🆕 Criando documento em ${collectionName}:`, data)
      
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      
      // CORREÇÃO: Para leads, garantir que dataRegistroContato seja definido
      if (collectionName === 'leads' && !data.dataRegistroContato) {
        docData.dataRegistroContato = new Date().toISOString()
      }
      
      const docRef = await addDoc(collection(db, collectionName), docData)
      console.log(`✅ Documento criado com ID: ${docRef.id}`)
      
      // Retornar o documento criado
      const createdDoc = await this.getById(collectionName, docRef.id)
      return createdDoc
    } catch (error) {
      console.error(`❌ Erro ao criar documento em ${collectionName}:`, error)
      throw error
    }
  }

  // CORREÇÃO: Atualizar documento preservando dados importantes
// CORREÇÃO CRÍTICA: Atualizar documento de forma mais robusta
async update(collectionName, id, data) {
  try {
    console.log(`📝 FIRESTORE: Atualizando documento ${id} em ${collectionName}`)
    console.log('📋 FIRESTORE: Dados recebidos:', data)
    
    const docRef = doc(db, collectionName, id)
    
    // VERIFICAR se o documento existe antes de atualizar
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      throw new Error(`Documento ${id} não existe em ${collectionName}`)
    }
    
    console.log('📋 FIRESTORE: Documento atual:', docSnap.data())
    
    // PREPARAR dados para atualização
    const updateData = {
      ...data, // Usar EXATAMENTE os dados recebidos
      updatedAt: serverTimestamp()
    }
    
    // REMOVER campos undefined para evitar erros
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })
    
    console.log('💾 FIRESTORE: Dados finais para updateDoc:', updateData)
    
    // EXECUTAR a atualização
    await updateDoc(docRef, updateData)
    console.log(`✅ FIRESTORE: updateDoc executado com sucesso para ${id}`)
    
    // BUSCAR documento atualizado para retornar
    const updatedDocSnap = await getDoc(docRef)
    if (updatedDocSnap.exists()) {
      const result = {
        id: updatedDocSnap.id,
        ...updatedDocSnap.data(),
        ...this.convertTimestamps(updatedDocSnap.data())
      }
      console.log(`✅ FIRESTORE: Documento ${id} atualizado e retornado:`, result)
      return result
    } else {
      console.error(`❌ FIRESTORE: Documento ${id} não encontrado após atualização`)
      throw new Error(`Documento ${id} não encontrado após atualização`)
    }
    
  } catch (error) {
    console.error(`❌ FIRESTORE: Erro crítico ao atualizar documento ${id} em ${collectionName}:`, {
      error: error.message,
      code: error.code,
      stack: error.stack,
      data: data
    })
    
    // Se for erro de permissão ou rede, tentar novamente uma vez
    if (error.code === 'permission-denied' || error.code === 'unavailable') {
      console.log('🔄 FIRESTORE: Tentando novamente devido a erro temporário...')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Aguardar 1 segundo
      
      try {
        const docRef = doc(db, collectionName, id)
        await updateDoc(docRef, updateData)
        
        const retryDocSnap = await getDoc(docRef)
        if (retryDocSnap.exists()) {
          const result = {
            id: retryDocSnap.id,
            ...retryDocSnap.data(),
            ...this.convertTimestamps(retryDocSnap.data())
          }
          console.log(`✅ FIRESTORE: Documento ${id} atualizado na segunda tentativa`)
          return result
        }
      } catch (retryError) {
        console.error(`❌ FIRESTORE: Falha também na segunda tentativa:`, retryError)
      }
    }
    
    throw error
  }
}
  // Deletar documento
  async delete(collectionName, id) {
    try {
      console.log(`🗑️ Deletando documento ${id} em ${collectionName}`)
      
      const docRef = doc(db, collectionName, id)
      await deleteDoc(docRef)
      
      console.log(`✅ Documento ${id} deletado com sucesso`)
      return true
    } catch (error) {
      console.error(`❌ Erro ao deletar documento ${id} em ${collectionName}:`, error)
      throw error
    }
  }

  // Buscar com filtros
  async getWhere(collectionName, field, operator, value) {
    try {
      console.log(`🔍 Buscando ${collectionName} onde ${field} ${operator} ${value}`)
      
      const q = query(
        collection(db, collectionName),
        where(field, operator, value),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        ...this.convertTimestamps(doc.data())
      }))

      console.log(`✅ Encontrados ${results.length} documentos com filtro`)
      return results
    } catch (error) {
      console.error(`❌ Erro ao buscar ${collectionName} com filtro:`, error)
      throw error
    }
  }

  // Observar mudanças em tempo real
  onSnapshot(collectionName, callback, orderByField = 'createdAt') {
    try {
      // CORREÇÃO: Para leads, usar dataRegistroContato
      if (collectionName === 'leads') {
        orderByField = 'dataRegistroContato'
      }

      console.log(`👁️ Configurando listener para ${collectionName}`)
      
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, 'desc')
      )
      
      return onSnapshot(q, (querySnapshot) => {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          ...this.convertTimestamps(doc.data())
        }))
        console.log(`🔔 Listener ${collectionName}: ${docs.length} documentos`)
        callback(docs)
      }, (error) => {
        console.error(`❌ Erro no listener ${collectionName}:`, error)
      })
    } catch (error) {
      console.error(`❌ Erro ao configurar listener para ${collectionName}:`, error)
      throw error
    }
  }

  // Métodos específicos para relatórios

  // Buscar leads por período
  async getLeadsByPeriod(startDate, endDate) {
    try {
      console.log(`📅 Buscando leads entre ${startDate} e ${endDate}`)
      
      const start = Timestamp.fromDate(new Date(startDate))
      const end = Timestamp.fromDate(new Date(endDate))
      
      const q = query(
        collection(db, 'leads'),
        where('dataRegistroContato', '>=', start),
        where('dataRegistroContato', '<=', end),
        orderBy('dataRegistroContato', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const results = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        ...this.convertTimestamps(doc.data())
      }))

      console.log(`✅ Encontrados ${results.length} leads no período`)
      return results
    } catch (error) {
      console.error('❌ Erro ao buscar leads por período:', error)
      throw error
    }
  }

  // Calcular taxa de conversão
  async getConversionRate() {
    try {
      console.log('📊 Calculando taxa de conversão')
      
      const leads = await this.getAll('leads')
      const total = leads.length
      const converted = leads.filter(lead => lead.status === 'Convertido').length
      const rate = total > 0 ? (converted / total * 100).toFixed(1) : 0
      
      console.log(`✅ Taxa de conversão: ${rate}% (${converted}/${total})`)
      return rate
    } catch (error) {
      console.error('❌ Erro ao calcular taxa de conversão:', error)
      throw error
    }
  }

  // Obter leads por canal
  async getLeadsByChannel() {
    try {
      console.log('📊 Analisando leads por canal')
      
      const leads = await this.getAll('leads')
      const channels = {}
      leads.forEach(lead => {
        const canal = lead.canalContato || 'Não informado'
        channels[canal] = (channels[canal] || 0) + 1
      })
      
      console.log('✅ Análise por canal concluída:', channels)
      return channels
    } catch (error) {
      console.error('❌ Erro ao buscar leads por canal:', error)
      throw error
    }
  }

  // Obter estatísticas por médico
  async getMedicoStats() {
    try {
      console.log('📊 Calculando estatísticas por médico')
      
      const [leads, medicos] = await Promise.all([
        this.getAll('leads'),
        this.getAll('medicos')
      ])
      
      const stats = {}
      medicos.forEach(medico => {
        const medicoLeads = leads.filter(lead => lead.medicoAgendadoId === medico.id)
        stats[medico.nome] = {
          total_leads: medicoLeads.length,
          agendados: medicoLeads.filter(lead => lead.agendado).length,
          convertidos: medicoLeads.filter(lead => lead.status === 'Convertido').length
        }
      })
      
      console.log('✅ Estatísticas por médico calculadas')
      return stats
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas por médico:', error)
      throw error
    }
  }

  // CORREÇÃO: Utilitário para converter timestamps melhorado
  convertTimestamps(data) {
    const converted = {}
    
    Object.keys(data).forEach(key => {
      const value = data[key]
      if (value && typeof value.toDate === 'function') {
        // É um Timestamp do Firestore
        converted[key] = value.toDate().toISOString()
      } else if (value && value.seconds) {
        // É um Timestamp serializado
        try {
          converted[key] = new Date(value.seconds * 1000).toISOString()
        } catch (e) {
          console.warn(`Erro ao converter timestamp ${key}:`, e)
        }
      }
    })
    
    return converted
  }

  // Inicializar dados padrão (para primeira execução)
  async initializeDefaultData() {
    try {
      console.log('🚀 Verificando se dados padrão precisam ser inicializados')
      
      // Verificar se já existem dados
      const especialidades = await this.getAll('especialidades')
      
      if (especialidades.length === 0) {
        console.log('📦 Criando dados padrão...')
        
        // Criar especialidades padrão
        const defaultEspecialidades = [
          { nome: 'Dermatologia', descricao: 'Cuidados com a pele', ativo: true },
          { nome: 'Cardiologia', descricao: 'Cuidados cardíacos', ativo: true },
          { nome: 'Ortopedia', descricao: 'Cuidados ortopédicos', ativo: true },
          { nome: 'Ginecologia', descricao: 'Saúde da mulher', ativo: true },
          { nome: 'Pediatria', descricao: 'Cuidados infantis', ativo: true }
        ]
        
        for (const esp of defaultEspecialidades) {
          await this.create('especialidades', esp)
        }
        
        console.log('✅ Dados padrão inicializados com sucesso')
      } else {
        console.log('ℹ️ Dados padrão já existem, não é necessário inicializar')
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar dados padrão:', error)
    }
  }
}

export default new FirestoreService()
