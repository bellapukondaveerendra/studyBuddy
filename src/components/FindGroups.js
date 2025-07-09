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
} from "lucide-react";
import { groupsAPI } from "../services/api";

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

  // Sorting and display
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, members, name
  const [viewMode, setViewMode] = useState("grid"); // grid, list

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
      const response = await groupsAPI.findGroups();
      setGroups(response.groups || []);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to fetch study groups";
      showMessage(errorMessage, "error");
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
          return b.member_count - a.member_count;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredGroups(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      concept: "",
      level: "",
      time_commitment: "",
      search: "",
    });
  };

  const handleJoinGroup = async (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to join "${groupName}"?`)) {
      try {
        setJoiningGroup(groupId);
        await groupsAPI.joinGroup(groupId);
        showMessage("Successfully joined the study group!", "success");

        // Refresh groups to update member count
        setTimeout(() => {
          fetchGroups();
        }, 1000);
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Failed to join group";
        showMessage(errorMessage, "error");
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
      <div className="find-groups-loading">
        <div className="loading-spinner"></div>
        <p>Finding study groups...</p>
      </div>
    );
  }

  return (
    <div className="find-groups-container">
      {/* Header */}
      <div className="find-groups-header">
        <div className="header-content">
          <button className="back-button" onClick={() => onNavigate("home")}>
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </button>

          <div className="header-info">
            <h1 className="page-title">Find Study Groups</h1>
            <p className="page-subtitle">
              Discover and join study groups that match your interests and
              schedule
            </p>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`find-groups-message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
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

        <div className="filter-controls">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle ${
              activeFilterCount > 0 ? "has-filters" : ""
            }`}
          >
            <Filter size={16} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="filter-count">{activeFilterCount}</span>
            )}
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <button onClick={fetchGroups} className="refresh-button">
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            {/* Concept Filter */}
            <div className="filter-group">
              <label>Concept/Subject</label>
              <input
                type="text"
                placeholder="e.g., React, Python, Math..."
                value={filters.concept}
                onChange={(e) => handleFilterChange("concept", e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Level Filter */}
            <div className="filter-group">
              <label>Learning Level</label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange("level", e.target.value)}
                className="filter-select"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Time Commitment Filter */}
            <div className="filter-group">
              <label>Time Commitment</label>
              <select
                value={filters.time_commitment}
                onChange={(e) =>
                  handleFilterChange("time_commitment", e.target.value)
                }
                className="filter-select"
              >
                <option value="">Any Time</option>
                <option value="10hrs/wk">10 hours/week</option>
                <option value="15hrs/wk">15 hours/week</option>
                <option value="20hrs/wk">20 hours/week</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="filter-actions">
              <button
                onClick={clearFilters}
                className="clear-filters-btn"
                disabled={activeFilterCount === 0}
              >
                <X size={16} />
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="results-header">
        <div className="results-info">
          <span className="results-count">
            {filteredGroups.length} group
            {filteredGroups.length !== 1 ? "s" : ""} found
          </span>
          {activeFilterCount > 0 && (
            <span className="filter-applied">
              (filtered from {groups.length} total)
            </span>
          )}
        </div>

        <div className="sort-controls">
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
      <div className="groups-container">
        {filteredGroups.length > 0 ? (
          <div className={`groups-grid ${viewMode}`}>
            {filteredGroups.map((group) => (
              <div key={group.group_id} className="group-card">
                <div className="group-card-header">
                  <h3 className="group-title">{group.name}</h3>
                  <span className="member-count">
                    <Users size={14} />
                    {group.member_count}
                  </span>
                </div>

                <div className="group-concept">
                  <BookOpen size={16} />
                  <span>{group.concept}</span>
                </div>

                <div className="group-details-row">
                  <div className="group-detail-item">
                    <TrendingUp size={14} />
                    <span className={`level-badge ${group.level}`}>
                      {group.level}
                    </span>
                  </div>

                  <div className="group-detail-item">
                    <Clock size={14} />
                    <span>{group.time_commitment}</span>
                  </div>
                </div>

                <div className="group-meta">
                  <span className="created-date">
                    Created {new Date(group.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="group-actions">
                  <button
                    onClick={() => onNavigate("group-detail", group.group_id)}
                    className="btn btn-secondary view-details-btn"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => handleJoinGroup(group.group_id, group.name)}
                    disabled={joiningGroup === group.group_id}
                    className="btn btn-primary join-group-btn"
                  >
                    {joiningGroup === group.group_id ? (
                      <>
                        <div className="joining-spinner"></div>
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
          <div className="no-groups-found">
            <Search size={48} />
            <h3>No study groups found</h3>
            <p>
              {activeFilterCount > 0
                ? "Try adjusting your filters to see more results"
                : "Be the first to create a study group!"}
            </p>
            <div className="no-groups-actions">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="btn btn-secondary">
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => onNavigate("create-group")}
                className="btn btn-primary"
              >
                Create Study Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindGroups;
