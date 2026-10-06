import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { asset } from './assets'
import './UpgradePlan.css'

const PREMIUM_FEATURES = [
  'Advanced AI Copilot for every room',
  'AI Studio room looks in seconds',
  '1,000 AI credits every month',
  '8,000+ furniture items',
  'Unlimited HD renders',
]

const PRO_FEATURES = [
  'Up to 8,000 AI credits a month',
  'AI Studio for client work',
  'Unlimited custom textures',
  'Unlimited 4K renders',
  'Branded profile',
]

const CREDIT_OPTIONS = [3000, 5000, 8000] as const
const KNOB_SIZE = 26

const PRO_PRICING = {
  3000: { monthly: 49.99, annualMonthly: 33.33, yearly: 400.88 },
  5000: { monthly: 79.99, annualMonthly: 53.33, yearly: 639.96 },
  8000: { monthly: 119.99, annualMonthly: 79.99, yearly: 959.88 },
} as const

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}

type UpgradePlanProps = {
  onGetPremium: () => void
  onClose?: () => void
}

export default function UpgradePlan({ onGetPremium, onClose }: UpgradePlanProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const [creditIndex, setCreditIndex] = useState(0)
  const [freeTrial, setFreeTrial] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const credits = CREDIT_OPTIONS[creditIndex]
  const t = creditIndex / (CREDIT_OPTIONS.length - 1)

  const pickIndexFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const usable = rect.width - KNOB_SIZE
    const x = Math.min(Math.max(clientX - rect.left - KNOB_SIZE / 2, 0), usable)
    const ratio = usable > 0 ? x / usable : 0
    const next = Math.round(ratio * (CREDIT_OPTIONS.length - 1))
    setCreditIndex(next)
  }, [])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    pickIndexFromClientX(event.clientX)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    pickIndexFromClientX(event.clientX)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const premiumPrice = billing === 'annual' ? '$4.99' : '$19.99'
  const premiumOld = billing === 'annual' ? '$19.99' : null
  const premiumNote =
    billing === 'annual' ? '$59.88 billed yearly' : 'Billed monthly'

  const proPricing = PRO_PRICING[credits]
  const proPrice =
    billing === 'annual'
      ? formatPrice(proPricing.annualMonthly)
      : formatPrice(proPricing.monthly)
  const proOld = billing === 'annual' ? formatPrice(proPricing.monthly) : null
  const proNote =
    billing === 'annual'
      ? `Free until Oct 10, then ${formatPrice(proPricing.yearly)}/year`
      : `Free until Oct 10, then ${formatPrice(proPricing.monthly)}/month`

  return (
    <div className="upgrade">
      <header className="upgrade__top">
        <button type="button" className="btn-icon" aria-label="Close" onClick={onClose}>
          <span className="btn__glyph" aria-hidden="true">
            <img src={asset('upgrade-close.svg')} alt="" />
          </span>
        </button>
      </header>

      <div className="upgrade__header">
        <h1 className="upgrade__title">Upgrade your plan</h1>
        <p className="upgrade__subtitle">
          More credits, sharper renders and tools for real projects.
        </p>

        <div className="billing-toggle" role="tablist" aria-label="Billing period">
          <button
            type="button"
            role="tab"
            aria-selected={billing === 'monthly'}
            className={`billing-toggle__item${billing === 'monthly' ? ' billing-toggle__item--active' : ''}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={billing === 'annual'}
            className={`billing-toggle__item${billing === 'annual' ? ' billing-toggle__item--active' : ''}`}
            onClick={() => setBilling('annual')}
          >
            Annual
            <span className="billing-toggle__badge">Save 33%</span>
          </button>
        </div>
      </div>

      <div className="upgrade__cards">
        {/* Premium */}
        <article className="plan-card plan-card--premium">
          <div className="plan-card__glow plan-card__glow--lime" aria-hidden="true" />
          <div className="plan-card__glow plan-card__glow--mint" aria-hidden="true" />

          <div className="plan-card__body">
            <h2 className="plan-card__name">Premium</h2>
            <p className="plan-card__tagline">Design faster with AI</p>

            <div className="feature-box">
              <div className="feature-box__row">
                <span className="feature-box__icon">
                  <img src={asset('upgrade-generator-green.svg')} alt="" />
                </span>
                <p className="feature-box__title">1,000 credits every month</p>
              </div>
              <p className="feature-box__desc">
                About 120 room looks or 600 Copilot replies a month
              </p>
              <div className="feature-box__chip">
                <span className="feature-box__chip-icon">
                  <img src={asset('upgrade-check.svg')} alt="" />
                </span>
                Fixed amount of credits
              </div>
            </div>

            <div className="plan-card__notch" aria-hidden="true">
              <img src={asset('upgrade-flash-bg.svg')} alt="" />
            </div>

            <div className="access-box">
              <div className="access-box__text">
                <p className="access-box__title">Instant access</p>
                <p className="access-box__desc">All 1,000 credits right away</p>
              </div>
              <span className="access-box__flash">
                <img src={asset('upgrade-flash.svg')} alt="" />
              </span>
            </div>

            <div className="plan-card__price">
              {premiumOld ? (
                <span className="plan-card__old">
                  {premiumOld}
                  <img
                    className="plan-card__strike"
                    src={asset('upgrade-strikethrough.svg')}
                    alt=""
                  />
                </span>
              ) : null}
              <span className="plan-card__amount">{premiumPrice}</span>
              <span className="plan-card__period">/ month</span>
            </div>

            <button type="button" className="plan-card__cta plan-card__cta--premium" onClick={onGetPremium}>
              Get Premium
            </button>
            <p className="plan-card__note">{premiumNote}</p>

            <hr className="plan-card__divider" />

            <p className="plan-card__includes">Everything in Free plus:</p>
            <ul className="plan-card__list">
              {PREMIUM_FEATURES.map((item) => (
                <li key={item}>
                  <span className="plan-card__check">
                    <img src={asset('upgrade-check-green.svg')} alt="" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Professional */}
        <article className="plan-card plan-card--pro">
          <div className="plan-card__glow plan-card__glow--lilac" aria-hidden="true" />
          <div className="plan-card__glow plan-card__glow--sky" aria-hidden="true" />

          <div className="plan-card__body">
            <h2 className="plan-card__name">Professional</h2>
            <p className="plan-card__tagline">Maximum AI for client-ready interiors</p>

            <div className="feature-box feature-box--pro">
              <div className="feature-box__row">
                <span className="feature-box__icon">
                  <img src={asset('upgrade-generator-purple.svg')} alt="" />
                </span>
                <p className="feature-box__title">
                  {credits.toLocaleString('en-US')} credits every month
                </p>
              </div>
              <p className="feature-box__desc">
                About 120 room looks or 600 Copilot replies a month
              </p>

              <div className="credit-slider">
                <div
                  ref={trackRef}
                  className="credit-slider__track"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  role="slider"
                  tabIndex={0}
                  aria-label="Credits amount"
                  aria-valuemin={CREDIT_OPTIONS[0]}
                  aria-valuemax={CREDIT_OPTIONS[CREDIT_OPTIONS.length - 1]}
                  aria-valuenow={credits}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                      event.preventDefault()
                      setCreditIndex((i) => Math.min(i + 1, CREDIT_OPTIONS.length - 1))
                    }
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                      event.preventDefault()
                      setCreditIndex((i) => Math.max(i - 1, 0))
                    }
                  }}
                >
                  <div
                    className="credit-slider__fill"
                    style={{ width: `calc(${t} * (100% - ${KNOB_SIZE}px) + ${KNOB_SIZE / 2}px)` }}
                  />
                  <div
                    className="credit-slider__knob"
                    style={{ left: `calc(${t} * (100% - ${KNOB_SIZE}px))` }}
                  >
                    <img src={asset('upgrade-slider-arrows.svg')} alt="" />
                  </div>
                </div>
                <div className="credit-slider__labels">
                  {CREDIT_OPTIONS.map((value, index) => (
                    <button
                      key={value}
                      type="button"
                      className={`credit-slider__label${index === creditIndex ? ' credit-slider__label--active' : ''}`}
                      onClick={() => setCreditIndex(index)}
                    >
                      {value.toLocaleString('en-US')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="plan-card__notch" aria-hidden="true">
              <img src={asset('upgrade-strikethrough-2.svg')} alt="" />
            </div>

            <div className="access-box">
              <div className="access-box__text">
                <p className="access-box__title">7-day free trial</p>
                <p className="access-box__desc">Includes 50 credits to try</p>
              </div>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={freeTrial}
                aria-label="7-day free trial"
                onClick={() => setFreeTrial((v) => !v)}
              >
                <img
                  src={freeTrial ? asset('upgrade-toggle-on.svg') : asset('upgrade-toggle-off.svg')}
                  alt=""
                />
              </button>
            </div>

            <div className="plan-card__price">
              {proOld ? (
                <span className="plan-card__old">
                  {proOld}
                  <img
                    className="plan-card__strike"
                    src={asset('upgrade-strikethrough.svg')}
                    alt=""
                  />
                </span>
              ) : null}
              <span className="plan-card__amount">{proPrice}</span>
              <span className="plan-card__period">/ month</span>
            </div>

            <button type="button" className="plan-card__cta plan-card__cta--pro" onClick={onGetPremium}>
              {freeTrial ? 'Try Pro for 7 days' : 'Get Pro'}
            </button>
            <p className="plan-card__note">{proNote}</p>

            <hr className="plan-card__divider" />

            <p className="plan-card__includes">Everything in Premium plus:</p>
            <ul className="plan-card__list">
              {PRO_FEATURES.map((item) => (
                <li key={item}>
                  <span className="plan-card__check">
                    <img src={asset('upgrade-check-green.svg')} alt="" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>

      <div className="upgrade__footer">
        <div className="upgrade__footer-text">
          <p className="upgrade__footer-title">
            Don&apos;t want to upgrade right away? Buy credits instead
          </p>
          <p className="upgrade__footer-sub">Buy one-time subscription pack</p>
        </div>
        <button type="button" className="upgrade__footer-link">
          Buy credits
          <span className="upgrade__footer-arrow">
            <img src={asset('upgrade-arrow-right.svg')} alt="" />
          </span>
        </button>
      </div>
    </div>
  )
}
