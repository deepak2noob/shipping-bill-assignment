import { SavedBill, lineTotal } from './model'

/** Retains the starter's demonstration download; not a certified ICEGATE format. */
export function generateFlatFileContent(bill: SavedBill): string {
  const values = bill.values
  function text(value: string | number | undefined, fallback = '') {
    return value == null || String(value).trim() === '' ? fallback : String(value).replace(/[\^\r\n]+/g, ' ')
  }
  function row(...fields: (string | number | undefined)[]) {
    return `<R>${fields.map((field) => text(field)).join('^')}`
  }
  const port = text(values.loadingPort, 'INMUN1')
  const lines = [
    `HREC**ZZ*${port}*ZZ*ICEGATE*01*SB*1.0*`,
    '<TABLE>SHIPPING_BILL',
    '<F>MESSAGE_TYPE^CHA_ID^JOB_NO^JOB_DATE^EXPORTER_ID^EXPORTER_BRANCH^CONSIGNEE_ID^LOADING_PORT^DEST_PORT^DISCHARGE_PORT^SEAL_TYPE^NATURE_OF_CARGO^GROSS_WEIGHT^NET_WEIGHT^UOM^PACKAGES^MARKS',
    row(
      'F',
      '1000',
      text(values.jobNumber, String(bill.id)),
      values.jobDate,
      values.exporterId,
      values.exporterBranchId,
      values.consigneeId,
      values.loadingPort,
      values.finalDestinationPort,
      text(values.dischargePort, values.finalDestinationPort),
      values.sealType,
      values.natureOfCargo,
      values.grossWeight,
      values.netWeight,
      values.measurementUnit,
      values.totalPackages,
      values.marksAndNumbers
    ),
    '<TABLE>INVOICE',
    '<F>INVOICE_SN^INVOICE_NO^INVOICE_DATE^CURRENCY^CONTRACT_TYPE^BUYER_ID^FREIGHT_AMOUNT^INSURANCE_AMOUNT'
  ]
  values.invoices.forEach((invoice, index) =>
    lines.push(
      row(
        index + 1,
        invoice.invoiceNumber,
        invoice.invoiceDate,
        invoice.currency,
        invoice.contractType,
        invoice.buyerSameAsConsignee ? values.consigneeId : invoice.buyerId,
        invoice.freightAmount,
        invoice.insuranceAmount
      )
    )
  )
  lines.push(
    '<TABLE>ITEM',
    '<F>INVOICE_SN^ITEM_SN^RITC_CODE^DESCRIPTION^QUANTITY^UOM^UNIT_PRICE^LINE_TOTAL^SCHEME_CODE'
  )
  values.invoices.forEach((invoice, i) =>
    invoice.items.forEach((item, j) =>
      lines.push(
        row(
          i + 1,
          j + 1,
          item.ritcCode,
          item.goodsDescription1,
          item.quantity,
          item.unitOfMeasurement,
          item.unitPrice,
          lineTotal(item).toFixed(2),
          item.schemeCode
        )
      )
    )
  )
  if (values.packingRanges.length) {
    lines.push('<TABLE>PACKING', '<F>FROM_PKG^TO_PKG^PKG_CODE')
    values.packingRanges.forEach((range) =>
      lines.push(row(range.packingNumberFrom, range.packingNumberTo, range.packingCode))
    )
  }
  lines.push(`TREC**ZZ*${port}*ZZ*ICEGATE*01*SB*1.0*`)
  return lines.join('\r\n')
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}
