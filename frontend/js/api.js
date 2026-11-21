const API = {
  baseUrl: '/api',
  
  /**
   * Gets the Authorization header with user ID
   */
  getAuthHeaders(additionalHeaders = {}) {
    const userId = UserId.get();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userId}`,
      ...additionalHeaders
    };
  },
  
  async saveMemory(data) {
    const res = await fetch(`${this.baseUrl}/memory`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  
  async getMemories(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) {
        if (Array.isArray(v)) {
          // For arrays (category, tags), add each value separately
          v.forEach(val => params.append(k, val));
        } else {
          params.set(k, v);
        }
      }
    });
    const userId = UserId.get();
    const res = await fetch(`${this.baseUrl}/memories?${params}`, {
      headers: {
        'Authorization': `Bearer ${userId}`
      }
    });
    return res.json();
  },
  
  async getMemory(id) {
    const userId = UserId.get();
    const res = await fetch(`${this.baseUrl}/memory/${id}`, {
      headers: {
        'Authorization': `Bearer ${userId}`
      }
    });
    return res.json();
  },
  
  async deleteMemory(id) {
    const userId = UserId.get();
    const res = await fetch(`${this.baseUrl}/memory/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userId}`
      }
    });
    return res.json();
  },
  
  async updateMemory(id, updates) {
    const res = await fetch(`${this.baseUrl}/memory/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  
  async chat(message, history = [], filters = {}) {
    const body = { message, conversationHistory: history };
    if (filters.categories) body.categories = filters.categories;
    if (filters.tags) body.tags = filters.tags;
    
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  },
  
  async linkMemories(memoryId, linkToIds) {
    const res = await fetch(`${this.baseUrl}/link`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ memoryId, linkToIds }),
    });
    return res.json();
  },
  
  async mergeMemories(keepId, mergeId) {
    const res = await fetch(`${this.baseUrl}/merge`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ keepId, mergeId }),
    });
    return res.json();
  },
};

