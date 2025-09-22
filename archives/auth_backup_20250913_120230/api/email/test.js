import { Resend } from 'resend';

export default async function handler(req, res) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    const result = await resend.emails.send({
      from: 'SyncedUp <noreply@insurance.syncedupsolutions.com>',  // Your verified domain!
      to: 'admin@syncedupsolutions.com',  // Can now send to ANY email
      subject: 'Test Email from SyncedUp - ' + new Date().toISOString(),
      html: `
        <h1>Email Service Working!</h1>
        <p>Your domain is verified and emails are operational!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });
    
    return res.status(200).json({ 
      success: true, 
      id: result.data?.id,
      message: 'Email sent successfully!'
    });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ 
      error: error.message
    });
  }
}