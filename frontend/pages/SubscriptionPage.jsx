import React, { useEffect, useState, useMemo } from 'react';

const plans = [
  { id: 'free', name: 'Free', price: 0, features: ['10 prompts/day', 'Community support'], apiQuota: 300 },
  { id: 'pro', name: 'Pro', price: 19, features: ['Unlimited prompts', 'Priority support', 'API access'], apiQuota: 10000 },
  { id: 'team', name: 'Team', price: 49, features: ['Everything in Pro', 'Team seats (5)', 'Shared billing'], apiQuota: 50000 }
];

const Badge = ({ children, tone = 'info' }) => {
  const colors = {
    info: 'bg-blue-50 text-blue-700 ring-blue-200',
    success: 'bg-green-50 text-green-700 ring-green-200',
    warning: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
    danger: 'bg-red-50 text-red-700 ring-red-200'
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colors[tone]}`}>
      {children}
    </span>
  );
};

const Stat = ({ label, value, subtle }) => (
  <div className="flex flex-col">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-lg font-semibold ${subtle ? 'text-gray-600' : 'text-gray-900'}`}>{value}</span>
  </div>
);

const SubscriptionPage = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [usage, setUsage] = useState({ apiUsed: 0, apiRemaining: 0, periodEnd: null });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedPlan = useMemo(() => plans.find(p => p.id === currentPlan) || plans[0], [currentPlan]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/subscription/status');
        const data = await res.json();
        setCurrentPlan(data?.plan || 'free');
        setUsage({
          apiUsed: data?.apiUsed ?? 0,
          apiRemaining: data?.apiRemaining ?? 0,
          periodEnd: data?.periodEnd ?? null,
        });
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to load subscription status.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const changePlan = async (planId) => {
    try {
      setUpdating(true);
      setMessage(null);
      const res = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (data?.success) {
        setCurrentPlan(planId);
        setMessage({ type: 'success', text: 'Plan updated successfully.' });
      } else {
        setMessage({ type: 'error', text: data?.message || 'Update failed.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setUpdating(false);
    }
  };

  const manageBilling = async () => {
    try {
      setUpdating(true);
      const res = await fetch('/api/subscription/portal', { method: 'POST' });
      const data = await res.json();
      if (data?.portalUrl) window.location.href = data.portalUrl;
    } finally {
      setUpdating(false);
    }
  };

  const renewPlan = async () => {
    try {
      setUpdating(true);
      const res = await fetch('/api/subscription/renew', { method: 'POST' });
      const data = await res.json();
      if (data?.success) setMessage({ type: 'success', text: 'Renewal started. Follow billing portal.' });
      if (data?.portalUrl) window.location.href = data.portalUrl;
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to start renewal.' });
    } finally {
      setUpdating(false);
    }
  };

  const lowBalance = usage.apiRemaining <= Math.max(50, (selectedPlan.apiQuota || 0) * 0.05);
  const expiringSoon = usage.periodEnd ? (new Date(usage.periodEnd).getTime() - Date.now()) < 1000 * 60 * 60 * 24 * 3 : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">Loading subscription...</div>
    );
  }

  return (
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
          <div className={`mt-6 p-3 rounded ring-1 ${message.type === 'success' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
            {message.text}
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.id} className={`border bg-white p-6 rounded-xl ${currentPlan === p.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {currentPlan === p.id && <Badge tone="success">Current plan</Badge>}
              </div>
              <p className="text-2xl font-bold mt-2">{p.price === 0 ? 'Free' : `$${p.price}/mo`}</p>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                {p.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
              <button
                onClick={() => changePlan(p.id)}
                disabled={updating || currentPlan === p.id}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded"
              >
                {currentPlan === p.id ? 'Selected' : `Choose ${p.name}`}
              </button>
            </div>
          ))}
        </section>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border">
            <h3 className="text-lg font-semibold mb-2">API Usage</h3>
            <div className="flex items-end justify-between">
              <Stat label="Used" value={usage.apiUsed} />
              <Stat label="Remaining" value={usage.apiRemaining} />
              <Stat label="Plan quota" value={selectedPlan.apiQuota?.toLocaleString?.() || '—'} subtle />
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
              <button onClick={manageBilling} disabled={updating} className="bg-white ring-1 ring-gray-300 hover:bg-gray-50 text-gray-900 font-medium py-2 px-4 rounded">
                Open billing portal
              </button>
              <button onClick={renewPlan} disabled={updating} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">
                Renew
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border">
            <h3 className="text-lg font-semibold mb-2">Plan Benefits</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              {selectedPlan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span>{f}</span>
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
                <div>Your subscription renews soon on {new Date(usage.periodEnd).toLocaleString()}.</div>
              )}
              {lowBalance && (
                <div>API balance is running low. Upgrade or renew to avoid disruption.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;
