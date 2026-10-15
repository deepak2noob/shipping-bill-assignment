# Shipping Bill frontend refactor

A focused refactor of the assignment starter. React, React Hook Form and the existing `fe-zen-arch` workspace remain in place. No dependencies were added or upgraded. The application runs without a backend.

## Run locally

Use Node 24 and pnpm. From a Git checkout, initialize the existing submodule first:

```bash
git submodule update --init --recursive
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:5173. If using the supplied source ZIP, `fe-zen-arch` is already included and the submodule command is unnecessary.

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm lint-check
```

`pnpm test` uses Node's built-in test runner and the starter's existing esbuild dependency. No test framework was installed. The original lint pipeline also formats files before checking them; run `pnpm exec prettier --write src tests scripts README.md` first if needed. Domain dictionary spelling warnings in the original fixture data are non-blocking.

## What changed

- Replaced the 1,761-line form with focused shipment, invoice, item, charge and supporting-document components. Kept all original form fields, repeated sections, quick-add dialogs, list/edit navigation and demo download.
- Deduplicated five invoice charge rows in `invoice-charges.tsx`.
- Moved fixture data out of the domain model and components. `reference-service.ts` supplies options and parties asynchronously; `party-mock-service.ts` supports role-aware searches and quick additions.
- Removed calls to the unavailable hardcoded backend. `shipping-bill-service.ts` exposes asynchronous list, get, draft-save, final-save and download operations. Components receive domain objects rather than transport response shapes.
- Kept incomplete draft saving through **Save & Next**. Previous changes tabs without a write; final save validates the whole bill. Successful final saves remain editable. A failed save preserves inputs and permits retry.
- Added loading, error/retry, empty and not-found states. Obsolete requests are ignored after navigation, a changed search or unmount.
- Fixed buyer and third-party searches incorrectly filtering for consignees, loading-port label resolution, inconsistent buyer/total rules in downloads, and displayed list counts defaulting to one.
- Added job/date inputs and custom marks entry so these values are directly editable.

## Architecture and trade-offs

| File / area                                                                               | Responsibility                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `shipping-bill-form.tsx`                                                                  | Page loading, form orchestration, saves and quick-add dialog coordination |
| `shipment-details.tsx`, `invoice-editor.tsx`, `item-editor.tsx`, `supporting-details.tsx` | Focused form sections; existing fields remain available                   |
| `async-party-select.tsx`, `party-fields.tsx`                                              | Search/loading/error UI, party selection and dependent branches           |
| `bill-schema.ts`, `validation.ts`                                                         | Field registration rules and pure cross-field validation                  |
| `model.ts`                                                                                | Domain types, fresh defaults, calculations and canonical payload mapping  |
| `shipping-bill-service.ts`, `party-mock-service.ts`, `reference-service.ts`               | Promise-based interfaces to replace with real HTTP implementations        |
| `mock-request.ts`, `mock-data.ts`, `reference-fixtures.ts`, `demo-store.ts`               | Mock transport, fixtures and local persistence                            |
| `use-async-resource.ts`, `reference-data-context.ts`                                      | Request lifecycle and loaded reference data shared by the form            |
| `tests/shipping-bill-test.ts`                                                             | Domain and service regression tests                                       |

Form state stays in React Hook Form; no extra global state library or generic form framework was introduced. Context shares loaded lookup data, not editable form state. Sections remain mounted when tabs change, preserving registered fields. Reference reads and writes return copied values, so callers cannot mutate saved records by reference.

The shared `Form` retries writes automatically and disables successful forms. `BillForm` is a small local adapter to avoid duplicate write retries and keep saved bills editable; the submodule itself is unchanged. Quick-add dialogs retain the shared form's existing behavior.

Drafts are deliberately allowed to be incomplete. Final submission applies the same pure validation in the UI and service. The mock store uses localStorage when available and falls back to memory if storage is blocked. Clearing site data restores the sample records. This is single-browser demo persistence, not a database or multi-user system.

To integrate real APIs, replace service implementations, map responses to the existing domain types, and implement equivalent server-side validation. Components do not need to learn the HTTP response shape. The canonical mapper preserves the starter's backend key spellings; a real integration should confirm that contract.

## Domain assumptions

These are practical assignment rules, not exhaustive customs compliance:

- A bill has an exporter and consignee, each with a branch belonging to that party, an Indian loading port and a destination.
- A final bill has at least one invoice and each invoice at least one goods item. Invoice numbers are unique within a bill.
- RITC / HS codes use eight digits. Quantity and unit price must be finite positive numbers; optional amounts are non-negative. Percentage charges cannot exceed 100, and each charge uses either a rate or an amount.
- Net weight cannot exceed gross weight. Package ranges are positive whole numbers in ascending order.
- Buyer-same-as-consignee resolves at the save boundary. Otherwise a buyer and its branch are required. Third-party selection is conditional on the relevant fields/checkbox.
- Explicit line and invoice totals are retained as manual overrides, including zero; blank totals are derived. Different invoice currencies are not converted or combined into a monetary grand total.
- Paid IGST requires taxable value and tax amount; tax cannot exceed taxable value. Other statuses do not send those tax values.
- Added supporting documents require a type and either a document reference or image reference. Expiry must not precede issue date. Item references must belong to the chosen invoice.
- Optional licence export quantity cannot exceed licence quantity. Dates must be valid calendar dates.
- The retained `.sb` download is a **demonstration format**, not a certified customs filing. Draft downloads can contain incomplete values.

## Reproduce edge cases

- Normal data: `/` or `/shipping-bills/new`.
- Empty list and party search results: `/?mock=empty` or `/shipping-bills/new?mock=empty`.
- Failed requests: `/?mock=error` or `/shipping-bills/new?mock=error`.
- To test failed save after entering data, run `history.replaceState(null, '', '?mock=error')` in browser DevTools without reloading. Save should display an error and preserve inputs. Clear the query with `history.replaceState(null, '', location.pathname)` and retry.
- For loading, observe the deliberate 200ms service delay; searches also debounce input.
- Nonexistent record: `/shipping-bills/999999`.

## Validation and remaining manual checks

Automated coverage includes required fields, ownership, numeric/date rules, conditional buyer/IGST rules, duplicate invoices, document references, total overrides, create/edit persistence, incomplete drafts, role-aware searches, Indian port labels, and errors without partial writes.

Browser automation could not run in the execution environment: Chromium was absent and its download failed. Before submission, manually verify:

1. Open the seeded bill and change a value. Save, reopen and verify persistence.
2. Create a new bill, use Save & Next, refresh/reopen the draft, and complete final validation.
3. Change exporter and verify branch/marks reset; quick-add a party and branch and select them.
4. Add/remove multiple invoices and items; check buyer and item third-party flows.
5. Add containers, packing ranges, documents and licences; correct errors in each tab.
6. Test the loading, empty and error scenarios above, including a failed save followed by retry.
7. Use Tab, Enter and Space for search controls, and check the layout at narrow widths.
8. Download a demo flat file and verify its data against the saved bill.

## AI Usage & Approach

OpenAI Codex assisted with code inspection, component extraction, mock services, validation, regression tests and documentation. The approach preserved the existing stack and avoided new dependencies or a broad redesign. Specific engineering decisions included separate draft/final-save contracts, role-aware party searches, a local form wrapper without automatic write retries, and deterministic mock failures. Automated checks are recorded above; browser review remains outstanding. The submitting candidate should review the diff, run the app, and understand these choices before submitting or discussing them in an interview.
