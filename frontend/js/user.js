// User ID Management
// Generates and stores a unique user ID in localStorage for multi-user isolation

const UserId = {
  STORAGE_KEY: 'continuum_user_id',
  
  /**
   * Generates a unique user ID using crypto.randomUUID() or fallback method
   */
  generate() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },
  
  /**
   * Gets the current user ID, creating one if it doesn't exist
   */
  get() {
    let userId = localStorage.getItem(this.STORAGE_KEY);
    if (!userId) {
      userId = this.generate();
      localStorage.setItem(this.STORAGE_KEY, userId);
    }
    return userId;
  },
  
  /**
   * Resets the user ID (for testing/debugging)
   */
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

// Initialize user ID on load
const userId = UserId.get();
