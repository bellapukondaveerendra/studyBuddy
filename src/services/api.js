import axios from "axios";

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("studybuddy_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("studybuddy_token");
      localStorage.removeItem("studybuddy_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
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

  verifyToken: async () => {
    const response = await api.post("/auth/verify");
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },
};

// Study Groups API calls
export const groupsAPI = {
  createGroup: async (groupData) => {
    const response = await api.post("/groups/create", groupData);
    return response.data;
  },

  findGroups: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });

    const response = await api.get(`/findGroups?${params}`);
    return response.data;
  },

  getMyGroups: async () => {
    const response = await api.get("/my-groups");
    return response.data;
  },

  joinGroup: async (groupId) => {
    const response = await api.post(`/groups/join/${groupId}`);
    return response.data;
  },

  getGroupDetails: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  // New Group Detail APIs
  getCompleteGroupDetails: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/details`);
    return response.data;
  },

  generateMeetingLink: async (groupId) => {
    const response = await api.post(`/groups/${groupId}/meeting-link`);
    return response.data;
  },

  removeMember: async (groupId, memberId) => {
    const response = await api.delete(`/groups/${groupId}/members/${memberId}`);
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
    const response = await api.get(`/groups/${groupId}/discussion`);
    return response.data;
  },

  addMessage: async (groupId, message) => {
    const response = await api.post(`/groups/${groupId}/discussion/messages`, {
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

  // Invitation related APIs
  checkEmailExists: async (email) => {
    const response = await api.post("/users/check-email", { email });
    return response.data;
  },

  getGroupInvitations: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/invitations`);
    return response.data;
  },
};

// Utility functions
export const authUtils = {
  isAuthenticated: () => {
    const token = localStorage.getItem("studybuddy_token");
    return !!token;
  },

  getUser: () => {
    const user = localStorage.getItem("studybuddy_user");
    return user ? JSON.parse(user) : null;
  },

  setAuth: (token, user) => {
    localStorage.setItem("studybuddy_token", token);
    localStorage.setItem("studybuddy_user", JSON.stringify(user));
  },

  clearAuth: () => {
    localStorage.removeItem("studybuddy_token");
    localStorage.removeItem("studybuddy_user");
  },
};

export default api;
