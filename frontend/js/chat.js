const Chat = {
  messages: [],
  history: [],
  currentCitations: [],
  selectedCategories: [],
  selectedTags: [],
  
  init() {
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    
    this.sendBtn.addEventListener('click', () => this.send());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });
    
    this.inputEl.addEventListener('input', () => {
      this.inputEl.style.height = 'auto';
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 150) + 'px';
    });
    
    this.setupCategoryDropdown();
    this.setupTagsDropdown();
    this.renderCategoryDropdown();
    this.renderTagsDropdown();
  },
  
  async send() {
    const message = this.inputEl.value.trim();
    if (!message) return;
    
    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';
    
    if (this.messages.length === 0) {
      this.messagesEl.innerHTML = '';
    }
    
    this.addMessage('user', message);
    this.history.push({ role: 'user', content: message });
    
    const loadingEl = this.addMessage('assistant', 'Thinking...', true);
    
    try {
      const filters = {
        categories: this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
        tags: this.selectedTags.length > 0 ? this.selectedTags : undefined,
      };
      const response = await API.chat(message, this.history, filters);
      loadingEl.remove();
      
      this.currentCitations = response.citations || [];
      this.addAssistantMessage(response.answer, response.citations);
      this.history.push({ role: 'assistant', content: response.answer });
    } catch (e) {
      loadingEl.remove();
      this.addMessage('assistant', 'Sorry, something went wrong. Try again.');
      console.error('chat error', e);
    }
  },
  
  addMessage(role, content, isLoading = false) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    if (isLoading) div.classList.add('loading');
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    div.appendChild(contentDiv);
    this.messagesEl.appendChild(div);
    this.scrollToBottom();
    this.messages.push({ role, content });
    return div;
  },
  
  addAssistantMessage(content, citations = []) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    let html = this.renderCitationMarkers(content, citations);
    contentDiv.innerHTML = html;
    
    if (citations.length > 0) {
      const citationsHtml = this.renderCitationsList(citations);
      contentDiv.innerHTML += citationsHtml;
    }
    
    div.appendChild(contentDiv);
    this.messagesEl.appendChild(div);
    
    // Click handlers for citations - open unified preview
    div.querySelectorAll('.citation-marker').forEach(marker => {
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(marker.dataset.idx);
        if (citations[idx]) {
          Preview.openById(citations[idx].memoryId);
        }
      });
    });
    
    div.querySelectorAll('.citation-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx);
        if (citations[idx]) {
          Preview.openById(citations[idx].memoryId);
        }
      });
    });
    
    this.scrollToBottom();
    this.messages.push({ role: 'assistant', content });
    return div;
  },
  
  renderCitationMarkers(text, citations) {
    // Create a map of citation index to array position
    const citationIndexMap = new Map();
    citations.forEach((c, i) => {
      citationIndexMap.set(c.index, i);
    });
    
    // Match both single citations [1] and multiple citations [1, 2] or [1, 2, 3]
    return text.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (fullMatch, numsStr) => {
      const numbers = numsStr.split(',').map(n => parseInt(n.trim()));
      
      // Check if all numbers are valid citations
      const allValid = numbers.every(num => {
        const arrayIdx = citationIndexMap.get(num);
        return arrayIdx !== undefined && arrayIdx >= 0 && arrayIdx < citations.length;
      });
      
      // Use the first valid citation's index for click handling (or first number if all valid)
      const firstValidIdx = numbers.find(num => {
        const arrayIdx = citationIndexMap.get(num);
        return arrayIdx !== undefined && arrayIdx >= 0 && arrayIdx < citations.length;
      });
      const arrayIdx = firstValidIdx !== undefined ? citationIndexMap.get(firstValidIdx) : null;
      
      if (allValid && arrayIdx !== null) {
        // All citations are valid - wrap entire [1, 2] in one styled span
        return `<span class="citation-marker" data-idx="${arrayIdx}">[${numsStr}]</span>`;
      } else {
        // Some citations invalid - style but don't make clickable
        return `<span class="citation-marker-unlinked">[${numsStr}]</span>`;
      }
    });
  },
  
  renderCitationsList(citations) {
    const cards = citations.map((c, arrayIdx) => {
      const date = new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const categoryIcon = Store.getCategoryIcon(c.category || c.type);
      
      // Build tags HTML
      let tagsHtml = '';
      if (c.tags && c.tags.length > 0) {
        tagsHtml = c.tags.slice(0, 3).map(tag => 
          `<span class="citation-tag">${Store.capitalize(tag)}</span>`
        ).join('');
      }
      
      return `
        <div class="citation-card" data-idx="${arrayIdx}">
          <div class="citation-header-compact">
            <span class="citation-num">[${c.index}]</span>
            <div class="citation-content-wrapper">
              <div class="citation-title-row">
                ${c.userContext ? `<span class="citation-title">${Store.escapeHtml(c.userContext)}</span>` : ''}
                <span class="citation-meta-inline">${categoryIcon} ${Store.capitalize(c.category || c.type)} · ${date}</span>
              </div>
              <div class="citation-text-preview">${Store.escapeHtml(c.content)}</div>
              ${tagsHtml ? `<div class="citation-tags">${tagsHtml}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div class="citations-list-compact">
        <span class="citations-label">Sources</span>
        ${cards}
      </div>
    `;
  },
  
  scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  },
  
  setupCategoryDropdown() {
    const btn = document.getElementById('ask-category-dropdown-btn');
    const menu = document.getElementById('ask-category-dropdown-menu');
    const dropdown = document.getElementById('ask-category-dropdown');
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagsMenu = document.getElementById('ask-tags-dropdown-menu');
      const tagsDropdown = document.getElementById('ask-tags-dropdown');
      const isCurrentlyActive = menu.classList.contains('active');
      
      // Close tags dropdown if opening category dropdown
      tagsMenu.classList.remove('active');
      tagsDropdown.classList.remove('active');
      
      // Toggle category dropdown
      menu.classList.toggle('active');
      dropdown.classList.toggle('active', menu.classList.contains('active'));
      this.renderCategoryDropdown();
    });
    
    document.addEventListener('click', () => {
      menu.classList.remove('active');
      dropdown.classList.remove('active');
    });
    
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  },
  
  setupTagsDropdown() {
    const btn = document.getElementById('ask-tags-dropdown-btn');
    const menu = document.getElementById('ask-tags-dropdown-menu');
    const dropdown = document.getElementById('ask-tags-dropdown');
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const categoryMenu = document.getElementById('ask-category-dropdown-menu');
      const categoryDropdown = document.getElementById('ask-category-dropdown');
      const isCurrentlyActive = menu.classList.contains('active');
      
      // Close category dropdown if opening tags dropdown
      categoryMenu.classList.remove('active');
      categoryDropdown.classList.remove('active');
      
      // Toggle tags dropdown
      menu.classList.toggle('active');
      dropdown.classList.toggle('active', menu.classList.contains('active'));
      this.renderTagsDropdown();
    });
    
    document.addEventListener('click', () => {
      menu.classList.remove('active');
      dropdown.classList.remove('active');
    });
    
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  },
  
  renderCategoryDropdown() {
    const menu = document.getElementById('ask-category-dropdown-menu');
    
    // Get categories that have data (from App.categories which has counts)
    const categoriesWithData = Object.keys(App.categories || {}).filter(cat => (App.categories[cat] || 0) > 0);
    
    // Sort by count (desc), then alphabetically
    const sorted = categoriesWithData.sort((a, b) => {
      const countA = App.categories[a] || 0;
      const countB = App.categories[b] || 0;
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b);
    });
    
    const hasSelected = this.selectedCategories.length > 0;
    let html = `<div class="filter-dropdown-item ${!hasSelected ? 'selected' : ''}" data-category="">All Categories</div>`;
    
    if (sorted.length === 0) {
      html += '<div class="filter-dropdown-item" style="color: var(--text-muted);">No categories yet</div>';
    } else {
      html += sorted.map(cat => {
        const isSelected = this.selectedCategories.includes(cat);
        const count = App.categories[cat] || 0;
        return `
          <div class="filter-dropdown-item ${isSelected ? 'selected' : ''}" data-category="${cat}">
            <span>${Store.getCategoryIcon(cat)} ${Store.capitalize(cat)}</span>
            <span style="color: var(--text-muted); font-size: 11px;">${count}</span>
          </div>
        `;
      }).join('');
    }
    
    menu.innerHTML = html;
    
    menu.querySelectorAll('.filter-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const category = item.dataset.category;
        
        if (category === '') {
          // "All Categories" - clear selection
          this.selectedCategories = [];
        } else {
          // Toggle category selection
          const index = this.selectedCategories.indexOf(category);
          if (index > -1) {
            this.selectedCategories.splice(index, 1);
          } else {
            this.selectedCategories.push(category);
          }
        }
        this.updateCategoryBtnLabel();
        this.renderCategoryDropdown();
      });
    });
  },
  
  renderTagsDropdown() {
    const menu = document.getElementById('ask-tags-dropdown-menu');
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
        e.stopPropagation();
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
        this.renderTagsDropdown();
      });
    });
  },
  
  updateCategoryBtnLabel() {
    const btn = document.getElementById('ask-category-dropdown-btn');
    if (this.selectedCategories.length === 0) {
      btn.innerHTML = '<span>All categories</span><i class="fas fa-chevron-down"></i>';
    } else if (this.selectedCategories.length === 1) {
      const cat = this.selectedCategories[0];
      btn.innerHTML = `<span>${Store.getCategoryIcon(cat)} ${Store.capitalize(cat)}</span><i class="fas fa-chevron-down"></i>`;
    } else {
      btn.innerHTML = `<span>${this.selectedCategories.length} categories</span><i class="fas fa-chevron-down"></i>`;
    }
  },
  
  updateTagsBtnLabel() {
    const btn = document.getElementById('ask-tags-dropdown-btn');
    if (this.selectedTags.length === 0) {
      btn.innerHTML = '<span>All tags</span><i class="fas fa-chevron-down"></i>';
    } else if (this.selectedTags.length === 1) {
      btn.innerHTML = `<span>${Store.capitalize(this.selectedTags[0])}</span><i class="fas fa-chevron-down"></i>`;
    } else {
      btn.innerHTML = `<span>${this.selectedTags.length} tags</span><i class="fas fa-chevron-down"></i>`;
    }
  }
};
