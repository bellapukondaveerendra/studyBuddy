// src/components/VerifyEmail.js
import React, { useState } from "react";
import { Mail, CheckCircle, XCircle, RefreshCw } from "lucide-react";

const VerifyEmail = ({ email, onVerified, onBack }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      setMessage({ text: "Please enter the verification code", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ text: data.message, type: "success" });
        setTimeout(() => {
          onVerified();
        }, 2000);
      } else {
        setMessage({ text: data.message || "Verification failed", type: "error" });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setMessage({ text: "Failed to verify email. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ text: data.message, type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to resend code", type: "error" });
      }
    } catch (error) {
      console.error("Resend error:", error);
      setMessage({ text: "Failed to resend code. Please try again.", type: "error" });
    } finally {
      setResending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <div className="auth-container verification-bg">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="icon-container verification-icon">
            <Mail size={40} />
          </div>
          <h1>Verify Your Email</h1>
          <p className="auth-subtitle">
            We've sent a verification code to <strong>{email}</strong>
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <div className="auth-form">
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={loading}
              className="form-input"
              autoFocus
            />
            <div className="input-hint">
              Check your email for the 6-digit verification code
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !code.trim()}
            className="auth-button verification-button"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <div className="auth-divider">
            <span>Didn't receive the code?</span>
          </div>

          <button
            onClick={handleResendCode}
            disabled={resending}
            className="auth-button secondary-button"
          >
            <RefreshCw size={18} />
            {resending ? "Resending..." : "Resend Code"}
          </button>

          <button
            onClick={onBack}
            disabled={loading || resending}
            className="back-link"
          >
            ← Back to Sign In
          </button>
        </div>

        {/* Help Text */}
        <div className="auth-footer">
          <p className="help-text">
            💡 <strong>Tip:</strong> If you don't see the email, check your spam folder.
            The email comes from AWS Cognito.
          </p>
        </div>
      </div>

      <style jsx>{`
        .verification-bg::before {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .verification-icon {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .auth-subtitle {
          color: #64748b;
          font-size: 0.95rem;
          margin-top: 8px;
        }

        .auth-subtitle strong {
          color: #667eea;
          font-weight: 600;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-weight: 500;
          animation: slideIn 0.3s ease;
        }

        .message.success {
          background-color: #d1fae5;
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .message.error {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }

        .input-hint {
          margin-top: 6px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .verification-button {
          background: linear-gradient(135deg, #10b981, #059669);
        }

        .verification-button:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669, #047857);
        }

        .secondary-button {
          background: #f1f5f9;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .secondary-button:hover:not(:disabled) {
          background: #e2e8f0;
          color: #334155;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          margin: 20px 0;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .auth-divider span {
          padding: 0 12px;
        }

        .back-link {
          background: none;
          border: none;
          color: #667eea;
          font-weight: 500;
          cursor: pointer;
          padding: 10px;
          margin-top: 12px;
          transition: all 0.2s;
        }

        .back-link:hover:not(:disabled) {
          color: #764ba2;
          transform: translateX(-4px);
        }

        .back-link:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }

        .help-text {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default VerifyEmail;