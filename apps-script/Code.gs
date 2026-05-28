// ============================================================
// ONE LOVE INITIATIVE — Google Apps Script
// File: apps-script/Code.gs
//
// SETUP (run once, from the OLI Gmail account):
//   1. Open script.google.com → open this project
//   2. Paste this code, replacing all existing code
//   3. Run setScriptSecrets() to set the internal secret
//   4. Run setup() to install the monthly email trigger
//   5. Deploy → New deployment → Web app
//      Execute as: Me (oneloveinitiative.official@gmail.com)
//      Access: Anyone
//      → copy the /exec URL and paste into APPS_SCRIPT_URL in the Cloudflare Worker
// ============================================================

const SHEET_ID   = '1WvcBt5fhCb7EpO-vg1X8YAcAHv8o2l0Q3eJBJL8xMuw';
const FROM_NAME  = 'One Love Initiative';
const FROM_EMAIL = 'oneloveinitiative.official@gmail.com';
const SITE_URL   = 'https://oneloveinitative.org';
const STRIPE_URL = 'https://donate.stripe.com/3cIcMY53Y81g7MK0hl0kE00';

// ----------------------------------------------------------
// SECRET SETUP — run this function ONCE to initialize secrets
// ----------------------------------------------------------
function setScriptSecrets() {
  const props = PropertiesService.getScriptProperties();
  // Generate a random internal secret for Cloudflare Worker ↔ Apps Script auth
  const internalSecret = Utilities.getUuid() + '-' + Utilities.getUuid();
  props.setProperty('INTERNAL_SECRET', internalSecret);
  props.setProperty('HMAC_SECRET', Utilities.getUuid()); // for unsubscribe tokens
  Logger.log('INTERNAL_SECRET (copy to Cloudflare Worker): ' + internalSecret);
}

// ----------------------------------------------------------
// TRIGGER SETUP — run this function ONCE to schedule monthly newsletter
// ----------------------------------------------------------
function setup() {
  // Remove any existing triggers for sendMonthlyNewsletter
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sendMonthlyNewsletter') ScriptApp.deleteTrigger(t);
  });
  // Schedule on the 1st of every month at 9 AM
  ScriptApp.newTrigger('sendMonthlyNewsletter')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
  Logger.log('Monthly newsletter trigger installed: 1st of each month at 9 AM');
}

// ----------------------------------------------------------
// HTTP ENTRY POINTS
// ----------------------------------------------------------

function doPost(e) {
  const output = ContentService.createTextOutput;
  const json = t => output(JSON.stringify(t)).setMimeType(ContentService.MimeType.JSON);

  let data;
  try { data = JSON.parse(e.postData.contents); } catch(_) { return json({ok: false, error: 'bad json'}); }

  const props = PropertiesService.getScriptProperties();

  // Route: donation thank-you (called from Cloudflare Stripe Worker)
  if (data.action === 'donation_thanks') {
    if (data.secret !== props.getProperty('INTERNAL_SECRET')) return json({ok: false, error: 'unauthorized'});
    if (!data.email) return json({ok: false, error: 'missing email'});
    sendDonationThanksEmail(data.email, data.name || '', data.amount || '');
    return json({ok: true});
  }

  // Route: newsletter subscription (from the website form)
  const email = (data.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json({ok: false, error: 'invalid email'});

  saveSubscriber(email, data.name || '');
  sendWelcomeEmail(email, data.name || '');
  return json({ok: true});
}

// Unsubscribe via link: GET /exec?action=unsubscribe&email=x&token=y
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
  // Check if already exists → update status to subscribed
  for (let i = 1; i < data.length; i++) {
    if ((data[i][0] || '').toString().toLowerCase() === email) {
      sheet.getRange(i + 1, 3).setValue('subscribed');
      if (name && !data[i][3]) sheet.getRange(i + 1, 4).setValue(name);
      return;
    }
  }
  // New row: email | timestamp | status | name | unsubscribe_token
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
  const greeting = name ? 'Hey ' + name.split(' ')[0] + ',' : 'Hey there,';
  const unsubUrl = getDeploymentUrl() + '?action=unsubscribe&email=' + encodeURIComponent(email) + '&token=' + makeUnsubToken(email);

  const subject = 'Welcome to the One Love Initiative 💜';
  const html = emailWrapper(subject,
    '<p style="font-size:16px;line-height:1.7;color:#333;">' + greeting + '</p>' +
    '<p style="font-size:16px;line-height:1.7;color:#333;">Thank you for joining the <strong>One Love Initiative</strong> family. ' +
    'We\'re a student-led nonprofit based in Charlotte, NC, and we\'re so glad you\'re with us.</p>' +
    '<div style="background:#f9f7ff;border-left:4px solid #7B5CF5;padding:20px 24px;border-radius:4px;margin:28px 0;">' +
    '<p style="margin:0;font-size:15px;color:#444;line-height:1.7;"><strong>What we do:</strong> We mobilize students to assemble and distribute <strong>O.L.I Kits</strong> — ' +
    'bundles of essential hygiene supplies for families in need across Charlotte — in partnership with Crisis Assistance Ministry.</p>' +
    '</div>' +
    '<p style="font-size:16px;line-height:1.7;color:#333;"><strong>Our current drive:</strong> Children\'s Hygiene Kit Drive, aiming for <strong>20,000 kits</strong> by end of summer 2025. ' +
    'Each kit includes a toothbrush, toothpaste, soap, and lotion for a child who needs it.</p>' +
    '<p style="font-size:16px;line-height:1.7;color:#333;">Here\'s how you can help right now:</p>' +
    '<table style="width:100%;border-collapse:collapse;margin:8px 0 28px;">' +
    '<tr><td style="padding:8px 0;font-size:15px;color:#333;">📦</td><td style="padding:8px 12px;font-size:15px;color:#333;"><strong>Donate items</strong> — toothbrushes, toothpaste, kids soap & lotion</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:15px;color:#333;">🙋</td><td style="padding:8px 12px;font-size:15px;color:#333;"><strong>Volunteer</strong> — help us organize and assemble kits</td></tr>' +
    '<tr><td style="padding:8px 0;font-size:15px;color:#333;">💜</td><td style="padding:8px 12px;font-size:15px;color:#333;"><strong>Spread the word</strong> — share us with your school, workplace, or community</td></tr>' +
    '</table>' +
    ctaButton('Donate Now', STRIPE_URL) +
    '&nbsp;&nbsp;' +
    ctaButton('Visit Our Website', SITE_URL, '#555') +
    '<p style="font-size:15px;line-height:1.7;color:#555;margin-top:28px;">Questions? Just reply to this email or reach us at ' +
    '<a href="mailto:' + FROM_EMAIL + '" style="color:#7B5CF5;">' + FROM_EMAIL + '</a>.</p>' +
    '<p style="font-size:15px;color:#555;">One love,<br><strong>Prithivi & the OLI Team</strong></p>',
    unsubUrl
  );

  GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
}

// ----------------------------------------------------------
// EMAIL: DONATION THANK-YOU (triggered by Stripe webhook)
// ----------------------------------------------------------

function sendDonationThanksEmail(email, name, amount) {
  const greeting = name ? 'Hey ' + name.split(' ')[0] + ',' : 'Hey there,';
  const amountStr = amount ? '$' + parseFloat(amount).toFixed(2) : 'your generous gift';
  const unsubUrl = getDeploymentUrl() + '?action=unsubscribe&email=' + encodeURIComponent(email) + '&token=' + makeUnsubToken(email);

  const subject = 'Thank you for supporting One Love Initiative 💜';
  const html = emailWrapper(subject,
    '<p style="font-size:16px;line-height:1.7;color:#333;">' + greeting + '</p>' +
    '<p style="font-size:16px;line-height:1.7;color:#333;">Your donation of <strong>' + amountStr + '</strong> just made a real difference for a child in Charlotte. ' +
    'Thank you — seriously. This is what makes the One Love Initiative possible.</p>' +
    '<div style="background:#f9f7ff;border-left:4px solid #7B5CF5;padding:20px 24px;border-radius:4px;margin:28px 0;">' +
    '<p style="margin:0 0 8px;font-size:15px;color:#444;font-weight:bold;">Your impact:</p>' +
    '<p style="margin:0;font-size:15px;color:#444;line-height:1.7;">Each O.L.I Kit gives a child a toothbrush, toothpaste, soap, and lotion — basic items that make a real difference ' +
    'in daily life and dignity. Your donation helps us get closer to our goal of <strong>20,000 kits</strong> for families in need.</p>' +
    '</div>' +
    '<p style="font-size:16px;line-height:1.7;color:#333;"><strong>About your tax deduction:</strong> Your donation was made directly to the One Love Initiative. ' +
    'For a tax-deductible receipt, you can donate through our fiscal sponsor, <strong>Crisis Assistance Ministry (CAM)</strong>, and note "One Love Initiative" in the designation field. ' +
    'CAM is a registered 501(c)(3) and will issue the receipt.</p>' +
    ctaButton('Visit Our Website', SITE_URL) +
    '<p style="font-size:15px;line-height:1.7;color:#555;margin-top:28px;">Want to stay involved? Follow us on ' +
    '<a href="https://www.instagram.com/one.love.initiative/" style="color:#7B5CF5;">Instagram @one.love.initiative</a> ' +
    'or reply to this email — we\'d love to hear from you.</p>' +
    '<p style="font-size:15px;color:#555;">With gratitude,<br><strong>Prithivi & the OLI Team</strong></p>',
    unsubUrl
  );

  GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
}

// ----------------------------------------------------------
// EMAIL: MONTHLY NEWSLETTER (auto-triggered on 1st of month)
// ----------------------------------------------------------

function sendMonthlyNewsletter() {
  const now      = new Date();
  const month    = now.toLocaleString('default', { month: 'long' });
  const year     = now.getFullYear();
  const subject  = 'One Love Initiative — ' + month + ' ' + year + ' Update';
  const subs     = getSubscribers();

  if (subs.length === 0) { Logger.log('No subscribers — skipping newsletter'); return; }

  subs.forEach(({ email, name, token }) => {
    const greeting = name ? 'Hey ' + name.split(' ')[0] + ',' : 'Hey there,';
    const unsubUrl = getDeploymentUrl() + '?action=unsubscribe&email=' + encodeURIComponent(email) + '&token=' + token;

    const html = emailWrapper(subject,
      '<p style="font-size:16px;line-height:1.7;color:#333;">' + greeting + '</p>' +
      '<p style="font-size:16px;line-height:1.7;color:#333;">Here\'s a quick update from the <strong>One Love Initiative</strong> — ' +
      'thank you for being part of this community. Here\'s what we\'ve been up to:</p>' +

      '<h2 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:32px 0 12px;">📦 Kit Drive Progress</h2>' +
      '<p style="font-size:15px;line-height:1.7;color:#444;">We\'re still working toward our goal of <strong>20,000 Children\'s Hygiene Kits</strong> by end of summer 2025. ' +
      'Every kit contains a toothbrush, toothpaste, kids soap, and lotion — and every one matters.</p>' +

      '<h2 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:32px 0 12px;">📍 Upcoming Drives</h2>' +
      '<p style="font-size:15px;line-height:1.7;color:#444;">We\'re actively planning drives at the Hindu Center of Charlotte and exploring retail partnerships. ' +
      'Stay tuned — we\'ll announce dates as soon as they\'re confirmed.</p>' +

      '<h2 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:32px 0 12px;">💜 How You Can Help</h2>' +
      '<table style="width:100%;border-collapse:collapse;margin:8px 0 28px;">' +
      '<tr><td style="padding:8px 0;font-size:15px;color:#333;width:28px;">📦</td><td style="padding:8px 12px;font-size:15px;color:#333;"><strong>Donate items</strong> — toothbrushes, toothpaste, kids soap & lotion</td></tr>' +
      '<tr><td style="padding:8px 0;font-size:15px;color:#333;">💵</td><td style="padding:8px 12px;font-size:15px;color:#333;"><strong>Donate online</strong> — every dollar goes directly toward kits</td></tr>' +
      '<tr><td style="padding:8px 0;font-size:15px;color:#333;">🙋</td><td style="padding:8px 12px;font-size:15px;color:#333;"><strong>Volunteer</strong> — join us to assemble and distribute kits</td></tr>' +
      '<tr><td style="padding:8px 0;font-size:15px;color:#333;">📣</td><td style="padding:8px 12px;font-size:15px;color:#333;"><strong>Spread the word</strong> — share our mission with your community</td></tr>' +
      '</table>' +
      ctaButton('Donate Now', STRIPE_URL) +
      '&nbsp;&nbsp;' +
      ctaButton('Our Website', SITE_URL, '#555') +
      '<p style="font-size:15px;line-height:1.7;color:#555;margin-top:28px;">Questions or want to get more involved? Reply to this email or find us on ' +
      '<a href="https://www.instagram.com/one.love.initiative/" style="color:#7B5CF5;">Instagram @one.love.initiative</a>.</p>' +
      '<p style="font-size:15px;color:#555;">One love,<br><strong>Prithivi & the OLI Team</strong></p>',
      unsubUrl
    );

    try {
      GmailApp.sendEmail(email, subject, stripHtml(html), { htmlBody: html, name: FROM_NAME });
      Utilities.sleep(500); // stay within Gmail rate limits
    } catch(err) {
      Logger.log('Failed to send to ' + email + ': ' + err);
    }
  });

  Logger.log('Monthly newsletter sent to ' + subs.length + ' subscribers');
}

// ----------------------------------------------------------
// EMAIL TEMPLATE HELPERS
// ----------------------------------------------------------

function emailWrapper(preheader, bodyHtml, unsubUrl) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>' + preheader + '</title></head>' +
  '<body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">' +
  '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">' +
  '<tr><td align="center">' +
  '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">' +
  // Header
  '<tr><td style="background:#7B5CF5;padding:32px 40px;border-radius:6px 6px 0 0;">' +
  '<p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);font-weight:500;">One Love Initiative</p>' +
  '<p style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;letter-spacing:0.02em;">OLI</p>' +
  '</td></tr>' +
  // Body
  '<tr><td style="background:#fff;padding:40px;border-radius:0 0 6px 6px;">' +
  bodyHtml +
  // Footer
  '<hr style="border:none;border-top:1px solid #eee;margin:36px 0 24px;">' +
  '<p style="font-size:12px;color:#999;line-height:1.6;margin:0;">You\'re receiving this because you subscribed at <a href="' + SITE_URL + '" style="color:#7B5CF5;">' + SITE_URL + '</a>. ' +
  'We only send occasional updates — no spam, ever.<br>' +
  '<a href="' + unsubUrl + '" style="color:#999;">Unsubscribe</a> · ' +
  '<a href="mailto:' + FROM_EMAIL + '" style="color:#999;">Contact us</a></p>' +
  '</td></tr>' +
  '</table>' +
  '</td></tr></table>' +
  '</body></html>';
}

function ctaButton(label, url, bg) {
  var color = bg || '#7B5CF5';
  return '<a href="' + url + '" style="display:inline-block;background:' + color + ';color:#fff;padding:13px 26px;border-radius:4px;' +
    'font-size:13px;font-weight:600;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase;">' + label + '</a>';
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Returns the web app /exec URL (required for unsubscribe links)
function getDeploymentUrl() {
  return ScriptApp.getService().getUrl();
}
