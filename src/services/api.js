import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  signup: async (email, password, confirmPassword) => {
    const response = await api.post("/auth/signup", {
      email,
      password,
      confirmPassword,
    });
    return response.data;
  },

  signin: async (email, password) => {
    const response = await api.post("/auth/signin", {
      email,
      password,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.post("/auth/verify");
    return response.data;
  },

  checkEmail: async (email) => {
    const response = await api.post("/auth/check-email", { email });
    return response.data;
  },
};

// Study Groups API
export const groupsAPI = {
  createGroup: async (groupData) => {
    const response = await api.post("/groups/create", groupData);
    return response.data;
  },

  getAllGroups: async () => {
    const response = await api.get("/groups");
    return response.data;
  },

  // FIXED: Changed from /my-groups to /groups/my-groups to match server route
  getMyGroups: async () => {
    const response = await api.get("/groups/my-groups");
    return response.data;
  },

  joinGroup: async (groupId, message = "") => {
    const response = await api.post(`/groups/${groupId}/join`, { message });
    return response.data;
  },

  getGroupDetails: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  // Join Request APIs
  getJoinRequests: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/join-requests`);
    return response.data;
  },

  approveJoinRequest: async (requestId) => {
    const response = await api.post(
      `/groups/join-requests/${requestId}/approve`
    );
    return response.data;
  },

  rejectJoinRequest: async (requestId, rejectionReason = "") => {
    const response = await api.post(
      `/groups/join-requests/${requestId}/reject`,
      {
        rejection_reason: rejectionReason,
      }
    );
    return response.data;
  },

  getJoinStatus: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/join-status`);
    return response.data;
  },

  // Group Management APIs
  generateMeetingLink: async (groupId) => {
    const response = await api.post(`/groups/${groupId}/meeting-link`);
    return response.data;
  },

  removeMember: async (groupId, memberId) => {
    const response = await api.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  },

  // Invitation APIs
  sendInvitation: async (groupId, email) => {
    const response = await api.post(`/groups/${groupId}/invite`, { email });
    return response.data;
  },

  acceptInvitation: async (token) => {
    const response = await api.post(`/groups/invitations/${token}/accept`);
    return response.data;
  },

  getInvitations: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/invitations`);
    return response.data;
  },

  // Resources APIs
  addResource: async (groupId, resourceData) => {
    const response = await api.post(
      `/groups/${groupId}/resources`,
      resourceData
    );
    return response.data;
  },

  removeResource: async (groupId, resourceId) => {
    const response = await api.delete(
      `/groups/${groupId}/resources/${resourceId}`
    );
    return response.data;
  },

  // Discussion APIs
  getDiscussion: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/discussions`);
    return response.data;
  },

  addMessage: async (groupId, message) => {
    const response = await api.post(`/groups/${groupId}/discussions/messages`, {
      message,
    });
    return response.data;
  },

  // Notes APIs
  getNotes: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/notes`);
    return response.data;
  },

  updateNotes: async (groupId, notes) => {
    const response = await api.put(`/groups/${groupId}/notes`, { notes });
    return response.data;
  },
};

// Super Admin API
export const adminAPI = {
  getAllGroups: async () => {
    const response = await api.get("/admin/groups");
    return response.data;
  },

  getAllUsers: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  approveGroup: async (groupId) => {
    const response = await api.post(`/admin/groups/${groupId}/approve`);
    return response.data;
  },

  rejectGroup: async (groupId, rejectionReason = "") => {
    const response = await api.post(`/admin/groups/${groupId}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  deleteGroup: async (groupId) => {
    const response = await api.delete(`/admin/groups/${groupId}`);
    return response.data;
  },

  promoteUser: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/promote`);
    return response.data;
  },
};

// Authentication utilities
export const authUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");
    return !!(token && userData);
  },

  // Get stored user data
  getUser: () => {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData) : null;
  },

  // Get stored auth token
  getToken: () => {
    return localStorage.getItem("authToken");
  },

  // Store authentication data
  setAuth: (token, user) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userData", JSON.stringify(user));
  },

  // Clear authentication data
  clearAuth: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
  },

  // Check if user is super admin
  isSuperAdmin: () => {
    const user = authUtils.getUser();
    return user?.is_super_admin === true;
  },
};

// Error handling helper
export const handleAPIError = (error, defaultMessage = "An error occurred") => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return defaultMessage;
  }
};

// Export default api instance for custom requests
export default api;
