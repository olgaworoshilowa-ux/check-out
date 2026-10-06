import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import './Checkout.css'

type PaymentMethod = 'card' | 'apple' | 'paypal'

const SUBTOTAL = 239.88
const DISCOUNT = 180
const VAT_RATE = 0.18
const BASE_TOTAL = SUBTOTAL - DISCOUNT

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`
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

export default function Checkout({ onBack }: { onBack?: () => void }) {
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

  // Once unlocked — stays open until leave/remount (Back → Upgrade resets form)
  const [unlockedEmail, setUnlockedEmail] = useState(false)
  const [unlockedBilling, setUnlockedBilling] = useState(false)
  const [unlockedExtendedAddress, setUnlockedExtendedAddress] = useState(false)
  const [unlockedBusinessToggle, setUnlockedBusinessToggle] = useState(false)

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

  const vat = showBusinessFields ? Number((BASE_TOTAL * VAT_RATE).toFixed(2)) : 0
  const total = Number((BASE_TOTAL + vat).toFixed(2))

  const addressLabel = useMemo(
    () => (showExtendedAddress ? 'Address line 1' : 'Address'),
    [showExtendedAddress],
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
  }

  return (
    <div className="checkout">
      <header className="checkout__top">
        <button type="button" className="btn-back" aria-label="Back" onClick={onBack}>
          <span className="btn__glyph" aria-hidden="true">
            <img src="/assets/back.svg" alt="" />
          </span>
          Back
        </button>
        <button type="button" className="btn-icon" aria-label="Close">
          <span className="btn__glyph" aria-hidden="true">
            <img src="/assets/close.svg" alt="" />
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
                <img src="/assets/card-icon.svg" alt="" />
              </span>
              <span className="payment-method__label">Card</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'apple'}
              className={`payment-method${paymentMethod === 'apple' ? ' payment-method--active' : ''}`}
              onClick={() => setPaymentMethod('apple')}
            >
              <span className="payment-method__icon payment-method__icon--wide">
                <img src="/assets/apple-pay.svg" alt="" />
              </span>
              <span className="payment-method__label">Apple Pay</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === 'paypal'}
              className={`payment-method${paymentMethod === 'paypal' ? ' payment-method--active' : ''}`}
              onClick={() => setPaymentMethod('paypal')}
            >
              <span className="payment-method__icon payment-method__icon--paypal">
                <img src="/assets/paypal.svg" alt="" />
              </span>
              <span className="payment-method__label">PayPal</span>
            </button>
          </div>

          {paymentMethod === 'card' ? (
            <>
              <Field label="Card number">
                <input
                  className="field__input"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1424 1424 1424 1424"
                  value={cardNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                />
                <div className="field__brands" aria-hidden="true">
                  <span className="brand-badge">
                    <img src="/assets/mastercard.svg" alt="" />
                  </span>
                  <span className="brand-badge">
                    <img src="/assets/visa.svg" alt="" />
                  </span>
                  <span className="brand-badge brand-badge--amex">
                    <img src="/assets/amex.svg" alt="" />
                  </span>
                </div>
              </Field>

              <div className="field-row">
                <Field label="Expiration">
                  <input
                    className="field__input"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={expiration}
                    onChange={(e) => setExpiration(formatExpiry(e.target.value))}
                  />
                </Field>
                <Field label="CVC">
                  <input
                    className="field__input"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="•••"
                    maxLength={4}
                    value={cvc}
                    onChange={(e) => setCvc(digitsOnly(e.target.value).slice(0, 4))}
                  />
                </Field>
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
              <Field label="Email">
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

              <Field label="Full name">
                <input
                  className="field__input"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>

              <Field label="Country">
                <select
                  className="field__input field__input--select"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option>Georgia</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Germany</option>
                  <option>France</option>
                </select>
                <span className="field__chevron" aria-hidden="true">
                  <img src="/assets/chevron-down.svg" alt="" />
                </span>
              </Field>

              <Field label={addressLabel}>
                <input
                  className="field__input"
                  autoComplete="address-line1"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </Field>

              {showExtendedAddress ? (
                <div className="reveal">
                  <Field label="Address line 2">
                    <input
                      className="field__input"
                      autoComplete="address-line2"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                    />
                  </Field>

                  <Field label="City">
                    <input
                      className="field__input"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </Field>

                  <Field label="Postal code">
                    <input
                      className="field__input"
                      autoComplete="postal-code"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </Field>
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
                  {isBusiness ? <img src="/assets/check.svg" alt="" /> : null}
                </span>
                <span className="checkbox-row__label">I&apos;m buying as a business</span>
              </label>

              {showBusinessFields ? (
                <div className="business-fields reveal">
                  <Field label="Business name">
                    <input
                      className="field__input"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </Field>

                  <div className="field-row">
                    <Field label="Tax ID type">
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
                        <img src="/assets/chevron-down.svg" alt="" />
                      </span>
                    </Field>
                    <Field label="Tax ID">
                      <input
                        className="field__input"
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

        <aside className="checkout__sidebar">
          <div className="summary">
            <div className="summary__glow summary__glow--lime" aria-hidden="true" />
            <div className="summary__glow summary__glow--mint" aria-hidden="true" />
            <div className="summary__content">
              <h2 className="summary__title">Premium</h2>
              <p className="summary__subtitle">Design faster with AI</p>

              <div className="summary__rows">
                <div className="summary__row">
                  <span>Subtotal</span>
                  <span>{formatMoney(SUBTOTAL)}</span>
                </div>
                <div className="summary__row">
                  <span className="summary__row-left">
                    Annual discount
                    <span className="badge">33% OFF</span>
                  </span>
                  <span>–{formatMoney(DISCOUNT)}</span>
                </div>
                {showBusinessFields ? (
                  <div className="summary__row reveal">
                    <span>VAT 18%</span>
                    <span>{formatMoney(vat)}</span>
                  </div>
                ) : null}
              </div>

              <div className="summary__total">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
              <p className="summary__note">Billed yearly · $4.99 a month</p>
            </div>
          </div>

          {paymentMethod === 'apple' ? (
            <button
              type="button"
              className="btn-apple-pay"
              onClick={handleSubmit}
              aria-label={`Pay ${formatMoney(total)} with Apple Pay`}
            >
              <img src="/assets/apple-pay.svg" alt="" className="btn-apple-pay__logo" />
            </button>
          ) : (
            <button type="button" className="btn-pay" onClick={handleSubmit}>
              {paymentMethod === 'paypal' ? `Pay with PayPal · ${formatMoney(total)}` : `Pay ${formatMoney(total)}`}
            </button>
          )}

          <p className="legal">
            Payment is encrypted. By continuing you agree to the{' '}
            <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>
          </p>
        </aside>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <span className="field__control">{children}</span>
    </label>
  )
}
