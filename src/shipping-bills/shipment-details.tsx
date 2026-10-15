import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from 'ui/basic/card'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { getMarksAndNumbersOptions, MarksAndNumbersOption } from './marks-and-numbers-source'
import { portCountry, ShippingBillFormValues } from './model'
import { partyMockService } from './party-mock-service'

import type { Dispatch, SetStateAction } from 'react'
import { AsyncPartySelect } from './async-party-select'
import { Advanced, SectionHeading } from './form-sections'
import { BillFormContext, QuickAdd, QuickBranch } from './form-types'
import { PartyFields } from './party-fields'
import { useReferenceData } from './reference-data-context'
const dateType = 'date' as 'text'
export function ShipmentDetails({
  formCtx,
  setQuickAdd,
  setQuickBranch
}: {
  formCtx: BillFormContext
  setQuickAdd: Dispatch<SetStateAction<QuickAdd | null>>
  setQuickBranch: Dispatch<SetStateAction<QuickBranch | null>>
}) {
  const { register, setValue } = formCtx.hooks
  const values = formCtx.hooks.watch()
  const {
    data: { exporters, businesses, portOptions, stateOptions, cargoOptions, weightUnits, sealTypes }
  } = useReferenceData()
  const [marksAndNumbersOptions, setMarksAndNumbersOptions] = useState<MarksAndNumbersOption[]>([])
  const [marksAndNumbersLoading, setMarksAndNumbersLoading] = useState(false)
  const [marksError, setMarksError] = useState('')
  const previousExporterId = useRef(values.exporterId)
  const consigneeOptions = businesses.filter(
    (business) => business.isConsignee || String(business.id) === values.consigneeId
  )

  useEffect(() => {
    const exporterId = values.exporterId
    if (previousExporterId.current !== exporterId) {
      previousExporterId.current = exporterId
      setValue('marksAndNumbers', '', { shouldValidate: true })
    }

    setMarksError('')
    let cancelled = false
    setMarksAndNumbersOptions([])
    setMarksAndNumbersLoading(Boolean(exporterId))
    if (exporterId) {
      void getMarksAndNumbersOptions(exporterId)
        .then((options) => {
          if (cancelled) return
          setMarksAndNumbersOptions(options)
          setMarksAndNumbersLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          setMarksError('Unable to load suggested marks. You can enter them below.')
          setMarksAndNumbersOptions([])
          setMarksAndNumbersLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [setValue, values.exporterId])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Shipment basics" description="Parties and route are the core details for this bill." />
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Job number (optional)" {...register('jobNumber')} />
            <Input label="Job date" type={dateType} {...register('jobDate')} />
          </div>
          <PartyFields
            formCtx={formCtx}
            ownerName="exporterId"
            branchName="exporterBranchId"
            label="Exporter"
            kind="exporter"
            parties={exporters.filter((item) => !item.disabled || String(item.id) === values.exporterId)}
            onQuickAdd={() => setQuickAdd({ kind: 'exporter' })}
            onAddBranch={(ownerId) => setQuickBranch({ kind: 'exporter', ownerId, branchName: 'exporterBranchId' })}
          />
          <PartyFields
            formCtx={formCtx}
            ownerName="consigneeId"
            branchName="consigneeBranchId"
            label="Consignee"
            kind="business"
            parties={consigneeOptions}
            onQuickAdd={() => setQuickAdd({ kind: 'business', role: 'consignee' })}
            onAddBranch={(ownerId) => setQuickBranch({ kind: 'business', ownerId, branchName: 'consigneeBranchId' })}
          />

          <div className="border-t border-gray-200 pt-5">
            <SectionHeading title="Route" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1 block text-sm font-medium">Port of loading</span>
                <AsyncPartySelect
                  name="loadingPort"
                  placeholder="Select Indian port"
                  rules={{ required: true }}
                  fetchOptions={async (query) => {
                    const res = await partyMockService.searchLoadingPorts(query)
                    return res.map((port) => ({
                      value: port.code,
                      label: `${port.name} · ${port.code}`,
                      sublabel: `Country: ${port.countryCode}`
                    }))
                  }}
                  getInitialLabel={async (code) => {
                    const port = await partyMockService.getPortByCode(code)
                    return port ? `${port.name} · ${port.code}` : code
                  }}
                />
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium">Final destination port</span>
                <AsyncPartySelect
                  name="finalDestinationPort"
                  placeholder="Select destination"
                  rules={{ required: true }}
                  fetchOptions={async (query) => {
                    const res = await partyMockService.searchDestinationPorts(query)
                    return res.map((port) => ({
                      value: port.code,
                      label: `${port.name} · ${port.code}`,
                      sublabel: `Country: ${port.countryCode}`
                    }))
                  }}
                  getInitialLabel={async (code) => {
                    const port = await partyMockService.getPortByCode(code)
                    return port ? `${port.name} · ${port.code}` : code
                  }}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Countries are derived from the port codes when saved: {portCountry(values.loadingPort) || '—'} →{' '}
              {portCountry(values.finalDestinationPort) || '—'}.
            </p>
          </div>
          <Advanced title="Regulatory and route exceptions">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select<ShippingBillFormValues>
                label="Discharge port"
                name="dischargePort"
                options={portOptions}
                placeholder="Defaults to destination"
              />
              <Select<ShippingBillFormValues>
                label="Origin state"
                name="originStateCode"
                options={stateOptions}
                placeholder="Defaults to Branch State Code"
              />
              <div></div>
              <Select<ShippingBillFormValues>
                label="NFEI category"
                name="nfeiCategory"
                options={[
                  ['01', 'Free trade sample'],
                  ['02', 'Diplomatic goods'],
                  ['03', 'Warranty replacement'],
                  ['07', 'Gift parcel'],
                  ['08', 'Other']
                ].map(([value, label]) => ({ value, label }))}
                placeholder="Not applicable"
              />
              <Input label="RBI waiver number" {...register('rbiWaiverNumber')} />
              <Input label="RBI waiver date" type={dateType} {...register('rbiWaiverDate')} />
            </div>
          </Advanced>

          <div className="border-t border-gray-200 pt-5">
            <SectionHeading title="Package Detail" />
            <div className="grid gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select<ShippingBillFormValues> label="Nature of cargo" name="natureOfCargo" options={cargoOptions} />
              <Input label="Gross weight" type="number" {...register('grossWeight')} />
              <Input label="Net weight" type="number" {...register('netWeight')} />
              <Select<ShippingBillFormValues> label="Weight unit" name="measurementUnit" options={weightUnits} />
              <Input label="Total packages" type="number" {...register('totalPackages')} />
              <Select<ShippingBillFormValues>
                label="Marks and numbers"
                name="marksAndNumbers"
                options={marksAndNumbersOptions}
                placeholder={
                  !values.exporterId
                    ? 'Select exporter first'
                    : marksAndNumbersLoading
                      ? 'Loading marks and numbers...'
                      : 'Select marks and numbers'
                }
                disabled={!values.exporterId || marksAndNumbersLoading || !marksAndNumbersOptions.length}
                wrapClass="sm:col-span-3"
              />
              {marksError && (
                <p role="alert" className="text-sm text-red-700 sm:col-span-4">
                  {marksError}
                </p>
              )}
              <Input
                label="Custom marks and numbers"
                value={values.marksAndNumbers ?? ''}
                onChange={(event) => setValue('marksAndNumbers', event.target.value, { shouldDirty: true })}
                wrapClass="sm:col-span-4"
              />
            </div>
            <Advanced title="Additional Details">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Select<ShippingBillFormValues>
                  label="Seal type"
                  name="sealType"
                  options={sealTypes}
                  placeholder="Select if relevant"
                />
                {values.containers.length === 0 && (
                  <Input label="Number of containers" type="number" {...register('numberOfContainers')} />
                )}
                <Input label="Loose packets" type="number" {...register('loosePackets')} />
                <Input label="MAWB number" {...register('mawbNumber')} />
                <Input label="HAWB number" {...register('hawbNumber')} />
              </div>
            </Advanced>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
