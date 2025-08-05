import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { authAPI } from "../services/api";
import { groupsAPI } from "../services/api";

const UserDashboard = ({ onNavigate }) => {
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    try {
      setLoading(true);

      // Use groupsAPI instead of authAPI - this was the issue!
      const response = await groupsAPI.getMyGroups();

      if (response.success) {
        setMyGroups(response.groups || []);
      } else {
        setMessage({ text: "Failed to fetch your groups", type: "error" });
      }
    } catch (error) {
      console.error("Fetch my groups error:", error);
      setMessage({
        text: "Failed to fetch your groups. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircle className="status-icon active" size={20} />;
      case "pending_approval":
        return <Clock className="status-icon pending" size={20} />;
      case "rejected":
        return <XCircle className="status-icon rejected" size={20} />;
      default:
        return <Clock className="status-icon pending" size={20} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Active";
      case "pending_approval":
        return "Pending Approval";
      case "rejected":
        return "Rejected";
      default:
        return "Unknown";
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case "active":
        return "Your group is active and ready to use!";
      case "pending_approval":
        return "Your group is waiting for super admin approval.";
      case "rejected":
        return "Your group was rejected by the super admin.";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <button onClick={() => onNavigate("home")} className="back-button">
            <ArrowLeft size={20} />
            Back to Home
          </button>
          <h1 className="dashboard-title">My Study Groups</h1>
        </div>

        <div className="loading-container">
          <div className="loading-spinner">
            <RefreshCw className="spinning" size={32} />
          </div>
          <p>Loading your groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Message Display */}
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

      {/* Header */}
      <div className="dashboard-header">
        <button onClick={() => onNavigate("home")} className="back-button">
          <ArrowLeft size={20} />
          Back to Home
        </button>
        <h1 className="dashboard-title">My Study Groups</h1>
        <button
          onClick={fetchMyGroups}
          className="refresh-button"
          disabled={loading}
        >
          <RefreshCw size={20} className={loading ? "spinning" : ""} />
          Refresh
        </button>
      </div>

      {/* Groups List */}
      <div className="dashboard-content">
        {myGroups.length === 0 ? (
          <div className="empty-state">
            <Users size={64} className="empty-icon" />
            <h3>No Study Groups Yet</h3>
            <p>You haven't created or joined any study groups yet.</p>
            <button
              onClick={() => onNavigate("create-group")}
              className="primary-button"
            >
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="groups-grid">
            {myGroups.map((group) => (
              <div
                key={group.group_id}
                className={`group-card ${group.status}`}
              >
                <div className="group-card-header">
                  <div className="group-info">
                    <h3 className="group-name">{group.name}</h3>
                    <p className="group-concept">{group.concept}</p>
                  </div>
                  <div className="group-status">
                    {getStatusIcon(group.status)}
                    <span className={`status-text ${group.status}`}>
                      {getStatusText(group.status)}
                    </span>
                  </div>
                </div>

                <div className="group-card-body">
                  <div className="group-details">
                    <div className="detail-item">
                      <span className="detail-label">Level:</span>
                      <span className="detail-value level-badge">
                        {group.level}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Time Commitment:</span>
                      <span className="detail-value">
                        {group.time_commitment}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Members:</span>
                      <span className="detail-value">
                        <Users size={16} />
                        {group.member_count || 1}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created:</span>
                      <span className="detail-value">
                        <Calendar size={16} />
                        {new Date(group.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="status-description">
                    <p>{getStatusDescription(group.status)}</p>
                  </div>

                  {/* Admin Role Indicator */}
                  {group.is_admin && (
                    <div className="admin-badge">
                      <span>Group Admin</span>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {group.status === "rejected" &&
                    group.approval_status?.rejection_reason && (
                      <div className="rejection-reason">
                        <strong>Rejection Reason:</strong>
                        <p>{group.approval_status.rejection_reason}</p>
                      </div>
                    )}
                </div>

                <div className="group-card-actions">
                  {group.status === "active" ? (
                    <button
                      onClick={() => onNavigate("group-detail", group.group_id)}
                      className="primary-button"
                    >
                      View Group
                    </button>
                  ) : (
                    <button className="secondary-button" disabled>
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

      {/* Summary Stats */}
      {myGroups.length > 0 && (
        <div className="dashboard-stats">
          <div className="stat-item">
            <div className="stat-number">
              {myGroups.filter((g) => g.status === "active").length}
            </div>
            <div className="stat-label">Active Groups</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              {myGroups.filter((g) => g.status === "pending_approval").length}
            </div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              {myGroups.filter((g) => g.is_admin).length}
            </div>
            <div className="stat-label">Admin Of</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: 500;
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          min-width: 300px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .message.success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .back-button,
        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .back-button:hover,
        .refresh-button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .dashboard-title {
          color: white;
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: white;
          text-align: center;
        }

        .loading-spinner {
          margin-bottom: 20px;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .dashboard-content {
          margin-bottom: 30px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
        }

        .empty-icon {
          opacity: 0.6;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          margin-bottom: 10px;
        }

        .empty-state p {
          opacity: 0.8;
          margin-bottom: 30px;
        }

        .groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .group-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #667eea;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .group-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .group-card.pending_approval {
          border-left-color: #ffc107;
        }

        .group-card.rejected {
          border-left-color: #dc3545;
        }

        .group-card.active {
          border-left-color: #28a745;
        }

        .group-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .group-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 4px 0;
        }

        .group-concept {
          color: #718096;
          margin: 0;
          font-size: 0.9rem;
        }

        .group-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .status-icon.active {
          color: #28a745;
        }

        .status-icon.pending {
          color: #ffc107;
        }

        .status-icon.rejected {
          color: #dc3545;
        }

        .status-text.active {
          color: #28a745;
        }

        .status-text.pending_approval {
          color: #ffc107;
        }

        .status-text.rejected {
          color: #dc3545;
        }

        .group-card-body {
          margin-bottom: 20px;
        }

        .group-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 0.75rem;
          color: #718096;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          color: #2d3748;
        }

        .level-badge {
          background: #e2e8f0;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          text-transform: capitalize;
          width: fit-content;
        }

        .status-description {
          background: #f7fafc;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .status-description p {
          margin: 0;
          font-size: 0.9rem;
          color: #4a5568;
        }

        .admin-badge {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
          margin-bottom: 12px;
        }

        .rejection-reason {
          background: #fed7d7;
          border: 1px solid #feb2b2;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .rejection-reason strong {
          color: #c53030;
          font-size: 0.85rem;
        }

        .rejection-reason p {
          color: #742a2a;
          margin: 4px 0 0 0;
          font-size: 0.9rem;
        }

        .group-card-actions {
          display: flex;
          gap: 10px;
        }

        .primary-button {
          flex: 1;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 20px;
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
          flex: 1;
          background: #e2e8f0;
          color: #718096;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: not-allowed;
        }

        .dashboard-stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 30px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-item {
          text-align: center;
          color: white;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 0.9rem;
          opacity: 0.9;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .groups-grid {
            grid-template-columns: 1fr;
          }

          .group-details {
            grid-template-columns: 1fr;
          }

          .dashboard-stats {
            flex-direction: column;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default UserDashboard;
