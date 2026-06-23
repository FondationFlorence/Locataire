/**
 * Compliance engine — turns a property's data + its commune rules into a
 * status, a list of checks, day metrics, and actionable alerts.
 *
 * This is the product core: the logic that tells an operator whether each
 * lot is en règle, and what to do next. It is deterministic and testable.
 */
const communes = require('./communes');

const RANK = { ok: 0, attention: 1, critique: 2 };
const DPE_VALIDITY_YEARS = 10;
const DPE_WARN_DAYS = 180;

function worst(a, b) { return RANK[b] > RANK[a] ? b : a; }

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.round((d - new Date()) / 86400000);
}

/**
 * Evaluate a single property. Returns { status, checks[], days, alerts[] }.
 */
function evaluate(property) {
  const rules = communes.get(property.commune);
  const checks = [];

  // ── Day cap (résidence principale only) ──
  let days = null;
  if (property.type === 'principale') {
    const cap = rules.dayCapPrincipale;
    const rented = Number(property.daysRented) || 0;
    const remaining = cap - rented;
    const ratio = cap > 0 ? rented / cap : 0;
    let status = 'ok';
    if (rented >= cap) status = 'critique';
    else if (ratio >= 0.9) status = 'attention';
    days = { cap, rented, remaining, ratio, status };
    checks.push({
      id: 'days',
      label: `Plafond ${cap} jours`,
      status,
      detail:
        status === 'critique'
          ? `Plafond atteint : ${rented} / ${cap} jours loués cette année. Toute nuit supplémentaire vous expose à une sanction.`
          : status === 'attention'
            ? `Seuil proche : ${rented} / ${cap} jours (${remaining} restants). Surveillez de près.`
            : `${rented} / ${cap} jours loués — ${remaining} jours encore disponibles.`,
      action: status === 'ok' ? null : 'Bloquez les nuits restantes sur vos plateformes',
    });
  } else {
    // Résidence secondaire : pas de plafond de jours, mais changement d'usage.
    if (rules.changementUsageSecondaire) {
      const ok = !!property.changementUsage;
      checks.push({
        id: 'changement-usage',
        label: 'Changement d’usage',
        status: ok ? 'ok' : 'critique',
        detail: ok
          ? 'Autorisation de changement d’usage obtenue.'
          : `Résidence secondaire à ${rules.label} : une autorisation de changement d’usage${rules.compensation ? ' avec compensation' : ''} est requise et n’est pas renseignée.`,
        action: ok ? null : 'Déposez une demande de changement d’usage en mairie',
      });
    }
  }

  // ── Numéro d'enregistrement ──
  if (rules.registrationRequired) {
    const has = property.registrationNumber && String(property.registrationNumber).trim().length > 0;
    checks.push({
      id: 'registration',
      label: 'Numéro d’enregistrement',
      status: has ? 'ok' : 'critique',
      detail: has
        ? `Déclaré : ${property.registrationNumber}. Doit figurer sur chaque annonce.`
        : `${rules.label} impose un numéro d’enregistrement (déclaration en mairie). Aucun numéro renseigné.`,
      action: has ? null : 'Déclarez le meublé en mairie pour obtenir le numéro',
    });
  }

  // ── DPE ──
  const dpe = (property.dpeClass || '').toUpperCase();
  if (!dpe) {
    checks.push({ id: 'dpe', label: 'DPE', status: 'attention', detail: 'Aucun DPE renseigné. Il peut être exigé par les plateformes et la mairie.', action: 'Renseignez le DPE du logement' });
  } else {
    let status = 'ok';
    let detail = `Classe ${dpe}.`;
    let action = null;
    if (dpe === 'G') { status = 'critique'; detail = `Classe G (passoire thermique) : la location est progressivement interdite. Mise en conformité nécessaire.`; action = 'Planifiez des travaux ou un nouveau DPE'; }
    else if (dpe === 'F') { status = 'attention'; detail = `Classe F : logement énergivore, restrictions à venir.`; action = 'Anticipez la rénovation énergétique'; }
    const left = daysUntil(addYears(property.dpeDate, DPE_VALIDITY_YEARS));
    if (property.dpeDate && left !== null) {
      if (left < 0) { status = worst(status, 'critique'); detail += ` DPE expiré.`; action = 'Faites établir un nouveau DPE'; }
      else if (left <= DPE_WARN_DAYS) { status = worst(status, 'attention'); detail += ` DPE valable encore ${left} jours.`; action = action || 'Renouvelez le DPE avant expiration'; }
    }
    checks.push({ id: 'dpe', label: 'DPE', status, detail, action });
  }

  // ── Overall + alerts ──
  const status = checks.reduce((acc, c) => worst(acc, c.status), 'ok');
  const alerts = checks
    .filter((c) => c.status !== 'ok')
    .map((c) => ({
      severity: c.status,
      label: c.label,
      message: c.detail,
      action: c.action,
      propertyId: property.id,
      propertyName: property.name,
      communeLabel: rules.label,
    }));

  return { status, checks, days, alerts, rules };
}

function addYears(dateStr, years) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * Summarise a list of { property, evaluation } into portfolio KPIs.
 */
function summarize(evaluations) {
  const summary = { total: evaluations.length, ok: 0, attention: 0, critique: 0, alerts: 0 };
  for (const e of evaluations) {
    summary[e.status] = (summary[e.status] || 0) + 1;
    summary.alerts += e.alerts.length;
  }
  return summary;
}

const STATUS_LABEL = { ok: 'Conforme', attention: 'À surveiller', critique: 'Action requise' };

module.exports = { evaluate, summarize, STATUS_LABEL, worst };
