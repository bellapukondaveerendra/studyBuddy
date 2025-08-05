import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Users,
  BookOpen,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  Settings,
  LogOut,
  User,
  BarChart3,
} from "lucide-react";
import { groupsAPI, authUtils } from "../services/api";

const Home = ({ onNavigate }) => {
  const [recentGroups, setRecentGroups] = useState([]);
  const [stats, setStats] = useState({
    totalGroups: 0,
    myGroups: 0,
    pendingGroups: 0,
  });
  const [loading, setLoading] = useState(true);
  const [user] = useState(authUtils.getUser());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch user's groups
      const myGroupsResponse = await groupsAPI.getMyGroups();
      const myGroups = myGroupsResponse.groups || [];

      // Fetch all public groups for stats
      const allGroupsResponse = await groupsAPI.getAllGroups();
      const allGroups = allGroupsResponse.groups || [];

      // Set recent groups (limit to 3 most recent)
      const sortedGroups = myGroups.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setRecentGroups(sortedGroups.slice(0, 3));

      // Calculate stats
      setStats({
        totalGroups: allGroups.length,
        myGroups: myGroups.filter((g) => g.status === "active").length,
        pendingGroups: myGroups.filter((g) => g.status === "pending_approval")
          .length,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authUtils.clearAuth();
    window.location.reload();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: "Active", className: "status-active" },
      pending_approval: { text: "Pending", className: "status-pending" },
      rejected: { text: "Rejected", className: "status-rejected" },
    };
    return badges[status] || badges.active;
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
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
            <h1 className="app-title">StudyBuddy</h1>
            <p className="welcome-text">
              Welcome back, <strong>{user?.email}</strong>
            </p>
          </div>
          <div className="header-right">
            <button
              onClick={() => onNavigate("user-dashboard")}
              className="header-button dashboard-button"
              title="View My Groups Dashboard"
            >
              <BarChart3 size={20} />
              My Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="header-button logout-button"
              title="Sign Out"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.totalGroups}</div>
              <div className="stat-label">Total Groups</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.myGroups}</div>
              <div className="stat-label">My Active Groups</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats.pendingGroups}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <button
            onClick={() => onNavigate("create-group")}
            className="action-card create-action"
          >
            <div className="action-icon">
              <Plus size={32} />
            </div>
            <h3>Create Study Group</h3>
            <p>Start a new study group and invite members</p>
          </button>

          <button
            onClick={() => onNavigate("find-groups")}
            className="action-card find-action"
          >
            <div className="action-icon">
              <Search size={32} />
            </div>
            <h3>Find Groups</h3>
            <p>Discover and join existing study groups</p>
          </button>

          <button
            onClick={() => onNavigate("user-dashboard")}
            className="action-card dashboard-action"
          >
            <div className="action-icon">
              <User size={32} />
            </div>
            <h3>My Groups</h3>
            <p>Manage your study groups and view status</p>
          </button>
        </div>
      </div>

      {/* Recent Groups */}
      <div className="recent-section">
        <div className="section-header">
          <h2 className="section-title">Recent Groups</h2>
          <button
            onClick={() => onNavigate("user-dashboard")}
            className="view-all-button"
          >
            View All
          </button>
        </div>

        {recentGroups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <BookOpen size={48} />
            </div>
            <h3>No Study Groups Yet</h3>
            <p>
              Create your first study group or join an existing one to get
              started!
            </p>
            <div className="empty-actions">
              <button
                onClick={() => onNavigate("create-group")}
                className="primary-button"
              >
                Create Group
              </button>
              <button
                onClick={() => onNavigate("find-groups")}
                className="secondary-button"
              >
                Find Groups
              </button>
            </div>
          </div>
        ) : (
          <div className="groups-grid">
            {recentGroups.map((group) => (
              <div key={group.group_id} className="group-card">
                <div className="group-header">
                  <div className="group-info">
                    <h3 className="group-name">{group.name}</h3>
                    <p className="group-concept">{group.concept}</p>
                  </div>
                  <div
                    className={`status-badge ${
                      getStatusBadge(group.status).className
                    }`}
                  >
                    {getStatusBadge(group.status).text}
                  </div>
                </div>

                <div className="group-details">
                  <div className="detail-row">
                    <span className="detail-label">Level:</span>
                    <span className="detail-value level-badge">
                      {group.level}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Time:</span>
                    <span className="detail-value">
                      {group.time_commitment}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Members:</span>
                    <span className="detail-value">
                      <Users size={14} />
                      {group.member_count || 1}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">
                      <Calendar size={14} />
                      {formatDate(group.created_at)}
                    </span>
                  </div>
                </div>

                {group.is_admin && (
                  <div className="admin-badge">
                    <Star size={14} />
                    Admin
                  </div>
                )}

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
      </div>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 0;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: white;
          text-align: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-left-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .home-header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding: 20px 30px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .app-title {
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin: 0 0 5px 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .welcome-text {
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
          font-size: 1.1rem;
        }

        .header-right {
          display: flex;
          gap: 12px;
        }

        .header-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dashboard-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .dashboard-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .logout-button {
          background: rgba(220, 53, 69, 0.2);
          color: white;
        }

        .logout-button:hover {
          background: rgba(220, 53, 69, 0.3);
          transform: translateY(-1px);
        }

        .stats-section,
        .actions-section,
        .recent-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.total {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .stat-icon.active {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
        }

        .stat-icon.pending {
          background: linear-gradient(135deg, #ffc107, #fd7e14);
          color: white;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #2d3748;
          line-height: 1;
        }

        .stat-label {
          color: #718096;
          font-weight: 500;
          margin-top: 4px;
        }

        .section-title {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 20px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .view-all-button {
          color: rgba(255, 255, 255, 0.9);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .view-all-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .action-card {
          background: rgba(255, 255, 255, 0.95);
          border: none;
          border-radius: 12px;
          padding: 30px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
        }

        .action-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .create-action .action-icon {
          background: linear-gradient(135deg, #28a745, #20c997);
        }

        .find-action .action-icon {
          background: linear-gradient(135deg, #007bff, #6f42c1);
        }

        .dashboard-action .action-icon {
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .action-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 8px 0;
        }

        .action-card p {
          color: #718096;
          margin: 0;
          line-height: 1.5;
        }

        .groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .group-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
          position: relative;
        }

        .group-card:hover {
          transform: translateY(-2px);
        }

        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .group-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 4px 0;
        }

        .group-concept {
          color: #718096;
          margin: 0;
          font-size: 0.9rem;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-active {
          background: #d4edda;
          color: #155724;
        }

        .status-pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-rejected {
          background: #f8d7da;
          color: #721c24;
        }

        .group-details {
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .detail-label {
          font-size: 0.8rem;
          color: #718096;
          font-weight: 600;
        }

        .detail-value {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #2d3748;
        }

        .level-badge {
          background: #e2e8f0;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          text-transform: capitalize;
        }

        .admin-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          background: linear-gradient(135deg, #ffc107, #fd7e14);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .group-actions {
          display: flex;
          gap: 10px;
        }

        .group-button {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .group-button.primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .group-button.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .group-button.disabled {
          background: #e2e8f0;
          color: #718096;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          color: #718096;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          color: #2d3748;
          font-size: 1.5rem;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #718096;
          margin-bottom: 30px;
          line-height: 1.6;
        }

        .empty-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .primary-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .primary-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .secondary-button {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .secondary-button:hover {
          background: #667eea;
          color: white;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .home-header {
            padding: 15px 20px;
          }

          .header-content {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .stats-section,
          .actions-section,
          .recent-section {
            padding: 20px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .actions-grid {
            grid-template-columns: 1fr;
          }

          .groups-grid {
            grid-template-columns: 1fr;
          }

          .empty-actions {
            flex-direction: column;
            align-items: center;
          }

          .admin-badge {
            position: static;
            margin-bottom: 12px;
            width: fit-content;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
