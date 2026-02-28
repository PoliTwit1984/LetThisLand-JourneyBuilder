// SMS generator — kept as a stub for backward compatibility with any
// existing touchpoints in the database that may have channel='sms'.
// No new SMS touchpoints can be created (channel blocked in validation).

interface SmsContent {
  body: string;
}

export const generateSmsHtml = (content: SmsContent): string => {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { margin: 0; padding: 40px; background: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; }
</style></head><body>
  <div style="max-width: 320px; margin: 0 auto; text-align: center; padding: 40px 20px;">
    <div style="font-size: 14px; color: #ef4444; font-weight: bold; margin-bottom: 12px;">SMS Channel Not Supported</div>
    <div style="font-size: 13px; color: #888;">This touchpoint uses the SMS channel, which is no longer available. Please change the channel to email, push, or in-app.</div>
  </div>
</body></html>`;
};
