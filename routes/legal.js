/**
 * Legal pages — /mentions-legales, /confidentialite, /cgv.
 *
 * All three render the same `legal.ejs` template with different content.
 * Content uses [À COMPLÉTER] placeholders where company-specific details
 * (legal name, SIREN, host, etc.) must be filled in before publishing.
 */
const express = require('express');
const { SITE, pageContext } = require('../lib/site');

const router = express.Router();

const DOCS = {
  'mentions-legales': {
    title: 'Mentions légales',
    intro: `Conformément aux dispositions des articles 6-III et 19 de la loi pour la Confiance dans l’Économie Numérique, voici les informations légales du site ${SITE.name}.`,
    sections: [
      {
        h: 'Éditeur du site',
        p: [
          `Le site ${SITE.domain} est édité par ${SITE.legalName}, [À COMPLÉTER : forme juridique] au capital de [À COMPLÉTER] €.`,
          'Siège social : [À COMPLÉTER : adresse].',
          'SIREN / RCS : [À COMPLÉTER]. N° de TVA intracommunautaire : [À COMPLÉTER].',
          `Contact : ${SITE.email}.`,
          'Directeur de la publication : [À COMPLÉTER].',
        ],
      },
      {
        h: 'Hébergement',
        p: [
          'Le site est hébergé par [À COMPLÉTER : nom de l’hébergeur], [À COMPLÉTER : adresse de l’hébergeur].',
        ],
      },
      {
        h: 'Propriété intellectuelle',
        p: [
          `L’ensemble des contenus présents sur ${SITE.domain} (textes, visuels, logo, code) est la propriété de ${SITE.legalName}, sauf mention contraire. Toute reproduction sans autorisation est interdite.`,
        ],
      },
    ],
  },
  'confidentialite': {
    title: 'Politique de confidentialité',
    intro: `${SITE.legalName} accorde une importance particulière à la protection de vos données personnelles, dans le respect du Règlement Général sur la Protection des Données (RGPD).`,
    sections: [
      {
        h: 'Données collectées',
        p: [
          'Nous collectons les données que vous nous transmettez (email de contact, informations de facturation) ainsi que les données strictement nécessaires au fonctionnement du service.',
          'Les paiements sont traités par Stripe ; vos données bancaires ne transitent jamais par nos serveurs.',
        ],
      },
      {
        h: 'Finalités',
        p: [
          'Les données sont utilisées pour fournir le service, gérer la facturation, répondre à vos demandes et améliorer la plateforme. Elles ne sont jamais revendues.',
        ],
      },
      {
        h: 'Vos droits',
        p: [
          `Vous disposez d’un droit d’accès, de rectification, d’effacement et de portabilité de vos données. Pour l’exercer, écrivez à ${SITE.email}.`,
          'Vous pouvez également introduire une réclamation auprès de la CNIL.',
        ],
      },
    ],
  },
  'cgv': {
    title: 'Conditions générales de vente',
    intro: `Les présentes conditions régissent l’abonnement au service ${SITE.name}.`,
    sections: [
      {
        h: 'Abonnement',
        p: [
          'Le service est proposé sous forme d’abonnement mensuel sans engagement de durée, facturé d’avance. La facturation annuelle est disponible sur demande.',
          'L’abonnement est résiliable à tout moment ; le service reste actif jusqu’à la fin de la période en cours.',
        ],
      },
      {
        h: 'Tarifs et paiement',
        p: [
          'Les tarifs en vigueur sont indiqués sur la page Tarifs. Le paiement s’effectue par carte via Stripe.',
          `${SITE.legalName} se réserve le droit de modifier ses tarifs ; toute évolution est communiquée avant son entrée en vigueur.`,
        ],
      },
      {
        h: 'Responsabilité',
        p: [
          `${SITE.name} est un outil d’aide à la conformité. Il ne se substitue pas à un conseil juridique. La responsabilité finale du respect des obligations réglementaires incombe à l’utilisateur.`,
        ],
      },
    ],
  },
};

for (const [slug, doc] of Object.entries(DOCS)) {
  router.get(`/${slug}`, (_req, res) => {
    res.render('legal', pageContext({
      title: `${doc.title} — ${SITE.name}`,
      description: doc.intro,
      canonical: `/${slug}`,
      pageCss: 'legal.css',
      doc,
    }));
  });
}

module.exports = router;
module.exports.DOCS = DOCS;
