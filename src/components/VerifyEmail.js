// src/components/VerifyEmail.js
import React, { useState } from "react";
import { Mail, Lock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { authAPI } from "../services/api";

const VerifyEmail = ({ email, onSuccess, onBackToSignin }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      setMessage({ text: "Please enter a 6-digit code", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await authAPI.confirmEmail(email, code);
      
      setMessage({ text: response.message, type: "success" });
      
      // Redirect to signin after 2 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Verification failed";
      setMessage({ text: errorMessage, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await authAPI.resendCode(email);
      setMessage({ text: response.message, type: "success" });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to resend code";
      setMessage({ text: errorMessage, type: "error" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container verify-bg">
      <div className="auth-card">
        <div className="auth-header">
          <div className="icon-container verify-icon">
            <Mail size={32} />
          </div>
          <h1 className="auth-title">Verify Your Email</h1>
          <p className="auth-subtitle">We sent a code to {email}</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`} style={{ marginBottom: "20px" }}>
            {message.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-container">
          <div className="input-group">
            <label className="input-label">Verification Code</label>
            <div className="input-container">
              <Lock size={20} className="input-icon-left" />
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="auth-input"
                placeholder="Enter 6-digit code"
                maxLength="6"
                pattern="[0-9]{6}"
              />
            </div>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "8px" }}>
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className={`auth-button verify-button ${loading ? "loading" : ""}`}
          >
            {loading ? "Verifying..." : (
              <>
                Verify Email <ArrowRight size={20} style={{ marginLeft: "8px" }} />
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <p style={{ color: "#64748b", marginBottom: "12px" }}>
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            style={{
              background: "none",
              border: "none",
              color: "#6366f1",
              fontWeight: "600",
              cursor: resending ? "not-allowed" : "pointer",
              fontSize: "0.95rem",
              textDecoration: "underline",
            }}
          >
            {resending ? "Sending..." : "Resend Code"}
          </button>
        </div>

        <div className="auth-link-container" style={{ marginTop: "24px" }}>
          <p className="auth-link-text">
            <span
              onClick={onBackToSignin}
              className="auth-link signin-link"
              style={{ cursor: "pointer" }}
            >
              ← Back to Sign In
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;