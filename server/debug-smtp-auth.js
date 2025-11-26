/**
 * Debug SMTP Authentication
 * Script untuk debug masalah autentikasi Gmail SMTP
 */

require('dotenv').config({ path: './config.env' });
const nodemailer = require('nodemailer');

async function debugSMTPAuth() {
  console.log('\n🔍 Debugging SMTP Authentication...\n');
  console.log('='.repeat(70));
  
  // Get configuration
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  
  console.log('\n📋 Configuration from config.env:');
  console.log('   SMTP_USER:', smtpUser || 'NOT SET');
  console.log('   SMTP_PASS:', smtpPass ? `"${smtpPass}" (length: ${smtpPass.length})` : 'NOT SET');
  console.log('   SMTP_HOST:', smtpHost);
  console.log('   SMTP_PORT:', smtpPort);
  console.log('   SMTP_SECURE:', smtpSecure);
  
  if (!smtpUser || !smtpPass) {
    console.error('\n❌ ERROR: SMTP_USER or SMTP_PASS is not set!');
    process.exit(1);
  }
  
  // Check password format
  console.log('\n🔍 Password Analysis:');
  console.log('   Original length:', smtpPass.length);
  console.log('   Has spaces:', smtpPass.includes(' ') ? 'YES ❌' : 'NO ✅');
  console.log('   Has newlines:', smtpPass.includes('\n') ? 'YES ❌' : 'NO ✅');
  console.log('   Has tabs:', smtpPass.includes('\t') ? 'YES ❌' : 'NO ✅');
  console.log('   Is 16 chars:', smtpPass.length === 16 ? 'YES ✅' : `NO (${smtpPass.length} chars) ⚠️`);
  
  // Clean password (remove all whitespace)
  const cleanPass = smtpPass.trim().replace(/\s/g, '');
  console.log('   Cleaned length:', cleanPass.length);
  console.log('   Cleaned password:', cleanPass.length === 16 ? '***' + cleanPass.slice(-4) : 'INVALID LENGTH');
  
  if (cleanPass.length !== 16) {
    console.error('\n❌ ERROR: App Password should be exactly 16 characters!');
    console.error('   Current length:', cleanPass.length);
    console.error('   Please check your App Password in config.env');
    process.exit(1);
  }
  
  // Create transporter with different configurations
  console.log('\n📧 Testing SMTP Connection...\n');
  
  const configs = [
    {
      name: 'Configuration 1: Standard (Port 587, TLS)',
      config: {
        host: smtpHost,
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: cleanPass
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'Configuration 2: Standard with requireTLS',
      config: {
        host: smtpHost,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: smtpUser,
          pass: cleanPass
        }
      }
    },
    {
      name: 'Configuration 3: OAuth2-like (if needed)',
      config: {
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: cleanPass
        }
      }
    }
  ];
  
  for (const { name, config } of configs) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log('   Config:', JSON.stringify({
      ...config,
      auth: { ...config.auth, pass: '***' + cleanPass.slice(-4) }
    }, null, 2));
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Verify connection
      console.log('   🔍 Verifying connection...');
      await transporter.verify();
      console.log('   ✅ Connection verified!');
      
      // Try to send test email
      console.log('   📤 Sending test email...');
      const info = await transporter.sendMail({
        from: `"Event Yukk Test" <${smtpUser}>`,
        to: smtpUser, // Send to self
        subject: '🧪 SMTP Test - ' + new Date().toISOString(),
        text: `Test email sent at ${new Date().toLocaleString()}\n\nConfiguration: ${name}`,
        html: `
          <h2>✅ SMTP Test Successful!</h2>
          <p>Configuration: <strong>${name}</strong></p>
          <p>Time: ${new Date().toLocaleString()}</p>
          <p>If you receive this, your SMTP authentication is working!</p>
        `
      });
      
      console.log('   ✅ Email sent successfully!');
      console.log('   📬 Message ID:', info.messageId);
      console.log('   📧 Check your inbox:', smtpUser);
      console.log('\n✅ SUCCESS! This configuration works!');
      console.log('   Use this configuration in your emailService.js');
      process.exit(0);
      
    } catch (error) {
      console.log('   ❌ Failed:', error.message);
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.log('   💡 Authentication failed - App Password may be invalid');
      } else if (error.code === 'ECONNECTION') {
        console.log('   💡 Connection failed - check network/firewall');
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n❌ All configurations failed!');
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('1. Verify App Password is correct:');
  console.log('   - Go to: https://myaccount.google.com/apppasswords');
  console.log('   - Make sure 2-Step Verification is ENABLED');
  console.log('   - Delete old App Password and create NEW one');
  console.log('   - App: Mail');
  console.log('   - Device: Other (Custom name) → "Event Yukk"');
  console.log('   - Copy the 16-character password (NO SPACES!)');
  console.log('\n2. Update config.env:');
  console.log('   SMTP_PASS=your-16-char-app-password');
  console.log('   (Make sure NO spaces, NO quotes)');
  console.log('\n3. Restart server after updating config.env');
  console.log('\n4. If still failing, try:');
  console.log('   - Check if "Less secure app access" is enabled (old Gmail)');
  console.log('   - Or use OAuth2 instead of App Password');
  console.log('   - Check Google Account security alerts');
  console.log('='.repeat(70) + '\n');
  
  process.exit(1);
}

debugSMTPAuth();



