const logger = require('./logger');

function hasLinkedInEnrichment() {
  return Boolean(process.env.PROXYCURL_API_KEY);
}

function normalizeLinkedInUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  return `https://${raw}`;
}

async function enrichLinkedInProfile(linkedInUrl, correlationId) {
  if (!hasLinkedInEnrichment()) {
    return null;
  }

  const profileUrl = normalizeLinkedInUrl(linkedInUrl);
  if (!profileUrl) {
    return null;
  }

  const url = new URL('https://nubela.co/proxycurl/api/v2/linkedin');
  url.searchParams.set('url', profileUrl);
  url.searchParams.set('fallback_to_cache', 'on-error');
  url.searchParams.set('use_cache', 'if-present');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn('LinkedIn enrichment failed', {
      correlationId,
      status: response.status,
      body: body.slice(0, 200),
    });
    return null;
  }

  const payload = await response.json();
  return {
    fullName: payload.full_name || '',
    headline: payload.headline || '',
    occupation: payload.occupation || '',
    city: payload.city || '',
    country: payload.country_full_name || '',
    profilePictureUrl: payload.profile_pic_url || '',
    summary: payload.summary || '',
    experiences: Array.isArray(payload.experiences) ? payload.experiences : [],
    education: Array.isArray(payload.education) ? payload.education : [],
  };
}

module.exports = {
  hasLinkedInEnrichment,
  normalizeLinkedInUrl,
  enrichLinkedInProfile,
};
