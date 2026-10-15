import type { ReactNode } from 'react'
import { FormContext } from 'ui/form'
import type { BillFormContext } from './form-types'
import type { ShippingBillFormValues } from './model'

/** Unlike the shared form, never automatically retry writes or lock after success. */
export function BillForm({
  ctx,
  children,
  handleSubmit,
  className,
  busy = false
}: {
  busy?: boolean
  ctx: BillFormContext
  children: ReactNode
  handleSubmit: (values: ShippingBillFormValues) => Promise<void>
  className?: string
}) {
  return (
    <FormContext.Provider value={ctx}>
      <form noValidate onSubmit={ctx.hooks.handleSubmit(handleSubmit)}>
        <fieldset disabled={busy || ctx.hooks.formState.isSubmitting} className={className}>
          {children}
        </fieldset>
      </form>
    </FormContext.Provider>
  )
}
