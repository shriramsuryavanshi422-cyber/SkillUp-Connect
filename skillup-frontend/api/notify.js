const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, name, email, message } = req.body;

  const subjectMap = {
    contact: `New Contact Form: ${name}`,
    program: `New Program Submission: ${name}`,
    volunteer: `New Volunteer Sign-up: ${name}`,
  };

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"SkillUp Connect" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: subjectMap[type] || 'New Notification',
      html: `
        <h2>${subjectMap[type]}</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Details:</strong> ${message}</p>
      `,
    });

    res.status(200).json({ success: true, message: 'Email sent!' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};
