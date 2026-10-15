import { documentCodes } from '../data/e-sanchit-codes'
import { quantityCodes } from '../data/quantity-code'
import schemeCodes from '../data/scheme-codes'
import { stateOptions } from '../data/states'
import { Trades } from '../data/trade-agrements'
import { cargoOptions, contractTypes, paymentTypes, priceInclusionTypes, sealTypes, weightUnits } from '../data/types'
import { getDemoData } from './demo-store'
import { mockRequest } from './mock-request'
import { countries, ports } from './reference-fixtures'

const lookupOptions = {
  documentCodes,
  quantityCodes,
  schemeCodes,
  stateOptions,
  Trades,
  cargoOptions,
  contractTypes,
  paymentTypes,
  priceInclusionTypes,
  sealTypes,
  weightUnits,
  countries,
  portOptions: ports.map((port) => ({ value: port.code, label: `${port.name} · ${port.code}` })),
  currencyOptions: ['USD', 'EUR', 'INR', 'AED', 'GBP', 'SGD'].map((value) => ({ value, label: value }))
}
const fileTypes = [{ value: 'pdf', label: 'PDF' }]
function search(options: { value: string; label: string }[], query: string) {
  const q = query.trim().toLowerCase()
  return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(q))
}
export const referenceService = {
  searchDocuments(query: string) {
    return mockRequest(
      () => search(documentCodes, query),
      () => []
    )
  },
  documentLabel(value: string) {
    return mockRequest(() => documentCodes.find((option) => option.value === value)?.label ?? value)
  },
  searchFileTypes(query: string) {
    return mockRequest(
      () => search(fileTypes, query),
      () => []
    )
  },
  fileTypeLabel(value: string) {
    return mockRequest(() => fileTypes.find((option) => option.value === value)?.label ?? value)
  },
  load() {
    return mockRequest(
      () => {
        const { exporters, businesses } = getDemoData()
        return { ...lookupOptions, exporters, businesses }
      },
      () => ({ ...lookupOptions, exporters: [], businesses: [] })
    )
  }
}
export type ReferenceData = Awaited<ReturnType<typeof referenceService.load>>
