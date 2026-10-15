import { routes } from '@/shared/route-paths'
import { useFieldArray, useForm } from 'core/form'
import { navigate, useParams } from 'core/routing'
import { toast } from 'core/toast-manager'
import { useCallback, useEffect, useState } from 'react'
import { Button } from 'ui/basic/button'
import { Tabs, TabsList, TabsTrigger } from 'ui/interactive/tabs'
import { Branch, Business, emptyBill, emptyInvoice, Exporter, SavedBill, ShippingBillFormValues } from './model'
import { BranchDialog, PartyDialog } from './party-dialogs'
import { ShipmentDetails } from './shipment-details'
import { shippingBillService } from './shipping-bill-service'
import { SupportingDetails } from './supporting-details'
import { workflowSteps } from './workflow'

import { BillForm } from './bill-form'
import { billSchema } from './bill-schema'
import { PersistentTab } from './form-sections'
import { QuickAdd, QuickBranch } from './form-types'
import { InvoiceEditor } from './invoice-editor'
import { ReferenceDataProvider, useReferenceData } from './reference-data-context'
import { referenceService } from './reference-service'
import { useAsyncResource } from './use-async-resource'
import { BillValidationError, validateBill } from './validation'
function BillEditor({ bill }: { bill?: SavedBill }) {
  const { data: reference, refresh } = useReferenceData()
  const { businesses } = reference
  const formCtx = useForm<ShippingBillFormValues>(billSchema, { defaultValues: bill?.values ?? emptyBill() })
  const { control, setValue, formState } = formCtx.hooks
  const values = formCtx.hooks.watch()
  const { fields: invoices, append: addInvoice, remove: removeInvoice } = useFieldArray({ control, name: 'invoices' })
  const [activeTab, setActiveTab] = useState('details')
  const [draftId, setDraftId] = useState<number | undefined>(bill?.id)
  const [quickAdd, setQuickAdd] = useState<QuickAdd | null>(null)
  const [quickBranch, setQuickBranch] = useState<QuickBranch | null>(null)
  useEffect(() => {
    if (!formState.submitCount || !Object.keys(formState.errors).length) return
    console.log('Form validation errors on submit:', formState.errors)
    toast.error('Please check the required fields')
    if (
      [
        'jobDate',
        'exporterId',
        'exporterBranchId',
        'consigneeId',
        'consigneeBranchId',
        'loadingPort',
        'finalDestinationPort'
      ].some((field) => field in formState.errors)
    )
      setActiveTab('details')
    else if (formState.errors.invoices) setActiveTab('invoices')
    else if (
      formState.errors.containers ||
      formState.errors.packingRanges ||
      formState.errors.documents ||
      formState.errors.licenses
    )
      setActiveTab('documents')
    // else: keep user on whichever tab they submitted from
  }, [formState.submitCount, formState.errors])

  const [saveError, setSaveError] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)
  async function saveAndNext() {
    if (savingDraft) return
    setSavingDraft(true)
    setSaveError('')
    try {
      const saved = await shippingBillService.saveDraft(formCtx.hooks.getValues(), draftId)
      setDraftId(saved.id)
      toast.success('Draft saved')
      setActiveTab(activeTab === 'details' ? 'invoices' : 'documents')
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save draft. Please retry.')
    } finally {
      setSavingDraft(false)
    }
  }
  async function handleSave(data: ShippingBillFormValues) {
    setSaveError('')
    formCtx.hooks.clearErrors()
    function showIssues(issues: ReturnType<typeof validateBill>) {
      for (const issue of issues)
        formCtx.hooks.setError(issue.path as import('ui/form').Path<ShippingBillFormValues>, {
          type: 'validate',
          message: issue.message
        })
      const first = issues[0]?.path ?? ''
      setActiveTab(
        first.startsWith('invoices')
          ? 'invoices'
          : /^(documents|containers|packingRanges|licenses)/.test(first)
            ? 'documents'
            : 'details'
      )
      setSaveError(issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '))
    }
    const issues = validateBill(data, reference)
    if (issues.length) {
      showIssues(issues)
      return
    }
    try {
      const saved = await shippingBillService.upsert(data, draftId)
      setDraftId(saved.id)
      formCtx.hooks.reset(saved.values)
      toast.success(bill ? 'Shipping bill updated' : 'Shipping bill created')
      if (!bill) navigate(routes.toShippingBillEdit(saved.id))
    } catch (error: unknown) {
      if (error instanceof BillValidationError) showIssues(error.issues)
      else setSaveError(error instanceof Error ? error.message : 'Unable to save. Please retry.')
    }
  }

  function handleQuickSaved(party: Exporter | Business) {
    void refresh()
    const branchId = party.branches[0]?.id
    if (!quickAdd || !branchId) return
    if (quickAdd.kind === 'exporter') {
      setValue('exporterId', String(party.id), { shouldValidate: true })
      setValue('exporterBranchId', String(branchId), { shouldValidate: true })
    } else if (quickAdd.role === 'consignee') {
      setValue('consigneeId', String(party.id), { shouldValidate: true })
      setValue('consigneeBranchId', String(branchId), { shouldValidate: true })
    } else if (quickAdd.role === 'itemThirdParty' && quickAdd.invoiceIndex != null && quickAdd.itemIndex != null) {
      setValue(`invoices.${quickAdd.invoiceIndex}.items.${quickAdd.itemIndex}.itemThirdPartyId`, String(party.id), {
        shouldValidate: true
      })
      setValue(
        `invoices.${quickAdd.invoiceIndex}.items.${quickAdd.itemIndex}.itemThirdPartyBranchId`,
        String(branchId),
        { shouldValidate: true }
      )
    } else if (quickAdd.invoiceIndex != null) {
      const field = quickAdd.role === 'buyer' ? 'buyer' : 'thirdParty'
      setValue(`invoices.${quickAdd.invoiceIndex}.${field}Id`, String(party.id), { shouldValidate: true })
      setValue(`invoices.${quickAdd.invoiceIndex}.${field}BranchId`, String(branchId), { shouldValidate: true })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button className="mb-2 text-sm text-gray-500 hover:underline" onClick={() => navigate(routes.dashboard)}>
            ← Shipping bills
          </button>
          <h1 className="text-2xl font-semibold text-gray-950">
            {bill ? `Edit shipping bill #${bill.id}` : 'New shipping bill'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the everyday details first. Open advanced sections only when needed.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {workflowSteps.map((step, index) => {
          const isShippingBill = step.id === 'shipping-bill'
          return (
            <div
              key={step.id}
              className={`rounded-lg border p-3 ${
                isShippingBill ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-gray-50'
              }`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs">
                  {index + 1}
                </span>
                {step.title}
              </div>
              <p className="ml-8 text-xs text-gray-500">{step.description}</p>
            </div>
          )
        })}
      </div>
      <BillForm busy={savingDraft} ctx={formCtx} handleSubmit={handleSave} className="space-y-5">
        {saveError && (
          <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {saveError}
          </p>
        )}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))}>
          <TabsList className="flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="details">1. Details</TabsTrigger>
            <TabsTrigger value="invoices">2. Invoices & goods</TabsTrigger>
            <TabsTrigger value="documents">3. Others</TabsTrigger>
          </TabsList>

          <PersistentTab value="details" activeTab={activeTab} className="space-y-4">
            <ShipmentDetails formCtx={formCtx} setQuickAdd={setQuickAdd} setQuickBranch={setQuickBranch} />
          </PersistentTab>

          <PersistentTab value="invoices" activeTab={activeTab} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Invoices & goods</h2>
                <p className="text-sm text-gray-500">One invoice and one item are ready to fill in.</p>
              </div>
              <Button variant="outline" onClick={() => addInvoice(emptyInvoice())}>
                + Add invoice
              </Button>
            </div>
            {invoices.map((field, index) => (
              <InvoiceEditor
                key={field.id}
                formCtx={formCtx}
                index={index}
                invoice={values.invoices[index] ?? emptyInvoice()}
                businesses={businesses}
                onQuickAdd={(role, invoiceIndex, itemIndex) =>
                  setQuickAdd({ kind: 'business', role, invoiceIndex, itemIndex })
                }
                onAddBranch={(ownerId, branchName) => setQuickBranch({ kind: 'business', ownerId, branchName })}
                onRemove={() => removeInvoice(index)}
                canRemove={invoices.length > 1}
              />
            ))}
          </PersistentTab>

          <PersistentTab value="documents" activeTab={activeTab} className="space-y-4">
            <SupportingDetails formCtx={formCtx} />
          </PersistentTab>
        </Tabs>
        <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate(routes.dashboard)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'details' && (
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setActiveTab(activeTab === 'documents' ? 'invoices' : 'details')
                }}>
                Previous
              </Button>
            )}
            {activeTab !== 'documents' ? (
              <Button
                type="button"
                disabled={savingDraft}
                onClick={() => {
                  void saveAndNext()
                }}>
                {savingDraft ? 'Saving…' : 'Save & Next'}
              </Button>
            ) : (
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </div>
        </div>
      </BillForm>
      {quickAdd && (
        <PartyDialog
          key={`${quickAdd.kind}-${quickAdd.role ?? 'exporter'}-${quickAdd.invoiceIndex ?? 0}`}
          kind={quickAdd.kind}
          initialRole={quickAdd.role === 'itemThirdParty' ? 'thirdParty' : quickAdd.role}
          onClose={() => setQuickAdd(null)}
          onSaved={handleQuickSaved}
        />
      )}
      {quickBranch && (
        <BranchDialog
          key={`${quickBranch.kind}-${quickBranch.ownerId}`}
          kind={quickBranch.kind}
          ownerId={quickBranch.ownerId}
          onClose={() => setQuickBranch(null)}
          onSaved={(branch: Branch) => {
            void refresh()
            setValue(quickBranch.branchName, String(branch.id), { shouldValidate: true })
          }}
        />
      )}
    </div>
  )
}

export default function ShippingBillPage() {
  const { id } = useParams<{ id?: string }>()
  const load = useCallback(async () => {
    const [reference, bill] = await Promise.all([
      referenceService.load(),
      id ? shippingBillService.getById(id) : Promise.resolve(undefined)
    ])
    return { reference, bill }
  }, [id])
  const resource = useAsyncResource(load)
  const [reference, setReference] = useState<import('./reference-service').ReferenceData>()
  useEffect(() => {
    setReference(resource.data?.reference)
  }, [resource.data])
  async function refresh() {
    try {
      setReference(await referenceService.load())
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unable to refresh parties.')
    }
  }
  if (resource.loading) return <p role="status">Loading shipping bill and form options…</p>
  if (resource.error)
    return (
      <div role="alert">
        <p>{resource.error}</p>
        <Button onClick={resource.retry}>Retry</Button>
      </div>
    )
  if (id && !resource.data?.bill)
    return (
      <div>
        <h1>Shipping bill not found</h1>
        <Button onClick={() => navigate(routes.dashboard)}>Back to list</Button>
      </div>
    )
  if (!reference) return <p role="status">Preparing form…</p>
  return (
    <ReferenceDataProvider value={{ data: reference, refresh }}>
      <BillEditor key={id ?? 'new'} bill={resource.data?.bill} />
    </ReferenceDataProvider>
  )
}
