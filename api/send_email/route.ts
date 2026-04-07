import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { subject, message, fromName, fromEmail } = await req.json();

  const { data, error } = await resend.emails.send({
    from: 'FINN · Koritsu <finn@koritsufinops.com>',
    to: ['finops.enquiries@koritsufinops.com'],
    subject: subject || 'Mensaje desde el chatbot FINN',
    html: `
      <p><strong>Mensaje de:</strong> ${fromName} (${fromEmail})</p>
      <p><strong>Mensaje:</strong></p>
      <p>${message}</p>
    `,
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
