export type MovementType = 'subscription' | 'received' | 'sent';

export type Movement = {
  id: string;
  counterparty: string;
  description: string;
  amount: string;
  currency: string;
  type: MovementType;
  occurredAt: string;
};

export type Account = { id: string; name: string; balance: string; currency: string };
export type ApiEnvelope<T> = { data: T };
export type MovementListResult = { data: Movement[]; meta: { count: number } };
