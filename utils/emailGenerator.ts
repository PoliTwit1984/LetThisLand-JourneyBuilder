import type { EmailContent } from '../types.js';
import { sanitizeUrl } from '../server/validation.js';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const FONT_STACK = `Helvetica, 'Helvetica Neue', Arial, sans-serif`;

const buildBulletHtml = (bullets: string[]): string => {
  if (!bullets || bullets.length === 0) return '';
  let rows = '';
  for (const b of bullets) {
    rows += `
                <tr>
                  <td valign="top" style="padding: 0 0 10px 0; width: 24px;">
                    <span class="email-bullet" style="font-family: ${FONT_STACK}; font-size: 18px; color: #ce2029; line-height: 26px;">&bull;</span>
                  </td>
                  <td valign="top" class="email-text" style="font-family: ${FONT_STACK}; font-size: 16px; line-height: 26px; color: #1a1a1a; padding-bottom: 10px; font-weight: 400;">
                    ${escapeHtml(b)}
                  </td>
                </tr>`;
  }
  return `<tr>
        <td align="left" style="padding-bottom: 28px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            ${rows}
          </table>
        </td>
      </tr>`;
};

const buildParagraphRows = (body: string): string => {
  const paragraphs = body.split(/\n\n+/).filter(p => p.trim());
  let rows = '';
  for (const p of paragraphs) {
    rows += `<tr>
          <td align="left" class="email-text" style="font-family: ${FONT_STACK}; font-size: 16px; line-height: 26px; color: #1a1a1a; padding-bottom: 16px; font-weight: 400;">
            ${escapeHtml(p).replace(/\n/g, '<br>')}
          </td>
        </tr>`;
  }
  return rows;
};

// VML bulletproof button — renders in every client including Outlook
function bulletproofButton(text: string, url: string, bgColor: string = '#ce2029', textColor: string = '#ffffff'): string {
  return `<table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%;">
                    <tr>
                      <td align="center">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="13%" stroke="f" fillcolor="${bgColor}">
                          <w:anchorlock/>
                          <center style="color:${textColor};font-family:${FONT_STACK};font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(text)}</center>
                        </v:roundrect>
                        <![endif]-->
                        <!--[if !mso]><!-->
                        <a href="${url}" style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; font-family: ${FONT_STACK}; font-size: 16px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; padding: 16px 40px; border-radius: 6px; min-width: 200px; text-align: center; mso-padding-alt: 0; line-height: 1;" target="_blank">
                          ${escapeHtml(text)}
                        </a>
                        <!--<![endif]-->
                      </td>
                    </tr>
                  </table>`;
}

export const generateEmailHtml = (content: EmailContent): string => {
  const preheaderText = content.preheader || '';
  const paragraphHtml = buildParagraphRows(content.body);
  const bulletHtml = buildBulletHtml(content.bullets);
  const primaryUrl = sanitizeUrl(content.primaryCtaUrl) || '#';
  const secondaryUrl = content.secondaryCtaUrl ? sanitizeUrl(content.secondaryCtaUrl) : '';

  let secondaryHtml = '';
  if (content.secondaryCtaText && secondaryUrl) {
    secondaryHtml = `<tr>
        <td align="center" style="padding-top: 20px;">
          <a href="${escapeHtml(secondaryUrl)}" class="email-secondary-link" style="font-family: ${FONT_STACK}; font-size: 14px; font-weight: bold; color: #ce2029; text-decoration: none;" target="_blank">
            ${escapeHtml(content.secondaryCtaText)} &rarr;
          </a>
        </td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(content.headline)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; min-width: 100%; background-color: #e8e8eb; }
    a { color: #ce2029; }
    a:hover { text-decoration: underline !important; }

    /* Mobile */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .content-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .headline { font-size: 26px !important; line-height: 34px !important; }
      .mobile-full-width a { display: block !important; width: 100% !important; min-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; text-align: center !important; }
      .mobile-full-width table { width: 100% !important; }
      .mobile-full-width td { width: 100% !important; }
      .mobile-hide { display: none !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }

    /* Dark Mode — explicit overrides for clients that support <style> */
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #1a1a1e !important; }
      .email-card { background-color: #2a2a2e !important; }
      .email-text { color: #e8e8e8 !important; }
      .email-text-muted { color: #a0a0a0 !important; }
      .email-heading { color: #f5f5f5 !important; }
      .email-context-label { color: #999999 !important; }
      .email-divider { border-color: #3a3a3e !important; }
      .email-bullet { color: #ce2029 !important; }
      .email-secondary-link { color: #e05860 !important; }
    }
    /* Outlook.com / Outlook App dark mode */
    [data-ogsc] .email-card { background-color: #2a2a2e !important; }
    [data-ogsc] .email-text { color: #e8e8e8 !important; }
    [data-ogsc] .email-heading { color: #f5f5f5 !important; }
    [data-ogsc] .email-context-label { color: #999999 !important; }
    [data-ogsc] .email-text-muted { color: #a0a0a0 !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #e8e8eb;" class="email-bg">
  <!-- Preheader (hidden preview text) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    ${escapeHtml(preheaderText)}${'&#847; &zwnj; &nbsp; '.repeat(20)}
  </div>
  <!-- Ghost whitespace cleanup -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    &nbsp;
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #e8e8eb; table-layout: fixed;" class="email-bg" role="presentation">
    <tr>
      <td align="center" style="padding: 32px 8px;">

        <!-- Main Email Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; width: 600px; max-width: 600px; margin: 0 auto; border-radius: 0;" role="presentation">

          <!-- Branded Header -->
          <tr>
            <td align="center" style="background-color: #000000; padding: 28px 20px;">
              <img src="https://cdn.shopify.com/s/files/1/0597/7853/1477/files/rapsodo_logo_mailing.svg" alt="Rapsodo Golf" width="150" style="display: block; width: 150px; height: auto; border: 0; margin-bottom: 20px;" />
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;" role="presentation">
                <tr>
                  <td style="padding: 0 10px;"><a href="https://rapsodo.com/pages/softball-technology" style="text-decoration: none; font-family: ${FONT_STACK}; font-size: 12px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;" target="_blank">SOFTBALL</a></td>
                  <td style="color: #666666; font-size: 12px; cursor: default;">|</td>
                  <td style="padding: 0 10px;"><a href="https://rapsodo.com/pages/baseball-technology" style="text-decoration: none; font-family: ${FONT_STACK}; font-size: 12px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;" target="_blank">BASEBALL</a></td>
                  <td style="color: #666666; font-size: 12px; cursor: default;">|</td>
                  <td style="padding: 0 10px;"><a href="https://rapsodo.com/pages/golf" style="text-decoration: none; font-family: ${FONT_STACK}; font-size: 12px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;" target="_blank">GOLF</a></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Red Accent Line -->
          <tr>
            <td height="4" style="background-color: #ce2029; line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td class="email-card" style="background-color: #ffffff;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">

                <!-- Context Label -->
                <tr>
                  <td align="left" class="content-padding email-context-label" style="padding: 36px 40px 0 40px; font-family: ${FONT_STACK}; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #666666;">
                    ${escapeHtml(preheaderText)}
                  </td>
                </tr>

                <!-- Headline -->
                <tr>
                  <td align="left" class="content-padding email-heading headline" style="padding: 12px 40px 28px 40px; font-family: ${FONT_STACK}; font-size: 28px; line-height: 36px; font-weight: 800; color: #111111; letter-spacing: -0.5px;">
                    ${escapeHtml(content.headline)}
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td align="left" class="content-padding" style="padding: 0 40px 24px 40px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      ${paragraphHtml}
                      ${bulletHtml}
                    </table>
                  </td>
                </tr>

                <!-- Primary CTA — Bulletproof -->
                <tr>
                  <td align="center" class="content-padding mobile-full-width" style="padding: 8px 40px 16px 40px;">
                    ${bulletproofButton(content.primaryCtaText, primaryUrl)}
                  </td>
                </tr>

                <!-- Secondary CTA (if present) -->
                ${secondaryHtml}

                <!-- Bottom Spacing -->
                <tr>
                  <td style="padding-bottom: 36px;">&nbsp;</td>
                </tr>

              </table>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="width: 600px; max-width: 600px; margin: 0 auto; background-color: #000000;" role="presentation">
          <tr>
            <td align="center" style="padding: 36px 20px;">
              <img src="https://cdn.shopify.com/s/files/1/0597/7853/1477/files/rapsodo_logo_mailing.svg" alt="Rapsodo Golf" width="160" style="display: block; width: 160px; height: auto; margin-bottom: 20px;" />
              <p style="margin: 0 0 28px 0; font-family: ${FONT_STACK}; font-size: 12px; color: #ffffff; opacity: 0.8;">
                400 S Woods Mill Rd, Ste 150, Chesterfield, MO 63017, US
              </p>
              <h3 style="margin: 0 0 14px 0; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 800; color: #ffffff;">
                Follow Us
              </h3>
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px auto;" role="presentation">
                <tr>
                  <td style="padding: 0 8px;"><a href="https://www.facebook.com/Rapsodo" style="text-decoration: none;" target="_blank"><img src="https://go.rapsodo.com/l/1000831/2025-09-08/3w79k/1000831/17573458383fdvesZN/fb.png" alt="Facebook" width="32" style="display: block; width: 32px;" /></a></td>
                  <td style="padding: 0 8px;"><a href="https://x.com/raborapsodo" style="text-decoration: none;" target="_blank"><img src="https://go.rapsodo.com/l/1000831/2025-09-08/3w7b8/1000831/1757345840P5kugWeB/x.png" alt="X" width="32" style="display: block; width: 32px;" /></a></td>
                  <td style="padding: 0 8px;"><a href="https://www.instagram.com/raborapsodo/" style="text-decoration: none;" target="_blank"><img src="https://go.rapsodo.com/l/1000831/2025-09-08/3w79v/1000831/1757345839VUlZG5Gp/ig.png" alt="Instagram" width="32" style="display: block; width: 32px;" /></a></td>
                  <td style="padding: 0 8px;"><a href="https://www.youtube.com/@Rapsodo" style="text-decoration: none;" target="_blank"><img src="https://go.rapsodo.com/l/1000831/2025-09-08/3w79g/1000831/1757345838Iw8WjSAN/yt.png" alt="YouTube" width="32" style="display: block; width: 32px;" /></a></td>
                  <td style="padding: 0 8px;"><a href="https://www.linkedin.com/company/rapsodo/" style="text-decoration: none;" target="_blank"><img src="https://go.rapsodo.com/l/1000831/2025-09-08/3w7b2/1000831/1757345840OPZvZkAY/ln.png" alt="LinkedIn" width="32" style="display: block; width: 32px;" /></a></td>
                </tr>
              </table>
              <p style="margin: 0 0 10px 0; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 800; color: #ffffff;">
                <a href="mailto:support@rapsodo.com" style="color: #ffffff; text-decoration: none;">support@rapsodo.com</a>
              </p>
              <p style="margin: 0 0 20px 0; font-family: ${FONT_STACK}; font-size: 12px; color: #ffffff;">
                <a href="https://rapsodo.com/pages/golf-learning-center" style="color: #ffffff; text-decoration: underline;" target="_blank">MLM2PRO Help Center</a>
              </p>
              <p style="margin: 0 0 20px 0; font-family: ${FONT_STACK}; font-size: 12px; color: #ffffff; opacity: 0.6;">
                &copy; 2026 Copyright Rapsodo&reg;. All Rights Reserved.
              </p>
              <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 12px; font-weight: bold; color: #ffffff;">
                <a href="https://rapsodo.com/pages/terms-of-use" style="color: #ffffff; text-decoration: none;" target="_blank">Terms of Service</a>
                <span style="padding: 0 8px; opacity: 0.5;">|</span>
                <a href="{{unsubscribeUrl}}" style="color: #ffffff; text-decoration: none;" target="_blank">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
};
