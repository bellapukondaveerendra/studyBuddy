const nodemailer = require("nodemailer");
const crypto = require("crypto");

const createTransporter = () => {
  return nodemailer.createTransporter({
    // Gmail configuration (for development)
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASS, // Your Gmail app password
    },
  });
};

// Generate invitation token
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Email templates
const emailTemplates = {
  groupInvitation: (
    inviterName,
    inviterEmail,
    groupName,
    concept,
    invitationLink
  ) => {
    return {
      subject: `You're invited to join "${groupName}" study group on StudyBuddy!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .group-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 StudyBuddy Invitation</h1>
              <p>You've been invited to join a study group!</p>
            </div>
            <div class="content">
              <h2>Hi there!</h2>
              <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join their study group on StudyBuddy.</p>
              
              <div class="group-info">
                <h3>📖 ${groupName}</h3>
                <p><strong>Subject:</strong> ${concept}</p>
                <p>Join this group to learn together and achieve your study goals!</p>
              </div>
              
              <p>Click the button below to accept the invitation:</p>
              <a href="${invitationLink}" class="button">Accept Invitation & Join Group</a>
              
              <p><strong>New to StudyBuddy?</strong> Don't worry! The link above will help you create an account and automatically join the group.</p>
              
              <p>If you're not interested, you can simply ignore this email.</p>
              
              <div class="footer">
                <p>This invitation was sent by StudyBuddy on behalf of ${inviterName}</p>
                <p>StudyBuddy - Learn Together, Grow Together</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
You've been invited to join "${groupName}" study group on StudyBuddy!

${inviterName} (${inviterEmail}) has invited you to join their study group.

Group: ${groupName}
Subject: ${concept}

Accept the invitation by visiting: ${invitationLink}

If you're new to StudyBuddy, the link will help you create an account and automatically join the group.

Best regards,
StudyBuddy Team
      `,
    };
  },
};

// Email service functions
const emailService = {
  // Send group invitation email
  sendGroupInvitation: async (
    inviterData,
    groupData,
    inviteeEmail,
    invitationToken
  ) => {
    try {
      const transporter = createTransporter();

      // Create invitation link
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(
        inviteeEmail
      )}`;

      // Get email content
      const emailContent = emailTemplates.groupInvitation(
        inviterData.name || inviterData.email,
        inviterData.email,
        groupData.name,
        groupData.concept,
        invitationLink
      );

      // Send email
      const mailOptions = {
        from: `"StudyBuddy" <${process.env.EMAIL_USER}>`,
        to: inviteeEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      };

      const result = await transporter.sendMail(mailOptions);

      console.log("Invitation email sent:", result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        invitationLink, // For testing purposes
      };
    } catch (error) {
      console.error("Error sending invitation email:", error);
      throw new Error("Failed to send invitation email");
    }
  },

  // Verify email configuration
  verifyEmailConfig: async () => {
    try {
      const transporter = createTransporter();
      await transporter.verify();
      console.log("✅ Email service is ready");
      return true;
    } catch (error) {
      console.error("❌ Email service configuration error:", error);
      return false;
    }
  },

  // Send test email
  sendTestEmail: async (toEmail) => {
    try {
      const transporter = createTransporter();

      const mailOptions = {
        from: `"StudyBuddy" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "StudyBuddy Email Service Test",
        html: `
          <h2>Email Service Working!</h2>
          <p>This is a test email from StudyBuddy.</p>
          <p>If you received this, the email service is configured correctly.</p>
        `,
        text: "Email Service Working! This is a test email from StudyBuddy.",
      };

      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      throw new Error("Failed to send test email: " + error.message);
    }
  },
};

module.exports = {
  emailService,
  generateInvitationToken,
};
