/**
 * Verify App Password Format
 * Check if App Password is correctly formatted
 */

require('dotenv').config({ path: './config.env' });

console.log('\n🔍 Verifying App Password Configuration...\n');
console.log('='.repeat(60));

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

console.log('📧 SMTP_USER:', smtpUser || 'NOT SET');
console.log('🔑 SMTP_PASS:', smtpPass ? `${smtpPass.substring(0, 4)}****${smtpPass.substring(smtpPass.length - 4)}` : 'NOT SET');
console.log('📏 SMTP_PASS Length:', smtpPass ? smtpPass.length : 0, 'characters');
console.log('🔤 SMTP_PASS Has Spaces:', smtpPass ? smtpPass.includes(' ') : 'N/A');

if (!smtpPass) {
  console.log('\n❌ ERROR: SMTP_PASS is not set!');
  process.exit(1);
}

if (smtpPass.includes(' ')) {
  console.log('\n⚠️  WARNING: SMTP_PASS contains spaces!');
  console.log('   App Password should NOT have spaces.');
  console.log('   Current:', smtpPass);
  console.log('   Should be:', smtpPass.replace(/\s/g, ''));
} else {
  console.log('✅ SMTP_PASS has no spaces (correct)');
}

if (smtpPass.length !== 16) {
  console.log('\n⚠️  WARNING: SMTP_PASS length is not 16 characters!');
  console.log('   Gmail App Password should be exactly 16 characters.');
  console.log('   Current length:', smtpPass.length);
} else {
  console.log('✅ SMTP_PASS length is 16 characters (correct)');
}

if (!smtpUser) {
  console.log('\n❌ ERROR: SMTP_USER is not set!');
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('\n📋 Summary:');
console.log('   Email:', smtpUser);
console.log('   Password Length:', smtpPass.length, 'chars');
console.log('   Has Spaces:', smtpPass.includes(' ') ? 'YES (❌ WRONG)' : 'NO (✅ CORRECT)');
console.log('   Format:', smtpPass.length === 16 && !smtpPass.includes(' ') ? '✅ CORRECT' : '❌ INCORRECT');

if (smtpPass.length === 16 && !smtpPass.includes(' ')) {
  console.log('\n✅ App Password format looks correct!');
  console.log('   If email still fails, the App Password might be:');
  console.log('   - Incorrectly copied (typo)');
  console.log('   - Created for different account');
  console.log('   - Expired or revoked');
  console.log('   - 2-Step Verification not enabled on this account');
} else {
  console.log('\n❌ App Password format is incorrect!');
  console.log('   Please fix the format in config.env');
}

console.log('\n');



