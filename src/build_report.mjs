// build_report.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const ENRICHED_FILE = path.join(DATA_DIR, 'enriched_leads.json');
const OUTPUT_HTML = path.resolve(__dirname, '../informe-leads-gdl-sur.html');
const OUTPUT_INDEX = path.resolve(__dirname, '../index.html');

function buildHtmlReport() {
  const leads = JSON.parse(fs.readFileSync(ENRICHED_FILE, 'utf-8'));
  console.log(`Generating 100% responsive HTML report for ${leads.length} leads...`);

  // Aggregate stats
  const totalLeads = leads.length;
  const withPhone = leads.filter(l => l.phone).length;
  const totalReviews = leads.reduce((acc, l) => acc + (l.numResenas || 0), 0);
  const avgRating = (leads.reduce((acc, l) => acc + (l.rating || 0), 0) / totalLeads).toFixed(2);
  
  const zonesMap = {};
  leads.forEach(l => {
    zonesMap[l.zona] = (zonesMap[l.zona] || 0) + 1;
  });

  const municipalitiesMap = {};
  leads.forEach(l => {
    municipalitiesMap[l.municipio] = (municipalitiesMap[l.municipio] || 0) + 1;
  });

  const categoriesMap = {};
  leads.forEach(l => {
    categoriesMap[l.category] = (categoriesMap[l.category] || 0) + 1;
  });

  const totalZones = Object.keys(zonesMap).length;
  const totalMunicipalities = Object.keys(municipalitiesMap).length;

  const html = `<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">
  <title>Prospecting Intelligence · Leads GDL Sur (Santa Cruz del Valle y Alrededores)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-display: 'Space Grotesk', -apple-system, sans-serif;
      --transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    [data-theme="dark"] {
      --bg: #07111c;
      --bg-surface: #0b192c;
      --bg-card: #0e2338;
      --bg-card-hover: #122b44;
      --bg-input: #071524;
      --border: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(16, 185, 129, 0.28);
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      
      --primary: #10b981;
      --primary-glow: rgba(16, 185, 129, 0.22);
      --primary-dark: #064e3b;
      --primary-light: #34d399;
      
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.16);
      
      --wa-color: #25d366;
      --wa-glow: rgba(37, 211, 102, 0.2);
      
      --card-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.55);
      --card-shadow-hover: 0 20px 40px -15px rgba(0, 0, 0, 0.75);
      --header-bg: rgba(7, 17, 28, 0.88);
      --badge-bg: rgba(255, 255, 255, 0.05);
    }

    [data-theme="light"] {
      --bg: #f3f6f8;
      --bg-surface: #ffffff;
      --bg-card: #ffffff;
      --bg-card-hover: #f8fafc;
      --bg-input: #f1f5f9;
      --border: rgba(15, 23, 42, 0.09);
      --border-accent: rgba(5, 150, 105, 0.35);
      --text: #0f172a;
      --text-muted: #475569;
      --text-dim: #94a3b8;
      
      --primary: #059669;
      --primary-glow: rgba(5, 150, 105, 0.16);
      --primary-dark: #064e3b;
      --primary-light: #10b981;
      
      --accent: #0284c7;
      --accent-glow: rgba(2, 132, 199, 0.14);
      
      --wa-color: #128c7e;
      --wa-glow: rgba(18, 140, 126, 0.18);
      
      --card-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.06);
      --card-shadow-hover: 0 18px 32px -8px rgba(15, 23, 42, 0.12);
      --header-bg: rgba(255, 255, 255, 0.92);
      --badge-bg: rgba(15, 23, 42, 0.04);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      overflow-x: hidden;
      width: 100%;
    }

    body {
      font-family: var(--font-main);
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      transition: background-color 0.3s ease, color 0.3s ease;
      min-height: 100vh;
    }

    /* Ambient background gradient */
    body::before {
      content: '';
      position: fixed;
      top: -20vw;
      left: -10vw;
      width: 50vw;
      height: 50vw;
      background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    body::after {
      content: '';
      position: fixed;
      bottom: -20vw;
      right: -10vw;
      width: 50vw;
      height: 50vw;
      background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .container {
      width: 100%;
      max-width: 1360px;
      margin: 0 auto;
      padding: 0 clamp(12px, 3vw, 24px);
      position: relative;
      z-index: 1;
    }

    /* TOP NAVBAR */
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--header-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 12px 0;
      transition: var(--transition);
    }

    .top-bar-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary) 0%, #0369a1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 17px;
      box-shadow: 0 4px 12px var(--primary-glow);
      flex-shrink: 0;
    }

    .brand-text {
      min-width: 0;
    }

    .brand-text h1 {
      font-family: var(--font-display);
      font-size: clamp(14px, 2.5vw, 17px);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .brand-text p {
      font-size: 11px;
      color: var(--text-dim);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      min-height: 38px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      transition: var(--transition);
      text-decoration: none;
      white-space: nowrap;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .btn:hover {
      background: var(--bg-card-hover);
      border-color: var(--text-dim);
      transform: translateY(-1px);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-primary {
      background: var(--primary);
      color: #ffffff;
      border-color: transparent;
      box-shadow: 0 4px 14px var(--primary-glow);
    }

    .btn-primary:hover {
      background: var(--primary-light);
      border-color: transparent;
      color: #064e3b;
    }

    .btn-wa {
      background: var(--wa-color);
      color: #ffffff !important;
      border-color: transparent;
      box-shadow: 0 4px 12px var(--wa-glow);
    }

    .btn-wa:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    /* HERO SECTION */
    .hero {
      padding: clamp(24px, 4vw, 40px) 0 clamp(18px, 3vw, 28px);
      text-align: center;
    }

    .badge-agency {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: var(--primary-glow);
      border: 1px solid var(--border-accent);
      color: var(--primary-light);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }

    [data-theme="light"] .badge-agency {
      color: var(--primary-dark);
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: clamp(24px, 4.2vw, 42px);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.18;
      margin-bottom: 12px;
      background: linear-gradient(135deg, var(--text) 30%, var(--primary-light) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-subtitle {
      font-size: clamp(13px, 1.8vw, 16px);
      color: var(--text-muted);
      max-width: 720px;
      margin: 0 auto 28px;
      padding: 0 8px;
    }

    /* 4 STATS ROW */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
      gap: 14px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: clamp(16px, 2.5vw, 22px);
      position: relative;
      overflow: hidden;
      box-shadow: var(--card-shadow);
      transition: var(--transition);
      display: flex;
      flex-direction: column;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--card-shadow-hover);
      border-color: var(--border-accent);
    }

    .stat-card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      opacity: 0.8;
    }

    .stat-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: clamp(26px, 3.5vw, 36px);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text);
      line-height: 1.1;
      margin-bottom: 4px;
      font-variant-numeric: tabular-nums;
    }

    .stat-desc {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* CHART SECTION */
    .chart-panel {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: clamp(16px, 3vw, 24px);
      box-shadow: var(--card-shadow);
      margin-bottom: 28px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .chart-title-wrap {
      min-width: 0;
    }

    .chart-title-wrap h3 {
      font-family: var(--font-display);
      font-size: clamp(15px, 2vw, 18px);
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .chart-title-wrap p {
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .chart-tabs {
      display: flex;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 3px;
      gap: 3px;
      max-width: 100%;
      overflow-x: auto;
    }

    .chart-tab {
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      background: transparent;
      color: var(--text-dim);
      border: none;
      cursor: pointer;
      transition: var(--transition);
      white-space: nowrap;
    }

    .chart-tab.active {
      background: var(--bg-card);
      color: var(--text);
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .chart-bars-wrap {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .chart-bar-row {
      display: grid;
      grid-template-columns: minmax(110px, 210px) 1fr 65px;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 8px;
      transition: var(--transition);
    }

    .chart-bar-row:hover {
      background: var(--bg-card-hover);
    }

    .chart-bar-label {
      font-size: 12.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chart-track {
      background: var(--bg-input);
      border-radius: 6px;
      height: 18px;
      overflow: hidden;
      position: relative;
      min-width: 40px;
    }

    .chart-fill {
      height: 100%;
      border-radius: 6px;
      background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);
      transition: width 0.7s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .chart-bar-value {
      text-align: right;
      font-family: var(--font-display);
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* CONTROLS TOOLBAR */
    .toolbar {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: clamp(14px, 2.5vw, 20px);
      box-shadow: var(--card-shadow);
      margin-bottom: 24px;
    }

    .toolbar-top {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }

    .search-box {
      grid-column: 1 / -1;
      position: relative;
      display: flex;
      align-items: center;
    }

    @media (min-width: 900px) {
      .toolbar-top {
        grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr;
      }
      .search-box {
        grid-column: span 1;
      }
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-dim);
      pointer-events: none;
      display: flex;
    }

    .input-field, .select-field {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: var(--font-main);
      font-size: 13px;
      font-weight: 500;
      padding: 10px 12px;
      border-radius: 10px;
      outline: none;
      transition: var(--transition);
      min-height: 40px;
    }

    .search-box .input-field {
      padding-left: 36px;
    }

    .input-field:focus, .select-field:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-glow);
    }

    .toolbar-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }

    .pill-btn {
      padding: 6px 12px;
      min-height: 32px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--badge-bg);
      color: var(--text-muted);
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      white-space: nowrap;
      user-select: none;
    }

    .pill-btn:hover {
      color: var(--text);
      border-color: var(--text-dim);
    }

    .pill-btn.active {
      background: var(--primary);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 2px 8px var(--primary-glow);
    }

    .crm-progress-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
      margin-left: auto;
    }

    .crm-progress-bar {
      width: 120px;
      height: 8px;
      background: var(--bg-input);
      border-radius: 999px;
      overflow: hidden;
      flex-shrink: 0;
    }

    .crm-progress-fill {
      height: 100%;
      background: var(--primary);
      border-radius: 999px;
      transition: width 0.3s ease;
      width: 0%;
    }

    /* LEADS GRID */
    .leads-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr));
      gap: 18px;
      margin-bottom: 50px;
    }

    /* LEAD CARD */
    .lead-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: clamp(16px, 2.5vw, 22px);
      box-shadow: var(--card-shadow);
      transition: var(--transition);
      display: flex;
      flex-direction: column;
      position: relative;
      min-width: 0;
    }

    .lead-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--card-shadow-hover);
      border-color: var(--border-accent);
    }

    .lead-card.is-contacted {
      opacity: 0.88;
      border-color: rgba(16, 185, 129, 0.45);
      background: linear-gradient(180deg, var(--bg-card) 0%, rgba(16, 185, 129, 0.05) 100%);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }

    .card-title-group {
      flex: 1;
      min-width: 0;
    }

    .lead-category {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--primary);
      margin-bottom: 3px;
    }

    .lead-name {
      font-family: var(--font-display);
      font-size: clamp(16px, 2vw, 18px);
      font-weight: 700;
      line-height: 1.25;
      color: var(--text);
      word-break: break-word;
    }

    .score-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 50px;
      height: 50px;
      border-radius: 12px;
      font-family: var(--font-display);
      font-weight: 800;
      line-height: 1;
      padding: 4px;
      flex-shrink: 0;
    }

    .score-num {
      font-size: 19px;
      letter-spacing: -0.02em;
    }

    .score-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.8;
      margin-top: 2px;
    }

    .score-high {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #10b981;
    }

    .score-mid {
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(2, 132, 199, 0.25) 100%);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }

    .score-low {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.25) 100%);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #f59e0b;
    }

    .score-franchise {
      background: linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.2) 100%);
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #94a3b8;
    }

    /* DECISION MAKER BADGE */
    .decisor-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 12px;
      align-self: flex-start;
      max-width: 100%;
    }

    .decisor-local {
      background: rgba(16, 185, 129, 0.12);
      color: var(--primary-light);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    [data-theme="light"] .decisor-local {
      color: #065f46;
    }

    .decisor-pyme {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
    }

    [data-theme="light"] .decisor-pyme {
      color: #0369a1;
    }

    .decisor-cadena {
      background: rgba(244, 63, 94, 0.12);
      color: #fb7185;
      border: 1px solid rgba(244, 63, 94, 0.25);
    }

    /* META ROW */
    .meta-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: 12.5px;
      margin-bottom: 14px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .meta-item svg {
      flex-shrink: 0;
      color: var(--text-dim);
    }

    .meta-link {
      color: var(--text);
      text-decoration: none;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .meta-link:hover {
      color: var(--primary);
    }

    .copy-phone-btn {
      background: none;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      transition: var(--transition);
    }

    .copy-phone-btn:hover {
      color: var(--primary);
      background: var(--badge-bg);
    }

    .rating-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #f59e0b;
      font-weight: 700;
    }

    /* AI INTELLIGENCE BOX */
    .ai-box {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 14px;
      position: relative;
    }

    .ai-box-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      margin-bottom: 5px;
    }

    .ai-line-1 {
      font-size: 12px;
      color: var(--text);
      line-height: 1.45;
      margin-bottom: 5px;
    }

    .ai-line-2 {
      font-size: 11.5px;
      color: var(--text-muted);
      line-height: 1.4;
      font-style: italic;
    }

    /* CARD FOOTER ACTIONS */
    .card-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(95px, 1fr));
      gap: 6px;
      margin-bottom: 14px;
    }

    .card-actions .btn {
      padding: 7px 8px;
      font-size: 11.5px;
      min-height: 36px;
    }

    /* CRM SECTION */
    .crm-section {
      background: var(--badge-bg);
      border-top: 1px solid var(--border);
      margin: 0 calc(-1 * clamp(16px, 2.5vw, 22px)) calc(-1 * clamp(16px, 2.5vw, 22px));
      padding: 14px clamp(16px, 2.5vw, 22px);
      border-radius: 0 0 18px 18px;
    }

    .crm-contact-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .crm-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    .crm-checkbox {
      appearance: none;
      -webkit-appearance: none;
      width: 19px;
      height: 19px;
      border: 2px solid var(--border);
      border-radius: 6px;
      background: var(--bg-card);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
      position: relative;
      flex-shrink: 0;
    }

    .crm-checkbox:checked {
      background: var(--primary);
      border-color: var(--primary);
    }

    .crm-checkbox:checked::after {
      content: '✓';
      color: #fff;
      font-size: 12px;
      font-weight: 800;
    }

    .crm-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
    }

    .crm-timestamp {
      font-size: 11px;
      color: var(--text-dim);
      margin-left: auto;
      white-space: nowrap;
    }

    .crm-notes-input {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      font-family: var(--font-main);
      font-size: 12px;
      color: var(--text);
      resize: vertical;
      min-height: 52px;
      outline: none;
      transition: var(--transition);
    }

    .crm-notes-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-glow);
    }

    .crm-notes-input::placeholder {
      color: var(--text-dim);
      font-style: italic;
    }

    /* EMPTY STATE */
    .empty-state {
      text-align: center;
      padding: 50px 20px;
      color: var(--text-muted);
      grid-column: 1 / -1;
    }

    .empty-icon {
      font-size: 38px;
      margin-bottom: 10px;
    }

    /* FOOTER */
    footer {
      border-top: 1px solid var(--border);
      padding: 28px 0;
      text-align: center;
      color: var(--text-dim);
      font-size: 12px;
    }

    /* TOAST */
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      left: auto;
      max-width: calc(100vw - 40px);
      background: var(--bg-card);
      border: 1px solid var(--primary);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      color: var(--text);
      padding: 9px 16px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      transform: translateY(80px);
      opacity: 0;
      transition: var(--transition);
      pointer-events: none;
    }

    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    /* MOBILE EXTRA REFINEMENTS */
    @media (max-width: 640px) {
      .top-bar-inner {
        flex-direction: column;
        align-items: stretch;
      }
      .brand-wrap {
        justify-content: flex-start;
      }
      .nav-actions {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .nav-actions .btn {
        width: 100%;
      }
      .chart-bar-row {
        grid-template-columns: 105px 1fr 50px;
        gap: 6px;
      }
      .toolbar-bottom {
        flex-direction: column;
        align-items: stretch;
      }
      .crm-progress-wrap {
        margin-left: 0;
        justify-content: space-between;
        width: 100%;
      }
      .crm-progress-bar {
        width: 140px;
      }
      .toast {
        left: 20px;
        right: 20px;
        justify-content: center;
      }
    }
  </style>
</head>
<body>

  <!-- TOP BAR -->
  <header class="top-bar">
    <div class="container top-bar-inner">
      <div class="brand-wrap">
        <div class="brand-logo">BH</div>
        <div class="brand-text">
          <h1>BusinessHub · GDL Sur</h1>
          <p>Prospección y Contacto de Negocios</p>
        </div>
      </div>
      <div class="nav-actions">
        <button class="btn" id="themeToggle" title="Cambiar tema">
          <span id="themeIcon">☀️</span> Modo Claro
        </button>
        <button class="btn" id="exportCsvBtn" title="Descargar base con notas de contacto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
      </div>
    </div>
  </header>

  <main class="container">
    <!-- HERO SECTION -->
    <section class="hero">
      <div class="badge-agency">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
        Prospección y Contacto Multicanal
      </div>
      <h2 class="hero-title">Negocios con Citas en Guadalajara Sur</h2>
      <p class="hero-subtitle">
        Santa Cruz del Valle y zonas colindantes. Extracción de Google Maps con análisis IA de decisores para preparar tu contacto (en persona, WhatsApp o llamada).
      </p>

      <!-- 4 STATS -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total Empresas</span>
          <span class="stat-value" id="statTotal">${totalLeads}</span>
          <span class="stat-desc">${withPhone} con contacto verificado (${((withPhone/totalLeads)*100).toFixed(0)}%)</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Ciudades y Zonas</span>
          <span class="stat-value" id="statZones">${totalZones}</span>
          <span class="stat-desc">${totalMunicipalities} municipios del corredor sur</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Reseñas Sumadas</span>
          <span class="stat-value" id="statReviews">${totalReviews.toLocaleString()}</span>
          <span class="stat-desc">Opiniones y reputación analizadas</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Valoración Media</span>
          <span class="stat-value" id="statRating">${avgRating} ★</span>
          <span class="stat-desc">Promedio general en Google Maps</span>
        </div>
      </div>
    </section>

    <!-- CHART PANEL -->
    <section class="chart-panel">
      <div class="chart-header">
        <div class="chart-title-wrap">
          <h3 id="chartTitle">Reparto de Empresas por Zona del Sur</h3>
          <p>Toca cualquier barra para filtrar el listado instantáneamente</p>
        </div>
        <div class="chart-tabs">
          <button class="chart-tab active" data-chart="zona">Por Zona</button>
          <button class="chart-tab" data-chart="municipio">Por Municipio</button>
          <button class="chart-tab" data-chart="categoria">Por Giro</button>
        </div>
      </div>
      <div class="chart-bars-wrap" id="chartBarsContainer">
        <!-- Bars injected dynamically -->
      </div>
    </section>

    <!-- CONTROLS TOOLBAR -->
    <section class="toolbar">
      <div class="toolbar-top">
        <div class="search-box">
          <div class="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input type="text" class="input-field" id="searchInput" placeholder="Buscar por nombre, teléfono, servicio o palabras clave...">
        </div>

        <select class="select-field" id="zoneFilter">
          <option value="">Todas las Zonas (${totalZones})</option>
          ${Object.entries(zonesMap).sort((a,b)=>b[1]-a[1]).map(([z, c]) => `<option value="${z}">${z} (${c})</option>`).join('')}
        </select>

        <select class="select-field" id="categoryFilter">
          <option value="">Todos los Giros (${Object.keys(categoriesMap).length})</option>
          ${Object.entries(categoriesMap).sort((a,b)=>b[1]-a[1]).map(([c, cnt]) => `<option value="${c}">${c} (${cnt})</option>`).join('')}
        </select>

        <select class="select-field" id="sortSelect">
          <option value="score_desc">Puntuación: Mayor a Menor</option>
          <option value="score_asc">Puntuación: Menor a Mayor</option>
          <option value="reviews_desc">Más Reseñas</option>
          <option value="rating_desc">Mejor Valoración</option>
          <option value="name_asc">Nombre: A - Z</option>
        </select>
      </div>

      <div class="toolbar-bottom">
        <div class="filter-pills">
          <button class="pill-btn active" data-pill-web="">Todas</button>
          <button class="pill-btn" data-pill-web="con_web">Con Sitio Web</button>
          <button class="pill-btn" data-pill-web="redes">Redes Sociales</button>
          <button class="pill-btn" data-pill-web="sin_web">Sin Web (Oportunidad)</button>
          <button class="pill-btn" data-pill-status="contactados">Solo Contactados</button>
          <button class="pill-btn" data-pill-status="pendientes">Pendientes</button>
        </div>

        <div class="crm-progress-wrap">
          <span id="crmProgressText">0 / ${totalLeads} contactados (0%)</span>
          <div class="crm-progress-bar">
            <div class="crm-progress-fill" id="crmProgressFill"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- LEADS CARDS GRID -->
    <section class="leads-grid" id="leadsGrid">
      <!-- Leads rendered dynamically -->
    </section>
  </main>

  <footer>
    <div class="container">
      <p>BusinessHub · Prospección y Contacto Comercial en el Sur de Guadalajara. Datos sincronizados con Google Maps y persistencia local.</p>
    </div>
  </footer>

  <div class="toast" id="toastBox">
    <span>✓</span> <span id="toastMsg">Actualizado con éxito</span>
  </div>

  <!-- EMBEDDED DATASET -->
  <script>
    const LEADS_DATA = ${JSON.stringify(leads)};
    const STORAGE_KEY = 'businesshub_crm_leads_v1';
    const THEME_KEY = 'businesshub_theme_preference';

    // State
    let crmState = {};
    try {
      crmState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch(e) {
      crmState = {};
    }

    let activeFilter = {
      search: '',
      zone: '',
      category: '',
      webType: '',
      status: '', // 'contactados' | 'pendientes' | ''
      sortBy: 'score_desc',
      chartView: 'zona'
    };

    // DOM Elements
    const leadsGrid = document.getElementById('leadsGrid');
    const searchInput = document.getElementById('searchInput');
    const zoneFilter = document.getElementById('zoneFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortSelect');
    const chartBarsContainer = document.getElementById('chartBarsContainer');
    const crmProgressText = document.getElementById('crmProgressText');
    const crmProgressFill = document.getElementById('crmProgressFill');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const toastBox = document.getElementById('toastBox');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    // Theme initialization
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });

    function setTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(THEME_KEY, t);
      if (t === 'dark') {
        themeIcon.textContent = '☀️';
        themeToggle.innerHTML = '<span id="themeIcon">☀️</span> Modo Claro';
      } else {
        themeIcon.textContent = '🌙';
        themeToggle.innerHTML = '<span id="themeIcon">🌙</span> Modo Oscuro';
      }
    }

    // Chart Tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter.chartView = tab.getAttribute('data-chart');
        renderChart();
      });
    });

    // Pill filters
    document.querySelectorAll('[data-pill-web]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-pill-web]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter.webType = btn.getAttribute('data-pill-web');
        renderLeads();
      });
    });

    document.querySelectorAll('[data-pill-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-pill-status');
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          activeFilter.status = '';
        } else {
          document.querySelectorAll('[data-pill-status]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFilter.status = val;
        }
        renderLeads();
      });
    });

    // Search and selects
    searchInput.addEventListener('input', (e) => {
      activeFilter.search = e.target.value.trim().toLowerCase();
      renderLeads();
    });

    zoneFilter.addEventListener('change', (e) => {
      activeFilter.zone = e.target.value;
      renderLeads();
    });

    categoryFilter.addEventListener('change', (e) => {
      activeFilter.category = e.target.value;
      renderLeads();
    });

    sortSelect.addEventListener('change', (e) => {
      activeFilter.sortBy = e.target.value;
      renderLeads();
    });

    // Render Chart
    function renderChart() {
      const titleEl = document.getElementById('chartTitle');
      const counts = {};
      const view = activeFilter.chartView;

      if (view === 'zona') {
        titleEl.textContent = 'Reparto de Empresas por Zona del Sur';
        LEADS_DATA.forEach(l => { counts[l.zona] = (counts[l.zona] || 0) + 1; });
      } else if (view === 'municipio') {
        titleEl.textContent = 'Reparto de Empresas por Municipio';
        LEADS_DATA.forEach(l => { counts[l.municipio] = (counts[l.municipio] || 0) + 1; });
      } else if (view === 'categoria') {
        titleEl.textContent = 'Reparto de Empresas por Giro de Negocio';
        LEADS_DATA.forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1; });
      }

      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const maxCount = Math.max(...entries.map(e => e[1])) || 1;

      chartBarsContainer.innerHTML = entries.map(([label, count]) => {
        const pct = ((count / maxCount) * 100).toFixed(1);
        const percentOfTotal = ((count / LEADS_DATA.length) * 100).toFixed(0);
        return \`
          <div class="chart-bar-row" data-bar-label="\${escapeHtml(label)}" data-bar-type="\${view}" title="Filtrar por \${escapeHtml(label)}">
            <span class="chart-bar-label">\${escapeHtml(label)}</span>
            <div class="chart-track">
              <div class="chart-fill" style="width: \${pct}%;"></div>
            </div>
            <span class="chart-bar-value">\${count} <span style="font-size: 10px; color: var(--text-dim);">(\${percentOfTotal}%)</span></span>
          </div>
        \`;
      }).join('');

      // Add click handler to filter by clicking a bar
      chartBarsContainer.querySelectorAll('.chart-bar-row').forEach(row => {
        row.addEventListener('click', () => {
          const lbl = row.getAttribute('data-bar-label');
          const type = row.getAttribute('data-bar-type');
          if (type === 'zona') {
            zoneFilter.value = lbl;
            activeFilter.zone = lbl;
          } else if (type === 'categoria') {
            categoryFilter.value = lbl;
            activeFilter.category = lbl;
          } else if (type === 'municipio') {
            activeFilter.search = lbl.toLowerCase();
            searchInput.value = lbl;
          }
          renderLeads();
          showToast(\`Filtrando por: \${lbl}\`);
          leadsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    // Render Leads
    function renderLeads() {
      let filtered = LEADS_DATA.filter(l => {
        // Search
        if (activeFilter.search) {
          const q = activeFilter.search;
          const matchName = l.name.toLowerCase().includes(q);
          const matchPhone = (l.phone || '').includes(q) || (l.phoneDisplay || '').includes(q);
          const matchAddress = (l.address || '').toLowerCase().includes(q);
          const matchAi = (l.resumenIA || '').toLowerCase().includes(q);
          const matchCat = (l.category || '').toLowerCase().includes(q);
          const matchMuni = (l.municipio || '').toLowerCase().includes(q);
          if (!matchName && !matchPhone && !matchAddress && !matchAi && !matchCat && !matchMuni) {
            return false;
          }
        }

        // Zone
        if (activeFilter.zone && l.zona !== activeFilter.zone) {
          return false;
        }

        // Category
        if (activeFilter.category && l.category !== activeFilter.category) {
          return false;
        }

        // Web type pill
        if (activeFilter.webType === 'con_web' && (!l.tieneWeb || l.webType.includes('Social') || l.webType.includes('Instagram') || l.webType.includes('Facebook'))) {
          return false;
        }
        if (activeFilter.webType === 'redes' && !(l.webType === 'Instagram' || l.webType === 'Facebook')) {
          return false;
        }
        if (activeFilter.webType === 'sin_web' && l.tieneWeb) {
          return false;
        }

        // Status
        const isContacted = crmState[l.id]?.contacted;
        if (activeFilter.status === 'contactados' && !isContacted) return false;
        if (activeFilter.status === 'pendientes' && isContacted) return false;

        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        switch (activeFilter.sortBy) {
          case 'score_desc': return b.score - a.score;
          case 'score_asc': return a.score - b.score;
          case 'reviews_desc': return (b.numResenas || 0) - (a.numResenas || 0);
          case 'rating_desc': return (b.rating || 0) - (a.rating || 0);
          case 'name_asc': return a.name.localeCompare(b.name);
          default: return b.score - a.score;
        }
      });

      updateProgress();

      if (filtered.length === 0) {
        leadsGrid.innerHTML = \`
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>No se encontraron empresas con los filtros aplicados</h3>
            <p>Intenta cambiar los términos de búsqueda o restablecer los filtros de zona y giro.</p>
          </div>
        \`;
        return;
      }

      leadsGrid.innerHTML = filtered.map(lead => {
        const crmItem = crmState[lead.id] || { contacted: false, notes: '', date: '' };
        const isContacted = crmItem.contacted;
        const notes = crmItem.notes || '';
        const contactDate = crmItem.date ? new Date(crmItem.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

        let scoreClass = 'score-high';
        if (lead.perfilDecisorTipo === 'franquicia') scoreClass = 'score-franchise';
        else if (lead.score >= 80) scoreClass = 'score-high';
        else if (lead.score >= 60) scoreClass = 'score-mid';
        else scoreClass = 'score-low';

        let decisorClass = 'decisor-local';
        let decisorIcon = '👤';
        if (lead.perfilDecisorTipo === 'pyme_recepcion') {
          decisorClass = 'decisor-pyme';
          decisorIcon = '🏢';
        } else if (lead.perfilDecisorTipo === 'franquicia') {
          decisorClass = 'decisor-cadena';
          decisorIcon = '🏬';
        }

        // WhatsApp Link
        let waBtn = '';
        if (lead.phone) {
          let waDigits = lead.phone.replace(/\\D/g, '');
          if (waDigits.length === 10) waDigits = '52' + waDigits;
          const waUrl = \`https://wa.me/\${waDigits}?text=\${encodeURIComponent('Hola, buenas tardes!')}\`;
          waBtn = \`<a href="\${waUrl}" target="_blank" rel="noopener" class="btn btn-wa" title="Enviar WhatsApp al negocio">
            💬 WhatsApp
          </a>\`;
        }

        // Web Tag
        let webBadge = '';
        if (lead.tieneWeb) {
          webBadge = \`<a href="\${escapeHtml(lead.webUrl)}" target="_blank" rel="noopener" class="meta-link" style="color: var(--accent);" title="Abrir web">
            🌐 \${escapeHtml(lead.webType)} ↗
          </a>\`;
        } else {
          webBadge = \`<span style="color: var(--text-dim); font-size: 11px;">⚠️ Sin sitio web (Oportunidad)</span>\`;
        }

        return \`
          <div class="lead-card \${isContacted ? 'is-contacted' : ''}" id="card_\${lead.id}">
            <div class="card-top">
              <div class="card-title-group">
                <span class="lead-category">\${escapeHtml(lead.category)}</span>
                <h4 class="lead-name">\${escapeHtml(lead.name)}</h4>
              </div>
              <div class="score-badge \${scoreClass}" title="Puntuación comercial de interés: \${lead.score}/100">
                <span class="score-num">\${lead.score}</span>
                <span class="score-label">Score</span>
              </div>
            </div>

            <div class="decisor-pill \${decisorClass}">
              <span>\${decisorIcon}</span>
              <span>\${escapeHtml(lead.perfilDecisor)}</span>
            </div>

            <div class="meta-list">
              <div class="meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                \${lead.phone ? \`
                  <a href="tel:\${escapeHtml(lead.phone)}" class="meta-link">\${escapeHtml(lead.phoneDisplay)}</a>
                  <button class="copy-phone-btn" onclick="copyText('\${escapeHtml(lead.phone)}', 'Teléfono copiado')" title="Copiar número">📋</button>
                \` : \`<span style="color: var(--text-dim);">Sin teléfono</span>\`}
              </div>

              <div class="meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>\${escapeHtml(lead.zona)} · \${escapeHtml(lead.municipio)}</span>
              </div>

              <div class="meta-item">
                <span class="rating-badge">★ \${lead.rating > 0 ? lead.rating : 'N/D'}</span>
                <span>(\${lead.numResenas} reseñas)</span>
                <span style="color: var(--text-dim);">·</span>
                \${webBadge}
              </div>
            </div>

            <div class="ai-box">
              <div class="ai-box-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Análisis IA para Contacto Comercial
              </div>
              <p class="ai-line-1">\${escapeHtml(lead.resumenLinea1)}</p>
              <p class="ai-line-2">\${escapeHtml(lead.resumenLinea2)}</p>
            </div>

            <div class="card-actions">
              <a href="\${escapeHtml(lead.mapsUrl)}" target="_blank" rel="noopener" class="btn btn-primary" title="Abrir ficha y ubicación en Google Maps">
                📍 Maps
              </a>
              \${lead.phone ? \`
                <a href="tel:\${escapeHtml(lead.phone)}" class="btn" title="Llamar directamente">
                  📞 Llamar
                </a>
              \` : ''}
              \${waBtn}
            </div>

            <!-- CRM Section -->
            <div class="crm-section">
              <div class="crm-contact-row">
                <label class="crm-checkbox-label" for="chk_\${lead.id}">
                  <input type="checkbox" class="crm-checkbox" id="chk_\${lead.id}" \${isContacted ? 'checked' : ''} onchange="toggleContacted('\${lead.id}', this.checked)">
                  <span class="crm-label">
                    \${isContacted ? '✓ Negocio contactado' : 'Marcar como contactado'}
                  </span>
                </label>
                <span class="crm-timestamp" id="time_\${lead.id}">\${contactDate}</span>
              </div>
              <textarea class="crm-notes-input" id="note_\${lead.id}" placeholder="Notas de contacto (visita presencial, llamada, WhatsApp, quién atendió, objeciones, seguimiento...)" oninput="debouncedSaveNote('\${lead.id}', this.value)">\${escapeHtml(notes)}</textarea>
            </div>
          </div>
        \`;
      }).join('');
    }

    // CRM Actions
    function toggleContacted(id, checked) {
      if (!crmState[id]) crmState[id] = { contacted: false, notes: '', date: '' };
      crmState[id].contacted = checked;
      crmState[id].date = checked ? new Date().toISOString() : '';
      
      saveCrmState();

      const card = document.getElementById(\`card_\${id}\`);
      if (card) {
        card.classList.toggle('is-contacted', checked);
        const label = card.querySelector('.crm-label');
        if (label) label.textContent = checked ? '✓ Negocio contactado' : 'Marcar como contactado';
        const timeEl = document.getElementById(\`time_\${id}\`);
        if (timeEl) {
          timeEl.textContent = checked ? new Date().toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        }
      }

      updateProgress();
      showToast(checked ? 'Negocio marcado como contactado' : 'Contacto desmarcado');
    }

    let noteDebounceTimer = null;
    function debouncedSaveNote(id, text) {
      clearTimeout(noteDebounceTimer);
      noteDebounceTimer = setTimeout(() => {
        if (!crmState[id]) crmState[id] = { contacted: false, notes: '', date: '' };
        crmState[id].notes = text;
        saveCrmState();
        showToast('Nota de contacto guardada');
      }, 400);
    }

    function saveCrmState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(crmState));
      } catch (e) {
        console.error('Storage error:', e);
      }
    }

    function updateProgress() {
      const contactedCount = Object.values(crmState).filter(c => c.contacted).length;
      const total = LEADS_DATA.length;
      const pct = Math.round((contactedCount / total) * 100);
      crmProgressText.textContent = \`\${contactedCount} / \${total} contactados (\${pct}%)\`;
      crmProgressFill.style.width = \`\${pct}%\`;
    }

    // Toast
    let toastTimer = null;
    function showToast(msg) {
      const t = document.getElementById('toastBox');
      document.getElementById('toastMsg').textContent = msg;
      t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        t.classList.remove('show');
      }, 2400);
    }

    // Copy text
    function copyText(text, label) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(label || 'Copiado al portapapeles');
      }).catch(() => {
        showToast('Error al copiar');
      });
    }

    // Export CSV with user notes
    exportCsvBtn.addEventListener('click', () => {
      const headers = [
        'ID', 'Puntuación', 'Nombre', 'Categoría', 'Teléfono', 'Zona', 'Municipio',
        'Valoración', 'Reseñas', 'Tiene Web', 'Enlace Maps', 'Perfil Decisor',
        'Contactado', 'Fecha Contacto', 'Notas de Contacto'
      ];

      const rows = LEADS_DATA.map(l => {
        const crm = crmState[l.id] || {};
        return [
          l.id,
          l.score,
          \`"\${escapeCsv(l.name)}"\`,
          \`"\${escapeCsv(l.category)}"\`,
          \`"\${escapeCsv(l.phoneDisplay)}"\`,
          \`"\${escapeCsv(l.zona)}"\`,
          \`"\${escapeCsv(l.municipio)}"\`,
          l.rating,
          l.numResenas,
          l.tieneWeb ? 'Sí' : 'No',
          \`"\${escapeCsv(l.mapsUrl)}"\`,
          \`"\${escapeCsv(l.perfilDecisor)}"\`,
          crm.contacted ? 'Sí' : 'No',
          \`"\${escapeCsv(crm.date || '')}"\`,
          \`"\${escapeCsv(crm.notes || '')}"\`
        ].join(',');
      });

      const csvBlob = new Blob(['\\uFEFF' + [headers.join(','), ...rows].join('\\r\\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(csvBlob);
      link.download = \`leads_gdl_sur_crm_\${new Date().toISOString().slice(0, 10)}.csv\`;
      link.click();
      showToast('Descargando archivo CSV...');
    });

    // Helper functions
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function escapeCsv(str) {
      if (!str) return '';
      return String(str).replace(/"/g, '""').replace(/\\r?\\n/g, ' ');
    }

    // Initial render
    renderChart();
    renderLeads();
  </script>
</body>
</html>
`;

  fs.writeFileSync(OUTPUT_HTML, html, 'utf-8');
  fs.writeFileSync(OUTPUT_INDEX, html, 'utf-8');
  console.log(`Generated:\n- ${OUTPUT_HTML}\n- ${OUTPUT_INDEX}`);
}

buildHtmlReport();
