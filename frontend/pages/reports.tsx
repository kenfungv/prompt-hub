import React, { useMemo } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

// Lazy-load heavy chart libs to optimize bundle
const Line = dynamic(() => import('react-chartjs-2').then(m => m.Line), { ssr: false });
const Bar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false });

const fetcher = (url: string) => fetch(url).then(r => r.json());

function useOverview(range: Record<string, any>) {
  const qs = new URLSearchParams(range as any).toString();
  const { data, error, isLoading } = useSWR(`/api/reports/overview?${qs}` , fetcher, { refreshInterval: 60_000 });
  return { data, error, isLoading };
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section style={{ background: 'white', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ marginBottom: 12 }}>{title}</h3>
      {children}
    </section>
  );
}

function DownloadButtons({ range }: { range: Record<string, any> }) {
  const qs = new URLSearchParams(range as any).toString();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <a href={`/api/reports/export/csv?${qs}`} target="_blank" rel="noreferrer"><button>Download CSV</button></a>
      <a href={`/api/reports/export/excel?${qs}`} target="_blank" rel="noreferrer"><button>Download Excel</button></a>
      <a href={`/api/reports/export/pdf?${qs}`} target="_blank" rel="noreferrer"><button>Download PDF</button></a>
    </div>
  );
}

function timeSeries(data: any[], xKey: string, yKey: string, label: string, color: string) {
  const labels = data?.map(d => d[xKey]) ?? [];
  const values = data?.map(d => d[yKey]) ?? [];
  return {
    labels,
    datasets: [
      { label, data: values, borderColor: color, backgroundColor: color + '33', fill: true, tension: 0.3 }
    ]
  };
}

export default function ReportsPage() {
  const [preset, setPreset] = React.useState('last_30d');
  const range = { preset };
  const { data, error, isLoading } = useOverview(range);

  const registrationsData = useMemo(() => timeSeries(data?.data?.registrations, 'date', 'count', 'Registrations', '#2563eb'), [data]);
  const apiCallsData = useMemo(() => timeSeries(data?.data?.apiCalls, 'date', 'calls', 'API Calls', '#16a34a'), [data]);
  const salesRevenueData = useMemo(() => timeSeries(data?.data?.sales, 'date', 'revenue', 'Sales Revenue', '#f59e0b'), [data]);
  const salesUnitsData = useMemo(() => timeSeries(data?.data?.sales, 'date', 'units', 'Sales Units', '#d946ef'), [data]);
  const marketplaceListingsData = useMemo(() => timeSeries(data?.data?.marketplace, 'date', 'listings', 'Listings', '#ef4444'), [data]);
  const marketplacePurchasesData = useMemo(() => timeSeries(data?.data?.marketplace, 'date', 'purchases', 'Purchases', '#22c55e'), [data]);
  const mrrData = useMemo(() => timeSeries(data?.data?.subscriptions, 'date', 'mrr', 'MRR', '#0ea5e9'), [data]);
  const churnData = useMemo(() => timeSeries(data?.data?.subscriptions, 'date', 'churn', 'Churn', '#6b7280'), [data]);

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Business Reports</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select value={preset} onChange={e => setPreset(e.target.value)}>
            <option value="last_7d">Last 7 days</option>
            <option value="last_30d">Last 30 days</option>
            <option value="last_90d">Last 90 days</option>
            <option value="mtd">MTD</option>
            <option value="qtd">QTD</option>
            <option value="ytd">YTD</option>
          </select>
          <DownloadButtons range={range} />
        </div>
      </header>

      {error && <div style={{ color: 'red' }}>Failed to load data</div>}
      {isLoading && <div>Loading...</div>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <Section title="User registrations">
            <Line data={registrationsData} />
          </Section>

          <Section title="API calls">
            <Line data={apiCallsData} />
          </Section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="Sales revenue">
              <Line data={salesRevenueData} />
            </Section>
            <Section title="Sales units">
              <Bar data={salesUnitsData} />
            </Section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="Marketplace listings">
              <Line data={marketplaceListingsData} />
            </Section>
            <Section title="Marketplace purchases">
              <Line data={marketplacePurchasesData} />
            </Section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="Monthly Recurring Revenue (MRR)">
              <Line data={mrrData} />
            </Section>
            <Section title="Churn">
              <Line data={churnData} />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
