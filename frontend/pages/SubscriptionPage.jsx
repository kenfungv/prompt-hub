import React, { useEffect, useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'

// Plans: API quota + membership tiers
const plans = [
  { id: 'free', name: 'Free', price: 0, interval: 'mo', features: ['10 prompts/day', 'Community support'], apiQuota: 300, tier: 'standard' },
  { id: 'standard', name: 'Standard', price: 12, interval: 'mo', features: ['100 prompts/day', 'Email support', 'API 5k/mo'], apiQuota: 5000, tier: 'standard' },
  { id: 'premium', name: 'Premium', price: 24, interval: 'mo', features: ['Unlimited prompts', 'Priority support', 'API 20k/mo'], apiQuota: 20000, tier: 'premium' }
]

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

const Badge = ({ children, tone = 'info' }) => {
  const tones = {
    info: 'bg-blue-50 text-blue-700 ring-blue-200',
    success: 'bg-green-50 text-green-700 ring-green-200',
    warning: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
    danger: 'bg-red-50 text-red-700 ring-red-200'
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>
  )
}

const Stat = ({ label, value, subtle }) => (
  <div className="flex flex-col">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-lg font-semibold ${subtle ? 'text-gray-600' : 'text-gray-900'}`}>{value}</span>
  </div>
)

const SubscriptionPage = () => {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [usage, setUsage] = useState({ apiUsed: 0, apiRemaining: 0, periodEnd: null })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [paymentProvider, setPaymentProvider] = useState('stripe') // 'stripe' | 'paypal'

  const selectedPlan = useMemo(() => plans.find(p => p.id === currentPlan) || plans[0], [currentPlan])

  // Load subscription status and usage
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/subscription/status')
        const data = await res.json()
        setCurrentPlan(data?.plan || 'free')
        setUsage({
          apiUsed: data?.apiUsed ?? 0,
          apiRemaining: data?.apiRemaining ?? 0,
          periodEnd: data?.periodEnd ?? null
        })
      } catch (e) {
        setMessage({ type: 'danger', text: '無法載入訂閱狀態，請稍後再試。' })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Plan change without immediate payment (server creates checkout or updates sub)
  const changePlan = async (planId) => {
    try {
      setBusy(true)
      setMessage(null)
      // Frontend chooses provider, backend returns redirect url for Stripe/PayPal
      const res = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, provider: paymentProvider })
      })
      const data = await res.json()
      if (data?.success) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
          return
        }
        setCurrentPlan(planId)
        setMessage({ type: 'success', text: 'Plan updated successfully.' })
      } else {
        throw new Error(data?.message || 'Update failed.')
      }
    } catch (e) {
      setMessage({ type: 'danger', text: e.message || 'Network error. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  // Stripe: ask backend to create a Checkout Session for recurring subscription
  const startStripeCheckout = async (planId) => {
    try {
      setBusy(true)
      const res = await fetch('/api/payments/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else if (data?.sessionId) {
        const stripe = await stripePromise
        await stripe?.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        throw new Error('Stripe checkout failed to initialize')
      }
    } catch (e) {
      setMessage({ type: 'danger', text: e.message || 'Stripe 初始化失敗' })
    } finally {
      setBusy(false)
    }
  }

  // Billing portal
  const manageBilling = async () => {
    try {
      setBusy(true)
      const res = await fetch('/api/subscription/portal', { method: 'POST' })
      const data = await res.json()
      if (data?.portalUrl) window.location.href = data.portalUrl
    } finally {
      setBusy(false)
    }
  }

  const renewPlan = async () => {
    try {
      setBusy(true)
      const res = await fetch('/api/subscription/renew', { method: 'POST' })
      const data = await res.json()
      if (data?.success) setMessage({ type: 'success', text: '已開始續費，正在跳轉到帳單入口。' })
      if (data?.portalUrl) window.location.href = data.portalUrl
    } catch (e) {
      setMessage({ type: 'danger', text: '啟動續費失敗' })
    } finally {
      setBusy(false)
    }
  }

  const lowBalance = usage.apiRemaining <= Math.max(50, (selectedPlan.apiQuota || 0) * 0.05)
  const expiringSoon = usage.periodEnd ? (new Date(usage.periodEnd).getTime() - Date.now()) < 1000 * 60 * 60 * 24 * 3 : false

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading subscription...</div>
  }

  const content = (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
            <p className="text-gray-500 mt-1">Manage your plan, usage and billing.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success">Current: {selectedPlan.name}</Badge>
            {usage.periodEnd && (
              <Badge tone={expiringSoon ? 'warning' : 'info'}>
                Renews {expiringSoon ? 'soon • ' : ''}{new Date(usage.periodEnd).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>

        {message && (
          <div className={`mt-6 p-3 ring-1 rounded ${message.type === 'success' ? 'ring-green-200 text-green-700' : 'ring-red-200 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.id} className={`bg-white border p-6 rounded-xl ${currentPlan === p.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {currentPlan === p.id && <Badge tone="success">Current plan</Badge>}
              </div>
              <p className="text-2xl font-bold mt-2">{p.price === 0 ? 'Free' : `$${p.price}/${p.interval}`}</p>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                {p.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between">
                <select
                  className="mr-3 ring-1 ring-gray-300 rounded px-2 py-1 text-sm"
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                >
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                </select>
                {paymentProvider === 'stripe' ? (
                  <button
                    onClick={() => startStripeCheckout(p.id)}
                    disabled={busy || currentPlan === p.id}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded"
                  >
                    {currentPlan === p.id ? 'Selected' : `Checkout with Stripe`}
                  </button>
                ) : (
                  <button
                    onClick={() => changePlan(p.id)}
                    disabled={busy || currentPlan === p.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded"
                  >
                    {currentPlan === p.id ? 'Selected' : `Checkout with PayPal`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border">
            <h3 className="text-lg font-semibold mb-2">API Usage</h3>
            <div className="flex items-end justify-between">
              <Stat label="Used" value={usage.apiUsed} />
              <Stat label="Remaining" value={usage.apiRemaining} />
              <Stat label="Plan quota" value={selectedPlan.apiQuota?.toLocaleString?.()} subtle />
            </div>
            <div className="mt-4 w-full bg-gray-200 rounded h-2 overflow-hidden">
              {selectedPlan.apiQuota ? (
                <div
                  className={`h-2 ${lowBalance ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(100, (usage.apiUsed / selectedPlan.apiQuota) * 100)}%` }}
                />
              ) : (
                <div className="h-2 bg-blue-600 w-0" />
              )}
            </div>
            {lowBalance && (
              <div className="mt-2 text-sm text-red-700">Low balance. Consider upgrading your plan.</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border">
            <h3 className="text-lg font-semibold mb-2">Billing</h3>
            <p className="text-sm text-gray-600">Manage payment methods, invoices and seats.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={manageBilling} disabled={busy} className="bg-white ring-1 ring-gray-300 hover:bg-gray-50 text-gray-900 font-medium py-2 px-4 rounded">
                Open billing portal
              </button>
              <button onClick={renewPlan} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
                Renew
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border">
            <h3 className="text-lg font-semibold mb-2">Plan Benefits</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              {selectedPlan.features.map((f, i) => (
                <li className="flex items-start gap-2" key={i}>
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {(expiringSoon || lowBalance) && (
          <div className="mt-8 rounded-lg p-4 bg-yellow-50 ring-1 ring-yellow-200 text-yellow-900">
            <div className="font-medium">Heads up</div>
            <div className="text-sm mt-1">
              {expiringSoon && (
                <>Your subscription renews soon on {new Date(usage.periodEnd).toLocaleString()}.</>
              )}
              {lowBalance && (
                <> API balance is running low. Upgrade or renew to avoid disruption.</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Wrap PayPal provider at top-level so buttons can render when chosen
  return (
    <Elements stripe={stripePromise}>
      <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test', components: 'buttons', intent: 'subscription' }}>
        {content}
      </PayPalScriptProvider>
    </Elements>
  )
}

export default SubscriptionPage
