/**
 * Test OTP Email - Verify Email is sent FROM al.mughni845@gmail.com
 * Script ini untuk memverifikasi bahwa email OTP dikirim dari al.mughni845@gmail.com
 */

require('dotenv').config({ path: './config.env' });
const emailService = require('./services/emailService');

async function testOTPFromEmail() {
  console.log('\n🧪 Testing OTP Email - Verifying Sender Email...\n');
  console.log('='.repeat(70));
  
  // Display configuration
  console.log('\n📋 Email Configuration:');
  console.log('   SMTP_USER      :', process.env.SMTP_USER || 'NOT SET');
  console.log('   SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL || 'NOT SET');
  console.log('   SMTP_FROM_NAME :', process.env.SMTP_FROM_NAME || 'NOT SET');
  console.log('   SMTP_HOST      :', process.env.SMTP_HOST || 'NOT SET');
  console.log('   SMTP_PORT      :', process.env.SMTP_PORT || 'NOT SET');
  console.log('   SMTP_PASS      :', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
  
  // Verify expected email
  const expectedEmail = 'al.mughni845@gmail.com';
  const actualFromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  
  console.log('\n🔍 Verification:');
  if (actualFromEmail === expectedEmail) {
    console.log(`   ✅ Email sender is correct: ${actualFromEmail}`);
  } else {
    console.log(`   ❌ Email sender mismatch!`);
    console.log(`      Expected: ${expectedEmail}`);
    console.log(`      Actual  : ${actualFromEmail || 'NOT SET'}`);
    console.log('\n   ⚠️  Please update config.env:');
    console.log(`      SMTP_USER=${expectedEmail}`);
    console.log(`      SMTP_FROM_EMAIL=${expectedEmail}`);
    process.exit(1);
  }
  
  // Test email (use the same email or provide different one)
  const testEmail = process.argv[2] || process.env.TEST_EMAIL || 'al.mughni845@gmail.com';
  const testName = 'Test User OTP';
  const testOTP = emailService.generateOTP(); // Generate real OTP
  
  console.log('\n📧 Test Details:');
  console.log(`   From Email: ${actualFromEmail}`);
  console.log(`   To Email  : ${testEmail}`);
  console.log(`   Test Name : ${testName}`);
  console.log(`   OTP Code  : ${testOTP}`);
  
  console.log('\n📤 Sending OTP email...\n');
  console.log('='.repeat(70));
  
  try {
    const result = await emailService.sendOTPEmail(testEmail, testOTP, testName);
    
    console.log('\n' + '='.repeat(70));
    if (result.success) {
      console.log('✅ SUCCESS! OTP email sent successfully!');
      console.log(`   Provider  : ${result.provider || 'unknown'}`);
      console.log(`   Message ID: ${result.messageId || 'N/A'}`);
      console.log(`   From      : ${actualFromEmail}`);
      console.log(`   To        : ${testEmail}`);
      console.log(`\n📬 Check your inbox at: ${testEmail}`);
      console.log('   Look for email FROM: ' + actualFromEmail);
      console.log('   OTP Code: ' + testOTP);
      console.log('   (Also check Spam/Junk folder if not found)');
      
      if (actualFromEmail === expectedEmail) {
        console.log('\n✅ VERIFIED: Email is being sent from al.mughni845@gmail.com');
      }
    } else {
      console.log('❌ FAILED! OTP email could not be sent');
      console.log(`   Error: ${result.message || result.error || 'Unknown error'}`);
      
      if (result.error === 'EAUTH' || result.message?.includes('535') || result.error === 'SMTP_ERROR') {
        console.log('\n🔧 SOLUTION - Gmail App Password:');
        console.log('   1. Go to: https://myaccount.google.com/apppasswords');
        console.log('   2. Make sure 2-Step Verification is enabled');
        console.log('   3. Create a NEW App Password:');
        console.log('      - App: Mail');
        console.log('      - Device: Other (Custom name) → "Event Yukk"');
        console.log('   4. Copy the 16-character password (NO SPACES!)');
        console.log('   5. Update SMTP_PASS in server/config.env');
        console.log('   6. Restart server and run this test again');
        console.log('\n   Current SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET');
      }
    }
    console.log('='.repeat(70) + '\n');
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
    console.log('\n🔧 Check your SMTP configuration in server/config.env');
    process.exit(1);
  }
}

// Run test
testOTPFromEmail();



