// Domain model for CiCo (see Master File §5.2 class diagram).

export type Role = 'customer' | 'admin';
export type AccountStatus = 'active' | 'frozen';

export type Account = {
  id: string;
  name: string;
  username: string;
  password: string;
  mpin: string; // 6 digits (FR-01)
  role: Role;
  balance: number;
  status: AccountStatus;
  verified: boolean; // shows a verified badge to people sending to this account (FR-03)
  biometricEnabled: boolean;
};

export type TxType = 'send' | 'receive' | 'bill' | 'topup';
export type TxStatus = 'completed' | 'failed' | 'cancelled';
export type RiskLevel = 'green' | 'yellow' | 'red';

export type Transaction = {
  id: string;
  accountId: string; // owner of this record
  type: TxType;
  amount: number;
  counterparty: string; // display name of the other side
  reference?: string; // biller account no., payment method, etc.
  note?: string;
  timestamp: number;
  status: TxStatus;
  risk: RiskLevel;
};

export type PaymentMethod = {
  id: string;
  accountId: string;
  label: string; // e.g. "BPI Savings"
  accountType: 'bank' | 'card';
  accountNumber: string; // masked
};

export type SubscriptionStatus = 'active' | 'blocked' | 'unbound';

export type Subscription = {
  id: string;
  accountId: string;
  merchant: string;
  plan: string;
  amount: number;
  cycle: 'monthly' | 'weekly' | 'yearly';
  linkedOn: number;
  nextCharge: number;
  status: SubscriptionStatus;
};

export type ReportStatus = 'pending' | 'resolved-frozen' | 'dismissed';

export type SuspiciousActivityReport = {
  id: string;
  accountId: string;
  transactionId?: string;
  description: string;
  emergency: boolean; // raised by the 1-tap emergency freeze (FR-05)
  timestamp: number;
  status: ReportStatus;
};

export type Notification = {
  id: string;
  accountId: string;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'security';
  timestamp: number;
  read: boolean;
};

export type Biller = { id: string; name: string; category: string; verified: boolean };
