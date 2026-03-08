import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { type, useful, wrong, improvement } = await request.json();

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    let subject = 'User Feedback';
    let body = '';

    if (type === 'yes') {
      subject += ' - Positive';
      body = `What do you find useful: ${useful}\n\nCan you suggest some improvement: ${improvement}`;
    } else {
      subject += ' - Issue';
      body = `What did go wrong: ${wrong}\n\nCan you suggest some improvement: ${improvement}`;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'maulikbuilder@gmail.com',
      subject: subject,
      text: body
    };

    await transporter.sendMail(mailOptions);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending feedback email:', error);
    return Response.json({ error: 'Failed to send feedback' }, { status: 500 });
  }
}

