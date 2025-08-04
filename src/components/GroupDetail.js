import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  FileText,
  MessageCircle,
  BookOpen,
  Clock,
  TrendingUp,
  Crown,
  UserMinus,
  UserPlus,
  Mail,
  Link,
  ExternalLink,
  Trash2,
  Send,
  Plus,
  Copy,
  Save,
  X,
} from "lucide-react";
import { groupsAPI } from "../services/api";

const GroupDetail = ({ groupId, onNavigate }) => {
  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [invitingMember, setInvitingMember] = useState(false);

  // Overview state
  const [generatingLink, setGeneratingLink] = useState(false);

  // Resources state
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResource, setNewResource] = useState({
    type: "link",
    title: "",
    url: "",
    description: "",
  });
  const [addingResource, setAddingResource] = useState(false);

  // Discussion state
  const [discussion, setDiscussion] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Notes state
  const [notes, setNotes] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

  useEffect(() => {
    if (activeTab === "discussion" && group) {
      fetchDiscussion();
    } else if (activeTab === "notes" && group) {
      fetchNotes();
    }
  }, [activeTab, group]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getCompleteGroupDetails(groupId);
      setGroup(response.group);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch group details";
      showMessage(errorMessage, "error");
      if (error.response?.status === 404) {
        setTimeout(() => onNavigate("home"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscussion = async () => {
    try {
      const response = await groupsAPI.getDiscussion(groupId);
      setDiscussion(response.discussion);
    } catch (error) {
      console.error("Error fetching discussion:", error);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await groupsAPI.getNotes(groupId);
      setNotes(response.notes.notes || "");
      setOriginalNotes(response.notes.notes || "");
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleGenerateMeetingLink = async () => {
    try {
      setGeneratingLink(true);
      const response = await groupsAPI.generateMeetingLink(groupId);

      // Update group state with new meeting link
      setGroup((prev) => ({
        ...prev,
        overview: {
          ...prev.overview,
          meeting_link: response.meeting_link,
          meeting_link_created_at: response.created_at,
        },
      }));

      showMessage("Meeting link generated successfully!", "success");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to generate meeting link";
      showMessage(errorMessage, "error");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyMeetingLink = () => {
    if (group.overview?.meeting_link) {
      navigator.clipboard.writeText(group.overview.meeting_link);
      showMessage("Meeting link copied to clipboard!", "success");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        await groupsAPI.removeMember(groupId, memberId);
        showMessage("Member removed successfully", "success");
        fetchGroupDetails(); // Refresh group data
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Failed to remove member";
        showMessage(errorMessage, "error");
      }
    }
  };

  const handleAddResource = async () => {
    if (!newResource.title.trim() || !newResource.url.trim()) {
      showMessage("Title and URL are required", "error");
      return;
    }

    try {
      setAddingResource(true);
      await groupsAPI.addResource(groupId, newResource);

      setNewResource({ type: "link", title: "", url: "", description: "" });
      setShowAddResource(false);
      showMessage("Resource added successfully!", "success");
      fetchGroupDetails(); // Refresh to get updated resources
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to add resource";
      showMessage(errorMessage, "error");
    } finally {
      setAddingResource(false);
    }
  };

  const handleInviteMember = async () => {
    if (!newMemberEmail.trim()) {
      showMessage("Please enter an email address", "error");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail)) {
      showMessage("Please enter a valid email address", "error");
      return;
    }

    try {
      setInvitingMember(true);

      // Check if email is valid first
      const checkResponse = await groupsAPI.checkEmailExists(newMemberEmail);

      if (checkResponse.user) {
        // User exists - add directly to group
        await groupsAPI.joinGroup(groupId, checkResponse.user.user_id);
        showMessage(
          `${newMemberEmail} has been added to the group!`,
          "success"
        );
      } else {
        // User doesn't exist - send invitation
        const inviteResponse = await groupsAPI.inviteMember(
          groupId,
          newMemberEmail
        );
        showMessage(`Invitation sent to ${newMemberEmail}!`, "success");
      }

      // Reset form and refresh group data
      setNewMemberEmail("");
      setShowAddMember(false);
      fetchGroupDetails(); // Refresh to show updated member list
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to invite member";
      console.log("errorMessage", error);
      showMessage(errorMessage, "error");
    } finally {
      setInvitingMember(false);
    }
  };

  const handleRemoveResource = async (resourceId) => {
    if (window.confirm("Are you sure you want to remove this resource?")) {
      try {
        await groupsAPI.removeResource(groupId, resourceId);
        showMessage("Resource removed successfully", "success");
        fetchGroupDetails(); // Refresh group data
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Failed to remove resource";
        showMessage(errorMessage, "error");
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      await groupsAPI.addMessage(groupId, newMessage);
      setNewMessage("");
      fetchDiscussion(); // Refresh discussion
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to send message";
      showMessage(errorMessage, "error");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await groupsAPI.updateNotes(groupId, notes);
      setOriginalNotes(notes);
      showMessage("Notes saved successfully!", "success");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to save notes";
      showMessage(errorMessage, "error");
    } finally {
      setSavingNotes(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="group-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading group details...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-detail-error">
        <p>Group not found</p>
        <button onClick={() => onNavigate("home")} className="btn btn-primary">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="group-detail-container">
      {/* Header */}
      <div className="group-detail-header">
        <div className="header-content">
          <button className="back-button" onClick={() => onNavigate("home")}>
            <ArrowLeft size={20} />
            <span>Back to Groups</span>
          </button>

          <div className="group-header-info">
            <h1 className="group-name">{group.name}</h1>
            <div className="group-meta">
              <span className="concept">{group.concept}</span>
              <span className="level">{group.level}</span>
              <span className="time-commitment">{group.time_commitment}</span>
              <span className="member-count">{group.member_count} members</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`group-message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <div className="tab-container">
          {["overview", "resources", "discussion", "notes"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
            >
              {tab === "overview" && <Users size={16} />}
              {tab === "resources" && <FileText size={16} />}
              {tab === "discussion" && <MessageCircle size={16} />}
              {tab === "notes" && <BookOpen size={16} />}
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="overview-tab">
            <div className="overview-grid">
              {/* Meeting Link Section */}
              <div className="overview-card">
                <h3>Meeting Link</h3>
                {group.overview?.meeting_link ? (
                  <div className="meeting-link-container">
                    <div className="meeting-link">
                      <input
                        type="text"
                        value={group.overview.meeting_link}
                        readOnly
                        className="meeting-link-input"
                      />
                      <button
                        onClick={handleCopyMeetingLink}
                        className="copy-button"
                      >
                        <Copy size={16} />
                        Copy
                      </button>
                    </div>
                    <small>
                      Generated{" "}
                      {formatTime(group.overview.meeting_link_created_at)}
                    </small>
                  </div>
                ) : (
                  <div className="no-meeting-link">
                    <p>No meeting link generated yet</p>
                    {group.current_user_is_admin && (
                      <button
                        onClick={handleGenerateMeetingLink}
                        disabled={generatingLink}
                        className="btn btn-primary"
                      >
                        {generatingLink
                          ? "Generating..."
                          : "Generate Meeting Link"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Group Info Section */}
              <div className="overview-card">
                <h3>Group Information</h3>
                <div className="group-info-grid">
                  <div className="info-item">
                    <BookOpen size={16} />
                    <span>Concept: {group.concept}</span>
                  </div>
                  <div className="info-item">
                    <TrendingUp size={16} />
                    <span>Level: {group.level}</span>
                  </div>
                  <div className="info-item">
                    <Clock size={16} />
                    <span>Time: {group.time_commitment}</span>
                  </div>
                  <div className="info-item">
                    <Users size={16} />
                    <span>Members: {group.member_count}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className="members-section">
              <div className="members-header">
                <h3>Members ({group.member_count})</h3>
                {group.current_user_is_admin && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="btn btn-primary"
                  >
                    <UserPlus size={16} />
                    Add Member
                  </button>
                )}
              </div>

              {/* Add Member Form */}
              {showAddMember && group.current_user_is_admin && (
                <div className="add-member-form">
                  <h4>Invite New Member</h4>
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
                            handleInviteMember();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleInviteMember}
                        disabled={invitingMember}
                        className="add-member-btn"
                      >
                        {invitingMember ? (
                          <div className="loading-spinner-small"></div>
                        ) : (
                          <>
                            <Plus size={16} />
                            Invite
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMember(false);
                        setNewMemberEmail("");
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                  <small className="field-hint">
                    Enter the email address of the person you'd like to invite
                    to this study group
                  </small>
                </div>
              )}

              {/* Existing Members List */}
              <div className="members-list">
                {group.members.map((member) => (
                  <div key={member.user_id} className="member-item">
                    <div className="member-info">
                      <span className="member-name">User {member.user_id}</span>
                      {member.is_admin && (
                        <Crown size={14} className="admin-icon" />
                      )}
                      <span className="join-date">
                        Joined {formatTime(member.joined_at)}
                      </span>
                    </div>

                    {group.current_user_is_admin && !member.is_admin && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="remove-member-btn"
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <div className="resources-tab">
            <div className="resources-header">
              <h3>Shared Resources</h3>
              <button
                onClick={() => setShowAddResource(true)}
                className="btn btn-primary"
              >
                <Plus size={16} />
                Add Resource
              </button>
            </div>

            {/* Add Resource Form */}
            {showAddResource && (
              <div className="add-resource-form">
                <h4>Add New Resource</h4>
                <div className="resource-form-fields">
                  <div className="form-row">
                    <label>Type:</label>
                    <select
                      value={newResource.type}
                      onChange={(e) =>
                        setNewResource({ ...newResource, type: e.target.value })
                      }
                    >
                      <option value="link">Link</option>
                      <option value="file">File</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <label>Title:</label>
                    <input
                      type="text"
                      value={newResource.title}
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          title: e.target.value,
                        })
                      }
                      placeholder="Resource title"
                    />
                  </div>

                  <div className="form-row">
                    <label>URL:</label>
                    <input
                      type="url"
                      value={newResource.url}
                      onChange={(e) =>
                        setNewResource({ ...newResource, url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-row">
                    <label>Description:</label>
                    <textarea
                      value={newResource.description}
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          description: e.target.value,
                        })
                      }
                      placeholder="Optional description"
                      rows="3"
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      onClick={() => setShowAddResource(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddResource}
                      disabled={addingResource}
                      className="btn btn-primary"
                    >
                      {addingResource ? "Adding..." : "Add Resource"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Resources List */}
            <div className="resources-list">
              {group.resources && group.resources.length > 0 ? (
                group.resources.map((resource) => (
                  <div key={resource._id} className="resource-item">
                    <div className="resource-info">
                      <div className="resource-header">
                        <div className="resource-type">
                          {resource.type === "link" ? (
                            <Link size={16} />
                          ) : (
                            <FileText size={16} />
                          )}
                        </div>
                        <h4 className="resource-title">{resource.title}</h4>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resource-link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      {resource.description && (
                        <p className="resource-description">
                          {resource.description}
                        </p>
                      )}

                      <div className="resource-meta">
                        <span>Added by {resource.uploaded_by_name}</span>
                        <span>{formatTime(resource.uploaded_at)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveResource(resource._id)}
                      className="remove-resource-btn"
                      title="Remove resource"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-resources">
                  <FileText size={48} />
                  <h4>No resources shared yet</h4>
                  <p>
                    Be the first to share a helpful resource with your group!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Discussion Tab */}
        {activeTab === "discussion" && (
          <div className="discussion-tab">
            <div className="discussion-container">
              <div className="messages-container">
                {discussion && discussion.messages.length > 0 ? (
                  discussion.messages.map((msg) => (
                    <div key={msg._id} className="message-item">
                      <div className="message-header">
                        <span className="message-author">{msg.user_name}</span>
                        <span className="message-time">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div className="message-content">{msg.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="no-messages">
                    <MessageCircle size={48} />
                    <h4>No messages yet</h4>
                    <p>Start the conversation with your group members!</p>
                  </div>
                )}
              </div>

              <div className="message-input-container">
                <div className="message-input-wrapper">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="message-input"
                    rows="3"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    className="send-message-btn"
                  >
                    <Send size={16} />
                    {sendingMessage ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="notes-tab">
            <div className="notes-header">
              <h3>Personal Notes</h3>
              <p>These notes are private and only visible to you</p>
            </div>

            <div className="notes-container">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your personal notes about this group here..."
                className="notes-textarea"
                rows="15"
              />

              <div className="notes-actions">
                <div className="notes-info">
                  {notes !== originalNotes && (
                    <span className="unsaved-changes">
                      You have unsaved changes
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes || notes === originalNotes}
                  className="btn btn-primary"
                >
                  <Save size={16} />
                  {savingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetail;
