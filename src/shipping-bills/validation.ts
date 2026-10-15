import type { Business, Exporter, ShippingBillFormValues } from './model'

export interface ValidationIssue {
  path: string
  message: string
}
export class BillValidationError extends Error {
  constructor(public issues: ValidationIssue[]) {
    super('Please correct the highlighted fields.')
    this.name = 'BillValidationError'
  }
}

/** Practical form assumptions, not a complete customs compliance validator. */
export function validateBill(
  values: ShippingBillFormValues,
  references?: { exporters: Exporter[]; businesses: Business[] }
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  function add(path: string, message: string) {
    issues.push({ path, message })
  }
  function present(value: unknown) {
    return typeof value === 'string' ? value.trim() !== '' : typeof value === 'number'
  }
  function required(value: unknown, path: string) {
    if (!present(value)) add(path, 'This field is required.')
  }
  function number(value: unknown, path: string, positive = false, integer = false) {
    if (!present(value)) return
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || (positive ? parsed <= 0 : parsed < 0) || (integer && !Number.isInteger(parsed))) {
      add(path, `Enter a ${positive ? 'positive' : 'non-negative'} ${integer ? 'whole number' : 'number'}.`)
    }
  }
  function date(value: string | undefined, path: string) {
    if (!present(value)) return
    const parsed = new Date(`${value}T00:00:00Z`)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value!) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    )
      add(path, 'Enter a valid date.')
  }
  function party(
    ownerId: string | undefined,
    branchId: string | undefined,
    path: string,
    branchPath: string,
    role: 'exporter' | 'consignee' | 'buyer' | 'thirdParty',
    optional = false
  ) {
    if (optional && !present(ownerId)) {
      if (present(branchId)) add(branchPath, 'Select a party first.')
      return
    }
    required(ownerId, path)
    required(branchId, branchPath)
    if (!references || !present(ownerId)) return
    const owners = role === 'exporter' ? references.exporters : references.businesses
    const owner = owners.find((entry) => String(entry.id) === ownerId)
    if (!owner) {
      add(path, 'Select an existing party.')
      return
    }
    if (role !== 'exporter') {
      const key = { consignee: 'isConsignee', buyer: 'isBuyer', thirdParty: 'isThirdParty' } as const
      if (!(owner as Business)[key[role]]) add(path, `Select a party with the ${role} role.`)
    }
    if (present(branchId) && !owner.branches.some((branch) => String(branch.id) === branchId))
      add(branchPath, 'Select a branch belonging to this party.')
  }
  required(values.jobDate, 'jobDate')
  date(values.jobDate, 'jobDate')
  party(values.exporterId, values.exporterBranchId, 'exporterId', 'exporterBranchId', 'exporter')
  party(values.consigneeId, values.consigneeBranchId, 'consigneeId', 'consigneeBranchId', 'consignee')
  for (const key of ['loadingPort', 'finalDestinationPort', 'natureOfCargo', 'measurementUnit'] as const)
    required(values[key], key)
  if (values.loadingPort && !/^IN[A-Z0-9]{3,4}$/.test(values.loadingPort))
    add('loadingPort', 'Select an Indian loading port.')
  for (const key of ['grossWeight', 'netWeight', 'exchangeRate'] as const) number(values[key], key)
  for (const key of ['jobNumber', 'totalPackages', 'loosePackets', 'numberOfContainers'] as const)
    number(values[key], key, false, true)
  if (present(values.netWeight) && present(values.grossWeight) && Number(values.netWeight) > Number(values.grossWeight))
    add('netWeight', 'Net weight cannot exceed gross weight.')
  date(values.rbiWaiverDate, 'rbiWaiverDate')
  if (present(values.rbiWaiverNumber)) required(values.rbiWaiverDate, 'rbiWaiverDate')
  if (!values.invoices.length) add('invoices', 'Add at least one invoice.')
  const invoiceNumbers = new Set<string>()
  values.invoices.forEach((invoice, i) => {
    const p = `invoices.${i}`
    for (const key of ['invoiceNumber', 'invoiceDate', 'currency', 'contractType'] as const)
      required(invoice[key], `${p}.${key}`)
    date(invoice.invoiceDate, `${p}.invoiceDate`)
    const normalized = invoice.invoiceNumber.trim().toLowerCase()
    if (normalized && invoiceNumbers.has(normalized))
      add(`${p}.invoiceNumber`, 'Invoice numbers must be unique within this bill.')
    invoiceNumbers.add(normalized)
    if (!invoice.buyerSameAsConsignee)
      party(invoice.buyerId, invoice.buyerBranchId, `${p}.buyerId`, `${p}.buyerBranchId`, 'buyer')
    party(
      invoice.thirdPartyId,
      invoice.thirdPartyBranchId,
      `${p}.thirdPartyId`,
      `${p}.thirdPartyBranchId`,
      'thirdParty',
      true
    )
    for (const key of ['freight', 'insurance', 'commission', 'discount', 'otherDeductions'] as const) {
      const rate = invoice[`${key}Rate`],
        amount = invoice[`${key}Amount`]
      number(rate, `${p}.${key}Rate`)
      number(amount, `${p}.${key}Amount`)
      if (Number(rate) > 100) add(`${p}.${key}Rate`, 'Percentage cannot exceed 100.')
      if (present(rate) && present(amount)) add(`${p}.${key}Amount`, 'Enter either a rate or an amount, not both.')
    }
    number(invoice.invoiceTotal, `${p}.invoiceTotal`)
    number(invoice.packingCharges, `${p}.packingCharges`)
    number(invoice.periodOfPayment, `${p}.periodOfPayment`, false, true)
    if (!invoice.items.length) add(`${p}.items`, 'Add at least one item.')
    invoice.items.forEach((item, j) => {
      const q = `${p}.items.${j}`
      for (const key of ['ritcCode', 'goodsDescription1', 'quantity', 'unitPrice', 'unitOfMeasurement'] as const)
        required(item[key], `${q}.${key}`)
      if (item.ritcCode && !/^\d{8}$/.test(item.ritcCode)) add(`${q}.ritcCode`, 'Use an eight-digit RITC / HS code.')
      number(item.quantity, `${q}.quantity`, true)
      number(item.unitPrice, `${q}.unitPrice`, true)
      for (const key of [
        'lineTotal',
        'presentMarketValue',
        'numberOfUnits',
        'taxableValue',
        'igstAmount',
        'drawbackQuantity',
        'customRateAdv',
        'customRateSpec',
        'totalDbkAmount',
        'dbkAdv',
        'dbkRateSpec',
        'centralTaxLevyDuty',
        'centralTaxLevyRate',
        'stateLevyDuty',
        'stateLevyRate',
        'rosctlQuantity',
        'rosctlAmount',
        'rodtepRate',
        'rodtepCap',
        'rodtepQuantity',
        'rodtepAmount',
        'cess',
        'totalPackage'
      ] as const)
        number(item[key], `${q}.${key}`)
      if (item.thirdPartyItem)
        party(
          item.itemThirdPartyId,
          item.itemThirdPartyBranchId,
          `${q}.itemThirdPartyId`,
          `${q}.itemThirdPartyBranchId`,
          'thirdParty'
        )
      if (item.igstPaymentStatus === 'P') {
        required(item.taxableValue, `${q}.taxableValue`)
        required(item.igstAmount, `${q}.igstAmount`)
        if (Number(item.igstAmount) > Number(item.taxableValue))
          add(`${q}.igstAmount`, 'Tax cannot exceed taxable value.')
      }
      date(item.ar4Date, `${q}.ar4Date`)
    })
  })
  values.containers.forEach((container, i) => {
    required(container.containerNumber, `containers.${i}.containerNumber`)
    date(container.sealDate, `containers.${i}.sealDate`)
  })
  values.packingRanges.forEach((range, i) => {
    for (const key of ['packingNumberFrom', 'packingNumberTo'] as const) {
      required(range[key], `packingRanges.${i}.${key}`)
      number(range[key], `packingRanges.${i}.${key}`, true, true)
    }
    if (Number(range.packingNumberTo) < Number(range.packingNumberFrom))
      add(`packingRanges.${i}.packingNumberTo`, 'End package must be at or after the start.')
  })
  function serials(record: { invoiceSerialNumber?: string; itemSerialNumber?: string }, path: string) {
    const invoice = Number(record.invoiceSerialNumber),
      item = Number(record.itemSerialNumber)
    if (
      present(record.invoiceSerialNumber) &&
      (!Number.isInteger(invoice) || invoice < 1 || invoice > values.invoices.length)
    )
      add(`${path}.invoiceSerialNumber`, 'Select an existing invoice serial number (starting at 1).')
    if (
      present(record.itemSerialNumber) &&
      (!Number.isInteger(item) ||
        item < 1 ||
        invoice < 1 ||
        invoice > values.invoices.length ||
        item > values.invoices[invoice - 1].items.length)
    )
      add(`${path}.itemSerialNumber`, 'Item serial must belong to the selected invoice.')
  }
  values.documents.forEach((doc, i) => {
    const p = `documents.${i}`
    required(doc.documentTypeCode, `${p}.documentTypeCode`)
    if (!present(doc.documentReferenceNumber) && !present(doc.imageReferenceNumber))
      add(`${p}.imageReferenceNumber`, 'Enter an image reference or document reference number.')
    date(doc.documentIssueDate, `${p}.documentIssueDate`)
    date(doc.documentExpiryDate, `${p}.documentExpiryDate`)
    if (doc.documentIssueDate && doc.documentExpiryDate && doc.documentExpiryDate < doc.documentIssueDate)
      add(`${p}.documentExpiryDate`, 'Expiry cannot be before issue date.')
    serials(doc, p)
  })
  values.licenses.forEach((license, i) => {
    const p = `licenses.${i}`
    required(license.registrationNumber, `${p}.registrationNumber`)
    date(license.registrationDate, `${p}.registrationDate`)
    number(license.licenseQuantity, `${p}.licenseQuantity`)
    number(license.licenseExportQuantity, `${p}.licenseExportQuantity`)
    if (present(license.licenseQuantity) && Number(license.licenseExportQuantity) > Number(license.licenseQuantity))
      add(`${p}.licenseExportQuantity`, 'Export quantity cannot exceed licence quantity.')
    serials(license, p)
  })
  return issues
}
