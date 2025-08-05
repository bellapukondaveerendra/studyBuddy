import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Eye,
  Calendar,
  Mail,
  Crown,
  Filter,
  Search,
  RefreshCw,
} from "lucide-react";
import "./SuperAdminDashboard.css";

const SuperAdminDashboard = () => {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("groups");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [processingAction, setProcessingAction] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        console.error("No auth token found");
        alert("Please sign in again");
        window.location.href = "/";
        return;
      }

      // Check user data for super admin status
      const userData = localStorage.getItem("userData");
      if (!userData) {
        alert("Please sign in again");
        window.location.href = "/";
        return;
      }

      let user;
      try {
        user = JSON.parse(userData);
        if (!user.is_super_admin) {
          alert("You don't have super admin permissions");
          window.location.href = "/";
          return;
        }
      } catch (parseError) {
        console.error("Error parsing user data:", parseError);
        alert("Invalid user data. Please sign in again.");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        window.location.href = "/";
        return;
      }

      // Fetch groups with better error handling
      try {
        const groupsResponse = await fetch("/api/admin/groups", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log("Groups response status:", groupsResponse.status);
        console.log(
          "Groups response headers:",
          Object.fromEntries(groupsResponse.headers)
        );

        if (groupsResponse.status === 403) {
          alert("You don't have super admin permissions");
          window.location.href = "/";
          return;
        }

        if (groupsResponse.status === 401) {
          alert("Your session has expired. Please sign in again.");
          localStorage.removeItem("authToken");
          localStorage.removeItem("userData");
          window.location.href = "/";
          return;
        }

        if (!groupsResponse.ok) {
          throw new Error(
            `Groups API returned status ${groupsResponse.status}`
          );
        }

        const groupsText = await groupsResponse.text();
        console.log(
          "Groups raw response (first 200 chars):",
          groupsText.substring(0, 200)
        );

        if (
          groupsText.startsWith("<!DOCTYPE") ||
          groupsText.startsWith("<html")
        ) {
          console.error("Server returned HTML instead of JSON for groups");
          throw new Error(
            "Server returned HTML instead of JSON. This usually means the route doesn't exist or there's a server error."
          );
        }

        try {
          const groupsJson = JSON.parse(groupsText);
          if (groupsJson.success) {
            setGroups(groupsJson.groups || []);
          } else {
            throw new Error(groupsJson.message || "Failed to fetch groups");
          }
        } catch (parseError) {
          console.error("Error parsing groups JSON:", parseError);
          console.error("Raw response:", groupsText);
          throw new Error("Invalid JSON response from groups endpoint");
        }
      } catch (groupsError) {
        console.error("Groups fetch error:", groupsError);
        alert(`Failed to fetch groups: ${groupsError.message}`);
      }

      // Fetch users with better error handling
      try {
        const usersResponse = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log("Users response status:", usersResponse.status);

        if (usersResponse.status === 403) {
          alert("You don't have super admin permissions");
          window.location.href = "/";
          return;
        }

        if (usersResponse.status === 401) {
          alert("Your session has expired. Please sign in again.");
          localStorage.removeItem("authToken");
          localStorage.removeItem("userData");
          window.location.href = "/";
          return;
        }

        if (!usersResponse.ok) {
          throw new Error(`Users API returned status ${usersResponse.status}`);
        }

        const usersText = await usersResponse.text();
        console.log(
          "Users raw response (first 200 chars):",
          usersText.substring(0, 200)
        );

        if (
          usersText.startsWith("<!DOCTYPE") ||
          usersText.startsWith("<html")
        ) {
          console.error("Server returned HTML instead of JSON for users");
          throw new Error(
            "Server returned HTML instead of JSON. Check if /api/admin/users route exists on server."
          );
        }

        try {
          const usersJson = JSON.parse(usersText);
          if (usersJson.success) {
            setUsers(usersJson.users || []);
          } else {
            throw new Error(usersJson.message || "Failed to fetch users");
          }
        } catch (parseError) {
          console.error("Error parsing users JSON:", parseError);
          console.error("Raw response:", usersText);
          throw new Error("Invalid JSON response from users endpoint");
        }
      } catch (usersError) {
        console.error("Users fetch error:", usersError);
        alert(`Failed to fetch users: ${usersError.message}`);
      }
    } catch (error) {
      console.error("General error fetching admin data:", error);
      alert(`Failed to load admin dashboard: ${error.message}`);
    }
    setLoading(false);
  };

  const handleApproveGroup = async (groupId) => {
    setProcessingAction(groupId);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/groups/${groupId}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchData(); // Refresh data
        alert("Group approved successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to approve group: ${error.message}`);
      }
    } catch (error) {
      console.error("Error approving group:", error);
      alert("Failed to approve group. Please try again.");
    }
    setProcessingAction(null);
  };

  const handleRejectGroup = async () => {
    if (!selectedGroup) return;

    setProcessingAction(selectedGroup.group_id);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `/api/admin/groups/${selectedGroup.group_id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejection_reason: rejectionReason,
          }),
        }
      );

      if (response.ok) {
        await fetchData(); // Refresh data
        setShowRejectModal(false);
        setSelectedGroup(null);
        setRejectionReason("");
        alert("Group rejected successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to reject group: ${error.message}`);
      }
    } catch (error) {
      console.error("Error rejecting group:", error);
      alert("Failed to reject group. Please try again.");
    }
    setProcessingAction(null);
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the group "${groupName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setProcessingAction(groupId);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchData(); // Refresh data
        alert("Group deleted successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to delete group: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group. Please try again.");
    }
    setProcessingAction(null);
  };

  const handlePromoteUser = async (userId, userEmail) => {
    if (
      !window.confirm(
        `Are you sure you want to promote ${userEmail} to Super Admin?`
      )
    ) {
      return;
    }

    setProcessingAction(`user-${userId}`);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`/api/admin/users/${userId}/promote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchData(); // Refresh data
        alert("User promoted to Super Admin successfully!");
      } else {
        const error = await response.json();
        alert(`Failed to promote user: ${error.message}`);
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      alert("Failed to promote user. Please try again.");
    }
    setProcessingAction(null);
  };

  const openRejectModal = (group) => {
    setSelectedGroup(group);
    setShowRejectModal(true);
    setRejectionReason("");
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setSelectedGroup(null);
    setRejectionReason("");
  };

  // Filter groups based on status and search term
  const filteredGroups = groups.filter((group) => {
    const matchesStatus =
      filterStatus === "all" || group.status === filterStatus;
    const matchesSearch =
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.creator_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter users based on search term
  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const badges = {
      pending_approval: {
        color: "orange",
        icon: AlertCircle,
        text: "Pending Approval",
      },
      active: { color: "green", icon: CheckCircle, text: "Active" },
      rejected: { color: "red", icon: XCircle, text: "Rejected" },
      archived: { color: "gray", icon: Clock, text: "Archived" },
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="super-admin-dashboard">
        <div className="loading-container">
          <RefreshCw className="loading-spinner" size={48} />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingCount = groups.filter(
    (g) => g.status === "pending_approval"
  ).length;
  const activeCount = groups.filter((g) => g.status === "active").length;
  const totalUsers = users.length;
  const superAdminCount = users.filter((u) => u.is_super_admin).length;

  return (
    <div className="super-admin-dashboard">
      <div className="admin-header">
        <div className="header-title">
          <Shield size={32} />
          <div>
            <h1>Super Admin Dashboard</h1>
            <p>Manage groups, users, and system settings</p>
          </div>
        </div>
        <button onClick={fetchData} className="refresh-btn">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <AlertCircle size={24} />
          <div className="stat-info">
            <h3>{pendingCount}</h3>
            <p>Pending Approvals</p>
          </div>
        </div>
        <div className="stat-card active">
          <CheckCircle size={24} />
          <div className="stat-info">
            <h3>{activeCount}</h3>
            <p>Active Groups</p>
          </div>
        </div>
        <div className="stat-card users">
          <Users size={24} />
          <div className="stat-info">
            <h3>{totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
        <div className="stat-card admins">
          <Crown size={24} />
          <div className="stat-info">
            <h3>{superAdminCount}</h3>
            <p>Super Admins</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "groups" ? "active" : ""}`}
          onClick={() => setActiveTab("groups")}
        >
          <BookOpen size={16} />
          Groups Management
          {pendingCount > 0 && (
            <span className="notification-badge">{pendingCount}</span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={16} />
          Users Management
        </button>
      </div>

      {/* Search and Filter */}
      <div className="controls-bar">
        <div className="search-container">
          <Search size={16} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        {activeTab === "groups" && (
          <div className="filter-container">
            <Filter size={16} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>

      {/* Groups Management Tab */}
      {activeTab === "groups" && (
        <div className="groups-section">
          <div className="section-header">
            <h2>Groups Management</h2>
            <p>{filteredGroups.length} groups found</p>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={48} />
              <h3>No groups found</h3>
              <p>No groups match your current filters.</p>
            </div>
          ) : (
            <div className="groups-list">
              {filteredGroups.map((group) => (
                <div key={group.group_id} className="group-card">
                  <div className="group-header">
                    <div className="group-info">
                      <h3>{group.name}</h3>
                      <p className="group-concept">{group.concept}</p>
                      <div className="group-meta">
                        <span className="group-level">{group.level}</span>
                        <span className="group-time">
                          {group.time_commitment}
                        </span>
                        <span className="group-members">
                          {group.member_count} members
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(group.status)}
                  </div>

                  <div className="group-details">
                    <div className="detail-item">
                      <Mail size={14} />
                      <span>Created by: {group.creator_email}</span>
                    </div>
                    <div className="detail-item">
                      <Calendar size={14} />
                      <span>Created: {formatDate(group.created_at)}</span>
                    </div>
                    <div className="detail-item">
                      <Eye size={14} />
                      <span>Group ID: {group.group_id}</span>
                    </div>
                  </div>

                  {group.status === "rejected" &&
                    group.approval_status?.rejection_reason && (
                      <div className="rejection-reason">
                        <strong>Rejection Reason:</strong>{" "}
                        {group.approval_status.rejection_reason}
                      </div>
                    )}

                  <div className="group-actions">
                    {group.status === "pending_approval" && (
                      <>
                        <button
                          onClick={() => handleApproveGroup(group.group_id)}
                          disabled={processingAction === group.group_id}
                          className="btn btn-approve"
                        >
                          <CheckCircle size={16} />
                          {processingAction === group.group_id
                            ? "Approving..."
                            : "Approve"}
                        </button>
                        <button
                          onClick={() => openRejectModal(group)}
                          disabled={processingAction === group.group_id}
                          className="btn btn-reject"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() =>
                        handleDeleteGroup(group.group_id, group.name)
                      }
                      disabled={processingAction === group.group_id}
                      className="btn btn-delete"
                    >
                      <Trash2 size={16} />
                      {processingAction === group.group_id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Management Tab */}
      {activeTab === "users" && (
        <div className="users-section">
          <div className="section-header">
            <h2>Users Management</h2>
            <p>{filteredUsers.length} users found</p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <Users size={48} />
              <h3>No users found</h3>
              <p>No users match your search criteria.</p>
            </div>
          ) : (
            <div className="users-list">
              {filteredUsers.map((user) => (
                <div key={user.user_id} className="user-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.is_super_admin ? (
                        <Crown size={24} />
                      ) : (
                        <Users size={24} />
                      )}
                    </div>
                    <div className="user-details">
                      <h3>{user.email}</h3>
                      <p>User ID: {user.user_id}</p>
                      <p>Joined: {formatDate(user.created_at)}</p>
                    </div>
                  </div>
                  <div className="user-status">
                    {user.is_super_admin ? (
                      <span className="role-badge super-admin">
                        <Crown size={14} />
                        Super Admin
                      </span>
                    ) : (
                      <span className="role-badge regular">
                        <Users size={14} />
                        Regular User
                      </span>
                    )}
                  </div>
                  <div className="user-actions">
                    {!user.is_super_admin && (
                      <button
                        onClick={() =>
                          handlePromoteUser(user.user_id, user.email)
                        }
                        disabled={processingAction === `user-${user.user_id}`}
                        className="btn btn-promote"
                      >
                        <Crown size={16} />
                        {processingAction === `user-${user.user_id}`
                          ? "Promoting..."
                          : "Promote to Admin"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject Group Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reject Group</h3>
              <button onClick={closeRejectModal} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>
                You are about to reject the group:{" "}
                <strong>{selectedGroup?.name}</strong>
              </p>
              <p>Please provide a reason for rejection:</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason (optional)"
                rows={4}
                className="rejection-textarea"
              />
            </div>
            <div className="modal-actions">
              <button onClick={closeRejectModal} className="btn btn-cancel">
                Cancel
              </button>
              <button
                onClick={handleRejectGroup}
                disabled={processingAction === selectedGroup?.group_id}
                className="btn btn-reject"
              >
                <XCircle size={16} />
                {processingAction === selectedGroup?.group_id
                  ? "Rejecting..."
                  : "Reject Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
