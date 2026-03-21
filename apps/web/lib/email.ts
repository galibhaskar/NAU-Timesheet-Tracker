interface InviteEmailParams {
  to: string;
  inviteToken: string;
  role: string;
  courseName?: string;
}

export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
  const inviteUrl = `${process.env.APP_URL}/invite/${params.inviteToken}`;

  // TODO Phase 4: Replace with real SMTP via nodemailer
  // For now, log the invite URL (development mode)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[INVITE EMAIL] To: ${params.to}, URL: ${inviteUrl}`);
    return;
  }

  // Production email sending will be added in Phase 4
  throw new Error('Email sending not yet configured for production');
}
