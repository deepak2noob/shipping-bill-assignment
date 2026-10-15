import { getDemoData, saveBranch, saveBusiness, saveExporter } from './demo-store'
import { mockRequest } from './mock-request'
import { Branch, Business, Exporter, PortOption } from './model'
import { loadingPorts, ports } from './reference-fixtures'

function delay<T>(value: T, _?: number): Promise<T> {
  return mockRequest(
    () => value,
    () => (Array.isArray(value) ? [] : value) as T
  )
}

export const partyMockService = {
  saveExporter: (...args: Parameters<typeof saveExporter>) => mockRequest(() => saveExporter(...args)),
  saveBusiness: (...args: Parameters<typeof saveBusiness>) => mockRequest(() => saveBusiness(...args)),
  saveBranch: (...args: Parameters<typeof saveBranch>) =>
    mockRequest(() => {
      const owners = args[0] === 'exporter' ? getDemoData().exporters : getDemoData().businesses
      if (!owners.some((owner) => owner.id === args[1])) throw new Error('Party no longer exists.')
      return saveBranch(...args)
    }),
  searchBusinesses(query: string, role: 'consignee' | 'buyer' | 'thirdParty'): Promise<Business[]> {
    const key = { consignee: 'isConsignee', buyer: 'isBuyer', thirdParty: 'isThirdParty' } as const
    return delay(
      getDemoData().businesses.filter(
        (party) => party[key[role]] && party.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    )
  },
  /**
   * Search Exporters by name or IEC
   */
  async searchExporters(query: string): Promise<Exporter[]> {
    const { exporters } = getDemoData()
    const q = query.trim().toLowerCase()
    const filtered = exporters.filter(
      (item) => !item.disabled && (item.name.toLowerCase().includes(q) || item.iec.toLowerCase().includes(q))
    )
    return delay(filtered)
  },

  /**
   * Search Branches belonging to a specific Exporter ID
   */
  async searchExporterBranches(exporterId: string, query: string): Promise<Branch[]> {
    if (!exporterId) return delay([])
    const { exporters } = getDemoData()
    const exporter = exporters.find((item) => String(item.id) === exporterId)
    if (!exporter) return delay([])

    const q = query.trim().toLowerCase()
    const filtered = exporter.branches.filter(
      (branch) => branch.branchName.toLowerCase().includes(q) || branch.city.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Search Consignees by name
   */
  async searchConsignees(query: string): Promise<Business[]> {
    const { businesses } = getDemoData()
    const q = query.trim().toLowerCase()
    const filtered = businesses.filter((item) => item.isConsignee && item.name.toLowerCase().includes(q))
    return delay(filtered)
  },

  /**
   * Search Branches belonging to a specific Consignee ID
   */
  async searchConsigneeBranches(consigneeId: string, query: string): Promise<Branch[]> {
    if (!consigneeId) return delay([])
    const { businesses } = getDemoData()
    const consignee = businesses.find((item) => String(item.id) === consigneeId)
    if (!consignee) return delay([])

    const q = query.trim().toLowerCase()
    const filtered = consignee.branches.filter(
      (branch) => branch.branchName.toLowerCase().includes(q) || branch.city.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Fetch a single Exporter by ID (used for label resolution)
   */
  async getExporterById(exporterId: string): Promise<Exporter | undefined> {
    const { exporters } = getDemoData()
    return delay(
      exporters.find((item) => String(item.id) === exporterId),
      100
    )
  },

  /**
   * Fetch a single Consignee by ID (used for label resolution)
   */
  async getConsigneeById(consigneeId: string): Promise<Business | undefined> {
    const { businesses } = getDemoData()
    return delay(
      businesses.find((item) => String(item.id) === consigneeId),
      100
    )
  },

  /**
   * Search Port of Loading (Indian ports: code starts with 'IN')
   */
  async searchLoadingPorts(query: string): Promise<PortOption[]> {
    const q = query.trim().toLowerCase()
    const portsList = loadingPorts.filter((port) => port.code.startsWith('IN'))
    const filtered = portsList.filter(
      (port) => port.name.toLowerCase().includes(q) || port.code.toLowerCase().includes(q)
    )
    return delay(filtered)
  },

  /**
   * Search Final Destination Ports (all ports)
   */
  async searchDestinationPorts(query: string): Promise<PortOption[]> {
    const q = query.trim().toLowerCase()
    const filtered = ports.filter((port) => port.name.toLowerCase().includes(q) || port.code.toLowerCase().includes(q))
    return delay(filtered)
  },

  /**
   * Fetch Port by Code (used for label resolution)
   */
  async getPortByCode(code: string): Promise<PortOption | undefined> {
    return delay(
      [...loadingPorts, ...ports].find((port) => port.code === code),
      100
    )
  }
}
