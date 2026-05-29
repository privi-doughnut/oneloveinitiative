// ============================================================
// ONE LOVE INITIATIVE — Google Apps Script
// File: apps-script/Code.gs
//
// SETUP (run once, from the OLI Gmail account):
//   1. Open script.google.com → open this project
//   2. Paste this code, replacing all existing code
//   3. Run setScriptSecrets() — copy the INTERNAL_SECRET it logs
//   4. Paste INTERNAL_SECRET and STRIPE_SECRET_KEY into Cloudflare Worker secrets
//   5. Run setup() to install the monthly email trigger
//   6. Deploy → New deployment → Web app
//      Execute as: Me (oneloveinitiative.official@gmail.com)
//      Access: Anyone
//      → copy the /exec URL → paste into APPS_SCRIPT_URL in the Cloudflare Worker
// ============================================================

const SHEET_ID   = '1WvcBt5fhCb7EpO-vg1X8YAcAHv8o2l0Q3eJBJL8xMuw';
const FROM_NAME  = 'One Love Initiative';
const FROM_EMAIL = 'oneloveinitiative.official@gmail.com';
const SITE_URL   = 'https://oneloveinitative.org';
const STRIPE_URL = 'https://donate.stripe.com/3cIcMY53Y81g7MK0hl0kE00';

// GitHub raw base URL for email templates
const TEMPLATE_BASE = 'https://raw.githubusercontent.com/privi-doughnut/oneloveinitiative/main/email-templates/';

// Default values substituted into newsletter templates
const DEFAULTS = {
  KIT_GOAL: '20,000',
  KIT_COUNT: '0',
  VOLUNTEER_COUNT: '0'
};

// ----------------------------------------------------------
// SECRET SETUP — run this function ONCE
// ----------------------------------------------------------
function setScriptSecrets() {
  const props = PropertiesService.getScriptProperties();
  const internalSecret = Utilities.getUuid() + '-' + Utilities.getUuid();
  props.setProperty('INTERNAL_SECRET', internalSecret);
  props.setProperty('HMAC_SECRET', Utilities.getUuid());
  Logger.log('INTERNAL_SECRET (copy to Cloudflare Worker): ' + internalSecret);
  Logger.log('Also set STRIPE_SECRET_KEY via setStripeKey() before using sendPendingThankYous()');
}

// Run this once to store your Stripe secret key securely
function setStripeKey() {
  // Replace the value below with your actual Stripe secret key, then run this function once
  PropertiesService.getScriptProperties().setProperty('STRIPE_SECRET_KEY', 'sk_live_REPLACE_ME');
  Logger.log('Stripe secret key saved.');
}

// Update live kit stats (run this anytime stats change)
function updateStats(kitCount, volunteerCount) {
  const props = PropertiesService.getScriptProperties();
  if (kitCount    !== undefined) props.setProperty('KIT_COUNT', String(kitCount));
  if (volunteerCount !== undefined) props.setProperty('VOLUNTEER_COUNT', String(volunteerCount));
  Logger.log('Stats updated: KIT_COUNT=' + kitCount + ', VOLUNTEER_COUNT=' + volunteerCount);
}

// ----------------------------------------------------------
// TRIGGER SETUP — run once
// ----------------------------------------------------------
function setup() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendMonthlyNewsletter') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendMonthlyNewsletter')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  Logger.log('Monthly newsletter trigger installed: 1st of each month at 9 AM');
}

// ----------------------------------------------------------
// TEMPLATE ENGINE
// ----------------------------------------------------------

// Fetch a random template from a category (welcome|thankyou|newsletter|predrive|postdrive)
// Caches the full list in CacheService for 1 hour to avoid GitHub rate-limits
function getTemplate(category) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'oli_tpl_' + category;
  let templates;

  const cached = cache.get(cacheKey);
  if (cached) {
    templates = JSON.parse(cached);
  } else {
    const url = TEMPLATE_BASE + category + '.json';
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      Logger.log('Failed to fetch template: ' + url + ' → ' + res.getResponseCode());
      return null;
    }
    templates = JSON.parse(res.getContentText('UTF-8'));
    // Cache up to 100KB — if list is larger split or skip caching
    const serialized = JSON.stringify(templates);
    if (serialized.length < 100000) cache.put(cacheKey, serialized, 3600);
  }

  if (!templates || templates.length === 0) return null;
  return templates[Math.floor(Math.random() * templates.length)];
}

// Replace all {{VAR}} placeholders in a string
function fill(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, function(_, key) {
    return (vars[key] !== undefined && vars[key] !== null) ? vars[key] : '';
  });
}

// Build unsubscribe URL for a given email
function unsubUrl(email) {
  return getDeploymentUrl() + '?action=unsubscribe&email=' + encodeURIComponent(email) + '&token=' + makeUnsubToken(email);
}

// Resolve first name (or empty string → 'there')
function firstName(name) {
  return (name || '').split(' ')[0] || 'there';
}

// ----------------------------------------------------------
// HTTP ENTRY POINTS
// ----------------------------------------------------------

function doPost(e) {
  const json = t => ContentService.createTextOutput(JSON.stringify(t)).setMimeType(ContentService.MimeType.JSON);
  let data;
  try { data = JSON.parse(e.postData.contents); } catch(_) { return json({ok: false, error: 'bad json'}); }

  const props = PropertiesService.getScriptProperties();

  if (data.action === 'donation_thanks') {
    if (data.secret !== props.getProperty('INTERNAL_SECRET')) return json({ok: false, error: 'unauthorized'});
    if (!data.email) return json({ok: false, error: 'missing email'});
    sendDonationThanksEmail(data.email, data.name || '', data.amount || '', data.transaction_id || '');
    return json({ok: true});
  }

  // Newsletter subscribe
  const email = (data.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json({ok: false, error: 'invalid email'});
  saveSubscriber(email, data.name || '');
  sendWelcomeEmail(email, data.name || '');
  return json({ok: true});
}

function doGet(e) {
  if (e.parameter.action === 'unsubscribe') {
    const email = (e.parameter.email || '').toLowerCase();
    const token = e.parameter.token || '';
    if (email && token && token === makeUnsubToken(email)) {
      unsubscribeEmail(email);
      return HtmlService.createHtmlOutput(
        '<p style="font-family:sans-serif;padding:40px;text-align:center">' +
        'You\'ve been unsubscribed from One Love Initiative emails.<br><br>' +
        '<a href="' + SITE_URL + '">Return to our website</a></p>'
      );
    }
    return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:40px;text-align:center">Invalid or expired unsubscribe link.</p>');
  }
  return HtmlService.createHtmlOutput('<p>One Love Initiative</p>');
}

// ----------------------------------------------------------
// SUBSCRIBER MANAGEMENT
// ----------------------------------------------------------

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
}

function makeUnsubToken(email) {
  const secret = PropertiesService.getScriptProperties().getProperty('HMAC_SECRET') || 'fallback';
  const raw = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, email, secret);
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').slice(0, 32);
}

function saveSubscriber(email, name) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] || '').toString().toLowerCase() === email) {
      sheet.getRange(i + 1, 3).setValue('subscribed');
      if (name && !data[i][3]) sheet.getRange(i + 1, 4).setValue(name);
      return;
    }
  }
  sheet.appendRow([email, new Date().toISOString(), 'subscribed', name, makeUnsubToken(email)]);
}

function unsubscribeEmail(email) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] || '').toString().toLowerCase() === email) {
      sheet.getRange(i + 1, 3).setValue('unsubscribed');
      return;
    }
  }
}

function getSubscribers() {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  return data.slice(1)
    .filter(row => row[0] && (row[2] === 'subscribed' || row[2] === ''))
    .map(row => ({ email: row[0].toString().toLowerCase(), name: row[3] || '', token: row[4] || makeUnsubToken(row[0]) }));
}

// ----------------------------------------------------------
// EMAIL: WELCOME (sent on subscribe)
// ----------------------------------------------------------

function sendWelcomeEmail(email, name) {
  const tpl = getTemplate('welcome');
  if (!tpl) { Logger.log('No welcome template available — skipping welcome email to ' + email); return; }

  const vars = {
    NAME: firstName(name),
    UNSUBSCRIBE_URL: unsubUrl(email)
  };

  const subject = fill(tpl.subject, vars);
  const html    = fill(tpl.body,    vars);

  GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
}

// ----------------------------------------------------------
// EMAIL: DONATION THANK-YOU (triggered by Stripe webhook)
// ----------------------------------------------------------

function sendDonationThanksEmail(email, name, amount, transactionId) {
  const tpl = getTemplate('thankyou');
  if (!tpl) { Logger.log('No thankyou template — skipping to ' + email); return; }

  const now = new Date();
  const vars = {
    NAME:           firstName(name),
    AMOUNT:         amount ? parseFloat(amount).toFixed(2) : '—',
    DONATION_DATE:  now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    TRANSACTION_ID: transactionId || '—',
    UNSUBSCRIBE_URL: unsubUrl(email)
  };

  const subject = fill(tpl.subject, vars);
  const html    = fill(tpl.body,    vars);

  GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
}

// ----------------------------------------------------------
// EMAIL: MONTHLY NEWSLETTER (auto-triggered on 1st of month)
// ----------------------------------------------------------

function sendMonthlyNewsletter() {
  const now   = new Date();
  const month = now.toLocaleString('default', { month: 'long' });
  const year  = now.getFullYear().toString();
  const subs  = getSubscribers();
  const props = PropertiesService.getScriptProperties();

  if (subs.length === 0) { Logger.log('No subscribers — skipping newsletter'); return; }

  const sharedVars = {
    MONTH:          month,
    YEAR:           year,
    KIT_COUNT:      props.getProperty('KIT_COUNT')      || DEFAULTS.KIT_COUNT,
    VOLUNTEER_COUNT: props.getProperty('VOLUNTEER_COUNT') || DEFAULTS.VOLUNTEER_COUNT,
    KIT_GOAL:       DEFAULTS.KIT_GOAL
  };

  subs.forEach(({ email, name, token }) => {
    const tpl = getTemplate('newsletter');
    if (!tpl) return;

    const vars = Object.assign({}, sharedVars, {
      NAME: firstName(name),
      UNSUBSCRIBE_URL: getDeploymentUrl() + '?action=unsubscribe&email=' + encodeURIComponent(email) + '&token=' + token
    });

    const subject = fill(tpl.subject, vars);
    const html    = fill(tpl.body,    vars);

    try {
      GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
      Utilities.sleep(500);
    } catch(err) {
      Logger.log('Failed to send to ' + email + ': ' + err);
    }
  });

  Logger.log('Monthly newsletter sent to ' + subs.length + ' subscribers (' + month + ' ' + year + ')');
}

// ----------------------------------------------------------
// EMAIL: PRE-DRIVE ANNOUNCEMENT
// Send to all subscribers before a drive.
// Usage: call sendPreDriveAnnouncement("Children's Kit Drive","June 15, 2025","Harris Teeter SouthPark")
// ----------------------------------------------------------

function sendPreDriveAnnouncement(driveName, driveDate, driveLocation) {
  const subs = getSubscribers();
  if (subs.length === 0) { Logger.log('No subscribers'); return; }

  subs.forEach(({ email, name, token }) => {
    const tpl = getTemplate('predrive');
    if (!tpl) return;

    const vars = {
      NAME:           firstName(name),
      DRIVE_NAME:     driveName,
      DRIVE_DATE:     driveDate,
      DRIVE_LOCATION: driveLocation,
      UNSUBSCRIBE_URL: getDeploymentUrl() + '?action=unsubscribe&email=' + encodeURIComponent(email) + '&token=' + token
    };

    const subject = fill(tpl.subject, vars);
    const html    = fill(tpl.body,    vars);

    try {
      GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
      Utilities.sleep(500);
    } catch(err) {
      Logger.log('Failed pre-drive email to ' + email + ': ' + err);
    }
  });

  Logger.log('Pre-drive emails sent to ' + subs.length + ' subscribers for ' + driveName);
}

// ----------------------------------------------------------
// EMAIL: POST-DRIVE RECAP
// Send to all subscribers after a drive with results.
// Usage: call sendPostDriveRecap("Children's Kit Drive","June 15, 2025","Harris Teeter SouthPark","312","24")
// ----------------------------------------------------------

function sendPostDriveRecap(driveName, driveDate, driveLocation, kitsCollected, volunteerCount) {
  const subs = getSubscribers();
  if (subs.length === 0) { Logger.log('No subscribers'); return; }

  subs.forEach(({ email, name, token }) => {
    const tpl = getTemplate('postdrive');
    if (!tpl) return;

    const vars = {
      NAME:            firstName(name),
      DRIVE_NAME:      driveName,
      DRIVE_DATE:      driveDate,
      DRIVE_LOCATION:  driveLocation,
      KITS_COLLECTED:  kitsCollected,
      VOLUNTEER_COUNT: volunteerCount,
      UNSUBSCRIBE_URL: getDeploymentUrl() + '?action=unsubscribe&email=' + encodeURIComponent(email) + '&token=' + token
    };

    const subject = fill(tpl.subject, vars);
    const html    = fill(tpl.body,    vars);

    try {
      GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
      Utilities.sleep(500);
    } catch(err) {
      Logger.log('Failed post-drive email to ' + email + ': ' + err);
    }
  });

  Logger.log('Post-drive recap emails sent to ' + subs.length + ' subscribers for ' + driveName);
}

// ----------------------------------------------------------
// STRIPE CATCH-UP: send thank-you emails to all past donors
// who haven't received one yet.
//
// Prerequisite: run setStripeKey() once with your Stripe secret key.
// Then call sendPendingThankYous() from the Apps Script editor.
//
// Tracks sent payments in script properties (key: 'THANKED_IDS') as
// a JSON array of Stripe charge/payment_intent IDs.
// ----------------------------------------------------------

function sendPendingThankYous() {
  const props = PropertiesService.getScriptProperties();
  const stripeKey = props.getProperty('STRIPE_SECRET_KEY');
  if (!stripeKey || stripeKey === 'sk_live_REPLACE_ME') {
    Logger.log('ERROR: Set your Stripe secret key first by running setStripeKey()');
    return;
  }

  // Load set of already-thanked payment IDs
  let thankedIds;
  try { thankedIds = new Set(JSON.parse(props.getProperty('THANKED_IDS') || '[]')); }
  catch(_) { thankedIds = new Set(); }

  let newCount = 0;
  let startingAfter = null;
  let hasMore = true;

  while (hasMore) {
    // Fetch a page of charges from Stripe
    let url = 'https://api.stripe.com/v1/charges?limit=100&expand[]=data.payment_intent';
    if (startingAfter) url += '&starting_after=' + startingAfter;

    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + stripeKey },
      muteHttpExceptions: true
    });

    if (res.getResponseCode() !== 200) {
      Logger.log('Stripe API error: ' + res.getResponseCode() + ' ' + res.getContentText());
      break;
    }

    const page = JSON.parse(res.getContentText());
    hasMore = page.has_more;

    for (const charge of (page.data || [])) {
      // Only process successful charges with an email
      if (charge.status !== 'succeeded') continue;
      const email = charge.billing_details && charge.billing_details.email;
      if (!email) continue;

      const chargeId = charge.id;
      if (thankedIds.has(chargeId)) continue; // already sent

      const name   = (charge.billing_details && charge.billing_details.name) || '';
      const amount = charge.amount ? (charge.amount / 100).toFixed(2) : '';
      const txId   = chargeId;

      sendDonationThanksEmail(email, name, amount, txId);
      thankedIds.add(chargeId);
      newCount++;
      Logger.log('Thank-you sent to ' + email + ' for charge ' + chargeId + ' ($' + amount + ')');
      Utilities.sleep(800); // Gmail rate limit buffer
    }

    if (hasMore && page.data && page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }

  // Persist updated set
  props.setProperty('THANKED_IDS', JSON.stringify([...thankedIds]));
  Logger.log('sendPendingThankYous complete — sent ' + newCount + ' new thank-you emails');
}

// ----------------------------------------------------------
// UTILITY
// ----------------------------------------------------------

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getDeploymentUrl() {
  return ScriptApp.getService().getUrl();
}
