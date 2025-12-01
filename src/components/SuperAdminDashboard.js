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
  LogOut,
  ChevronDown,
  ChevronUp,
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
  const [viewingGroup, setViewingGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupResources, setGroupResources] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    fetchData();
  }, []);


  const toggleGroupExpanded = (groupId) => {
  setExpandedGroups(prev => ({
    ...prev,
    [groupId]: !prev[groupId]
  }));
};

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
        const groupsResponse = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/groups`, {
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
        const usersResponse = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/users`, {
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
  const handleLogout = () => {
  if (window.confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    window.location.href = "/";
  }
};

  const handleApproveGroup = async (groupId) => {
    setProcessingAction(groupId);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/groups/${groupId}/approve`, {
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
      const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/groups/${selectedGroup.group_id}/reject`, {
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
const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/groups/${groupId}`, {
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

  const handleDeleteResource = async (groupId, resourceId, resourceTitle) => {
  if (!window.confirm(`Delete resource "${resourceTitle}"?\n\nThis action cannot be undone.`)) {
    return;
  }

  setProcessingAction(resourceId);

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || "/api"}/admin/groups/${groupId}/resources/${resourceId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      alert("Resource deleted successfully");
      await fetchData(); // Refresh groups list
    } else {
      alert(data.message || "Failed to delete resource");
    }
  } catch (error) {
    console.error("Delete resource error:", error);
    alert("Failed to delete resource. Please try again.");
  } finally {
    setProcessingAction(null);
  }
};

  // Add function to view group details:
const viewGroupDetails = async (group) => {
  setViewingGroup(group);
  
  // Fetch group members
  try {
    const token = localStorage.getItem("authToken");
    const membersResponse = await fetch(
      `${process.env.REACT_APP_API_URL || "/api"}/groups/${group.group_id}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const membersData = await membersResponse.json();
    setGroupMembers(membersData.members || []);
    setGroupResources(group.resources || []);
  } catch (error) {
    console.error("Error fetching group details:", error);
  }
};

// Add function to remove member:
const handleRemoveMember = async (groupId, userId, memberEmail) => {
  if (!window.confirm(`Remove member "${memberEmail}" from this group?`)) {
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || "/api"}/admin/groups/${groupId}/members/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      alert("Member removed successfully");
      viewGroupDetails(viewingGroup); // Refresh
    } else {
      alert(data.message || "Failed to remove member");
    }
  } catch (error) {
    console.error("Remove member error:", error);
    alert("Failed to remove member");
  }
};

// Add function to remove resource:
const handleRemoveResource = async (groupId, resourceId, resourceTitle) => {
  if (!window.confirm(`Remove resource "${resourceTitle}"?`)) {
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || "/api"}/admin/groups/${groupId}/resources/${resourceId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      alert("Resource removed successfully");
      await fetchData(); // Refresh all data
      if (viewingGroup) {
        const updatedGroup = groups.find(g => g.group_id === groupId);
        if (updatedGroup) viewGroupDetails(updatedGroup);
      }
    } else {
      alert(data.message || "Failed to remove resource");
    }
  } catch (error) {
    console.error("Remove resource error:", error);
    alert("Failed to remove resource");
  }
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
const response = await fetch(`${process.env.REACT_APP_API_URL || '/api'}/admin/users/${userId}/promote`, {
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

  const handleDeleteUser = async (userId, email) => {
  const confirmDelete = window.confirm(
    `Are you sure you want to delete user "${email}"?\n\nThis action CANNOT be undone. The user will lose access immediately.`
  );

  if (!confirmDelete) return;

  const confirmAgain = window.confirm(
    `FINAL CONFIRMATION: Delete user "${email}"?`
  );

  if (!confirmAgain) return;

  setProcessingAction(userId);

  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL || "/api"}/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      alert(`User "${email}" has been deleted successfully.`);
      await fetchData(); // Refresh the users list
    } else {
      alert(data.message || "Failed to delete user");
    }
  } catch (error) {
    console.error("Delete user error:", error);
    alert("Failed to delete user. Please try again.");
  } finally {
    setProcessingAction(null);
  }
};

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
  <div style={{ display: 'flex', gap: '12px' }}>
    <button onClick={fetchData} className="refresh-btn">
      <RefreshCw size={16} />
      Refresh
    </button>
    <button onClick={handleLogout} className="logout-btn">
      <LogOut size={16} />
      Logout
    </button>
  </div>
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
          <span className="group-time">{group.time_commitment}</span>
          <span className="group-members">
            {group.member_count || 0} members
          </span>
        </div>
      </div>
      <div className="status-badge status-{group.status === 'pending_approval' ? 'orange' : group.status === 'active' ? 'green' : group.status === 'rejected' ? 'red' : 'gray'}">
        {group.status === "pending_approval" && (
          <>
            <Clock size={14} />
            Pending
          </>
        )}
        {group.status === "active" && (
          <>
            <CheckCircle size={14} />
            Active
          </>
        )}
        {group.status === "rejected" && (
          <>
            <XCircle size={14} />
            Rejected
          </>
        )}
      </div>
    </div>

    <div className="group-details">
      <div className="detail-item">
        <Mail size={14} />
        <span>Creator: {group.creator_email}</span>
      </div>
      <div className="detail-item">
        <Calendar size={14} />
        <span>Created: {formatDate(group.created_at)}</span>
      </div>
      {group.rejection_reason && (
        <div className="rejection-reason">
          <strong>Rejection Reason:</strong> {group.rejection_reason}
        </div>
      )}
    </div>

    {/* NEW: Resources Section */}
    {group.resources && group.resources.length > 0 && (
      <div className="group-resources-section">
        <button
          onClick={() => toggleGroupExpanded(group.group_id)}
          className="toggle-resources-btn"
        >
          <BookOpen size={16} />
          <span>{group.resources.length} Resources</span>
          {expandedGroups[group.group_id] ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </button>

        {expandedGroups[group.group_id] && (
          <div className="resources-list">
            {group.resources.map((resource) => (
              <div key={resource.resource_id} className="resource-item">
                <div className="resource-info">
                  <div className="resource-type-badge">
                    {resource.type}
                  </div>
                  <div className="resource-details">
                    <strong>{resource.title}</strong>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-link"
                    >
                      {resource.url.length > 50
                        ? resource.url.substring(0, 50) + "..."
                        : resource.url}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleDeleteResource(
                      group.group_id,
                      resource.resource_id,
                      resource.title
                    )
                  }
                  disabled={processingAction === resource.resource_id}
                  className="btn-delete-resource"
                >
                  <Trash2 size={14} />
                  {processingAction === resource.resource_id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
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
        onClick={() => handleDeleteGroup(group.group_id, group.name)}
        disabled={processingAction === group.group_id}
        className="btn btn-delete"
      >
        <Trash2 size={16} />
        {processingAction === group.group_id ? "Deleting..." : "Delete"}
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
                <div className="user-card">
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
                      <span className="status-badge status-admin">
                        <Crown size={14} />
                        Super Admin
                      </span>
                    ) : (
                      <span className="status-badge status-user">
                        <Users size={14} />
                        User
                      </span>
                    )}
                  </div>
                  
                  {/* ADD DELETE BUTTON - Only show for non-super-admins */}
                  {!user.is_super_admin && (
                    <div className="user-actions">
                      <button
                        onClick={() => handleDeleteUser(user.user_id, user.email)}
                        disabled={processingAction === user.user_id}
                        className="btn btn-delete"
                      >
                        <Trash2 size={16} />
                        {processingAction === user.user_id ? "Deleting..." : "Delete User"}
                      </button>
                    </div>
                  )}
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
