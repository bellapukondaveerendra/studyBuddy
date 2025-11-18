// src/services/api.js - FINAL WORKING VERSION
import axios from "axios";

// Create axios instance pointing DIRECTLY to backend
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.url}`, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userData");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  signup: async (email, password, confirmPassword, firstName, lastName, dateOfBirth, phoneNumber = "") => {
    const response = await api.post("/auth/signup", {
      email, password, confirmPassword, firstName, lastName, dateOfBirth, phoneNumber,
    });
    return response.data;
  },

  signin: async (email, password) => {
    const response = await api.post("/auth/signin", { email, password });
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

// Groups API
export const groupsAPI = {
  createGroup: async (groupData) => {
    const response = await api.post("/groups/create", groupData);
    return response.data;
  },

  getAllGroups: async () => {
    const response = await api.get("/groups");
    return response.data;
  },

  getMyGroups: async () => {
    const response = await api.get("/groups/my-groups");
    return response.data;
  },

  getGroupById: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  addResource: async (groupId, resourceData) => {
    const response = await api.post(`/groups/${groupId}/resources`, resourceData);
    return response.data;
  },

  deleteResource: async (groupId, resourceId) => {
    const response = await api.delete(`/groups/${groupId}/resources/${resourceId}`);
    return response.data;
  },

  submitJoinRequest: async (groupId, message) => {
    const response = await api.post(`/groups/${groupId}/join`, { message });
    return response.data;
  },

  getJoinRequests: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/join-requests`);
    return response.data;
  },

  approveJoinRequest: async (requestId, groupId, userId) => {
    const response = await api.post(`/groups/join-requests/${requestId}/approve`, {
      group_id: groupId, user_id: userId,
    });
    return response.data;
  },

  rejectJoinRequest: async (requestId) => {
    const response = await api.post(`/groups/join-requests/${requestId}/reject`);
    return response.data;
  },

  getDiscussion: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/discussions`);
    return response.data;
  },

  addMessage: async (groupId, message) => {
    const response = await api.post(`/groups/${groupId}/discussions/messages`, { message });
    return response.data;
  },

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
  isAuthenticated: () => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");
    return !!(token && userData);
  },

  getUser: () => {
    const userData = localStorage.getItem("userData");
    return userData ? JSON.parse(userData) : null;
  },

  getToken: () => {
    return localStorage.getItem("authToken");
  },

  setAuth: (token, user) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userData", JSON.stringify(user));
  },

  clearAuth: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
  },

  isSuperAdmin: () => {
    const user = authUtils.getUser();
    return user?.is_super_admin === true;
  },
};

export const handleAPIError = (error, defaultMessage = "An error occurred") => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return defaultMessage;
  }
};

export default api;