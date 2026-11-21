// Global state store for categories, tags, and memories
const Store = {
  // Base categories that always exist
  BASE_CATEGORIES: ['general', 'ideas', 'learning', 'thought', 'personal', 'note'],
  
  // Current memory being previewed
  currentMemory: null,
  
  // Cached data from memories
  _cachedCategories: [],
  _cachedTags: [],
  _allTags: [], // All tags from all memories (not filtered)
  
  // Reference to all memories (set by Archive)
  _memoriesRef: [],
  
  init() {
    this._cachedCategories = [...this.BASE_CATEGORIES];
    this._cachedTags = [];
    this._allTags = [];
  },
  
  // Set reference to memories array (called by Archive after load)
  setMemoriesRef(memories) {
    this._memoriesRef = memories;
    this.refreshFromMemories();
  },
  
  // Refresh both tags and categories from current memories
  refreshFromMemories() {
    const memories = this._memoriesRef || [];
    
    // Collect all tags in use
    const tagSet = new Set();
    memories.forEach(m => {
      if (m.tags && Array.isArray(m.tags)) {
        m.tags.forEach(t => tagSet.add(t.toLowerCase().trim()));
      }
    });
    this._cachedTags = [...tagSet].sort();
    
    // Collect user-added categories (those in use but not in base)
    const usedCategories = new Set();
    memories.forEach(m => {
      if (m.category) {
        usedCategories.add(m.category.toLowerCase().trim());
      }
    });
    
    // Categories = base + any used non-base categories
    const allCats = new Set(this.BASE_CATEGORIES);
    usedCategories.forEach(c => allCats.add(c));
    this._cachedCategories = [...allCats].sort();
  },
  
  // Get all available categories
  getCategories() {
    return [...this._cachedCategories];
  },
  
  // Get all available tags (use all tags from all memories, not just filtered)
  getTags() {
    // Merge all tags with any manually added tags
    const allTagsSet = new Set(this._allTags || []);
    (this._cachedTags || []).forEach(t => allTagsSet.add(t));
    return [...allTagsSet].sort();
  },
  
  // Load all tags from all memories (for dropdown, not filtered)
  async loadAllTags() {
    try {
      const data = await API.getMemories({ limit: 1000 }); // Get all memories for tags
      const tagSet = new Set();
      data.memories.forEach(m => {
        if (m.tags && Array.isArray(m.tags)) {
          m.tags.forEach(t => tagSet.add(t.toLowerCase().trim()));
        }
      });
      this._allTags = [...tagSet].sort();
    } catch (e) {
      console.error('Failed to load all tags', e);
    }
  },
  
  // Check if category is a base category
  isBaseCategory(cat) {
    return this.BASE_CATEGORIES.includes(cat.toLowerCase().trim());
  },
  
  // Add a category (for new memories being created)
  // This is temporary - will be validated on next refresh
  addCategory(name) {
    const normalized = name.toLowerCase().trim();
    if (normalized && !this._cachedCategories.includes(normalized)) {
      this._cachedCategories.push(normalized);
      this._cachedCategories.sort();
    }
    return normalized;
  },
  
  // Add tags (for new memories being created)
  // These are temporary - will be validated on next refresh
  addTags(tags) {
    if (!Array.isArray(tags)) return;
    tags.forEach(t => {
      const normalized = t.toLowerCase().trim();
      if (normalized) {
        // Add to both cached tags and all tags
        if (!this._cachedTags.includes(normalized)) {
          this._cachedTags.push(normalized);
        }
        if (!this._allTags.includes(normalized)) {
          this._allTags.push(normalized);
        }
      }
    });
    this._cachedTags.sort();
    this._allTags.sort();
  },
  
  // Current memory
  setCurrentMemory(memory) {
    this.currentMemory = memory;
  },
  
  getCurrentMemory() {
    return this.currentMemory;
  },
  
  // Get category icon (Font Awesome for base categories, letter for custom)
  getCategoryIcon(category) {
    if (!category) category = 'general';
    const cat = category.toLowerCase();
    
    // Map base categories to Font Awesome outline icons
    // Using icons that are available in Font Awesome 6.4.0 regular (far) style
    const iconMap = {
      'general': '<i class="far fa-square"></i>',
      'ideas': '<i class="far fa-lightbulb"></i>',
      'learning': '<i class="far fa-bookmark"></i>',
      'thought': '<i class="far fa-comment"></i>',
      'personal': '<i class="far fa-user"></i>',
      'note': '<i class="far fa-sticky-note"></i>',
    };
    
    // Return icon wrapped in cat-icon box for base category, or first letter for custom categories
    if (iconMap[cat]) {
      return `<span class="cat-icon">${iconMap[cat]}</span>`;
    }
    
    // Custom category - use first letter
    const first = cat.charAt(0).toUpperCase();
    return `<span class="cat-icon">${first}</span>`;
  },
  
  // Helper: capitalize first letter
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  
  // Helper: escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};

Store.init();
