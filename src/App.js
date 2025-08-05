import React, { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { authAPI, authUtils } from "./services/api";
import Home from "./components/Home";
import CreateGroup from "./components/CreateGroup";
import GroupDetail from "./components/GroupDetail";
import FindGroups from "./components/FindGroups";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import UserDashboard from "./components/UserDashboard"; // Added import
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState("signin");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    if (authUtils.isAuthenticated()) {
      const userData = authUtils.getUser();
      setUser(userData);
      setIsAuthenticated(true);

      // If user is super admin, redirect to admin dashboard
      if (userData?.is_super_admin) {
        setCurrentPage("admin-dashboard");
      } else {
        setCurrentPage("home");
      }
    }
  }, []);

  const handleNavigation = (page, groupId = null) => {
    setCurrentPage(page);
    setSelectedGroupId(groupId);
    setMessage({ text: "", type: "" });
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  // Sign In Component
  const SignIn = () => {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
      setLoading(true);
      setMessage({ text: "", type: "" });

      try {
        const response = await authAPI.signin(
          formData.email,
          formData.password
        );

        if (response.success) {
          // Store authentication data
          authUtils.setAuth(response.token, response.user);
          setUser(response.user);
          setIsAuthenticated(true);
          showMessage(response.message, "success");

          // Navigate based on user role
          setTimeout(() => {
            if (response.user.is_super_admin) {
              setCurrentPage("admin-dashboard");
            } else {
              setCurrentPage("home");
            }
          }, 1000);
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Sign in failed. Please try again.";
        showMessage(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="auth-container signin-bg">
        <div className="auth-card">
          <div className="auth-header">
            <div className="icon-container signin-icon">
              <User size={32} />
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your account</p>
          </div>

          <div className="form-container">
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-container">
                <Mail size={20} className="input-icon-left" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="auth-input"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-container">
                <Lock size={20} className="input-icon-left" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="auth-input with-right-icon"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-icon-right"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`auth-button signin-button ${
                loading ? "loading" : ""
              }`}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </div>

          <div className="auth-link-container">
            <p className="auth-link-text">
              Don't have an account?{" "}
              <span
                onClick={() => setCurrentPage("signup")}
                className="auth-link signin-link"
              >
                Sign up here
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Sign Up Component
  const SignUp = () => {
    const [formData, setFormData] = useState({
      email: "",
      password: "",
      confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
      setMessage({ text: "", type: "" });

      // Client-side validation
      if (formData.password !== formData.confirmPassword) {
        showMessage("Passwords do not match", "error");
        return;
      }

      if (formData.password.length < 6) {
        showMessage("Password must be at least 6 characters long", "error");
        return;
      }

      setLoading(true);

      try {
        const response = await authAPI.signup(
          formData.email,
          formData.password,
          formData.confirmPassword
        );

        if (response.success) {
          showMessage(
            "Account created successfully! You can now sign in.",
            "success"
          );

          // Auto switch to sign in after successful signup
          setTimeout(() => {
            setCurrentPage("signin");
            setMessage({ text: "", type: "" });
          }, 2000);
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Sign up failed. Please try again.";
        showMessage(errorMessage, "error");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="auth-container signup-bg">
        <div className="auth-card">
          <div className="auth-header">
            <div className="icon-container signup-icon">
              <User size={32} />
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join us today</p>
          </div>

          <div className="form-container">
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-container">
                <Mail size={20} className="input-icon-left" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="auth-input"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-container">
                <Lock size={20} className="input-icon-left" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="auth-input with-right-icon"
                  placeholder="Create a password"
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="input-icon-right"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <div className="input-container">
                <Lock size={20} className="input-icon-left" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="auth-input with-right-icon"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="input-icon-right"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`auth-button signup-button ${
                loading ? "loading" : ""
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>

          <div className="auth-link-container">
            <p className="auth-link-text">
              Already have an account?{" "}
              <span
                onClick={() => setCurrentPage("signin")}
                className="auth-link signup-link"
              >
                Sign in here
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Render appropriate component based on authentication and current page
  const renderCurrentPage = () => {
    if (isAuthenticated) {
      if (currentPage === "admin-dashboard") {
        return <SuperAdminDashboard onNavigate={handleNavigation} />;
      } else if (currentPage === "home") {
        return <Home onNavigate={handleNavigation} />;
      } else if (currentPage === "user-dashboard") {
        return <UserDashboard onNavigate={handleNavigation} />;
      } else if (currentPage === "create-group") {
        return (
          <CreateGroup
            onNavigate={handleNavigation}
            onSuccess={() =>
              showMessage(
                "Study group created successfully and submitted for approval!",
                "success"
              )
            }
          />
        );
      } else if (currentPage === "group-detail" && selectedGroupId) {
        return (
          <GroupDetail
            groupId={selectedGroupId}
            onNavigate={handleNavigation}
          />
        );
      } else if (currentPage === "find-groups") {
        return <FindGroups onNavigate={handleNavigation} />;
      }
    }

    // Show authentication pages
    if (currentPage === "signin") {
      return <SignIn />;
    } else if (currentPage === "signup") {
      return <SignUp />;
    }
    // Default fallback
    return <SignIn />;
  };

  return (
    <div className="app-container">
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

      {/* Navigation - Only show for auth pages */}
      {!isAuthenticated && (
        <div className="navigation">
          <div className="nav-container">
            <button
              onClick={() => setCurrentPage("signin")}
              className={`nav-button ${
                currentPage === "signin" ? "active signin" : ""
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setCurrentPage("signup")}
              className={`nav-button ${
                currentPage === "signup" ? "active signup" : ""
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {/* Page Content */}
      {renderCurrentPage()}

      {/* Demo Info - Only show for auth pages */}
      {!isAuthenticated && (
        <div className="demo-info">
          <div className="demo-card">
            <h3 className="demo-title">Demo Info</h3>
            <p className="demo-text">
              <strong>Regular User:</strong> demo@example.com / password123
            </p>
            <p className="demo-text">
              <strong>Super Admin:</strong> superadmin@example.com /
              superadmin123
            </p>
            <p className="demo-small-text">
              Full-stack app with real database authentication and admin
              controls
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
