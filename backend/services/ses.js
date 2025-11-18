// backend/services/ses.js
const {
  SESClient,
  SendEmailCommand,
  VerifyEmailIdentityCommand,
} = require("@aws-sdk/client-ses");

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const SENDER_EMAIL = process.env.SNS_SENDER_EMAIL || "ccproj2025@gmail.com";

const sesService = {
  // Send email via SES
  sendEmail: async (toEmail, subject, textMessage, htmlMessage = null) => {
    try {
      const params = {
        Source: SENDER_EMAIL,
        Destination: {
          ToAddresses: [toEmail],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: textMessage,
              Charset: "UTF-8",
            },
            ...(htmlMessage && {
              Html: {
                Data: htmlMessage,
                Charset: "UTF-8",
              },
            }),
          },
        },
      };

      const command = new SendEmailCommand(params);
      const response = await sesClient.send(command);

      console.log("SES email sent:", response.MessageId);
      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      console.error("SES send email error:", error);
      
      // Helpful error messages for sandbox mode
      if (error.message.includes("Email address is not verified")) {
        throw new Error(
          `Email ${toEmail} is not verified. In SES Sandbox mode, you can only send to verified emails. Please verify ${toEmail} in AWS SES Console.`
        );
      }
      
      throw new Error("Failed to send email via SES: " + error.message);
    }
  },

  // Send group invitation email
  sendGroupInvitation: async (inviterData, groupData, inviteeEmail) => {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const invitationToken = require("crypto").randomBytes(32).toString("hex");
    const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(
      inviteeEmail
    )}`;

    const subject = `You're invited to join "${groupData.name}" study group!`;

    const htmlMessage = `
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
            <p><strong>${inviterData.name || inviterData.email}</strong> has invited you to join their study group.</p>
            
            <div class="group-info">
              <h3>📖 ${groupData.name}</h3>
              <p><strong>Subject:</strong> ${groupData.concept}</p>
              <p><strong>Level:</strong> ${groupData.level}</p>
            </div>
            
            <p>Click the link below to accept:</p>
            <a href="${invitationLink}" class="button">Accept Invitation</a>
            
            <p>Or copy this link: ${invitationLink}</p>
            
            <div class="footer">
              <p>StudyBuddy - Learn Together, Grow Together</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textMessage = `
You're invited to join "${groupData.name}" study group!

${inviterData.name || inviterData.email} has invited you to join their study group.

Group: ${groupData.name}
Subject: ${groupData.concept}
Level: ${groupData.level}

Accept the invitation by visiting: ${invitationLink}

Best regards,
StudyBuddy Team
    `;

    await sesService.sendEmail(inviteeEmail, subject, textMessage, htmlMessage);

    return {
      success: true,
      invitationLink: invitationLink,
      invitationToken: invitationToken,
    };
  },

  // Send test email
  sendTestEmail: async (toEmail = SENDER_EMAIL) => {
    const subject = "StudyBuddy SES Test Email";
    
    const htmlMessage = `
      <h2>✅ Email Service Working!</h2>
      <p>This is a test email from StudyBuddy.</p>
      <p>If you received this, AWS SES is configured correctly.</p>
      <p><strong>Sender:</strong> ${SENDER_EMAIL}</p>
      <p><strong>Receiver:</strong> ${toEmail}</p>
    `;

    const textMessage = `
✅ Email Service Working!

This is a test email from StudyBuddy.
If you received this, AWS SES is configured correctly.

Sender: ${SENDER_EMAIL}
Receiver: ${toEmail}
    `;

    return await sesService.sendEmail(toEmail, subject, textMessage, htmlMessage);
  },

  // Verify SES configuration
  verifySESConfig: async () => {
    try {
      if (!SENDER_EMAIL) {
        console.error("❌ SNS_SENDER_EMAIL not configured");
        return false;
      }
      console.log("✅ SES service is configured");
      console.log(`📧 Sender email: ${SENDER_EMAIL}`);
      return true;
    } catch (error) {
      console.error("❌ SES service configuration error:", error);
      return false;
    }
  },
};

module.exports = { sesService };