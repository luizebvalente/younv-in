// Hook personalizado para usar Firestore
import { useState, useEffect } from 'react'
import { firestoreService } from '../services/firebase'

// Hook para buscar dados de uma coleção
export const useFirestore = (collectionName, orderByField = 'createdAt') => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const result = await firestoreService.getAll(collectionName, orderByField)
        setData(result)
        setError(null)
      } catch (err) {
        setError(err.message)
        console.error(`Erro ao buscar ${collectionName}:`, err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [collectionName, orderByField])

  const refresh = async () => {
    try {
      setLoading(true)
      const result = await firestoreService.getAll(collectionName, orderByField)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error(`Erro ao atualizar ${collectionName}:`, err)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refresh }
}

// Hook para dados em tempo real
export const useRealtimeFirestore = (collectionName, orderByField = 'createdAt') => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      // Configurar listener em tempo real
      const unsubscribe = firestoreService.onSnapshot(
        collectionName,
        (docs) => {
          setData(docs)
          setLoading(false)
          setError(null)
        },
        orderByField
      )

      // Cleanup function
      return unsubscribe
    } catch (err) {
      setError(err.message)
      setLoading(false)
      console.error(`Erro ao configurar listener para ${collectionName}:`, err)
    }
  }, [collectionName, orderByField])

  return { data, loading, error }
}

// Hook para operações CRUD
export const useFirestoreCRUD = (collectionName) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const create = async (data) => {
    try {
      setLoading(true)
      setError(null)
      const result = await firestoreService.create(collectionName, data)
      return { success: true, data: result }
    } catch (err) {
      setError(err.message)
      console.error(`Erro ao criar em ${collectionName}:`, err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const update = async (id, data) => {
    try {
      setLoading(true)
      setError(null)
      const result = await firestoreService.update(collectionName, id, data)
      return { success: true, data: result }
    } catch (err) {
      setError(err.message)
      console.error(`Erro ao atualizar em ${collectionName}:`, err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    try {
      setLoading(true)
      setError(null)
      await firestoreService.delete(collectionName, id)
      return { success: true }
    } catch (err) {
      setError(err.message)
      console.error(`Erro ao deletar em ${collectionName}:`, err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const getById = async (id) => {
    try {
      setLoading(true)
      setError(null)
      const result = await firestoreService.getById(collectionName, id)
      return { success: true, data: result }
    } catch (err) {
      setError(err.message)
      console.error(`Erro ao buscar por ID em ${collectionName}:`, err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    create,
    update,
    remove,
    getById,
    loading,
    error
  }
}

