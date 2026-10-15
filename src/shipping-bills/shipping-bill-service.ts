import { getDemoData, saveBill } from './demo-store'
import { generateFlatFileContent, triggerBlobDownload } from './flat-file'
import { mockRequest } from './mock-request'
import type { SavedBill, ShippingBillFormValues } from './model'
import { BillValidationError, validateBill } from './validation'

function withPartyNames(bill: SavedBill): SavedBill {
  const { exporters, businesses } = getDemoData()
  return {
    ...bill,
    values: {
      ...bill.values,
      exporterName: exporters.find((party) => String(party.id) === bill.values.exporterId)?.name,
      consigneeName: businesses.find((party) => String(party.id) === bill.values.consigneeId)?.name
    }
  }
}
/** Replace these implementations with HTTP calls; callers only await domain objects. */
export const shippingBillService = {
  list(): Promise<SavedBill[]> {
    return mockRequest(
      () => getDemoData().bills.map(withPartyNames),
      () => []
    )
  },
  getById(id: string): Promise<SavedBill | undefined> {
    return mockRequest(() => {
      const bill = getDemoData().bills.find((entry) => entry.id === Number(id))
      return bill ? withPartyNames(bill) : undefined
    })
  },
  saveDraft(values: ShippingBillFormValues, id?: number): Promise<SavedBill> {
    const snapshot = structuredClone(values)
    return mockRequest(() => {
      if (id != null && !getDemoData().bills.some((bill) => bill.id === id))
        throw new Error('Shipping bill no longer exists.')
      return withPartyNames(saveBill(snapshot, id, false))
    })
  },
  upsert(values: ShippingBillFormValues, id?: number): Promise<SavedBill> {
    // Take a snapshot before awaiting so continued edits cannot change the request.
    const snapshot = structuredClone(values)
    return mockRequest(() => {
      const issues = validateBill(snapshot, getDemoData())
      if (issues.length) throw new BillValidationError(issues)
      if (id != null && !getDemoData().bills.some((bill) => bill.id === id))
        throw new Error('Shipping bill no longer exists.')
      return withPartyNames(saveBill(snapshot, id))
    })
  },
  async downloadFlatFile(id: number): Promise<{ source: 'local' }> {
    const bill = await this.getById(String(id))
    if (!bill) throw new Error('Shipping bill not found.')
    const blob = new Blob([generateFlatFileContent(bill)], { type: 'text/plain;charset=utf-8' })
    triggerBlobDownload(blob, `shipping_bill_${bill.id}.sb`)
    return { source: 'local' }
  }
}
