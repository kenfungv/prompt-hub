import React, { useState } from 'react';

const PaymentPage = () => {
  const [plan, setPlan] = useState('pro');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setStatus(null);
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setStatus({ type: 'error', message: data?.message || 'Failed to start checkout.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment</h1>
        <p className="text-gray-500 mt-1">Choose a plan and proceed to checkout.</p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => setPlan('basic')} className={`p-4 border rounded-lg ${plan==='basic' ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}`}>
            <p className="font-semibold">Basic</p>
            <p className="text-sm text-gray-500">$9/mo</p>
          </button>
          <button onClick={() => setPlan('pro')} className={`p-4 border rounded-lg ${plan==='pro' ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}`}>
            <p className="font-semibold">Pro</p>
            <p className="text-sm text-gray-500">$19/mo</p>
          </button>
          <button onClick={() => setPlan('team')} className={`p-4 border rounded-lg ${plan==='team' ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}`}>
            <p className="font-semibold">Team</p>
            <p className="text-sm text-gray-500">$49/mo</p>
          </button>
        </div>

        {status && (
          <div className={`mt-6 p-3 rounded ${status.type==='error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {status.message}
          </div>
        )}

        <div className="mt-8">
          <button onClick={handleCheckout} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded">
            {loading ? 'Redirecting...' : `Checkout ${plan.toUpperCase()} plan`}
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>By proceeding, you agree to our Terms and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
