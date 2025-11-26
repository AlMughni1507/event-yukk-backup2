require('dotenv').config({ path: './config.env' });

console.log('\n🔍 Email Configuration Debug\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check SMTP Config
console.log('📧 SMTP Configuration:');
console.log('   SMTP_HOST     :', process.env.SMTP_HOST || 'NOT SET');
console.log('   SMTP_PORT     :', process.env.SMTP_PORT || 'NOT SET');
console.log('   SMTP_SECURE   :', process.env.SMTP_SECURE || 'NOT SET');
console.log('   SMTP_USER     :', process.env.SMTP_USER || 'NOT SET');
console.log('   SMTP_PASS     :', process.env.SMTP_PASS ? 
  `***${process.env.SMTP_PASS.slice(-4)} (length: ${process.env.SMTP_PASS.length})` : 'NOT SET');
console.log('   SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL || 'NOT SET');
console.log('');

// Check for common issues
const issues = [];

if (!process.env.SMTP_USER) {
  issues.push('❌ SMTP_USER is not set');
} else {
  if (!process.env.SMTP_USER.includes('@gmail.com')) {
    issues.push('⚠️  SMTP_USER is not a Gmail address');
  }
}

if (!process.env.SMTP_PASS) {
  issues.push('❌ SMTP_PASS is not set');
} else {
  const pass = process.env.SMTP_PASS.replace(/\s/g, '');
  if (pass.length !== 16) {
    issues.push(`⚠️  SMTP_PASS length is ${pass.length}, should be 16 characters (App Password)`);
  }
  if (process.env.SMTP_PASS.includes(' ')) {
    issues.push('⚠️  SMTP_PASS contains spaces (will be auto-removed, but better to remove manually)');
  }
  if (pass.length < 8) {
    issues.push('❌ SMTP_PASS is too short - you might be using regular password instead of App Password');
  }
}

if (issues.length > 0) {
  console.log('⚠️  Issues Found:');
  issues.forEach(issue => console.log('   ' + issue));
  console.log('');
}

// Instructions
console.log('📝 Next Steps:');
console.log('');
console.log('1. ✅ Make sure 2-Step Verification is ENABLED:');
console.log('   → https://myaccount.google.com/security');
console.log('');
console.log('2. ✅ Create NEW App Password:');
console.log('   → https://myaccount.google.com/apppasswords');
console.log('   → Select: Mail');
console.log('   → Select: Other (Custom name) → "Event Yukk"');
console.log('   → Copy the 16-character password');
console.log('');
console.log('3. ✅ Update config.env:');
console.log('   SMTP_PASS=your-16-char-app-password    # NO SPACES!');
console.log('');
console.log('4. ✅ Restart server after updating config.env');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test connection
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  console.log('🧪 Testing SMTP connection...\n');
  const nodemailer = require('nodemailer');
  
  const cleanPass = process.env.SMTP_PASS.replace(/\s/g, '');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: cleanPass
    }
  });

  transporter.verify()
    .then(() => {
      console.log('✅ SMTP connection successful!');
      console.log('   Your email configuration is correct.\n');
    })
    .catch((error) => {
      console.log('❌ SMTP connection failed!\n');
      console.log('Error:', error.message);
      console.log('');
      
      if (error.code === 'EAUTH') {
        console.log('💡 This means:');
        console.log('   • App Password is incorrect or expired');
        console.log('   • 2-Step Verification is not enabled');
        console.log('   • You might be using regular password instead of App Password');
        console.log('');
        console.log('🔧 Solution:');
        console.log('   1. Go to: https://myaccount.google.com/apppasswords');
        console.log('   2. Create a NEW App Password');
        console.log('   3. Copy it (16 characters, no spaces)');
        console.log('   4. Update SMTP_PASS in config.env');
        console.log('   5. Restart server');
      }
    });
}

