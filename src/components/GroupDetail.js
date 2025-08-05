import React, { useState, useEffect } from "react";
// import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  UserPlus,
  Mail,
  Link,
  Plus,
  Trash2,
  MessageCircle,
  FileText,
  Video,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Calendar,
  Globe,
  Lock,
  UserCheck,
  UserX,
  Eye,
} from "lucide-react";
import "./GroupDetail.css";

const GroupDetail = ({ groupId, onNavigate }) => {
  // const { groupId } = useParams();
  // const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Join requests state
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [invitingMember, setInvitingMember] = useState(false);

  // Meeting link state
  const [generatingLink, setGeneratingLink] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  useEffect(() => {
    if (group?.current_user_is_admin && activeTab === "members") {
      fetchJoinRequests();
    }
  }, [group?.current_user_is_admin, activeTab]);

  const fetchGroupDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to load group details");
      }
    } catch (error) {
      console.error("Error fetching group details:", error);
      setError("Failed to load group details. Please try again.");
    }
    setLoading(false);
  };

  const fetchJoinRequests = async () => {
    if (!group?.current_user_is_admin) return;

    setLoadingJoinRequests(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/groups/${groupId}/join-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJoinRequests(data.join_requests || []);
      }
    } catch (error) {
      console.error("Error fetching join requests:", error);
    }
    setLoadingJoinRequests(false);
  };

  const handleBackClick = () => {
    // Try to go back in browser history first
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to dashboard if no history
      if (onNavigate) {
        onNavigate("dashboard");
      }
    }
  };

  const handleApproveJoinRequest = async (requestId) => {
    setProcessingRequest(requestId);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/groups/join-requests/${requestId}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await fetchJoinRequests(); // Refresh join requests
        await fetchGroupDetails(); // Refresh group details to update member count
        alert("Join request approved successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to approve request: ${error.message}`);
      }
    } catch (error) {
      console.error("Error approving join request:", error);
      alert("Failed to approve request. Please try again.");
    }
    setProcessingRequest(null);
  };

  const handleRejectJoinRequest = async (requestId, userEmail) => {
    const reason = window.prompt(
      `Rejecting join request from ${userEmail}.\nOptional reason for rejection:`
    );
    if (reason === null) return; // User cancelled

    setProcessingRequest(requestId);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/groups/join-requests/${requestId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejection_reason: reason,
          }),
        }
      );

      if (response.ok) {
        await fetchJoinRequests(); // Refresh join requests
        alert("Join request rejected successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to reject request: ${error.message}`);
      }
    } catch (error) {
      console.error("Error rejecting join request:", error);
      alert("Failed to reject request. Please try again.");
    }
    setProcessingRequest(null);
  };

  const handleInviteMember = async () => {
    if (!newMemberEmail.trim()) return;

    setInvitingMember(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
        }),
      });

      if (response.ok) {
        setNewMemberEmail("");
        setShowAddMember(false);
        alert("Invitation sent successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to send invitation: ${error.message}`);
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      alert("Failed to send invitation. Please try again.");
    }
    setInvitingMember(false);
  };

  const handleGenerateMeetingLink = async () => {
    setGeneratingLink(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/groups/${groupId}/meeting-link`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchGroupDetails(); // Refresh to get new meeting link
        alert("New meeting link generated successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to generate meeting link: ${error.message}`);
      }
    } catch (error) {
      console.error("Error generating meeting link:", error);
      alert("Failed to generate meeting link. Please try again.");
    }
    setGeneratingLink(false);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_approval: {
        color: "orange",
        icon: AlertCircle,
        text: "Pending Approval",
      },
      active: { color: "green", icon: CheckCircle, text: "Active" },
      rejected: { color: "red", icon: XCircle, text: "Rejected" },
    };

    const badge = badges[status] || badges.pending_approval;
    const Icon = badge.icon;

    return (
      <span className={`status-badge status-${badge.color}`}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="group-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-detail-container">
        <div className="error-state">
          <AlertCircle size={48} className="error-icon" />
          <h2>Unable to Load Group</h2>
          <p>{error}</p>
          <button onClick={handleBackClick} className="back-button">
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="group-detail-container">
        <div className="error-state">
          <AlertCircle size={48} />
          <h2>Group Not Found</h2>
          <p>The requested group could not be found.</p>
          <button onClick={handleBackClick} className="back-button">
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group-detail-container">
      {/* Header */}
      <div className="group-header">
        <button onClick={handleBackClick} className="back-button">
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1>{group?.name}</h1>
      </div>

      {/* Status Messages */}
      {group.status === "pending_approval" && (
        <div className="status-message pending">
          <AlertCircle size={20} />
          <div>
            <strong>Pending Approval</strong>
            <p>
              This group is waiting for super admin approval before it becomes
              public.
            </p>
          </div>
        </div>
      )}

      {group.status === "rejected" && (
        <div className="status-message rejected">
          <XCircle size={20} />
          <div>
            <strong>Group Rejected</strong>
            <p>
              This group was rejected by the super admin and is not available
              for new members.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Eye size={16} />
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          <Users size={16} />
          Members ({group.member_count})
          {group.current_user_is_admin && joinRequests.length > 0 && (
            <span className="notification-badge">{joinRequests.length}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === "resources" ? "active" : ""}`}
          onClick={() => setActiveTab("resources")}
        >
          <BookOpen size={16} />
          Resources
        </button>
        <button
          className={`tab-btn ${activeTab === "discussion" ? "active" : ""}`}
          onClick={() => setActiveTab("discussion")}
        >
          <MessageCircle size={16} />
          Discussion
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="overview-section">
            {/* Meeting Link Section */}
            {group.status === "active" && (
              <div className="overview-card">
                <h3>Meeting Information</h3>
                {group.overview?.meeting_link ? (
                  <div className="meeting-link-section">
                    <div className="meeting-link-info">
                      <Link size={16} />
                      <div>
                        <a
                          href={group.overview.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="meeting-link"
                        >
                          Join Meeting
                        </a>
                        <p className="meeting-link-created">
                          Created:{" "}
                          {formatDate(group.overview.meeting_link_created_at)}
                        </p>
                      </div>
                    </div>
                    {group.current_user_is_admin && (
                      <button
                        onClick={handleGenerateMeetingLink}
                        disabled={generatingLink}
                        className="btn btn-secondary"
                      >
                        {generatingLink ? "Generating..." : "Generate New Link"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="no-meeting-link">
                    <p>No meeting link available</p>
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
            )}

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
                <div className="info-item">
                  <Calendar size={16} />
                  <span>Created: {formatDate(group.created_at)}</span>
                </div>
                <div className="info-item">
                  {group.status === "active" ? (
                    <Globe size={16} />
                  ) : (
                    <Lock size={16} />
                  )}
                  <span>
                    Status: {group.status === "active" ? "Public" : "Private"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div className="members-section">
            <div className="members-header">
              <h3>Members ({group.member_count})</h3>
              {group.current_user_is_admin && group.status === "active" && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="btn btn-primary"
                >
                  <UserPlus size={16} />
                  Invite Member
                </button>
              )}
            </div>

            {/* Join Requests Section (Admin Only) */}
            {group.current_user_is_admin && (
              <div className="join-requests-section">
                <h4>
                  Join Requests
                  {joinRequests.length > 0 && (
                    <span className="request-count">
                      ({joinRequests.length})
                    </span>
                  )}
                </h4>

                {loadingJoinRequests ? (
                  <div className="loading-join-requests">
                    <div className="loading-spinner small"></div>
                    <span>Loading join requests...</span>
                  </div>
                ) : joinRequests.length === 0 ? (
                  <div className="no-join-requests">
                    <UserCheck size={24} />
                    <p>No pending join requests</p>
                  </div>
                ) : (
                  <div className="join-requests-list">
                    {joinRequests.map((request) => (
                      <div key={request._id} className="join-request-card">
                        <div className="request-info">
                          <div className="request-user">
                            <Mail size={16} />
                            <span className="user-email">
                              {request.user_email}
                            </span>
                          </div>
                          <div className="request-date">
                            <Calendar size={14} />
                            <span>
                              Requested: {formatDate(request.requested_at)}
                            </span>
                          </div>
                          {request.message && (
                            <div className="request-message">
                              <MessageCircle size={14} />
                              <span>"{request.message}"</span>
                            </div>
                          )}
                        </div>
                        <div className="request-actions">
                          <button
                            onClick={() =>
                              handleApproveJoinRequest(request._id)
                            }
                            disabled={processingRequest === request._id}
                            className="btn btn-approve"
                          >
                            <CheckCircle size={16} />
                            {processingRequest === request._id
                              ? "Approving..."
                              : "Approve"}
                          </button>
                          <button
                            onClick={() =>
                              handleRejectJoinRequest(
                                request._id,
                                request.user_email
                              )
                            }
                            disabled={processingRequest === request._id}
                            className="btn btn-reject"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                      {invitingMember ? "Sending..." : "Send Invite"}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setNewMemberEmail("");
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Current Members List */}
            <div className="current-members">
              <h4>Current Members</h4>
              <div className="members-list">
                {group.members?.length === 0 ? (
                  <div className="no-members">
                    <Users size={24} />
                    <p>No members found</p>
                  </div>
                ) : (
                  group.members?.map((member) => (
                    <div key={member.user_id} className="member-card">
                      <div className="member-info">
                        <div className="member-avatar">
                          <Users size={20} />
                        </div>
                        <div className="member-details">
                          <span className="member-email">
                            User #{member.user_id}
                          </span>
                          <span className="member-role">
                            {member.is_admin ? "Admin" : "Member"}
                          </span>
                          <span className="member-joined">
                            Joined: {formatDate(member.joined_at)}
                          </span>
                        </div>
                      </div>
                      {member.is_admin && (
                        <span className="admin-badge">
                          <UserCheck size={14} />
                          Admin
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <div className="resources-section">
            <div className="resources-header">
              <h3>Study Resources</h3>
              {group.status === "active" && (
                <button className="btn btn-primary">
                  <Plus size={16} />
                  Add Resource
                </button>
              )}
            </div>

            {group.resources?.length === 0 ? (
              <div className="no-resources">
                <BookOpen size={48} />
                <h4>No resources yet</h4>
                <p>
                  Add study materials, links, and resources to help your group
                  learn together.
                </p>
              </div>
            ) : (
              <div className="resources-list">
                {group.resources?.map((resource) => (
                  <div key={resource._id} className="resource-card">
                    <div className="resource-icon">
                      {resource.type === "video" && <Video size={20} />}
                      {resource.type === "article" && <FileText size={20} />}
                      {resource.type === "link" && <ExternalLink size={20} />}
                      {resource.type === "document" && <FileText size={20} />}
                      {resource.type === "book" && <BookOpen size={20} />}
                    </div>
                    <div className="resource-info">
                      <h4>{resource.title}</h4>
                      <p>{resource.description}</p>
                      <div className="resource-meta">
                        <span>Added by: {resource.uploaded_by_name}</span>
                        <span>•</span>
                        <span>{formatDate(resource.uploaded_at)}</span>
                      </div>
                    </div>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link"
                    >
                      <ExternalLink size={16} />
                      Open
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discussion Tab */}
        {activeTab === "discussion" && (
          <div className="discussion-section">
            <div className="discussion-header">
              <h3>Group Discussion</h3>
            </div>

            {group.status !== "active" ? (
              <div className="discussion-disabled">
                <MessageCircle size={48} />
                <h4>Discussion Not Available</h4>
                <p>Group discussions are only available for active groups.</p>
              </div>
            ) : (
              <div className="discussion-placeholder">
                <MessageCircle size={48} />
                <h4>Coming Soon</h4>
                <p>Group discussion feature will be available soon.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetail;
