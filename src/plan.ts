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
  3000: { monthly: 49.99, annualMonthly: 33.33, yearly: 399.99 },
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

export type SummaryModel = {
  title: string
  subtitle: string
  subtotal: number
  discount: number | null
  total: number
  note: string
  showAnnualBadge: boolean
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
        total: PREMIUM_ANNUAL.yearly,
        note: `Billed yearly · $${PREMIUM_ANNUAL.annualMonthly.toFixed(2)} a month`,
        showAnnualBadge: true,
        tone: 'premium',
        payLabel: `Pay $${PREMIUM_ANNUAL.yearly.toFixed(2)}`,
      }
    }

    return {
      title: 'Premium',
      subtitle: 'Design faster with AI',
      subtotal: PREMIUM_ANNUAL.monthly,
      discount: null,
      total: PREMIUM_ANNUAL.monthly,
      note: 'Billed monthly',
      showAnnualBadge: false,
      tone: 'premium',
      payLabel: `Pay $${PREMIUM_ANNUAL.monthly.toFixed(2)}`,
    }
  }

  const pricing = PRO_PRICING[selection.credits]
  const subtotal = roundMoney(pricing.monthly * 12)
  const yearly = pricing.yearly
  const discount = roundMoney(subtotal - yearly)

  if (selection.freeTrial) {
    const after =
      selection.billing === 'annual'
        ? `then $${yearly.toFixed(2)}/year`
        : `then $${pricing.monthly.toFixed(2)}/month`
    return {
      title: 'Professional',
      subtitle: 'Maximum AI for client-ready interiors',
      subtotal: selection.billing === 'annual' ? subtotal : pricing.monthly,
      discount: selection.billing === 'annual' ? discount : null,
      total: 0,
      note: `Free for 7 days · ${after}`,
      showAnnualBadge: selection.billing === 'annual',
      tone: 'pro',
      payLabel: 'Start free trial',
    }
  }

  if (selection.billing === 'annual') {
    return {
      title: 'Professional',
      subtitle: 'Maximum AI for client-ready interiors',
      subtotal,
      discount,
      total: yearly,
      note: `Billed yearly · $${pricing.annualMonthly.toFixed(2)} a month`,
      showAnnualBadge: true,
      tone: 'pro',
      payLabel: `Pay $${yearly.toFixed(2)}`,
    }
  }

  return {
    title: 'Professional',
    subtitle: 'Maximum AI for client-ready interiors',
    subtotal: pricing.monthly,
    discount: null,
    total: pricing.monthly,
    note: 'Billed monthly',
    showAnnualBadge: false,
    tone: 'pro',
    payLabel: `Pay $${pricing.monthly.toFixed(2)}`,
  }
}
