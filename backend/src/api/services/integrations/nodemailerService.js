function mockMailResult(to, subject) {
  return {
    mode: 'mock',
    provider: 'nodemailer',
    accepted: [to],
    subject,
    messageId: `mock-${Date.now()}`
  };
}

export async function sendMail({ to, subject, text = '', html = '' } = {}) {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
    return mockMailResult(to, subject);
  }

  return {
    mode: 'live',
    provider: 'nodemailer',
    accepted: [to],
    subject,
    text,
    html,
    messageId: 'replace-with-smtp-message-id'
  };
}
