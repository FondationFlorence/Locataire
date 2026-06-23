/**
 * Commune rules engine — the regulatory knowledge base.
 *
 * Encodes, per commune, the rules that matter for a meublé de tourisme:
 * day cap for a résidence principale, whether a registration number is
 * required, whether a résidence secondaire needs a changement d'usage /
 * authorisation, and whether a compensation rule applies.
 *
 * IMPORTANT: this data is INDICATIVE and meant to drive the compliance
 * dashboard — it is not legal advice. Rules evolve commune by commune; the
 * `lastReviewed` field tracks when each entry was last checked.
 */

// National baseline (Code du tourisme): a résidence principale may be rented
// as a meublé de tourisme up to 120 days/year.
const NATIONAL_DAY_CAP = 120;

const COMMUNES = {
  paris: {
    key: 'paris', label: 'Paris', dept: '75',
    dayCapPrincipale: 90,
    registrationRequired: true,
    changementUsageSecondaire: true,
    compensation: true,
    note: 'Zone très tendue : plafond abaissé à 90 jours, numéro d’enregistrement obligatoire, et changement d’usage avec compensation pour toute résidence secondaire.',
    lastReviewed: '2026-06',
  },
  lyon: {
    key: 'lyon', label: 'Lyon', dept: '69',
    dayCapPrincipale: 90,
    registrationRequired: true,
    changementUsageSecondaire: true,
    compensation: true,
    note: 'Zone tendue : plafond résidence principale ramené à 90 jours, enregistrement obligatoire et changement d’usage pour les résidences secondaires.',
    lastReviewed: '2026-06',
  },
  bordeaux: {
    key: 'bordeaux', label: 'Bordeaux', dept: '33',
    dayCapPrincipale: 120,
    registrationRequired: true,
    changementUsageSecondaire: true,
    compensation: true,
    note: 'Enregistrement obligatoire ; changement d’usage avec compensation renforcée selon le secteur pour les résidences secondaires.',
    lastReviewed: '2026-06',
  },
  nice: {
    key: 'nice', label: 'Nice', dept: '06',
    dayCapPrincipale: 120,
    registrationRequired: true,
    changementUsageSecondaire: true,
    compensation: false,
    note: 'Enregistrement obligatoire ; autorisation de changement d’usage exigée pour les résidences secondaires dans plusieurs secteurs.',
    lastReviewed: '2026-06',
  },
  marseille: {
    key: 'marseille', label: 'Marseille', dept: '13',
    dayCapPrincipale: 120,
    registrationRequired: true,
    changementUsageSecondaire: true,
    compensation: false,
    note: 'Enregistrement obligatoire ; changement d’usage requis pour les résidences secondaires selon le secteur.',
    lastReviewed: '2026-06',
  },
  'pays-basque': {
    key: 'pays-basque', label: 'Pays Basque', dept: '64',
    dayCapPrincipale: 120,
    registrationRequired: true,
    changementUsageSecondaire: true,
    compensation: true,
    note: 'Compensation stricte dans les 24 communes tendues de l’agglomération : toute mise en location secondaire suppose une autorisation.',
    lastReviewed: '2026-06',
  },
};

// Fallback for a commune we don't model yet: keep the national cap and flag
// the unknowns so the user knows to verify with the mairie.
function fallback(label) {
  return {
    key: 'autre', label: label || 'Autre commune', dept: '',
    dayCapPrincipale: NATIONAL_DAY_CAP,
    registrationRequired: true,
    changementUsageSecondaire: true,
    compensation: false,
    note: 'Commune non encore modélisée par Regloo : règles nationales appliquées par défaut. Vérifiez les obligations locales auprès de la mairie.',
    modelled: false,
    lastReviewed: null,
  };
}

function get(key) {
  if (key && COMMUNES[key]) return { ...COMMUNES[key], modelled: true };
  return fallback();
}

// Communes offered in the property form (modelled ones + an "autre" option).
function options() {
  return Object.values(COMMUNES).map((c) => ({ key: c.key, label: c.label }));
}

module.exports = { COMMUNES, NATIONAL_DAY_CAP, get, options, fallback };
