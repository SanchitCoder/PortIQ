import PDFDocument from 'pdfkit';
import type { PortfolioAnalysisResponse } from '../../../shared/api-types.js';

const GOLD = '#9A7A2E';
const GOLD_LIGHT = '#C9A84C';
const TEXT = '#1A1A2E';
const MUTED = '#5C6078';
const BORDER = '#E8E4D8';

function fmtRupee(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/** Server-side PDF report — pdfkit chosen for lightweight streaming without a headless browser */
export function generatePortfolioPdf(
  analysis: PortfolioAnalysisResponse,
  userEmail?: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const generatedAt = analysis.generatedAt
      ? new Date(analysis.generatedAt)
      : new Date();

    // Header
    doc.fontSize(22).fillColor(GOLD).text('PortIQ', { continued: false });
    doc.fontSize(10).fillColor(MUTED).text('Portfolio Analysis Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor(MUTED)
      .text(`Generated: ${generatedAt.toLocaleString('en-IN')}`)
      .text(userEmail ? `Prepared for: ${userEmail}` : 'Prepared for: Portfolio user');
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor(GOLD_LIGHT).lineWidth(2).stroke();
    doc.moveDown(1);

    // Summary stats
    doc.fontSize(13).fillColor(TEXT).text('Portfolio Summary', { underline: true });
    doc.moveDown(0.5);
    const summary = analysis.portfolioSummary;
    const colW = pageWidth / 2;
    const summaryRows = [
      ['Total Invested', fmtRupee(summary?.totalInvested ?? 0)],
      ['Current Value', fmtRupee(summary?.currentValue ?? 0)],
      ['Total P&L', `${fmtRupee(summary?.totalPnl ?? 0)} (${fmtPct(summary?.totalPnlPct ?? 0)})`],
      ['Health Score', `${analysis.healthScore}/100`],
      ['Risk Score', `${analysis.riskScore}/100`],
      ['Diversification', `${analysis.diversification.score}/100`],
    ];
    summaryRows.forEach(([label, value], i) => {
      const x = doc.page.margins.left + (i % 2) * colW;
      const y = doc.y + (i % 2 === 0 && i > 0 ? 16 : 0);
      if (i % 2 === 0 && i > 0) doc.y = y;
      doc.fontSize(9).fillColor(MUTED).text(label, x, doc.y, { width: colW - 10, continued: false });
      doc.fontSize(10).fillColor(TEXT).text(value, x, doc.y, { width: colW - 10 });
      if (i % 2 === 1) doc.moveDown(0.8);
    });
    doc.moveDown(1);

    // Holdings table
    doc.fontSize(13).fillColor(TEXT).text('Holdings', { underline: true });
    doc.moveDown(0.5);

    const holdings = analysis.holdingsSnapshot ?? [];
    const colWidths = [55, 35, 65, 65, 70, 45, 45];
    const headers = ['Symbol', 'Qty', 'Avg Buy', 'Price', 'P&L', 'P&L %', 'Wt %'];
    let tableY = doc.y;
    doc.fontSize(8).fillColor(GOLD);
    let hx = doc.page.margins.left;
    headers.forEach((h, i) => {
      doc.text(h, hx, tableY, { width: colWidths[i]!, align: i >= 4 ? 'right' : 'left' });
      hx += colWidths[i]!;
    });
    tableY += 14;
    doc.moveTo(doc.page.margins.left, tableY).lineTo(doc.page.margins.left + pageWidth, tableY)
      .strokeColor(BORDER).lineWidth(0.5).stroke();
    tableY += 6;

    holdings.forEach(h => {
      if (tableY > doc.page.height - 80) {
        doc.addPage();
        tableY = doc.page.margins.top;
      }
      const row = [
        h.symbol,
        String(h.quantity),
        fmtRupee(h.avgBuyPrice),
        fmtRupee(h.currentPrice),
        fmtRupee(h.pnl),
        fmtPct(h.pnlPct),
        `${h.weight.toFixed(1)}%`,
      ];
      let rx = doc.page.margins.left;
      doc.fontSize(8).fillColor(TEXT);
      row.forEach((cell, i) => {
        doc.text(cell, rx, tableY, { width: colWidths[i]!, align: i >= 4 ? 'right' : 'left' });
        rx += colWidths[i]!;
      });
      tableY += 14;
    });
    doc.y = tableY + 8;

    // Concentration / diversification warnings
    const warnings = [
      ...analysis.concentration.warnings,
      ...analysis.diversification.warnings.filter(w => !analysis.concentration.warnings.includes(w)),
    ];
    if (warnings.length > 0) {
      doc.fontSize(13).fillColor(TEXT).text('Concentration & Diversification', { underline: true });
      doc.moveDown(0.4);
      doc.fontSize(9).fillColor(MUTED)
        .text(`HHI: ${analysis.concentration.hhi.toFixed(4)} · Max single holding: ${analysis.concentration.maxWeight.toFixed(1)}%`);
      doc.moveDown(0.3);
      warnings.forEach(w => {
        doc.fontSize(9).fillColor('#B45309').text(`⚠ ${w}`, { indent: 8 });
      });
      doc.moveDown(0.8);
    }

    // Sector allocation (text bars)
    if (analysis.sectorAllocation.length > 0) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.fontSize(13).fillColor(TEXT).text('Sector Allocation', { underline: true });
      doc.moveDown(0.5);
      const maxBarW = pageWidth - 120;
      analysis.sectorAllocation.forEach(s => {
        const barW = (s.weight / 100) * maxBarW;
        const y = doc.y;
        doc.fontSize(9).fillColor(MUTED).text(s.sector, doc.page.margins.left, y, { width: 100 });
        doc.rect(doc.page.margins.left + 105, y + 1, barW, 10).fill(GOLD_LIGHT);
        doc.fontSize(8).fillColor(TEXT).text(`${s.weight.toFixed(1)}%`, doc.page.margins.left + 110 + barW, y);
        doc.moveDown(0.6);
      });
      doc.moveDown(0.5);
    }

    // Action plan
    if (doc.y > doc.page.height - 160) doc.addPage();
    doc.fontSize(13).fillColor(TEXT).text('Action Plan', { underline: true });
    doc.moveDown(0.5);

    const plan = analysis.actionPlan;
    doc.rect(doc.page.margins.left, doc.y, pageWidth, 52).fill('#FBF8F0');
    const nbaY = doc.y + 8;
    doc.fontSize(9).fillColor(GOLD).text('NEXT BEST ACTION', doc.page.margins.left + 10, nbaY);
    doc.fontSize(10).fillColor(TEXT).text(plan.nextBestAction.title, doc.page.margins.left + 10, nbaY + 14, { width: pageWidth - 20 });
    doc.fontSize(8).fillColor(MUTED).text(plan.nextBestAction.detail, doc.page.margins.left + 10, nbaY + 28, { width: pageWidth - 20 });
    doc.y = nbaY + 58;

    if (plan.summary) {
      doc.fontSize(9).fillColor(MUTED).text(plan.summary, { align: 'justify' });
      doc.moveDown(0.8);
    }

    plan.actions.forEach((action, idx) => {
      if (doc.y > doc.page.height - 100) doc.addPage();

      const quantParts: string[] = [];
      if (action.sharesDelta != null) {
        quantParts.push(`Shares: ${action.sharesDelta > 0 ? '+' : ''}${action.sharesDelta}`);
      }
      if (action.rupeeAmount != null) quantParts.push(`Amount: ${fmtRupee(action.rupeeAmount)}`);
      if (action.currentWeight != null && action.targetWeight != null) {
        quantParts.push(`Weight: ${action.currentWeight}% → ${action.targetWeight}%`);
      } else if (action.currentWeight != null && action.resultingWeight != null) {
        quantParts.push(`Weight: ${action.currentWeight}% → ${action.resultingWeight}%`);
      }
      if (action.realizedGainEstimate != null) {
        quantParts.push(`Est. gain: ${fmtRupee(action.realizedGainEstimate)}`);
      }
      if (action.sectorsToAdd != null) {
        quantParts.push(`Sectors to add: ${action.sectorsToAdd}`);
      }

      doc.fontSize(9).fillColor(GOLD)
        .text(`${idx + 1}. [${action.priority.toUpperCase()}] ${action.title}`);
      if (quantParts.length > 0) {
        doc.fontSize(8).fillColor(MUTED).text(quantParts.join(' · '), { indent: 12 });
      }
      doc.fontSize(8).fillColor(TEXT).text(action.rationale, { indent: 12 });
      doc.moveDown(0.5);
    });

    doc.fontSize(7).fillColor(MUTED).text(plan.disclaimer, { align: 'justify' });

    // Footer with page numbers on all pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor(MUTED)
        .text(
          'Analytical suggestions for review, not personalized financial advice · PortIQ',
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
