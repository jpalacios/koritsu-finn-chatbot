import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: Request) {
  const { subject, message, fromName, fromEmail } = await req.json();

  try {
    await transporter.sendMail({
      from: `"FINN · Koritsu" <${process.env.GMAIL_USER}>`,
      to: 'finops.enquiries@koritsufinops.com',
      replyTo: fromEmail,
      subject: subject || 'Mensaje desde el chatbot FINN',
      html: `
        <p><strong>Mensaje de:</strong> ${fromName} (${fromEmail})</p>
        <p><strong>Mensaje:</strong></p>
        <p>${message}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
