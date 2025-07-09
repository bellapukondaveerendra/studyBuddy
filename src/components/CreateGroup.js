import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  X,
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  Mail,
} from "lucide-react";
import { groupsAPI } from "../services/api";

const CreateGroup = ({ onNavigate, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    concept: "",
    level: "",
    time_commitment: "",
    member_emails: [],
  });
  const [memberStatuses, setMemberStatuses] = useState({}); // Track email statuses
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const addMemberEmail = async () => {
    if (!newMemberEmail.trim()) {
      showMessage("Please enter an email address", "error");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      showMessage("Please enter a valid email address", "error");
      return;
    }

    // Check for duplicates
    if (formData.member_emails.includes(newMemberEmail)) {
      showMessage("This email is already added", "error");
      return;
    }

    setCheckingEmail(true);

    try {
      // Check if email exists in system
      const emailCheck = await groupsAPI.checkEmailExists(newMemberEmail);

      const status = emailCheck.exists ? "existing_user" : "will_invite";

      setFormData({
        ...formData,
        member_emails: [...formData.member_emails, newMemberEmail],
      });

      setMemberStatuses({
        ...memberStatuses,
        [newMemberEmail]: status,
      });

      setNewMemberEmail("");
    } catch (error) {
      console.error("Error checking email:", error);
      // If check fails, still add the email but mark as unknown
      setFormData({
        ...formData,
        member_emails: [...formData.member_emails, newMemberEmail],
      });

      setMemberStatuses({
        ...memberStatuses,
        [newMemberEmail]: "unknown",
      });

      setNewMemberEmail("");
    } finally {
      setCheckingEmail(false);
    }
  };

  const removeMemberEmail = (emailToRemove) => {
    setFormData({
      ...formData,
      member_emails: formData.member_emails.filter(
        (email) => email !== emailToRemove
      ),
    });

    // Remove from status tracking
    const newStatuses = { ...memberStatuses };
    delete newStatuses[emailToRemove];
    setMemberStatuses(newStatuses);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      showMessage("Study group name is required", "error");
      return;
    }

    if (!formData.concept.trim()) {
      showMessage("Concept is required", "error");
      return;
    }

    if (!formData.level) {
      showMessage("Please select a learning level", "error");
      return;
    }

    if (!formData.time_commitment) {
      showMessage("Please select time commitment", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await groupsAPI.createGroup({
        name: formData.name.trim(),
        concept: formData.concept.trim(),
        level: formData.level,
        time_commitment: formData.time_commitment,
        member_emails: formData.member_emails,
      });

      if (response.success) {
        showMessage("Study group created successfully!", "success");

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(response.group);
        }

        // Navigate back to home after 2 seconds
        setTimeout(() => {
          onNavigate("home");
        }, 2000);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to create study group. Please try again.";
      showMessage(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-group-container">
      {/* Header */}
      <div className="create-group-header">
        <div className="header-content">
          <button className="back-button" onClick={() => onNavigate("home")}>
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </button>
          <h1 className="page-title">Create Study Group</h1>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`form-message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Form Content */}
      <div className="form-content">
        <div className="form-card">
          {/* Form Header */}
          <div className="form-header">
            <div className="form-icon">
              <Users size={32} />
            </div>
            <h2>Create Your Study Group</h2>
            <p>
              Set up a new study group and invite members to join your learning
              journey
            </p>
          </div>

          {/* Form Fields */}
          <div className="form-fields">
            {/* Study Group Name */}
            <div className="field-group">
              <label className="field-label">
                <BookOpen size={16} />
                Study Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., React.js Mastery Group"
                className="form-input"
                maxLength={100}
              />
              <small className="field-hint">
                Choose a clear, descriptive name for your study group
              </small>
            </div>

            {/* Concept */}
            <div className="field-group">
              <label className="field-label">
                <BookOpen size={16} />
                Concept/Subject *
              </label>
              <input
                type="text"
                value={formData.concept}
                onChange={(e) => handleInputChange("concept", e.target.value)}
                placeholder="e.g., React.js, Data Structures, Machine Learning"
                className="form-input"
                maxLength={100}
              />
              <small className="field-hint">
                What topic will this group focus on?
              </small>
            </div>

            {/* Level of Learning */}
            <div className="field-group">
              <label className="field-label">
                <TrendingUp size={16} />
                Level of Learning *
              </label>
              <div className="radio-group">
                {["beginner", "intermediate", "advanced"].map((level) => (
                  <label key={level} className="radio-option">
                    <input
                      type="radio"
                      name="level"
                      value={level}
                      checked={formData.level === level}
                      onChange={(e) =>
                        handleInputChange("level", e.target.value)
                      }
                    />
                    <span className="radio-label">
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
              <small className="field-hint">
                Select the appropriate skill level for group members
              </small>
            </div>

            {/* Time Commitment */}
            <div className="field-group">
              <label className="field-label">
                <Clock size={16} />
                Time Commitment *
              </label>
              <div className="radio-group">
                {["10hrs/wk", "15hrs/wk", "20hrs/wk"].map((time) => (
                  <label key={time} className="radio-option">
                    <input
                      type="radio"
                      name="time_commitment"
                      value={time}
                      checked={formData.time_commitment === time}
                      onChange={(e) =>
                        handleInputChange("time_commitment", e.target.value)
                      }
                    />
                    <span className="radio-label">{time}</span>
                  </label>
                ))}
              </div>
              <small className="field-hint">
                How much time per week will members dedicate?
              </small>
            </div>

            {/* Add Members */}
            <div className="field-group">
              <label className="field-label">
                <Users size={16} />
                Add Members (Optional)
              </label>

              {/* Add Member Input */}
              <div className="member-input-container">
                <div className="member-input-group">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Enter member's email address"
                    className="member-input"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMemberEmail();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addMemberEmail}
                    disabled={checkingEmail}
                    className="add-member-btn"
                  >
                    {checkingEmail ? (
                      <div className="checking-spinner"></div>
                    ) : (
                      <>
                        <Plus size={16} />
                        Add
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Member List */}
              {formData.member_emails.length > 0 && (
                <div className="member-list">
                  <div className="member-list-header">
                    <span>Added Members ({formData.member_emails.length})</span>
                  </div>
                  <div className="member-tags">
                    {formData.member_emails.map((email, index) => {
                      const status = memberStatuses[email] || "unknown";
                      return (
                        <div key={index} className={`member-tag ${status}`}>
                          <Mail size={12} />
                          <span>{email}</span>
                          <div className="member-status">
                            {status === "existing_user" && (
                              <span className="status-badge existing">
                                Will Add
                              </span>
                            )}
                            {status === "will_invite" && (
                              <span className="status-badge invite">
                                Will Invite
                              </span>
                            )}
                            {status === "unknown" && (
                              <span className="status-badge unknown">
                                Unknown
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMemberEmail(email)}
                            className="remove-member-btn"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <small className="field-hint">
                Add email addresses of people you'd like to invite to your study
                group
              </small>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`btn btn-primary ${loading ? "loading" : ""}`}
            >
              {loading ? "Creating Group..." : "Create Study Group"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
