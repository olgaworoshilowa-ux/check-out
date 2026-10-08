import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { asset } from './assets'
import {
  buildSummary,
  getBillingSwitcherPrices,
  type BillingPeriod,
  type CheckoutSelection,
} from './plan'
import './Checkout.css'

type PaymentMethod = 'card' | 'apple' | 'paypal'

const VAT_RATES: Record<string, number> = {
  Georgia: 0.18,
  Germany: 0.19,
  France: 0.19,
  Lithuania: 0.21,
  'United Kingdom': 0.2,
  'United States': 0,
}
const TAX_CALC_MS = 800

function getVatRate(country: string) {
  return VAT_RATES[country] ?? 0.19
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
}

/** Figma shows whole dollars without cents when .00 (e.g. –$180) */
function formatMoneyCompact(value: number) {
  if (Number.isInteger(value)) return `$${value}`
  return formatMoney(value)
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function formatCardNumber(value: string) {
  const digits = digitsOnly(value).slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isCardComplete(cardNumber: string, expiration: string, cvc: string) {
  return (
    digitsOnly(cardNumber).length === 16 &&
    digitsOnly(expiration).length === 4 &&
    digitsOnly(cvc).length >= 3
  )
}

export default function Checkout({
  onBack,
  selection,
}: {
  onBack?: () => void
  selection: CheckoutSelection
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [cardNumber, setCardNumber] = useState('')
  const [expiration, setExpiration] = useState('')
  const [cvc, setCvc] = useState('')
  const [email, setEmail] = useState('beccago@gmail.com')
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('Georgia')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [isBusiness, setIsBusiness] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [taxIdType, setTaxIdType] = useState('GE VAT')
  const [taxId, setTaxId] = useState('')
  const [taxLoading, setTaxLoading] = useState(false)
  const taxTimerRef = useRef<number | null>(null)

  // Once unlocked — stays open until leave/remount (Back → Upgrade resets form)
  const [unlockedEmail, setUnlockedEmail] = useState(false)
  const [unlockedBilling, setUnlockedBilling] = useState(false)
  const [unlockedExtendedAddress, setUnlockedExtendedAddress] = useState(false)
  const [unlockedBusinessToggle, setUnlockedBusinessToggle] = useState(false)
  const [cardErrors, setCardErrors] = useState<{
    cardNumber?: string
    expiration?: string
    cvc?: string
  }>({})
  const [billingErrors, setBillingErrors] = useState<{
    fullName?: string
    address1?: string
    city?: string
    postalCode?: string
  }>({})
  const cardNumberFieldRef = useRef<HTMLDivElement>(null)
  const expirationFieldRef = useRef<HTMLDivElement>(null)
  const cvcFieldRef = useRef<HTMLDivElement>(null)
  const fullNameFieldRef = useRef<HTMLDivElement>(null)
  const address1FieldRef = useRef<HTMLDivElement>(null)
  const cityFieldRef = useRef<HTMLDivElement>(null)
  const postalCodeFieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isCardComplete(cardNumber, expiration, cvc)) {
      setUnlockedEmail(true)
      // Email is prefilled — open billing together with email
      if (isValidEmail(email)) {
        setUnlockedBilling(true)
      }
    }
  }, [cardNumber, expiration, cvc, email])

  useEffect(() => {
    if (unlockedEmail && isValidEmail(email)) {
      setUnlockedBilling(true)
    }
  }, [unlockedEmail, email])

  useEffect(() => {
    if (unlockedBilling && fullName.trim().length > 0) {
      setUnlockedExtendedAddress(true)
    }
  }, [unlockedBilling, fullName])

  useEffect(() => {
    if (
      unlockedExtendedAddress &&
      city.trim().length > 0 &&
      postalCode.trim().length > 0
    ) {
      setUnlockedBusinessToggle(true)
    }
  }, [unlockedExtendedAddress, city, postalCode])

  const showEmail = paymentMethod === 'card' && unlockedEmail
  const showBilling = paymentMethod === 'card' && unlockedBilling
  const showExtendedAddress = paymentMethod === 'card' && unlockedExtendedAddress
  const showBusinessToggle = paymentMethod === 'card' && unlockedBusinessToggle
  const showBusinessFields = showBusinessToggle && isBusiness

  // Show Monthly/Annual cards only if user arrived from Monthly on Upgrade
  const [allowBillingSwitch] = useState(() => selection.billing === 'monthly')
  const [billing, setBilling] = useState<BillingPeriod>(selection.billing)

  const activeSelection = useMemo(
    () => ({ ...selection, billing }),
    [selection, billing],
  )
  const summary = useMemo(() => buildSummary(activeSelection), [activeSelection])
  const switcherPrices = useMemo(
    () => getBillingSwitcherPrices(activeSelection),
    [activeSelection],
  )
  const vatBase = summary.isTrial ? summary.dueToday : summary.totalAfter
  // German B2B with company details → reverse charge (0% VAT)
  const isGermanBusiness =
    isBusiness &&
    country === 'Germany' &&
    businessName.trim().length > 0 &&
    taxId.trim().length > 0
  // Location tax in summary from the start; France: never show (even with business)
  const showTaxRow = country !== 'France'
  const vatRate = isGermanBusiness ? 0 : getVatRate(country)
  const vat = showTaxRow ? Number((vatBase * vatRate).toFixed(2)) : 0
  const total = Number((vatBase + vat).toFixed(2))
  const isPro = summary.tone === 'pro'
  const vatLabel = `VAT ${Math.round(vatRate * 100)}%`

  function startTaxCalculation() {
    if (taxTimerRef.current != null) {
      window.clearTimeout(taxTimerRef.current)
    }
    setTaxLoading(true)
    taxTimerRef.current = window.setTimeout(() => {
      setTaxLoading(false)
      taxTimerRef.current = null
    }, TAX_CALC_MS)
  }

  useEffect(() => {
    return () => {
      if (taxTimerRef.current != null) {
        window.clearTimeout(taxTimerRef.current)
      }
    }
  }, [])

  // Recalculate when German B2B reverse-charge eligibility changes
  const germanBusinessKey = isGermanBusiness ? 'de-b2b' : 'consumer'
  const prevGermanKeyRef = useRef(germanBusinessKey)
  useEffect(() => {
    if (!showBilling) {
      prevGermanKeyRef.current = germanBusinessKey
      return
    }
    if (prevGermanKeyRef.current !== germanBusinessKey) {
      prevGermanKeyRef.current = germanBusinessKey
      startTaxCalculation()
    }
  }, [showBilling, germanBusinessKey])

  const addressLabel = useMemo(
    () => (showExtendedAddress ? 'Address line 1' : 'Address'),
    [showExtendedAddress],
  )

  function validateCardFields() {
    const next: { cardNumber?: string; expiration?: string; cvc?: string } = {}
    const numberDigits = digitsOnly(cardNumber)
    const expiryDigits = digitsOnly(expiration)
    const cvcDigits = digitsOnly(cvc)

    if (!numberDigits) {
      next.cardNumber = 'Card number is required'
    } else if (numberDigits.length < 16) {
      next.cardNumber = 'Your card number is incomplete'
    }

    if (!expiryDigits) {
      next.expiration = 'Expiration is required'
    } else if (expiryDigits.length < 4) {
      next.expiration = "Your card's expiration date is incomplete"
    }

    if (!cvcDigits) {
      next.cvc = 'Security code is required'
    } else if (cvcDigits.length < 3) {
      next.cvc = "Your card's security code is incomplete"
    }

    setCardErrors(next)
    return next
  }

  function validateBillingFields() {
    const next: {
      fullName?: string
      address1?: string
      city?: string
      postalCode?: string
    } = {}

    if (!showBilling) {
      setBillingErrors({})
      return next
    }

    if (!fullName.trim()) {
      next.fullName = 'Full name is required'
    }

    if (!address1.trim()) {
      next.address1 = 'Address is required'
    }

    if (showExtendedAddress) {
      if (!city.trim()) {
        next.city = 'City is required'
      }
      if (!postalCode.trim()) {
        next.postalCode = 'Postal code is required'
      }
    }

    setBillingErrors(next)
    return next
  }

  function handlePay() {
    if (paymentMethod !== 'card') {
      return
    }

    const cardNext = validateCardFields()
    const billingNext = validateBillingFields()
    const hasErrors = Boolean(
      cardNext.cardNumber ||
        cardNext.expiration ||
        cardNext.cvc ||
        billingNext.fullName ||
        billingNext.address1 ||
        billingNext.city ||
        billingNext.postalCode,
    )

    if (!hasErrors) {
      // Prototype — no real charge
      return
    }

    // Scroll to first invalid field so errors are visible
    const target: HTMLDivElement | null = cardNext.cardNumber
      ? cardNumberFieldRef.current
      : cardNext.expiration
        ? expirationFieldRef.current
        : cardNext.cvc
          ? cvcFieldRef.current
          : billingNext.fullName
            ? fullNameFieldRef.current
            : billingNext.address1
              ? address1FieldRef.current
              : billingNext.city
                ? cityFieldRef.current
                : billingNext.postalCode
                  ? postalCodeFieldRef.current
                  : null

    window.setTimeout(() => {
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    handlePay()
  }

  return (
    <div className="checkout">
      <header className="checkout__top">
        <button type="button" className="btn-back" aria-label="Back" onClick={onBack}>
          <span className="btn__glyph" aria-hidden="true">
            <img src={asset('back.svg')} alt="" />
          </span>
          Back
        </button>
        <button type="button" className="btn-icon" aria-label="Close" onClick={onBack}>
          <span className="btn__glyph" aria-hidden="true">
            <img src={asset('close.svg')} alt="" />
          </span>
        </button>
      </header>

      <div className="checkout__body">
        <form className="checkout__form" onSubmit={handleSubmit}>
          <h1 className="checkout__title">Complete order</h1>

          <div className="payment-methods" role="radiogroup" aria-label="Payment method">
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'card'}
              className={`payment-method${paymentMethod === 'card' ? ' payment-method--active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <span className="payment-method__icon payment-method__icon--card">
                <img src={asset('card-icon.svg')} alt="" />
              </span>
              <span className="payment-method__label">Card</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'apple'}
              className={`payment-method${paymentMethod === 'apple' ? ' payment-method--active' : ''}`}
              onClick={() => {
                setPaymentMethod('apple')
                setCardErrors({})
              }}
            >
              <span className="payment-method__icon payment-method__icon--wide">
                <img src={asset('apple-pay.svg')} alt="" />
              </span>
              <span className="payment-method__label">Apple Pay</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'paypal'}
              className={`payment-method${paymentMethod === 'paypal' ? ' payment-method--active' : ''}`}
              onClick={() => {
                setPaymentMethod('paypal')
                setCardErrors({})
              }}
            >
              <span className="payment-method__icon payment-method__icon--paypal">
                <img src={asset('paypal.svg')} alt="" />
              </span>
              <span className="payment-method__label">PayPal</span>
            </button>
          </div>

          {paymentMethod === 'card' ? (
            <>
              <div ref={cardNumberFieldRef}>
                <Field
                  label="Card number"
                  filled={cardNumber.length > 0}
                  error={cardErrors.cardNumber}
                >
                  <input
                    className="field__input"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1424 1424 1424 1424"
                    value={cardNumber}
                    aria-invalid={Boolean(cardErrors.cardNumber)}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setCardNumber(formatCardNumber(e.target.value))
                      if (cardErrors.cardNumber) {
                        setCardErrors((prev) => ({ ...prev, cardNumber: undefined }))
                      }
                    }}
                  />
                  <div className="field__brands" aria-hidden="true">
                    <span className="brand-badge">
                      <img src={asset('mastercard.svg')} alt="" />
                    </span>
                    <span className="brand-badge">
                      <img src={asset('visa.svg')} alt="" />
                    </span>
                    <span className="brand-badge brand-badge--amex">
                      <img src={asset('amex.svg')} alt="" />
                    </span>
                  </div>
                </Field>
              </div>

              <div className="field-row">
                <div ref={expirationFieldRef} className="field-row__item">
                  <Field
                    label="Expiration"
                    filled={expiration.length > 0}
                    error={cardErrors.expiration}
                  >
                    <input
                      className="field__input"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      value={expiration}
                      aria-invalid={Boolean(cardErrors.expiration)}
                      onChange={(e) => {
                        setExpiration(formatExpiry(e.target.value))
                        if (cardErrors.expiration) {
                          setCardErrors((prev) => ({ ...prev, expiration: undefined }))
                        }
                      }}
                    />
                  </Field>
                </div>
                <div ref={cvcFieldRef} className="field-row__item">
                  <Field
                    label="Security code"
                    filled={cvc.length > 0}
                    error={cardErrors.cvc}
                  >
                    <input
                      className="field__input"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="CVC"
                      maxLength={4}
                      value={cvc}
                      aria-invalid={Boolean(cardErrors.cvc)}
                      onChange={(e) => {
                        setCvc(digitsOnly(e.target.value).slice(0, 4))
                        if (cardErrors.cvc) {
                          setCardErrors((prev) => ({ ...prev, cvc: undefined }))
                        }
                      }}
                    />
                  </Field>
                </div>
              </div>
            </>
          ) : paymentMethod === 'paypal' ? (
            <div className="redirect-card reveal">
              <p className="redirect-card__title">PayPal selected.</p>
              <div className="redirect-card__divider" aria-hidden="true" />
              <div className="redirect-text" data-testid="next-action-text">
                <svg
                  className="redirect-text__icon"
                  viewBox="0 0 48 40"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  role="presentation"
                  aria-hidden="true"
                >
                  <path
                    opacity=".6"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0 8a4 4 0 014-4h30a4 4 0 014 4v8a1 1 0 11-2 0v-4a2 2 0 00-2-2H4a2 2 0 00-2 2v20a2 2 0 002 2h30a2 2 0 002-2v-6a1 1 0 112 0v6a4 4 0 01-4 4H4a4 4 0 01-4-4V8zm4 0a1 1 0 100-2 1 1 0 000 2zm3 0a1 1 0 100-2 1 1 0 000 2zm4-1a1 1 0 11-2 0 1 1 0 012 0zm29.992 9.409L44.583 20H29a1 1 0 100 2h15.583l-3.591 3.591a1 1 0 101.415 1.416l5.3-5.3a1 1 0 000-1.414l-5.3-5.3a1 1 0 10-1.415 1.416z"
                  />
                </svg>
                <span>After submission, you will be redirected to securely complete next steps.</span>
              </div>
            </div>
          ) : (
            <div className="redirect-card reveal">
              <div className="redirect-text" data-testid="next-action-text">
                <svg
                  className="redirect-text__icon"
                  viewBox="0 0 48 40"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  role="presentation"
                  aria-hidden="true"
                >
                  <path
                    opacity=".6"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M43 5a4 4 0 00-4-4H17a4 4 0 00-4 4v11a1 1 0 102 0V5a2 2 0 012-2h22a2 2 0 012 2v30a2 2 0 01-2 2H17a2 2 0 01-2-2v-9a1 1 0 10-2 0v9a4 4 0 004 4h22a4 4 0 004-4V5zM17.992 16.409L21.583 20H6a1 1 0 100 2h15.583l-3.591 3.591a1 1 0 101.415 1.416l5.3-5.3a1 1 0 000-1.414l-5.3-5.3a1 1 0 10-1.415 1.416zM17 6a1 1 0 011-1h15a1 1 0 011 1v2a1 1 0 01-1 1H18a1 1 0 01-1-1V6zm21-1a1 1 0 100 2 1 1 0 000-2z"
                  />
                </svg>
                <span>Another step will appear to securely submit your payment information.</span>
              </div>
            </div>
          )}

          {showEmail ? (
            <div className="reveal">
              <Field label="Email" filled={email.trim().length > 0}>
                <input
                  className="field__input"
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>
          ) : null}

          {showBilling ? (
            <div className="reveal">
              <h2 className="checkout__section-title">Billing address</h2>

              <div ref={fullNameFieldRef}>
                <Field
                  label="Full name"
                  filled={fullName.trim().length > 0}
                  error={billingErrors.fullName}
                >
                  <input
                    className="field__input"
                    autoComplete="name"
                    placeholder=" "
                    value={fullName}
                    aria-invalid={Boolean(billingErrors.fullName)}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      if (billingErrors.fullName) {
                        setBillingErrors((prev) => ({ ...prev, fullName: undefined }))
                      }
                    }}
                  />
                </Field>
              </div>

              <Field label="Country" filled>
                <select
                  className="field__input field__input--select"
                  value={country}
                  onChange={(e) => {
                    const next = e.target.value
                    setCountry(next)
                    if (next === 'Germany' || next === 'Lithuania') {
                      setTaxIdType('EU VAT')
                    } else if (next === 'United States') {
                      setTaxIdType('US EIN')
                    } else if (next === 'Georgia') {
                      setTaxIdType('GE VAT')
                    } else {
                      setTaxIdType('EU VAT')
                    }
                    startTaxCalculation()
                  }}
                >
                  <option>Georgia</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Germany</option>
                  <option>France</option>
                  <option>Lithuania</option>
                </select>
                <span className="field__chevron" aria-hidden="true">
                  <img src={asset('chevron-down.svg')} alt="" />
                </span>
              </Field>

              <div ref={address1FieldRef}>
                <Field
                  label={addressLabel}
                  filled={address1.trim().length > 0}
                  error={billingErrors.address1}
                >
                  <input
                    className="field__input"
                    autoComplete="address-line1"
                    placeholder=" "
                    value={address1}
                    aria-invalid={Boolean(billingErrors.address1)}
                    onChange={(e) => {
                      setAddress1(e.target.value)
                      if (billingErrors.address1) {
                        setBillingErrors((prev) => ({ ...prev, address1: undefined }))
                      }
                    }}
                  />
                </Field>
              </div>

              {showExtendedAddress ? (
                <div className="reveal">
                  <Field label="Address line 2" filled={address2.trim().length > 0}>
                    <input
                      className="field__input"
                      autoComplete="address-line2"
                      placeholder=" "
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                    />
                  </Field>

                  <div ref={cityFieldRef}>
                    <Field
                      label="City"
                      filled={city.trim().length > 0}
                      error={billingErrors.city}
                    >
                      <input
                        className="field__input"
                        autoComplete="address-level2"
                        placeholder=" "
                        value={city}
                        aria-invalid={Boolean(billingErrors.city)}
                        onChange={(e) => {
                          setCity(e.target.value)
                          if (billingErrors.city) {
                            setBillingErrors((prev) => ({ ...prev, city: undefined }))
                          }
                        }}
                      />
                    </Field>
                  </div>

                  <div ref={postalCodeFieldRef}>
                    <Field
                      label="Postal code"
                      filled={postalCode.trim().length > 0}
                      error={billingErrors.postalCode}
                    >
                      <input
                        className="field__input"
                        autoComplete="postal-code"
                        placeholder=" "
                        value={postalCode}
                        aria-invalid={Boolean(billingErrors.postalCode)}
                        onChange={(e) => {
                          setPostalCode(e.target.value)
                          if (billingErrors.postalCode) {
                            setBillingErrors((prev) => ({ ...prev, postalCode: undefined }))
                          }
                        }}
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showBusinessToggle ? (
            <div className="reveal">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={isBusiness}
                  onChange={(e) => setIsBusiness(e.target.checked)}
                />
                <span className={`checkbox${isBusiness ? ' checkbox--checked' : ''}`}>
                  {isBusiness ? <img src={asset('check.svg')} alt="" /> : null}
                </span>
                <span className="checkbox-row__label">I&apos;m buying as a business</span>
              </label>

              {showBusinessFields ? (
                <div className="business-fields reveal">
                  <Field label="Business name" filled={businessName.trim().length > 0}>
                    <input
                      className="field__input"
                      placeholder=" "
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </Field>

                  <div className="field-row">
                    <Field label="Tax ID type" filled>
                      <select
                        className="field__input field__input--select"
                        value={taxIdType}
                        onChange={(e) => setTaxIdType(e.target.value)}
                      >
                        <option value="GE VAT">🇬🇪  GE VAT</option>
                        <option value="EU VAT">EU VAT</option>
                        <option value="US EIN">US EIN</option>
                      </select>
                      <span className="field__chevron" aria-hidden="true">
                        <img src={asset('chevron-down.svg')} alt="" />
                      </span>
                    </Field>
                    <Field label="Tax ID" filled={taxId.trim().length > 0}>
                      <input
                        className="field__input"
                        placeholder=" "
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </form>

        <aside className="checkout__sidebar" aria-label="Order summary">
          <div className={`summary${isPro ? ' summary--pro' : ''}${summary.isTrial ? ' summary--trial' : ''}`}>
            <div
              className={`summary__glow ${isPro ? 'summary__glow--lilac' : 'summary__glow--lime'}`}
              aria-hidden="true"
            />
            <div
              className={`summary__glow ${isPro ? 'summary__glow--sky' : 'summary__glow--mint'}`}
              aria-hidden="true"
            />
            <div className="summary__content">
              <div className="summary__heading">
                <h2 className="summary__title">{summary.title}</h2>
                {summary.showTrialBadge ? (
                  <span className="badge badge--soft">+ 7 days for free</span>
                ) : null}
              </div>
              <p className="summary__subtitle">{summary.subtitle}</p>

              {allowBillingSwitch ? (
                <div className="billing-switch" role="radiogroup" aria-label="Billing period">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={billing === 'monthly'}
                    className={`billing-switch__card${billing === 'monthly' ? ' billing-switch__card--active' : ''}`}
                    onClick={() => setBilling('monthly')}
                  >
                    <span
                      className={`billing-switch__check${billing === 'monthly' ? ' billing-switch__check--on' : ''}`}
                      aria-hidden="true"
                    >
                      {billing === 'monthly' ? (
                        <img src={asset('check-small.svg')} alt="" />
                      ) : null}
                    </span>
                    <span className="billing-switch__name">Monthly</span>
                    <span className="billing-switch__price">
                      {formatMoney(switcherPrices.monthlyPerMonth)}/mo
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={billing === 'annual'}
                    className={`billing-switch__card${billing === 'annual' ? ' billing-switch__card--active' : ''}`}
                    onClick={() => setBilling('annual')}
                  >
                    <span
                      className={`billing-switch__check${billing === 'annual' ? ' billing-switch__check--on' : ''}`}
                      aria-hidden="true"
                    >
                      {billing === 'annual' ? (
                        <img src={asset('check-small.svg')} alt="" />
                      ) : null}
                    </span>
                    <span
                      className={`billing-switch__badge${isPro ? ' billing-switch__badge--dark' : ''}`}
                    >
                      75% OFF
                    </span>
                    <span className="billing-switch__name">Annual</span>
                    <span className="billing-switch__price">
                      {formatMoney(switcherPrices.annualPerMonth)}/mo
                    </span>
                  </button>
                </div>
              ) : null}

              <div className="summary__rows">
                <div className="summary__row">
                  <span>Subtotal</span>
                  <span>{formatMoney(summary.subtotal)}</span>
                </div>
                {summary.discount != null && !(allowBillingSwitch && billing === 'monthly') ? (
                  <div className="summary__row">
                    <span className="summary__row-left">
                      Annual discount
                      {summary.showAnnualBadge || (allowBillingSwitch && billing === 'annual') ? (
                        <span className={`badge${isPro ? ' badge--dark' : ''}`}>75% OFF</span>
                      ) : null}
                    </span>
                    <span>–{formatMoneyCompact(summary.discount)}</span>
                  </div>
                ) : null}

                {summary.isTrial ? (
                  <>
                    <div className="summary__row">
                      <span>Total after trial</span>
                      <span>{formatMoney(summary.totalAfter)}</span>
                    </div>
                    {summary.note ? <p className="summary__note summary__note--flush">{summary.note}</p> : null}
                    <div className="summary__row summary__row--trial">
                      <span className="summary__trial-label">
                        <img
                          className="summary__trial-highlight"
                          src={asset('trial-row-highlight.svg')}
                          alt=""
                          aria-hidden="true"
                        />
                        <span>7 day trial</span>
                      </span>
                      <span>$0 today</span>
                    </div>
                  </>
                ) : null}

                {showTaxRow ? (
                  <div className="summary__row reveal">
                    <span>{vatLabel}</span>
                    <span aria-busy={taxLoading}>
                      {taxLoading ? (
                        <span className="summary__skeleton" aria-hidden="true" />
                      ) : (
                        formatMoney(vat)
                      )}
                    </span>
                  </div>
                ) : null}
              </div>

              {summary.isTrial ? (
                <>
                  <div className="summary__total">
                    <span>Due today</span>
                    <span aria-busy={taxLoading && showTaxRow}>
                      {taxLoading && showTaxRow ? (
                        <span className="summary__skeleton summary__skeleton--total" aria-hidden="true" />
                      ) : (
                        formatMoney(total)
                      )}
                    </span>
                  </div>
                  {summary.cancelNote ? (
                    <p className="summary__note">{summary.cancelNote}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="summary__total">
                    <span>Total</span>
                    <span aria-busy={taxLoading && showTaxRow}>
                      {taxLoading && showTaxRow ? (
                        <span className="summary__skeleton summary__skeleton--total" aria-hidden="true" />
                      ) : (
                        formatMoney(total)
                      )}
                    </span>
                  </div>
                  {summary.note ? <p className="summary__note">{summary.note}</p> : null}
                </>
              )}
            </div>
          </div>

          {paymentMethod === 'apple' ? (
            <button
              type="button"
              className="btn-apple-pay"
              onClick={handlePay}
              aria-label={
                summary.isTrial
                  ? 'Start trial for $0 with Apple Pay'
                  : `Pay ${formatMoney(total)} with Apple Pay`
              }
            >
              <img src={asset('apple-pay.svg')} alt="" className="btn-apple-pay__logo" />
            </button>
          ) : (
            <button
              type="button"
              className={`btn-pay${isPro ? ' btn-pay--pro' : ''}`}
              onClick={handlePay}
            >
              {paymentMethod === 'paypal'
                ? summary.isTrial
                  ? 'Start trial with PayPal · $0'
                  : `Pay with PayPal · ${formatMoney(total)}`
                : summary.isTrial
                  ? summary.payLabel
                  : `Pay ${formatMoney(total)}`}
            </button>
          )}

          <p className="legal">
            {summary.legalPrefix} <a href="#terms">Terms</a> and{' '}
            <a href="#privacy">Privacy Policy</a>
          </p>
        </aside>
      </div>
    </div>
  )
}

function Field({
  label,
  filled,
  error,
  children,
}: {
  label: string
  /** Force floated label (selects / prefilled values) */
  filled?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <label
      className={`field field--floating${filled ? ' field--filled' : ''}${error ? ' field--error' : ''}`}
    >
      <span className="field__control">
        {children}
        <span className="field__label">{label}</span>
      </span>
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  )
}
