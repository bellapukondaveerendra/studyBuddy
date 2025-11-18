// backend/services/sns.js
const {
  SNSClient,
  PublishCommand,
  CreateTopicCommand,
  SubscribeCommand,
} = require("@aws-sdk/client-sns");

const crypto = require("crypto");

// Initialize SNS client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const SENDER_EMAIL = process.env.SNS_SENDER_EMAIL || "noreply@studybuddy.com";

// Generate invitation token
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const snsService = {
  // Send email via SNS
  sendEmail: async (toEmail, subject, message, htmlMessage = null) => {
    try {
      const params = {
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: subject,
        Message: htmlMessage || message,
        MessageAttributes: {
          email: {
            DataType: "String",
            StringValue: toEmail,
          },
        },
      };

      const command = new PublishCommand(params);
      const response = await snsClient.send(command);

      console.log("SNS email sent:", response.MessageId);
      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      console.error("SNS send email error:", error);
      throw new Error("Failed to send email via SNS");
    }
  },

  // Send group invitation email
  sendGroupInvitation: async (inviterData, groupData, inviteeEmail, invitationToken) => {
    try {
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(
        inviteeEmail
      )}`;

      const subject = `You're invited to join "${groupData.name}" study group on StudyBuddy!`;

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
              <p><strong>${inviterData.name || inviterData.email}</strong> has invited you to join their study group on StudyBuddy.</p>
              
              <div class="group-info">
                <h3>📖 ${groupData.name}</h3>
                <p><strong>Subject:</strong> ${groupData.concept}</p>
                <p>Join this group to learn together and achieve your study goals!</p>
              </div>
              
              <p>Click the button below to accept the invitation:</p>
              <a href="${invitationLink}" class="button">Accept Invitation & Join Group</a>
              
              <p><strong>New to StudyBuddy?</strong> Don't worry! The link above will help you create an account and automatically join the group.</p>
              
              <p>If you're not interested, you can simply ignore this email.</p>
              
              <div class="footer">
                <p>This invitation was sent by StudyBuddy on behalf of ${inviterData.name || inviterData.email}</p>
                <p>StudyBuddy - Learn Together, Grow Together</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const textMessage = `
You've been invited to join "${groupData.name}" study group on StudyBuddy!

${inviterData.name || inviterData.email} has invited you to join their study group.

Group: ${groupData.name}
Subject: ${groupData.concept}

Accept the invitation by visiting: ${invitationLink}

If you're new to StudyBuddy, the link will help you create an account and automatically join the group.

Best regards,
StudyBuddy Team
      `;

      await snsService.sendEmail(inviteeEmail, subject, textMessage, htmlMessage);

      return {
        success: true,
        invitationLink: invitationLink,
      };
    } catch (error) {
      console.error("Send invitation error:", error);
      throw new Error("Failed to send invitation email");
    }
  },

  // Send join request notification to group admin
  sendJoinRequestNotification: async (adminEmail, userName, groupName) => {
    try {
      const subject = `New join request for "${groupName}"`;

      const htmlMessage = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 New Join Request</h1>
            </div>
            <div class="content">
              <p>Hi Admin,</p>
              <p><strong>${userName}</strong> has requested to join your study group <strong>"${groupName}"</strong>.</p>
              <p>Please log in to StudyBuddy to review and respond to this request.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textMessage = `
New join request for "${groupName}"

${userName} has requested to join your study group "${groupName}".

Please log in to StudyBuddy to review and respond to this request.

Best regards,
StudyBuddy Team
      `;

      await snsService.sendEmail(adminEmail, subject, textMessage, htmlMessage);

      return { success: true };
    } catch (error) {
      console.error("Send join request notification error:", error);
      throw new Error("Failed to send notification");
    }
  },

  // Send group approval notification
  sendGroupApprovalNotification: async (creatorEmail, groupName, isApproved, reason = null) => {
    try {
      const subject = isApproved
        ? `Your study group "${groupName}" has been approved!`
        : `Update on your study group "${groupName}"`;

      const htmlMessage = isApproved
        ? `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Group Approved!</h1>
            </div>
            <div class="content">
              <p>Great news!</p>
              <p>Your study group <strong>"${groupName}"</strong> has been approved and is now active.</p>
              <p>You can now invite members and start collaborating!</p>
            </div>
          </div>
        </body>
        </html>
      `
        : `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Group Status Update</h1>
            </div>
            <div class="content">
              <p>We wanted to let you know about your study group <strong>"${groupName}"</strong>.</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              <p>If you have any questions, please contact support.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textMessage = isApproved
        ? `
Great news! Your study group "${groupName}" has been approved and is now active.

You can now invite members and start collaborating!

Best regards,
StudyBuddy Team
      `
        : `
We wanted to let you know about your study group "${groupName}".

${reason ? `Reason: ${reason}` : ""}

If you have any questions, please contact support.

Best regards,
StudyBuddy Team
      `;

      await snsService.sendEmail(creatorEmail, subject, textMessage, htmlMessage);

      return { success: true };
    } catch (error) {
      console.error("Send approval notification error:", error);
      throw new Error("Failed to send approval notification");
    }
  },

  // Send test email
  sendTestEmail: async (toEmail) => {
    try {
      const subject = "StudyBuddy Email Service Test";
      
      const htmlMessage = `
        <h2>Email Service Working!</h2>
        <p>This is a test email from StudyBuddy.</p>
        <p>If you received this, the AWS SNS email service is configured correctly.</p>
      `;

      const textMessage = "Email Service Working! This is a test email from StudyBuddy.";

      const result = await snsService.sendEmail(toEmail, subject, textMessage, htmlMessage);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      throw new Error("Failed to send test email: " + error.message);
    }
  },

  // Verify SNS configuration
  verifySNSConfig: async () => {
    try {
      if (!process.env.SNS_TOPIC_ARN) {
        console.error("❌ SNS_TOPIC_ARN not configured");
        return false;
      }
      console.log("✅ SNS service is configured");
      return true;
    } catch (error) {
      console.error("❌ SNS service configuration error:", error);
      return false;
    }
  },
};

module.exports = {
  snsService,
  generateInvitationToken,
};