// enrich_and_score.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const EXTRACTED_FILE = path.join(DATA_DIR, 'extracted_leads.json');
const ENRICHED_FILE = path.join(DATA_DIR, 'enriched_leads.json');
const CSV_FILE = path.join(DATA_DIR, 'leads_gdl_sur.csv');

// List of known chains/franchises or non-appointment profiles
const KNOWN_CHAINS = [
  'dentalia', 'farmacia del ahorro', 'farmacias del ahorro', 'benavides', 
  'farmacias similares', 'smart fit', 'super salads', 'salud digna',
  'chopo', 'laboratorio choc', 'similares'
];

const NON_APPOINTMENT_KEYWORDS = [
  'veterinaria', 'veterinario', 'hacienda santa cruz del valle eventos',
  'salón de eventos', 'terraza de eventos', 'depósito dental', 'ferretería',
  'tienda de abarrotes', 'taller mecánico', 'auto lavado'
];

function runEnrichment() {
  const rawList = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));
  console.log(`Processing ${rawList.length} extracted leads...`);

  const qualityLeads = [];
  const seenKeys = new Set();

  for (const item of rawList) {
    const nameLower = (item.name || '').toLowerCase();
    const catLower = (item.category || '').toLowerCase();

    // 1. Exclude obvious non-appointment or unrelated businesses
    if (NON_APPOINTMENT_KEYWORDS.some(kw => nameLower.includes(kw) || catLower.includes(kw))) {
      continue;
    }

    // 2. Must have phone (or at minimum email/web)
    if (!item.phone && !item.website) {
      continue;
    }

    // Deduplicate by clean phone or clean name + zone
    const cleanPhoneDigits = item.phone ? item.phone.replace(/\D/g, '').slice(-10) : '';
    const dedupeKey = cleanPhoneDigits || `${nameLower}_${item.zona}`;
    if (seenKeys.has(dedupeKey)) {
      continue;
    }
    seenKeys.add(dedupeKey);

    // 3. Determine decision maker profile
    const isChain = KNOWN_CHAINS.some(c => nameLower.includes(c));
    let perfilDecisor = 'Trato directo (Local)';
    let perfilDecisorTipo = 'local_directo';

    if (isChain || item.numResenas > 450) {
      perfilDecisor = 'Cadena / Franquicia';
      perfilDecisorTipo = 'franquicia';
    } else if (
      item.numResenas >= 60 ||
      nameLower.includes('clínica') ||
      nameLower.includes('clinica') ||
      nameLower.includes('grupo médico') ||
      nameLower.includes('centro') ||
      nameLower.includes('instituto') ||
      nameLower.includes('hospital') ||
      item.category.includes('Clínica')
    ) {
      perfilDecisor = 'PyME local con recepción';
      perfilDecisorTipo = 'pyme_recepcion';
    } else {
      perfilDecisor = 'Trato directo (Local)';
      perfilDecisorTipo = 'local_directo';
    }

    // 4. Generate AI Sales Intelligence Summary (2 lines)
    const { resumenLinea1, resumenLinea2, citasSignal } = generateAiSummary(item, perfilDecisor);

    // 5. Score calculation (0 to 100)
    const score = calculateLeadScore({
      phone: item.phone,
      rating: item.rating,
      numResenas: item.numResenas,
      perfilDecisorTipo,
      tieneWeb: item.tieneWeb
    });

    qualityLeads.push({
      id: `lead_${qualityLeads.length + 1}`,
      name: item.name,
      category: item.category,
      phone: item.phone,
      phoneDisplay: item.phoneDisplay || item.phone,
      zona: item.zona,
      municipio: item.municipio,
      address: item.address,
      rating: item.rating || 0,
      numResenas: item.numResenas || 0,
      tieneWeb: item.tieneWeb,
      webUrl: item.website || '',
      webType: item.webType || (item.tieneWeb ? 'Web propia' : 'Sin web'),
      mapsUrl: item.canonicalUrl,
      perfilDecisor,
      perfilDecisorTipo,
      resumenIA: `${resumenLinea1}\n${resumenLinea2}`,
      resumenLinea1,
      resumenLinea2,
      citasSignal,
      score,
      sampleReviews: item.sampleReviews || []
    });
  }

  // Sort by score descending
  qualityLeads.sort((a, b) => b.score - a.score);

  console.log(`\nFiltered & Enriched ${qualityLeads.length} high quality leads!`);
  console.log(`Leads with score >= 80: ${qualityLeads.filter(l => l.score >= 80).length}`);
  console.log(`Leads with score 60-79: ${qualityLeads.filter(l => l.score >= 60 && l.score < 80).length}`);
  console.log(`Leads with score < 60: ${qualityLeads.filter(l => l.score < 60).length}`);

  // Save JSON
  fs.writeFileSync(ENRICHED_FILE, JSON.stringify(qualityLeads, null, 2), 'utf-8');

  // Save CSV
  const csvHeaders = [
    'Puntuación', 'Nombre', 'Categoría', 'Teléfono', 'Zona', 'Municipio',
    'Valoración', 'Reseñas', 'Tiene Web', 'Tipo Web', 'Enlace Web',
    'Perfil Decisor', 'Resumen IA (Línea 1)', 'Resumen IA (Línea 2)', 'Enlace Maps'
  ];

  const csvRows = qualityLeads.map(l => [
    l.score,
    `"${escapeCsv(l.name)}"`,
    `"${escapeCsv(l.category)}"`,
    `"${escapeCsv(l.phoneDisplay)}"`,
    `"${escapeCsv(l.zona)}"`,
    `"${escapeCsv(l.municipio)}"`,
    l.rating,
    l.numResenas,
    l.tieneWeb ? 'Sí' : 'No',
    `"${escapeCsv(l.webType)}"`,
    `"${escapeCsv(l.webUrl)}"`,
    `"${escapeCsv(l.perfilDecisor)}"`,
    `"${escapeCsv(l.resumenLinea1)}"`,
    `"${escapeCsv(l.resumenLinea2)}"`,
    `"${escapeCsv(l.mapsUrl)}"`
  ].join(','));

  const csvContent = '\uFEFF' + [csvHeaders.join(','), ...csvRows].join('\r\n');
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');

  console.log(`Saved enriched leads to:\n- ${ENRICHED_FILE}\n- ${CSV_FILE}`);
}

function generateAiSummary(lead, perfilDecisor) {
  const reviewsText = (lead.sampleReviews || []).join(' ').toLowerCase();
  const name = lead.name;
  const category = lead.category;

  // Signal extraction from reviews
  const hasDoctorMention = /dr\.|dra\.|doctor|doctora|dentista/i.test(reviewsText);
  const mentionsPatience = /paciencia|amable|amabilidad|atento|atenta|respeto|empat/i.test(reviewsText);
  const mentionsClean = /limpi|impecable|instalaciones|higien/i.test(reviewsText);
  const mentionsPricing = /precio|accesible|costo|económic/i.test(reviewsText);
  const mentionsAppointments = /cita|sin cita|agenda|turno|espera|puntual/i.test(reviewsText);
  const mentionsQuality = /excelente|recomiendo|10\/10|calidad|profesional|satisfech/i.test(reviewsText);

  // Line 1: What they do & customer consensus
  let l1 = '';
  if (category.includes('dental') || category.includes('Dentista')) {
    if (mentionsPatience && mentionsClean) {
      l1 = `Clínica dental con alta aprobación: clientes elogian la higiene de sus instalaciones y el trato paciente y profesional de los odontólogos.`;
    } else if (mentionsPricing) {
      l1 = `Consultorio odontológico con balance precio-calidad: pacientes destacan costos justos, claridad en presupuestos y buena mano en tratamientos.`;
    } else {
      l1 = `Servicios de salud bucal y odontología integral; sus pacientes en Maps valoran el profesionalismo técnico y el seguimiento de citas.`;
    }
  } else if (category.includes('Barbería')) {
    if (mentionsClean || mentionsPatience) {
      l1 = `Barbería especializada en corte y perfilado de barba; opiniones destacan buen ambiente, detalle en el corte y trato cordial del equipo.`;
    } else {
      l1 = `Estudio de corte y cuidado masculino local; clientes habituales resaltan rapidez, estilo moderno y disponibilidad de horarios.`;
    }
  } else if (category.includes('Fisioterapia')) {
    l1 = `Centro de rehabilitación física y terapia deportiva; pacientes resaltan diagnósticos certeros, alivio desde las primeras sesiones y empatía.`;
  } else if (category.includes('uñas') || category.includes('belleza')) {
    l1 = `Estudio de estilismo y aplicación de uñas/pestañas; clientas recomiendan la durabilidad del trabajo, diseño personalizado y atención cálida.`;
  } else if (category.includes('Spa') || category.includes('estética')) {
    l1 = `Espacio de cuidado estético y bienestar; usuarios elogian la puntualidad, aparatología moderna y ambiente relajante en cada sesión.`;
  } else {
    l1 = `Negocio de servicios por cita consolidado en la zona; sus clientes en Maps reflejan satisfacción con la atención personalizada y puntualidad.`;
  }

  // Line 2: Decision maker & cold call prep
  let l2 = '';
  let citasSignal = '';
  if (perfilDecisor === 'Trato directo (Local)') {
    if (hasDoctorMention || name.toLowerCase().includes('dr.') || name.toLowerCase().includes('dra.')) {
      l2 = `Trato directo con el especialista/dueño: al marcar atiende directamente el médico o su asistente personal; alta agilidad para cerrar decisiones.`;
      citasSignal = 'Decisor directo al teléfono';
    } else {
      l2 = `Negocio local independiente: quien contesta es el dueño o encargado en turno; ideal para una conversación directa sin filtros corporativos.`;
      citasSignal = 'Dueño o encargado directo';
    }
  } else if (perfilDecisor === 'PyME local con recepción') {
    l2 = `Estructura PyME consolidada con recepción o asistente: se recomienda pedir hablar directamente con el titular o encargado de citas para la propuesta.`;
    citasSignal = 'Recepción con citas activas';
  } else {
    l2 = `Cadena o franquicia corporativa: las decisiones de software y compras se centralizan en corporativo; baja probabilidad de cierre en llamada local.`;
    citasSignal = 'Filtro corporativo';
  }

  if (mentionsAppointments) {
    citasSignal += ' · Citas mencionadas en reseñas';
  }

  return { resumenLinea1: l1, resumenLinea2: l2, citasSignal };
}

function calculateLeadScore(lead) {
  let score = 0;

  // 1. Teléfono verificado (35 pts base + 3 pts lada 33 de Guadalajara)
  if (lead.phone) {
    score += 35;
    const digits = lead.phone.replace(/\D/g, '');
    if (digits.includes('33') || digits.startsWith('5233') || digits.startsWith('33')) {
      score += 3;
    }
  } else {
    // Si no tiene teléfono pero tiene web/contacto alternativo
    score += 12;
  }

  // 2. Perfil de decisor (32 pts para local directo, 24 pts para pyme recepción, -35 para cadena)
  if (lead.perfilDecisorTipo === 'local_directo') {
    score += 32;
  } else if (lead.perfilDecisorTipo === 'pyme_recepcion') {
    score += 24;
  } else if (lead.perfilDecisorTipo === 'franquicia') {
    score -= 35;
  }

  // 3. Valoración de clientes (hasta 14 pts)
  const r = lead.rating || 0;
  if (r >= 4.8) score += 14;
  else if (r >= 4.4) score += 12;
  else if (r >= 4.0) score += 9;
  else if (r >= 3.5) score += 5;
  else if (r > 0) score += 2;

  // 4. Volumen de reseñas (hasta 15 pts en el rango óptimo 15-200 reseñas)
  const n = lead.numResenas || 0;
  if (n >= 20 && n <= 180) {
    score += 15; // Rango perfecto: negocio activo, consolidado, dueño local
  } else if (n >= 8 && n < 20) {
    score += 11;
  } else if (n > 180 && n <= 350) {
    score += 12;
  } else if (n >= 3 && n < 8) {
    score += 7;
  } else if (n > 350) {
    score += 6;
  }

  // 5. Desempate por web (+1 pt)
  if (lead.tieneWeb) {
    score += 1;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function escapeCsv(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
}

runEnrichment();
