import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import type { BillFormContext } from './form-types'
import type { ShippingBillFormValues } from './model'
import { useReferenceData } from './reference-data-context'

const charges = [
  ['freight', 'Freight'],
  ['insurance', 'Insurance'],
  ['commission', 'Commission'],
  ['discount', 'Discount'],
  ['otherDeductions', 'Other deductions']
] as const

export function InvoiceCharges({ formCtx, index }: { formCtx: BillFormContext; index: number }) {
  const { register, watch } = formCtx.hooks
  const invoice = watch(`invoices.${index}`)
  const {
    data: { currencyOptions }
  } = useReferenceData()
  return (
    <div className="grid gap-4 rounded-lg border border-gray-200 p-3 lg:grid-cols-2">
      {charges.map(([key, label]) => (
        <div key={key}>
          <p className="mb-2 text-sm font-medium">{label}</p>
          <div className="grid grid-cols-3 gap-2">
            <Input
              label={`${label} rate (%)`}
              type="number"
              min={0}
              max={100}
              {...register(`invoices.${index}.${key}Rate`)}
            />
            <Input label={`${label} amount`} type="number" min={0} {...register(`invoices.${index}.${key}Amount`)} />
            <Select<ShippingBillFormValues>
              label={`${label} currency`}
              name={`invoices.${index}.${key}Currency`}
              options={currencyOptions}
              placeholder={invoice.currency}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-500 lg:col-span-2">
        Enter either a percentage or an amount for each charge. Blank currency uses the invoice currency.
      </p>
    </div>
  )
}
