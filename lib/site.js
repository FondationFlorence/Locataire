/**
 * Central site configuration — single source of truth for branding.
 *
 * Everything brand-specific (name, domain, contact email, tagline) lives here
 * so a rebrand is a one-file change. Views receive this object as `site` and
 * read `<%= site.name %>`, `<%= site.email %>`, etc.
 */
const SITE = {
  name: 'Regloo',
  // Legal entity name shown on legal pages — replace with the registered name.
  legalName: 'Regloo',
  domain: 'regloo.fr',
  url: 'https://regloo.fr',
  email: 'contact@regloo.fr',
  tagline: 'Conformité · Meublés de tourisme',
  description:
    'Orchestrateur de conformité pour la location courte durée en France : ' +
    "règles communales, plafond 90/120 jours, déclaration Declaloc, DPE et taxes de séjour — réunis en un seul outil.",
};

/**
 * Builds the locals passed to a view render. Always injects `site` and the
 * current `year`; merge in page-specific values (title, description, etc.).
 */
function pageContext(overrides = {}) {
  return {
    site: SITE,
    year: new Date().getFullYear(),
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    canonical: '/',
    pageCss: null,
    navActive: '',
    // Privacy-friendly web analytics (Umami), off unless both env vars are set.
    analytics: {
      umami: {
        websiteId: process.env.UMAMI_WEBSITE_ID || null,
        src: process.env.UMAMI_SRC || null,
      },
    },
    ...overrides,
  };
}

module.exports = { SITE, pageContext };
