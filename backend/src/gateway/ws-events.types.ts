// ── Inbound message payloads ──────────────────────────────────────────────────

export interface JoinSplitPayload {
  splitId: string;
}

export interface LeaveSplitPayload {
  splitId: string;
}

export interface SplitPresencePayload {
  splitId: string;
}

export interface SplitActivityPayload {
  splitId: string;
  activity: SplitActivityData;
}

export interface SplitActivityData {
  type?: string;
  action?: string;
  actorId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  amount?: number;
  [key: string]: unknown;
}

// ── Outbound event payloads ───────────────────────────────────────────────────
// splitId is passed as the first argument to the emitter methods, so it is
// intentionally optional inside the data payload to allow callers to omit it.
// All other fields are optional to accommodate the variety of shapes used
// across payment-processor, reconciliation, settlement, and recurring-splits.

export interface PaymentReceivedEvent {
  splitId?: string;
  paymentId?: string;
  participantId?: string;
  type?: string;
  amount?: number;
  currency?: string;
  txHash?: string;
  asset?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface SplitUpdatedEvent {
  splitId?: string;
  type?: string;
  status?: string;
  changes?: Record<string, unknown>;
  updatedAt?: string;
  timestamp?: string;
  amountPaid?: number;
  paymentId?: string;
  participantId?: string;
  [key: string]: unknown;
}

export interface ParticipantJoinedEvent {
  splitId?: string;
  participantId: string;
  userId?: string;
  joinedAt?: string;
  amountOwed?: number;
  status?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// ── Handler return shapes ─────────────────────────────────────────────────────

export interface JoinedSplitEvent {
  splitId: string;
  room: string;
}

export interface LeftSplitEvent {
  splitId: string;
  room: string;
}

export interface SplitPresenceEvent {
  splitId: string;
  participants: string[];
}

export interface SplitActivityBroadcastEvent {
  splitId: string;
  activity: SplitActivityData;
}

export interface WsHandlerResponse<T> {
  event: string;
  data: T;
}
