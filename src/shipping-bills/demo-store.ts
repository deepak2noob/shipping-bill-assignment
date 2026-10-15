import { Branch, Business, Exporter, SavedBill, ShippingBillFormValues, toShippingBillPayload } from './model'

import { DemoData, seed } from './mock-data'
const storageKey = 'export-software-shipping-bills-v2'

function loadData(): DemoData {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoData
      if (Array.isArray(parsed.exporters) && Array.isArray(parsed.businesses) && Array.isArray(parsed.bills)) {
        // Merge missing seed exporters and businesses into parsed store
        const existingExporterIds = new Set(parsed.exporters.map((e) => e.id))
        const missingExporters = seed.exporters.filter((e) => !existingExporterIds.has(e.id))
        const mergedExporters = [...parsed.exporters, ...missingExporters]

        const existingBusinessIds = new Set(parsed.businesses.map((b) => b.id))
        const missingBusinesses = seed.businesses.filter((b) => !existingBusinessIds.has(b.id))
        const mergedBusinesses = [...parsed.businesses, ...missingBusinesses]

        return {
          exporters: mergedExporters,
          businesses: mergedBusinesses,
          bills: parsed.bills.map((bill) => ({
            ...bill,
            values: {
              ...bill.values,
              packingRanges: (bill.values as Partial<ShippingBillFormValues>).packingRanges ?? []
            }
          }))
        }
      }
    }
  } catch {
    // Use sample data when local storage is unavailable or contains invalid data.
  }
  return structuredClone(seed)
}

let snapshot = loadData()

function publish(next: DemoData) {
  snapshot = next
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {
    // The in-memory demo remains usable when storage is disabled.
  }
}

export function getDemoData() {
  return snapshot
}

function nextId() {
  const ids = [
    ...snapshot.exporters.flatMap((record) => [record.id, ...record.branches.map((branch) => branch.id)]),
    ...snapshot.businesses.flatMap((record) => [record.id, ...record.branches.map((branch) => branch.id)]),
    ...snapshot.bills.map((bill) => bill.id)
  ]
  return Math.max(3000, ...ids) + 1
}

export function saveExporter(
  exporter: Omit<Exporter, 'id' | 'branches'> & { id?: number; firstBranch?: Omit<Branch, 'id'> }
) {
  const id = exporter.id ?? nextId()
  const previous = snapshot.exporters.find((record) => record.id === id)
  const branches = previous?.branches ?? (exporter.firstBranch ? [{ ...exporter.firstBranch, id: id + 1 }] : [])
  const record: Exporter = {
    id,
    branches,
    name: exporter.name,
    iec: exporter.iec,
    class: exporter.class,
    type: exporter.type,
    pan: exporter.pan,
    tan: exporter.tan,
    aeoNumber: exporter.aeoNumber,
    website: exporter.website,
    notes: exporter.notes,
    disabled: exporter.disabled ?? previous?.disabled
  }
  publish({ ...snapshot, exporters: [...snapshot.exporters.filter((item) => item.id !== id), record] })
  return record
}

export function saveBusiness(
  business: Omit<Business, 'id' | 'branches'> & { id?: number; firstBranch?: Omit<Branch, 'id'> }
) {
  const id = business.id ?? nextId()
  const previous = snapshot.businesses.find((record) => record.id === id)
  const branches = previous?.branches ?? (business.firstBranch ? [{ ...business.firstBranch, id: id + 1 }] : [])
  const record: Business = {
    id,
    branches,
    name: business.name,
    iec: business.iec,
    isConsignee: business.isConsignee,
    isBuyer: business.isBuyer,
    isNotify: business.isNotify,
    isThirdParty: business.isThirdParty
  }
  publish({ ...snapshot, businesses: [...snapshot.businesses.filter((item) => item.id !== id), record] })
  return record
}

export function saveBranch(
  kind: 'exporter' | 'business',
  ownerId: number,
  branch: Omit<Branch, 'id'> & { id?: number }
) {
  const id = branch.id ?? nextId()
  const record = { ...branch, id }
  if (kind === 'exporter') {
    publish({
      ...snapshot,
      exporters: snapshot.exporters.map((owner) =>
        owner.id === ownerId
          ? { ...owner, branches: [...owner.branches.filter((item) => item.id !== id), record] }
          : owner
      )
    })
  } else {
    publish({
      ...snapshot,
      businesses: snapshot.businesses.map((owner) =>
        owner.id === ownerId
          ? { ...owner, branches: [...owner.branches.filter((item) => item.id !== id), record] }
          : owner
      )
    })
  }
  return record
}

export function deleteParty(kind: 'exporter' | 'business', id: number) {
  const inUse = snapshot.bills.some((bill) =>
    kind === 'exporter'
      ? bill.values.exporterId === String(id)
      : bill.values.consigneeId === String(id) ||
        bill.values.invoices.some(
          (invoice) =>
            invoice.buyerId === String(id) ||
            invoice.thirdPartyId === String(id) ||
            invoice.items.some((item) => item.itemThirdPartyId === String(id))
        )
  )
  if (inUse) return false
  publish({
    ...snapshot,
    exporters: kind === 'exporter' ? snapshot.exporters.filter((record) => record.id !== id) : snapshot.exporters,
    businesses: kind === 'business' ? snapshot.businesses.filter((record) => record.id !== id) : snapshot.businesses
  })
  return true
}

export function deleteBranch(kind: 'exporter' | 'business', ownerId: number, id: number) {
  const inUse = snapshot.bills.some((bill) =>
    kind === 'exporter'
      ? bill.values.exporterBranchId === String(id)
      : bill.values.consigneeBranchId === String(id) ||
        bill.values.invoices.some(
          (invoice) =>
            invoice.buyerBranchId === String(id) ||
            invoice.thirdPartyBranchId === String(id) ||
            invoice.items.some((item) => item.itemThirdPartyBranchId === String(id))
        )
  )
  if (inUse) return false
  if (kind === 'exporter') {
    publish({
      ...snapshot,
      exporters: snapshot.exporters.map((owner) =>
        owner.id === ownerId ? { ...owner, branches: owner.branches.filter((branch) => branch.id !== id) } : owner
      )
    })
  } else {
    publish({
      ...snapshot,
      businesses: snapshot.businesses.map((owner) =>
        owner.id === ownerId ? { ...owner, branches: owner.branches.filter((branch) => branch.id !== id) } : owner
      )
    })
  }
  return true
}

export function saveBill(values: ShippingBillFormValues, id?: number, includePayload = true) {
  const now = new Date().toISOString()
  const previous = snapshot.bills.find((bill) => bill.id === id)
  const record: SavedBill = {
    id: id ?? nextId(),
    created: previous?.created ?? now,
    updated: now,
    values,
    payload: includePayload ? toShippingBillPayload(values) : undefined
  }
  publish({ ...snapshot, bills: [record, ...snapshot.bills.filter((bill) => bill.id !== id)] })
  return record
}

export function syncBillsFromApi(apiBills: SavedBill[]) {
  if (!apiBills.length) return
  const existingMap = new Map<number, SavedBill>()
  // Put existing bills first
  for (const b of snapshot.bills) {
    existingMap.set(b.id, b)
  }
  // Overlay/add API bills
  for (const b of apiBills) {
    existingMap.set(b.id, b)
  }
  publish({
    ...snapshot,
    bills: Array.from(existingMap.values())
  })
}
