const App = {
  currentView: 'ask',
  categories: {},
  
  init() {
    // Initialize store first
    Store.init();
    
    this.setupNavigation();
    this.setupCaptureButton();
    this.setupWelcomePrompts();
    this.setupCategoryDropdown();
    this.loadCategories();
    
    // Initialize components
    Preview.init();
    Chat.init();
    Archive.init();
    SaveModal.init();
    
    // Load all tags for dropdown (not filtered)
    Store.loadAllTags();
  },
  
  setupCategoryDropdown() {
    // Set up event delegation for both category and tags dropdowns
    // This ensures it works even if button HTML is replaced
    document.addEventListener('click', (e) => {
      // Handle category dropdown button click
      if (e.target.closest('#category-dropdown-btn') || e.target.id === 'category-dropdown-btn') {
        e.stopPropagation();
        e.preventDefault();
        
        const menu = document.getElementById('category-dropdown-menu');
        const dropdown = document.getElementById('category-dropdown');
        const tagsMenu = document.getElementById('tags-dropdown-menu');
        const tagsDropdown = document.getElementById('tags-dropdown');
        
        if (!menu || !dropdown) return;
        
        // Ensure menu has content
        if (menu.innerHTML.trim() === '') {
          this.renderCategoryDropdown();
        }
        
        // Close tags dropdown if opening category dropdown
        if (tagsMenu) tagsMenu.classList.remove('active');
        if (tagsDropdown) tagsDropdown.classList.remove('active');
        
        // Toggle category dropdown
        const isActive = menu.classList.contains('active');
        menu.classList.toggle('active');
        dropdown.classList.toggle('active', !isActive);
        return;
      }
      
      // Handle tags dropdown button click
      if (e.target.closest('#tags-dropdown-btn') || e.target.id === 'tags-dropdown-btn') {
        e.stopPropagation();
        e.preventDefault();
        
        const menu = document.getElementById('tags-dropdown-menu');
        const dropdown = document.getElementById('tags-dropdown');
        const categoryMenu = document.getElementById('category-dropdown-menu');
        const categoryDropdown = document.getElementById('category-dropdown');
        
        if (!menu || !dropdown) return;
        
        // Ensure menu has content
        if (menu.innerHTML.trim() === '') {
          Archive.renderTagsDropdown();
        }
        
        // Close category dropdown if opening tags dropdown
        if (categoryMenu) categoryMenu.classList.remove('active');
        if (categoryDropdown) categoryDropdown.classList.remove('active');
        
        // Toggle tags dropdown
        const isActive = menu.classList.contains('active');
        menu.classList.toggle('active');
        dropdown.classList.toggle('active', !isActive);
        return;
      }
      
      // Close dropdowns on outside click (but not if clicking inside menu items)
      const categoryDropdown = document.getElementById('category-dropdown');
      const categoryMenu = document.getElementById('category-dropdown-menu');
      const tagsDropdown = document.getElementById('tags-dropdown');
      const tagsMenu = document.getElementById('tags-dropdown-menu');
      
      if (categoryDropdown && categoryMenu && !categoryDropdown.contains(e.target)) {
        categoryMenu.classList.remove('active');
        categoryDropdown.classList.remove('active');
      }
      
      if (tagsDropdown && tagsMenu && !tagsDropdown.contains(e.target)) {
        tagsMenu.classList.remove('active');
        tagsDropdown.classList.remove('active');
      }
    });
  },
  
  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });
  },
  
  switchView(view) {
    this.currentView = view;
    
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === `${view}-view`);
    });
    
    if (view === 'memories') {
      // Reset all filters when switching to memories view
      Archive.resetFilters();
      // Ensure dropdowns are rendered
      this.renderCategoryDropdown();
      Archive.renderTagsDropdown();
      Archive.load();
    }
  },
  
  setupCaptureButton() {
    document.getElementById('capture-btn').addEventListener('click', () => {
      SaveModal.open();
    });
  },
  
  setupWelcomePrompts() {
    document.querySelectorAll('.welcome-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        if (prompt) {
          document.getElementById('chat-input').value = prompt;
          Chat.send();
        }
      });
    });
  },
  
  async loadCategories() {
    try {
      const data = await API.getMemories({ limit: 100 });
      
      // Set memories reference in Store (this refreshes tags and categories)
      Store.setMemoriesRef(data.memories);
      
      // Count memories per category
      this.categories = {};
      data.memories.forEach(m => {
        const cat = m.category || 'general';
        this.categories[cat] = (this.categories[cat] || 0) + 1;
      });
      
      this.renderCategories();
      this.renderCategoryDropdown();
    } catch (e) {
      console.error('failed to load categories', e);
    }
  },
  
  renderCategories() {
    const container = document.getElementById('categories-list');
    
    // Get all categories (base + custom) with their counts
    const allCategories = new Set([...Store.BASE_CATEGORIES]);
    Object.keys(this.categories).forEach(cat => allCategories.add(cat));
    
    // Separate base and custom categories
    const baseCategories = [];
    const customCategories = [];
    
    allCategories.forEach(cat => {
      const count = this.categories[cat] || 0;
      const item = { cat, count };
      
      if (Store.isBaseCategory(cat)) {
        baseCategories.push(item);
      } else {
        customCategories.push(item);
      }
    });
    
    // Sort base categories by count (desc), then alphabetically
    baseCategories.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.cat.localeCompare(b.cat);
    });
    
    // Sort custom categories by count (desc), then alphabetically
    customCategories.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.cat.localeCompare(b.cat);
    });
    
    if (baseCategories.length === 0 && customCategories.length === 0) {
      container.innerHTML = '<p style="font-size: 12px; color: var(--text-muted); padding: 0 8px;">No categories yet</p>';
      return;
    }
    
    let html = '';
    
    // Render base categories
    if (baseCategories.length > 0) {
      html += baseCategories.map(({ cat, count }) => `
        <div class="category-item" data-category="${cat}">
          <span>${Store.getCategoryIcon(cat)} ${Store.capitalize(cat)}</span>
          <span class="count">${count}</span>
        </div>
      `).join('');
    }
    
    // Add separator if both base and custom exist
    if (baseCategories.length > 0 && customCategories.length > 0) {
      html += '<div class="category-separator"></div>';
    }
    
    // Render custom categories
    if (customCategories.length > 0) {
      html += customCategories.map(({ cat, count }) => `
        <div class="category-item" data-category="${cat}">
          <span>${Store.getCategoryIcon(cat)} ${Store.capitalize(cat)}</span>
          <span class="count">${count}</span>
        </div>
      `).join('');
    }
    
    container.innerHTML = html;
    
    container.querySelectorAll('.category-item').forEach(el => {
      el.addEventListener('click', () => {
        const category = el.dataset.category;
        this.switchView('memories');
        // Clear search input
        Archive.searchInput.value = '';
        // Single select from sidebar
        Archive.filterByCategory(category, true);
        // Update category dropdown to reflect selection
        App.renderCategoryDropdown();
      });
    });
  },
  
  renderCategoryDropdown() {
    const menu = document.getElementById('category-dropdown-menu');
    const btn = document.getElementById('category-dropdown-btn');
    
    if (!menu || !btn) return;
    
    // Only show categories that have data (count > 0)
    const categoriesWithData = Object.entries(this.categories)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => {
        // Sort by count (desc), then alphabetically
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
    
    // Update button label
    if (Archive.selectedCategories.length === 0) {
      btn.innerHTML = '<span>All categories</span><i class="fas fa-chevron-down"></i>';
    } else if (Archive.selectedCategories.length === 1) {
      const cat = Archive.selectedCategories[0];
      btn.innerHTML = `<span>${Store.getCategoryIcon(cat)} ${Store.capitalize(cat)}</span><i class="fas fa-chevron-down"></i>`;
    } else {
      btn.innerHTML = `<span>${Archive.selectedCategories.length} categories</span><i class="fas fa-chevron-down"></i>`;
    }
    
    const hasSelected = Archive.selectedCategories.length > 0;
    let html = `<div class="filter-dropdown-item ${!hasSelected ? 'selected' : ''}" data-category="">All Categories</div>`;
    html += categoriesWithData.map(([cat, count]) => {
      const isSelected = Archive.selectedCategories.includes(cat);
      return `
        <div class="filter-dropdown-item ${isSelected ? 'selected' : ''}" data-category="${cat}">
          <span>${Store.getCategoryIcon(cat)} ${Store.capitalize(cat)}</span>
          <span style="color: var(--text-muted); font-size: 11px;">${count}</span>
        </div>
      `;
    }).join('');
    
    menu.innerHTML = html;
    
    // Handle selection (toggle multiple, keep dropdown open)
    menu.querySelectorAll('.filter-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing dropdown
        const category = item.dataset.category;
        Archive.filterByCategory(category, false); // Multi-select from dropdown
        this.renderCategoryDropdown(); // Re-render to update visual state
      });
    });
  },
  
  refreshStats() {
    this.loadCategories();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
