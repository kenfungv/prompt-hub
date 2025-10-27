const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Mock data fetchers - replace with real DB/services
async function fetchRegistrations(range) { return [{ date: '2025-10-01', count: 42 }]; }
async function fetchApiCalls(range) { return [{ date: '2025-10-01', calls: 1200 }]; }
async function fetchPromptSales(range) { return [{ date: '2025-10-01', revenue: 523.4, units: 37 }]; }
async function fetchMarketplace(range) { return [{ date: '2025-10-01', listings: 12, purchases: 7 }]; }
async function fetchSubscriptions(range) { return [{ date: '2025-10-01', mrr: 1345.78, churn: 0.02 }]; }

function parseRange(q) {
  const { from, to, preset } = q || {};
  return { from: from || null, to: to || null, preset: preset || 'last_30d' };
}

router.get('/reports/overview', async (req, res) => {
  try {
    const range = parseRange(req.query);
    const [registrations, apiCalls, sales, marketplace, subscriptions] = await Promise.all([
      fetchRegistrations(range),
      fetchApiCalls(range),
      fetchPromptSales(range),
      fetchMarketplace(range),
      fetchSubscriptions(range)
    ]);
    res.json({ ok: true, range, data: { registrations, apiCalls, sales, marketplace, subscriptions } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Generic export helpers
function setDisposition(res, type, filename) {
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

router.get('/reports/export/csv', async (req, res) => {
  try {
    const range = parseRange(req.query);
    const data = await buildFlatRows(range);
    const parser = new Parser({ header: true });
    const csv = parser.parse(data);
    setDisposition(res, 'text/csv', 'reports.csv');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/reports/export/excel', async (req, res) => {
  try {
    const range = parseRange(req.query);
    const { workbook, buffer } = await buildExcel(range);
    setDisposition(res, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'reports.xlsx');
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/reports/export/pdf', async (req, res) => {
  try {
    const range = parseRange(req.query);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reports.pdf"');
    doc.pipe(res);

    doc.fontSize(18).text('Business Reports', { align: 'center' });
    doc.moveDown();

    const sections = [
      { title: 'Registrations', data: await fetchRegistrations(range) },
      { title: 'API Calls', data: await fetchApiCalls(range) },
      { title: 'Prompt Sales', data: await fetchPromptSales(range) },
      { title: 'Marketplace', data: await fetchMarketplace(range) },
      { title: 'Subscriptions', data: await fetchSubscriptions(range) },
    ];

    sections.forEach(sec => {
      doc.moveDown();
      doc.fontSize(14).text(sec.title);
      doc.moveDown(0.5);
      doc.fontSize(10).text(JSON.stringify(sec.data, null, 2));
    });

    doc.end();
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

async function buildFlatRows(range) {
  const [registrations, apiCalls, sales, marketplace, subscriptions] = await Promise.all([
    fetchRegistrations(range),
    fetchApiCalls(range),
    fetchPromptSales(range),
    fetchMarketplace(range),
    fetchSubscriptions(range)
  ]);
  // Simple flatten by date key join (assumes same dates present)
  return registrations.map((r, i) => ({
    date: r.date,
    registrations: r.count,
    api_calls: apiCalls[i]?.calls ?? null,
    sales_revenue: sales[i]?.revenue ?? null,
    sales_units: sales[i]?.units ?? null,
    marketplace_listings: marketplace[i]?.listings ?? null,
    marketplace_purchases: marketplace[i]?.purchases ?? null,
    mrr: subscriptions[i]?.mrr ?? null,
    churn: subscriptions[i]?.churn ?? null,
  }));
}

async function buildExcel(range) {
  const rows = await buildFlatRows(range);
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Reports');
  ws.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Registrations', key: 'registrations', width: 15 },
    { header: 'API Calls', key: 'api_calls', width: 12 },
    { header: 'Sales Revenue', key: 'sales_revenue', width: 15 },
    { header: 'Sales Units', key: 'sales_units', width: 12 },
    { header: 'Marketplace Listings', key: 'marketplace_listings', width: 20 },
    { header: 'Marketplace Purchases', key: 'marketplace_purchases', width: 22 },
    { header: 'MRR', key: 'mrr', width: 12 },
    { header: 'Churn', key: 'churn', width: 10 },
  ];
  rows.forEach(r => ws.addRow(r));
  const buffer = await workbook.xlsx.writeBuffer();
  return { workbook, buffer };
}

module.exports = router;
