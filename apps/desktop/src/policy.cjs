const PORTAL = 'https://app.carebora.co.ke';

function isPortalURL(value) {
  try { const u = new URL(value); return u.origin === PORTAL && !u.username && !u.password; }
  catch { return false; }
}

function notificationURL(link) {
  if (typeof link !== 'string' || !link.startsWith('/') || link.startsWith('//')) return `${PORTAL}/appointments`;
  const url = new URL(link, PORTAL);
  return isPortalURL(url.href) ? url.href : `${PORTAL}/appointments`;
}

function mayOpenExternally(value) {
  try { const u = new URL(value); return ['https:', 'mailto:', 'tel:'].includes(u.protocol) && !u.username && !u.password; }
  catch { return false; }
}

/** Only operational messages; never place patient names or clinical content on the desktop. */
function alertTitle(type) {
  return ({
    service_requested: 'New service request — check your admin portal',
    appointment_requested: 'Appointment request — check your portal to confirm',
    appointment_booked: 'New appointment — check your portal',
    consultation_started: 'Your provider has joined — open your consultation',
  })[type] ?? null;
}

module.exports = { PORTAL, isPortalURL, notificationURL, mayOpenExternally, alertTitle };
