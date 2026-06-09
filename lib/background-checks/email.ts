interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

async function sendEmail(opts: SendEmailOptions): Promise<{ id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[BGC Email] RESEND_API_KEY not set — email not sent:', opts.subject)
    return { id: 'dev-no-send' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from:    process.env.BGC_EMAIL_FROM ?? 'Background Checks <noreply@exxio.ai>',
      to:      [opts.to],
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { error: err }
  }

  const data = await res.json() as { id: string }
  return { id: data.id }
}

export async function sendConsentEmail(opts: {
  to: string
  candidateName: string
  organisationName: string
  positionTitle: string
  consentLink: string
  expiresInHours: number
}): Promise<{ id?: string; error?: string }> {
  return sendEmail({
    to:      opts.to,
    subject: `Background check consent required — ${opts.positionTitle} at ${opts.organisationName}`,
    text: [
      `Hi ${opts.candidateName},`,
      '',
      `${opts.organisationName} has invited you to complete a background check as part of your application for the ${opts.positionTitle} role.`,
      '',
      `Please click the link below to review the consent form and provide your signature. This link expires in ${opts.expiresInHours} hours.`,
      '',
      opts.consentLink,
      '',
      'If you did not apply for this role or did not expect this request, please ignore this email.',
    ].join('\n'),
    html: `
      <p>Hi ${opts.candidateName},</p>
      <p><strong>${opts.organisationName}</strong> has invited you to complete a background check as part of your application for the <strong>${opts.positionTitle}</strong> role.</p>
      <p>Please click the button below to review the consent form and provide your signature. This link expires in <strong>${opts.expiresInHours} hours</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${opts.consentLink}" style="background:#0f62fe;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">
          Review &amp; Sign Consent Form
        </a>
      </p>
      <p style="color:#6f6f6f;font-size:12px;">If you did not apply for this role or did not expect this request, please ignore this email.</p>
    `,
  })
}

export async function sendAdverseActionPreNotice(opts: {
  to: string
  candidateName: string
  organisationName: string
  positionTitle: string
  disputeWindowDays: number
  reportDownloadLink: string
}): Promise<{ id?: string; error?: string }> {
  return sendEmail({
    to:      opts.to,
    subject: `Important notice regarding your background check — ${opts.organisationName}`,
    text: [
      `Hi ${opts.candidateName},`,
      '',
      `${opts.organisationName} is considering taking an adverse employment action in connection with your application for the ${opts.positionTitle} role, based in part on information obtained through a background check.`,
      '',
      'You have the right to review the background check report and dispute any inaccurate information. You have ' + opts.disputeWindowDays + ' business days to submit a dispute before a final decision is made.',
      '',
      'Download your background check report here:',
      opts.reportDownloadLink,
      '',
      'To dispute any findings, please reply to this email or contact the employer directly.',
    ].join('\n'),
    html: `
      <p>Hi ${opts.candidateName},</p>
      <p><strong>${opts.organisationName}</strong> is considering taking an adverse employment action in connection with your application for the <strong>${opts.positionTitle}</strong> role, based in part on information obtained through a background check.</p>
      <p>You have the right to review the background check report and dispute any inaccurate information. You have <strong>${opts.disputeWindowDays} business days</strong> to submit a dispute before a final decision is made.</p>
      <p><a href="${opts.reportDownloadLink}">Download your background check report</a></p>
      <p>To dispute any findings, please reply to this email or contact the employer directly.</p>
    `,
  })
}

export async function sendAdverseActionFinalNotice(opts: {
  to: string
  candidateName: string
  organisationName: string
  positionTitle: string
}): Promise<{ id?: string; error?: string }> {
  return sendEmail({
    to:      opts.to,
    subject: `Final decision notice — ${opts.organisationName}`,
    text: [
      `Hi ${opts.candidateName},`,
      '',
      `This is to inform you that ${opts.organisationName} has made a final decision not to proceed with your application for the ${opts.positionTitle} role. This decision was influenced in part by information obtained through a background check.`,
      '',
      'You have the right to contact the background check provider directly to dispute the accuracy of the report.',
      '',
      'If you have questions, please contact the employer directly.',
    ].join('\n'),
    html: `
      <p>Hi ${opts.candidateName},</p>
      <p>This is to inform you that <strong>${opts.organisationName}</strong> has made a final decision not to proceed with your application for the <strong>${opts.positionTitle}</strong> role. This decision was influenced in part by information obtained through a background check.</p>
      <p>You have the right to contact the background check provider directly to dispute the accuracy of the report.</p>
      <p>If you have questions, please contact the employer directly.</p>
    `,
  })
}

export async function sendReferenceRequest(opts: {
  to: string
  refereeName: string
  candidateName: string
  organisationName: string
  positionTitle: string
  questionnaireLink: string
  expiresInDays: number
}): Promise<{ id?: string; error?: string }> {
  return sendEmail({
    to:      opts.to,
    subject: `Reference request for ${opts.candidateName} — ${opts.organisationName}`,
    text: [
      `Hi ${opts.refereeName},`,
      '',
      `${opts.candidateName} has applied for the ${opts.positionTitle} role at ${opts.organisationName} and has listed you as a professional reference.`,
      '',
      `Please complete a brief reference questionnaire using the link below. This link expires in ${opts.expiresInDays} days.`,
      '',
      opts.questionnaireLink,
      '',
      'Your responses will be kept confidential and used only to assist with this hiring decision.',
    ].join('\n'),
    html: `
      <p>Hi ${opts.refereeName},</p>
      <p><strong>${opts.candidateName}</strong> has applied for the <strong>${opts.positionTitle}</strong> role at ${opts.organisationName} and has listed you as a professional reference.</p>
      <p>Please complete a brief reference questionnaire using the button below. This link expires in <strong>${opts.expiresInDays} days</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${opts.questionnaireLink}" style="background:#0f62fe;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">
          Complete Reference Form
        </a>
      </p>
      <p style="color:#6f6f6f;font-size:12px;">Your responses will be kept confidential and used only to assist with this hiring decision.</p>
    `,
  })
}
