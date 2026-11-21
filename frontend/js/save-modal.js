const SaveModal = {
  isOpen: false,
  selectedCategory: null,
  selectedTags: [],
  
  init() {
    this.panel = document.getElementById('save-panel');
    this.titleInput = document.getElementById('memory-title');
    this.contentInput = document.getElementById('memory-content');
    this.tagsInput = document.getElementById('memory-tags');
    this.tagsSelectedEl = document.getElementById('tags-selected');
    this.tagsSuggestionsEl = document.getElementById('tags-suggestions');
    this.categoryInput = document.getElementById('capture-category-input');
    this.categoryMenu = document.getElementById('capture-category-menu');
    this.categorySelect = document.getElementById('capture-category-select');
    this.categoryError = document.getElementById('category-error');
    this.categoryLetterBox = document.getElementById('category-letter-box');
    
    this.setupEventListeners();
    this.setupCategorySelect();
    this.setupTagsInput();
  },
  
  setupEventListeners() {
    document.getElementById('save-panel-close').addEventListener('click', () => this.close());
    document.getElementById('cancel-save-btn').addEventListener('click', () => this.close());
    document.getElementById('confirm-save-btn').addEventListener('click', () => this.save());
    
    // Close on overlay click
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.close();
    });
  },
  
  setupCategorySelect() {
    // Show menu on focus
    this.categoryInput.addEventListener('focus', () => {
      // If category is selected, allow clearing by making input editable
      if (this.selectedCategory) {
        this.categoryInput.readOnly = false;
        this.categoryInput.value = '';
        this.selectedCategory = null;
        this.updateCategoryDisplay();
      }
      this.renderCategoryMenu();
    });
    
    // Filter as you type and handle clearing
    this.categoryInput.addEventListener('input', () => {
      const value = this.categoryInput.value.trim();
      if (!value) {
        // Clear category when input is cleared
        this.selectedCategory = null;
        this.updateCategoryDisplay();
      }
      this.renderCategoryMenu();
    });
    
    // Handle selection
    this.categoryMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.select-option');
      if (!item) return;
      
      const value = item.dataset.value;
      if (value === 'create') {
        const query = this.categoryInput.value.trim().toLowerCase();
        if (query) {
          const normalized = Store.addCategory(query);
          this.selectedCategory = normalized;
          this.updateCategoryDisplay();
          this.categoryMenu.classList.remove('active');
        }
      } else {
        this.selectedCategory = value;
        this.updateCategoryDisplay();
        this.categoryMenu.classList.remove('active');
      }
      // Hide error when category is selected
      this.hideCategoryError();
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.categorySelect.contains(e.target)) {
        this.categoryMenu.classList.remove('active');
      }
    });
  },
  
  renderCategoryMenu() {
    const query = this.categoryInput.value.trim().toLowerCase();
    const allCategories = Store.getCategories();
    
    // Filter categories (case-insensitive) - show all if query is empty
    const filtered = !query 
      ? allCategories 
      : allCategories.filter(cat => cat.toLowerCase().includes(query));
    
    let html = '';
    
    // Show filtered options
    if (filtered.length > 0) {
      html = filtered.map(cat => {
        const isSelected = cat === this.selectedCategory;
        return `
          <div class="select-option ${isSelected ? 'selected' : ''}" data-value="${cat}">
            ${Store.getCategoryIcon(cat)}
            ${Store.capitalize(cat)}
          </div>
        `;
      }).join('');
    }
    
    // Show "Create" option if query doesn't match existing category
    if (query && !allCategories.some(c => c.toLowerCase() === query)) {
      html += `
        <div class="select-option select-option-create" data-value="create">
          + Create <span class="create-text">${Store.capitalize(query)}</span>
        </div>
      `;
    }
    
    // Show hint if no results
    if (!html) {
      html = '<div class="select-hint">Select an option or create one</div>';
    }
    
    this.categoryMenu.innerHTML = html;
    this.categoryMenu.classList.add('active');
  },
  
  updateCategoryDisplay() {
    if (this.selectedCategory) {
      const letter = this.selectedCategory.charAt(0).toUpperCase();
      this.categoryLetterBox.textContent = letter;
      this.categoryLetterBox.style.display = 'inline-flex';
      // Show just the category name after the boxed letter
      this.categoryInput.value = Store.capitalize(this.selectedCategory);
      this.categoryInput.readOnly = true;
      this.categorySelect.classList.add('has-selection');
    } else {
      this.categoryLetterBox.style.display = 'none';
      this.categoryInput.value = '';
      this.categoryInput.readOnly = false;
      this.categoryInput.placeholder = 'Select an option or create one';
      this.categorySelect.classList.remove('has-selection');
    }
  },
  
  showCategoryError() {
    this.categoryError.style.display = 'block';
  },
  
  hideCategoryError() {
    this.categoryError.style.display = 'none';
  },
  
  open() {
    this.reset();
    this.panel.classList.add('active');
    this.isOpen = true;
    this.contentInput.focus();
  },
  
  close() {
    this.panel.classList.remove('active');
    this.isOpen = false;
  },
  
  setupTagsInput() {
    // Show menu on focus
    this.tagsInput.addEventListener('focus', () => {
      this.renderTagSuggestions();
    });
    
    // Filter as you type
    this.tagsInput.addEventListener('input', () => {
      this.renderTagSuggestions();
    });
    
    // Handle Enter key to add tag
    this.tagsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = this.tagsInput.value.trim().toLowerCase();
        if (value) {
          this.addTag(value);
          this.tagsInput.value = '';
          this.renderTagSuggestions();
        }
      } else if (e.key === 'Backspace' && !this.tagsInput.value && this.selectedTags.length > 0) {
        // Remove last tag on backspace when input is empty
        this.removeTag(this.selectedTags[this.selectedTags.length - 1]);
      }
    });
    
    // Handle selection from dropdown
    this.tagsSuggestionsEl.addEventListener('click', (e) => {
      const item = e.target.closest('.select-option');
      if (!item) return;
      
      const value = item.dataset.value;
      if (value === 'create') {
        const query = this.tagsInput.value.trim().toLowerCase();
        if (query) {
          this.addTag(query);
          this.tagsInput.value = '';
          this.renderTagSuggestions();
        }
      } else {
        this.addTag(value);
        this.tagsInput.value = '';
        this.renderTagSuggestions();
      }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      const container = document.querySelector('.tags-select');
      if (container && !container.contains(e.target)) {
        this.tagsSuggestionsEl.classList.remove('active');
      }
    });
  },
  
  renderTagSuggestions() {
    const query = this.tagsInput.value.trim().toLowerCase();
    const allTags = Store.getTags();
    
    // Filter tags that match query and aren't already selected (case-insensitive)
    // Show all available tags if query is empty
    const availableTags = allTags.filter(tag => !this.selectedTags.includes(tag));
    const filtered = !query
      ? availableTags.slice(0, 10)
      : availableTags.filter(tag => tag.toLowerCase().includes(query)).slice(0, 10);
    
    let html = '';
    
    // Show filtered options
    if (filtered.length > 0) {
      html = filtered.map(tag => `
        <div class="select-option" data-value="${tag}">
          ${Store.capitalize(tag)}
        </div>
      `).join('');
    }
    
    // Show "Create" option if query doesn't match existing tag
    if (query && !allTags.some(t => t.toLowerCase() === query) && !this.selectedTags.includes(query)) {
      html += `
        <div class="select-option select-option-create" data-value="create">
          + Create <span class="create-text">${Store.capitalize(query)}</span>
        </div>
      `;
    }
    
    // Show hint if no results
    if (!html) {
      if (allTags.length === 0 && !query) {
        html = '<div class="select-hint">No existing tags</div>';
      } else {
        html = '<div class="select-hint">Select an option or create one</div>';
      }
    }
    
    this.tagsSuggestionsEl.innerHTML = html;
    this.tagsSuggestionsEl.classList.add('active');
  },
  
  addTag(tag) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !this.selectedTags.includes(normalized)) {
      this.selectedTags.push(normalized);
      // Add to store if it's a new tag
      Store.addTags([normalized]);
      this.renderSelectedTags();
    }
  },
  
  removeTag(tag) {
    this.selectedTags = this.selectedTags.filter(t => t !== tag);
    this.renderSelectedTags();
  },
  
  renderSelectedTags() {
    if (this.selectedTags.length === 0) {
      this.tagsSelectedEl.innerHTML = '';
      return;
    }
    
    this.tagsSelectedEl.innerHTML = this.selectedTags.map(tag => `
      <span class="tag-chip-selected">
        ${Store.capitalize(tag)}
        <button class="tag-chip-remove" data-tag="${tag}" type="button">×</button>
      </span>
    `).join('');
    
    // Add remove handlers
    this.tagsSelectedEl.querySelectorAll('.tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTag(btn.dataset.tag);
      });
    });
  },
  
  reset() {
    this.titleInput.value = '';
    this.contentInput.value = '';
    this.tagsInput.value = '';
    this.categoryInput.value = '';
    this.selectedTags = [];
    this.selectedCategory = null;
    this.renderSelectedTags();
    this.updateCategoryDisplay();
    this.hideCategoryError();
    this.categoryMenu.classList.remove('active');
    this.tagsSuggestionsEl.classList.remove('active');
  },
  
  async save() {
    const content = this.contentInput.value.trim();
    if (!content) {
      Toast.show('Please enter some content', 'error');
      return;
    }
    
    // Validate category is selected
    if (!this.selectedCategory) {
      this.showCategoryError();
      this.categoryInput.focus();
      return;
    }
    
    // Hide error if category is selected
    this.hideCategoryError();
    
    const title = this.titleInput.value.trim();
    const tags = [...this.selectedTags];
    
    // Also check if there's text in the input field that hasn't been added yet
    const inputTag = this.tagsInput.value.trim().toLowerCase();
    if (inputTag && !tags.includes(inputTag)) {
      tags.push(inputTag);
    }
    
    // Disable button while saving
    const saveBtn = document.getElementById('confirm-save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
      const response = await API.saveMemory({
        content,
        userContext: title, // Title is stored as userContext
        tags,
        overrideCategory: this.selectedCategory,
      });
      
      // Add any new tags to store
      if (tags.length > 0) {
        Store.addTags(tags);
      }
      
      // Get the saved memory with AI-generated data
      const memory = response.memory;
      memory.title = title; // Use user-provided title only
      memory.aiSummary = response.aiSummary;
      
      // Close capture panel
      this.close();
      
      // Open unified preview with success header
      Preview.open(memory, { justSaved: true });
      
      // Refresh stats
      App.refreshStats();
      
    } catch (e) {
      console.error('Failed to save memory', e);
      Toast.show('Failed to save memory', 'error');
    } finally {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  }
};
