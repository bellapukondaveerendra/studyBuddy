import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  Clock,
  Plus,
  Search,
  Folder,
  LogOut,
  BarChart3,
  Crown,
  TrendingUp,
} from "lucide-react";
import "./Home.css";

const Home = ({ onNavigate }) => {
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({
    totalGroups: 0,
    myGroups: 0,
    pendingGroups: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
    fetchUserGroups();
  }, []);

  const loadUserData = () => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    setUser(userData);
  };

  const fetchUserGroups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/groups/my-groups", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);

        // Calculate stats
        const totalGroups = data.groups?.length || 0;
        const activeGroups =
          data.groups?.filter((g) => g.status === "active").length || 0;
        const pendingGroups =
          data.groups?.filter((g) => g.status === "pending_approval").length ||
          0;

        setStats({
          totalGroups,
          myGroups: activeGroups,
          pendingGroups,
        });
      } else {
        console.error("Failed to fetch groups");
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    onNavigate("signin");
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h2>Loading your dashboard...</h2>
          <p>Please wait while we fetch your study groups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <div className="header-left">
            <h1>StudyBuddy</h1>
            <p className="welcome-text">
              Welcome back, {user?.email || "Student"}!
            </p>
          </div>
          <div className="header-right">
            {user?.is_super_admin && (
              <button
                onClick={() => onNavigate("super-admin-dashboard")}
                className="header-button admin-button"
              >
                <Crown size={20} />
                Admin Dashboard
              </button>
            )}
            <button
              onClick={() => onNavigate("dashboard")}
              className="header-button dashboard-button"
            >
              <BarChart3 size={20} />
              My Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="header-button logout-button"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <Users size={28} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalGroups}</div>
              <div className="stat-label">Total Groups</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <BookOpen size={28} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.myGroups}</div>
              <div className="stat-label">Active Groups</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              <Clock size={28} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.pendingGroups}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <div
            className="action-card create-action"
            onClick={() => onNavigate("create-group")}
          >
            <div className="action-icon">
              <Plus size={32} />
            </div>
            <h3 className="action-title">Create Study Group</h3>
            <p className="action-description">
              Start a new study group and invite members to collaborate on your
              learning journey
            </p>
          </div>

          <div
            className="action-card find-action"
            onClick={() => onNavigate("find-groups")}
          >
            <div className="action-icon">
              <Search size={32} />
            </div>
            <h3 className="action-title">Find Groups</h3>
            <p className="action-description">
              Discover and join existing study groups that match your interests
              and goals
            </p>
          </div>

          <div
            className="action-card groups-action"
            onClick={() => onNavigate("dashboard")}
          >
            <div className="action-icon">
              <Folder size={32} />
            </div>
            <h3 className="action-title">My Groups</h3>
            <p className="action-description">
              Manage your study groups, view status, and access group resources
            </p>
          </div>
        </div>
      </section>

      {/* Recent Groups */}
      <section className="recent-section">
        <div className="section-header">
          <h2 className="section-title">Recent Groups</h2>
          <button
            onClick={() => onNavigate("dashboard")}
            className="view-all-button"
          >
            View All Groups
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="empty-state">
            <h3>No Study Groups Yet</h3>
            <p>
              You haven't joined any study groups yet. Create your first group
              or browse existing ones to start your collaborative learning
              journey!
            </p>
            <div className="empty-actions">
              <button
                onClick={() => onNavigate("create-group")}
                className="primary-button"
              >
                <Plus size={20} />
                Create Group
              </button>
              <button
                onClick={() => onNavigate("find-groups")}
                className="secondary-button"
              >
                <Search size={20} />
                Find Groups
              </button>
            </div>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.slice(0, 6).map((group) => (
              <div key={group.group_id} className="group-card">
                {group.current_user_is_admin && (
                  <div className="admin-badge">
                    <Crown size={14} />
                    ADMIN
                  </div>
                )}

                <div className="group-header">
                  <h3 className="group-name">{group.name}</h3>
                  <p className="group-concept">{group.concept}</p>
                </div>

                <div className="group-details">
                  <div className="detail-item">
                    <TrendingUp size={16} />
                    Level: {group.level}
                  </div>
                  <div className="detail-item">
                    <Clock size={16} />
                    Time: {group.time_commitment}
                  </div>
                  <div className="detail-item">
                    <Users size={16} />
                    Members: {group.member_count || 1}
                  </div>
                  <div className="detail-item">
                    <BookOpen size={16} />
                    Created: {new Date(group.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="group-actions">
                  {group.status === "active" ? (
                    <button
                      onClick={() => onNavigate("group-detail", group.group_id)}
                      className="group-button primary"
                    >
                      View Group
                    </button>
                  ) : (
                    <button className="group-button disabled" disabled>
                      {group.status === "pending_approval"
                        ? "Awaiting Approval"
                        : "Rejected"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
