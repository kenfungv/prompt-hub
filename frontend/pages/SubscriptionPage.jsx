import React, { useEffect, useState } from 'react';

const plans = [
  { id: 'free', name: 'Free', price: 0, features: ['10 prompts/day', 'Community support'] },
  { id: 'pro', name: 'Pro', price: 19, features: ['Unlimited prompts', 'Priority support', 'API access'] },
  { id: 'team', name: 'Team', price: 49, features: ['Everything in Pro', 'Team seats (5)', 'Shared billing'] }
];

const SubscriptionPage = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/subscription/status');
        const data = await res.json();
        setCurrentPlan(data?.plan || 'free');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">Loading subscription...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan and billing.</p>

        {message && (
          <div className={`mt-6 p-3 rounded ${message.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div key={p.id} className={`border rounded-xl p-6 bg-white ${currentPlan===p.id ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}`}>
              <h2 className="text-xl font-semibold">{p.name}</h2>
              <p className="text-2xl font-bold mt-2">{p.price === 0 ? 'Free' : `$${p.price}/mo`}</p>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                {p.features.map((f,i)=>(<li key={i}>• {f}</li>))}
              </ul>
              <button
                onClick={() => changePlan(p.id)}
                disabled={updating || currentPlan===p.id}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded"
              >
                {currentPlan===p.id ? 'Current plan' : `Choose ${p.name}`}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <button onClick={manageBilling} disabled={updating} className="text-blue-700 hover:underline">
            Open billing portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
