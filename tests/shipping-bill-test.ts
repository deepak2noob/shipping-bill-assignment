/// <reference types="node" />
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateFlatFileContent } from '../src/shipping-bills/flat-file'
import { seed } from '../src/shipping-bills/mock-data'
import { emptyBill, invoiceTotal, lineTotal, toShippingBillPayload } from '../src/shipping-bills/model'
import { partyMockService } from '../src/shipping-bills/party-mock-service'
import { referenceService } from '../src/shipping-bills/reference-service'
import { shippingBillService } from '../src/shipping-bills/shipping-bill-service'
import { BillValidationError, validateBill } from '../src/shipping-bills/validation'

function valid() {
  return structuredClone(seed.bills[0].values)
}
function paths(values: ReturnType<typeof valid>) {
  return validateBill(values, seed).map((issue) => issue.path)
}

await test('seed bill satisfies practical domain rules', () => assert.deepEqual(paths(valid()), []))
await test('blank bill requires parties, route and invoice goods', () => {
  const issues = paths(emptyBill())
  for (const path of [
    'exporterId',
    'consigneeBranchId',
    'loadingPort',
    'invoices.0.invoiceNumber',
    'invoices.0.items.0.quantity'
  ])
    assert.ok(issues.includes(path), path)
})
await test('rejects non-finite numbers, invalid codes and negative overrides', () => {
  const values = valid()
  const item = values.invoices[0].items[0]
  item.quantity = 'Infinity'
  item.unitPrice = '-1'
  item.lineTotal = '-2'
  item.ritcCode = 'abc'
  const issues = paths(values)
  for (const field of ['quantity', 'unitPrice', 'lineTotal', 'ritcCode'])
    assert.ok(issues.includes(`invoices.0.items.0.${field}`))
})
await test('validates party branch ownership and net/gross relationship', () => {
  const values = valid()
  values.exporterBranchId = '2003'
  values.netWeight = '999'
  assert.ok(paths(values).includes('exporterBranchId'))
  assert.ok(paths(values).includes('netWeight'))
})
await test('buyer details are conditional and tax fields required only for paid IGST', () => {
  const values = valid()
  const invoice = values.invoices[0]
  invoice.buyerSameAsConsignee = false
  invoice.buyerId = ''
  invoice.buyerBranchId = ''
  invoice.items[0].igstPaymentStatus = 'P'
  const issues = paths(values)
  assert.ok(issues.includes('invoices.0.buyerId'))
  assert.ok(issues.includes('invoices.0.items.0.taxableValue'))
  invoice.buyerSameAsConsignee = true
  invoice.items[0].igstPaymentStatus = 'LUT'
  assert.deepEqual(paths(values), [])
})
await test('rejects duplicate invoices, conflicting charges, and reversed package ranges', () => {
  const values = valid()
  values.invoices.push(structuredClone(values.invoices[0]))
  values.invoices[0].freightRate = '5'
  values.invoices[0].freightAmount = '20'
  values.packingRanges = [{ packingNumberFrom: '5', packingNumberTo: '2' }]
  const issues = paths(values)
  for (const path of ['invoices.1.invoiceNumber', 'invoices.0.freightAmount', 'packingRanges.0.packingNumberTo'])
    assert.ok(issues.includes(path))
})
await test('validates actual calendar dates and document invoice/item references', () => {
  const values = valid()
  values.jobDate = '2026-02-30'
  values.documents = [
    {
      documentTypeCode: '1',
      documentReferenceNumber: 'ABC',
      documentIssueDate: '2026-10-10',
      documentExpiryDate: '2026-09-10',
      invoiceSerialNumber: '9',
      itemSerialNumber: '1'
    }
  ]
  const issues = paths(values)
  for (const path of [
    'jobDate',
    'documents.0.documentExpiryDate',
    'documents.0.invoiceSerialNumber',
    'documents.0.itemSerialNumber'
  ])
    assert.ok(issues.includes(path))
})
await test('payload derives consignee buyer and honours explicit totals including zero', () => {
  const values = valid()
  const invoice = values.invoices[0]
  invoice.buyerId = '9999'
  invoice.items[0].lineTotal = '0'
  invoice.invoiceTotal = '0'
  const payload = toShippingBillPayload(values)
  assert.equal(payload.invoices[0].buyer, Number(values.consigneeId))
  assert.equal(payload.invoices[0].invoice_total, 0)
  assert.equal(lineTotal(invoice.items[0]), 0)
  assert.equal(invoiceTotal(invoice), 0)
  assert.equal(payload.shipping_bill.discharge_port, values.finalDestinationPort)
})
await test('local flat file uses the same buyer and line-total rules', () => {
  const bill = structuredClone(seed.bills[0])
  bill.values.invoices[0].buyerId = '9999'
  bill.values.invoices[0].items[0].lineTotal = '12.50'
  const text = generateFlatFileContent(bill)
  assert.ok(text.includes('^12.50^'))
  assert.ok(!text.includes('^9999^'))
})
await test('async create/edit are isolated copies and preserve all form fields', async () => {
  const values = valid()
  values.documents = [{ documentTypeCode: '1', documentReferenceNumber: 'DOC', icegateId: 'demo-user' }]
  const created = await shippingBillService.upsert(values)
  values.invoices[0].invoiceNumber = 'MUTATED'
  const loaded = await shippingBillService.getById(String(created.id))
  assert.ok(loaded)
  assert.notEqual(loaded.values.invoices[0].invoiceNumber, 'MUTATED')
  assert.equal(loaded.values.documents[0].icegateId, 'demo-user')
  const before = (await shippingBillService.list()).length
  loaded.values.jobNumber = '42'
  await shippingBillService.upsert(loaded.values, loaded.id)
  assert.equal((await shippingBillService.list()).length, before)
  assert.equal((await shippingBillService.getById(String(loaded.id)))?.values.jobNumber, '42')
})
await test('incomplete drafts persist but final submission rejects them', async () => {
  const draft = await shippingBillService.saveDraft(emptyBill())
  assert.equal(draft.payload, undefined)
  assert.ok(await shippingBillService.getById(String(draft.id)))
  await assert.rejects(shippingBillService.upsert(draft.values, draft.id), BillValidationError)
})
await test('party search uses buyer/third-party roles and resolves Indian port labels', async () => {
  const party = await partyMockService.saveBusiness({
    name: 'Third Party Only',
    isBuyer: false,
    isConsignee: false,
    isNotify: false,
    isThirdParty: true,
    firstBranch: { branchName: 'Main', address1: '1 Road', city: 'Dubai', countryCode: 'AE' }
  })
  assert.ok(
    (await partyMockService.searchBusinesses('Third Party Only', 'thirdParty')).some((entry) => entry.id === party.id)
  )
  assert.equal((await partyMockService.searchBusinesses('Third Party Only', 'consignee')).length, 0)
  assert.equal((await partyMockService.getPortByCode('INMUN1'))?.name, 'Mundra')
})
await test('mock errors reject writes without changing stored bills; empty mode returns empty lists', async () => {
  const before = (await shippingBillService.list()).length
  const globalWithWindow = globalThis as unknown as { window?: { location: { search: string } } }
  globalWithWindow.window = { location: { search: '?mock=error' } }
  try {
    await assert.rejects(shippingBillService.upsert(valid()), /Mock request failed/)
    await assert.rejects(referenceService.load(), /Mock request failed/)
    globalWithWindow.window.location.search = '?mock=empty'
    assert.deepEqual(await shippingBillService.list(), [])
    assert.deepEqual((await referenceService.load()).exporters, [])
  } finally {
    delete globalWithWindow.window
  }
  assert.equal((await shippingBillService.list()).length, before)
})
