import React, { useEffect, useMemo, useState } from 'react';

// Payment utilities (mocked fetchers; replace with real endpoints if available)
async function fetchOrders(params = {}) {
  const res = await fetch('/api/payments/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed loading orders');
  return res.json();
}

async function fetchCheckout(plan) {
  const res = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  return res.json();
}

const statusColors = {
  paid: 'bg-green-50 text-green-700 ring-green-200',
  pending: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
  refunded: 'bg-blue-50 text-blue-700 ring-blue-200',
};

const planOptions = [
  { key: 'basic', label: 'Basic', price: '$9/mo' },
  { key: 'pro', label: 'Pro', price: '$19/mo' },
  { key: 'team', label: 'Team', price: '$49/mo' },
];

function Badge({ status }) {
  const color = statusColors[status] || 'bg-gray-50 text-gray-700 ring-gray-200';
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {status}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function formatAmount(cents, currency = 'USD') {
  if (cents == null) return '-';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((cents || 0) / 100);
  } catch {
    return `$${((cents || 0) / 100).toFixed(2)}`;
  }
}

const PaymentPage = () => {
  const [plan, setPlan] = useState('pro');
  const [status, setStatus] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // Filters/search
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30d'); // 7d, 30d, 90d, all
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection for details
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleCheckout = async () => {
    try {
      setLoadingCheckout(true);
      setStatus(null);
      const data = await fetchCheckout(plan);
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setStatus({ type: 'error', message: data?.message || 'Failed to start checkout.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoadingCheckout(false);
    }
  };

  // Load orders with filters
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setOrdersLoading(true);
        setOrdersError(null);
        const data = await fetchOrders({ query, status: statusFilter, dateRange, page, pageSize });
        if (!ignore) setOrders(data?.orders || []);
      } catch (e) {
        if (!ignore) setOrdersError('Failed to load orders');
      } finally {
        if (!ignore) setOrdersLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [query, statusFilter, dateRange, page, pageSize]);

  // Aggregations for visualization (simple KPIs for recent period)
  const kpis = useMemo(() => {
    const recent = orders;
    const totalVolume = recent.filter(o => o.status === 'paid').reduce((s, o) => s + (o.amount_cents || 0), 0);
    const countPaid = recent.filter(o => o.status === 'paid').length;
    const countPending = recent.filter(o => o.status === 'pending').length;
    const countFailed = recent.filter(o => o.status === 'failed').length;
    return {
      totalVolume,
      countPaid,
      countPending,
      countFailed,
    };
  }, [orders]);

  const filteredOrders = orders; // server already filters; keep for safety if needed

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-gray-500">Manage checkout, search orders, and review recent transactions.</p>

        {/* Plan selector + checkout */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {planOptions.map(p => (
            <button
              key={p.key}
              onClick={() => setPlan(p.key)}
              className={`text-left rounded-lg border p-4 transition focus:outline-none focus:ring-2 ${
                plan === p.key ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-semibold">{p.label}</p>
              <p className="text-sm text-gray-500">{p.price}</p>
            </button>
          ))}
          <div className="md:col-span-3">
            {status && (
              <div className={`mt-3 rounded border p-3 text-sm ${status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                {status.message}
              </div>
            )}
            <button
              onClick={handleCheckout}
              disabled={loadingCheckout}
              className="mt-3 inline-flex items-center rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingCheckout ? 'Redirecting…' : `Checkout ${plan.toUpperCase()} plan`}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Paid orders" value={kpis.countPaid} />
          <Stat label="Pending" value={kpis.countPending} />
          <Stat label="Failed" value={kpis.countFailed} />
          <Stat label="Volume (recent)" value={formatAmount(kpis.totalVolume)} />
        </div>

        {/* Filters */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700">Search</label>
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder="Order ID, email, reference…"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Status</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Date range</label>
              <select
                value={dateRange}
                onChange={e => { setDateRange(e.target.value); setPage(1); }}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-gray-500">Showing recent orders. Use filters to refine results.</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Rows</label>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded border border-gray-300 px-2 py-1 text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders table */}
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Order</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {ordersLoading && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>Loading orders…</td>
                  </tr>
                )}
                {ordersError && !ordersLoading && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-red-600" colSpan={6}>{ordersError}</td>
                  </tr>
                )}
                {!ordersLoading && !ordersError && filteredOrders.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500" colSpan={6}>No orders found.</td>
                  </tr>
                )}
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{o.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{o.customer_email || o.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatAmount(o.amount_cents, o.currency)}</td>
                    <td className="px-4 py-3"><Badge status={o.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple pagination controls */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
            <button
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="text-xs text-gray-600">Page {page}</span>
            <button
              className="rounded border border-gray-300 px-3 py-1 text-sm"
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>

        {/* Order details drawer/dialog */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 md:items-center">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="text-lg font-semibold">Order {selectedOrder.id}</h3>
                <button onClick={() => setSelectedOrder(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100">✕</button>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm text-gray-900">{selectedOrder.customer_email || selectedOrder.customer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-sm text-gray-900">{formatAmount(selectedOrder.amount_cents, selectedOrder.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <div className="mt-1"><Badge status={selectedOrder.status} /></div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm text-gray-900">{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '-'}</p>
               
