import { Button } from 'ui/basic/button'
import { Checkbox } from 'ui/inputs/checkbox'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { Advanced } from './form-sections'
import { BillFormContext, BranchPath } from './form-types'
import { Business, ShippingBillFormValues, emptyItem, lineTotal } from './model'
import { PartyFields } from './party-fields'
import { useReferenceData } from './reference-data-context'
const dateType = 'date' as 'text'
export function ItemEditor({
  formCtx,
  index,
  itemIndex,
  businesses,
  onQuickAdd,
  onAddBranch,
  onRemove,
  canRemove
}: {
  formCtx: BillFormContext
  index: number
  itemIndex: number
  businesses: Business[]
  onQuickAdd: (role: 'buyer' | 'thirdParty' | 'itemThirdParty', invoiceIndex: number, itemIndex?: number) => void
  onAddBranch: (ownerId: number, branchName: BranchPath) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const { register, watch } = formCtx.hooks
  const invoice = watch(`invoices.${index}`)
  const item = invoice.items[itemIndex] ?? emptyItem()
  const {
    data: { schemeCodes, quantityCodes, Trades }
  } = useReferenceData()
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Item {itemIndex + 1}</h4>
        {canRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          label="RITC / HS code"
          {...register(`invoices.${index}.items.${itemIndex}.ritcCode`)}
          placeholder="e.g. 61091000"
        />
        <Select<ShippingBillFormValues>
          label="Scheme code"
          name={`invoices.${index}.items.${itemIndex}.schemeCode`}
          options={schemeCodes}
          placeholder="Select scheme"
        />
        <Input
          label="Goods description"
          {...register(`invoices.${index}.items.${itemIndex}.goodsDescription1`)}
          wrapClass="lg:col-span-4"
          placeholder="e.g. Cotton T-shirts"
        />
        <Input label="Quantity" type="number" {...register(`invoices.${index}.items.${itemIndex}.quantity`)} />
        <Select<ShippingBillFormValues>
          label="Unit"
          name={`invoices.${index}.items.${itemIndex}.unitOfMeasurement`}
          options={quantityCodes}
          rules={{ required: true }}
        />
        <Input
          label={`Unit price (${invoice.currency || 'currency'})`}
          type="number"
          {...register(`invoices.${index}.items.${itemIndex}.unitPrice`)}
        />
        <Input
          label="Item Total"
          type="number"
          placeholder={`${invoice.currency} ${lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}

          {...register(`invoices.${index}.items.${itemIndex}.lineTotal`)}
        />
        <Select<ShippingBillFormValues>
          label="IGST payment"
          name={`invoices.${index}.items.${itemIndex}.igstPaymentStatus`}
          options={[
            { value: 'NA', label: 'Not applicable' },
            { value: 'LUT', label: 'Under LUT / bond' },
            { value: 'P', label: 'Against payment' }
          ]}
          placeholder="Select if applicable"
        />
      </div>
      {/* Row 3: drawback inputs (conditional) + checkboxes */}
      <div className="mb-3 flex flex-wrap items-end gap-4">
        {(() => {
          const selectedScheme = schemeCodes.find((s) => s.value === item.schemeCode)
          const showDrawback =
            selectedScheme && (selectedScheme.drawback || selectedScheme.RODTEP || selectedScheme.ROSCTL)
          return showDrawback ? (
            <>
              <div className="w-36">
                <Input
                  label="Drawback Serial no."
                  {...register(`invoices.${index}.items.${itemIndex}.drawbackSerialNumber`)}
                />
              </div>
              <div className="w-32">
                <Input label="Drawback Unit" {...register(`invoices.${index}.items.${itemIndex}.drawbackUnit`)} />
              </div>
              <div className="w-36">
                <Input
                  label="Drawback Quantity"
                  type="number"
                  {...register(`invoices.${index}.items.${itemIndex}.drawbackQuantity`)}
                />
              </div>
            </>
          ) : null
        })()}
        <label className="flex items-center gap-2 pb-1 text-sm">
          <Checkbox {...register(`invoices.${index}.items.${itemIndex}.rewardItem`)} />
          Claim reward
        </label>
        <label className="flex items-center gap-2 pb-1 text-sm">
          <Checkbox {...register(`invoices.${index}.items.${itemIndex}.thirdPartyItem`)} />
          Third-party item
        </label>
      </div>
      {item.thirdPartyItem && (
        <div className="my-4">
          <PartyFields
            formCtx={formCtx}
            ownerName={`invoices.${index}.items.${itemIndex}.itemThirdPartyId`}
            branchName={`invoices.${index}.items.${itemIndex}.itemThirdPartyBranchId`}
            label="Item third party"
            kind="business"
            parties={businesses.filter(
              (business) => business.isThirdParty || business.id === Number(item.itemThirdPartyId)
            )}
            onQuickAdd={() => onQuickAdd('itemThirdParty', index, itemIndex)}
            onAddBranch={(ownerId) =>
              onAddBranch(ownerId, `invoices.${index}.items.${itemIndex}.itemThirdPartyBranchId`)
            }
          />
        </div>
      )}
      <Advanced title="Item customs, taxes and incentives">
        <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select<ShippingBillFormValues>
            label="Unit of rate"
            {...register(`invoices.${index}.items.${itemIndex}.unitOfRate`)}
            options={quantityCodes}
            placeholder={invoice.items[index].unitOfMeasurement}
          />
          <Input
            label="Per Unit (Rate)"
            type="number"
            placeholder="1"
            {...register(`invoices.${index}.items.${itemIndex}.numberOfUnits`)}
          />
          <Input
            label="Present market value"
            type="number"
            {...register(`invoices.${index}.items.${itemIndex}.presentMarketValue`)}
          />
          <Input label="GCess" type="number" {...register(`invoices.${index}.items.${itemIndex}.cess`)} />
          <Input
            label="Accessories description"
            wrapClass="lg:col-span-3"
            {...register(`invoices.${index}.items.${itemIndex}.accessoriesDescription`)}
          />
          <Select<ShippingBillFormValues>
            label="Accessory status"
            name={`invoices.${index}.items.${itemIndex}.accessoryStatus`}
            options={[
              { value: '0', label: 'No accessory' },
              { value: '1', label: 'Included free of cost' },
              { value: '2', label: 'Entered separately' }
            ]}
            placeholder="Select if relevant"
          />
          {item.igstPaymentStatus === 'P' && (
            <>
              <Input
                label="Taxable value"
                type="number"
                {...register(`invoices.${index}.items.${itemIndex}.taxableValue`)}
              />
              <Input
                label="IGST amount"
                type="number"
                {...register(`invoices.${index}.items.${itemIndex}.igstAmount`)}
              />
            </>
          )}

          <Input
            label="Origin district code"
            {...register(`invoices.${index}.items.${itemIndex}.originDistrictCode`)}
          />
          <Select<ShippingBillFormValues>
            label="Trade agreement code"
            name={`invoices.${index}.items.${itemIndex}.tradeAgreementsCode`}
            options={Trades}
            placeholder="NCPTI"
          />
          <Input label="End use code" {...register(`invoices.${index}.items.${itemIndex}.endUseOfItem`)} />
          <Input
            label="Packages for item"
            type="number"
            {...register(`invoices.${index}.items.${itemIndex}.totalPackage`)}
          />
        </div>
        <Advanced title="AR4 / excise details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="AR4 number" {...register(`invoices.${index}.items.${itemIndex}.ar4Number`)} />
            <Input label="AR4 date" type={dateType} {...register(`invoices.${index}.items.${itemIndex}.ar4Date`)} />
          </div>
        </Advanced>
      </Advanced>
    </div>
  )
}
