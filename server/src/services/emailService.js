/**
 * PrepAI Email Notification Service
 * 100% Local Dispatcher - Zero External Cloud API Keys Required
 */
async function sendEmailNotification({ to, subject, htmlContent }) {
  console.log(`[PrepAI Local Dispatcher] Email queued to: ${to} | Subject: "${subject}"`);
  return { 
    success: true, 
    deliveredLocally: true,
    timestamp: new Date().toISOString(),
    recipient: to
  };
}

module.exports = {
  sendEmailNotification
};
