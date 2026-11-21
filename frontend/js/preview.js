// Unified Memory Preview Dialog
const Preview = {
  isOpen: false,
  editMode: false,
  hasChanges: false,
  originalMemory: null, // Store original for cancel
  
  init() {
    this.overlay = document.getElementById('memory-preview');
    this.body = document.getElementById('preview-body');
    this.footerView = document.getElementById('preview-footer-view');
    this.footerEdit = document.getElementById('preview-footer-edit');
    
    this.editOverlay = document.getElementById('edit-field-dialog');
    this.editBody = document.getElementById('edit-field-body');
    this.editTitle = document.getElementById('edit-field-title');
    
    this.setupEventListeners();
    this.setupEditDialog();
  },
  
  setupEventListeners() {
    // Click outside to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    
    // View mode buttons
    document.getElementById('preview-edit-btn').addEventListener('click', () => this.enterEditMode());
    document.getElementById('preview-delete-btn').addEventListener('click', () => this.showDeleteDialog());
    
    // Edit mode buttons
    document.getElementById('preview-cancel-btn').addEventListener('click', () => this.cancelEdit());
    document.getElementById('preview-save-btn').addEventListener('click', () => this.saveAndClose());
    document.getElementById('preview-delete-btn-edit').addEventListener('click', () => this.showDeleteDialog());
  },
  
  setupEditDialog() {
    document.getElementById('edit-field-close').addEventListener('click', () => this.closeEditDialog());
    document.getElementById('edit-field-cancel').addEventListener('click', () => this.closeEditDialog());
    document.getElementById('edit-field-save').addEventListener('click', () => this.saveEdit());
    
    this.editOverlay.addEventListener('click', (e) => {
      if (e.target === this.editOverlay) this.closeEditDialog();
    });
  },
  
  enterEditMode() {
    // Store original state for cancel
    const memory = Store.getCurrentMemory();
    this.originalMemory = JSON.parse(JSON.stringify(memory));
    
    this.editMode = true;
    this.updateFooter();
    this.render();
  },
  
  cancelEdit() {
    // Restore original memory
    if (this.originalMemory) {
      Store.setCurrentMemory(this.originalMemory);
    }
    this.editMode = false;
    this.hasChanges = false;
    this.updateFooter();
    this.render();
  },
  
  async saveAndClose() {
    const memory = Store.getCurrentMemory();
    
    if (this.hasChanges && memory && memory.id) {
      try {
        const response = await API.updateMemory(memory.id, {
          content: memory.content,
          tags: memory.tags,
          category: memory.category,
          title: memory.title,
          userContext: memory.userContext,
        });
        
        // Update memory with response (includes regenerated summary if content changed)
        if (response.memory) {
          Object.assign(memory, response.memory);
          Store.setCurrentMemory(memory);
        }
        
        // Update Archive's local memory list
        const idx = Archive.memories.findIndex(m => m.id === memory.id);
        if (idx !== -1) {
          Archive.memories[idx] = { ...memory };
        }
        
        Store.setMemoriesRef(Archive.memories);
        
        Toast.show('Changes saved', 'success');
      } catch (e) {
        console.error('Failed to save:', e);
        Toast.show('Failed to save changes', 'error');
        return;
      }
    }
    
    this.editMode = false;
    this.hasChanges = false;
    this.updateFooter();
    this.render();
    
    if (App.currentView === 'memories') {
      Archive.render();
    }
  },
  
  updateFooter() {
    if (this.editMode) {
      this.footerView.style.display = 'none';
      this.footerEdit.style.display = 'flex';
    } else {
      this.footerView.style.display = 'flex';
      this.footerEdit.style.display = 'none';
    }
  },
  
  open(memory, options = {}) {
    this.editMode = false;
    this.hasChanges = false;
    this.originalMemory = null;
    Store.setCurrentMemory(memory);
    
    this.updateFooter();
    this.render();
    this.overlay.classList.add('active');
    this.isOpen = true;
    
    // Show toast if just saved
    if (options.justSaved) {
      Toast.show('Memory saved', 'success');
    }
  },
  
  async openById(id) {
    const current = Store.getCurrentMemory();
    if (this.isOpen && current && current.id === id) {
      return;
    }
    
    try {
      const data = await API.getMemory(id);
      this.open(data.memory);
    } catch (e) {
      console.error('Failed to load memory', e);
      Toast.show('Failed to load memory', 'error');
    }
  },
  
  render() {
    const memory = Store.getCurrentMemory();
    if (!memory) return;
    
    const title = memory.title || memory.userContext || 'Untitled Memory';
    const category = memory.category || 'general';
    
    const date = new Date(memory.createdAt);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    // Build tags HTML
    let tagsHtml = '';
    if (memory.tags && memory.tags.length > 0) {
      tagsHtml = memory.tags.map(t => `
        <span class="tag-chip" data-tag="${t}">
          ${Store.capitalize(t)}
          ${this.editMode ? `<button class="tag-delete-btn" data-tag="${t}">×</button>` : ''}
        </span>
      `).join('');
    }
    if (this.editMode) {
      tagsHtml += '<button class="tag-add-btn" id="add-tag-btn">+ Add</button>';
    }
    if (!tagsHtml) {
      tagsHtml = '<span class="no-tags">No tags</span>';
    }
    
    // AI Summary
    const summary = memory.aiSummary || this.generateSummary(memory.content);
    
    this.body.innerHTML = `
      <div class="preview-title-row ${this.editMode ? 'editable' : ''}">
        <h2 class="preview-title">${Store.escapeHtml(title)}</h2>
        ${this.editMode ? `
          <button class="edit-icon-btn" data-field="title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        ` : ''}
      </div>
      
      <div class="preview-meta">
        <div class="preview-category-row ${this.editMode ? 'editable' : ''}">
          ${Store.getCategoryIcon(category)}
          <span class="category-text">${Store.capitalize(category)}</span>
          ${this.editMode ? `
            <button class="edit-icon-btn" data-field="category">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          ` : ''}
        </div>
        <div class="preview-date">${dateStr}</div>
      </div>
      
      <div class="preview-section">
        <div class="section-header">
          <span class="section-label">Content</span>
          ${this.editMode ? `
            <button class="edit-icon-btn" data-field="content">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          ` : ''}
        </div>
        <div class="preview-content-box">${Store.escapeHtml(memory.content)}</div>
      </div>
      
      <div class="preview-section">
        <div class="section-header">
          <span class="section-label">Tags</span>
        </div>
        <div class="preview-tags">${tagsHtml}</div>
      </div>
      
      ${!this.editMode ? `
        <div class="preview-section">
          <div class="section-label">AI Summary</div>
          <div class="preview-summary">${Store.escapeHtml(summary)}</div>
        </div>
      ` : ''}
    `;
    
    if (this.editMode) {
      this.setupEditListeners();
    }
  },
  
  generateSummary(content) {
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length < 150) {
      return firstSentence + '.';
    }
    return content.slice(0, 150) + '...';
  },
  
  setupEditListeners() {
    // Edit buttons
    this.body.querySelectorAll('.edit-icon-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditDialog(btn.dataset.field);
      });
    });
    
    // Delete tag buttons
    this.body.querySelectorAll('.tag-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.deleteTag(btn.dataset.tag);
      });
    });
    
    // Add tag button
    const addBtn = document.getElementById('add-tag-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.openEditDialog('tags');
      });
    }
  },
  
  deleteTag(tagToRemove) {
    const memory = Store.getCurrentMemory();
    if (!memory || !memory.tags) return;
    
    memory.tags = memory.tags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    this.hasChanges = true;
    this.render();
  },

  close() {
    // If in edit mode with changes, just exit without saving
    this.overlay.classList.remove('active');
    this.isOpen = false;
    this.editMode = false;
    this.hasChanges = false;
    this.originalMemory = null;
    
    App.refreshStats();
  },
  
  currentEditField: null,
  
  openEditDialog(field) {
    this.currentEditField = field;
    const memory = Store.getCurrentMemory();
    
    let html = '';
    
    switch (field) {
      case 'title':
        this.editTitle.textContent = 'Edit Title';
        html = `
          <input type="text" id="edit-input-title" class="edit-input" 
            value="${Store.escapeHtml(memory.title || memory.userContext || '')}" 
            placeholder="Enter a title...">
        `;
        break;
        
      case 'category':
        this.editTitle.textContent = 'Change Category';
        const categories = Store.getCategories();
        html = `
          <p class="edit-hint">Select a category or type a new one</p>
          <div class="edit-options">
            ${categories.map(cat => `
              <div class="edit-option ${cat === memory.category?.toLowerCase() ? 'selected' : ''}" data-value="${cat}">
                ${Store.getCategoryIcon(cat)}
                ${Store.capitalize(cat)}
              </div>
            `).join('')}
          </div>
          <div class="edit-custom">
            <input type="text" id="edit-input-category" class="edit-input" placeholder="Or type new category...">
          </div>
        `;
        break;
        
      case 'content':
        this.editTitle.textContent = 'Edit Content';
        html = `
          <textarea id="edit-input-content" class="edit-textarea" rows="8" 
            placeholder="Enter content...">${Store.escapeHtml(memory.content)}</textarea>
        `;
        break;
        
      case 'tags':
        this.editTitle.textContent = 'Add Tag';
        const availableTags = Store.getTags().filter(t => !(memory.tags || []).includes(t));
        html = `
          <p class="edit-hint">Type a new tag or select existing</p>
          <div class="edit-custom" style="margin-bottom: 16px;">
            <input type="text" id="edit-input-tag" class="edit-input" placeholder="Type tag and press Enter...">
          </div>
          ${availableTags.length > 0 ? `
            <p class="edit-hint">Existing tags:</p>
            <div class="edit-options">
              ${availableTags.slice(0, 15).map(t => `
                <div class="edit-option" data-value="${t}">
                  ${Store.capitalize(t)}
                </div>
              `).join('')}
            </div>
          ` : ''}
        `;
        break;
    }
    
    this.editBody.innerHTML = html;
    this.editOverlay.classList.add('active');
    
    this.setupEditHandlers(field);
    
    const input = this.editBody.querySelector('input, textarea');
    if (input) setTimeout(() => input.focus(), 100);
  },
  
  setupEditHandlers(field) {
    if (field === 'category') {
      document.querySelectorAll('#edit-field-body .edit-option').forEach(opt => {
        opt.addEventListener('click', () => {
          document.querySelectorAll('#edit-field-body .edit-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          document.getElementById('edit-input-category').value = '';
        });
      });
    }
    
    if (field === 'tags') {
      document.querySelectorAll('#edit-field-body .edit-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const tag = opt.dataset.value;
          this.addTagToMemory(tag);
        });
      });
      
      const input = document.getElementById('edit-input-tag');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const tag = input.value.trim().toLowerCase();
            if (tag) {
              this.addTagToMemory(tag);
            }
          }
        });
      }
    }
  },
  
  addTagToMemory(tag) {
    const memory = Store.getCurrentMemory();
    if (!memory.tags) memory.tags = [];
    
    const normalizedTag = tag.toLowerCase().trim();
    if (normalizedTag && !memory.tags.includes(normalizedTag)) {
      memory.tags.push(normalizedTag);
      this.hasChanges = true;
      this.closeEditDialog();
      this.render();
    }
  },
  
  closeEditDialog() {
    this.editOverlay.classList.remove('active');
    this.currentEditField = null;
  },
  
  async saveEdit() {
    const field = this.currentEditField;
    const memory = Store.getCurrentMemory();
    
    if (!memory || !field) {
      this.closeEditDialog();
      return;
    }
    
    if (field === 'title') {
      const input = this.editBody.querySelector('#edit-input-title');
      if (input) {
        memory.title = input.value.trim();
        memory.userContext = memory.title;
        this.hasChanges = true;
      }
    }
    
    if (field === 'content') {
      const textarea = this.editBody.querySelector('#edit-input-content');
      if (textarea && textarea.value.trim()) {
        memory.content = textarea.value.trim();
        this.hasChanges = true;
      }
    }
    
    if (field === 'category') {
      const selectedOpt = this.editBody.querySelector('.edit-option.selected');
      const customInput = this.editBody.querySelector('#edit-input-category');
      const customCat = customInput ? customInput.value.trim().toLowerCase() : '';
      const newCategory = customCat || (selectedOpt ? selectedOpt.dataset.value : memory.category);
      
      if (newCategory && newCategory !== memory.category) {
        memory.category = newCategory;
        this.hasChanges = true;
      }
    }
    
    if (field === 'tags') {
      const input = this.editBody.querySelector('#edit-input-tag');
      if (input && input.value.trim()) {
        const newTag = input.value.trim().toLowerCase();
        if (!memory.tags) memory.tags = [];
        if (!memory.tags.includes(newTag)) {
          memory.tags.push(newTag);
          this.hasChanges = true;
        }
      }
    }
    
    this.closeEditDialog();
    this.render();
  },
  
  showDeleteDialog() {
    const deleteDialog = document.getElementById('delete-dialog');
    deleteDialog.classList.add('active');
    
    const handleCancel = () => {
      deleteDialog.classList.remove('active');
    };
    
    const handleConfirm = async () => {
      const memory = Store.getCurrentMemory();
      try {
        await API.deleteMemory(memory.id);
        
        Archive.memories = Archive.memories.filter(m => m.id !== memory.id);
        Store.setMemoriesRef(Archive.memories);
        
        deleteDialog.classList.remove('active');
        this.overlay.classList.remove('active');
        this.isOpen = false;
        Toast.show('Memory deleted', 'success');
        
        if (App.currentView === 'memories') {
          Archive.render();
        }
        App.refreshStats();
      } catch (e) {
        console.error('Failed to delete', e);
        Toast.show('Failed to delete memory', 'error');
      }
    };
    
    document.getElementById('delete-cancel-btn').onclick = handleCancel;
    document.getElementById('delete-confirm-btn').onclick = handleConfirm;
  }
};

// Toast notifications
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};
