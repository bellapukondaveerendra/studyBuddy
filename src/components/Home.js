import React, { useState, useEffect } from "react";
import { Users, Search, Plus, Clock, BookOpen, TrendingUp } from "lucide-react";
import { groupsAPI, authUtils } from "../services/api";

const Home = ({ onNavigate }) => {
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authUtils.getUser();
    setUser(currentUser);
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsAPI.getMyGroups();
      setUserGroups(response.groups || []);
    } catch (error) {
      console.error("Error fetching user groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authUtils.clearAuth();
    onNavigate("signin");
  };

  return (
    <div className="home-container">
      {/* Header */}
      <div className="home-header">
        <div className="header-content">
          <h1 className="app-title">StudyBuddy</h1>
          <div className="user-info">
            <span className="welcome-text">Welcome, {user?.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="home-content">
        {/* Top Section - Action Cards */}
        <div className="action-section">
          <div className="action-cards">
            {/* Create Study Group Card */}
            <div
              className="action-card create-card"
              onClick={() => onNavigate("create-group")}
            >
              <div className="card-icon create-icon">
                <Plus size={32} />
              </div>
              <h3 className="card-title">Create a Study Group</h3>
              <p className="card-description">
                Start your own study group and invite members to learn together
              </p>
              <div className="card-features">
                <div className="feature">
                  <Users size={16} />
                  <span>Add Members</span>
                </div>
                <div className="feature">
                  <BookOpen size={16} />
                  <span>Choose Concept</span>
                </div>
                <div className="feature">
                  <TrendingUp size={16} />
                  <span>Set Level</span>
                </div>
              </div>
            </div>

            {/* Find Study Group Card */}
            <div
              className="action-card find-card"
              onClick={() => onNavigate("find-groups")}
            >
              <div className="card-icon find-icon">
                <Search size={32} />
              </div>
              <h3 className="card-title">Find a Study Group</h3>
              <p className="card-description">
                Discover and join existing study groups that match your
                interests
              </p>
              <div className="card-features">
                <div className="feature">
                  <Search size={16} />
                  <span>Filter by Topic</span>
                </div>
                <div className="feature">
                  <Clock size={16} />
                  <span>Time Commitment</span>
                </div>
                <div className="feature">
                  <TrendingUp size={16} />
                  <span>Skill Level</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Groups History */}
        <div className="history-section">
          <h2 className="section-title">Your Study Groups</h2>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your groups...</p>
            </div>
          ) : userGroups.length > 0 ? (
            <div className="groups-grid">
              {userGroups.map((group) => (
                <div
                  key={group.group_id}
                  className="group-card clickable"
                  onClick={() => onNavigate("group-detail", group.group_id)}
                >
                  <div className="group-header">
                    <h3 className="group-name">{group.name}</h3>
                    {group.is_admin && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </div>

                  <div className="group-details">
                    <div className="group-info">
                      <div className="info-item">
                        <BookOpen size={16} />
                        <span>{group.concept}</span>
                      </div>
                      <div className="info-item">
                        <TrendingUp size={16} />
                        <span className="level-badge">{group.level}</span>
                      </div>
                      <div className="info-item">
                        <Clock size={16} />
                        <span>{group.time_commitment}</span>
                      </div>
                      <div className="info-item">
                        <Users size={16} />
                        <span>{group.member_count} members</span>
                      </div>
                    </div>
                  </div>

                  <div className="group-footer">
                    <span className="joined-date">
                      Joined {new Date(group.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Users size={48} />
              </div>
              <h3>No Groups Joined Yet</h3>
              <p>
                Start your learning journey by creating or joining a study
                group!
              </p>
              <div className="empty-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => onNavigate("create-group")}
                >
                  Create Study Group
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onNavigate("find-groups")}
                >
                  Find Study Groups
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
