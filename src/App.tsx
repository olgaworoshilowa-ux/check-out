import { useState } from 'react'
import Checkout from './Checkout'
import UpgradePlan from './UpgradePlan'
import './index.css'

type Screen = 'upgrade' | 'checkout'

function App() {
  const [screen, setScreen] = useState<Screen>('upgrade')
  const [checkoutKey, setCheckoutKey] = useState(0)

  if (screen === 'upgrade') {
    return (
      <UpgradePlan
        onGetPremium={() => setScreen('checkout')}
        onClose={() => setScreen('checkout')}
      />
    )
  }

  return (
    <Checkout
      key={checkoutKey}
      onBack={() => {
        setCheckoutKey((k) => k + 1)
        setScreen('upgrade')
      }}
    />
  )
}

export default App
