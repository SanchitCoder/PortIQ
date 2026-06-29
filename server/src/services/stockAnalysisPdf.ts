import PDFDocument from 'pdfkit';
import type { PriceHistoryPoint, StockAnalysisResponse } from '../../../shared/api-types.js';

const GOLD = '#9A7A2E';
const GOLD_LIGHT = '#C9A84C';
const TEXT = '#1A1A2E';
const MUTED = '#5C6078';
const BORDER = '#E8E4D8';
const DISCLAIMER =
  'This equity report is for analytical review only, not personalized financial advice. Past performance does not guarantee future results.';

function fmtPrice(price: number | null, currency: string): string {
  if (price == null) return 'N/A';
  const sym = currency === 'INR' ? '₹' : '$';
  return `${sym}${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtLarge(n: number | null, currency: string): string {
  if (n == null) return 'N/A';
  const sym = currency === 'INR' ? '₹' : '$';
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(2)}M`;
  return `${sym}${n.toLocaleString('en-IN')}`;
}

function fmtPct(n: number | null): string {
  if (n == null) return 'N/A';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function periodReturn(history: PriceHistoryPoint[]): string {
  if (history.length < 2) return 'N/A';
  const first = history[0]!.close;
  const last = history[history.length - 1]!.close;
  if (first <= 0) return 'N/A';
  return fmtPct(((last - first) / first) * 100);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y > doc.page.height - needed) doc.addPage();
}

function metricValue(value: number | string | null): string {
  if (value == null) return 'N/A';
  return String(value);
}

/** Server-side stock analysis PDF — pdfkit for lightweight streaming */
export function generateStockAnalysisPdf(
  report: StockAnalysisResponse,
  userEmail?: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const { header, scorecard, currency } = {
      header: report.header,
      scorecard: report.scorecard,
      currency: report.header.currency,
    };
    const generatedAt = report.generatedAt ? new Date(report.generatedAt) : new Date();

    // Header
    doc.fontSize(22).fillColor(GOLD).text('PortIQ', { continued: false });
    doc.fontSize(10).fillColor(MUTED).text('Stock Analysis Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor(MUTED)
      .text(`Generated: ${generatedAt.toLocaleString('en-IN')}`)
      .text(userEmail ? `Prepared for: ${userEmail}` : 'Prepared for: Stock Analyzer user');
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor(GOLD_LIGHT).lineWidth(2).stroke();
    doc.moveDown(1);

    // Company banner
    doc.fontSize(16).fillColor(TEXT).text(header.companyName);
    doc.fontSize(10).fillColor(MUTED)
      .text(`${header.symbol} · ${header.exchange} · ${fmtPrice(header.price, currency)}`
        + (header.dayChangePct != null ? ` (${fmtPct(header.dayChangePct)} today)` : ''));
    doc.moveDown(0.3);
    const headerStats = [
      ['Market Cap', fmtLarge(header.marketCap, currency)],
      ['52W Low', fmtPrice(header.week52Low, currency)],
      ['52W High', fmtPrice(header.week52High, currency)],
    ];
    headerStats.forEach(([label, value]) => {
      doc.fontSize(8).fillColor(MUTED).text(`${label}: `, { continued: true });
      doc.fillColor(TEXT).text(value);
    });
    doc.moveDown(0.8);

    // Scorecard
    doc.fontSize(13).fillColor(TEXT).text('Scorecard', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(GOLD).text(`Overall: ${scorecard.overallVerdict}`);
    doc.moveDown(0.3);
    const scores = [
      ['Valuation', scorecard.valuation],
      ['Financial Health', scorecard.financialHealth],
      ['Growth', scorecard.growth],
      ['Sentiment', scorecard.sentiment],
    ];
    scores.forEach(([label, item]) => {
      doc.fontSize(9).fillColor(TEXT).text(
        `${label}: ${(item as { value: number; tag: string }).value}/100 — ${(item as { value: number; tag: string }).tag}`,
      );
    });
    doc.moveDown(0.8);

    // Price performance
    doc.fontSize(13).fillColor(TEXT).text('Price Performance', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor(MUTED)
      .text(`1M: ${periodReturn(report.priceHistory['1M'])}  ·  6M: ${periodReturn(report.priceHistory['6M'])}  ·  1Y: ${periodReturn(report.priceHistory['1Y'])}`);
    doc.moveDown(0.8);

    // Key metrics
    ensureSpace(doc, 100);
    doc.fontSize(13).fillColor(TEXT).text('Key Metrics', { underline: true });
    doc.moveDown(0.4);
    const colW = pageWidth / 2;
    report.metrics.forEach((m, i) => {
      const x = doc.page.margins.left + (i % 2) * colW;
      if (i % 2 === 0 && i > 0) doc.moveDown(0.2);
      const tag = m.contextTag ? ` (${m.contextTag})` : '';
      doc.fontSize(8).fillColor(MUTED).text(m.label, x, doc.y, { width: colW - 10, continued: false });
      doc.fontSize(9).fillColor(TEXT).text(
        m.unavailable ? 'N/A' : `${metricValue(m.value)}${tag}`,
        x, doc.y, { width: colW - 10 },
      );
      if (i % 2 === 1) doc.moveDown(0.5);
    });
    doc.moveDown(0.5);

    // Fundamentals
    ensureSpace(doc, 120);
    doc.fontSize(13).fillColor(TEXT).text('Fundamentals', { underline: true });
    doc.moveDown(0.4);
    report.fundamentals.forEach(group => {
      ensureSpace(doc, 60);
      doc.fontSize(10).fillColor(GOLD).text(group.title);
      group.rows.forEach(row => {
        doc.fontSize(8).fillColor(MUTED).text(row.label, { continued: true });
        doc.fillColor(TEXT).text(
          row.unavailable ? '  N/A' : `  ${row.value} — ${row.assessment}`,
        );
      });
      doc.moveDown(0.3);
    });
    doc.moveDown(0.3);

    // Sentiment
    ensureSpace(doc, 80);
    doc.fontSize(13).fillColor(TEXT).text('Sentiment', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor(TEXT)
      .text(`Score: ${report.sentiment.score}/100 — ${report.sentiment.label}`);
    if (report.sentiment.headlines.length > 0) {
      doc.moveDown(0.3);
      report.sentiment.headlines.slice(0, 5).forEach(h => {
        ensureSpace(doc, 30);
        doc.fontSize(8).fillColor(MUTED).text(`• ${h.title} (${h.source}, ${h.date})`);
      });
    }
    doc.moveDown(0.5);

    // Peer comparison
    if (report.peers.length > 0) {
      ensureSpace(doc, 100);
      doc.fontSize(13).fillColor(TEXT).text('Peer Comparison', { underline: true });
      doc.moveDown(0.4);
      const peerCols = [55, 55, 80, 80];
      const peerHeaders = ['Symbol', 'P/E', 'Rev Growth', 'Margin'];
      let py = doc.y;
      let px = doc.page.margins.left;
      doc.fontSize(8).fillColor(GOLD);
      peerHeaders.forEach((h, i) => {
        doc.text(h, px, py, { width: peerCols[i]! });
        px += peerCols[i]!;
      });
      py += 14;
      doc.moveTo(doc.page.margins.left, py).lineTo(doc.page.margins.left + pageWidth, py)
        .strokeColor(BORDER).lineWidth(0.5).stroke();
      py += 6;

      report.peers.forEach(p => {
        if (py > doc.page.height - 80) {
          doc.addPage();
          py = doc.page.margins.top;
        }
        const row = [
          p.isSubject ? `${p.symbol} *` : p.symbol,
          p.pe != null ? p.pe.toFixed(1) : 'N/A',
          p.revenueGrowthPct != null ? fmtPct(p.revenueGrowthPct) : 'N/A',
          p.profitMarginPct != null ? fmtPct(p.profitMarginPct) : 'N/A',
        ];
        let rx = doc.page.margins.left;
        doc.fontSize(8).fillColor(p.isSubject ? GOLD : TEXT);
        row.forEach((cell, i) => {
          doc.text(cell, rx, py, { width: peerCols[i]! });
          rx += peerCols[i]!;
        });
        py += 14;
      });
      doc.y = py + 6;
      doc.fontSize(7).fillColor(MUTED).text('* Subject stock');
      doc.moveDown(0.5);
    }

    // AI synthesis
    ensureSpace(doc, 140);
    doc.fontSize(13).fillColor(TEXT).text('AI Synthesis', { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(TEXT).text(report.synthesis.summaryVerdict, { align: 'justify' });
    doc.moveDown(0.5);

    doc.fontSize(9).fillColor('#16A34A').text('Bull Case');
    report.synthesis.bullCase.forEach(b => {
      doc.fontSize(8).fillColor(MUTED).text(`• ${b}`, { indent: 8 });
    });
    doc.moveDown(0.3);

    doc.fontSize(9).fillColor('#DC2626').text('Bear Case');
    report.synthesis.bearCase.forEach(b => {
      doc.fontSize(8).fillColor(MUTED).text(`• ${b}`, { indent: 8 });
    });
    doc.moveDown(0.3);

    if (report.synthesis.keyRisks.length > 0) {
      doc.fontSize(9).fillColor(GOLD).text('Key Risks');
      report.synthesis.keyRisks.forEach(r => {
        doc.fontSize(8).fillColor(MUTED).text(`• ${r}`, { indent: 8 });
      });
    }
    doc.moveDown(0.8);
    doc.fontSize(7).fillColor(MUTED).text(DISCLAIMER, { align: 'justify' });

    // Footer with page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor(MUTED)
        .text(
          'Analytical report for review, not personalized financial advice · PortIQ Stock Analyzer',
          doc.page.margins.left,
          doc.page.height - 35,
          { width: pageWidth, align: 'center' },
        );
      doc.text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 22, {
        width: pageWidth,
        align: 'center',
      });
    }

    doc.end();
  });
}
