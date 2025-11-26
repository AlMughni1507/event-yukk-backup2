const Brevo = require('@getbrevo/brevo');
const nodemailer = require('nodemailer');
const { query } = require('../db');

class EmailService {
  constructor() {
    // Brevo Configuration
    this.brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
    this.brevoSenderName = process.env.BREVO_SENDER_NAME || 'Event Yukk Platform';
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.brevoConfigured = Boolean(this.brevoApiKey && this.brevoSenderEmail && 
      !this.brevoApiKey.includes('your-') && !this.brevoSenderEmail.includes('example.com'));

    // SMTP Configuration (Fallback)
    this.smtpHost = process.env.SMTP_HOST;
    this.smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    this.smtpSecure = process.env.SMTP_SECURE === 'true';
    this.smtpUser = process.env.SMTP_USER;
    // Trim password to remove any accidental spaces
    this.smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim().replace(/\s/g, '') : '';
    this.smtpFromName = process.env.SMTP_FROM_NAME || 'Event Yukk Platform';
    this.smtpFromEmail = process.env.SMTP_FROM_EMAIL || this.smtpUser;
    
    this.smtpConfigured = Boolean(this.smtpHost && this.smtpUser && this.smtpPass);

    // Determine sender email and name
    this.senderEmail = this.brevoSenderEmail || this.smtpFromEmail;
    this.senderName = this.brevoSenderName || this.smtpFromName;

    console.log('📧 EmailService Configuration:');
    console.log('   Brevo API :', this.brevoConfigured ? '✅ Configured' : '❌ Not configured');
    console.log('   SMTP      :', this.smtpConfigured ? '✅ Configured' : '❌ Not configured');
    console.log(`   SMTP User : ${this.smtpUser || 'NOT SET'}`);
    console.log(`   From Email: ${this.smtpFromEmail || 'NOT SET'}`);
    console.log(`   Sender    : ${this.senderName} <${this.senderEmail}>`);
    
    // Verify email configuration
    if (this.smtpConfigured && this.smtpFromEmail !== 'al.mughni845@gmail.com') {
      console.warn(`⚠️  WARNING: SMTP_FROM_EMAIL is set to ${this.smtpFromEmail}, not al.mughni845@gmail.com`);
    } else if (this.smtpConfigured && this.smtpFromEmail === 'al.mughni845@gmail.com') {
      console.log('✅ Email sender confirmed: al.mughni845@gmail.com');
    }
    
    // Initialize Brevo if configured
    if (this.brevoConfigured) {
      try {
        this.emailApi = new Brevo.TransactionalEmailsApi();
        if (
          this.emailApi &&
          this.emailApi.authentications &&
          this.emailApi.authentications.apiKey
        ) {
          this.emailApi.authentications.apiKey.apiKey = this.brevoApiKey;
        } else if (this.emailApi && typeof this.emailApi.setApiKey === 'function') {
          this.emailApi.setApiKey('apiKey', this.brevoApiKey);
        }
        console.log('📧 Brevo transactional email client initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Brevo:', error.message);
        this.emailApi = null;
      }
    } else {
      this.emailApi = null;
    }

    // Initialize SMTP transporter if configured
    if (this.smtpConfigured) {
      try {
        // Password already trimmed in constructor, but ensure no spaces
        const cleanPassword = this.smtpPass.replace(/\s/g, '');
        
        this.smtpTransporter = nodemailer.createTransport({
          host: this.smtpHost,
          port: this.smtpPort,
          secure: this.smtpSecure,
          auth: {
            user: this.smtpUser,
            pass: cleanPassword
          },
          // Add connection timeout
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        });
        
        // Verify connection on startup
        // DEBUG: Verify SMTP credentials being used
        console.log('--- SMTP Auth Debug ---');
        console.log(`   - User: ${this.smtpUser}`);
        console.log(`   - Pass: ${this.smtpPass ? this.smtpPass.substring(0, 2) + '****' + this.smtpPass.substring(this.smtpPass.length - 2) : 'NOT SET'}`);
        console.log('-------------------------');

        this.smtpTransporter.verify((error, success) => {
          if (error) {
            console.warn('⚠️ SMTP connection verification failed:', error.message);
            if (error.code === 'EAUTH') {
              console.error('💡 SMTP Authentication Error!');
              console.error('   Make sure you\'re using Gmail App Password (not regular password)');
              console.error('   Get it from: https://myaccount.google.com/apppasswords');
              console.error('   Ensure 2-Step Verification is enabled');
            }
          } else {
            console.log('✅ SMTP connection verified successfully');
          }
        });
        
        console.log('📧 SMTP transporter initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize SMTP:', error.message);
        this.smtpTransporter = null;
      }
    } else {
      this.smtpTransporter = null;
    }

    if (!this.brevoConfigured && !this.smtpConfigured) {
      console.warn('❌ No email provider configured. Email features will log to console only.');
    }
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!to) {
        throw new Error('Recipient email is required');
      }

      // Normalize recipient email (keep original for sending, but normalize for logging)
      const recipientEmails = Array.isArray(to) ? to : [to];
      const normalizedRecipients = recipientEmails.map(email => {
        if (typeof email === 'string') {
          return email.toLowerCase().trim();
        }
        return email.email ? email.email.toLowerCase().trim() : email;
      });

      // Try Brevo first if configured
      if (this.brevoConfigured && this.emailApi) {
        try {
          const recipients = recipientEmails.map((recipient) => 
            typeof recipient === 'string' ? { email: recipient } : recipient
          );

          const emailData = new Brevo.SendSmtpEmail();
          emailData.sender = {
            email: this.brevoSenderEmail,
            name: this.brevoSenderName
          };
          emailData.to = recipients;
          emailData.subject = subject;
          if (html) {
            emailData.htmlContent = html;
          }
          if (text) {
            emailData.textContent = text;
          }

          const response = await this.emailApi.sendTransacEmail(emailData);
          console.log(`📧 Email sent via Brevo to ${normalizedRecipients.join(', ')} (${response?.messageId || 'no-id'})`);
          return { success: true, messageId: response?.messageId || null, provider: 'brevo' };
        } catch (brevoError) {
          console.warn('⚠️ Brevo send failed, falling back to SMTP:', brevoError.message);
          // Fall through to SMTP
        }
      }

      // Try SMTP if configured
      if (this.smtpConfigured && this.smtpTransporter) {
        try {
          // Ensure password is clean (no spaces)
          const cleanPassword = this.smtpPass.replace(/\s/g, '');
          
          // Recreate transporter if password changed (shouldn't happen, but safety check)
          if (cleanPassword !== this.smtpPass) {
            this.smtpTransporter = nodemailer.createTransport({
              host: this.smtpHost,
              port: this.smtpPort,
              secure: this.smtpSecure,
              auth: {
                user: this.smtpUser,
                pass: cleanPassword
              },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 10000
            });
          }

          const mailOptions = {
            from: `"${this.smtpFromName}" <${this.smtpUser}>`, // FIX: Always use SMTP_USER for the 'from' email to align with Gmail requirements
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            text: text || '',
            html: html || text || ''
          };

          // Improved logging for clarity
          console.log(`📧 Preparing to send email via SMTP...`);
          console.log(`   - From: "${this.smtpFromName}" <${this.smtpUser}>`);
          console.log(`   - To: ${Array.isArray(to) ? to.join(', ') : to}`);
          
          const info = await this.smtpTransporter.sendMail(mailOptions);
          console.log(`✅ Email sent via SMTP from ${this.smtpFromEmail} to ${normalizedRecipients.join(', ')} (${info.messageId || 'no-id'})`);
          return { success: true, messageId: info.messageId || null, provider: 'smtp' };
        } catch (smtpError) {
          console.error('❌ SMTP send failed:', smtpError.message);
          if (smtpError.code === 'EAUTH' || smtpError.responseCode === 535) {
            console.error('💡 SMTP Authentication Error!');
            console.error('   This usually means:');
            console.error('   1. App Password is incorrect or expired');
            console.error('   2. 2-Step Verification is not enabled');
            console.error('   3. You\'re using regular password instead of App Password');
            console.error('   Solution:');
            console.error('   - Go to: https://myaccount.google.com/apppasswords');
            console.error('   - Create a NEW App Password');
            console.error('   - Copy the 16-character password (NO SPACES!)');
            console.error('   - Update SMTP_PASS in config.env');
            console.error('   - Restart server');
          }
          // Don't throw, return error object instead
          return { 
            success: false, 
            message: smtpError.message || 'SMTP send failed',
            error: smtpError.code || 'SMTP_ERROR',
            provider: 'smtp'
          };
        }
      }

      // Fallback: log to console
      console.warn('📨 No email provider configured. Using fallback logging for email notification.');
      console.log('----- EMAIL (FALLBACK) -----');
      console.log('To      :', normalizedRecipients.join(', '));
      console.log('Subject :', subject);
      if (text) {
        console.log('Text    :', text);
      }
      if (html) {
        console.log('HTML    :', html.substring(0, 500) + (html.length > 500 ? '...' : ''));
      }
      console.log('----------------------------');
      return { success: true, fallback: true, provider: 'console' };
    } catch (error) {
      console.error('❌ sendEmail error:', error);
      return { success: false, message: error.message || 'Failed to send email' };
    }
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database with 5-minute expiration
  async storeOTP(userId, email, otpCode) {
    try {
      // Delete any existing OTPs for this user
      await query('DELETE FROM email_otps WHERE user_id = ? OR email = ?', [userId, email]);
      
      // Create expiration time (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Store new OTP
      await query(
        'INSERT INTO email_otps (user_id, email, otp_code, expires_at) VALUES (?, ?, ?, ?)',
        [userId, email, otpCode, expiresAt]
      );
      
      return true;
    } catch (error) {
      console.error('Error storing OTP:', error);
      return false;
    }
  }

  // Verify OTP
  async verifyOTP(email, otpCode) {
    try {
      const [otps] = await query(
        'SELECT * FROM email_otps WHERE email = ? AND otp_code = ? AND is_used = FALSE AND expires_at > NOW()',
        [email, otpCode]
      );

      if (otps.length === 0) {
        return { success: false, message: 'Invalid or expired OTP' };
      }

      const otp = otps[0];

      // Mark OTP as used
      await query('UPDATE email_otps SET is_used = TRUE WHERE id = ?', [otp.id]);

      return { success: true, userId: otp.user_id };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'OTP verification failed' };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, fullName) {
    try {
      const subject = 'Password Reset - Event Yukk';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - Event Yukk</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px 30px; text-align: center; }
            .reset-box { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; margin: 30px 0; display: inline-block; }
            .reset-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 10px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px; }
            .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
              <p>Event Yukk Security</p>
            </div>
            
            <div class="content">
              <h2>Hello ${fullName}!</h2>
              <p>We received a request to reset your password for your Event Yukk account.</p>
              
              <div class="reset-box">
                <p>Your password reset code is:</p>
                <div class="reset-code">${resetToken}</div>
                <p><small>This code will expire in 15 minutes</small></p>
              </div>
              
              <p>Enter this code on the password reset page to create a new password.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                • If you didn't request this reset, please ignore this email<br>
                • Never share this code with anyone<br>
                • This code expires in 15 minutes<br>
                • Only use this code on the official Event Yukk website
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated message from Event Yukk.<br>
              Please do not reply to this email.</p>
              <p>&copy; 2024 Event Yukk. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      const text = `Password Reset Code: ${resetToken}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this reset, please ignore this email.`;
      
      return await this.sendEmail({
        to: email,
        subject,
        html,
        text
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, message: 'Failed to send password reset email' };
    }
  }

  // Send OTP email
  async sendOTPEmail(email, otpCode, fullName) {
    try {
      console.log(`📤 Attempting to send OTP email to ${email} with code: ${otpCode}`);
      
      const subject = 'Email Verification OTP - Event Yukk';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification OTP - Event Yukk</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: #f5f5f5; 
              line-height: 1.6;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 8px; 
              overflow: hidden; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            .header { 
              background: #1a73e8; 
              padding: 20px; 
              text-align: center; 
              color: white; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 20px; 
              font-weight: 500; 
            }
            .content { 
              padding: 30px 20px; 
              text-align: left; 
            }
            .otp-section {
              text-align: center;
              margin: 25px 0;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 6px;
              border-left: 4px solid #1a73e8;
            }
            .otp-label {
              font-size: 14px;
              color: #5f6368;
              margin-bottom: 8px;
            }
            .otp-code { 
              font-size: 32px; 
              font-weight: 600; 
              letter-spacing: 6px; 
              color: #1a73e8;
              font-family: 'Courier New', monospace;
            }
            .validity {
              font-size: 12px;
              color: #5f6368;
              margin-top: 8px;
            }
            .message {
              color: #3c4043;
              font-size: 14px;
              margin: 20px 0;
            }
            .footer { 
              background: #f8f9fa; 
              padding: 15px 20px; 
              text-align: center; 
              color: #5f6368; 
              font-size: 12px;
              border-top: 1px solid #e8eaed;
            }
            .company {
              font-weight: 500;
              color: #1a73e8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Email Verification OTP</h1>
            </div>
            
            <div class="content">
              <div class="message">
                Your email verification OTP is: <strong>${otpCode}</strong>. Valid for 15 minutes.
              </div>
              
              <div class="otp-section">
                <div class="otp-label">Verification Code</div>
                <div class="otp-code">${otpCode}</div>
                <div class="validity">Valid for 15 minutes</div>
              </div>
              
              <div class="message">
                Enter this code on the verification page to complete your registration.
              </div>
            </div>
            
            <div class="footer">
              <div class="company">Event Yukk Platform</div>
              <div>This is an automated message. Please do not reply.</div>
            </div>
          </div>
        </body>
        </html>
      `;
      const text = `Your email verification OTP is: ${otpCode}. Valid for 15 minutes.`;
      
      return await this.sendEmail({
        to: email,
        subject,
        html,
        text
      });
    } catch (error) {
      console.error('❌ Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send password change OTP email
  async sendPasswordChangeOTP(email, fullName, otpCode) {
    try {
      const subject = 'Kode OTP untuk Ganti Password - Event Yukk';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Change OTP - Event Yukk</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background-color: #f5f5f5; 
              line-height: 1.6;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: white; 
              border-radius: 8px; 
              overflow: hidden; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px; 
              text-align: center; 
              color: white; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 20px; 
              font-weight: 500; 
            }
            .content { 
              padding: 30px 20px; 
              text-align: left; 
            }
            .otp-section {
              text-align: center;
              margin: 25px 0;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 6px;
              border-left: 4px solid #667eea;
            }
            .otp-label {
              font-size: 14px;
              color: #5f6368;
              margin-bottom: 8px;
            }
            .otp-code { 
              font-size: 32px; 
              font-weight: 600; 
              letter-spacing: 6px; 
              color: #667eea;
              font-family: 'Courier New', monospace;
            }
            .validity {
              font-size: 12px;
              color: #5f6368;
              margin-top: 8px;
            }
            .message {
              color: #3c4043;
              font-size: 14px;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px;
              margin: 15px 0;
              border-radius: 4px;
              font-size: 13px;
              color: #856404;
            }
            .footer { 
              background: #f8f9fa; 
              padding: 15px 20px; 
              text-align: center; 
              color: #5f6368; 
              font-size: 12px;
              border-top: 1px solid #e8eaed;
            }
            .company {
              font-weight: 500;
              color: #667eea;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Kode OTP Ganti Password</h1>
            </div>
            
            <div class="content">
              <div class="message">
                Halo <strong>${fullName}</strong>,
              </div>
              
              <div class="message">
                Anda telah meminta untuk mengganti password akun Event Yukk Anda. Gunakan kode OTP berikut untuk melanjutkan:
              </div>
              
              <div class="otp-section">
                <div class="otp-label">Kode OTP Anda</div>
                <div class="otp-code">${otpCode}</div>
                <div class="validity">Berlaku selama 15 menit</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Peringatan Keamanan:</strong><br>
                Jika Anda tidak meminta perubahan password ini, abaikan email ini dan pastikan akun Anda aman.
              </div>
              
              <div class="message">
                Masukkan kode OTP di halaman ganti password untuk menyelesaikan proses perubahan password.
              </div>
            </div>
            
            <div class="footer">
              <div class="company">Event Yukk Platform</div>
              <div>Email ini dikirim secara otomatis. Jangan balas email ini.</div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      return await this.sendEmail({
        to: email,
        subject,
        html,
        text: `Kode OTP untuk ganti password Anda adalah: ${otpCode}. Berlaku selama 15 menit.`
      });
    } catch (error) {
      console.error('Error sending password change OTP:', error);
      throw error;
    }
  }

  // Clean up expired OTPs (can be called periodically)
  async cleanupExpiredOTPs() {
    try {
      await query('DELETE FROM email_otps WHERE expires_at < NOW() OR is_used = TRUE');
      console.log('✅ Expired OTPs cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up OTPs:', error);
    }
  }
}

module.exports = new EmailService();
