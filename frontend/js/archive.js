const Archive = {
  memories: [],
  offset: 0,
  limit: 30,
  hasMore: false,
  filters: {},
  selectedTags: [],
  selectedCategories: [],
  
  init() {
    this.listEl = document.getElementById('memories-list');
    this.searchInput = document.getElementById('search-input');
    
    this.setupFilters();
    this.setupTagsDropdown();
    // Load all tags for dropdown (not filtered)
    Store.loadAllTags();
  },
  
  setupFilters() {
    let searchTimeout;
    this.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.applyFilters(), 300);
    });
  },
  
  setupTagsDropdown() {
    // Event delegation is handled in App.setupCategoryDropdown for consistency
    // This method just ensures the dropdown is rendered initially
    this.renderTagsDropdown();
  },
  
  renderTagsDropdown() {
    const menu = document.getElementById('tags-dropdown-menu');
    const allTags = Store.getTags();
    
    const hasSelected = this.selectedTags.length > 0;
    let html = `<div class="filter-dropdown-item ${!hasSelected ? 'selected' : ''}" data-tag="">All Tags</div>`;
    
    if (allTags.length === 0) {
      html += '<div class="filter-dropdown-item" style="color: var(--text-muted);">No tags yet</div>';
    } else {
      html += allTags.map(tag => {
        const isSelected = this.selectedTags.includes(tag);
        return `
          <div class="filter-dropdown-item ${isSelected ? 'selected' : ''}" data-tag="${tag}">
            <span>${Store.capitalize(tag)}</span>
          </div>
        `;
      }).join('');
    }
    
    menu.innerHTML = html;
    
    menu.querySelectorAll('.filter-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing dropdown
        const tag = item.dataset.tag;
        
        if (tag === '') {
          // "All Tags" - clear selection
          this.selectedTags = [];
        } else {
          // Toggle tag selection
          const index = this.selectedTags.indexOf(tag);
          if (index > -1) {
            this.selectedTags.splice(index, 1);
          } else {
            this.selectedTags.push(tag);
          }
        }
        this.updateTagsBtnLabel();
        this.renderTagsDropdown(); // Re-render to update visual state
        this.applyFilters();
      });
    });
  },
  
  updateTagsBtnLabel() {
    const btn = document.getElementById('tags-dropdown-btn');
    if (this.selectedTags.length === 0) {
      btn.innerHTML = '<span>All tags</span><i class="fas fa-chevron-down"></i>';
    } else if (this.selectedTags.length === 1) {
      btn.innerHTML = `<span>${Store.capitalize(this.selectedTags[0])}</span><i class="fas fa-chevron-down"></i>`;
    } else {
      btn.innerHTML = `<span>${this.selectedTags.length} tags</span><i class="fas fa-chevron-down"></i>`;
    }
  },
  
  filterByCategory(category, singleSelect = false) {
    // If category is empty string (All Categories), clear selection
    if (category === '') {
      this.selectedCategories = [];
    } else if (category) {
      if (singleSelect) {
        // Single select: replace selection (for sidebar clicks)
        this.selectedCategories = [category];
        // Reset tags filter when selecting from sidebar
        this.selectedTags = [];
        this.updateTagsBtnLabel();
        this.renderTagsDropdown();
      } else {
        // Multi-select: toggle selection (for dropdown)
        const index = this.selectedCategories.indexOf(category);
        if (index > -1) {
          this.selectedCategories.splice(index, 1);
        } else {
          this.selectedCategories.push(category);
        }
      }
    }
    this.updateCategoryBtnLabel();
    this.applyFilters();
  },
  
  updateCategoryBtnLabel() {
    const btn = document.getElementById('category-dropdown-btn');
    if (this.selectedCategories.length === 0) {
      btn.innerHTML = '<span>All categories</span><i class="fas fa-chevron-down"></i>';
    } else if (this.selectedCategories.length === 1) {
      const cat = this.selectedCategories[0];
      btn.innerHTML = `<span>${Store.getCategoryIcon(cat)} ${Store.capitalize(cat)}</span><i class="fas fa-chevron-down"></i>`;
    } else {
      btn.innerHTML = `<span>${this.selectedCategories.length} categories</span><i class="fas fa-chevron-down"></i>`;
    }
  },
  
  resetFilters() {
    // Clear all filter selections
    this.selectedCategories = [];
    this.selectedTags = [];
    this.filters = {};
    
    // Clear search input
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    
    // Update button labels
    this.updateCategoryBtnLabel();
    this.updateTagsBtnLabel();
    
    // Re-render dropdowns to show "All" selected
    App.renderCategoryDropdown();
    this.renderTagsDropdown();
    
    // Make sure dropdowns are closed
    const categoryMenu = document.getElementById('category-dropdown-menu');
    const categoryDropdown = document.getElementById('category-dropdown');
    const tagsMenu = document.getElementById('tags-dropdown-menu');
    const tagsDropdown = document.getElementById('tags-dropdown');
    
    if (categoryMenu) categoryMenu.classList.remove('active');
    if (categoryDropdown) categoryDropdown.classList.remove('active');
    if (tagsMenu) tagsMenu.classList.remove('active');
    if (tagsDropdown) tagsDropdown.classList.remove('active');
  },
  
  applyFilters() {
    this.filters = {
      search: this.searchInput.value || undefined,
      category: this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
      tags: this.selectedTags.length > 0 ? this.selectedTags : undefined,
    };
    this.offset = 0;
    this.memories = [];
    this.load();
  },
  
  async load() {
    try {
      const data = await API.getMemories({
        ...this.filters,
        limit: this.limit,
        offset: this.offset,
      });
      
      if (this.offset === 0) {
        this.memories = data.memories;
      } else {
        this.memories = [...this.memories, ...data.memories];
      }
      
      // Refresh Store's cached tags and categories from memories
      Store.setMemoriesRef(this.memories);
      
      this.hasMore = data.hasMore;
      this.render();
    } catch (e) {
      console.error('failed to load memories', e);
      this.listEl.innerHTML = '<div class="empty-state"><p>Failed to load memories</p></div>';
    }
  },
  
  render() {
    if (this.memories.length === 0) {
      this.listEl.classList.add('is-empty');
      this.listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✦</div>
          <h4>No memories yet</h4>
          <p>Start building your knowledge base by capturing your first memory.</p>
          <button class="empty-state-cta" onclick="SaveModal.open()">
            <span class="cta-star">✦</span>
            <span class="cta-text">Capture Something</span>
          </button>
        </div>
      `;
      return;
    }
    
    this.listEl.classList.remove('is-empty');
    this.listEl.innerHTML = this.memories.map(m => this.renderCard(m)).join('');
    
    this.listEl.querySelectorAll('.memory-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.openMemory(id);
      });
    });
  },
  
  renderCard(memory) {
    const date = new Date(memory.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    const category = memory.category || 'general';
    const title = memory.title || memory.userContext || '';
    
    let titleHtml = '';
    if (title) {
      titleHtml = `<div class="card-title">${Store.escapeHtml(title)}</div>`;
    }
    
    let tagsHtml = '';
    if (memory.tags && memory.tags.length > 0) {
      tagsHtml = `
        <div class="tags">
          ${memory.tags.slice(0, 3).map(t => `<span class="tag">${Store.escapeHtml(t)}</span>`).join('')}
          ${memory.tags.length > 3 ? `<span class="tag">+${memory.tags.length - 3}</span>` : ''}
        </div>
      `;
    }
    
    return `
      <div class="memory-card" data-id="${memory.id}">
        <div class="card-header">
          <span class="card-category">
            ${Store.getCategoryIcon(category)}
            ${Store.capitalize(category)}
          </span>
          <span class="card-date">${date}</span>
        </div>
        ${titleHtml}
        <div class="content">${Store.escapeHtml(memory.content)}</div>
        ${tagsHtml}
      </div>
    `;
  },
  
  async openMemory(id) {
    // Use unified preview
    await Preview.openById(id);
  }
};
