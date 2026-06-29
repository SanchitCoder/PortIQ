import PDFDocument from 'pdfkit';
import type { AlphaEdgeFactorDirection, AlphaEdgeSignal, AlphaEdgeVerdict } from '../../../shared/api-types.js';

const GOLD = '#9A7A2E';
const GOLD_LIGHT = '#C9A84C';
const TEXT = '#1A1A2E';
const MUTED = '#5C6078';
const BORDER = '#E8E4D8';

const SIGNAL_COLORS: Record<AlphaEdgeSignal, string> = {
  buy: '#16A34A',
  hold: '#D97706',
  sell: '#DC2626',
};

function fmtMoney(amount: number | null, currency: string): string {
  if (amount == null) return 'N/A';
  const sym = currency === 'INR' ? '₹' : '$';
  const prefix = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${prefix}${sym}${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtPrice(price: number | null, currency: string): string {
  if (price == null) return 'N/A';
  const sym = currency === 'INR' ? '₹' : '$';
  return `${sym}${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null): string {
  if (n == null) return 'N/A';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function factorDirectionLabel(direction: AlphaEdgeFactorDirection): string {
  if (direction === 'supports_buy') return 'Supports Buy';
  if (direction === 'supports_sell') return 'Supports Sell';
  return 'Neutral';
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y > doc.page.height - needed) doc.addPage();
}

/** Server-side AlphaEdge verdict PDF — pdfkit for lightweight streaming */
export function generateAlphaEdgePdf(
  verdict: AlphaEdgeVerdict,
  userEmail?: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const { header, position, currency } = {
      header: verdict.header,
      position: verdict.position,
      currency: verdict.header.currency,
    };
    const generatedAt = verdict.generatedAt ? new Date(verdict.generatedAt) : new Date();
    const signalColor = SIGNAL_COLORS[header.signal];

    // Header
    doc.fontSize(22).fillColor(GOLD).text('PortIQ', { continued: false });
    doc.fontSize(10).fillColor(MUTED).text('AlphaEdge Verdict Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor(MUTED)
      .text(`Generated: ${generatedAt.toLocaleString('en-IN')}`)
      .text(userEmail ? `Prepared for: ${userEmail}` : 'Prepared for: AlphaEdge user');
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor(GOLD_LIGHT).lineWidth(2).stroke();
    doc.moveDown(1);

    // Verdict banner
    doc.fontSize(18).fillColor(signalColor).text(header.signal.toUpperCase(), { continued: true });
    doc.fontSize(11).fillColor(MUTED).text(`  ·  ${header.confidence}% confidence`);
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor(TEXT).text(header.headline);
    doc.fontSize(9).fillColor(MUTED)
      .text(`${header.symbol} · ${header.exchange} · ${header.companyName}`);
    doc.moveDown(0.8);

    if (verdict.reducedConfidence) {
      doc.fontSize(8).fillColor('#B45309')
        .text('⚠ Reduced confidence — some analyzer data was unavailable.');
      doc.moveDown(0.5);
    }

    // Position snapshot
    doc.fontSize(13).fillColor(TEXT).text('Position Snapshot', { underline: true });
    doc.moveDown(0.5);
    const colW = pageWidth / 2;
    const posRows: [string, string][] = [
      ['Buy Price', fmtPrice(position.buyPrice, currency)],
      ['Current Price', fmtPrice(position.currentPrice, currency)],
      ['Quantity', String(position.quantity)],
      ['Total Cost', fmtPrice(position.totalCost, currency)],
      ['Market Value', fmtPrice(position.marketValue, currency)],
      ['Unrealized P&L', `${fmtMoney(position.unrealizedPnl, currency)} (${fmtPct(position.unrealizedPnlPct)})`],
    ];
    if (position.targetPrice != null) {
      posRows.push(['Target Price', fmtPrice(position.targetPrice, currency)]);
    }
    if (position.stopLoss != null) {
      posRows.push(['Stop Loss', fmtPrice(position.stopLoss, currency)]);
    }
    posRows.forEach(([label, value], i) => {
      const x = doc.page.margins.left + (i % 2) * colW;
      if (i % 2 === 0 && i > 0) doc.moveDown(0.2);
      doc.fontSize(8).fillColor(MUTED).text(label, x, doc.y, { width: colW - 10, continued: false });
      doc.fontSize(10).fillColor(TEXT).text(value, x, doc.y, { width: colW - 10 });
      if (i % 2 === 1) doc.moveDown(0.6);
    });
    doc.moveDown(0.5);

    doc.fontSize(9).fillColor(MUTED)
      .text(`Signal Score: ${verdict.signalScore}/100 (negative = lean sell)`);
    doc.moveDown(1);

    // Reasoning factors
    ensureSpace(doc, 120);
    doc.fontSize(13).fillColor(TEXT).text('Reasoning Factors', { underline: true });
    doc.moveDown(0.5);
    verdict.reasoningFactors.forEach(f => {
      ensureSpace(doc, 40);
      doc.fontSize(9).fillColor(GOLD).text(f.label, { continued: true });
      doc.fillColor(MUTED).text(`  [${factorDirectionLabel(f.direction)}]`);
      doc.fontSize(8).fillColor(TEXT).text(f.value, { indent: 8 });
      if (f.explanation) {
        doc.fontSize(8).fillColor(MUTED).text(f.explanation, { indent: 8 });
      }
      doc.moveDown(0.4);
    });
    doc.moveDown(0.5);

    // Exit strategy
    ensureSpace(doc, 100);
    doc.fontSize(13).fillColor(TEXT).text('Exit Strategy', { underline: true });
    doc.moveDown(0.5);
    verdict.exitStrategy.forEach(row => {
      ensureSpace(doc, 30);
      doc.fontSize(8).fillColor(MUTED).text(row.label, { continued: true });
      doc.fontSize(9).fillColor(TEXT).text(
        row.unavailable ? '  data unavailable' : `  ${row.value}`,
      );
      doc.moveDown(0.3);
    });
    doc.moveDown(0.5);

    // Scenarios
    ensureSpace(doc, 100);
    doc.fontSize(13).fillColor(TEXT).text('Scenarios', { underline: true });
    doc.moveDown(0.5);
    const scenCols = [100, 70, 90, 60];
    const scenHeaders = ['Scenario', 'Price', 'P&L', 'P&L %'];
    let sy = doc.y;
    let sx = doc.page.margins.left;
    doc.fontSize(8).fillColor(GOLD);
    scenHeaders.forEach((h, i) => {
      doc.text(h, sx, sy, { width: scenCols[i]! });
      sx += scenCols[i]!;
    });
    sy += 14;
    doc.moveTo(doc.page.margins.left, sy).lineTo(doc.page.margins.left + pageWidth, sy)
      .strokeColor(BORDER).lineWidth(0.5).stroke();
    sy += 6;

    verdict.scenarios.forEach(s => {
      if (sy > doc.page.height - 80) {
        doc.addPage();
        sy = doc.page.margins.top;
      }
      const row = [
        s.label,
        s.unavailable || s.price == null ? 'N/A' : fmtPrice(s.price, currency),
        s.unavailable || s.pnlAmount == null ? 'N/A' : fmtMoney(s.pnlAmount, currency),
        s.unavailable || s.pnlPct == null ? 'N/A' : fmtPct(s.pnlPct),
      ];
      let rx = doc.page.margins.left;
      doc.fontSize(8).fillColor(TEXT);
      row.forEach((cell, i) => {
        doc.text(cell, rx, sy, { width: scenCols[i]! });
        rx += scenCols[i]!;
      });
      sy += 14;
    });
    doc.y = sy + 10;

    // AI rationale
    ensureSpace(doc, 120);
    doc.fontSize(13).fillColor(TEXT).text('AI Rationale', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor(TEXT).text(verdict.aiRationale.rationale, { align: 'justify' });
    doc.moveDown(0.5);
    if (verdict.aiRationale.keyRisks.length > 0) {
      doc.fontSize(9).fillColor(GOLD).text('Key Risks');
      verdict.aiRationale.keyRisks.forEach(risk => {
        doc.fontSize(8).fillColor(MUTED).text(`• ${risk}`, { indent: 8 });
      });
    }
    doc.moveDown(0.8);
    doc.fontSize(7).fillColor(MUTED).text(verdict.disclaimer, { align: 'justify' });

    // Footer with page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor(MUTED)
        .text(
          'Analytical signal for review, not personalized financial advice · PortIQ AlphaEdge',
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
