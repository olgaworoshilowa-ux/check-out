import { useState } from 'react'
import Checkout from './Checkout'
import UpgradePlan from './UpgradePlan'
import { DEFAULT_SELECTION, type CheckoutSelection } from './plan'
import './index.css'

type Screen = 'upgrade' | 'checkout'

function App() {
  const [screen, setScreen] = useState<Screen>('upgrade')
  const [checkoutKey, setCheckoutKey] = useState(0)
  const [selection, setSelection] = useState<CheckoutSelection>(DEFAULT_SELECTION)

  if (screen === 'upgrade') {
    return (
      <UpgradePlan
        onContinue={(next) => {
          setSelection(next)
          setScreen('checkout')
        }}
        onClose={() => {
          setSelection(DEFAULT_SELECTION)
          setScreen('checkout')
        }}
      />
    )
  }

  return (
    <Checkout
      key={checkoutKey}
      selection={selection}
      onBack={() => {
        setCheckoutKey((k) => k + 1)
        setScreen('upgrade')
      }}
    />
  )
}

export default App
