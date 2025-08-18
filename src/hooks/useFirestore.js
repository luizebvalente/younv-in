import { useState, useEffect } from 'react'
import firebaseDataService from '@/services/firebaseDataService'

// Hook para buscar dados em tempo real do Firestore
export const useRealtimeFirestore = (collection) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await firebaseDataService.getAll(collection)
        
        if (mounted) {
          setData(result)
        }
      } catch (err) {
        console.error(`Erro ao carregar ${collection}:`, err)
        if (mounted) {
          setError(err.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    // Cleanup function
    return () => {
      mounted = false
    }
  }, [collection])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await firebaseDataService.getAll(collection)
      setData(result)
    } catch (err) {
      console.error(`Erro ao recarregar ${collection}:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}

// Hook genérico para operações CRUD
export const useFirestore = (collection) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const create = async (data) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await firebaseDataService.create(collection, data)
      return result
    } catch (err) {
      console.error(`Erro ao criar ${collection}:`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const update = async (id, data) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await firebaseDataService.update(collection, id, data)
      return result
    } catch (err) {
      console.error(`Erro ao atualizar ${collection}:`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await firebaseDataService.delete(collection, id)
      return result
    } catch (err) {
      console.error(`Erro ao excluir ${collection}:`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getById = async (id) => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await firebaseDataService.getById(collection, id)
      return result
    } catch (err) {
      console.error(`Erro ao buscar ${collection} por ID:`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getAll = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await firebaseDataService.getAll(collection)
      return result
    } catch (err) {
      console.error(`Erro ao buscar todos ${collection}:`, err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    loading,
    error,
    create,
    update,
    remove,
    getById,
    getAll,
    clearError
  }
}

export default useFirestore
