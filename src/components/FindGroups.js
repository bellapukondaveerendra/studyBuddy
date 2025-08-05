import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Users,
  BookOpen,
  TrendingUp,
  Clock,
  Plus,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import "./FindGroups.css";

const FindGroups = ({ onNavigate }) => {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    concept: "",
    level: "",
    time_commitment: "",
    search: "",
  });

  // Sorting
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [groups, filters, sortBy]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/findGroups", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        const errorData = await response.json();
        showMessage(
          errorData.message || "Failed to fetch study groups",
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      showMessage("Failed to fetch study groups. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...groups];

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.name.toLowerCase().includes(searchTerm) ||
          group.concept.toLowerCase().includes(searchTerm)
      );
    }

    // Apply level filter
    if (filters.level) {
      filtered = filtered.filter((group) => group.level === filters.level);
    }

    // Apply time commitment filter
    if (filters.time_commitment) {
      filtered = filtered.filter(
        (group) => group.time_commitment === filters.time_commitment
      );
    }

    // Apply concept filter
    if (filters.concept.trim()) {
      const conceptTerm = filters.concept.toLowerCase();
      filtered = filtered.filter((group) =>
        group.concept.toLowerCase().includes(conceptTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "members":
          return (b.member_count || 0) - (a.member_count || 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredGroups(filtered);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      concept: "",
      level: "",
      time_commitment: "",
      search: "",
    });
    setShowFilters(false);
  };

  const handleJoinGroup = async (groupId, groupName) => {
    if (joiningGroup) return;

    const confirmJoin = window.confirm(
      `Are you sure you want to request to join "${groupName}"?`
    );

    if (confirmJoin) {
      setJoiningGroup(groupId);
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`/api/groups/${groupId}/join`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          showMessage(
            data.message || "Join request sent successfully!",
            "success"
          );

          // Refresh groups to update member count
          setTimeout(() => {
            fetchGroups();
          }, 1000);
        } else {
          const errorData = await response.json();
          showMessage(errorData.message || "Failed to join group", "error");
        }
      } catch (error) {
        console.error("Error joining group:", error);
        showMessage("Failed to join group. Please try again.", "error");
      } finally {
        setJoiningGroup(null);
      }
    }
  };

  const activeFilterCount = Object.values(filters).filter((value) =>
    value.trim()
  ).length;

  if (loading) {
    return (
      <div className="find-groups-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <h2>Finding study groups...</h2>
          <p>Please wait while we search for available groups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="find-groups-container">
      {/* Header */}
      <header className="find-groups-header">
        <div className="header-content">
          <button className="back-button" onClick={() => onNavigate("home")}>
            <ArrowLeft size={20} />
            Back to Home
          </button>

          <div className="page-title-section">
            <h1>Find Study Groups</h1>
            <p className="page-subtitle">
              Discover and join study groups that match your interests and
              schedule
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="find-groups-content">
        {/* Message Display */}
        {message.text && (
          <div className={`find-groups-message ${message.type}`}>
            {message.type === "success" ? (
              <AlertCircle size={20} />
            ) : (
              <X size={20} />
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ text: "", type: "" })}
              className="message-close"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="search-filters-section">
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search by group name or concept..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <Filter size={16} />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`filter-toggle ${showFilters ? "active" : ""} ${
                  activeFilterCount > 0 ? "has-filters" : ""
                }`}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="filter-count">{activeFilterCount}</span>
                )}
                {showFilters ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            </div>

            <button onClick={fetchGroups} className="refresh-button">
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="filters-expanded">
              <div className="filter-row">
                <div className="filter-item">
                  <label>Level:</label>
                  <select
                    value={filters.level}
                    onChange={(e) =>
                      handleFilterChange("level", e.target.value)
                    }
                    className="filter-select"
                  >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label>Time Commitment:</label>
                  <select
                    value={filters.time_commitment}
                    onChange={(e) =>
                      handleFilterChange("time_commitment", e.target.value)
                    }
                    className="filter-select"
                  >
                    <option value="">Any Time</option>
                    <option value="10hrs/wk">10hrs/wk</option>
                    <option value="15hrs/wk">15hrs/wk</option>
                    <option value="20hrs/wk">20hrs/wk</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label>Concept:</label>
                  <input
                    type="text"
                    placeholder="Filter by concept..."
                    value={filters.concept}
                    onChange={(e) =>
                      handleFilterChange("concept", e.target.value)
                    }
                    className="filter-select"
                  />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="filter-actions">
                  <button onClick={clearFilters} className="clear-filters-btn">
                    <X size={16} />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="results-section">
          <div className="results-header">
            <div className="results-info">
              <h2>Available Groups</h2>
              <span className="results-count">
                {filteredGroups.length} group
                {filteredGroups.length !== 1 ? "s" : ""} found
                {activeFilterCount > 0 && (
                  <span className="filter-applied">
                    {" "}
                    (filtered from {groups.length} total)
                  </span>
                )}
              </span>
            </div>

            <div className="sort-container">
              <label>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="members">Most Members</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Groups Grid */}
          {filteredGroups.length > 0 ? (
            <div className="groups-grid">
              {filteredGroups.map((group) => (
                <div key={group.group_id} className="group-card">
                  <div className="group-header">
                    <h3 className="group-name">{group.name}</h3>
                    <p className="group-concept">{group.concept}</p>
                  </div>

                  <div className="group-details">
                    <div className="detail-item">
                      <TrendingUp size={16} />
                      <span className={`level-badge ${group.level}`}>
                        {group.level}
                      </span>
                    </div>

                    <div className="detail-item">
                      <Clock size={16} />
                      <span>{group.time_commitment}</span>
                    </div>

                    <div className="detail-item">
                      <Users size={16} />
                      <span>
                        {group.member_count || 1} member
                        {(group.member_count || 1) !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="detail-item">
                      <BookOpen size={16} />
                      <span>
                        Created{" "}
                        {new Date(group.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="group-actions">
                    <button
                      onClick={() => onNavigate("group-detail", group.group_id)}
                      className="view-button"
                    >
                      View Details
                    </button>

                    <button
                      onClick={() =>
                        handleJoinGroup(group.group_id, group.name)
                      }
                      disabled={joiningGroup === group.group_id}
                      className="join-button"
                    >
                      {joiningGroup === group.group_id ? (
                        <>
                          <div className="button-spinner"></div>
                          Joining...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Join Group
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={48} />
              </div>
              <h3>No Study Groups Found</h3>
              <p>
                {activeFilterCount > 0
                  ? "Try adjusting your filters to see more results, or create your own study group to get started."
                  : "Be the first to create a study group and start your learning journey!"}
              </p>
              <div className="empty-actions">
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="secondary-button">
                    <X size={16} />
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => onNavigate("create-group")}
                  className="create-group-button"
                >
                  <Plus size={20} />
                  Create Study Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FindGroups;
