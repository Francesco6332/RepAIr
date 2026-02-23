import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type PdfDiagnosisData = {
  vehicle: string;
  date: string;
  probableIssue: string;
  confidence: number;
  urgency: string;
  costMin: number;
  costMax: number;
  safetyAdvice: string;
  nextChecks?: string[];
  // Extended fields
  canDrive?: 'yes' | 'with_caution' | 'no';
  topCauses?: Array<{ cause: string; confidence: number }>;
  userChecks?: string[];
  ignoreRisks?: string;
  estimatedTimeMin?: number;
  estimatedTimeMax?: number;
  mechanicQuestions?: string[];
};

const URGENCY_COLOR: Record<string, string> = {
  low: '#34D399',
  medium: '#FBBF24',
  high: '#FB923C',
  critical: '#F87171',
};

const URGENCY_LABEL: Record<string, string> = {
  low: 'Bassa urgenza',
  medium: 'Urgenza media',
  high: 'Alta urgenza',
};

const CAN_DRIVE_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string; sub: string }> = {
  yes: {
    color: '#34D399',
    bg: 'rgba(52,211,153,0.12)',
    icon: '✓',
    label: 'Puoi guidare',
    sub: 'Il veicolo è utilizzabile con attenzione',
  },
  with_caution: {
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    icon: '⚠',
    label: 'Guida con cautela',
    sub: 'Usa il veicolo solo se necessario, vai subito in officina',
  },
  no: {
    color: '#F87171',
    bg: 'rgba(248,113,113,0.12)',
    icon: '✕',
    label: 'Non guidare',
    sub: 'Ferma il veicolo e contatta un meccanico immediatamente',
  },
};

function buildHtml(data: PdfDiagnosisData): string {
  const urgencyColor = URGENCY_COLOR[data.urgency.toLowerCase()] ?? '#FBBF24';
  const urgencyLabel = URGENCY_LABEL[data.urgency.toLowerCase()] ?? data.urgency;
  const confidencePct = Math.round(data.confidence * 100);
  const canDriveCfg = data.canDrive ? CAN_DRIVE_CONFIG[data.canDrive] : null;

  const topCausesHtml = data.topCauses?.length
    ? data.topCauses
        .map((c, i) => {
          const pct = Math.round(c.confidence * 100);
          return `
        <div class="cause-row">
          <div class="cause-num">${i + 1}</div>
          <div class="cause-body">
            <div class="cause-name">${c.cause}</div>
            <div class="cause-bar-wrap">
              <div class="cause-bar-bg"><div class="cause-bar-fill" style="width:${pct}%"></div></div>
              <span class="cause-pct">${pct}%</span>
            </div>
          </div>
        </div>`;
        })
        .join('')
    : '';

  const userChecksHtml = data.userChecks?.length
    ? `<ul class="checks">${data.userChecks.map((c) => `<li>${c}</li>`).join('')}</ul>`
    : '';

  const mechanicChecksHtml = data.nextChecks?.length
    ? data.nextChecks.map((c) => `<div class="mechanic-item"><span class="checkbox">□</span><span>${c}</span></div>`).join('')
    : '';

  const mechanicQuestionsHtml = data.mechanicQuestions?.length
    ? `<ol class="questions">${data.mechanicQuestions.map((q) => `<li>${q}</li>`).join('')}</ol>`
    : '';

  const timeHtml =
    data.estimatedTimeMin != null && data.estimatedTimeMax != null
      ? `<span class="badge" style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.55);border:1px solid rgba(255,255,255,0.12);">
          ⏱ ${data.estimatedTimeMin}–${data.estimatedTimeMax}h in officina
         </span>`
      : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, Helvetica Neue, Arial, sans-serif;
    background: #0d0d14;
    color: #e8e8f0;
    padding: 40px 36px;
    min-height: 100vh;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #a78bfa; }
  .logo span { color: #e8e8f0; }
  .meta { font-size: 12px; color: rgba(255,255,255,0.4); text-align: right; line-height: 1.7; }
  .section {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 20px 22px;
    margin-bottom: 14px;
  }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: rgba(255,255,255,0.30);
    margin-bottom: 12px;
  }
  .issue { font-size: 20px; font-weight: 700; line-height: 1.35; color: #e8e8f0; margin-bottom: 14px; }
  .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
  }
  .bar-wrap { margin-top: 4px; }
  .bar-label { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.40); margin-bottom: 6px; }
  .bar-bg { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 5px; border-radius: 3px; background: #a78bfa; }

  /* Can drive banner */
  .drive-banner {
    border-radius: 14px;
    padding: 16px 18px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    border-width: 1px;
    border-style: solid;
  }
  .drive-icon { font-size: 24px; width: 36px; text-align: center; flex-shrink: 0; }
  .drive-label { font-size: 16px; font-weight: 800; }
  .drive-sub { font-size: 12px; opacity: 0.7; margin-top: 2px; }

  /* Top causes */
  .cause-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
  .cause-num {
    width: 22px; height: 22px; border-radius: 6px;
    background: rgba(167,139,250,0.15); color: #a78bfa;
    font-size: 11px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .cause-body { flex: 1; }
  .cause-name { font-size: 13px; font-weight: 600; color: #e8e8f0; margin-bottom: 5px; }
  .cause-bar-wrap { display: flex; align-items: center; gap: 8px; }
  .cause-bar-bg { flex: 1; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
  .cause-bar-fill { height: 4px; border-radius: 2px; background: #a78bfa; }
  .cause-pct { font-size: 11px; color: rgba(255,255,255,0.4); width: 32px; text-align: right; flex-shrink: 0; }

  /* Risks */
  .risk-box {
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.20);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255,255,255,0.70);
  }

  /* Checks */
  .checks { padding-left: 18px; }
  .checks li { font-size: 13px; line-height: 1.9; color: rgba(255,255,255,0.65); }

  /* Mechanic checklist */
  .mechanic-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    font-size: 13px;
    color: rgba(255,255,255,0.70);
    line-height: 1.5;
  }
  .mechanic-item:last-child { border-bottom: none; }
  .checkbox { font-size: 15px; color: rgba(255,255,255,0.25); flex-shrink: 0; }

  /* Questions */
  .questions { padding-left: 18px; }
  .questions li { font-size: 13px; line-height: 1.9; color: rgba(255,255,255,0.65); }
  .questions li::marker { color: #a78bfa; font-weight: 700; }

  .advice { font-size: 13px; line-height: 1.65; color: rgba(255,255,255,0.65); }

  .footer {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 11px;
    color: rgba(255,255,255,0.22);
    text-align: center;
    line-height: 1.6;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Rep<span>AI</span>ro</div>
    <div class="meta">
      ${data.vehicle}<br/>
      ${data.date}
    </div>
  </div>

  ${canDriveCfg ? `
  <div class="drive-banner" style="background:${canDriveCfg.bg};border-color:${canDriveCfg.color}30;">
    <div class="drive-icon" style="color:${canDriveCfg.color};">${canDriveCfg.icon}</div>
    <div>
      <div class="drive-label" style="color:${canDriveCfg.color};">${canDriveCfg.label}</div>
      <div class="drive-sub" style="color:${canDriveCfg.color};">${canDriveCfg.sub}</div>
    </div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Diagnosi principale</div>
    <div class="issue">${data.probableIssue}</div>
    <div class="row">
      <span class="badge" style="background:${urgencyColor}20;color:${urgencyColor};border:1px solid ${urgencyColor}50;">
        ${urgencyLabel}
      </span>
      <span class="badge" style="background:rgba(167,139,250,0.12);color:#a78bfa;border:1px solid rgba(167,139,250,0.30);">
        €${data.costMin}–€${data.costMax}
      </span>
      ${timeHtml}
    </div>
    <div class="bar-wrap">
      <div class="bar-label">
        <span>Confidenza AI</span>
        <span>${confidencePct}%</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill" style="width:${confidencePct}%"></div>
      </div>
    </div>
  </div>

  ${topCausesHtml ? `
  <div class="section">
    <div class="section-title">Cause probabili</div>
    ${topCausesHtml}
  </div>` : ''}

  ${data.ignoreRisks ? `
  <div class="section">
    <div class="section-title">Rischi se ignori il problema</div>
    <div class="risk-box">${data.ignoreRisks}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Consiglio di sicurezza</div>
    <div class="advice">${data.safetyAdvice}</div>
  </div>

  ${userChecksHtml ? `
  <div class="section">
    <div class="section-title">Cosa puoi controllare ora (5 minuti)</div>
    ${userChecksHtml}
  </div>` : ''}

  ${mechanicChecksHtml ? `
  <div class="section">
    <div class="section-title">Checklist per il meccanico</div>
    ${mechanicChecksHtml}
  </div>` : ''}

  ${mechanicQuestionsHtml ? `
  <div class="section">
    <div class="section-title">Domande da fare in officina</div>
    ${mechanicQuestionsHtml}
  </div>` : ''}

  <div class="footer">
    Questo report è una pre-diagnosi generata da AI e non sostituisce l'ispezione di un meccanico certificato.<br/>
    Generato da RepAIro · repairoapp.com
  </div>
</body>
</html>`;
}

export async function shareDiagnosisPdf(data: PdfDiagnosisData): Promise<void> {
  const html = buildHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Condividi report diagnosi',
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri });
  }
}
