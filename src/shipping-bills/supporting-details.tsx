import { useFieldArray } from 'core/form'
import { Button } from 'ui/basic/button'
import { Card, CardContent, CardHeader } from 'ui/basic/card'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { emptyDocument, ShippingBillFormValues } from './model'

import { DocumentItem } from './document-item'
import { Advanced, SectionHeading } from './form-sections'
import { BillFormContext } from './form-types'
const dateType = 'date' as 'text'
export function SupportingDetails({ formCtx }: { formCtx: BillFormContext }) {
  const { register, control } = formCtx.hooks
  const {
    fields: containers,
    append: addContainer,
    remove: removeContainer
  } = useFieldArray({ control, name: 'containers' })
  const {
    fields: packingRanges,
    append: addPackingRange,
    remove: removePackingRange
  } = useFieldArray({ control, name: 'packingRanges' })
  const {
    fields: documents,
    append: addDocument,
    remove: removeDocument
  } = useFieldArray({ control, name: 'documents' })
  const { fields: licenses, append: addLicense, remove: removeLicense } = useFieldArray({ control, name: 'licenses' })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Cargo & Package Detail" />
        <CardContent className="space-y-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionHeading
              title={`Containers (${containers.length})`}
              description="Add only when the cargo is containerized."
            />
            <Button size="sm" variant="outline" onClick={() => addContainer({ containerNumber: '' })}>
              + Add container
            </Button>
          </div>
          <div className="space-y-3">
            {containers.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-3 flex justify-between">
                  <h3 className="text-sm font-semibold">Container {index + 1}</h3>
                  <Button size="sm" variant="ghost" onClick={() => removeContainer(index)}>
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input label="Container number" {...register(`containers.${index}.containerNumber`)} />
                  <Select<ShippingBillFormValues>
                    label="Size"
                    name={`containers.${index}.containerSize`}
                    options={[
                      { value: '20', label: '20 ft' },
                      { value: '40', label: '40 ft' },
                      { value: '45', label: '45 ft' }
                    ]}
                    placeholder="Select size"
                  />
                  <Input label="Seal number" {...register(`containers.${index}.exciseSealNumber`)} />
                  <Input label="Seal date" type={dateType} {...register(`containers.${index}.sealDate`)} />
                  <Select<ShippingBillFormValues>
                    label="Seal type"
                    name={`containers.${index}.sealType`}
                    options={[
                      { value: 1, label: 'BTSL - Bottle Seal' },
                      { value: 2, label: 'ESEAL - Electronic Seal' },
                      { value: 3, label: 'RFID - Radio Frequency Identifier' }
                    ]}
                    placeholder="Select if needed"
                  />
                  <Input label="Seal device ID" {...register(`containers.${index}.sealDeviceId`)} />
                  <Input label="Movement document type" {...register(`containers.${index}.movementDocumentType`)} />
                  <Input label="Movement document number" {...register(`containers.${index}.movementDocumentNumber`)} />
                </div>
              </div>
            ))}
          </div>
          <Advanced title={`Packing list ranges (${packingRanges.length})`}>
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPackingRange({ packingNumberFrom: '', packingNumberTo: '' })}>
                + Add packing range
              </Button>
              {packingRanges.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">Range {index + 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => removePackingRange(index)}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                      label="Package from"
                      type="number"
                      {...register(`packingRanges.${index}.packingNumberFrom`)}
                    />
                    <Input label="Package to" type="number" {...register(`packingRanges.${index}.packingNumberTo`)} />
                    <Input label="Packing code" {...register(`packingRanges.${index}.packingCode`)} />
                  </div>
                </div>
              ))}
            </div>
          </Advanced>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-950">Supporting documents</h3>
            <p className="mt-1 text-sm text-gray-500">Add references when required for this shipment.</p>
          </div>
          {documents.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => addDocument(emptyDocument())}>
              + Add document
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {documents.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => addDocument(emptyDocument())}>
              + Add document
            </Button>
          )}
          {documents.map((field, index) => (
            <DocumentItem key={field.id} formCtx={formCtx} index={index} onRemove={() => removeDocument(index)} />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-950">Licences</h3>
            <p className="mt-1 text-sm text-gray-500">Only enter these for schemes that require a licence.</p>
          </div>
          {licenses.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => addLicense({ registrationNumber: '' })}>
              + Add licence
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {licenses.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => addLicense({ registrationNumber: '' })}>
              + Add licence
            </Button>
          )}
          {licenses.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex justify-between">
                <h3 className="text-sm font-semibold">Licence {index + 1}</h3>
                <Button size="sm" variant="ghost" onClick={() => removeLicense(index)}>
                  Remove
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="Registration number" {...register(`licenses.${index}.registrationNumber`)} />
                <Input label="Registration date" type={dateType} {...register(`licenses.${index}.registrationDate`)} />
                <Input
                  label="Invoice serial number"
                  type="number"
                  {...register(`licenses.${index}.invoiceSerialNumber`)}
                />
                <Input label="Item serial number" type="number" {...register(`licenses.${index}.itemSerialNumber`)} />
                <Input
                  label="Licence serial number"
                  type="number"
                  {...register(`licenses.${index}.licenseSerialNumber`)}
                />
                <Input label="Item serial, Part E" {...register(`licenses.${index}.itemSerialNumberPartE`)} />
                <Input label="Item serial, Part C" {...register(`licenses.${index}.itemSerialNumberPartC`)} />
                <Input label="Licence quantity" type="number" {...register(`licenses.${index}.licenseQuantity`)} />
                <Input label="Export quantity" type="number" {...register(`licenses.${index}.licenseExportQuantity`)} />
                <Select<ShippingBillFormValues>
                  label="Goods source"
                  name={`licenses.${index}.indigenousOrImported`}
                  options={[
                    { value: 'I', label: 'Imported' },
                    { value: 'D', label: 'Indigenous' }
                  ]}
                  placeholder="Select if needed"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
