export default async function handler(req, res) {
  const { Resend } = await import('resend');
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: 'SyncedUp <onboarding@resend.dev>',
      to: 'admin@syncedupsolutions.com', // Your domain email
      subject: 'Test Email from SyncedUp',
      html: '<h1>Email Service Working!</h1><p>Your Resend integration is active.</p>'
    });
    
    return res.status(200).json({ success: true, id: result.id });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ 
      error: error.message,
      key: process.env.RESEND_API_KEY ? 'Key exists' : 'Key missing'
    });
  }
}