// Demo data. Everything lives in memory and resets when the app reloads.
//   Customer: cico / 1234, MPIN 123456
//   Second customer (to send money to): juan / 1234, MPIN 111111
//   Admin: admin / admin123, MPIN 000000
import type { Account, Biller, Notification, PaymentMethod, Subscription, Transaction } from './types';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

export const seedAccounts: Account[] = [
  { id: 'u1', name: 'Demo User', username: 'cico', password: '1234', mpin: '123456', role: 'customer', balance: 12500, status: 'active', verified: true, biometricEnabled: false },
  { id: 'u2', name: 'Juan Dela Cruz', username: 'juan', password: '1234', mpin: '111111', role: 'customer', balance: 3200, status: 'active', verified: true, biometricEnabled: false },
  { id: 'u3', name: 'Maria Santos', username: 'maria', password: '1234', mpin: '222222', role: 'customer', balance: 800, status: 'active', verified: false, biometricEnabled: false },
  { id: 'a1', name: 'Security Admin', username: 'admin', password: 'admin123', mpin: '000000', role: 'admin', balance: 0, status: 'active', verified: true, biometricEnabled: false },
];

export const seedTransactions: Transaction[] = [
  { id: 't1', accountId: 'u1', type: 'topup', amount: 5000, counterparty: 'BPI Savings', timestamp: now - 3 * DAY, status: 'completed', risk: 'green' },
  { id: 't2', accountId: 'u1', type: 'bill', amount: 1850.75, counterparty: 'Meralco', reference: '0123456789', timestamp: now - 2 * DAY, status: 'completed', risk: 'green' },
  { id: 't3', accountId: 'u1', type: 'receive', amount: 500, counterparty: 'Juan Dela Cruz', note: 'Lunch', timestamp: now - DAY, status: 'completed', risk: 'green' },
  { id: 't4', accountId: 'u2', type: 'send', amount: 500, counterparty: 'Demo User', note: 'Lunch', timestamp: now - DAY, status: 'completed', risk: 'green' },
];

export const seedPaymentMethods: PaymentMethod[] = [
  { id: 'pm1', accountId: 'u1', label: 'BPI Savings', accountType: 'bank', accountNumber: '•••• 4821' },
  { id: 'pm2', accountId: 'u1', label: 'Visa Debit', accountType: 'card', accountNumber: '•••• 1123' },
];

export const seedSubscriptions: Subscription[] = [
  { id: 's1', accountId: 'u1', merchant: 'NovelNest', plan: 'VIP Reader', amount: 149, cycle: 'weekly', linkedOn: now - 40 * DAY, nextCharge: now + 2 * DAY, status: 'active' },
  { id: 's2', accountId: 'u1', merchant: 'Spotify', plan: 'Premium Student', amount: 75, cycle: 'monthly', linkedOn: now - 90 * DAY, nextCharge: now + 12 * DAY, status: 'active' },
  { id: 's3', accountId: 'u1', merchant: 'Mobile Legends', plan: 'Weekly Diamond Pass', amount: 99, cycle: 'weekly', linkedOn: now - 10 * DAY, nextCharge: now + 4 * DAY, status: 'active' },
];

export const seedNotifications: Notification[] = [
  { id: 'n1', accountId: 'u1', message: 'Welcome to CiCo! Tip: CiCo will never ask for your OTP or MPIN.', kind: 'info', timestamp: now - 3 * DAY, read: true },
];

export const billers: Biller[] = [
  { id: 'b1', name: 'Meralco', category: 'Electricity', verified: true },
  { id: 'b2', name: 'Maynilad', category: 'Water', verified: true },
  { id: 'b3', name: 'PLDT Home', category: 'Internet', verified: true },
  { id: 'b4', name: 'Globe At Home', category: 'Internet', verified: true },
  { id: 'b5', name: 'USTP Tuition', category: 'School', verified: true },
];
