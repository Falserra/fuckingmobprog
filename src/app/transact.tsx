// Money Movement (Figure 5 / Figure 11) with the Screen-Sharing Detection
// sub-flow at the OTP step (Figure 6 / Figure 12).
//   form → verify → [flagged? hold: user confirms or cancels+reports] → OTP → gateway → receipt / retry
import { usePreventScreenCapture } from 'expo-screen-capture';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Btn, C, Card, Chip, H2, Input, Muted, RiskIndicator, Screen, VerifiedBadge, peso, s } from '@/components/wallet-ui';
import { billers } from '@/lib/seed';
import { detectScreenSharing } from '@/lib/security-layer';
import type { RiskLevel, TxType } from '@/lib/types';
import { useMe, useWallet, type TxRequest } from '@/lib/wallet-store';

type MoneyType = Exclude<TxType, 'receive'>;
type Step = 'form' | 'review' | 'otp' | 'processing' | 'done' | 'failed';

const TITLES: Record<MoneyType, string> = { send: 'Send money', bill: 'Pay bills', topup: 'Top up wallet' };
const MAX_OTP_TRIES = 3;

export default function TransactScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const me = useMe();
  const { paymentMethods, accountByUsername, verifyTransaction, processTransaction, cancelTransaction } = useWallet();

  const [type, setType] = useState<MoneyType>(params.type === 'bill' || params.type === 'topup' ? params.type : 'send');
  const [recipient, setRecipient] = useState('');
  const [billerId, setBillerId] = useState(billers[0].id);
  const [reference, setReference] = useState('');
  const [methodId, setMethodId] = useState(paymentMethods[0]?.id ?? '');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [receiptId, setReceiptId] = useState('');

  const amount = Number(amountText.replace(/,/g, '')) || 0;
  const req: TxRequest = {
    type,
    amount,
    recipientUsername: type === 'send' ? recipient : undefined,
    billerId: type === 'bill' ? billerId : undefined,
    paymentMethodId: type === 'topup' ? methodId : undefined,
    reference: type === 'bill' ? reference.trim() : undefined,
    note: type === 'send' ? note.trim() || undefined : undefined,
  };
  // Synchronous rule check on every render – well under NFR-02's 2s budget.
  const check = verifyTransaction(req);

  // Live recipient lookup for FR-03 (verified name before confirming)
  const lookup = type === 'send' && recipient.trim().length > 1 ? accountByUsername(recipient) : undefined;
  const lookupOk = lookup && lookup.role === 'customer' && lookup.id !== me.id;

  if (me.status === 'frozen' && step !== 'done') {
    return (
      <Screen>
        <Card style={{ backgroundColor: C.dangerBg }}>
          <H2>Account frozen</H2>
          <Text style={{ color: C.danger }}>Money movement is disabled until the Security Team unlocks your account.</Text>
        </Card>
        <Btn label="Back to dashboard" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const toReview = () => {
    if (type === 'send' && !lookupOk) return Alert.alert('Recipient not found', 'Enter the CiCo username of the person you want to pay.');
    if (type === 'bill' && !/^\d{6,15}$/.test(reference.trim())) return Alert.alert('Account number needed', 'Enter the 6–15 digit account number from your bill.');
    if (type === 'topup' && !methodId) return Alert.alert('No funding source', 'Link a bank account or card first.');
    if (amount <= 0) return Alert.alert('Enter an amount', 'The amount must be greater than ₱0.');
    if (type !== 'topup' && amount > me.balance) return Alert.alert('Insufficient balance', `Your balance is ${peso(me.balance)}.`);
    setStep('review');
  };

  const counterparty = check.recipientName ?? recipient;

  const cancelAndReport = () => {
    cancelTransaction(req, check.level, counterparty, check.reasons, true);
    Alert.alert('Transaction cancelled', 'We reported this to the Security Team. Thank you for staying alert.');
    router.back();
  };

  const runPayment = async (risk: RiskLevel) => {
    setStep('processing');
    const res = await processTransaction(req, risk);
    if (res.ok) {
      setReceiptId(res.transactionId ?? '');
      setStep('done');
    } else {
      setError(res.error);
      setStep('failed');
    }
  };

  return (
    <Screen>
      {step === 'form' && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {(Object.keys(TITLES) as MoneyType[]).map((t) => (
              <Chip key={t} label={TITLES[t]} active={type === t} onPress={() => setType(t)} />
            ))}
          </View>
          <Card>
            {type === 'send' && (
              <>
                <Input label="Recipient's CiCo username" placeholder="e.g. juan" autoCapitalize="none" autoCorrect={false} value={recipient} onChangeText={setRecipient} />
                {lookupOk ? (
                  <View style={[s.rowCenter, { gap: 8, marginBottom: 10 }]}>
                    <Text style={{ color: C.ink, fontWeight: '700' }}>{lookup.name}</Text>
                    <VerifiedBadge verified={lookup.verified} />
                    {lookup.status === 'frozen' && <Text style={{ color: C.danger, fontSize: 12 }}>Frozen</Text>}
                  </View>
                ) : recipient.trim().length > 1 ? (
                  <Text style={{ color: C.danger, marginBottom: 10 }}>No CiCo account with that username.</Text>
                ) : null}
              </>
            )}

            {type === 'bill' && (
              <>
                <Text style={s.label}>Biller</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                  {billers.map((b) => (
                    <Chip key={b.id} label={`${b.name}${b.verified ? ' ✓' : ''}`} active={billerId === b.id} onPress={() => setBillerId(b.id)} />
                  ))}
                </View>
                <Input label="Account number" placeholder="From your bill" keyboardType="number-pad" value={reference} onChangeText={setReference} />
              </>
            )}

            {type === 'topup' && (
              <>
                <Text style={s.label}>Funding source</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
                  {paymentMethods.length === 0 ? (
                    <Muted>No linked bank or card yet.</Muted>
                  ) : (
                    paymentMethods.map((p) => <Chip key={p.id} label={`${p.label} ${p.accountNumber}`} active={methodId === p.id} onPress={() => setMethodId(p.id)} />)
                  )}
                </View>
              </>
            )}

            <Input label="Amount (₱)" placeholder="0.00" keyboardType="decimal-pad" value={amountText} onChangeText={setAmountText} />
            {type === 'send' && <Input label="Message (optional)" placeholder="What's it for?" value={note} onChangeText={setNote} />}
            {type !== 'topup' && <Muted style={{ marginBottom: 8 }}>Available: {peso(me.balance)}</Muted>}
            <Btn label="Continue" onPress={toReview} />
          </Card>
        </>
      )}

      {step === 'review' && (
        <>
          <H2>{TITLES[type]}</H2>
          <Card>
            <Text style={s.label}>{type === 'topup' ? 'From' : 'To'}</Text>
            <View style={[s.rowCenter, { gap: 8, marginBottom: 10 }]}>
              <Text style={{ color: C.ink, fontWeight: '700', fontSize: 17 }}>{counterparty}</Text>
              {type !== 'topup' && <VerifiedBadge verified={!!check.recipientVerified} />}
            </View>
            {type === 'send' && <Muted>@{recipient.trim().toLowerCase().replace(/^@/, '')}</Muted>}
            {type === 'bill' && <Muted>Account no. {reference}</Muted>}
            <Text style={[s.label, { marginTop: 10 }]}>Amount</Text>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 28 }}>{peso(amount)}</Text>
            {req.note && <Muted>“{req.note}”</Muted>}
          </Card>

          {/* NFR-03: colour-coded indicator inline on the confirmation screen */}
          <RiskIndicator level={check.level} reasons={check.reasons} />

          {check.level === 'green' ? (
            <Btn label="Confirm" onPress={() => setStep('otp')} />
          ) : (
            <>
              <Card style={{ backgroundColor: '#FFF7E6' }}>
                <Text style={{ color: C.ink, fontWeight: '700' }}>This transaction is on hold.</Text>
                <Muted>Only continue if you know this person or merchant and nobody is pressuring you to pay.</Muted>
              </Card>
              <Btn label="It's legitimate — continue" variant={check.level === 'red' ? 'danger' : 'primary'} onPress={() => setStep('otp')} />
              <Btn label="Cancel and report" variant="ghost" onPress={cancelAndReport} />
            </>
          )}
          <Btn label="Edit details" variant="ghost" onPress={() => setStep('form')} />
        </>
      )}

      {step === 'otp' && (
        <OtpStep
          onVerified={() => runPayment(check.level)}
          onCancel={() => {
            cancelTransaction(req, check.level, counterparty, check.reasons, false);
            Alert.alert('Payment cancelled', 'Nothing was deducted from your wallet.');
            router.back();
          }}
        />
      )}

      {step === 'processing' && (
        <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={C.ink} style={{ marginBottom: 12 }} />
          <Muted>Processing via bank / payment gateway…</Muted>
        </Card>
      )}

      {step === 'done' && (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Text style={{ fontSize: 44 }}>✅</Text>
          <H2>{type === 'topup' ? 'Top up successful' : type === 'bill' ? 'Bill paid' : 'Money sent'}</H2>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 28 }}>{peso(amount)}</Text>
          <Muted>
            {type === 'topup' ? 'from' : 'to'} {counterparty}
          </Muted>
          <Muted style={{ marginTop: 8 }}>Ref. {receiptId.toUpperCase()}</Muted>
          <Muted>New balance: {peso(me.balance)}</Muted>
          <View style={{ alignSelf: 'stretch', marginTop: 16 }}>
            <Btn label="Done" onPress={() => router.back()} />
          </View>
        </Card>
      )}

      {step === 'failed' && (
        <Card>
          <H2>Transaction failed</H2>
          <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text>
          <Btn label="Edit and retry" onPress={() => setStep('form')} />
          <Btn label="Back to dashboard" variant="ghost" onPress={() => router.back()} />
        </Card>
      )}
    </Screen>
  );
}

// ---- Screen-Sharing Detection sub-flow (Figure 12) ----
function OtpStep({ onVerified, onCancel }: { onVerified: () => void; onCancel: () => void }) {
  // Always block capture while the OTP is on screen (FLAG_SECURE on Android).
  usePreventScreenCapture('otp');

  const [otp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [sharing, setSharing] = useState<'checking' | 'active' | 'inactive'>('checking');
  const [acknowledged, setAcknowledged] = useState(false);
  const [input, setInput] = useState('');
  const [tries, setTries] = useState(0);
  const [reveal, setReveal] = useState(false);

  // detectScreenSharing() once when the step opens
  useEffect(() => {
    let live = true;
    detectScreenSharing().then((status) => live && setSharing(status));
    return () => {
      live = false;
    };
  }, []);

  const masked = sharing === 'active';

  const submit = () => {
    if (input === otp) return onVerified();
    const n = tries + 1;
    setTries(n);
    setInput('');
    if (n >= MAX_OTP_TRIES) onCancel();
    else Alert.alert('Invalid OTP', `${MAX_OTP_TRIES - n} attempt(s) left.`);
  };

  if (sharing === 'checking') return <Muted>Checking device security…</Muted>;

  if (masked && !acknowledged) {
    return (
      <Card style={{ backgroundColor: C.dangerBg }}>
        <Text style={{ fontSize: 36 }}>⚠️</Text>
        <H2>Your screen is being shared</H2>
        <Text style={{ color: C.danger, marginBottom: 8, lineHeight: 20 }}>
          Someone may be watching your screen right now. Scammers ask victims to share their screen on a video call so they can read OTP codes.
        </Text>
        <Text style={{ color: C.danger, fontWeight: '700', marginBottom: 12 }}>CiCo will never ask you to share your screen. Stop sharing before continuing.</Text>
        <Btn label="Cancel payment" variant="danger" onPress={onCancel} />
        <Btn label="Continue anyway (fields stay masked)" variant="ghost" onPress={() => setAcknowledged(true)} />
      </Card>
    );
  }

  return (
    <>
      {/* Simulated SMS delivery of the OTP (NFR-04). Masked while screen sharing is active. */}
      <Card style={{ backgroundColor: '#E6F4F1' }}>
        <Text style={s.label}>SMS from CiCo</Text>
        {masked ? (
          <Pressable onPressIn={() => setReveal(true)} onPressOut={() => setReveal(false)}>
            <Text style={{ color: C.ink }}>
              Your CiCo OTP is <Text style={{ fontWeight: '800' }}>{reveal ? otp : '••••••'}</Text>. Never share it.
            </Text>
            <Muted>Hold to reveal — hidden because your screen is shared.</Muted>
          </Pressable>
        ) : (
          <Text style={{ color: C.ink }}>
            Your CiCo OTP is <Text style={{ fontWeight: '800' }}>{otp}</Text>. Never share it with anyone, including CiCo staff.
          </Text>
        )}
      </Card>
      <Card>
        <H2>Enter the 6-digit OTP</H2>
        {masked && <Text style={{ color: C.danger, marginBottom: 8 }}>Screen sharing detected — input is masked.</Text>}
        <Input
          placeholder="••••••"
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry={masked}
          value={input}
          onChangeText={setInput}
          autoFocus
          textContentType="oneTimeCode"
        />
        <Btn label="Authorize payment" onPress={submit} disabled={input.length !== 6} />
        <Btn label="Cancel" variant="ghost" onPress={onCancel} />
      </Card>
    </>
  );
}
