// TransactionVerification (Master File §5.4.2) and link/SMS scanning (FR-02, revised).
// Rule-based so results are explainable to the user; a real deployment would back
// the blocklist with a threat-intelligence feed.
import type { RiskLevel, TxType } from './types';

export type RiskResult = { level: RiskLevel; reasons: string[] };

const BLOCKED_DOMAINS = [
  'gcash-rewards.com',
  'cico-verify.net',
  'bdo-points.ph',
  'claim-prize.xyz',
  'maya-promo.top',
];
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rb.gy', 's.id'];
const SUSPICIOUS_TLDS = ['xyz', 'top', 'click', 'link', 'zip', 'mov', 'icu', 'buzz'];
const BRAND_WORDS = ['gcash', 'maya', 'cico', 'bdo', 'bpi', 'landbank', 'paypal'];
const OFFICIAL_DOMAINS = ['cico.ph', 'gcash.com', 'maya.ph', 'bdo.com.ph', 'bpi.com.ph', 'paypal.com'];
const SCAM_PHRASES = [
  'you won', 'you have won', 'claim your', 'congratulations', 'prize', 'reward points',
  'account will be locked', 'account suspended', 'verify your account', 'urgent',
  'send your otp', 'share your otp', 'share your screen', 'refund', 'limited time',
];

const URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

export function extractUrls(text: string): string[] {
  return text.match(URL_RE) ?? [];
}

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].toLowerCase();
}

function isOfficial(host: string) {
  return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}

export function scanUrl(url: string): RiskResult {
  const host = hostOf(url);
  const reasons: string[] = [];
  let level: RiskLevel = 'green';
  const raise = (to: RiskLevel, why: string) => {
    reasons.push(why);
    if (to === 'red' || level === 'green') level = to;
  };

  if (BLOCKED_DOMAINS.some((d) => host === d || host.endsWith('.' + d))) raise('red', `${host} is on the known-scam blocklist`);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) raise('red', 'Link points to a raw IP address instead of a website name');
  if (!isOfficial(host) && BRAND_WORDS.some((b) => host.includes(b))) raise('red', `${host} imitates a wallet or bank brand but is not its official site`);
  if (SHORTENERS.includes(host)) raise('yellow', 'Shortened link hides the real destination');
  if (SUSPICIOUS_TLDS.includes(host.split('.').pop() ?? '')) raise('yellow', `.${host.split('.').pop()} domains are often used in scams`);
  if (url.toLowerCase().startsWith('http://')) raise('yellow', 'Link is not encrypted (http instead of https)');
  if (host.includes('xn--')) raise('red', 'Link uses look-alike characters (punycode)');

  return { level, reasons };
}

export function scanMessage(text: string): RiskResult & { urls: { url: string; result: RiskResult }[] } {
  const urls = extractUrls(text).map((url) => ({ url, result: scanUrl(url) }));
  const lower = text.toLowerCase();
  const phrases = SCAM_PHRASES.filter((p) => lower.includes(p));
  const reasons = urls.flatMap((u) => u.result.reasons);
  let level: RiskLevel = urls.some((u) => u.result.level === 'red') ? 'red' : urls.some((u) => u.result.level === 'yellow') ? 'yellow' : 'green';

  if (phrases.length) {
    reasons.push(`Uses common scam wording: "${phrases.slice(0, 3).join('", "')}"`);
    if (level === 'green') level = 'yellow';
    if (urls.length && phrases.length >= 2) level = 'red';
  }
  if (/\botp\b|\bmpin\b|\bpin\b/i.test(text) && /send|share|give|reply/i.test(text)) {
    reasons.push('Asks you to share an OTP or PIN – CiCo will never ask for these');
    level = 'red';
  }
  return { level, reasons, urls };
}

export type TxDetails = {
  type: TxType;
  amount: number;
  balance: number;
  recipientKnown: boolean; // exists in CiCo / biller list
  recipientVerified: boolean;
  recipientFrozen: boolean;
  recipientReported: boolean;
  firstTimeRecipient: boolean;
  note?: string;
};

// runRiskAssessment(transactionDetails) – returns a colour-coded result (NFR-03)
export function runRiskAssessment(d: TxDetails): RiskResult {
  const reasons: string[] = [];
  let level: RiskLevel = 'green';
  const raise = (to: RiskLevel, why: string) => {
    reasons.push(why);
    if (to === 'red' || level === 'green') level = to;
  };

  if (d.type !== 'topup') {
    if (!d.recipientKnown) raise('red', 'Recipient is not a registered CiCo account or biller');
    else if (!d.recipientVerified) raise('yellow', 'Recipient has not completed identity verification');
    if (d.recipientFrozen) raise('red', 'Recipient account is frozen pending a fraud investigation');
    if (d.recipientReported) raise('red', 'Recipient has been reported by other users');
    if (d.type === 'send' && d.firstTimeRecipient && d.recipientKnown) raise('yellow', 'First time sending to this person');
    if (d.balance > 0 && d.amount >= d.balance * 0.8) raise('yellow', 'Amount is most of your balance');
  }
  if (d.amount >= 20000) raise('yellow', 'Large amount (₱20,000 or more)');
  if (d.note) {
    const msg = scanMessage(d.note);
    if (msg.level !== 'green') raise(msg.level, 'Note contains suspicious content: ' + msg.reasons[0]);
  }
  return { level, reasons };
}

export const RISK_COPY: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  green: { label: 'Low risk', color: '#0E7C4A', bg: '#DDF5E8' },
  yellow: { label: 'Check details', color: '#8A5A00', bg: '#FFF1CC' },
  red: { label: 'High risk', color: '#B42318', bg: '#FDE2DF' },
};
