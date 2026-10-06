export type PlanId = 'premium' | 'pro'
export type BillingPeriod = 'monthly' | 'annual'
export type CreditTier = 3000 | 5000 | 8000

export type CheckoutSelection = {
  plan: PlanId
  billing: BillingPeriod
  credits: CreditTier
  freeTrial: boolean
}

export const DEFAULT_SELECTION: CheckoutSelection = {
  plan: 'premium',
  billing: 'annual',
  credits: 3000,
  freeTrial: false,
}

export const PRO_PRICING = {
  3000: { monthly: 49.99, annualMonthly: 33.33, yearly: 399.96 },
  5000: { monthly: 79.99, annualMonthly: 53.33, yearly: 639.96 },
  8000: { monthly: 119.99, annualMonthly: 79.99, yearly: 959.88 },
} as const

const PREMIUM_ANNUAL = {
  monthly: 19.99,
  annualMonthly: 4.99,
  yearly: 59.88,
  subtotal: 239.88,
  discount: 180,
} as const

const TRIAL_END_LABEL = '10 Oct, 2026'

export type SummaryModel = {
  title: string
  subtitle: string
  subtotal: number
  discount: number | null
  /** Amount charged after trial / or regular total before VAT */
  totalAfter: number
  /** Amount due today (0 for trial) */
  dueToday: number
  note: string | null
  cancelNote: string | null
  legalPrefix: string
  showAnnualBadge: boolean
  showTrialBadge: boolean
  isTrial: boolean
  tone: 'premium' | 'pro'
  payLabel: string
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

export function buildSummary(selection: CheckoutSelection): SummaryModel {
  if (selection.plan === 'premium') {
    if (selection.billing === 'annual') {
      return {
        title: 'Premium',
        subtitle: 'Design faster with AI',
        subtotal: PREMIUM_ANNUAL.subtotal,
        discount: PREMIUM_ANNUAL.discount,
        totalAfter: PREMIUM_ANNUAL.yearly,
        dueToday: PREMIUM_ANNUAL.yearly,
        note: `Billed yearly · $${PREMIUM_ANNUAL.annualMonthly.toFixed(2)} a month`,
        cancelNote: null,
        legalPrefix: 'Payment is encrypted. By continuing you agree to the',
        showAnnualBadge: true,
        showTrialBadge: false,
        isTrial: false,
        tone: 'premium',
        payLabel: `Pay $${PREMIUM_ANNUAL.yearly.toFixed(2)}`,
      }
    }

    return {
      title: 'Premium',
      subtitle: 'Design faster with AI',
      subtotal: PREMIUM_ANNUAL.monthly,
      discount: null,
      totalAfter: PREMIUM_ANNUAL.monthly,
      dueToday: PREMIUM_ANNUAL.monthly,
      note: 'Billed monthly',
      cancelNote: null,
      legalPrefix: 'Payment is encrypted. By continuing you agree to the',
      showAnnualBadge: false,
      showTrialBadge: false,
      isTrial: false,
      tone: 'premium',
      payLabel: `Pay $${PREMIUM_ANNUAL.monthly.toFixed(2)}`,
    }
  }

  const pricing = PRO_PRICING[selection.credits]
  const subtotal = roundMoney(pricing.monthly * 12)
  const yearly = roundMoney(pricing.annualMonthly * 12)
  const discount = roundMoney(subtotal - yearly)

  if (selection.freeTrial) {
    const afterAmount =
      selection.billing === 'annual' ? yearly : pricing.monthly
    const afterPeriod = selection.billing === 'annual' ? 'yearly' : 'monthly'
    const billedNote =
      selection.billing === 'annual'
        ? `From ${TRIAL_END_LABEL}, billed yearly · $${pricing.annualMonthly.toFixed(2)} a month`
        : `From ${TRIAL_END_LABEL}, billed monthly · $${pricing.monthly.toFixed(2)} a month`

    return {
      title: 'Professional',
      subtitle: 'Maximum AI for client-ready interiors',
      subtotal: selection.billing === 'annual' ? subtotal : pricing.monthly,
      discount: selection.billing === 'annual' ? discount : null,
      totalAfter: afterAmount,
      dueToday: 0,
      note: billedNote,
      cancelNote: `Cancel anytime before ${TRIAL_END_LABEL}`,
      legalPrefix: `Payment is encrypted. After the trial, $${afterAmount.toFixed(2)} is charged ${afterPeriod} until you cancel. By continuing you agree to the`,
      showAnnualBadge: selection.billing === 'annual',
      showTrialBadge: true,
      isTrial: true,
      tone: 'pro',
      payLabel: 'Start trial for $0',
    }
  }

  if (selection.billing === 'annual') {
    return {
      title: 'Professional',
      subtitle: 'Maximum AI for client-ready interiors',
      subtotal,
      discount,
      totalAfter: yearly,
      dueToday: yearly,
      note: `Billed yearly · $${pricing.annualMonthly.toFixed(2)} a month`,
      cancelNote: null,
      legalPrefix: 'Payment is encrypted. By continuing you agree to the',
      showAnnualBadge: true,
      showTrialBadge: false,
      isTrial: false,
      tone: 'pro',
      payLabel: `Pay $${yearly.toFixed(2)}`,
    }
  }

  return {
    title: 'Professional',
    subtitle: 'Maximum AI for client-ready interiors',
    subtotal: pricing.monthly,
    discount: null,
    totalAfter: pricing.monthly,
    dueToday: pricing.monthly,
    note: 'Billed monthly',
    cancelNote: null,
    legalPrefix: 'Payment is encrypted. By continuing you agree to the',
    showAnnualBadge: false,
    showTrialBadge: false,
    isTrial: false,
    tone: 'pro',
    payLabel: `Pay $${pricing.monthly.toFixed(2)}`,
  }
}
