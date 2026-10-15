import { createContext, useContext } from 'react'
import type { ReferenceData } from './reference-service'

const ReferenceDataContext = createContext<{ data: ReferenceData; refresh: () => Promise<void> } | null>(null)
export const ReferenceDataProvider = ReferenceDataContext.Provider
export function useReferenceData() {
  const value = useContext(ReferenceDataContext)
  if (!value) throw new Error('Reference data must be loaded before rendering the form.')
  return value
}
