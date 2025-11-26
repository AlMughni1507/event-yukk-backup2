require('dotenv').config({ path: './config.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('🧪 Testing SMTP Email Configuration...\n');
  
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  console.log('📧 SMTP Configuration:');
  console.log('   Host:', smtpConfig.host);
  console.log('   Port:', smtpConfig.port);
  console.log('   Secure:', smtpConfig.secure);
  console.log('   User:', smtpConfig.auth.user);
  console.log('   Pass:', smtpConfig.auth.pass ? '***' + smtpConfig.auth.pass.slice(-4) : 'NOT SET');
  console.log('');

  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.error('❌ SMTP_USER or SMTP_PASS is not set in config.env');
    console.log('\n📝 Please set these in server/config.env:');
    console.log('   SMTP_USER=your-email@gmail.com');
    console.log('   SMTP_PASS=your-app-password');
    process.exit(1);
  }

  // Remove spaces from password (common mistake)
  smtpConfig.auth.pass = smtpConfig.auth.pass.replace(/\s/g, '');

  const transporter = nodemailer.createTransport(smtpConfig);

  try {
    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    // Send test email
    const testEmail = process.env.SMTP_USER; // Send to self
    console.log(`📤 Sending test email to ${testEmail}...`);

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Event Yukk Platform'}" <${process.env.SMTP_FROM_EMAIL || smtpConfig.auth.user}>`,
      to: testEmail,
      subject: 'Test Email - Event Yukk Platform',
      html: `
        <h2>✅ Email Test Successful!</h2>
        <p>If you receive this email, your SMTP configuration is working correctly.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>From:</strong> ${smtpConfig.auth.user}</p>
      `,
      text: 'Email test successful! Your SMTP configuration is working correctly.'
    });

    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log(`\n📬 Please check your inbox: ${testEmail}`);
    console.log('   (Also check spam/junk folder)');
    
  } catch (error) {
    console.error('\n❌ Email test failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔧 Common fixes for "Invalid login" error:');
      console.error('1. Make sure you\'re using an App Password, not your regular Gmail password');
      console.error('2. Enable 2-Step Verification on your Google Account');
      console.error('3. Generate a new App Password:');
      console.error('   - Go to: https://myaccount.google.com/apppasswords');
      console.error('   - Select "Mail" and "Other (Custom name)"');
      console.error('   - Enter name: "Event Yukk"');
      console.error('   - Copy the 16-character password (no spaces)');
      console.error('4. Update SMTP_PASS in config.env with the new App Password');
      console.error('5. Make sure there are NO SPACES in the password');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🔧 Connection error - check your internet and firewall settings');
    }
    
    process.exit(1);
  }
}

testEmail();


