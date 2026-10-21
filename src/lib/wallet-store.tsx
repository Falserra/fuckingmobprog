// In-memory app state + the operations from the Master File's sequence diagrams.
// Everything resets on reload; swap these functions for API calls when a backend exists.
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

import { billers, seedAccounts, seedNotifications, seedPaymentMethods, seedSubscriptions, seedTransactions } from './seed';
import type {
  Account,
  AccountStatus,
  Notification,
  PaymentMethod,
  RiskLevel,
  Subscription,
  SuspiciousActivityReport,
  Transaction,
  TxType,
} from './types';
import { runRiskAssessment, type RiskResult } from './verification';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type TxRequest = {
  type: TxType;
  amount: number;
  recipientUsername?: string; // send
  billerId?: string; // bill
  paymentMethodId?: string; // topup
  reference?: string;
  note?: string;
};

type Result = { ok: true } | { ok: false; error: string };

function useWalletState() {
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [paymentMethods] = useState<PaymentMethod[]>(seedPaymentMethods);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(seedSubscriptions);
  const [reports, setReports] = useState<SuspiciousActivityReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const attempts = useRef<Record<string, { count: number; until: number }>>({});

  const me = accounts.find((a) => a.id === userId) ?? null;
  // Protected screens may render once more during logout; give them the last account.
  const lastMe = accounts.find((a) => a.id === (userId ?? lastUserId)) ?? null;
  const accountById = (id: string) => accounts.find((a) => a.id === id);
  const accountByUsername = (u: string) => accounts.find((a) => a.username === u.trim().toLowerCase().replace(/^@/, ''));

  const notify = (accountId: string, message: string, kind: Notification['kind'] = 'info') =>
    setNotifications((ns) => [{ id: uid('n'), accountId, message, kind, timestamp: Date.now(), read: false }, ...ns]);

  const patchAccount = (id: string, patch: Partial<Account>) =>
    setAccounts((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  // ---- Lockout after repeated failures (TC-01) ----
  const lockedFor = (username: string) => {
    const a = attempts.current[username];
    return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 1000) : 0;
  };
  const fail = (username: string) => {
    const a = attempts.current[username] ?? { count: 0, until: 0 };
    a.count += 1;
    if (a.count >= MAX_ATTEMPTS) {
      a.until = Date.now() + LOCKOUT_MS;
      a.count = 0;
    }
    attempts.current[username] = a;
    return MAX_ATTEMPTS - a.count;
  };
  const clearAttempts = (username: string) => delete attempts.current[username];

  // ---- Authentication (Figure 10) ----
  function validateCredentials(username: string, password: string): { ok: true; account: Account } | { ok: false; error: string } {
    const u = username.trim().toLowerCase();
    const secs = lockedFor(u);
    if (secs) return { ok: false, error: `Too many failed attempts. Try again in ${secs}s.` };
    const account = accounts.find((a) => a.username === u && a.password === password);
    if (!account) {
      const left = accounts.some((a) => a.username === u) ? fail(u) : MAX_ATTEMPTS;
      return { ok: false, error: left < MAX_ATTEMPTS && left > 0 ? `Invalid username or password. ${left} attempt(s) left.` : 'Invalid username or password.' };
    }
    return { ok: true, account };
  }

  function verifySecondFactor(account: Account, mpin: string): Result {
    const secs = lockedFor(account.username);
    if (secs) return { ok: false, error: `Too many failed attempts. Try again in ${secs}s.` };
    if (mpin !== account.mpin) {
      const left = fail(account.username);
      return { ok: false, error: lockedFor(account.username) ? 'Too many failed attempts. Login locked for 60s.' : `Incorrect MPIN. ${left} attempt(s) left.` };
    }
    clearAttempts(account.username);
    return { ok: true };
  }

  const login = (account: Account) => {
    clearAttempts(account.username);
    setUserId(account.id);
    setLastUserId(account.id);
  };
  const logout = () => setUserId(null);

  function register(f: { name: string; username: string; password: string; mpin: string }): Result {
    const username = f.username.trim().toLowerCase();
    if (accounts.some((a) => a.username === username)) return { ok: false, error: 'Username taken. Pick a different username.' };
    const id = uid('u');
    setAccounts((as) => [
      ...as,
      { id, name: f.name.trim(), username, password: f.password, mpin: f.mpin, role: 'customer', balance: 0, status: 'active', verified: false, biometricEnabled: false },
    ]);
    setNotifications((ns) => [{ id: uid('n'), accountId: id, message: 'Welcome to CiCo! Top up from a linked bank or card to get started.', kind: 'info', timestamp: Date.now(), read: false }, ...ns]);
    return { ok: true };
  }

  const setBiometric = (enabled: boolean) => me && patchAccount(me.id, { biometricEnabled: enabled });

  // ---- Money movement + verification (Figure 5 / Figure 11) ----
  function verifyTransaction(req: TxRequest): RiskResult & { recipientName?: string; recipientVerified?: boolean } {
    if (!me) return { level: 'red', reasons: ['Not logged in'] };
    if (req.type === 'send') {
      const r = req.recipientUsername ? accountByUsername(req.recipientUsername) : undefined;
      const valid = r && r.role === 'customer' && r.id !== me.id;
      const res = runRiskAssessment({
        type: 'send',
        amount: req.amount,
        balance: me.balance,
        recipientKnown: !!valid,
        recipientVerified: !!r?.verified,
        recipientFrozen: r?.status === 'frozen',
        recipientReported: !!r && reports.some((x) => x.description.toLowerCase().includes('@' + r.username) && x.status !== 'dismissed'),
        firstTimeRecipient: !!r && !transactions.some((t) => t.accountId === me.id && t.type === 'send' && t.counterparty === r.name && t.status === 'completed'),
        note: req.note,
      });
      return { ...res, recipientName: valid ? r.name : undefined, recipientVerified: r?.verified };
    }
    if (req.type === 'bill') {
      const b = billers.find((x) => x.id === req.billerId);
      const res = runRiskAssessment({ type: 'bill', amount: req.amount, balance: me.balance, recipientKnown: !!b, recipientVerified: !!b?.verified, recipientFrozen: false, recipientReported: false, firstTimeRecipient: false, note: req.note });
      return { ...res, recipientName: b?.name, recipientVerified: b?.verified };
    }
    const pm = paymentMethods.find((p) => p.id === req.paymentMethodId);
    const res = runRiskAssessment({ type: 'topup', amount: req.amount, balance: me.balance, recipientKnown: true, recipientVerified: true, recipientFrozen: false, recipientReported: false, firstTimeRecipient: false });
    return { ...res, recipientName: pm ? `${pm.label} ${pm.accountNumber}` : undefined, recipientVerified: true };
  }

  // processPayment → PaymentGateway → BankPaymentNetwork (simulated)
  async function processTransaction(req: TxRequest, risk: RiskLevel): Promise<Result & { transactionId?: string }> {
    if (!me) return { ok: false, error: 'Not logged in.' };
    await wait(700);
    const id = uid('t');
    const base = { id, accountId: me.id, type: req.type, amount: req.amount, reference: req.reference, note: req.note, timestamp: Date.now(), risk };

    const failWith = (counterparty: string, error: string): Result => {
      setTransactions((ts) => [{ ...base, counterparty, status: 'failed' }, ...ts]);
      return { ok: false, error };
    };

    if (me.status === 'frozen') return { ok: false, error: 'Your account is frozen. Contact support to unlock it.' };
    if (req.amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.' };
    if (req.type !== 'topup' && req.amount > me.balance) return failWith(req.recipientUsername ?? 'Biller', 'Insufficient balance.');

    if (req.type === 'send') {
      const r = accountByUsername(req.recipientUsername ?? '');
      if (!r || r.role !== 'customer' || r.id === me.id) return { ok: false, error: 'Recipient not found.' };
      if (r.status === 'frozen') return failWith(r.name, 'The recipient account cannot receive funds right now.');
      setAccounts((as) => as.map((a) => (a.id === me.id ? { ...a, balance: a.balance - req.amount } : a.id === r.id ? { ...a, balance: a.balance + req.amount } : a)));
      setTransactions((ts) => [
        { ...base, counterparty: r.name, status: 'completed' },
        { ...base, id: uid('t'), accountId: r.id, type: 'receive', counterparty: me.name, status: 'completed' },
        ...ts,
      ]);
      notify(me.id, `You sent ₱${req.amount.toFixed(2)} to ${r.name}.`, 'success');
      notify(r.id, `You received ₱${req.amount.toFixed(2)} from ${me.name}.`, 'success');
      return { ok: true, transactionId: id };
    }
    if (req.type === 'bill') {
      const b = billers.find((x) => x.id === req.billerId);
      if (!b) return { ok: false, error: 'Biller not found.' };
      patchAccount(me.id, { balance: me.balance - req.amount });
      setTransactions((ts) => [{ ...base, counterparty: b.name, status: 'completed' }, ...ts]);
      notify(me.id, `Paid ₱${req.amount.toFixed(2)} to ${b.name}.`, 'success');
      return { ok: true, transactionId: id };
    }
    const pm = paymentMethods.find((p) => p.id === req.paymentMethodId);
    if (!pm) return { ok: false, error: 'Choose a funding source.' };
    patchAccount(me.id, { balance: me.balance + req.amount });
    setTransactions((ts) => [{ ...base, counterparty: pm.label, reference: pm.accountNumber, status: 'completed' }, ...ts]);
    notify(me.id, `Topped up ₱${req.amount.toFixed(2)} from ${pm.label}.`, 'success');
    return { ok: true, transactionId: id };
  }

  // User declined a flagged transaction → cancel it and report to admin
  function cancelTransaction(req: TxRequest, risk: RiskLevel, counterparty: string, reasons: string[], report: boolean) {
    if (!me) return;
    const id = uid('t');
    setTransactions((ts) => [{ id, accountId: me.id, type: req.type, amount: req.amount, counterparty, reference: req.reference, note: req.note, timestamp: Date.now(), status: 'cancelled', risk }, ...ts]);
    if (report) {
      const target = req.recipientUsername ? ` to @${req.recipientUsername.replace(/^@/, '').toLowerCase()}` : '';
      submitReport({ transactionId: id, description: `Auto-report: user cancelled a flagged ${req.type}${target} (₱${req.amount.toFixed(2)}). Flags: ${reasons.join('; ')}` });
    }
  }

  // ---- Subscription Hub (Figure 8 / Figure 13) ----
  async function setSubscriptionStatus(id: string, status: Subscription['status']): Promise<Result> {
    await wait(500); // revokeAccessToken() at ExternalMerchantAPI
    const s = subscriptions.find((x) => x.id === id);
    if (!s || !me) return { ok: false, error: 'Unable to revoke access' };
    setSubscriptions((ss) => ss.map((x) => (x.id === id ? { ...x, status } : x)));
    const verb = status === 'unbound' ? 'unbound and its access token revoked' : status === 'blocked' ? 'blocked from auto-deducting' : 'allowed to auto-deduct again';
    notify(me.id, `${s.merchant} was ${verb}.`, status === 'active' ? 'info' : 'security');
    return { ok: true };
  }

  // ---- Reports, emergency freeze, admin (Figure 9 / Figure 14) ----
  function submitReport(r: { description: string; transactionId?: string; emergency?: boolean }) {
    if (!me) return;
    const report: SuspiciousActivityReport = { id: uid('r'), accountId: me.id, transactionId: r.transactionId, description: r.description, emergency: !!r.emergency, timestamp: Date.now(), status: 'pending' };
    setReports((rs) => [report, ...rs]);
    accounts.filter((a) => a.role === 'admin').forEach((a) => notify(a.id, `New ${r.emergency ? 'EMERGENCY ' : ''}report from ${me.name}.`, 'security'));
    return report;
  }

  async function emergencyFreeze(): Promise<Result> {
    if (!me) return { ok: false, error: 'Not logged in.' };
    patchAccount(me.id, { status: 'frozen' });
    submitReport({ emergency: true, description: 'User activated 1-tap emergency freeze. All outgoing funds locked pending review.' });
    notify(me.id, 'Your wallet is frozen. No money can leave your account until the Security Team unlocks it.', 'security');
    return { ok: true };
  }

  function reviewReport(reportId: string, decision: 'freeze' | 'dismiss') {
    const r = reports.find((x) => x.id === reportId);
    if (!r) return;
    setReports((rs) => rs.map((x) => (x.id === reportId ? { ...x, status: decision === 'freeze' ? 'resolved-frozen' : 'dismissed' } : x)));
    if (decision === 'freeze') {
      patchAccount(r.accountId, { status: 'frozen' });
      notify(r.accountId, 'Your report was confirmed. Your account has been frozen to protect your funds.', 'security');
    } else {
      notify(r.accountId, 'Your report was reviewed by the Security Team and closed.', 'info');
    }
  }

  function setAccountStatus(accountId: string, status: AccountStatus) {
    patchAccount(accountId, { status });
    notify(accountId, status === 'frozen' ? 'Your account was frozen by the Security Team.' : 'Your account was unlocked by the Security Team.', 'security');
  }

  const markAllRead = () => me && setNotifications((ns) => ns.map((n) => (n.accountId === me.id ? { ...n, read: true } : n)));

  return {
    me,
    lastMe,
    accounts,
    accountById,
    accountByUsername,
    transactions: me ? transactions.filter((t) => t.accountId === me.id) : [],
    allTransactions: transactions,
    paymentMethods: me ? paymentMethods.filter((p) => p.accountId === me.id) : [],
    subscriptions: me ? subscriptions.filter((s) => s.accountId === me.id) : [],
    reports,
    notifications: me ? notifications.filter((n) => n.accountId === me.id) : [],
    validateCredentials,
    verifySecondFactor,
    login,
    logout,
    register,
    setBiometric,
    verifyTransaction,
    processTransaction,
    cancelTransaction,
    setSubscriptionStatus,
    submitReport,
    emergencyFreeze,
    reviewReport,
    setAccountStatus,
    markAllRead,
  };
}

type Wallet = ReturnType<typeof useWalletState>;
const WalletContext = createContext<Wallet | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const value = useWalletState();
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}

// Screens behind Stack.Protected can assume a signed-in user.
export function useMe() {
  return useWallet().lastMe as Account;
}
