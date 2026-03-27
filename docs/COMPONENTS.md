# Reusable Frontend Components

This document catalogs the reusable React components and custom hooks in this repository so contributors can quickly discover what exists, what props are accepted, and how to use each item.

> Conventions:
> - `Props` tables list the component-specific props (not all inherited DOM attributes like `onClick` unless explicitly declared).
> - `Default` is `—` when no explicit default is set in the component signature.
> - `Dependencies` tags highlight wallet-connection and API/socket/data-fetch coupling when detectable from the source.

## Components by Feature

<!-- COMPONENTS_SPLITS -->

### `SplitHeader`

Displays a summary for a split: title, status (pending/paid), date, and total amount.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `split` | `Split` | Yes | — |

```tsx
import { SplitHeader } from "@components/Split/SplitHeader"

export function Example() {
  return (
    <SplitHeader
      split={
        {
          title: "Dinner",
          status: "active",
          date: "2026-01-15",
          totalAmount: 42.5,
          currency: "USD",
        } as any
      }
    />
  )
}
```

### `ParticipantList`

Renders the participant list for a split with avatars, paid/pending status, and amount owed.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `participants` | `Participant[]` | Yes | — |
| `currency` | `string` | Yes | — |

```tsx
import { ParticipantList } from "@components/Split/ParticipantList"

export function Example() {
  return (
    <ParticipantList
      participants={[
        {
          id: "u1",
          name: "Alice",
          avatar: null,
          isCurrentUser: true,
          status: "paid",
          amountOwed: 10,
        } as any,
      ]}
      currency="USD"
    />
  )
}
```

### `ItemList`

Displays the receipt items for a split and calculates the subtotal.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `items` | `Item[]` | Yes | — |
| `currency` | `string` | Yes | — |

```tsx
import { ItemList } from "@components/Split/ItemList"

export function Example() {
  return (
    <ItemList
      items={[
        {
          id: "i1",
          name: "Pizza",
          price: 12,
          quantity: 2,
          unitPrice: 6,
        } as any,
      ]}
      currency="USD"
    />
  )
}
```

### `ShareModal`

Modal that shows a QR-style share card for a split link and lets the user copy or invoke the Web Share API.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | — |
| `onClose` | `() => void` | Yes | — |
| `splitLink` | `string` | Yes | — |

```tsx
import { ShareModal } from "@components/Split/ShareModal"

export function Example() {
  return (
    <ShareModal
      isOpen={true}
      onClose={() => {}}
      splitLink="https://example.com/split/abc"
    />
  )
}
```

### `LoadingSkeleton`

Skeleton UI used while split content is loading.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { LoadingSkeleton } from "@components/Split/LoadingSkeleton"

export function Example() {
  return <LoadingSkeleton />
}
```

### `SplitCalculator`

Calculator UI for creating split amounts. Hosts multiple calculation modes (equal, itemized, percentage, custom) and shows a summary.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { SplitCalculator } from "@components/SplitCalculator/SplitCalculator"

export function Example() {
  return <SplitCalculator />
}
```

### `CalculationSummary`

Shows a table-like summary of participant amounts, optionally includes rounding info, and provides a “copy to clipboard” export action.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `participants` | `Participant[]` | Yes | — |
| `subtotal` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `rounding` | `'none' \| 'up' \| 'down' \| 'nearest'` | Yes | — |

```tsx
import { CalculationSummary } from "@components/SplitCalculator/CalculationSummary"

export function Example() {
  return (
    <CalculationSummary
      participants={[{ id: "u1", name: "Alice", amount: 10 } as any]}
      subtotal={20}
      currency="USD"
      rounding="none"
    />
  )
}
```

### `CustomSplitCalc`

Custom split calculator that lets you set a total amount and manually allocate amounts across participants.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `participants` | `Participant[]` | Yes | — |
| `totalAmount` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `onParticipantsChange` | `(participants: Participant[]) => void` | Yes | — |
| `onTotalChange` | `(total: number) => void` | Yes | — |

```tsx
import { CustomSplitCalc } from "@components/SplitCalculator/CustomSplitCalc"

export function Example() {
  return (
    <CustomSplitCalc
      participants={[{ id: "u1", name: "Alice", amount: 0, percentage: 0, items: [] } as any]}
      totalAmount={100}
      currency="USD"
      onParticipantsChange={() => {}}
      onTotalChange={() => {}}
    />
  )
}
```

### `EqualSplitCalc`

Equal split calculator. User sets total, tax, and tip; participant amounts are derived per person.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `participants` | `Participant[]` | Yes | — |
| `totalAmount` | `number` | Yes | — |
| `taxAmount` | `number` | Yes | — |
| `tipAmount` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `onParticipantsChange` | `(participants: Participant[]) => void` | Yes | — |
| `onTotalChange` | `(total: number) => void` | Yes | — |
| `onTaxChange` | `(tax: number) => void` | Yes | — |
| `onTipChange` | `(tip: number) => void` | Yes | — |

```tsx
import { EqualSplitCalc } from "@components/SplitCalculator/EqualSplitCalc"

export function Example() {
  return (
    <EqualSplitCalc
      participants={[{ id: "u1", name: "Alice", amount: 0, percentage: 0, items: [] } as any]}
      totalAmount={100}
      taxAmount={5}
      tipAmount={10}
      currency="USD"
      onParticipantsChange={() => {}}
      onTotalChange={() => {}}
      onTaxChange={() => {}}
      onTipChange={() => {}}
    />
  )
}
```

### `PercentageSplitCalc`

Percentage split calculator. Allocations are based on participant percentages that must sum to 100%.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `participants` | `Participant[]` | Yes | — |
| `totalAmount` | `number` | Yes | — |
| `taxAmount` | `number` | Yes | — |
| `tipAmount` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `onParticipantsChange` | `(participants: Participant[]) => void` | Yes | — |
| `onTotalChange` | `(total: number) => void` | Yes | — |
| `onTaxChange` | `(tax: number) => void` | Yes | — |
| `onTipChange` | `(tip: number) => void` | Yes | — |

```tsx
import { PercentageSplitCalc } from "@components/SplitCalculator/PercentageSplitCalc"

export function Example() {
  return (
    <PercentageSplitCalc
      participants={[
        { id: "u1", name: "Alice", amount: 0, percentage: 100, items: [] } as any,
      ]}
      totalAmount={100}
      taxAmount={5}
      tipAmount={10}
      currency="USD"
      onParticipantsChange={() => {}}
      onTotalChange={() => {}}
      onTaxChange={() => {}}
      onTipChange={() => {}}
    />
  )
}
```

### `ItemizedSplitCalc`

Itemized split calculator. Lets you assign line items to participants, then computes each participant’s share.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `participants` | `Participant[]` | Yes | — |
| `items` | `SplitItem[]` | Yes | — |
| `taxAmount` | `number` | Yes | — |
| `tipAmount` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `onParticipantsChange` | `(participants: Participant[]) => void` | Yes | — |
| `onItemsChange` | `(items: SplitItem[]) => void` | Yes | — |
| `onTaxChange` | `(tax: number) => void` | Yes | — |
| `onTipChange` | `(tip: number) => void` | Yes | — |

```tsx
import { ItemizedSplitCalc } from "@components/SplitCalculator/ItemizedSplitCalc"

export function Example() {
  return (
    <ItemizedSplitCalc
      participants={[{ id: "u1", name: "Alice", amount: 0, percentage: 0, items: [] } as any]}
      items={[{ id: "it1", name: "Pizza", price: 12, assignedTo: ["u1"] } as any]}
      taxAmount={5}
      tipAmount={10}
      currency="USD"
      onParticipantsChange={() => {}}
      onItemsChange={() => {}}
      onTaxChange={() => {}}
      onTipChange={() => {}}
    />
  )
}
```

### `CreateGroupModal`

Dialog for creating a new expense group, including step-by-step details, avatar selection, and member management.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `open` | `boolean` | Yes | — |
| `onOpenChange` | `(open: boolean) => void` | Yes | — |
| `onCreated` | `(group: Group) => void` | Yes | — |
| `currentUserId` | `string` | No | `"me"` |
| `currentUserName` | `string` | No | `"You"` |
| `currentUserEmail` | `string` | No | `"you@example.com"` |

```tsx
import { CreateGroupModal } from "@components/SplitGroup/CreateGroupModal"

export function Example() {
  return (
    <CreateGroupModal
      open={true}
      onOpenChange={() => {}}
      onCreated={() => {}}
    />
  )
}
```

### `GroupCard`

Compact card UI for a group, including a hover actions menu (edit/settings, create split, delete), member stack, and quick stats.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `group` | `Group` | Yes | — |
| `isRecent` | `boolean` | No | `false` |
| `onUpdate` | `(group: Group) => void` | Yes | — |
| `onDelete` | `(id: string) => void` | Yes | — |
| `onCreateSplit` | `(group: Group) => void` | Yes | — |
| `className` | `string` | No | — |

```tsx
import { GroupCard } from "@components/SplitGroup/GroupCard"

export function Example() {
  return (
    <GroupCard
      group={{ id: "g1" } as any}
      onUpdate={() => {}}
      onDelete={() => {}}
      onCreateSplit={() => {}}
    />
  )
}
```

### `GroupEditor`

Dialog for editing an existing group: settings (name/description/avatar) and member/danger actions.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `group` | `Group` | Yes | — |
| `open` | `boolean` | Yes | — |
| `onOpenChange` | `(open: boolean) => void` | Yes | — |
| `onSave` | `(updated: Group) => void` | Yes | — |
| `onDelete` | `(id: string) => void` | Yes | — |
| `onCreateSplit` | `(group: Group) => void` | Yes | — |

```tsx
import { GroupEditor } from "@components/SplitGroup/GroupEditor"

export function Example() {
  return (
    <GroupEditor
      group={{ id: "g1", name: "My Group" } as any}
      open={true}
      onOpenChange={() => {}}
      onSave={() => {}}
      onDelete={() => {}}
      onCreateSplit={() => {}}
    />
  )
}
```

### `MemberList`

Editable member list with drag-and-drop reordering, role selection (owner/admin/member), and optional autocomplete suggestions.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `members` | `Member[]` | Yes | — |
| `onChange` | `(members: Member[]) => void` | Yes | — |
| `canEdit` | `boolean` | No | `true` |

```tsx
import { MemberList } from "@components/SplitGroup/MemberList"

export function Example() {
  return (
    <MemberList
      members={[{ id: "u1", name: "Alice", email: "a@example.com" } as any]}
      onChange={() => {}}
      canEdit={true}
    />
  )
}
```

### `HistoryFilters`

Filtering UI for Split History: search text, status toggles, role filter, and sort order.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `FiltersState` | Yes | — |
| `onChange` | `(next: FiltersState) => void` | Yes | — |

```tsx
import { HistoryFilters } from "@components/SplitHistory/HistoryFilters"

export function Example() {
  return (
    <HistoryFilters
      value={
        {
          statuses: new Set(["active"]),
          role: "all",
          search: "",
          sort: "date-desc",
        } as any
      }
      onChange={() => {}}
    />
  )
}
```

### `HistorySummary`

Sidebar summary for Split History results: totals, average label, and per-status counts.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `total` | `number` | Yes | — |
| `totalAmountLabel` | `string` | Yes | — |
| `active` | `number` | Yes | — |
| `completed` | `number` | Yes | — |
| `cancelled` | `number` | Yes | — |
| `averageLabel` | `string` | Yes | — |

```tsx
import { HistorySummary } from "@components/SplitHistory/HistorySummary"

export function Example() {
  return (
    <HistorySummary
      total={10}
      totalAmountLabel="$250.00"
      active={3}
      completed={6}
      cancelled={1}
      averageLabel="$25.00"
    />
  )
}
```

### `SplitCard`

Row/card UI representing a split in history, including title/subtitle, status/role badges, participant list, and an amount label.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `title` | `string` | Yes | — |
| `subtitle` | `string` | Yes | — |
| `amountLabel` | `string` | Yes | — |
| `status` | `SplitStatus` | Yes | — |
| `role` | `SplitRole` | Yes | — |
| `participants` | `string[]` | Yes | — |

```tsx
import { SplitCard } from "@components/SplitHistory/SplitCard"

export function Example() {
  return (
    <SplitCard
      title="Dinner"
      subtitle="Jan 15"
      amountLabel="$42.50"
      status="active"
      role="creator"
      participants={["Alice", "Bob"]}
    />
  )
}
```

### `SplitTimeline`

Groups and renders Split History entries over time (month/year sections) using `SplitCard`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `splits` | `HistorySplit[]` | Yes | — |

```tsx
import { SplitTimeline } from "@components/SplitHistory/SplitTimeline"

export function Example() {
  return <SplitTimeline splits={[{ id: "s1", date: "2026-01-15" } as any]} />
}
```

### `SplitCreationWizard`

Full multi-step wizard that creates a split (basic info, split method, participants, optional items, tax/tip, and review). Also autosaves a draft to `localStorage`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { SplitCreationWizard } from "@components/SplitWizard/SplitCreationWizard"

export function Example() {
  return <SplitCreationWizard />
}
```

### `StepIndicator`

Wizard step progress indicator that shows numbered/checked steps and a connecting progress line.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `steps` | `{ label: string }[]` | Yes | — |
| `currentStep` | `number` | Yes | — |

```tsx
import { StepIndicator } from "@components/SplitWizard/StepIndicator"

export function Example() {
  return <StepIndicator steps={[{ label: "Basic" }, { label: "Review" }]} currentStep={0} />
}
```

### `BasicInfoStep`

Wizard step for entering split title, currency, and total amount.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `Pick<WizardState, 'title' \| 'currency' \| 'totalAmount'>` | Yes | — |
| `onChange` | `(patch: Partial<WizardState>) => void` | Yes | — |
| `errors` | `Record<string, string>` | Yes | — |

```tsx
import { BasicInfoStep } from "@components/SplitWizard/steps/BasicInfoStep"

export function Example() {
  return (
    <BasicInfoStep
      value={{ title: "", currency: "USD", totalAmount: 0 } as any}
      onChange={() => {}}
      errors={{}}
    />
  )
}
```

### `SplitMethodStep`

Wizard step for choosing the split method (equal/itemized/percentage/custom).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `Pick<WizardState, 'splitMethod'>` | Yes | — |
| `onChange` | `(patch: Partial<WizardState>) => void` | Yes | — |

```tsx
import { SplitMethodStep } from "@components/SplitWizard/steps/SplitMethodStep"

export function Example() {
  return <SplitMethodStep value={{ splitMethod: "equal" } as any} onChange={() => {}} />
}
```

### `ParticipantsStep`

Wizard step for defining participants, including per-participant fields depending on the selected split method.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `Pick<WizardState, 'participants' \| 'splitMethod' \| 'totalAmount'>` | Yes | — |
| `onChange` | `(patch: Partial<WizardState>) => void` | Yes | — |
| `errors` | `Record<string, string>` | Yes | — |

```tsx
import { ParticipantsStep } from "@components/SplitWizard/steps/ParticipantsStep"

export function Example() {
  return (
    <ParticipantsStep
      value={
        {
          participants: [],
          splitMethod: "equal",
          totalAmount: 0,
        } as any
      }
      onChange={() => {}}
      errors={{}}
    />
  )
}
```

### `ItemsStep`

Wizard step for adding receipt line items and assigning them to participants (used for itemized splits).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `Pick<WizardState, 'items' \| 'participants' \| 'currency'>` | Yes | — |
| `onChange` | `(patch: Partial<WizardState>) => void` | Yes | — |
| `errors` | `Record<string, string>` | Yes | — |

```tsx
import { ItemsStep } from "@components/SplitWizard/steps/ItemsStep"

export function Example() {
  return (
    <ItemsStep
      value={{ items: [], participants: [], currency: "USD" } as any}
      onChange={() => {}}
      errors={{}}
    />
  )
}
```

### `TaxTipStep`

Wizard step for entering tax and tip amounts (with quick percentage buttons).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `Pick<WizardState, 'taxAmount' \| 'tipAmount' \| 'totalAmount' \| 'currency'>` | Yes | — |
| `onChange` | `(patch: Partial<WizardState>) => void` | Yes | — |
| `errors` | `Record<string, string>` | Yes | — |

```tsx
import { TaxTipStep } from "@components/SplitWizard/steps/TaxTipStep"

export function Example() {
  return (
    <TaxTipStep
      value={{ taxAmount: 0, tipAmount: 0, totalAmount: 0, currency: "USD" } as any}
      onChange={() => {}}
      errors={{}}
    />
  )
}
```

### `ReviewStep`

Final wizard step that summarizes all entered data before submission.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `WizardState` | Yes | — |

```tsx
import { ReviewStep } from "@components/SplitWizard/steps/ReviewStep"

export function Example() {
  return <ReviewStep value={{} as any} />
}
```

<!-- COMPONENTS_PAYMENTS -->

### `PaymentButton`

Sticky/mobile-friendly payment call-to-action button that displays the amount and triggers `onClick`.

**Dependencies:** Wallet (UI triggers wallet-backed flow in parent)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `amount` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `onClick` | `() => void` | Yes | — |
| `disabled` | `boolean` | No | — |

```tsx
import { PaymentButton } from "@components/Payment/PaymentButton"

export function Example() {
  return (
    <PaymentButton
      amount={42.5}
      currency="USD"
      onClick={() => {}}
      disabled={false}
    />
  )
}
```

### `PaymentModal`

Confirm-payment modal: shows amount, generates a payment QR (`QRCodeGenerator`), and optionally lets the user scan a QR (`QRCodeScanner`) to pre-fill/handle payment via `PaymentURIHandler`.

**Dependencies:** Wallet deep-linking (Freighter-style payment links)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | — |
| `onClose` | `() => void` | Yes | — |
| `amount` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `destination` | `string` | Yes | — |
| `splitId` | `string` | Yes | — |
| `onConfirm` | `() => void` | Yes | — |
| `onConfirmScannedPayment` | `(payment: ParsedStellarPaymentURI) => Promise<void> \| void` | No | — |
| `isProcessing` | `boolean` | No | — |

```tsx
import { PaymentModal } from "@components/Payment/PaymentModal"

export function Example() {
  return (
    <PaymentModal
      isOpen={true}
      onClose={() => {}}
      amount={42.5}
      currency="USD"
      destination="GABC..."
      splitId="split-123"
      onConfirm={() => {}}
      isProcessing={false}
    />
  )
}
```

### `QRCodeGenerator`

Generates a QR code for a Stellar payment request and provides actions for copying the payment URI and downloading the QR image.

**Dependencies:** Wallet deep-linking (builds wallet + web fallback links)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `paymentRequest` | `StellarPaymentRequest` | Yes | — |
| `title` | `string` | No | `"Payment QR"` |
| `size` | `number` | No | `224` |

```tsx
import { QRCodeGenerator } from "@components/Payment/QRCodeGenerator"

export function Example() {
  return (
    <QRCodeGenerator
      paymentRequest={{ destination: "GABC...", amount: "42.5", memo: "split-123" } as any}
    />
  )
}
```

### `QRCodeScanner`

Modal that scans a QR from the user’s camera (or an uploaded image) and confirms when it finds a valid Stellar payment URI.

**Dependencies:** Wallet URI parsing

| Prop | Type | Required? | Default |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | — |
| `onClose` | `() => void` | Yes | — |
| `onConfirm` | `(payment: ParsedStellarPaymentURI) => void` | Yes | — |

```tsx
import { QRCodeScanner } from "@components/Payment/QRCodeScanner"

export function Example() {
  return (
    <QRCodeScanner
      isOpen={true}
      onClose={() => {}}
      onConfirm={() => {}}
    />
  )
}
```

### `PaymentURIHandler`

Given a `paymentURI` (or reads it from the current URL), parses it into Stellar payment details, builds deep links, and (optionally) exposes a “Confirm and Pay” action via `onPay`.

**Dependencies:** Wallet deep-linking

| Prop | Type | Required? | Default |
|---|---|---|---|
| `paymentURI` | `string \| null \| undefined` | No | — |
| `onPay` | `(payment: ParsedStellarPaymentURI) => Promise<void> \| void` | No | — |

```tsx
import { PaymentURIHandler } from "@components/Payment/PaymentURIHandler"

export function Example() {
  return (
    <PaymentURIHandler
      paymentURI="stellar-pay:..."
      onPay={() => {}}
    />
  )
}
```

### `QRDownload`

Downloads the QR image as a PNG by finding a `canvas` element inside `qrContainerRef`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `qrContainerRef` | `RefObject<HTMLElement \| null>` | Yes | — |
| `fileName` | `string` | No | `"stellar-payment-qr.png"` |
| `className` | `string` | No | — |
| `onError` | `(error: Error) => void` | No | — |

```tsx
import { QRDownload } from "@components/Payment/QRDownload"
import { useRef } from "react"

export function Example() {
  const ref = useRef<HTMLDivElement | null>(null)
  return <QRDownload qrContainerRef={ref} />
}
```

<!-- COMPONENTS_RECEIPTS -->

### `ReceiptCaptureFlow`

Multi-step receipt capture/review flow: choose camera/upload/manual, run OCR simulation, review/edit parsed items, and apply the result via `onApply`. Draft-aware using `localStorage`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `splitId` | `string` | Yes | — |
| `currency` | `string` | Yes | — |
| `onApply` | `(result: ReceiptCaptureFlowResult) => void` | Yes | — |

```tsx
import { ReceiptCaptureFlow } from "@components/Receipt/ReceiptCaptureFlow"

export function Example() {
  return (
    <ReceiptCaptureFlow
      splitId="split-123"
      currency="USD"
      onApply={() => {}}
    />
  )
}
```

### `CameraCapture`

Camera capture component that requests permission, displays a live preview, captures a photo, compresses it, and returns a `File` via `onCapture`.

**Dependencies:** Camera API (browser media + permissions)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `onCapture` | `(file: File) => void` | Yes | — |
| `onError` | `(error: Error) => void` | No | — |
| `maxFileSize` | `number` | No | `5242880` |
| `compressionQuality` | `number` | No | `0.8` |

```tsx
import { CameraCapture } from "@components/CameraCapture/CameraCapture"

export function Example() {
  return <CameraCapture onCapture={() => {}} onError={() => {}} />
}
```

### `ReceiptUpload`

Receipt file upload component (supports JPG/PNG and PDFs). Compresses images, supports cropping via `ImageCropper`, and optionally falls back to manual entry.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `onFilesChange` | `(files: File[]) => void` | No | — |
| `onManualEntry` | `(data: ManualEntryData) => void` | No | — |
| `onError` | `(error: Error) => void` | No | — |
| `maxFileSize` | `number` | No | `10MB` (from `MAX_FILE_SIZE_BYTES`) |
| `maxFiles` | `number` | No | `10` |

```tsx
import { ReceiptUpload } from "@components/ReceiptUpload/ReceiptUpload"

export function Example() {
  return <ReceiptUpload onFilesChange={() => {}} onError={() => {}} />
}
```

### `ImagePreview`

Renders thumbnails/previews for uploaded receipt items (images and PDFs), with optional cropping and remove actions.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `items` | `PreviewItem[]` | Yes | — |
| `onCrop` | `(item: PreviewItem) => void` | No | — |
| `onRemove` | `(id: string) => void` | Yes | — |
| `maxColumns` | `number` | No | `4` |

```tsx
import { ImagePreview } from "@components/ReceiptUpload/ImagePreview"

export function Example() {
  return (
    <ImagePreview
      items={[{ id: "1", file: new File([], "receipt.jpg"), previewUrl: "blob:..." } as any]}
      onRemove={() => {}}
      maxColumns={4}
    />
  )
}
```

### `ImageCropper`

Interactive image cropper (touch-friendly) that exports a cropped `File` as JPEG.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `src` | `string` | Yes | — |
| `fileName` | `string` | No | `"receipt.jpg"` |
| `onConfirm` | `(file: File) => void` | Yes | — |
| `onCancel` | `() => void` | Yes | — |
| `aspect` | `number` | No | — |

```tsx
import { ImageCropper } from "@components/ReceiptUpload/ImageCropper"

export function Example() {
  return (
    <ImageCropper
      src="data:image/png;base64,..."
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  )
}
```

### `ManualEntryFallback`

Manual receipt entry form (amount/date/merchant/notes) used when upload/camera isn’t available.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `onSubmit` | `(data: ManualEntryData) => void` | Yes | — |
| `onCancel` | `() => void` | Yes | — |
| `defaultValues` | `Partial<ManualEntryData>` | No | `{}` |

```tsx
import { ManualEntryFallback } from "@components/ReceiptUpload/ManualEntryFallback"

export function Example() {
  return (
    <ManualEntryFallback
      onSubmit={() => {}}
      onCancel={() => {}}
      defaultValues={{ merchant: "Store" }}
    />
  )
}
```

### `ConfidenceIndicator`

Displays a confidence badge/icon (green/yellow/red) for OCR-parsed values.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `confidence` | `number` (0–100) | Yes | — |
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'md'` |

```tsx
import { ConfidenceIndicator } from "@components/Receipt/ConfidenceIndicator"

export function Example() {
  return <ConfidenceIndicator confidence={85} size="md" />
}
```

### `ParsedItemEditor`

Editable list of parsed receipt items. Supports inline edits, adding items, duplicating, and deleting. Shows total at the bottom.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `items` | `ParsedItem[]` | Yes | — |
| `currency` | `string` | Yes | — |
| `onItemsChange` | `(items: ParsedItem[]) => void` | Yes | — |
| `onItemHover` | `(itemId: string \| null) => void` | No | — |

```tsx
import { ParsedItemEditor } from "@components/Receipt/ParsedItemEditor"

export function Example() {
  return (
    <ParsedItemEditor
      items={[{ id: "it1", name: "Pizza", quantity: 2, price: 12, confidence: 90 } as any]}
      currency="USD"
      onItemsChange={() => {}}
    />
  )
}
```

### `ReceiptImage`

Clickable receipt thumbnail that can trigger `onView` to show the full image.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `imageUrl` | `string \| undefined` | No | — |
| `onView` | `() => void` | No | — |

```tsx
import { ReceiptImage } from "@components/Receipt/ReceiptImage"

export function Example() {
  return <ReceiptImage imageUrl="blob:..." onView={() => {}} />
}
```

### `ReceiptImageViewer`

Receipt image viewer with zoom controls and optional region highlighting + region click callback.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `imageUrl` | `string` | Yes | — |
| `highlightRegion` | `{ x: number; y: number; width: number; height: number } \| null` | No | — |
| `onRegionClick` | `(region: Region) => void` | No | — |

```tsx
import { ReceiptImageViewer } from "@components/Receipt/ReceiptImageViewer"

export function Example() {
  return <ReceiptImageViewer imageUrl="blob:..." onRegionClick={() => {}} />
}
```

### `ReceiptParserResults`

Review screen for OCR results. Shows image (optional), `ParsedItemEditor`, mismatch banner, and Accept/Reject actions.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `imageUrl` | `string \| undefined` | No | — |
| `items` | `ParsedItem[]` | Yes | — |
| `receiptTotal` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `onAccept` | `(items: ParsedItem[]) => void` | Yes | — |
| `onReject` | `() => void` | Yes | — |
| `isLoading` | `boolean` | No | `false` |

```tsx
import { ReceiptParserResults } from "@components/Receipt/ReceiptParserResults"

export function Example() {
  return (
    <ReceiptParserResults
      items={[{ id: "it1", name: "Pizza", quantity: 2, price: 12, confidence: 90 } as any]}
      receiptTotal={24}
      currency="USD"
      onAccept={() => {}}
      onReject={() => {}}
    />
  )
}
```

### `TotalReconciliationBanner`

Shows “Totals Match” (green) or mismatch (red) based on a tolerance threshold.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `receiptTotal` | `number` | Yes | — |
| `parsedTotal` | `number` | Yes | — |
| `currency` | `string` | Yes | — |
| `tolerance` | `number` | No | `0.01` |

```tsx
import { TotalReconciliationBanner } from "@components/Receipt/TotalReconciliationBanner"

export function Example() {
  return (
    <TotalReconciliationBanner
      receiptTotal={24}
      parsedTotal={24.01}
      currency="USD"
    />
  )
}
```

<!-- COMPONENTS_COLLABORATION -->

### `CollaborationProvider`

Provides real-time collaboration context for a split using Socket.io presence/events and Yjs (WebSocket provider) for cursor syncing.

**Dependencies:** API/socket + CRDT (required for collaboration UI)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { CollaborationProvider } from "@components/Collaboration/CollaborationProvider"

export function Example() {
  return <CollaborationProvider>{/* live collaboration components */}</CollaborationProvider>
}
```

### `PresenceIndicator`

Displays presence and typing status for other users in the collaboration context.

**Dependencies:** API/socket + CRDT (must be used within `CollaborationProvider`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { CollaborationProvider, PresenceIndicator } from "@components/Collaboration/PresenceIndicator"

export function Example() {
  return (
    <CollaborationProvider>
      <PresenceIndicator />
    </CollaborationProvider>
  )
}
```

### `ConflictResolver`

Shows conflict cards when concurrent edits are detected, and lets the user resolve fields to keep local or accept remote.

**Dependencies:** API/socket + CRDT (must be used within `CollaborationProvider`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { CollaborationProvider } from "@components/Collaboration/CollaborationProvider"
import { ConflictResolver } from "@components/Collaboration/ConflictResolver"

export function Example() {
  return (
    <CollaborationProvider>
      <ConflictResolver />
    </CollaborationProvider>
  )
}
```

### `LiveActivityFeed`

Live feed of collaboration activity events (messages) for the current split.

**Dependencies:** API/socket + CRDT (must be used within `CollaborationProvider`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { CollaborationProvider } from "@components/Collaboration/CollaborationProvider"
import { LiveActivityFeed } from "@components/Collaboration/LiveActivityFeed"

export function Example() {
  return (
    <CollaborationProvider>
      <LiveActivityFeed />
    </CollaborationProvider>
  )
}
```

<!-- COMPONENTS_NOTIFICATIONS -->

### `NotificationBell`

Bell icon that shows unread count and opens a `NotificationDropdown` (max items).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { NotificationBell } from "@components/Notifications/NotificationBell"

export function Example() {
  return <NotificationBell />
}
```

### `NotificationCenter`

Full notifications page view: lists notifications with filter-by-type, and supports mark-all-as-read and clear-all actions.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { NotificationCenter } from "@components/Notifications/NotificationCenter"

export function Example() {
  return <NotificationCenter />
}
```

### `NotificationDropdown`

Dropdown panel showing up to `maxItems` notifications; supports mark-all-as-read and optional `onClose`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `onClose` | `() => void` | No | — |
| `maxItems` | `number` | No | `5` |

```tsx
import { NotificationDropdown } from "@components/Notifications/NotificationDropdown"

export function Example() {
  return <NotificationDropdown maxItems={5} onClose={() => {}} />
}
```

### `NotificationItem`

Single notification row. Supports compact rendering and toggling read/unread state via actions on the store.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `notification` | `Notification` | Yes | — |
| `compact` | `boolean` | No | `false` |

```tsx
import { NotificationItem } from "@components/Notifications/NotificationItem"

export function Example() {
  return (
    <NotificationItem
      notification={
        {
          id: "n1",
          type: "system_announcement",
          title: "Update",
          message: "New feature available.",
          createdAt: new Date().toISOString(),
          read: false,
        } as any
      }
      compact={false}
    />
  )
}
```

<!-- COMPONENTS_ANALYTICS -->

### `ChartExportButton`

Exports a chart (by DOM `targetId`) into a PNG file using `html-to-image` (downloads automatically).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `targetId` | `string` | Yes | — |
| `filename` | `string` | No | `${targetId}-${YYYY-MM-DD}` |

```tsx
import { ChartExportButton } from "@components/Analytics/ChartExportButton"

export function Example() {
  return <ChartExportButton targetId="spending-chart" />
}
```

### `DateRangePicker`

Two date inputs for selecting an analytics date range.

**Dependencies:** API data (used to parametrize `useAnalytics`-style queries)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `DateRange` | Yes | — |
| `onChange` | `(range: DateRange) => void` | Yes | — |

```tsx
import { DateRangePicker } from "@components/Analytics/DateRangePicker"

export function Example() {
  return (
    <DateRangePicker
      value={{ dateFrom: "2026-01-01", dateTo: "2026-01-31" } as any}
      onChange={() => {}}
    />
  )
}
```

### `DebtTracker`

Debt/owes bar chart and summary cards, computed from `DebtBalance[]`.

**Dependencies:** API data (pass fetched analytics debt balances)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `data` | `DebtBalance[]` | Yes | — |

```tsx
import { DebtTracker } from "@components/Analytics/DebtTracker"

export function Example() {
  return <DebtTracker data={[] as any} />
}
```

### `PaymentHeatmap`

Heatmap grid of payment activity over days/weeks, with tooltip and hover highlighting.

**Dependencies:** API data (pass fetched payment heatmap data)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `data` | `HeatmapCell[]` | Yes | — |

```tsx
import { PaymentHeatmap } from "@components/Analytics/PaymentHeatmap"

export function Example() {
  return <PaymentHeatmap data={[] as any} />
}
```

### `CategoryPieChart`

Pie chart breakdown of amounts by category with tooltip and legend.

**Dependencies:** API data (pass fetched category breakdown data)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `data` | `CategoryBreakdown[]` | Yes | — |

```tsx
import { CategoryPieChart } from "@components/Analytics/CategoryPieChart"

export function Example() {
  return <CategoryPieChart data={[] as any} />
}
```

### `SpendingChart`

Area chart of spending trends over time, with optional click handler for selecting a period.

**Dependencies:** API data (pass fetched spending trend data)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `data` | `SpendingTrend[]` | Yes | — |
| `onPeriodSelect` | `(period: string) => void` | No | — |

```tsx
import { SpendingChart } from "@components/Analytics/SpendingChart"

export function Example() {
  return <SpendingChart data={[] as any} onPeriodSelect={() => {}} />
}
```

### `TimeAnalysis`

Chart showing time distribution (day-of-week vs by amount), computed from `TimeDistribution[]`.

**Dependencies:** API data (pass fetched time distribution data)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `data` | `TimeDistribution[]` | Yes | — |

```tsx
import { TimeAnalysis } from "@components/Analytics/TimeAnalysis"

export function Example() {
  return <TimeAnalysis data={[] as any} />
}
```

<!-- COMPONENTS_UI -->

### `InstallPrompt` (PWA)

Renders a floating “Install” prompt when the PWA install prompt is available.

**Dependencies:** None (uses `usePWA` internally from `src/hooks`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import InstallPrompt from "@components/InstallPrompt"

export function Example() {
  return <InstallPrompt />
}
```

### `LanguageSelector`

Dropdown for selecting application language via `react-i18next`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { LanguageSelector } from "@components/LanguageSelector"

export function Example() {
  return <LanguageSelector />
}
```

### `Navbar`

Top navigation bar. Includes `ThemeToggle` and a `WalletButton`. On mobile it triggers an “open sidebar” action.

**Dependencies:** Wallet (renders `WalletButton`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `onMenuOpen` | `() => void` | Yes | — |

```tsx
import Navbar from "@components/Navbar"

export function Example() {
  return <Navbar onMenuOpen={() => {}} />
}
```

### `Sidebar`

Left navigation panel for routes. Mobile behavior is controlled by `isOpen`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `isOpen` | `boolean` | Yes | — |
| `onClose` | `() => void` | Yes | — |

```tsx
import Sidebar from "@components/SIdebar"

export function Example() {
  return <Sidebar isOpen={true} onClose={() => {}} />
}
```

### `ThemeProvider`

Provides theme state (light/dark/system) and applies it to the DOM.

**Dependencies:** None (context provider required for `ThemeToggle`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { ThemeProvider } from "@components/ThemeContex"
import { ThemeToggle } from "@components/ThemeToggle"

export function Example() {
  return (
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  )
}
```

### `ThemeToggle`

Theme switcher + theme preference dropdown.

**Dependencies:** Theme context (`ThemeProvider`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `className` | `string` | No | `""` |

```tsx
import { ThemeToggle } from "@components/ThemeToggle"

export function Example() {
  return <ThemeToggle className="mb-2" />
}
```

### `WalletButton`

Wallet connection button (Freighter). Shows status/errors, can optionally show the wallet icon, and calls `useWallet()` connect/disconnect.

**Dependencies:** Wallet (must be used with the wallet context defined in `src/hooks/use-wallet.tsx`)

| Prop | Type | Required? | Default |
|---|---|---|---|
| `showIcon` | `boolean` | No | `true` |
| `disabled` | `boolean` | No | — |
| `onClick` | `(event: React.MouseEvent<HTMLButtonElement>) => void` | No | — |

```tsx
import { WalletButton } from "@components/wallet-button"

export function Example() {
  return <WalletButton showIcon={true} onClick={() => {}} />
}
```

## UI Primitives

### `Badge`

Compact status/pill component.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `variant` | `'default' \| 'outline' \| 'secondary' \| 'destructive'` | No | `'default'` |
| `children` | `ReactNode` | Yes | — |

```tsx
import { Badge } from "@components/ui/badge"

export function Example() {
  return <Badge variant="outline">Outline</Badge>
}
```

### `Button`

Basic button primitive.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |
| `type` | `'button' \| 'submit' \| 'reset'` | No | `'button'` |
| `disabled` | `boolean` | No | — |

```tsx
import { Button } from "@components/ui/button"

export function Example() {
  return <Button onClick={() => {}}>Click</Button>
}
```

### `Input`

Input field primitive (forwardRef).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `type` | `string` | No | `'text'` |

```tsx
import { Input } from "@components/ui/input"

export function Example() {
  return <Input value="" onChange={() => {}} />
}
```

### `Label`

Form label primitive (forwardRef).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { Label } from "@components/ui/label"

export function Example() {
  return <Label>Amount</Label>
}
```

### `Separator`

Horizontal/vertical divider.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | No | `'horizontal'` |
| `decorative` | `boolean` | No | `true` |

```tsx
import { Separator } from "@components/ui/separator"

export function Example() {
  return <Separator decorative />
}
```

### `Textarea`

Textarea primitive (forwardRef).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| (inherits `React.TextareaHTMLAttributes`) | — | — | — |

```tsx
import { Textarea } from "@components/ui/textarea"

export function Example() {
  return <Textarea defaultValue="" rows={4} />
}
```

### `Dialog`

Dialog root (controlled via `open` + `onOpenChange`).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `open` | `boolean` | Yes | — |
| `onOpenChange` | `(open: boolean) => void` | Yes | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { useState } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogClose } from "@components/ui/dialog"

export function Example() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button onClick={() => setOpen(true)}>Open</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div>Title</div>
        </DialogHeader>
        <DialogClose>Close</DialogClose>
      </DialogContent>
    </Dialog>
  )
}
```

### `DialogTrigger`

Trigger wrapper for dialogs. When `asChild` is true, it clones the child and wires click forwarding.

**Dependencies:** Must be used within `Dialog`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `asChild` | `boolean` | No | — |
| `children` | `ReactElement` | Yes | — |

```tsx
import { Dialog, DialogTrigger } from "@components/ui/dialog"

export function Example() {
  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogTrigger asChild>
        <button>Open</button>
      </DialogTrigger>
    </Dialog>
  )
}
```

### `DialogPortal`

Portals dialog content into a DOM container (defaults to `document.body`).

**Dependencies:** Must be used within `DialogContent` flow.

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |
| `container` | `Element` | No | `document.body` |

```tsx
import { DialogPortal } from "@components/ui/dialog"

export function Example() {
  return <DialogPortal>{/* dialog content */}</DialogPortal>
}
```

### `DialogOverlay`

Backdrop overlay element. Clicking it closes the dialog.

**Dependencies:** Must be used within `Dialog`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `className` | `string` | No | — |

```tsx
import { DialogOverlay } from "@components/ui/dialog"

export function Example() {
  return <DialogOverlay className="bg-black/50" />
}
```

### `DialogContent`

Dialog panel content container. Includes focus trap + scroll lock while open.

**Dependencies:** Must be used within `Dialog`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `onInteractOutside` | `() => void` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DialogContent } from "@components/ui/dialog"

export function Example() {
  return <DialogContent>{/* panel */}</DialogContent>
}
```

### `DialogHeader`

Layout wrapper for dialog header.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { DialogHeader } from "@components/ui/dialog"

export function Example() {
  return <DialogHeader>Header</DialogHeader>
}
```

### `DialogFooter`

Layout wrapper for dialog footer actions.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { DialogFooter } from "@components/ui/dialog"

export function Example() {
  return <DialogFooter>Actions</DialogFooter>
}
```

### `DialogTitle`

Title element (forwardRef).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { DialogTitle } from "@components/ui/dialog"

export function Example() {
  return <DialogTitle>Title</DialogTitle>
}
```

### `DialogDescription`

Description element (forwardRef).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { DialogDescription } from "@components/ui/dialog"

export function Example() {
  return <DialogDescription>Description</DialogDescription>
}
```

### `DialogClose`

Close button for dialogs. If `asChild` is true, it clones the child and closes on click.

**Dependencies:** Must be used within `Dialog`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `asChild` | `boolean` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DialogClose } from "@components/ui/dialog"

export function Example() {
  return <DialogClose>Close</DialogClose>
}
```

### `DropdownMenu`

Dropdown menu root. Supports controlled (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`) usage.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |
| `open` | `boolean` | No | — |
| `onOpenChange` | `(open: boolean) => void` | No | — |
| `defaultOpen` | `boolean` | No | `false` |

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@components/ui/dropdown-menu"

export function Example() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>Menu</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => {}}>Item</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### `DropdownMenuTrigger`

Button/element that toggles the dropdown. If `asChild` is true, the child element is cloned.

**Dependencies:** Must be used within `DropdownMenu`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `asChild` | `boolean` | No | — |
| `children` | `ReactElement` | Yes | — |

```tsx
import { DropdownMenu, DropdownMenuTrigger } from "@components/ui/dropdown-menu"

export function Example() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>Open</button>
      </DropdownMenuTrigger>
    </DropdownMenu>
  )
}
```

### `DropdownMenuContent`

The dropdown panel. Supports positioning via `align`, `side`, `sideOffset`, and `alignOffset`.

**Dependencies:** Must be used within `DropdownMenu`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `align` | `'start' \| 'center' \| 'end'` | No | `'start'` |
| `side` | `'top' \| 'bottom' \| 'left' \| 'right'` | No | `'bottom'` |
| `sideOffset` | `number` | No | `6` |
| `alignOffset` | `number` | No | `0` |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuContent } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuContent align="end">{/* items */}</DropdownMenuContent>
}
```

### `DropdownMenuItem`

Clickable menu item. Can be disabled or indented (`inset`).

**Dependencies:** Must be used within `DropdownMenuContent`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `disabled` | `boolean` | No | — |
| `inset` | `boolean` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuItem } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuItem onClick={() => {}}>Edit</DropdownMenuItem>
}
```

### `DropdownMenuSeparator`

Horizontal separator line inside menus.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| None | — | — | — |

```tsx
import { DropdownMenuSeparator } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuSeparator />
}
```

### `DropdownMenuLabel`

Small label text for a menu section, optionally inset.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `inset` | `boolean` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuLabel } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuLabel inset>More</DropdownMenuLabel>
}
```

### `DropdownMenuGroup`

Group wrapper to segment menu items.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuGroup } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuGroup>Group</DropdownMenuGroup>
}
```

### `DropdownMenuShortcut`

Keyboard shortcut hint text.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuShortcut } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
}
```

### `DropdownMenuCheckboxItem`

Checkbox-style menu item. Controlled via `checked` and `onCheckedChange`.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `checked` | `boolean` | No | — |
| `onCheckedChange` | `(checked: boolean) => void` | No | — |
| `disabled` | `boolean` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuCheckboxItem } from "@components/ui/dropdown-menu"

export function Example() {
  return (
    <DropdownMenuCheckboxItem
      checked={false}
      onCheckedChange={() => {}}
    >
      Notifications
    </DropdownMenuCheckboxItem>
  )
}
```

### `DropdownMenuRadioGroup`

Group wrapper for radio-style menu items.

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `string` | No | — |
| `onValueChange` | `(value: string) => void` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@components/ui/dropdown-menu"

export function Example() {
  return (
    <DropdownMenuRadioGroup value="a" onValueChange={() => {}}>
      <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  )
}
```

### `DropdownMenuRadioItem`

Radio-style menu option. Works with `DropdownMenuRadioGroup`.

**Dependencies:** Must be used within `DropdownMenuRadioGroup`

| Prop | Type | Required? | Default |
|---|---|---|---|
| `value` | `string` | Yes | — |
| `disabled` | `boolean` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuRadioItem } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuRadioItem value="a">Option</DropdownMenuRadioItem>
}
```

### `DropdownMenuSubTrigger`

Entry that opens a submenu trigger UI (sub-menu not implemented in this file, but trigger styling is available).

**Dependencies:** None

| Prop | Type | Required? | Default |
|---|---|---|---|
| `inset` | `boolean` | No | — |
| `children` | `ReactNode` | Yes | — |

```tsx
import { DropdownMenuSubTrigger } from "@components/ui/dropdown-menu"

export function Example() {
  return <DropdownMenuSubTrigger inset>Sub</DropdownMenuSubTrigger>
}
```

## Custom Hooks

<!-- CUSTOM_HOOKS -->

### `useWallet()`

Accesses the Stellar wallet connection state and actions (Freighter).

**Dependencies:** Wallet (must be used within `WalletProvider`)

**Parameters:** None

**Returns (`WalletContextValue`):**

| Field | Type | Notes |
|---|---|---|
| `publicKey` | `string \| null` | Connected account public key |
| `isConnected` | `boolean` | Derived from `publicKey` |
| `isConnecting` | `boolean` | Connection in progress |
| `hasFreighter` | `boolean` | Freighter availability |
| `error` | `string \| null` | Human-readable error |
| `networkPassphrase` | `string` | Expected wallet network passphrase |
| `rpcUrl` | `string` | RPC endpoint URL |
| `walletNetworkPassphrase` | `string \| null` | Discovered from Freighter |
| `isOnAllowedNetwork` | `boolean` | Whether Freighter network matches app expectations |
| `connect()` | `() => Promise<void>` | Requests Freighter connection |
| `disconnect()` | `() => void` | Clears local connection state |
| `refresh()` | `() => Promise<void>` | Re-checks wallet + network |
| `signTransaction(txXdr)` | `(txXdr: string) => Promise<string>` | Signs a transaction XDR |

```tsx
import { WalletProvider, useWallet } from "@src/hooks/use-wallet"

function Example() {
  const { isConnected, connect, disconnect } = useWallet()
  return (
    <button onClick={isConnected ? disconnect : () => void connect()}>
      {isConnected ? "Disconnect" : "Connect"}
    </button>
  )
}

export function App() {
  return (
    <WalletProvider>
      <Example />
    </WalletProvider>
  )
}
```

### `useAnalytics()`

Fetches analytics data (spending trends, categories, debt balances, heatmap, time distribution) and manages loading/error state.

**Dependencies:** API (`fetchSpendingTrends`, `fetchCategoryBreakdown`, etc.)

**Parameters:** None

**Returns:**

| Field | Type | Notes |
|---|---|---|
| `data` | `AnalyticsData \| null` | Full analytics payload |
| `loading` | `boolean` | Loading flag |
| `error` | `string \| null` | Error message |
| `dateRange` | `DateRange` | Current date range |
| `setDateRange(range)` | `(range: DateRange) => void` | Updates range and triggers refetch |
| `refetch()` | `() => void` | Re-runs fetch for the current `dateRange` |

```tsx
import { useAnalytics } from "@src/hooks/useAnalytics"

export function Example() {
  const { data, loading, error, dateRange, setDateRange } = useAnalytics()
  if (loading) return <div>Loading…</div>
  if (error) return <div>{error}</div>
  return <div>{dateRange.dateFrom}</div>
}
```

### `usePWA()`

Tracks online status and the browser PWA install prompt.

**Dependencies:** Browser APIs (`online/offline`, `beforeinstallprompt`)

**Parameters:** None

**Returns:**

| Field | Type | Notes |
|---|---|---|
| `isOnline` | `boolean` | Current online status |
| `installPrompt` | `any` | `BeforeInstallPromptEvent` when available |
| `installApp()` | `() => Promise<void>` | Calls the install prompt |

```tsx
import { usePWA } from "@src/hooks/usePWA"

export function Example() {
  const { isOnline, installApp } = usePWA()
  return <button onClick={() => void installApp()} disabled={!isOnline}>Install</button>
}
```

### `useCollaboration()`

Consumes collaboration state/actions from `CollaborationProvider` (presence, activities, conflicts, Yjs/Socket-driven updates).

**Dependencies:** Must be used within `CollaborationProvider`

**Parameters:** None

**Returns (`CollaborationContextType`):**

| Field | Type | Notes |
|---|---|---|
| `connected` | `boolean` | Socket connection status |
| `presence` | `Record<string, PresenceUser>` | Users currently present |
| `activities` | `ActivityEvent[]` | Recent activity events |
| `conflicts` | `ConflictInfo[]` | Detected edit conflicts |
| `joinSplit(splitId, user)` | `(splitId: string, user: Partial<PresenceUser>) => void` | Join a room + Yjs provider |
| `leaveSplit()` | `() => void` | Leave the room |
| `setTyping(isTyping)` | `(isTyping: boolean) => void` | Broadcast typing status |
| `sendUpdate(update)` | `(update: Omit<SplitUpdate, 'timestamp'>) => void` | Broadcast split update |
| `resolveConflict(field, resolution)` | `(field: string, resolution: 'local' \| 'remote' \| 'merge') => void` | Pick a resolution strategy |
| `updateCursor(x, y)` | `(x: number, y: number) => void` | Update cursor coordinates |

```tsx
import { CollaborationProvider } from "@components/Collaboration/CollaborationProvider"
import { useCollaboration } from "@src/hooks/useCollaboration"

function Example() {
  const { connected } = useCollaboration()
  return <div>{connected ? "Connected" : "Disconnected"}</div>
}

export function App() {
  return (
    <CollaborationProvider>
      <Example />
    </CollaborationProvider>
  )
}
```

### `useDisclosure(initialIsOpen?)`

Small boolean state helper for modals/popovers.

**Dependencies:** None

**Parameters:**

| Param | Type | Required? | Default |
|---|---|---|---|
| `initialIsOpen` | `boolean` | No | `false` |

**Returns:**

| Field | Type |
|---|---|
| `isOpen` | `boolean` |
| `onOpen` | `() => void` |
| `onClose` | `() => void` |
| `onToggle` | `() => void` |

```tsx
import { useDisclosure } from "@src/hooks/useDisclosure"

export function Example() {
  const { isOpen, onOpen, onClose } = useDisclosure(false)
  return (
    <>
      <button onClick={onOpen}>Open</button>
      {isOpen && <button onClick={onClose}>Close</button>}
    </>
  )
}
```

### `useAccessibility()`

Detects accessibility preferences (reduced motion, high contrast, reduced transparency).

**Dependencies:** Browser `matchMedia`

**Parameters:** None

**Returns:**

| Field | Type |
|---|---|
| `prefersReducedMotion` | `boolean` |
| `prefersHighContrast` | `boolean` |
| `prefersReducedTransparency` | `boolean` |

```tsx
import { useAccessibility } from "@src/hooks/useAccessibility"

export function Example() {
  const { prefersReducedMotion } = useAccessibility()
  return <div>{prefersReducedMotion ? "Reduced motion" : "Normal motion"}</div>
}
```

### `useAnnounce()`

Announces messages to screen readers via a live region message string.

**Dependencies:** Accessibility (screen reader live region pattern)

**Parameters:** None

**Returns:**

| Field | Type |
|---|---|
| `message` | `string` |
| `announce(newMessage)` | `(newMessage: string) => void` |

```tsx
import { useAnnounce } from "@src/hooks/useAccessibility"

export function Example() {
  const { message, announce } = useAnnounce()
  return (
    <>
      <button onClick={() => announce("Saved!")}>Announce</button>
      <div aria-live="polite">{message}</div>
    </>
  )
}
```

