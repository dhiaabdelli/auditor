export class DocumentationPage {
    constructor() {
        this.categories = [];
        this.subcategories = [];
        this.documents = [];
        this.allDocuments = []; // Store all documents for counting
        this.currentCategory = null;
        this.currentSubcategory = null;
        this.currentDocument = null;
        this.editMode = false;
        this.searchTerm = '';
        this.viewMode = 'list'; // 'grid' or 'list'
        this.modal = null;
    }

    escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async init() {
        await this.loadData();
    }

    async loadData() {
        await this.loadCategories();
        // Subcategories are now included in categories, so extract them
        this.extractSubcategoriesFromCategories();
        if (this.currentCategory) {
            if (this.currentSubcategory) {
                await this.loadDocuments();
            }
        } else {
            // Build allDocuments from categories data
            this.buildAllDocumentsFromCategories();
        }
    }

    extractSubcategoriesFromCategories() {
        // Extract subcategories from categories and store them
        this.subcategories = [];
        if (Array.isArray(this.categories)) {
            for (const category of this.categories) {
                if (category && category.subcategories && Array.isArray(category.subcategories)) {
                    // Add subcategories to the list, ensuring they have the category reference
                    category.subcategories.forEach(subcat => {
                        if (subcat && !this.subcategories.find(s => s.id === subcat.id)) {
                            this.subcategories.push(subcat);
                        }
                    });
                }
            }
        }
    }

    buildAllDocumentsFromCategories() {
        // Build allDocuments array from categories data for counting
        this.allDocuments = [];
        if (Array.isArray(this.categories)) {
            for (const category of this.categories) {
                if (category && category.subcategories && Array.isArray(category.subcategories)) {
                    category.subcategories.forEach(subcat => {
                        if (subcat && subcat.documentCount) {
                            // Create placeholder documents for counting
                            for (let i = 0; i < (subcat.documentCount || 0); i++) {
                                this.allDocuments.push({
                                    category: category.id,
                                    subcategory: subcat.id
                                });
                            }
                        }
                    });
                }
            }
        }
    }

    async loadSubcategories() {
        if (!this.currentCategory) {
            this.subcategories = [];
            return;
        }

        // Subcategories are already loaded with categories, just filter them
        const category = this.categories.find(c => c && c.id === this.currentCategory);
        if (category && category.subcategories && Array.isArray(category.subcategories)) {
            this.subcategories = category.subcategories;
        } else {
            this.subcategories = [];
        }
    }

    async loadAllDocuments() {
        // Documents are now loaded on-demand when needed
        // This function is kept for compatibility but uses the category data for counts
        this.buildAllDocumentsFromCategories();
    }

    getDocumentCount(categoryId) {
        // First try to get documentCount from category data
        const category = this.categories.find(c => c && c.id === categoryId);
        if (category && category.documentCount !== undefined && category.documentCount !== null) {
            return category.documentCount;
        }
        
        // Fallback to counting from allDocuments
        if (!this.allDocuments || !Array.isArray(this.allDocuments)) {
            return 0;
        }
        return this.allDocuments.filter(doc => doc && doc.category === categoryId).length;
    }

    getSubcategoryCount(categoryId) {
        // Get subcategory count from category data
        const category = this.categories.find(c => c && c.id === categoryId);
        if (category && category.subcategories && Array.isArray(category.subcategories)) {
            return category.subcategories.length;
        }
        return 0;
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/docs/categories');
            if (!response.ok) {
                throw new Error(`Failed to load categories: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            this.categories = Array.isArray(data) ? data : [];
            
            // If still empty after loading, try reloading once more (in case backend just initialized)
            if (this.categories.length === 0) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit
                const retryResponse = await fetch('/api/docs/categories');
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    this.categories = Array.isArray(retryData) ? retryData : [];
                }
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categories = [];
            // Show error message to user
            this.showError('Failed to load categories. Please refresh the page.');
        }
    }

    async showConfirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            if (!window.modalInstance) {
                this.showError('Modal system not available');
                resolve(false);
                return;
            }

            const modalContent = `
                <div class="confirmation-dialog">
                    <div class="confirmation-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <h3 class="confirmation-title">${this.escapeHtml(title)}</h3>
                    <p class="confirmation-message">${this.escapeHtml(message)}</p>
                </div>
            `;

            const modalActions = [
                {
                    label: 'Cancel',
                    class: 'btn-secondary',
                    onclick: 'modalInstance.close(); window.__confirmResult = false;'
                },
                {
                    label: 'Confirm',
                    class: 'btn-primary',
                    onclick: 'modalInstance.close(); window.__confirmResult = true;'
                }
            ];

            window.__confirmResult = null;
            window.modalInstance.open(title, modalContent, modalActions, false, true);

            // Wait for user action
            const checkResult = setInterval(() => {
                if (window.__confirmResult !== null) {
                    clearInterval(checkResult);
                    resolve(window.__confirmResult);
                    window.__confirmResult = null;
                }
            }, 100);
        });
    }

    async showPrompt(message, defaultValue = '', title = 'Input') {
        return new Promise((resolve) => {
            if (!window.modalInstance) {
                this.showError('Modal system not available');
                resolve(null);
                return;
            }

            const inputId = 'prompt-input-' + Date.now();
            const modalContent = `
                <div class="confirmation-dialog">
                    <p class="confirmation-message">${this.escapeHtml(message)}</p>
                    <input type="text" id="${inputId}" class="form-input" value="${this.escapeHtml(defaultValue)}" style="margin-top: 1rem; width: 100%;" autofocus>
                </div>
            `;

            const modalActions = [
                {
                    label: 'Cancel',
                    class: 'btn-secondary',
                    onclick: `modalInstance.close(); window.__promptResult = null;`
                },
                {
                    label: 'OK',
                    class: 'btn-primary',
                    onclick: `const input = document.getElementById('${inputId}'); modalInstance.close(); window.__promptResult = input ? input.value : null;`
                }
            ];

            window.__promptResult = null;
            window.modalInstance.open(title, modalContent, modalActions, false, true);

            // Focus input and handle Enter key
            setTimeout(() => {
                const input = document.getElementById(inputId);
                if (input) {
                    input.focus();
                    input.select();
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            window.__promptResult = input.value;
                            if (window.modalInstance) window.modalInstance.close();
                        }
                    });
                }
            }, 100);

            // Wait for user action
            const checkResult = setInterval(() => {
                if (window.__promptResult !== null) {
                    clearInterval(checkResult);
                    resolve(window.__promptResult);
                    window.__promptResult = null;
                }
            }, 100);
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message message-error';
        errorDiv.textContent = message;
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.zIndex = '1001';
        errorDiv.style.padding = '1rem 1.5rem';
        errorDiv.style.borderRadius = '0.5rem';
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'message message-success';
        successDiv.textContent = message;
        successDiv.style.position = 'fixed';
        successDiv.style.top = '20px';
        successDiv.style.right = '20px';
        successDiv.style.zIndex = '1001';
        successDiv.style.padding = '1rem 1.5rem';
        successDiv.style.borderRadius = '0.5rem';
        successDiv.style.backgroundColor = '#10b981';
        successDiv.style.color = '#ffffff';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }

    async loadDocuments() {
        if (!this.currentSubcategory) {
            this.documents = [];
            return;
        }

        try {
            const response = await fetch(`/api/docs/documents?subcategory=${this.currentSubcategory}`);
            if (!response.ok) throw new Error('Failed to load documents');
            const data = await response.json();
            this.documents = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error loading documents:', error);
            this.documents = [];
        }
    }

    async render() {
        // Ensure documents is always an array
        if (!Array.isArray(this.documents)) {
            this.documents = [];
        }
        if (!Array.isArray(this.categories)) {
            this.categories = [];
        }

        if (this.currentDocument && this.editMode) {
            return this.renderEditor();
        }
        if (this.currentDocument) {
            return this.renderDocument();
        }
        if (this.currentSubcategory) {
            return this.renderSubcategory();
        }
        if (this.currentCategory) {
            return this.renderCategory();
        }
        return this.renderMain();
    }

    renderMain() {
        // Ensure categories is an array
        if (!Array.isArray(this.categories)) {
            this.categories = [];
        }

        // Ensure searchTerm is a string
        const searchTerm = this.searchTerm || '';

        const filteredCategories = (this.categories || []).filter(cat => {
            if (!cat || !cat.name) return false;
            if (!searchTerm) return true;
            const search = searchTerm.toLowerCase();
            return (cat.name && cat.name.toLowerCase().includes(search)) ||
                   (cat.description && cat.description.toLowerCase().includes(search));
        });

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div>
                            <h1 class="page-title">📚 Documentation</h1>
                            <p class="page-subtitle">Advanced knowledge base with attachments and scripts</p>
                        </div>
                        <div class="page-header-actions">
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" class="search-input" placeholder="Search categories..." 
                                       value="${this.searchTerm}" oninput="docInstance.setSearchTerm(this.value)">
                            </div>
                            <button class="btn btn-secondary" onclick="docInstance.showNewCategoryModal()">
                                <i class="fas fa-plus"></i> New Category
                            </button>
                        </div>
                    </div>
                </div>

                <div class="docs-grid-advanced">
                    ${filteredCategories.map(category => {
                        if (!category || !category.id) return '';
                        // Count will be loaded when category is opened
                        return `
                            <div class="doc-category-card-advanced" onclick="docInstance.openCategory('${this.escapeHtml(category.id)}')">
                                <div class="category-card-header" style="background: linear-gradient(135deg, ${category.color || '#3b82f6'}15 0%, ${category.color || '#3b82f6'}25 100%);">
                                    <div class="category-card-icon-advanced" style="background: ${category.color || '#3b82f6'}20; border-color: ${category.color || '#3b82f6'}40;">
                                        <i class="fas ${category.icon || 'fa-folder'}" style="color: ${category.color || '#3b82f6'};"></i>
                                    </div>
                                    <div class="category-card-badge">${this.getSubcategoryCount(category.id)}</div>
                                </div>
                                <div class="category-card-body">
                                    <h3 class="category-card-title-advanced">${this.escapeHtml(category.name || 'Unnamed')}</h3>
                                    <p class="category-card-description-advanced">${this.escapeHtml(category.description || '')}</p>
                                    <div class="category-card-footer">
                                        <span class="category-card-link">
                                            View Documents <i class="fas fa-arrow-right"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).filter(html => html).join('')}
                </div>

                ${filteredCategories.length === 0 ? `
                    <div class="empty-state-advanced">
                        <div class="empty-state-icon">
                            <i class="fas fa-folder-open"></i>
                        </div>
                        <h3>No categories found</h3>
                        <p>Create a new category to get started with your documentation</p>
                        <button class="btn btn-secondary" onclick="docInstance.showNewCategoryModal()">
                            <i class="fas fa-plus"></i> Create Category
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderCategory() {
        if (!Array.isArray(this.categories)) {
            this.categories = [];
        }
        if (!Array.isArray(this.subcategories)) {
            this.subcategories = [];
        }
        const category = this.categories.find(c => c && c.id === this.currentCategory);
        
        // Filter subcategories by search term
        const searchTerm = (this.searchTerm || '').toLowerCase();
        const filteredSubcats = this.subcategories.filter(subcat => {
            if (!subcat || !subcat.name) return false;
            if (!searchTerm) return true;
            return subcat.name.toLowerCase().includes(searchTerm) ||
                   (subcat.description && subcat.description.toLowerCase().includes(searchTerm));
        });

        // Count documents per subcategory - use data from category
        const getSubcategoryDocCount = (subcatId) => {
            // Find subcategory in the current category's subcategories
            if (category && category.subcategories && Array.isArray(category.subcategories)) {
                const subcat = category.subcategories.find(s => s && s.id === subcatId);
                if (subcat && subcat.documentCount !== undefined) {
                    return subcat.documentCount;
                }
            }
            // Fallback to counting from allDocuments
            if (!this.allDocuments || !Array.isArray(this.allDocuments)) return 0;
            return this.allDocuments.filter(doc => doc && doc.subcategory === subcatId).length;
        };

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button class="btn btn-icon" onclick="docInstance.backToMain()">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="page-title">
                                    <i class="fas ${category?.icon}" style="color: ${category?.color};"></i> ${this.escapeHtml(category?.name || 'Category')}
                                </h1>
                                ${category?.description ? `<p class="page-subtitle">${this.escapeHtml(category?.description || '')}</p>` : ''}
                            </div>
                        </div>
                        <div class="page-header-actions">
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" class="search-input" placeholder="Search subcategories..." 
                                       value="${this.searchTerm}" oninput="docInstance.setSearchTerm(this.value)">
                            </div>
                            <button class="btn btn-secondary" onclick="docInstance.showNewSubcategoryModal()">
                                <i class="fas fa-plus"></i> New Subcategory
                            </button>
                            <button class="btn btn-secondary" onclick="docInstance.showEditCategoryModal()">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button class="btn btn-icon-small btn-secondary" onclick="docInstance.deleteCategoryFromView('${this.currentCategory}')" title="Delete Category">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="docs-grid-advanced">
                        ${filteredSubcats.map(subcat => {
                        if (!subcat || !subcat.id) return '';
                        const docCount = getSubcategoryDocCount(subcat.id);
                        return `
                            <div class="doc-category-card-advanced" onclick="docInstance.openSubcategory('${this.escapeHtml(subcat.id)}')">
                                <div class="category-card-header" style="background: linear-gradient(135deg, ${category?.color || '#3b82f6'}15 0%, ${category?.color || '#3b82f6'}25 100%);">
                                    <div class="category-card-icon-advanced" style="background: ${category?.color || '#3b82f6'}20; border-color: ${category?.color || '#3b82f6'}40;">
                                        <i class="fas fa-folder" style="color: ${category?.color || '#3b82f6'};"></i>
                                    </div>
                                    <div class="category-card-badge">${docCount}</div>
                                </div>
                                <div class="category-card-body">
                                    <h3 class="category-card-title-advanced">${this.escapeHtml(subcat.name || 'Unnamed')}</h3>
                                    <p class="category-card-description-advanced">${this.escapeHtml(subcat.description || '')}</p>
                                    <div class="category-card-footer">
                                        <span class="category-card-link">
                                            View Documents <i class="fas fa-arrow-right"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).filter(html => html).join('')}
                </div>

                ${filteredSubcats.length === 0 ? `
                    <div class="empty-state-advanced">
                        <div class="empty-state-icon">
                            <i class="fas fa-folder-open"></i>
                        </div>
                        <h3>No subcategories found</h3>
                        <p>This category doesn't have any subcategories yet</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderSubcategory() {
        if (!Array.isArray(this.categories)) {
            this.categories = [];
        }
        if (!Array.isArray(this.subcategories)) {
            this.subcategories = [];
        }
        const category = this.categories.find(c => c && c.id === this.currentCategory);
        const subcategory = this.subcategories.find(s => s && s.id === this.currentSubcategory);
        const filteredDocs = this.getFilteredDocuments();

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button class="btn btn-icon" onclick="docInstance.backToCategory()">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="page-title">
                                    <i class="fas ${category?.icon}" style="color: ${category?.color};"></i> ${this.escapeHtml(category?.name || 'Category')} <i class="fas fa-chevron-right" style="color: #94a3b8; font-size: 0.875em; margin: 0 0.5rem;"></i> ${this.escapeHtml(subcategory?.name || 'Subcategory')}
                                </h1>
                                ${subcategory?.description ? `<p class="page-subtitle">${this.escapeHtml(subcategory?.description || '')}</p>` : ''}
                            </div>
                        </div>
                        <div class="page-header-actions">
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" class="search-input" placeholder="Search documents..." 
                                       value="${this.searchTerm}" oninput="docInstance.setSearchTerm(this.value)">
                            </div>
                            <button class="btn btn-primary" onclick="docInstance.showNewDocumentModal()">
                                <i class="fas fa-plus"></i> New Document
                            </button>
                            <button class="btn btn-secondary" onclick="docInstance.showEditSubcategoryModal()">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button class="btn btn-icon-small btn-secondary" onclick="docInstance.deleteSubcategoryFromView('${this.currentSubcategory}', '${this.escapeHtml(subcategory?.name || '')}')" title="Delete Subcategory">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="docs-list-advanced ${this.viewMode === 'grid' ? 'docs-grid-view' : 'docs-list-view'}">
                    ${filteredDocs.map(doc => this.renderDocumentCard(doc)).join('')}
                </div>

                ${filteredDocs.length === 0 ? `
                    <div class="empty-state-advanced">
                        <div class="empty-state-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <h3>No documents found</h3>
                        <p>Create your first document to get started</p>
                        <button class="btn btn-primary" onclick="docInstance.showNewDocumentModal()">
                            <i class="fas fa-plus"></i> Create Document
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }


    renderDocumentCard(doc) {
        if (!doc) return '';
        const hasAttachments = (doc.attachmentCount || 0) > 0;
        const hasScripts = doc.hasScripts || false;
        
        // Get category info for color
        const category = this.categories.find(c => c && c.id === doc.category);
        const categoryColor = category?.color || '#3b82f6';
        const categoryIcon = category?.icon || 'fa-file-alt';
        
        // Convert hex color to RGB for rgba usage
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 59, g: 130, b: 246 };
        };
        const rgb = hexToRgb(categoryColor);

        return `
            <div class="doc-item-card-advanced" onclick="docInstance.openDocument('${doc.id}')" 
                 style="border-left: 3px solid ${categoryColor}; --category-color: ${categoryColor}; --category-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};">
                <div class="doc-item-main-content">
                    <div class="doc-item-left">
                        <div class="doc-item-icon-advanced" style="background: linear-gradient(135deg, ${categoryColor}15 0%, ${categoryColor}25 100%); border-color: ${categoryColor}40;">
                            <i class="fas fa-file-alt" style="color: ${categoryColor};"></i>
                        </div>
                    </div>
                    <div class="doc-item-center">
                        <div class="doc-item-header-row">
                            <h3 class="doc-item-title-advanced">${doc.title}</h3>
                            <span class="doc-item-date-advanced">
                                ${this.formatDate(doc.updatedAt)}
                            </span>
                        </div>
                        <div class="doc-item-meta-row">
                            ${(hasAttachments || hasScripts) ? `
                                <div class="doc-item-badges-row">
                                    ${hasAttachments ? `
                                        <span class="doc-badge attachment-badge-inline" title="Has attachments">
                                            <i class="fas fa-paperclip"></i> Attachments (${doc.attachmentCount})
                                        </span>
                                    ` : ''}
                                    ${hasScripts ? `
                                        <span class="doc-badge script-badge-inline" title="Contains scripts">
                                            <i class="fas fa-code"></i> Scripts
                                        </span>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDocument() {
        if (!Array.isArray(this.categories)) {
            this.categories = [];
        }
        if (!Array.isArray(this.documents)) {
            this.documents = [];
        }
        
        const doc = this.getCurrentDocument();
        if (!doc) {
            return this.renderMain();
        }
        
        const category = this.categories.find(c => c && c.id === doc.category);
        const subcategory = doc.subcategory ? this.subcategories.find(s => s && s.id === doc.subcategory) : null;

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button class="btn btn-icon" onclick="docInstance.backFromDocument()">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                                <h1 class="page-title">
                                    ${category ? `<i class="fas ${category.icon}" style="color: ${category.color};"></i> ${this.escapeHtml(category.name || 'Category')}` : ''}
                                    ${subcategory ? ` <i class="fas fa-chevron-right" style="color: #94a3b8; font-size: 0.875em; margin: 0 0.5rem;"></i> ${this.escapeHtml(subcategory.name || 'Subcategory')}` : ''}
                                    ${subcategory ? ` <i class="fas fa-chevron-right" style="color: #94a3b8; font-size: 0.875em; margin: 0 0.5rem;"></i> ${this.escapeHtml(doc.title)}` : (category ? ` <i class="fas fa-chevron-right" style="color: #94a3b8; font-size: 0.875em; margin: 0 0.5rem;"></i> ${this.escapeHtml(doc.title)}` : this.escapeHtml(doc.title))}
                                </h1>
                            </div>
                        </div>
                        <div class="page-header-actions">
                            <span class="doc-item-date-advanced" style="margin-right: 0.75rem;">
                                ${this.formatDate(doc.updatedAt)}
                            </span>
                            <button class="btn btn-attachments" onclick="docInstance.manageAttachments('${doc.id}')" title="Manage Attachments">
                                <i class="fas fa-paperclip"></i> Attachments
                                ${doc.attachmentCount > 0 ? `<span class="attachment-badge">${doc.attachmentCount}</span>` : ''}
                            </button>
                            <button class="btn btn-secondary" onclick="docInstance.exportDocument('${doc.id}')">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="btn btn-primary" onclick="docInstance.editDocument('${doc.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                </div>

                <div class="doc-viewer-advanced">
                    <div class="doc-content-advanced">
                        ${this.renderMarkdown(doc.content, false)}
                        ${this.renderAttachmentsSync(doc.id)}
                        ${this.renderScriptsSync(doc.id)}
                    </div>
                </div>
            </div>
        `;
    }

    renderAttachmentsSync(docId) {
        // This will be populated async after mount
        return '<div id="attachments-container"></div>';
    }

    renderScriptsSync(docId) {
        const doc = this.getCurrentDocument();
        if (!doc) return '';
        
        const codeBlocks = this.extractCodeBlocks(doc.content);
        if (codeBlocks.length === 0) return '';

        return `
            <div class="scripts-section">
                <h3><i class="fas fa-code"></i> Scripts</h3>
                ${codeBlocks.map((block, index) => `
                    <div class="script-block">
                        <div class="script-header">
                            <span class="script-language">${block.language || 'code'}</span>
                            <div class="script-actions">
                                <button class="btn-icon-small" onclick="docInstance.copyScript(${index})" title="Copy">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button class="btn-icon-small" onclick="docInstance.downloadScript(${index}, '${block.language || 'txt'}')" title="Download">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        </div>
                        <pre class="script-content"><code class="language-${block.language || 'text'}">${this.escapeHtml(block.code)}</code></pre>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadAttachmentsForDisplay(docId) {
        try {
            const attachments = await this.getAttachments(docId);
            const container = document.getElementById('attachments-container');
            if (!container) return;
            
            // Ensure attachments is an array
            const attArray = Array.isArray(attachments) ? attachments : [];
            
            if (attArray.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = `
                <div class="attachments-section">
                    <h3><i class="fas fa-paperclip"></i> Attachments</h3>
                    <div class="attachments-grid">
                        ${attArray.filter(att => att != null).map(att => `
                            <div class="attachment-card">
                                <div class="attachment-card-header">
                                    <div class="attachment-icon">
                                        <i class="fas ${this.getFileIcon(att.type || 'file')}"></i>
                                    </div>
                                    <div class="attachment-card-body">
                                        <div class="attachment-name">${this.escapeHtml(att.name || 'Unknown')}</div>
                                        <div class="attachment-meta">
                                            <span>${this.formatFileSize(att.size || 0)}</span>
                                            <span>•</span>
                                            <span>${this.formatDate(att.uploadedAt || att.uploaded_at || new Date())}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="attachment-card-footer">
                                    <button class="btn-icon-small" onclick="docInstance.viewAttachment('${att.id}', '${this.escapeHtml(att.name || '')}', '${att.type || ''}')" title="View">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn-icon-small" onclick="docInstance.downloadAttachment('${att.id}')" title="Download">
                                        <i class="fas fa-download"></i>
                                    </button>
                                    <button class="btn-icon-small btn-danger" onclick="docInstance.deleteAttachment('${att.id}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading attachments for display:', error);
            const container = document.getElementById('attachments-container');
            if (container) {
                container.innerHTML = '';
            }
        }
    }

    renderEditor() {
        const doc = this.getCurrentDocument();
        const isNew = !doc;

        return `
            <div class="page-container-full">
                <div class="page-header">
                    <div class="page-header-content">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <button class="btn btn-icon" onclick="docInstance.cancelEdit()">
                                <i class="fas fa-arrow-left"></i>
                            </button>
                            <div>
                                <h1 class="page-title">${isNew ? 'New Document' : 'Edit Document'}</h1>
                            </div>
                        </div>
                        <div class="page-header-actions">
                            <button class="btn btn-secondary" onclick="docInstance.cancelEdit()">
                                Cancel
                            </button>
                            <button class="btn btn-primary" onclick="docInstance.saveDocument()">
                                <i class="fas fa-save"></i> Save
                            </button>
                        </div>
                    </div>
                </div>

                <div class="doc-editor-advanced">
                    <div class="editor-form-advanced">
                        <div class="form-section">
                            <div class="form-group">
                                <label class="form-label">Title *</label>
                                <input type="text" id="doc-title" class="form-input" value="${doc?.title || ''}" placeholder="Document title...">
                            </div>
                        </div>
                        <div class="form-section">
                            <label class="form-label">Content (Markdown supported) *</label>
                            <div class="editor-toolbar-advanced">
                                <div class="toolbar-group">
                                    <button class="toolbar-btn" data-markdown-before="# " data-markdown-after="" title="Heading">
                                        <i class="fas fa-heading"></i>
                                    </button>
                                    <button class="toolbar-btn" data-markdown-before="## " data-markdown-after="" title="Subheading">
                                        <i class="fas fa-heading" style="font-size: 0.75rem;"></i>
                                    </button>
                                </div>
                                <div class="toolbar-group">
                                    <button class="toolbar-btn" data-markdown-before="**" data-markdown-after="**" title="Bold">
                                        <i class="fas fa-bold"></i>
                                    </button>
                                    <button class="toolbar-btn" data-markdown-before="*" data-markdown-after="*" title="Italic">
                                        <i class="fas fa-italic"></i>
                                    </button>
                                </div>
                                <div class="toolbar-group">
                                    <button class="toolbar-btn" data-markdown-before="\`" data-markdown-after="\`" title="Inline Code">
                                        <i class="fas fa-code"></i>
                                    </button>
                                    <button class="toolbar-btn" data-markdown-before="\`\`\`\n" data-markdown-after="\n\`\`\`" title="Code Block">
                                        <i class="fas fa-file-code"></i>
                                    </button>
                                </div>
                                <div class="toolbar-group">
                                    <button class="toolbar-btn" data-markdown-before="- " data-markdown-after="" title="List">
                                        <i class="fas fa-list-ul"></i>
                                    </button>
                                    <button class="toolbar-btn" data-markdown-before="1. " data-markdown-after="" title="Numbered List">
                                        <i class="fas fa-list-ol"></i>
                                    </button>
                                </div>
                                <div class="toolbar-group">
                                    <button class="toolbar-btn" data-markdown-before="> " data-markdown-after="" title="Quote">
                                        <i class="fas fa-quote-right"></i>
                                    </button>
                                    <button class="toolbar-btn" data-markdown-before="[Link](" data-markdown-after=")" title="Link">
                                        <i class="fas fa-link"></i>
                                    </button>
                                </div>
                                <div class="toolbar-group">
                                    <button class="toolbar-btn" onclick="docInstance.insertImage()" title="Insert Image">
                                        <i class="fas fa-image"></i>
                                    </button>
                                    <button class="toolbar-btn" onclick="docInstance.insertTable()" title="Insert Table">
                                        <i class="fas fa-table"></i>
                                    </button>
                                    <button class="toolbar-btn" onclick="docInstance.insertChecklist()" title="Insert Checklist">
                                        <i class="fas fa-check-square"></i>
                                    </button>
                                    <button class="toolbar-btn" onclick="docInstance.insertToggle()" title="Insert Toggle List">
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <button class="toolbar-btn" onclick="docInstance.insertCallout('info')" title="Insert Info Callout">
                                        <i class="fas fa-info-circle"></i>
                                    </button>
                                    <button class="toolbar-btn" onclick="docInstance.insertCallout('warning')" title="Insert Warning Callout">
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </button>
                                </div>
                                <div class="toolbar-group">
                                    <button class="toolbar-btn" onclick="docInstance.insertAlignment('left')" title="Align Left">
                                        <i class="fas fa-align-left"></i>
                                    </button>
                                    <button class="toolbar-btn" onclick="docInstance.insertAlignment('center')" title="Align Center">
                                        <i class="fas fa-align-center"></i>
                                    </button>
                                    <button class="toolbar-btn" onclick="docInstance.insertAlignment('right')" title="Align Right">
                                        <i class="fas fa-align-right"></i>
                                    </button>
                                </div>
                            </div>
                            <textarea id="doc-content" class="editor-textarea-advanced" placeholder="Start writing... Markdown is supported. Use code blocks for scripts." data-original-content="${this.escapeHtml((doc?.content || ''))}">${this.collapseBase64Images(doc?.content || '')}</textarea>
                        </div>
                        ${!isNew ? `
                            <div class="form-section">
                                <label class="form-label">Attachments</label>
                                <div class="attachment-upload-area" onclick="document.getElementById('file-input').click()">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Click to upload files or drag and drop</p>
                                    <input type="file" id="file-input" multiple style="display: none;" onchange="docInstance.handleFileUpload(event)">
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="editor-preview-advanced">
                        <div class="preview-header-advanced">
                            <span>Preview</span>
                            <button class="btn-icon-small" onclick="docInstance.togglePreview()">
                                <i class="fas fa-expand"></i>
                            </button>
                        </div>
                        <div class="preview-content-advanced" id="doc-preview">
                            ${this.renderMarkdown(doc?.content || '', true)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // API operations
    async saveCategory(category) {
        try {
            const method = category.id && this.categories.find(c => c.id === category.id) ? 'PUT' : 'POST';
            const response = await fetch('/api/docs/categories', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(category)
            });
            if (!response.ok) throw new Error('Failed to save category');
            return await response.json();
        } catch (error) {
            console.error('Error saving category:', error);
            throw error;
        }
    }

    async deleteCategory(id) {
        try {
            const response = await fetch(`/api/docs/categories?id=${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete category');
            return await response.json();
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }

    async deleteCategoryFromView(id) {
        const category = this.categories.find(c => c && c.id === id);
        const categoryName = category ? category.name : 'this category';
        const docCount = this.getDocumentCount(id);
        
        let confirmMessage = `Are you sure you want to delete "${categoryName}"?`;
        if (docCount > 0) {
            confirmMessage += `\n\nThis category contains ${docCount} document${docCount > 1 ? 's' : ''}. Deleting the category will also delete all documents and attachments in this category.`;
        }
        confirmMessage += '\n\nThis action cannot be undone.';
        
        const confirmed = await this.showConfirm(confirmMessage, 'Delete Category');
        if (!confirmed) {
            return;
        }
        
        try {
            await this.deleteCategory(id);
            
            // Navigate back to main page
            this.currentCategory = null;
            this.currentDocument = null;
            
            await this.loadCategories();
            this.extractSubcategoriesFromCategories();
            this.buildAllDocumentsFromCategories();
            await this.updateDisplay();
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showError('Error deleting category: ' + error.message);
        }
    }

    async showNewSubcategoryModal() {
        if (!this.currentCategory) {
            this.showError('Please select a category first.');
            return;
        }

        const modalContent = `
            <form id="subcategory-form" onsubmit="event.preventDefault(); docInstance.saveNewSubcategory();">
                <div class="form-group">
                    <label class="form-label">Subcategory Name *</label>
                    <input type="text" id="modal-subcategory-name" class="form-input" required placeholder="e.g., Hyper-V">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="modal-subcategory-description" class="form-input" rows="3" placeholder="Brief description of this subcategory"></textarea>
                </div>
            </form>
        `;

        const modalActions = [
            {
                label: 'Cancel',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            },
            {
                label: 'Create',
                class: 'btn-primary',
                icon: 'fas fa-check',
                onclick: 'docInstance.saveNewSubcategory()'
            }
        ];

        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        this.modal.open('Create New Subcategory', modalContent, modalActions);
    }

    async saveNewSubcategory() {
        const name = document.getElementById('modal-subcategory-name')?.value.trim();
        if (!name) {
            this.showError('Subcategory name is required');
            return;
        }

        const description = document.getElementById('modal-subcategory-description')?.value.trim() || '';

        const newSubcategory = {
            id: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            category: this.currentCategory,
            name: name,
            description: description
        };

        try {
            const response = await fetch('/api/docs/subcategories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSubcategory)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to create subcategory');
            }

            // Reload categories to get fresh data with subcategories
            await this.loadCategories();
            this.extractSubcategoriesFromCategories();
            this.buildAllDocumentsFromCategories();
            if (this.modal) this.modal.close();
            await this.updateDisplay();
        } catch (error) {
            this.showError('Error creating subcategory: ' + error.message);
        }
    }

    async deleteSubcategoryFromView(subcategoryId, subcategoryName) {
        const docCount = this.getSubcategoryDocCount(subcategoryId);
        
        let confirmMessage = `Are you sure you want to delete "${subcategoryName}"?`;
        if (docCount > 0) {
            confirmMessage += `\n\nThis subcategory contains ${docCount} document${docCount > 1 ? 's' : ''}. Deleting the subcategory will also delete all documents and attachments in this subcategory.`;
        }
        confirmMessage += '\n\nThis action cannot be undone.';
        
        const confirmed = await this.showConfirm(confirmMessage, 'Delete Subcategory');
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/docs/subcategories?id=${subcategoryId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to delete subcategory');
            }

            // Reload categories to get fresh data with subcategories
            await this.loadCategories();
            this.extractSubcategoriesFromCategories();
            this.buildAllDocumentsFromCategories();
            
            // If we were viewing this subcategory, go back to category view
            if (this.currentSubcategory === subcategoryId) {
                this.currentSubcategory = null;
                this.currentDocument = null;
            }
            
            await this.updateDisplay();
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            this.showError('Error deleting subcategory: ' + error.message);
        }
    }

    getSubcategoryDocCount(subcatId) {
        // Get document count from subcategory data
        if (!this.categories || !Array.isArray(this.categories)) return 0;
        
        for (const category of this.categories) {
            if (category && category.subcategories && Array.isArray(category.subcategories)) {
                const subcat = category.subcategories.find(s => s && s.id === subcatId);
                if (subcat && subcat.documentCount !== undefined) {
                    return subcat.documentCount;
                }
            }
        }
        
        // Fallback to counting from allDocuments
        if (!this.allDocuments || !Array.isArray(this.allDocuments)) return 0;
        return this.allDocuments.filter(doc => doc && doc.subcategory === subcatId).length;
    }

    async saveDocumentToDB(doc) {
        try {
            const method = doc.id ? 'PUT' : 'POST';
            const response = await fetch('/api/docs/documents', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doc)
            });
            if (!response.ok) throw new Error('Failed to save document');
            const result = await response.json();
            if (result.id) doc.id = result.id;
            return doc;
        } catch (error) {
            console.error('Error saving document:', error);
            throw error;
        }
    }

    async deleteDocumentFromDB(id) {
        try {
            const response = await fetch(`/api/docs/documents?id=${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete document');
            return await response.json();
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }

    async getAttachments(docId) {
        try {
            if (!docId) return [];
            const response = await fetch(`/api/docs/attachments?document_id=${docId}`);
            if (!response.ok) {
                throw new Error(`Failed to load attachments: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error loading attachments:', error);
            return [];
        }
    }

    async saveAttachment(attachment) {
        const formData = new FormData();
        formData.append('document_id', attachment.documentId);
        formData.append('file', attachment.file);

        try {
            const response = await fetch('/api/docs/attachments', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error('Failed to upload attachment');
            return await response.json();
        } catch (error) {
            console.error('Error saving attachment:', error);
            throw error;
        }
    }

    async deleteAttachmentFromDB(id) {
        try {
            const response = await fetch(`/api/docs/attachments?id=${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete attachment');
            return await response.json();
        } catch (error) {
            console.error('Error deleting attachment:', error);
            throw error;
        }
    }

    // Helper methods
    getCurrentDocument() {
        if (!this.currentDocument) return null;
        return this.documents.find(d => d.id === parseInt(this.currentDocument));
    }

    getFilteredDocuments() {
        // Ensure documents is an array
        if (!Array.isArray(this.documents)) {
            this.documents = [];
        }
        
        // Ensure we have a valid array to work with
        const docs = this.documents || [];
        let filtered = docs.filter(doc => doc != null); // Remove any null/undefined entries
        
        const searchTerm = (this.searchTerm || '').trim();
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(doc => {
                if (!doc) return false;
                const title = (doc.title || '').toLowerCase();
                const content = (doc.content || '').toLowerCase();
                return title.includes(search) || content.includes(search);
            });
        }
        
        return filtered;
    }

    getPreview(content, maxLength = 150) {
        if (!content) return 'No content';
        const text = content.replace(/[#*`\[\]]/g, '').replace(/\n/g, ' ').trim();
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        
        const now = new Date();
        // Reset time to midnight for accurate day comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = today - dateOnly;
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days === -1) return 'Tomorrow';
        if (days < 7 && days > 0) return `${days} days ago`;
        if (days > -7 && days < 0) return `In ${Math.abs(days)} days`;
        
        // For older dates, show formatted date
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    getFileIcon(type) {
        if (type.startsWith('image/')) return 'fa-image';
        if (type.includes('pdf')) return 'fa-file-pdf';
        if (type.includes('word')) return 'fa-file-word';
        if (type.includes('excel') || type.includes('spreadsheet')) return 'fa-file-excel';
        if (type.includes('powerpoint') || type.includes('presentation')) return 'fa-file-powerpoint';
        if (type.includes('zip') || type.includes('archive')) return 'fa-file-archive';
        if (type.includes('text') || type.includes('code') || type.includes('powershell') || type.includes('shellscript')) return 'fa-file-code';
        return 'fa-file';
    }

    detectLanguage(fileName, contentType) {
        const ext = fileName.toLowerCase().split('.').pop();
        const langMap = {
            'ps1': 'powershell', 'psm1': 'powershell', 'psd1': 'powershell', 'ps1xml': 'powershell',
            'js': 'javascript', 'ts': 'typescript',
            'py': 'python', 'rb': 'ruby', 'go': 'go',
            'java': 'java', 'cpp': 'cpp', 'c': 'c', 'h': 'c', 'cs': 'csharp',
            'php': 'php', 'sql': 'sql',
            'sh': 'bash', 'bat': 'batch', 'cmd': 'batch',
            'json': 'json', 'xml': 'xml', 'yaml': 'yaml', 'yml': 'yaml',
            'md': 'markdown', 'txt': 'text', 'log': 'text'
        };
        return langMap[ext] || 'text';
    }

    highlightSyntax(code, language) {
        if (language === 'text' || language === 'log') {
            return this.escapeHtml(code);
        }

        // Simple syntax highlighting for PowerShell
        if (language === 'powershell') {
            return this.highlightPowerShell(code);
        }

        // Simple syntax highlighting for JavaScript/TypeScript
        if (language === 'javascript' || language === 'typescript') {
            return this.highlightJavaScript(code);
        }

        // Simple syntax highlighting for Python
        if (language === 'python') {
            return this.highlightPython(code);
        }

        // Simple syntax highlighting for Bash/Shell
        if (language === 'bash' || language === 'batch') {
            return this.highlightBash(code);
        }

        // Default: escape HTML
        return this.escapeHtml(code);
    }

    highlightPowerShell(code) {
        let highlighted = this.escapeHtml(code);
        
        // Keywords
        const keywords = ['function', 'if', 'else', 'elseif', 'foreach', 'for', 'while', 'switch', 'case', 'default', 'break', 'continue', 'return', 'param', 'begin', 'process', 'end', 'try', 'catch', 'finally', 'throw', 'where', 'select', 'sort', 'group', 'measure', 'export', 'import', 'using', 'namespace', 'class', 'enum', 'interface', 'module', 'workflow'];
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="hl-keyword">$1</span>');
        });

        // Cmdlets (verbs-nouns pattern)
        highlighted = highlighted.replace(/\b(Get|Set|New|Remove|Add|Update|Test|Start|Stop|Restart|Resume|Suspend|Import|Export|Out|Write|Read|Convert|Select|Sort|Group|Measure|Where|ForEach|ForEach-Object|Where-Object|Select-Object|Sort-Object|Group-Object|Measure-Object)-[A-Z][a-zA-Z]+\b/g, '<span class="hl-function">$&</span>');

        // Strings (single and double quoted)
        highlighted = highlighted.replace(/(["'])((?:(?=(\\?))\3.)*?)\1/g, '<span class="hl-string">$1$2$1</span>');

        // Comments
        highlighted = highlighted.replace(/#.*$/gm, '<span class="hl-comment">$&</span>');

        // Variables
        highlighted = highlighted.replace(/\$[a-zA-Z_][a-zA-Z0-9_]*/g, '<span class="hl-variable">$&</span>');

        // Numbers
        highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="hl-number">$&</span>');

        return highlighted;
    }

    highlightJavaScript(code) {
        let highlighted = this.escapeHtml(code);
        
        // Keywords
        const keywords = ['function', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'var', 'let', 'const', 'class', 'extends', 'import', 'export', 'default', 'async', 'await', 'new', 'this', 'super', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined'];
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="hl-keyword">$1</span>');
        });

        // Strings
        highlighted = highlighted.replace(/(["'`])((?:(?=(\\?))\3.)*?)\1/g, '<span class="hl-string">$1$2$1</span>');

        // Comments
        highlighted = highlighted.replace(/\/\/.*$/gm, '<span class="hl-comment">$&</span>');
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '<span class="hl-comment">$&</span>');

        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="hl-function">$1</span>');

        // Numbers
        highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="hl-number">$&</span>');

        return highlighted;
    }

    highlightPython(code) {
        let highlighted = this.escapeHtml(code);
        
        // Keywords
        const keywords = ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'return', 'yield', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False', 'lambda', 'with', 'async', 'await'];
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="hl-keyword">$1</span>');
        });

        // Strings
        highlighted = highlighted.replace(/(["'""])((?:(?=(\\?))\3.)*?)\1/g, '<span class="hl-string">$1$2$1</span>');

        // Comments
        highlighted = highlighted.replace(/#.*$/gm, '<span class="hl-comment">$&</span>');

        // Functions
        highlighted = highlighted.replace(/\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="hl-keyword">def</span> <span class="hl-function">$1</span>');

        // Numbers
        highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="hl-number">$&</span>');

        return highlighted;
    }

    highlightBash(code) {
        let highlighted = this.escapeHtml(code);
        
        // Keywords
        const keywords = ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'break', 'continue', 'exit'];
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="hl-keyword">$1</span>');
        });

        // Strings
        highlighted = highlighted.replace(/(["'`])((?:(?=(\\?))\3.)*?)\1/g, '<span class="hl-string">$1$2$1</span>');

        // Comments
        highlighted = highlighted.replace(/#.*$/gm, '<span class="hl-comment">$&</span>');

        // Variables
        highlighted = highlighted.replace(/\$[a-zA-Z_][a-zA-Z0-9_]*/g, '<span class="hl-variable">$&</span>');

        // Commands (lines starting with commands)
        highlighted = highlighted.replace(/^([a-zA-Z_][a-zA-Z0-9_-]+)/gm, '<span class="hl-function">$1</span>');

        return highlighted;
    }

    copyToClipboard(event, text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show temporary success message
            const btn = event ? event.target.closest('button') : null;
            if (btn) {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.style.color = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.color = '';
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showError('Failed to copy to clipboard');
        });
    }

    extractCodeBlocks(content) {
        const blocks = [];
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            blocks.push({
                language: match[1] || 'text',
                code: match[2]
            });
        }
        return blocks;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    collapseBase64Images(content) {
        if (!content) return '';
        // Replace base64 image data with a placeholder
        // Pattern: ![alt](data:image/...;base64,VERY_LONG_STRING)
        return content.replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,([A-Za-z0-9+\/=]{100,})\)/g, (match, alt, base64) => {
            const imageName = alt || 'image';
            const truncated = base64.substring(0, 20) + '...';
            return `![${imageName}](<base64-image:${truncated}>)`;
        });
    }

    expandBase64Images(content) {
        if (!content) return '';
        // Restore base64 images from original content
        // This will be handled by restoring from data-original-content
        return content;
    }

    renderMarkdown(content, isEditMode = false) {
        if (!content) return '<p class="text-muted">No content</p>';
        
        // Enhanced markdown rendering with advanced features
        let html = content;
        
        // Code blocks (must be processed first to avoid interfering with other patterns)
        // Use placeholders to protect code blocks from other processing
        const codeBlockPlaceholders = [];
        let codeBlockIndex = 0;
        
        // Match code blocks - handle both ```lang\ncode``` and ```\ncode``` formats
        // Use non-greedy match with [\s\S] to capture all content including newlines
        html = html.replace(/```(\w+)?\n?([\s\S]*?)```/gim, (match, lang, code) => {
            const language = (lang && lang.trim()) || 'text';
            // Preserve all newlines in code - don't trim them unnecessarily
            let processedCode = code;
            // Only remove the first newline after ```lang if it exists (it's just formatting)
            // But preserve all other newlines which are part of the actual code
            if (processedCode.startsWith('\n')) {
                processedCode = processedCode.substring(1);
            }
            // Don't remove trailing newlines - they're part of the code structure
            // Escape HTML in code before highlighting to preserve structure
            const highlighted = this.highlightCode(processedCode, language);
            const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
            const escapedLanguage = this.escapeHtml(language);
            codeBlockPlaceholders.push({
                placeholder,
                html: `<div class="code-block-wrapper">
                    <div class="code-block-header">
                        <span class="code-block-language">${escapedLanguage}</span>
                        <button class="code-block-copy" onclick="docInstance.copyCodeBlock(this)" title="Copy code">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <pre class="code-block"><code class="language-${language}">${highlighted}</code></pre>
                </div>`
            });
            codeBlockIndex++;
            return placeholder;
        });
        
        // Inline code (after code blocks, but don't match inside code block placeholders)
        // First, handle multi-line inline code (backticks on different lines) - convert to code block
        html = html.replace(/`([^`]*?)\n+([^`]*?)`/gim, (match, code1, code2) => {
            // Don't process if this is inside a code block placeholder
            if (match.includes('__CODE_BLOCK_')) {
                return match;
            }
            // If backticks are on different lines, treat as code block
            const fullCode = (code1 + '\n' + code2).trim();
            if (fullCode) {
                const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
                // Try to detect language from code content using improved heuristics
                const detectedLang = this.detectCodeLanguage(fullCode);
                
                const escapedLanguage = this.escapeHtml(detectedLang);
                const highlighted = this.highlightCode(fullCode, detectedLang);
                codeBlockPlaceholders.push({
                    placeholder,
                    html: `<div class="code-block-wrapper">
                        <div class="code-block-header">
                            <span class="code-block-language">${escapedLanguage}</span>
                            <button class="code-block-copy" onclick="docInstance.copyCodeBlock(this)" title="Copy code">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        <pre class="code-block"><code class="language-${detectedLang}">${highlighted}</code></pre>
                    </div>`
                });
                codeBlockIndex++;
                return placeholder;
            }
            return match;
        });
        
        // Then handle single-line inline code (most common case)
        html = html.replace(/`([^`\n]+)`/gim, (match, code) => {
            // Don't process if this is inside a code block placeholder
            if (match.includes('__CODE_BLOCK_')) {
                return match;
            }
            return `<code class="inline-code">${this.escapeHtml(code)}</code>`;
        });
        
        // Replace code block placeholders after inline code processing
        codeBlockPlaceholders.forEach(item => {
            html = html.replace(item.placeholder, item.html);
        });
        
        // Headers
        html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
        html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Tables (must be processed before other line-based patterns)
        html = html.replace(/\|(.+)\|\n\|([-:|\s]+)\|\n((?:\|.+\|\n?)+)/gim, (match, header, separator, rows) => {
            const headers = header.split('|').map(h => h.trim()).filter(h => h);
            const rowLines = rows.trim().split('\n');
            
            let tableHtml = '<div class="table-wrapper"><table class="markdown-table">';
            
            // Header row
            tableHtml += '<thead><tr>';
            headers.forEach(h => {
                tableHtml += `<th>${this.escapeHtml(h)}</th>`;
            });
            tableHtml += '</tr></thead>';
            
            // Body rows
            tableHtml += '<tbody>';
            rowLines.forEach(row => {
                const cells = row.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length > 0) {
                    tableHtml += '<tr>';
                    cells.forEach(cell => {
                        // Process markdown in cells
                        let cellContent = this.escapeHtml(cell);
                        cellContent = cellContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        cellContent = cellContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
                        cellContent = cellContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
                        tableHtml += `<td>${cellContent}</td>`;
                    });
                    tableHtml += '</tr>';
                }
            });
            tableHtml += '</tbody></table></div>';
            
            return tableHtml;
        });
        
        // Images with advanced support and size attributes
        // Use a placeholder to prevent link regex from matching image content
        const imagePlaceholders = [];
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)(\{align:(left|center|right)\})?/gim, (match, alt, src, alignAttr, align) => {
            // Parse size from alt text if present (format: alt|widthxheight or alt|width)
            let imageAlt = alt || '';
            let width = '';
            let height = '';
            let displayAlt = imageAlt;
            let alignment = align || 'center'; // Default to center if not specified
            
            // Check for size in alt text: "description|100x200" or "description|100"
            if (imageAlt.includes('|')) {
                const parts = imageAlt.split('|');
                displayAlt = parts[0];
                const sizePart = parts[1];
                if (sizePart) {
                    if (sizePart.includes('x')) {
                        const [w, h] = sizePart.split('x');
                        width = w.trim();
                        height = h.trim();
                    } else {
                        width = sizePart.trim();
                    }
                }
            }
            
            // Build style attribute
            let styleParts = [];
            if (width) {
                const widthValue = width.includes('%') || width.includes('px') ? width : width + 'px';
                styleParts.push(`width: ${widthValue}`);
            }
            if (height) {
                const heightValue = height.includes('%') || height.includes('px') ? height : height + 'px';
                styleParts.push(`height: ${heightValue}`);
            }
            // Build style attribute
            let styleValue = '';
            if (styleParts.length > 0) {
                styleValue = styleParts.join('; ');
            }
            const styleAttr = styleValue ? ` style="${styleValue}"` : '';
            
            const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
            const escapedSrc = this.escapeHtml(src);
            const escapedAlt = this.escapeHtml(imageAlt);
            const escapedMatch = this.escapeHtml(match);
            const escapedDisplayAlt = this.escapeHtml(displayAlt || '');
            
            // Only show caption if there's actual alt text (not empty) - make sure we're not including style info
            const captionHtml = displayAlt && displayAlt.trim() && !displayAlt.includes('|') ? `<div class="image-caption">${escapedDisplayAlt}</div>` : '';
            
            // Build the HTML string carefully - ensure style is only in the attribute, never as text
            // Use template literals carefully to avoid any accidental text rendering
            let imgHtml = '<img src="' + src + '" alt="' + escapedDisplayAlt + '" class="markdown-image" loading="lazy"';
            if (styleAttr) {
                imgHtml += styleAttr;
            }
            imgHtml += ' />';
            
            // Only show resize handle in edit mode
            const resizeHandleHtml = isEditMode ? '<div class="image-resize-handle"><i class="fas fa-expand-arrows-alt"></i></div>' : '';
            
            // Add alignment class
            const alignmentClass = 'image-align-' + alignment;
            
            const wrapperHtml = '<div class="image-wrapper ' + alignmentClass + '" data-image-src="' + escapedSrc + '" data-image-alt="' + escapedAlt + '" data-original-content="' + escapedMatch + '" data-alignment="' + alignment + '">' +
                    imgHtml +
                    (captionHtml || '') +
                    resizeHandleHtml +
                '</div>';
            
            imagePlaceholders.push({
                placeholder,
                html: wrapperHtml
            });
            
            return placeholder;
        });
        
        // Toggle lists (collapsible sections) - must be before blockquotes
        const togglePlaceholders = [];
        let toggleIndex = 0;
        const lines = html.split('\n');
        let processedLines = [];
        let inToggle = false;
        let toggleContent = [];
        let toggleSummary = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const toggleMatch = line.match(/^>\s*\[toggle\]\s*(.+)$/);
            
            if (toggleMatch) {
                // Close previous toggle if open
                if (inToggle) {
                    const placeholder = `__TOGGLE_${toggleIndex}__`;
                    // Process toggle content for basic markdown
                    let processedContent = toggleContent.join('\n');
                    // Apply basic markdown formatting to toggle content
                    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
                    processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
                    processedContent = processedContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
                    processedContent = processedContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
                    processedContent = processedContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');
                    // Wrap in paragraphs
                    processedContent = processedContent.split('\n\n').map(p => {
                        p = p.trim();
                        if (!p || p.startsWith('<')) return p;
                        return `<p>${p}</p>`;
                    }).join('\n');
                    togglePlaceholders.push({
                        placeholder,
                        html: `<details class="toggle-list"><summary class="toggle-summary">${this.escapeHtml(toggleSummary)}</summary><div class="toggle-content">${processedContent}</div></details>`
                    });
                    processedLines.push(placeholder);
                    toggleIndex++;
                    toggleContent = [];
                }
                // Start new toggle
                inToggle = true;
                toggleSummary = toggleMatch[1];
            } else if (inToggle) {
                // Check if this is the end of toggle (empty line followed by non-toggle/callout content)
                if (line.trim() === '' && i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    if (nextLine && !nextLine.match(/^>\s*\[toggle\]/) && !nextLine.match(/^>\s*\[!/)) {
                        // End of toggle - process content
                        const placeholder = `__TOGGLE_${toggleIndex}__`;
                        let processedContent = toggleContent.join('\n');
                        // Apply basic markdown formatting to toggle content
                        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
                        processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
                        processedContent = processedContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
                        processedContent = processedContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
                        processedContent = processedContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');
                        // Wrap in paragraphs
                        processedContent = processedContent.split('\n\n').map(p => {
                            p = p.trim();
                            if (!p || p.startsWith('<')) return p;
                            return `<p>${p}</p>`;
                        }).join('\n');
                        togglePlaceholders.push({
                            placeholder,
                            html: `<details class="toggle-list"><summary class="toggle-summary">${this.escapeHtml(toggleSummary)}</summary><div class="toggle-content">${processedContent}</div></details>`
                        });
                        processedLines.push(placeholder);
                        processedLines.push(line);
                        toggleIndex++;
                        inToggle = false;
                        toggleContent = [];
                        toggleSummary = '';
                    } else {
                        toggleContent.push(line);
                    }
                } else if (line.match(/^>\s*\[toggle\]/)) {
                    // New toggle starts - close current one
                    const placeholder = `__TOGGLE_${toggleIndex}__`;
                    let processedContent = toggleContent.join('\n');
                    // Apply basic markdown formatting to toggle content
                    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
                    processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
                    processedContent = processedContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
                    processedContent = processedContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
                    processedContent = processedContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');
                    // Wrap in paragraphs
                    processedContent = processedContent.split('\n\n').map(p => {
                        p = p.trim();
                        if (!p || p.startsWith('<')) return p;
                        return `<p>${p}</p>`;
                    }).join('\n');
                    togglePlaceholders.push({
                        placeholder,
                        html: `<details class="toggle-list"><summary class="toggle-summary">${this.escapeHtml(toggleSummary)}</summary><div class="toggle-content">${processedContent}</div></details>`
                    });
                    processedLines.push(placeholder);
                    toggleIndex++;
                    inToggle = true;
                    const newToggleMatch = line.match(/^>\s*\[toggle\]\s*(.+)$/);
                    toggleSummary = newToggleMatch ? newToggleMatch[1] : '';
                    toggleContent = [];
                } else {
                    toggleContent.push(line);
                }
            } else {
                processedLines.push(line);
            }
        }
        
        // Close any remaining open toggle
        if (inToggle) {
            const placeholder = `__TOGGLE_${toggleIndex}__`;
            let processedContent = toggleContent.join('\n');
            // Apply basic markdown formatting to toggle content
            processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
            processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
            processedContent = processedContent.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            processedContent = processedContent.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            processedContent = processedContent.replace(/^# (.*$)/gim, '<h1>$1</h1>');
            // Wrap in paragraphs
            processedContent = processedContent.split('\n\n').map(p => {
                p = p.trim();
                if (!p || p.startsWith('<')) return p;
                return `<p>${p}</p>`;
            }).join('\n');
            togglePlaceholders.push({
                placeholder,
                html: `<details class="toggle-list"><summary class="toggle-summary">${this.escapeHtml(toggleSummary)}</summary><div class="toggle-content">${processedContent}</div></details>`
            });
            processedLines.push(placeholder);
        }
        
        html = processedLines.join('\n');
        
        // Callouts (Notion-style) - must be before blockquotes
        html = html.replace(/^>\s*\[!(info|warning|error|success|note|tip|important)\]\s*(.+)$/gim, (match, type, content) => {
            const icons = {
                info: 'fa-info-circle',
                warning: 'fa-exclamation-triangle',
                error: 'fa-times-circle',
                success: 'fa-check-circle',
                note: 'fa-sticky-note',
                tip: 'fa-lightbulb',
                important: 'fa-exclamation-circle'
            };
            const icon = icons[type.toLowerCase()] || 'fa-info-circle';
            return `<div class="callout callout-${type.toLowerCase()}"><div class="callout-icon"><i class="fas ${icon}"></i></div><div class="callout-content">${content}</div></div>`;
        });
        
        // Blockquotes (must be after toggles and callouts)
        html = html.replace(/^> (.*$)/gim, (match, content) => {
            // Skip if it's already processed as toggle or callout
            if (match.includes('toggle') || match.includes('[!')) return match;
            return `<blockquote>${content}</blockquote>`;
        });
        
        // Alignment divs (custom markdown extension) - process after other block elements
        html = html.replace(/<div align="(left|center|right)">([\s\S]*?)<\/div>/gim, (match, align, content) => {
            // Process content for markdown inside the div
            let processedContent = content;
            // Apply basic markdown formatting to content
            processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
            processedContent = processedContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
            return `<div style="text-align: ${align};">${processedContent}</div>`;
        });
        
        // Horizontal rules
        html = html.replace(/^---$/gim, '<hr>');
        html = html.replace(/^\*\*\*$/gim, '<hr>');
        html = html.replace(/^___$/gim, '<hr>');
        
        // Checklists (must be processed before regular lists)
        html = html.replace(/^[-*+]\s+\[([ xX])\]\s+(.+)$/gim, (match, checked, text) => {
            const isChecked = checked.toLowerCase() === 'x';
            return `<li class="checklist-item"><input type="checkbox" ${isChecked ? 'checked' : ''} disabled><span class="checklist-text">${text}</span></li>`;
        });
        
        // Lists (ordered and unordered) - must come after checklists
        html = html.replace(/^\d+\.\s+(.+)$/gim, '<li>$1</li>');
        html = html.replace(/^[-*+]\s+(.+)$/gim, (match, text) => {
            // Skip if it's already a checklist item
            if (match.includes('checklist-item')) return match;
            return `<li>${text}</li>`;
        });
        
        // Wrap consecutive list items (but preserve checklist items)
        html = html.replace(/(<li(?: class="checklist-item")?>.*?<\/li>\n?)+/g, (match) => {
            // Check if it contains checklist items
            if (match.includes('checklist-item')) {
                return `<ul class="markdown-list checklist-list">${match}</ul>`;
            }
            // Check if it's ordered (starts with number) or unordered
            const isOrdered = /^\d+\./.test(match);
            const listTag = isOrdered ? 'ol' : 'ul';
            return `<${listTag} class="markdown-list">${match}</${listTag}>`;
        });
        
        // Text formatting (must be before links to avoid conflicts)
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');
        html = html.replace(/==(.*?)==/gim, '<mark>$1</mark>');
        
        // Links (must be after images to avoid matching image syntax)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Replace image placeholders with actual HTML
        imagePlaceholders.forEach(item => {
            html = html.replace(item.placeholder, item.html);
        });
        
        // Replace toggle placeholders with actual HTML
        togglePlaceholders.forEach(item => {
            html = html.replace(item.placeholder, item.html);
        });
        
        // Line breaks and paragraphs
        html = html.split('\n\n').map(para => {
            para = para.trim();
            if (!para) return '';
            // Don't wrap if it's already a block element
            if (/^<(h[1-6]|ul|ol|table|div|blockquote|hr|pre)/.test(para)) {
                return para;
            }
            return `<p>${para}</p>`;
        }).join('\n');
        
        // Clean up multiple newlines
        html = html.replace(/\n{3,}/g, '\n\n');
        
        return `<div class="markdown-content-advanced">${html}</div>`;
    }

    detectCodeLanguage(code) {
        if (!code || !code.trim()) return 'text';
        
        const codeTrimmed = code.trim();
        const codeLower = codeTrimmed.toLowerCase();
        const firstLine = codeTrimmed.split('\n')[0].trim();
        const firstLineLower = firstLine.toLowerCase();
        
        // Check for shebang (most reliable indicator)
        if (firstLine.startsWith('#!')) {
            if (firstLineLower.includes('python') || firstLineLower.includes('python3')) {
                return 'python';
            } else if (firstLineLower.includes('node') || firstLineLower.includes('nodejs')) {
                return 'javascript';
            } else if (firstLineLower.includes('bash')) {
                return 'bash';
            } else if (firstLineLower.includes('sh')) {
                return 'bash';
            } else if (firstLineLower.includes('powershell') || firstLineLower.includes('pwsh')) {
                return 'powershell';
            } else if (firstLineLower.includes('ruby')) {
                return 'ruby';
            } else if (firstLineLower.includes('perl')) {
                return 'perl';
            }
        }
        
        // PowerShell detection (high priority - specific patterns)
        if (codeTrimmed.match(/^\$\w+\s*=/m) || // Variable assignment
            codeTrimmed.match(/Get-\w+|Set-\w+|New-\w+|Remove-\w+/m) || // Cmdlets
            codeTrimmed.match(/\$env:|\[System\.|\[Microsoft\./m) || // PowerShell-specific
            (codeTrimmed.includes('$') && codeTrimmed.match(/Write-Host|Write-Output|Write-Warning/m))) {
            return 'powershell';
        }
        
        // JavaScript/TypeScript detection
        if (codeTrimmed.match(/^(const|let|var)\s+\w+\s*=/m) || // Variable declarations
            codeTrimmed.match(/function\s+\w+\s*\(|=>\s*\{|=>\s*\w+/m) || // Functions/arrows
            codeTrimmed.match(/\.(then|catch|async|await)/m) || // Promises
            codeTrimmed.match(/require\(|import\s+.*from|export\s+(default\s+)?(function|const|class)/m) || // Modules
            codeTrimmed.match(/console\.(log|error|warn|info)/m) || // Console
            (codeTrimmed.includes('function') && codeTrimmed.includes('=>'))) {
            // Check for TypeScript-specific patterns
            if (codeTrimmed.match(/:\s*(string|number|boolean|any|void|interface|type|enum)/m) ||
                codeTrimmed.match(/<[A-Z]\w+>/m)) {
                return 'typescript';
            }
            return 'javascript';
        }
        
        // Python detection
        if (codeTrimmed.match(/^(def|class|import|from|if __name__)/m) || // Python keywords
            codeTrimmed.match(/print\s*\(|#.*python|\.py/m) || // Print statements
            codeTrimmed.match(/^\s*(if|for|while|def|class|import|from)\s+/m) || // Python structure
            (codeTrimmed.includes('def ') && codeTrimmed.includes(':')) ||
            (codeTrimmed.includes('import ') && codeTrimmed.includes('from '))) {
            return 'python';
        }
        
        // SQL detection
        if (codeTrimmed.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+/im) ||
            codeTrimmed.match(/FROM\s+\w+|WHERE\s+\w+|JOIN\s+\w+/im) ||
            codeTrimmed.match(/GROUP BY|ORDER BY|HAVING/im)) {
            return 'sql';
        }
        
        // Java detection
        if (codeTrimmed.match(/^(public|private|protected)\s+(static\s+)?(class|interface|enum)/m) ||
            codeTrimmed.match(/package\s+\w+;|import\s+\w+\.\w+;/m) ||
            codeTrimmed.match(/@Override|@Deprecated|System\.out\.println/m) ||
            (codeTrimmed.includes('public class') && codeTrimmed.includes('{'))) {
            return 'java';
        }
        
        // C# detection
        if (codeTrimmed.match(/^(public|private|protected|internal)\s+(static\s+)?(class|interface|enum|namespace)/m) ||
            codeTrimmed.match(/using\s+System|namespace\s+\w+|Console\.WriteLine/m) ||
            (codeTrimmed.includes('namespace') && codeTrimmed.includes('class'))) {
            return 'csharp';
        }
        
        // Go detection
        if (codeTrimmed.match(/^(package|import|func|var|const|type)\s+/m) ||
            codeTrimmed.match(/func\s+\w+\s*\(.*\)\s*\{|fmt\.Print|os\./m) ||
            (codeTrimmed.includes('package ') && codeTrimmed.includes('func '))) {
            return 'go';
        }
        
        // Rust detection
        if (codeTrimmed.match(/^(fn|let|mut|pub|struct|enum|impl|use)\s+/m) ||
            codeTrimmed.match(/fn\s+\w+\s*\(.*\)\s*->|println!|vec!/m) ||
            (codeTrimmed.includes('fn ') && codeTrimmed.includes('let '))) {
            return 'rust';
        }
        
        // Bash/Shell detection
        if (codeTrimmed.match(/^\s*#!\/bin\/(bash|sh)/m) ||
            codeTrimmed.match(/^\s*(if|for|while|case)\s+\[|echo\s+\$|export\s+\w+=/m) ||
            codeTrimmed.match(/\$\{|\$\(|`.*`/m) || // Variable expansion
            (codeTrimmed.includes('#!/bin/') && codeTrimmed.includes('echo'))) {
            return 'bash';
        }
        
        // HTML detection
        if (codeTrimmed.match(/^<!DOCTYPE|<html|<head|<body|<div|<span|<p|<h[1-6]/im) ||
            codeTrimmed.match(/<[a-z]+\s+[^>]*>/im)) {
            return 'html';
        }
        
        // CSS detection
        if (codeTrimmed.match(/^\s*\w+\s*\{|@media|@keyframes|\.\w+\s*\{|#\w+\s*\{/m) ||
            (codeTrimmed.includes('{') && codeTrimmed.includes('}') && codeTrimmed.includes(':'))) {
            return 'css';
        }
        
        // JSON detection
        if (codeTrimmed.match(/^\s*[\{\[]/m) && codeTrimmed.match(/[\}\]]\s*$/m) &&
            codeTrimmed.match(/"[^"]*"\s*:/m)) {
            return 'json';
        }
        
        // XML detection
        if (codeTrimmed.match(/^<\?xml|<\w+[^>]*>[\s\S]*<\/\w+>/m)) {
            return 'xml';
        }
        
        // YAML detection
        if (codeTrimmed.match(/^(\w+|\s+):\s*\w+|^---|^\.\.\./m) && 
            !codeTrimmed.includes('{') && !codeTrimmed.includes('}')) {
            return 'yaml';
        }
        
        // Ruby detection
        if (codeTrimmed.match(/^(def|class|module|require|include)\s+/m) ||
            codeTrimmed.match(/puts\s+|\.each\s*\{|\.map\s*\{/m) ||
            (codeTrimmed.includes('def ') && codeTrimmed.includes('end'))) {
            return 'ruby';
        }
        
        // PHP detection
        if (codeTrimmed.match(/^<\?php|<\?=/m) ||
            codeTrimmed.match(/\$\w+\s*=|echo\s+\$|function\s+\w+\s*\(/m)) {
            return 'php';
        }
        
        // C/C++ detection
        if (codeTrimmed.match(/^#include\s*[<"]|^int\s+main\s*\(|printf\s*\(|cout\s*<</m) ||
            (codeTrimmed.includes('#include') && codeTrimmed.includes('int main'))) {
            if (codeTrimmed.match(/std::|using namespace|cout|cin/m)) {
                return 'cpp';
            }
            return 'c';
        }
        
        // Markdown detection
        if (codeTrimmed.match(/^#{1,6}\s+\w+|^\*\s+\w+|^-\s+\w+|^\d+\.\s+\w+/m) ||
            codeTrimmed.match(/\[.*\]\(.*\)|!\[.*\]\(.*\)/m)) {
            return 'markdown';
        }
        
        // Dockerfile detection
        if (codeTrimmed.match(/^(FROM|RUN|CMD|ENTRYPOINT|ENV|WORKDIR|COPY|ADD)\s+/im)) {
            return 'dockerfile';
        }
        
        // Default to text
        return 'text';
    }

    highlightCode(code, language) {
        // Enhanced syntax highlighting for multiple languages
        if (language === 'javascript' || language === 'js') {
            return this.highlightJavaScript(code);
        } else if (language === 'typescript' || language === 'ts') {
            return this.highlightTypeScript(code);
        } else if (language === 'python' || language === 'py') {
            return this.highlightPython(code);
        } else if (language === 'powershell' || language === 'ps1') {
            return this.highlightPowerShell(code);
        } else if (language === 'bash' || language === 'sh' || language === 'shell') {
            return this.highlightBash(code);
        } else if (language === 'sql') {
            return this.highlightSQL(code);
        } else if (language === 'java') {
            return this.highlightJava(code);
        } else if (language === 'csharp' || language === 'cs') {
            return this.highlightCSharp(code);
        } else if (language === 'go') {
            return this.highlightGo(code);
        } else if (language === 'rust') {
            return this.highlightRust(code);
        } else if (language === 'html') {
            return this.highlightHTML(code);
        } else if (language === 'css') {
            return this.highlightCSS(code);
        } else if (language === 'json') {
            return this.highlightJSON(code);
        } else if (language === 'xml') {
            return this.highlightXML(code);
        } else if (language === 'yaml' || language === 'yml') {
            return this.highlightYAML(code);
        } else if (language === 'php') {
            return this.highlightPHP(code);
        } else if (language === 'ruby' || language === 'rb') {
            return this.highlightRuby(code);
        } else if (language === 'cpp' || language === 'c++') {
            return this.highlightCpp(code);
        } else if (language === 'c') {
            return this.highlightC(code);
        } else if (language === 'dockerfile') {
            return this.highlightDockerfile(code);
        }
        return this.escapeHtml(code);
    }

    highlightJavaScript(code) {
        let highlighted = this.escapeHtml(code);
        // Comments (must be first to avoid interfering with other patterns)
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Template literals
        highlighted = highlighted.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(function|const|let|var|class|extends|return|if|else|for|while|try|catch|finally|throw|new|this|super|import|export|default|async|await|true|false|null|undefined|typeof|instanceof|in|of|break|continue|switch|case|do|with|delete|void|yield|static|private|public|protected|abstract|interface|enum|type|namespace|module|declare|as|from|implements|readonly)\b/g, '<span class="keyword">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightTypeScript(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        highlighted = highlighted.replace(/(`)(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Type annotations
        highlighted = highlighted.replace(/\b(string|number|boolean|any|void|unknown|never|object|Array|Promise|Date|RegExp|Error|Map|Set|Readonly|Partial|Required|Pick|Omit|Record|keyof|typeof|infer)\b/g, '<span class="type">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(function|const|let|var|class|extends|return|if|else|for|while|try|catch|finally|throw|new|this|super|import|export|default|async|await|true|false|null|undefined|typeof|instanceof|in|of|break|continue|switch|case|do|with|delete|void|yield|static|private|public|protected|abstract|interface|enum|type|namespace|module|declare|as|from|implements|readonly|interface|type|namespace)\b/g, '<span class="keyword">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightPython(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        // Strings (triple quotes first, then regular)
        highlighted = highlighted.replace(/(["']{3})([\s\S]*?)\1/g, '<span class="string">$1$2$1</span>');
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(def|class|if|elif|else|for|while|try|except|finally|raise|return|import|from|as|True|False|None|and|or|not|in|is|lambda|with|async|await|yield|pass|break|continue|del|global|nonlocal|assert|print|len|range|str|int|float|bool|list|dict|tuple|set)\b/g, '<span class="keyword">$1</span>');
        // Built-in functions
        highlighted = highlighted.replace(/\b(print|len|range|str|int|float|bool|list|dict|tuple|set|open|enumerate|zip|map|filter|reduce|sorted|reversed|any|all|abs|round|min|max|sum)\b/g, '<span class="function">$1</span>');
        // Decorators
        highlighted = highlighted.replace(/@(\w+)/g, '<span class="decorator">@$1</span>');
        return highlighted;
    }

    highlightPowerShell(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Here-strings
        highlighted = highlighted.replace(/(@"[\s\S]*?"@|@'[\s\S]*?'@)/g, '<span class="string">$1</span>');
        // Variables
        highlighted = highlighted.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="variable">$1</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Cmdlets (Get-, Set-, New-, Remove-, etc.)
        highlighted = highlighted.replace(/\b(Get-\w+|Set-\w+|New-\w+|Remove-\w+|Add-\w+|Clear-\w+|Copy-\w+|Disable-\w+|Enable-\w+|Export-\w+|Import-\w+|Invoke-\w+|Move-\w+|Out-\w+|Read-\w+|Receive-\w+|Rename-\w+|Resolve-\w+|Restart-\w+|Resume-\w+|Save-\w+|Select-\w+|Send-\w+|Set-\w+|Show-\w+|Sort-\w+|Split-\w+|Start-\w+|Stop-\w+|Suspend-\w+|Switch-\w+|Test-\w+|Trace-\w+|Unblock-\w+|Undo-\w+|Unregister-\w+|Update-\w+|Use-\w+|Wait-\w+|Where-\w+|Write-\w+)\b/g, '<span class="function">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(function|param|if|else|elseif|foreach|for|while|try|catch|finally|throw|return|\$true|\$false|\$null|break|continue|switch|case|default|begin|process|end|where|select|sort|group|measure|export|import|using|namespace|class|enum|interface|module|workflow|filter|trap|data|configuration|inlinescript|parallel|sequence)\b/g, '<span class="keyword">$1</span>');
        return highlighted;
    }

    highlightBash(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Variables
        highlighted = highlighted.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\})/g, '<span class="variable">$1</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(if|then|else|elif|fi|for|do|done|while|case|esac|function|return|break|continue|exit|echo|export|read|declare|local|readonly|typeset|unset|alias|unalias|cd|pwd|ls|cat|grep|sed|awk|find|grep|sort|uniq|head|tail|wc|cut|paste|join|tr|diff|patch|tar|gzip|gunzip|zip|unzip|chmod|chown|chgrp|mkdir|rmdir|rm|cp|mv|ln|touch|test|\[|\[\[|exec|eval|source|\.|shift|set|unset|trap|wait|jobs|fg|bg|kill|ps|top|nohup|time|history|alias|unalias|bind|builtin|command|compgen|complete|compopt|continue|declare|dirs|disown|enable|eval|exec|exit|export|fc|fg|getopts|hash|help|history|jobs|kill|let|local|logout|mapfile|popd|printf|pushd|read|readarray|readonly|return|set|shift|shopt|source|suspend|test|times|trap|type|typeset|ulimit|umask|unalias|unset|wait)\b/g, '<span class="keyword">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightSQL(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(--.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|DATABASE|SCHEMA|TRIGGER|PROCEDURE|FUNCTION|CURSOR|DECLARE|BEGIN|END|IF|ELSE|ELSEIF|CASE|WHEN|THEN|WHILE|FOR|LOOP|REPEAT|UNTIL|EXIT|CONTINUE|RETURN|CALL|EXEC|EXECUTE|GRANT|REVOKE|COMMIT|ROLLBACK|SAVEPOINT|TRANSACTION|SET|USE|SHOW|DESCRIBE|DESC|EXPLAIN|UNION|INTERSECT|EXCEPT|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|AS|AND|OR|NOT|IN|EXISTS|LIKE|BETWEEN|IS|NULL|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|DISTINCT|ALL|ANY|SOME|COUNT|SUM|AVG|MIN|MAX|CAST|CONVERT|CONCAT|SUBSTRING|UPPER|LOWER|TRIM|LTRIM|RTRIM|LENGTH|CHAR_LENGTH|REPLACE|REVERSE|POSITION|INSTR|LOCATE|LEFT|RIGHT|MID|LPAD|RPAD|SPACE|REPEAT|FORMAT|ROUND|CEIL|FLOOR|ABS|MOD|POWER|SQRT|EXP|LOG|LN|SIN|COS|TAN|ASIN|ACOS|ATAN|ATAN2|DEGREES|RADIANS|PI|RAND|NOW|CURDATE|CURTIME|DATE|TIME|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|DAYOFWEEK|DAYOFYEAR|WEEK|QUARTER|DATE_ADD|DATE_SUB|DATEDIFF|TIMEDIFF|DATE_FORMAT|STR_TO_DATE|IFNULL|COALESCE|NULLIF|CASE|WHEN|THEN|ELSE|END)\b/gi, '<span class="keyword">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightJava(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*[fFdDlL]?)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while|true|false|null)\b/g, '<span class="keyword">$1</span>');
        // Types
        highlighted = highlighted.replace(/\b(String|Integer|Double|Float|Long|Short|Byte|Character|Boolean|Object|Array|List|Map|Set|Collection|Iterator|Comparable|Comparator|Runnable|Thread|Exception|Error|Throwable|Class|Method|Field|Annotation|Override|Deprecated|SuppressWarnings|SafeVarargs|FunctionalInterface|Retention|Target|Documented|Inherited|Repeatable|Native|Transient|Volatile|Synchronized)\b/g, '<span class="type">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightCSharp(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(@"[\s\S]*?"|["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*[fFdDmM]?)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|virtual|void|volatile|while|yield|var|async|await|dynamic|get|set|value|add|remove|from|select|where|orderby|group|join|let|into|on|equals|by|ascending|descending)\b/g, '<span class="keyword">$1</span>');
        // Types
        highlighted = highlighted.replace(/\b(string|int|long|double|float|decimal|bool|char|byte|sbyte|short|ushort|uint|ulong|object|dynamic|var|void|Task|Action|Func|IEnumerable|List|Dictionary|Array|StringBuilder|DateTime|TimeSpan|Guid|Exception|Console|Math|Convert|String|Object|Type|Attribute)\b/g, '<span class="type">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightGo(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(`[\s\S]*?`|["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|true|false|nil|iota|int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float32|float64|complex64|complex128|byte|rune|string|bool|error)\b/g, '<span class="keyword">$1</span>');
        // Built-in functions
        highlighted = highlighted.replace(/\b(append|cap|close|complex|copy|delete|imag|len|make|new|panic|print|println|real|recover|close|copy|delete|len|make|new|panic|recover)\b/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightRust(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(r#*"[\s\S]*?"#*|["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*[uif]?[8|16|32|64|128|size]?)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|Self|self|static|struct|super|trait|type|union|unsafe|use|where|while|async|await|dyn|abstract|become|box|do|final|macro|override|priv|try|typeof|unsized|virtual|yield|macro_rules|union|static|const|unsafe|extern|crate|mod|use|pub|super|self|Self|as|break|continue|loop|if|else|match|for|while|let|fn|return|move|mut|ref|impl|trait|where|type|struct|enum|union|const|static|extern|crate|mod|use|pub|super|self|Self|as|break|continue|loop|if|else|match|for|while|let|fn|return|move|mut|ref|impl|trait|where|type|struct|enum|union|const|static|extern|crate|mod|use|pub|super|self|Self|as|break|continue|loop|if|else|match|for|while|let|fn|return|move|mut|ref|impl|trait|where|type|struct|enum|union|const|static|extern|crate|mod|use|pub|super|self|Self)\b/g, '<span class="keyword">$1</span>');
        // Macros
        highlighted = highlighted.replace(/([a-zA-Z_][a-zA-Z0-9_]*!)/g, '<span class="function">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightHTML(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(<!--[\s\S]*?-->)/g, '<span class="comment">$1</span>');
        // Tags
        highlighted = highlighted.replace(/(<\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(>)/g, (match, open, tag, attrs, close) => {
            return open + '<span class="tag">' + tag + '</span>' + attrs.replace(/(\w+)(=)(["'][^"']*["'])/g, '<span class="attribute">$1</span>$2<span class="string">$3</span>') + close;
        });
        // Doctype
        highlighted = highlighted.replace(/(<!DOCTYPE[^>]*>)/gi, '<span class="keyword">$1</span>');
        return highlighted;
    }

    highlightCSS(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Selectors
        highlighted = highlighted.replace(/([.#]?[a-zA-Z_-][a-zA-Z0-9_-]*)\s*(?=\{)/g, '<span class="selector">$1</span>');
        // Properties
        highlighted = highlighted.replace(/([a-zA-Z-]+)\s*(?=:)/g, '<span class="property">$1</span>');
        // Values (strings and numbers)
        highlighted = highlighted.replace(/(:\s*)(["'])(?:(?=(\\?))\3.)*?\2/g, '$1<span class="string">$2$4$2</span>');
        highlighted = highlighted.replace(/(:\s*)([^;]+)(;)/g, (match, colon, value, semicolon) => {
            const numMatch = value.match(/\b(\d+\.?\d*(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax)?)\b/g);
            if (numMatch) {
                numMatch.forEach(num => {
                    value = value.replace(num, '<span class="number">' + num + '</span>');
                });
            }
            return colon + value + semicolon;
        });
        // Keywords
        highlighted = highlighted.replace(/\b(!important|@media|@keyframes|@import|@charset|@font-face|@page|@supports|@document|@viewport|@namespace|@counter-style|@font-feature-values|@property|@layer)\b/g, '<span class="keyword">$1</span>');
        return highlighted;
    }

    highlightJSON(code) {
        let highlighted = this.escapeHtml(code);
        // Keys
        highlighted = highlighted.replace(/(["'])([^"']+)\1\s*(?=:)/g, '<span class="property">$1$2$1</span>');
        // Strings
        highlighted = highlighted.replace(/(:\s*)(["'])(?:(?=(\\?))\3.)*?\2/g, '$1<span class="string">$2$4$2</span>');
        // Numbers
        highlighted = highlighted.replace(/(:\s*)(-?\d+\.?\d*)/g, '$1<span class="number">$2</span>');
        // Booleans and null
        highlighted = highlighted.replace(/(:\s*)(true|false|null)\b/g, '$1<span class="keyword">$2</span>');
        return highlighted;
    }

    highlightXML(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(<!--[\s\S]*?-->)/g, '<span class="comment">$1</span>');
        // Processing instructions
        highlighted = highlighted.replace(/(<\?[\s\S]*?\?>)/g, '<span class="keyword">$1</span>');
        // Tags
        highlighted = highlighted.replace(/(<\/?)([a-zA-Z][a-zA-Z0-9:_.-]*)([^>]*?)(>)/g, (match, open, tag, attrs, close) => {
            return open + '<span class="tag">' + tag + '</span>' + attrs.replace(/(\w+)(=)(["'][^"']*["'])/g, '<span class="attribute">$1</span>$2<span class="string">$3</span>') + close;
        });
        return highlighted;
    }

    highlightYAML(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        // Keys
        highlighted = highlighted.replace(/(^[\s-]*)([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=:)/gm, '$1<span class="property">$2</span>');
        // Strings
        highlighted = highlighted.replace(/(:\s*)(["'])(?:(?=(\\?))\3.)*?\2/g, '$1<span class="string">$2$4$2</span>');
        // Numbers
        highlighted = highlighted.replace(/(:\s*)(-?\d+\.?\d*)/g, '$1<span class="number">$2</span>');
        // Booleans and null
        highlighted = highlighted.replace(/(:\s*)(true|false|null|~|yes|no|on|off)\b/gi, '$1<span class="keyword">$2</span>');
        // Special YAML syntax
        highlighted = highlighted.replace(/(^---|^\.\.\.|^&|^\*|^!|^<|^>|^\||^>)/gm, '<span class="keyword">$1</span>');
        return highlighted;
    }

    highlightPHP(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Variables
        highlighted = highlighted.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*)/g, '<span class="variable">$1</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|else|elseif|enddeclare|endfor|endforeach|endif|endswitch|endwhile|extends|final|finally|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|new|or|private|protected|public|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield|from|__CLASS__|__DIR__|__FILE__|__FUNCTION__|__LINE__|__METHOD__|__NAMESPACE__|__TRAIT__|die|echo|empty|eval|exit|print|var_dump|var_export|true|false|null)\b/g, '<span class="keyword">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightRuby(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        highlighted = highlighted.replace(/(%[qQwWx]?[\[({<][\s\S]*?[\]})>])/g, '<span class="string">$1</span>');
        // Symbols
        highlighted = highlighted.replace(/(:[\w]+)/g, '<span class="symbol">$1</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(alias|and|BEGIN|begin|break|case|class|def|defined|do|else|elsif|END|end|ensure|false|for|if|in|module|next|nil|not|or|redo|rescue|retry|return|self|super|then|true|undef|unless|until|when|while|yield|__FILE__|__LINE__|__ENCODING__)\b/g, '<span class="keyword">$1</span>');
        // Built-in methods
        highlighted = highlighted.replace(/\b(puts|p|print|gets|chomp|to_s|to_i|to_f|length|size|each|map|select|reject|find|detect|collect|inject|reduce|sort|reverse|join|split|gsub|sub|match|scan|grep|include|require|load|attr_accessor|attr_reader|attr_writer)\b/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightCpp(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*[fFdDlL]?)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(alignas|alignof|and|and_eq|asm|auto|bitand|bitor|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|false|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|not|not_eq|nullptr|operator|or|or_eq|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|true|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while|xor|xor_eq|std|cout|cin|endl|string|vector|map|set|list|deque|queue|stack|priority_queue|array|tuple|pair|make_pair|make_tuple|shared_ptr|unique_ptr|weak_ptr|auto_ptr|nullptr|nullptr_t)\b/g, '<span class="keyword">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightC(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        // Numbers
        highlighted = highlighted.replace(/\b(\d+\.?\d*[fFdDlL]?)\b/g, '<span class="number">$1</span>');
        // Keywords
        highlighted = highlighted.replace(/\b(auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|inline|restrict|_Bool|_Complex|_Imaginary)\b/g, '<span class="keyword">$1</span>');
        // Preprocessor
        highlighted = highlighted.replace(/(#\s*(include|define|undef|if|ifdef|ifndef|else|elif|endif|error|pragma|line|warning))\b/g, '<span class="preprocessor">$1</span>');
        // Functions
        highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>');
        return highlighted;
    }

    highlightDockerfile(code) {
        let highlighted = this.escapeHtml(code);
        // Comments
        highlighted = highlighted.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
        // Instructions
        highlighted = highlighted.replace(/(^|\n)(FROM|RUN|CMD|ENTRYPOINT|ENV|WORKDIR|COPY|ADD|EXPOSE|VOLUME|USER|LABEL|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL|MAINTAINER)\b/gi, '$1<span class="keyword">$2</span>');
        // Strings
        highlighted = highlighted.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
        return highlighted;
    }

    copyCodeBlock(button) {
        const codeBlock = button.closest('.code-block-wrapper').querySelector('.code-block code');
        const text = codeBlock.textContent || codeBlock.innerText;
        navigator.clipboard.writeText(text).then(() => {
            const icon = button.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fas fa-check';
            setTimeout(() => {
                icon.className = originalClass;
            }, 2000);
        });
    }

    insertImage() {
        const textarea = document.getElementById('doc-content');
        if (!textarea) return;
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Convert to base64
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const before = text.substring(0, start);
                const after = text.substring(end);
                const imageMarkdown = `![${file.name}](${base64})\n`;
                textarea.value = before + imageMarkdown + after;
                textarea.selectionStart = textarea.selectionEnd = start + imageMarkdown.length;
                textarea.focus();
                this.updatePreview();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    async editImageSize(imageWrapper) {
        if (!imageWrapper) return;
        
        const img = imageWrapper.querySelector('.markdown-image');
        const originalContent = imageWrapper.getAttribute('data-original-content') || '';
        const imageSrc = imageWrapper.getAttribute('data-image-src') || img.src;
        const imageAlt = imageWrapper.getAttribute('data-image-alt') || '';
        const currentAlignment = imageWrapper.getAttribute('data-alignment') || 'center';
        
        // Extract current size
        let currentWidth = '';
        let currentHeight = '';
        let displayAlt = imageAlt;
        
        if (imageAlt.includes('|')) {
            const parts = imageAlt.split('|');
            displayAlt = parts[0];
            const sizePart = parts[1];
            if (sizePart) {
                if (sizePart.includes('x')) {
                    const [w, h] = sizePart.split('x');
                    currentWidth = w.trim();
                    currentHeight = h.trim();
                } else {
                    currentWidth = sizePart.trim();
                }
            }
        }
        
        // Get computed size
        const computedStyle = window.getComputedStyle(img);
        const currentComputedWidth = computedStyle.width;
        const currentComputedHeight = computedStyle.height;
        
        const modalContent = `
            <form id="image-size-form" onsubmit="event.preventDefault(); docInstance.saveImageSize();">
                <div class="form-group">
                    <label class="form-label">Image Alt Text</label>
                    <input type="text" id="image-alt-text" class="form-input" value="${this.escapeHtml(displayAlt)}" placeholder="Image description">
                </div>
                <div class="form-group">
                    <label class="form-label">Size</label>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <label class="form-label" style="font-size: 0.875rem;">Width</label>
                            <input type="text" id="image-width" class="form-input" value="${currentWidth || ''}" placeholder="e.g., 500, 50%, 300px">
                        </div>
                        <div>
                            <label class="form-label" style="font-size: 0.875rem;">Height</label>
                            <input type="text" id="image-height" class="form-input" value="${currentHeight || ''}" placeholder="e.g., 300, 50%, 200px">
                        </div>
                    </div>
                    <small class="form-hint">Enter width and/or height. Use px, %, or just numbers (defaults to px). Leave empty for auto.</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Alignment</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="button" class="btn ${currentAlignment === 'left' ? 'btn-primary' : 'btn-secondary'}" onclick="docInstance.setImageAlignment('left')" style="font-size: 0.875rem;">
                            <i class="fas fa-align-left"></i> Left
                        </button>
                        <button type="button" class="btn ${currentAlignment === 'center' ? 'btn-primary' : 'btn-secondary'}" onclick="docInstance.setImageAlignment('center')" style="font-size: 0.875rem;">
                            <i class="fas fa-align-center"></i> Center
                        </button>
                        <button type="button" class="btn ${currentAlignment === 'right' ? 'btn-primary' : 'btn-secondary'}" onclick="docInstance.setImageAlignment('right')" style="font-size: 0.875rem;">
                            <i class="fas fa-align-right"></i> Right
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Quick Sizes</label>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-secondary" onclick="docInstance.setImageSize('100%', '')" style="font-size: 0.875rem;">Full Width</button>
                        <button type="button" class="btn btn-secondary" onclick="docInstance.setImageSize('50%', '')" style="font-size: 0.875rem;">Half Width</button>
                        <button type="button" class="btn btn-secondary" onclick="docInstance.setImageSize('800', '')" style="font-size: 0.875rem;">800px</button>
                        <button type="button" class="btn btn-secondary" onclick="docInstance.setImageSize('600', '')" style="font-size: 0.875rem;">600px</button>
                        <button type="button" class="btn btn-secondary" onclick="docInstance.setImageSize('400', '')" style="font-size: 0.875rem;">400px</button>
                        <button type="button" class="btn btn-secondary" onclick="docInstance.setImageSize('', '')" style="font-size: 0.875rem;">Reset</button>
                    </div>
                </div>
                <input type="hidden" id="image-src-value" value="${this.escapeHtml(imageSrc)}">
                <input type="hidden" id="image-wrapper-element" value="">
                <input type="hidden" id="image-alignment-value" value="${currentAlignment}">
            </form>
        `;

        const modalActions = [
            {
                label: 'Cancel',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            },
            {
                label: 'Save',
                class: 'btn-primary',
                icon: 'fas fa-save',
                onclick: 'docInstance.saveImageSize()'
            }
        ];

        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        this.modal.open('Edit Image Size', modalContent, modalActions);
        
        // Store reference to the image wrapper
        setTimeout(() => {
            const hiddenInput = document.getElementById('image-wrapper-element');
            if (hiddenInput) {
                hiddenInput._element = imageWrapper;
            }
        }, 100);
    }

    setImageSize(width, height) {
        const widthInput = document.getElementById('image-width');
        const heightInput = document.getElementById('image-height');
        if (widthInput) widthInput.value = width;
        if (heightInput) heightInput.value = height;
    }

    setImageAlignment(alignment) {
        const hiddenInput = document.getElementById('image-alignment-value');
        if (hiddenInput) {
            hiddenInput.value = alignment;
        }
        // Update button styles - use more specific selector
        const allButtons = document.querySelectorAll('button[onclick*="setImageAlignment"]');
        allButtons.forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });
        // Find the active button by checking onclick attribute
        allButtons.forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            if (onclick.includes(`'${alignment}'`) || onclick.includes(`"${alignment}"`)) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            }
        });
    }

    async saveImageSize() {
        const textarea = document.getElementById('doc-content');
        const hiddenInput = document.getElementById('image-wrapper-element');
        const imageWrapper = hiddenInput?._element;
        if (!imageWrapper) return;
        
        const originalContent = imageWrapper.getAttribute('data-original-content') || '';
        const imageSrc = document.getElementById('image-src-value')?.value || '';
        const altText = document.getElementById('image-alt-text')?.value.trim() || '';
        const width = document.getElementById('image-width')?.value.trim() || '';
        const height = document.getElementById('image-height')?.value.trim() || '';
        
        // Build new markdown
        let newAlt = altText;
        if (width || height) {
            if (width && height) {
                newAlt = `${altText}|${width}x${height}`;
            } else if (width) {
                newAlt = `${altText}|${width}`;
            } else if (height) {
                newAlt = `${altText}|x${height}`;
            }
        }
        
        const alignment = document.getElementById('image-alignment-value')?.value || 'center';
        const alignmentSuffix = alignment !== 'center' ? `{align:${alignment}}` : '';
        const newMarkdown = `![${newAlt}](${imageSrc})${alignmentSuffix}`;
        
        if (textarea) {
            // Edit mode: update textarea
            const content = textarea.value;
            const newContent = content.replace(originalContent, newMarkdown);
            textarea.value = newContent;
            this.updatePreview();
        } else {
            // View mode: update document in database
            const doc = this.getCurrentDocument();
            if (!doc || !doc.id) {
                this.showError('Cannot update image size in view mode. Please edit the document first.');
                if (this.modal) this.modal.close();
                return;
            }
            
            // Replace in document content
            const content = doc.content || '';
            const newContent = content.replace(originalContent, newMarkdown);
            
            // Update document
            const updatedDoc = {
                id: doc.id,
                title: doc.title,
                content: newContent,
                category: doc.category,
                subcategory: doc.subcategory,
                createdAt: doc.createdAt,
                updatedAt: new Date().toISOString(),
                attachmentCount: doc.attachmentCount || 0,
                hasScripts: doc.hasScripts || false
            };
            
            try {
                await this.saveDocumentToDB(updatedDoc);
                await this.loadDocuments();
                await this.updateDisplay();
            } catch (error) {
                this.showError('Error updating image size: ' + error.message);
            }
        }
        
        // Close modal
        if (this.modal) this.modal.close();
    }

    insertAlignment(alignment) {
        const textarea = document.getElementById('doc-content');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const beforeSelection = text.substring(0, start);
        const afterSelection = text.substring(end);
        
        if (!selectedText.trim()) {
            this.showError('Please select text or an image to align');
            return;
        }
        
        // Search for image near cursor (even if not selected)
        const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)(\{align:(left|center|right)\})?/g;
        let foundImage = null;
        let foundStart = -1;
        let foundEnd = -1;
        
        // Search in wider context around cursor
        const searchStart = Math.max(0, start - 200);
        const searchEnd = Math.min(text.length, end + 200);
        const searchText = text.substring(searchStart, searchEnd);
        
        let match;
        while ((match = imagePattern.exec(searchText)) !== null) {
            const matchStart = searchStart + match.index;
            const matchEnd = matchStart + match[0].length;
            // Check if cursor is near this image
            if ((start >= matchStart && start <= matchEnd) || 
                (end >= matchStart && end <= matchEnd) ||
                (Math.abs(start - matchStart) < 100)) {
                foundImage = match;
                foundStart = matchStart;
                foundEnd = matchEnd;
                break;
            }
        }
        
        if (foundImage) {
            // It's an image, add/update alignment
            const alt = foundImage[1];
            const src = foundImage[2];
            const newImage = `![${alt}](${src}){align:${alignment}}`;
            
            const beforeImage = text.substring(0, foundStart);
            const afterImage = text.substring(foundEnd);
            const newText = beforeImage + newImage + afterImage;
            textarea.value = newText;
            textarea.focus();
            const newPos = foundStart + newImage.length;
            textarea.setSelectionRange(newPos, newPos);
        } else if (selectedText.trim()) {
            // For text, wrap in markdown-compatible alignment
            // Use a simple approach: wrap in div with alignment (will be rendered as HTML but stored as markdown-like)
            // Actually, let's use a custom markdown extension: <div align="left|center|right">text</div>
            const alignedText = `<div align="${alignment}">${selectedText}</div>`;
            const newText = beforeSelection + alignedText + afterSelection;
            textarea.value = newText;
            textarea.focus();
            const newPos = start + alignedText.length;
            textarea.setSelectionRange(newPos, newPos);
        } else {
            // No selection and no image found
            this.showError('Please select text or click near an image to align it.');
            return;
        }
        
        this.updatePreview();
    }

    async insertTable() {
        const textarea = document.getElementById('doc-content');
        if (!textarea) return;
        
        const rows = await this.showPrompt('Number of rows (excluding header):', '3', 'Table Rows');
        if (!rows) return;
        const cols = await this.showPrompt('Number of columns:', '3', 'Table Columns');
        if (!cols) return;
        
        const numRows = parseInt(rows) || 3;
        const numCols = parseInt(cols) || 3;
        
        let tableMarkdown = '\n';
        
        // Header row
        tableMarkdown += '|';
        for (let i = 0; i < numCols; i++) {
            tableMarkdown += ` Header ${i + 1} |`;
        }
        tableMarkdown += '\n';
        
        // Separator
        tableMarkdown += '|';
        for (let i = 0; i < numCols; i++) {
            tableMarkdown += ' --- |';
        }
        tableMarkdown += '\n';
        
        // Data rows
        for (let r = 0; r < numRows; r++) {
            tableMarkdown += '|';
            for (let c = 0; c < numCols; c++) {
                tableMarkdown += ` Cell ${r + 1}-${c + 1} |`;
            }
            tableMarkdown += '\n';
        }
        tableMarkdown += '\n';
        
        const start = textarea.selectionStart;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(start);
        textarea.value = before + tableMarkdown + after;
        textarea.selectionStart = textarea.selectionEnd = start + tableMarkdown.length;
        textarea.focus();
        this.updatePreview();
    }

    insertChecklist() {
        const textarea = document.getElementById('doc-content');
        if (!textarea) return;
        
        const checklistMarkdown = '\n- [ ] Task 1\n- [ ] Task 2\n- [x] Completed task\n';
        
        const start = textarea.selectionStart;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(start);
        textarea.value = before + checklistMarkdown + after;
        textarea.selectionStart = textarea.selectionEnd = start + checklistMarkdown.length;
        textarea.focus();
        this.updatePreview();
    }

    insertToggle() {
        const textarea = document.getElementById('doc-content');
        if (!textarea) return;
        
        const toggleMarkdown = '\n> [toggle] Toggle Title\n\nContent inside the toggle goes here.\n\n';
        
        const start = textarea.selectionStart;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(start);
        textarea.value = before + toggleMarkdown + after;
        textarea.selectionStart = textarea.selectionEnd = start + toggleMarkdown.length;
        textarea.focus();
        this.updatePreview();
    }

    insertCallout(type = 'info') {
        const textarea = document.getElementById('doc-content');
        if (!textarea) return;
        
        const calloutLabels = {
            info: 'Information',
            warning: 'Warning',
            error: 'Error',
            success: 'Success',
            note: 'Note',
            tip: 'Tip',
            important: 'Important'
        };
        
        const label = calloutLabels[type] || 'Information';
        const calloutMarkdown = `\n> [!${type}] ${label}\n\nYour callout content here.\n\n`;
        
        const start = textarea.selectionStart;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(start);
        textarea.value = before + calloutMarkdown + after;
        textarea.selectionStart = textarea.selectionEnd = start + calloutMarkdown.length;
        textarea.focus();
        this.updatePreview();
    }

    // UI Methods
    setSearchTerm(term) {
        this.searchTerm = term;
        this.updateDisplay();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.updateDisplay();
    }


    async openCategory(categoryId) {
        this.currentCategory = categoryId;
        this.currentSubcategory = null;
        this.currentDocument = null;
        this.searchTerm = '';
        this.documents = []; // Reset documents before loading
        // Reload categories to get fresh data with subcategories
        await this.loadCategories();
        this.extractSubcategoriesFromCategories();
        await this.loadSubcategories();
        await this.updateDisplay();
    }

    async openSubcategory(subcategoryId) {
        this.currentSubcategory = subcategoryId;
        this.currentDocument = null;
        this.searchTerm = '';
        this.documents = []; // Reset documents before loading
        await this.loadDocuments();
        await this.updateDisplay();
    }

    async openDocument(docId) {
        this.currentDocument = docId;
        // Preserve current category and subcategory when opening document
        // This ensures the back button knows where to return to
        const doc = this.documents.find(d => d && d.id === parseInt(docId));
        if (doc) {
            // If document has subcategory, ensure we're tracking it
            if (doc.subcategory && !this.currentSubcategory) {
                this.currentSubcategory = doc.subcategory;
            }
            // If document has category, ensure we're tracking it
            if (doc.category && !this.currentCategory) {
                this.currentCategory = doc.category;
            }
        }
        await this.updateDisplay();
    }

    async backToMain() {
        this.currentCategory = null;
        this.currentSubcategory = null;
        this.currentDocument = null;
        this.searchTerm = '';
        await this.loadCategories(); // Reload categories (includes subcategories and counts)
        this.extractSubcategoriesFromCategories();
        this.buildAllDocumentsFromCategories();
        await this.updateDisplay();
    }

    async backFromDocument() {
        // If document has a subcategory, go back to subcategory view
        const doc = this.getCurrentDocument();
        if (doc && doc.subcategory) {
            this.currentSubcategory = doc.subcategory;
            this.currentCategory = doc.category;
            this.currentDocument = null;
            this.searchTerm = '';
            await this.loadCategories();
            this.extractSubcategoriesFromCategories();
            await this.loadSubcategories();
            await this.loadDocuments();
            await this.updateDisplay();
        } else {
            // Otherwise, go back to category view
            await this.backToCategory();
        }
    }

    async backToCategory() {
        this.currentSubcategory = null;
        this.currentDocument = null;
        this.searchTerm = '';
        this.documents = []; // Reset documents
        // Reload categories to get fresh data with subcategories
        await this.loadCategories();
        this.extractSubcategoriesFromCategories();
        await this.loadSubcategories();
        await this.updateDisplay();
    }

    async showNewCategoryModal() {
        const modalContent = `
            <form id="category-form" onsubmit="event.preventDefault(); docInstance.saveNewCategory();">
                <div class="form-group">
                    <label class="form-label">Category Name *</label>
                    <input type="text" id="modal-category-name" class="form-input" required placeholder="e.g., Hyper-V">
                </div>
                <div class="form-group">
                    <label class="form-label">Icon (FontAwesome class)</label>
                    <input type="text" id="modal-category-icon" class="form-input" value="fa-folder" placeholder="fa-server">
                    <small class="form-hint">e.g., fa-server, fa-cube, fa-network-wired</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-input-group">
                        <input type="color" id="modal-category-color" class="form-input-color" value="#3b82f6">
                        <input type="text" id="modal-category-color-text" class="form-input" value="#3b82f6" placeholder="#3b82f6">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="modal-category-description" class="form-input" rows="3" placeholder="Brief description of this category"></textarea>
                </div>
            </form>
        `;

        const modalActions = [
            {
                label: 'Cancel',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            },
            {
                label: 'Create',
                class: 'btn-primary',
                icon: 'fas fa-check',
                onclick: 'docInstance.saveNewCategory()'
            }
        ];

        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        this.modal.open('Create New Category', modalContent, modalActions);
        
        // Sync color inputs after modal is rendered
        setTimeout(() => {
            const colorInput = document.getElementById('modal-category-color');
            const colorText = document.getElementById('modal-category-color-text');
            if (colorInput && colorText) {
                colorInput.addEventListener('input', (e) => {
                    colorText.value = e.target.value;
                });
                colorText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        colorInput.value = e.target.value;
                    }
                });
            }
        }, 100);
    }

    async saveNewCategory() {
        const name = document.getElementById('modal-category-name')?.value.trim();
        if (!name) {
            this.showError('Category name is required');
            return;
        }

        const icon = document.getElementById('modal-category-icon')?.value.trim() || 'fa-folder';
        const color = document.getElementById('modal-category-color-text')?.value.trim() || '#3b82f6';
        const description = document.getElementById('modal-category-description')?.value.trim() || '';

        const newCategory = {
            id: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            name: name,
            icon: icon.startsWith('fa-') ? icon : `fa-${icon}`,
            color: color,
            description: description || `${name} documentation`
        };

        try {
            await this.saveCategory(newCategory);
            await this.loadCategories();
            if (this.modal) this.modal.close();
            this.updateDisplay();
        } catch (error) {
            this.showError('Error creating category: ' + error.message);
        }
    }

    async showEditCategoryModal() {
        const category = this.categories.find(c => c.id === this.currentCategory);
        if (!category) return;

        const modalContent = `
            <form id="category-edit-form" onsubmit="event.preventDefault(); docInstance.saveEditCategory();">
                <div class="form-group">
                    <label class="form-label">Category Name *</label>
                    <input type="text" id="modal-edit-category-name" class="form-input" value="${this.escapeHtml(category.name)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Icon (FontAwesome class)</label>
                    <input type="text" id="modal-edit-category-icon" class="form-input" value="${this.escapeHtml(category.icon)}" placeholder="fa-server">
                </div>
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <div class="color-input-group">
                        <input type="color" id="modal-edit-category-color" class="form-input-color" value="${category.color}">
                        <input type="text" id="modal-edit-category-color-text" class="form-input" value="${category.color}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="modal-edit-category-description" class="form-input" rows="3">${this.escapeHtml(category.description || '')}</textarea>
                </div>
            </form>
        `;

        const modalActions = [
            {
                label: 'Cancel',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            },
            {
                label: 'Save',
                class: 'btn-primary',
                icon: 'fas fa-save',
                onclick: 'docInstance.saveEditCategory()'
            }
        ];

        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        this.modal.open('Edit Category', modalContent, modalActions);
        
        // Sync color inputs after modal is rendered
        setTimeout(() => {
            const colorInput = document.getElementById('modal-edit-category-color');
            const colorText = document.getElementById('modal-edit-category-color-text');
            if (colorInput && colorText) {
                colorInput.addEventListener('input', (e) => {
                    colorText.value = e.target.value;
                });
                colorText.addEventListener('input', (e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        colorInput.value = e.target.value;
                    }
                });
            }
        }, 100);
    }

    async showEditSubcategoryModal() {
        if (!this.currentSubcategory) return;
        
        const subcategory = this.subcategories.find(s => s && s.id === this.currentSubcategory);
        if (!subcategory) return;

        const modalContent = `
            <form id="subcategory-edit-form" onsubmit="event.preventDefault(); docInstance.saveEditSubcategory();">
                <div class="form-group">
                    <label class="form-label">Subcategory Name *</label>
                    <input type="text" id="modal-edit-subcategory-name" class="form-input" value="${this.escapeHtml(subcategory.name)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea id="modal-edit-subcategory-description" class="form-input" rows="3">${this.escapeHtml(subcategory.description || '')}</textarea>
                </div>
            </form>
        `;

        const modalActions = [
            {
                label: 'Cancel',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            },
            {
                label: 'Save',
                class: 'btn-primary',
                icon: 'fas fa-save',
                onclick: 'docInstance.saveEditSubcategory()'
            }
        ];

        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        this.modal.open('Edit Subcategory', modalContent, modalActions);
    }

    async saveEditSubcategory() {
        const name = document.getElementById('modal-edit-subcategory-name')?.value.trim();
        if (!name) {
            this.showError('Subcategory name is required');
            return;
        }

        const description = document.getElementById('modal-edit-subcategory-description')?.value.trim() || '';

        const subcategory = {
            id: this.currentSubcategory,
            category: this.currentCategory,
            name: name,
            description: description
        };

        try {
            const response = await fetch('/api/docs/subcategories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subcategory)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to update subcategory');
            }

            // Reload categories to get fresh data with subcategories
            await this.loadCategories();
            this.extractSubcategoriesFromCategories();
            this.buildAllDocumentsFromCategories();
            await this.loadSubcategories();
            if (this.modal) this.modal.close();
            await this.updateDisplay();
        } catch (error) {
            this.showError('Error updating subcategory: ' + error.message);
        }
    }

    async saveEditCategory() {
        const category = this.categories.find(c => c.id === this.currentCategory);
        if (!category) return;

        const name = document.getElementById('modal-edit-category-name')?.value.trim();
        if (!name) {
            this.showError('Category name is required');
            return;
        }

        category.name = name;
        category.icon = document.getElementById('modal-edit-category-icon')?.value.trim() || category.icon;
        category.color = document.getElementById('modal-edit-category-color-text')?.value.trim() || category.color;
        category.description = document.getElementById('modal-edit-category-description')?.value.trim() || '';

        try {
            await this.saveCategory(category);
            await this.loadCategories();
            if (this.modal) this.modal.close();
            this.updateDisplay();
        } catch (error) {
            this.showError('Error updating category: ' + error.message);
        }
    }

    showNewDocumentModal() {
        this.currentDocument = 'new';
        this.editMode = true;
        this.updateDisplay();
    }

    editDocument(docId) {
        this.currentDocument = docId;
        this.editMode = true;
        this.updateDisplay();
    }

    cancelEdit() {
        this.editMode = false;
        if (this.currentDocument === 'new') {
            this.currentDocument = null;
        }
        this.updateDisplay();
    }

    async saveDocument() {
        const title = document.getElementById('doc-title')?.value.trim();
        const textarea = document.getElementById('doc-content');
        let content = textarea?.value.trim() || '';
        
        // If content has collapsed base64 images, restore from original
        if (content.includes('<base64-image:')) {
            const original = textarea?.getAttribute('data-original-content');
            if (original) {
                // Restore base64 images from original content
                const collapsedLines = content.split('\n');
                const originalLines = original.split('\n');
                let restored = '';
                let originalIndex = 0;
                
                for (let i = 0; i < collapsedLines.length; i++) {
                    const line = collapsedLines[i];
                    if (line.includes('<base64-image:')) {
                        // Find the matching image in original content
                        const match = line.match(/!\[([^\]]*)\]\(<base64-image:[^>]+>\)/);
                        if (match) {
                            // Search for matching image in original
                            for (let j = originalIndex; j < originalLines.length; j++) {
                                if (originalLines[j].includes(`![${match[1]}]`) && originalLines[j].includes('data:image/')) {
                                    restored += originalLines[j] + '\n';
                                    originalIndex = j + 1;
                                    break;
                                }
                            }
                        } else {
                            restored += line + '\n';
                        }
                    } else {
                        restored += line + '\n';
                        // Try to match with original line
                        if (originalIndex < originalLines.length && originalLines[originalIndex] === line) {
                            originalIndex++;
                        }
                    }
                }
                content = restored.trim();
            }
        }
        if (!title || !content) {
            this.showError('Title and content are required');
            return;
        }
        
        const isNew = this.currentDocument === 'new';
        const existingDoc = isNew ? null : this.getCurrentDocument();
        
        if (!this.currentCategory) {
            this.showError('Please select a category first');
            return;
        }

        if (!this.currentSubcategory) {
            this.showError('Please select a subcategory first');
            return;
        }

        const doc = {
            id: existingDoc?.id,
            title: title,
            content: content,
            category: this.currentCategory,
            subcategory: this.currentSubcategory,
            createdAt: existingDoc?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachmentCount: existingDoc?.attachmentCount || 0,
            hasScripts: content.includes('```')
        };
        
        await this.saveDocumentToDB(doc);
        await this.loadDocuments();
        // Reload categories to get updated counts
        await this.loadCategories();
        this.extractSubcategoriesFromCategories();
        this.buildAllDocumentsFromCategories();
        this.editMode = false;
        this.currentDocument = doc.id.toString();
        await this.updateDisplay();
    }

    async deleteDocument(docId) {
        const confirmed = await this.showConfirm('Are you sure you want to delete this document? This will also delete all attachments.', 'Delete Document');
        if (!confirmed) return;
        
        await this.deleteDocumentFromDB(parseInt(docId));
        await this.loadDocuments();
        // Reload categories to get updated counts
        await this.loadCategories();
        this.extractSubcategoriesFromCategories();
        this.buildAllDocumentsFromCategories();
        
        if (this.currentDocument === docId) {
            this.currentDocument = null;
        }
        await this.updateDisplay();
    }

    async duplicateDocument(docId) {
        const doc = this.documents.find(d => d.id === parseInt(docId));
        if (!doc) return;
        
        const newDoc = {
            title: doc.title + ' (Copy)',
            content: doc.content,
            category: doc.category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attachmentCount: 0,
            hasScripts: doc.hasScripts
        };
        
        await this.saveDocumentToDB(newDoc);
        await this.loadDocuments();
        // Reload categories to get updated counts
        await this.loadCategories();
        this.extractSubcategoriesFromCategories();
        this.buildAllDocumentsFromCategories();
        await this.updateDisplay();
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        const docId = parseInt(this.currentDocument);
        
        for (const file of files) {
            try {
                const attachment = {
                    documentId: docId,
                    file: file
                };
                
                await this.saveAttachment(attachment);
                
                // Update local document's attachment count immediately
                const doc = this.getCurrentDocument();
                if (doc) {
                    doc.attachmentCount = (doc.attachmentCount || 0) + 1;
                }
                
                // Reload documents to get updated attachment count from server
                await this.loadDocuments();
                await this.updateDisplay();
            } catch (error) {
                this.showError('Error uploading file: ' + error.message);
            }
        }
    }

    async downloadAttachment(attachId) {
        const link = document.createElement('a');
        link.href = `/api/docs/attachments/download?id=${attachId}`;
        link.download = '';
        link.click();
    }

    async viewAttachment(attachId, fileName, fileType) {
        try {
            // Fetch attachment data
            const response = await fetch(`/api/docs/attachments/view?id=${attachId}`);
            if (!response.ok) {
                throw new Error('Failed to load attachment');
            }

            const contentType = response.headers.get('content-type') || fileType || '';
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Initialize modal actions
            let modalActions = [
                {
                    label: 'Download',
                    class: 'btn-secondary',
                    icon: 'fas fa-download',
                    onclick: `docInstance.downloadAttachment('${attachId}');`
                },
                {
                    label: 'Close',
                    class: 'btn-primary',
                    onclick: `modalInstance.close(); URL.revokeObjectURL('${url}');`
                }
            ];

            // Determine viewer content based on file type
            let viewerContent = '';
            let text = '';
            
            if (contentType.startsWith('image/')) {
                // Image viewer
                viewerContent = `
                    <div class="attachment-viewer-image">
                        <img src="${url}" alt="${this.escapeHtml(fileName)}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
                    </div>
                `;
            } else if (contentType === 'application/pdf') {
                // PDF viewer
                viewerContent = `
                    <div class="attachment-viewer-pdf">
                        <iframe src="${url}" style="width: 100%; height: 80vh; border: none;"></iframe>
                    </div>
                `;
            } else if (contentType.startsWith('text/') || 
                       fileName.endsWith('.txt') || 
                       fileName.endsWith('.md') || 
                       fileName.endsWith('.json') || 
                       fileName.endsWith('.xml') || 
                       fileName.endsWith('.csv') ||
                       fileName.endsWith('.log') ||
                       fileName.endsWith('.yaml') ||
                       fileName.endsWith('.yml') ||
                       fileName.endsWith('.ps1') ||
                       fileName.endsWith('.psm1') ||
                       fileName.endsWith('.psd1') ||
                       fileName.endsWith('.ps1xml') ||
                       fileName.endsWith('.sh') ||
                       fileName.endsWith('.bat') ||
                       fileName.endsWith('.cmd') ||
                       fileName.endsWith('.js') ||
                       fileName.endsWith('.ts') ||
                       fileName.endsWith('.py') ||
                       fileName.endsWith('.rb') ||
                       fileName.endsWith('.go') ||
                       fileName.endsWith('.java') ||
                       fileName.endsWith('.cpp') ||
                       fileName.endsWith('.c') ||
                       fileName.endsWith('.h') ||
                       fileName.endsWith('.cs') ||
                       fileName.endsWith('.php') ||
                       fileName.endsWith('.sql') ||
                       (contentType === 'application/octet-stream' && 
                        (fileName.endsWith('.ps1') || fileName.endsWith('.psm1') || fileName.endsWith('.psd1') || fileName.endsWith('.sh') || fileName.endsWith('.bat') || fileName.endsWith('.cmd')))) {
                // Text file viewer (including scripts) with syntax highlighting
                text = await blob.text();
                const language = this.detectLanguage(fileName, contentType);
                const highlighted = this.highlightSyntax(text, language);
                const lineCount = text.split('\n').length;
                viewerContent = `
                    <div class="attachment-viewer-text">
                        <div class="attachment-viewer-text-header">
                            <div class="attachment-viewer-text-header-left">
                                <span class="attachment-viewer-text-language">${language}</span>
                                <span style="color: #64748b; font-size: 0.75rem; margin-left: 1rem;">
                                    ${lineCount} line${lineCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div class="attachment-viewer-text-actions">
                                <button class="btn-icon-small" onclick="docInstance.copyToClipboard(event, \`${this.escapeHtml(text).replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" title="Copy">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        <pre><code>${highlighted}</code></pre>
                    </div>
                `;
                
                // Add copy button to modal actions for scripts
                modalActions.unshift({
                    label: 'Copy',
                    class: 'btn-secondary',
                    icon: 'fas fa-copy',
                    onclick: `docInstance.copyToClipboard(event, \`${this.escapeHtml(text).replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);`
                });
            } else {
                // Unsupported file type - show info and download option
                viewerContent = `
                    <div class="attachment-viewer-unsupported">
                        <div class="attachment-viewer-icon-large">
                            <i class="fas ${this.getFileIcon(contentType)}"></i>
                        </div>
                        <h3>${this.escapeHtml(fileName)}</h3>
                        <p>This file type cannot be previewed in the browser.</p>
                        <p class="attachment-viewer-meta">Type: ${contentType || 'Unknown'}</p>
                        <p class="attachment-viewer-meta">Size: ${this.formatFileSize(blob.size)}</p>
                        <button class="btn btn-primary" onclick="docInstance.downloadAttachment('${attachId}')">
                            <i class="fas fa-download"></i> Download File
                        </button>
                    </div>
                `;
            }

            // Create modal with viewer - use file name as title
            const modalContent = `
                <div class="attachment-viewer-body">
                    ${viewerContent}
                </div>
            `;

            if (!this.modal) {
                const { Modal } = await import('../components/Modal.js');
                this.modal = new Modal();
                window.modalInstance = this.modal;
            }

            // Store the URL for cleanup
            this.currentAttachmentUrl = url;

            // Use file name as title with icon
            const modalTitle = `<i class="fas ${this.getFileIcon(contentType)}" style="color: var(--primary); margin-right: 0.5rem;"></i>${this.escapeHtml(fileName)}`;
            this.modal.open(modalTitle, modalContent, modalActions, true); // Use large modal for code viewing

            // Add cleanup when modal closes
            const modalOverlay = document.querySelector('.modal-overlay');
            if (modalOverlay) {
                const cleanup = () => {
                    if (this.currentAttachmentUrl) {
                        URL.revokeObjectURL(this.currentAttachmentUrl);
                        this.currentAttachmentUrl = null;
                    }
                    modalOverlay.removeEventListener('click', cleanup);
                };
                modalOverlay.addEventListener('click', cleanup);
            }

        } catch (error) {
            console.error('Error viewing attachment:', error);
            this.showError('Error viewing attachment: ' + error.message);
        }
    }

    async showDeleteAttachmentConfirmation(attachId, fileName = null) {
        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        const modalContent = `
            <div class="confirmation-dialog">
                <div class="confirmation-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="confirmation-title">Delete Attachment</h3>
                <p class="confirmation-message">
                    Are you sure you want to delete ${fileName ? `<strong>${this.escapeHtml(fileName)}</strong>` : 'this attachment'}?
                </p>
                <p class="confirmation-warning">This action cannot be undone.</p>
            </div>
        `;

        const modalActions = [
            {
                label: 'Cancel',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            },
            {
                label: 'Delete',
                class: 'btn-secondary',
                icon: 'fas fa-trash',
                onclick: `modalInstance.close(); docInstance.confirmDeleteAttachment('${attachId}');`
            }
        ];

        this.modal.open('Confirm Deletion', modalContent, modalActions, false, true);
    }

    async confirmDeleteAttachment(attachId) {
        await this.deleteAttachmentFromDB(attachId);
        
        // Update document attachment count
        const doc = this.getCurrentDocument();
        if (doc) {
            doc.attachmentCount = Math.max(0, (doc.attachmentCount || 0) - 1);
            await this.saveDocumentToDB(doc);
        }
        
        // Reload documents to get updated count from server
        await this.loadDocuments();
        await this.updateDisplay();
    }

    async deleteAttachment(attachId) {
        // Get attachment name if possible
        let fileName = null;
        try {
            const attachments = await this.getAttachments(parseInt(this.currentDocument));
            const attachment = attachments.find(a => a.id === attachId);
            if (attachment) {
                fileName = attachment.name;
            }
        } catch (error) {
            console.error('Error loading attachment:', error);
        }
        
        await this.showDeleteAttachmentConfirmation(attachId, fileName);
    }

    copyScript(index) {
        const doc = this.getCurrentDocument();
        const blocks = this.extractCodeBlocks(doc.content);
        if (blocks[index]) {
            navigator.clipboard.writeText(blocks[index].code);
            this.showSuccess('Script copied to clipboard!');
        }
    }

    downloadScript(index, extension) {
        const doc = this.getCurrentDocument();
        const blocks = this.extractCodeBlocks(doc.content);
        if (blocks[index]) {
            const blob = new Blob([blocks[index].code], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${doc.title}_script_${index + 1}.${extension}`;
            link.click();
        }
    }

    insertMarkdown(before, after) {
        const textarea = document.getElementById('doc-content');
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const newText = before + selectedText + after;
        
        textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
        textarea.focus();
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
        
        this.updatePreview();
    }



    handleToolbarClick(event) {
        const button = event.target.closest('.toolbar-btn');
        if (!button) return;
        
        const before = button.getAttribute('data-markdown-before') || '';
        const after = button.getAttribute('data-markdown-after') || '';
        if (before || after) {
            this.insertMarkdown(before, after);
        }
    }

    updatePreview(content = null) {
        const textarea = document.getElementById('doc-content');
        const preview = document.getElementById('doc-preview');
        if (!preview) return;
        
        let contentToRender = content;
        if (!contentToRender) {
            contentToRender = textarea?.value || '';
            // If content has collapsed images, restore from original
            if (contentToRender.includes('<base64-image:')) {
                const original = textarea?.getAttribute('data-original-content');
                if (original) {
                    // Replace collapsed placeholders with original base64
                    const lines = contentToRender.split('\n');
                    const originalLines = original.split('\n');
                    let restored = '';
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (line.includes('<base64-image:')) {
                            const match = line.match(/!\[([^\]]*)\]\(<base64-image:([^>]+)>\)/);
                            if (match) {
                                // Find matching line in original
                                for (let j = 0; j < originalLines.length; j++) {
                                    if (originalLines[j].includes(`![${match[1]}]`) && originalLines[j].includes('data:image/')) {
                                        restored += originalLines[j] + '\n';
                                        break;
                                    }
                                }
                            } else {
                                restored += line + '\n';
                            }
                        } else {
                            restored += line + '\n';
                        }
                    }
                    contentToRender = restored.trim();
                }
            }
        }
        
        preview.innerHTML = this.renderMarkdown(contentToRender, true);
    }

    togglePreview() {
        const preview = document.querySelector('.editor-preview-advanced');
        if (preview) {
            preview.classList.toggle('preview-fullscreen');
        }
    }

    async exportDocument(docId) {
        const doc = this.documents.find(d => d.id === parseInt(docId));
        if (!doc) return;
        
        const content = `# ${doc.title}\n\n${doc.content}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${doc.title}.md`;
        link.click();
    }

    async manageAttachments(docId) {
        const docIdNum = parseInt(docId);
        const attachments = await this.getAttachments(docIdNum);
        
        const attachmentsList = attachments.length > 0 ? `
            <div class="attachments-list-modal">
                <h4 style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600;">Current Attachments</h4>
                <div class="attachments-grid-modal">
                    ${attachments.map(att => `
                        <div class="attachment-item-modal">
                            <div class="attachment-icon-modal">
                                <i class="fas ${this.getFileIcon(att.type || 'file')}"></i>
                            </div>
                            <div class="attachment-info-modal">
                                <div class="attachment-name-modal" title="${this.escapeHtml(att.name || 'Unknown')}">${this.escapeHtml(att.name || 'Unknown')}</div>
                                <div class="attachment-meta-modal">
                                    <span>${this.formatFileSize(att.size || 0)}</span>
                                </div>
                            </div>
                            <div class="attachment-actions-modal">
                                <button class="btn-icon-small" onclick="docInstance.viewAttachment('${att.id}', '${this.escapeHtml(att.name || '')}', '${att.type || ''}')" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <a href="/api/docs/attachments/download?id=${att.id}" class="btn-icon-small" download title="Download">
                                    <i class="fas fa-download"></i>
                                </a>
                                <button class="btn-icon-small btn-danger" onclick="docInstance.deleteAttachmentFromModal('${att.id}', ${docIdNum})" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div style="text-align: center; padding: 2rem; color: #64748b;">
                <i class="fas fa-paperclip" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p>No attachments yet</p>
            </div>
        `;

        const modalContent = `
            ${attachmentsList}
            <div class="attachment-upload-section" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e2e8f0;">
                <h4 style="margin: 0 0 0.75rem 0; font-size: 0.875rem; font-weight: 600; color: #64748b;">Upload New Attachment</h4>
                <div class="attachment-dropzone-modal" id="attachment-dropzone-${docIdNum}" 
                     ondrop="docInstance.handleDrop(event, ${docIdNum})" 
                     ondragover="docInstance.handleDragOver(event)"
                     ondragleave="docInstance.handleDragLeave(event)">
                    <input type="file" id="attachment-input-${docIdNum}" 
                           style="display: none;" 
                           multiple 
                           onchange="docInstance.handleFileSelect(event, ${docIdNum})">
                    <div class="dropzone-content">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 1.5rem; color: var(--primary); margin-bottom: 0.25rem;"></i>
                        <p style="margin: 0.25rem 0; color: #64748b; font-size: 0.875rem;">Drag and drop files here or</p>
                        <button type="button" class="btn btn-primary btn-sm" onclick="document.getElementById('attachment-input-${docIdNum}').click()" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                            <i class="fas fa-folder-open"></i> Browse Files
                        </button>
                        <p style="margin: 0.25rem 0 0 0; font-size: 0.6875rem; color: #94a3b8;">Multiple files supported</p>
                    </div>
                </div>
            </div>
        `;

        const modalActions = [
            {
                label: 'Close',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            }
        ];

        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        this.modal.open('Manage Attachments', modalContent, modalActions);
    }

    async showDeleteAttachmentFromModalConfirmation(attachId, docId, fileName = null) {
        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }

        const modalContent = `
            <div class="confirmation-dialog">
                <div class="confirmation-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="confirmation-title">Delete Attachment</h3>
                <p class="confirmation-message">
                    Are you sure you want to delete ${fileName ? `<strong>${this.escapeHtml(fileName)}</strong>` : 'this attachment'}?
                </p>
                <p class="confirmation-warning">This action cannot be undone.</p>
            </div>
        `;

        const modalActions = [
            {
                label: 'Cancel',
                class: 'btn-secondary',
                onclick: 'modalInstance.close()'
            },
            {
                label: 'Delete',
                class: 'btn-secondary',
                icon: 'fas fa-trash',
                onclick: `modalInstance.close(); docInstance.confirmDeleteAttachmentFromModal('${attachId}', ${docId});`
            }
        ];

        this.modal.open('Confirm Deletion', modalContent, modalActions, false, true);
    }

    async confirmDeleteAttachmentFromModal(attachId, docId) {
        try {
            await this.deleteAttachmentFromDB(attachId);
            
            // Update document attachment count
            const doc = this.documents.find(d => d.id === docId);
            if (doc) {
                doc.attachmentCount = Math.max(0, (doc.attachmentCount || 0) - 1);
                await this.saveDocumentToDB(doc);
            }
            
            // Reload documents to get updated count from server
            await this.loadDocuments();
            
            // Reload and refresh modal
            await this.manageAttachments(docId);
            
            // Update display if we're viewing this document
            if (this.currentDocument && parseInt(this.currentDocument) === docId) {
                await this.updateDisplay();
            }
        } catch (error) {
            console.error('Error deleting attachment:', error);
            this.showError('Error deleting attachment: ' + error.message);
        }
    }

    async deleteAttachmentFromModal(attachId, docId) {
        // Get attachment name
        let fileName = null;
        try {
            const attachments = await this.getAttachments(docId);
            const attachment = attachments.find(a => a.id === attachId);
            if (attachment) {
                fileName = attachment.name;
            }
        } catch (error) {
            console.error('Error loading attachment:', error);
        }
        
        await this.showDeleteAttachmentFromModalConfirmation(attachId, docId, fileName);
    }

    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');
    }

    async handleDrop(event, docId) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;
        
        await this.uploadFiles(files, docId);
        await this.manageAttachments(docId); // Refresh modal
    }

    async handleFileSelect(event, docId) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        await this.uploadFiles(files, docId);
        await this.manageAttachments(docId); // Refresh modal
    }

    async uploadFiles(files, docId) {
        for (const file of files) {
            try {
                const attachment = {
                    documentId: docId,
                    file: file
                };
                
                await this.saveAttachment(attachment);
                
                // Update local document's attachment count immediately
                const doc = this.documents.find(d => d.id === docId);
                if (doc) {
                    doc.attachmentCount = (doc.attachmentCount || 0) + 1;
                }
                
                // Reload documents to get updated attachment count from server
                await this.loadDocuments();
                
                // Update display if we're viewing this document
                if (this.currentDocument && parseInt(this.currentDocument) === docId) {
                    await this.updateDisplay();
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                this.showError('Error uploading ' + file.name + ': ' + error.message);
            }
        }
    }

    async updateDisplay() {
        const content = document.getElementById('page-content');
        if (!content) return;
        
        try {
            // Ensure arrays are initialized
            if (!Array.isArray(this.categories)) {
                this.categories = [];
            }
            if (!Array.isArray(this.subcategories)) {
                this.subcategories = [];
            }
            if (!Array.isArray(this.documents)) {
                this.documents = [];
            }
            
            // Ensure searchTerm is a string
            if (typeof this.searchTerm !== 'string') {
                this.searchTerm = '';
            }
            
            // Ensure data is loaded before rendering
            if (this.categories.length === 0 && !this.currentCategory) {
                await this.loadCategories();
            }
            if (this.currentCategory && !this.currentSubcategory && this.subcategories.length === 0) {
                await this.loadSubcategories();
            }
            if (this.currentSubcategory && this.documents.length === 0) {
                await this.loadDocuments();
            }
            
            content.innerHTML = await this.render();
            await this.mount();
        } catch (error) {
            console.error('Error updating display:', error);
            const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
            content.innerHTML = `
                <div class="empty-state-advanced">
                    <div class="empty-state-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Error Loading Data</h3>
                    <p>${this.escapeHtml(errorMessage)}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Reload Page
                    </button>
                </div>
            `;
        }
    }

    async mount() {
        window.docInstance = this;
        
        // Load categories if not loaded
        if (!Array.isArray(this.categories) || this.categories.length === 0) {
            await this.loadCategories();
            this.extractSubcategoriesFromCategories();
            this.buildAllDocumentsFromCategories();
        }
        
        // Initialize modal
        if (!this.modal) {
            const { Modal } = await import('../components/Modal.js');
            this.modal = new Modal();
            window.modalInstance = this.modal;
        }
        
        // Update preview on content change
        const textarea = document.getElementById('doc-content');
        if (textarea) {
            // Ensure original content is stored
            if (!textarea.getAttribute('data-original-content')) {
                textarea.setAttribute('data-original-content', textarea.value);
            }
            
            textarea.addEventListener('input', () => {
                // Update preview with restoration of base64 images
                this.updatePreview();
            });
            
            // Handle Enter key in code blocks - ensure newlines work properly
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const start = textarea.selectionStart;
                    const text = textarea.value;
                    const beforeCursor = text.substring(0, start);
                    
                    // Check if we're inside a code block
                    const codeBlockStart = beforeCursor.lastIndexOf('```');
                    if (codeBlockStart !== -1) {
                        // Check if there's a closing ``` after the start
                        const textAfterStart = text.substring(codeBlockStart + 3);
                        const codeBlockEnd = textAfterStart.indexOf('```');
                        
                        // If no closing ``` found, or cursor is before the closing ```, we're inside a code block
                        if (codeBlockEnd === -1 || start < codeBlockStart + 3 + codeBlockEnd) {
                            // We're inside a code block - allow normal Enter behavior
                            // The newline will be part of the code block content
                            return; // Don't prevent default, let Enter insert newline normally
                        }
                    }
                }
            });
        }
        
        // Add toolbar button click handlers
        const toolbar = document.querySelector('.editor-toolbar-advanced');
        if (toolbar) {
            toolbar.addEventListener('click', (e) => this.handleToolbarClick(e));
        }

        // Load attachments if viewing a document
        if (this.currentDocument && !this.editMode) {
            try {
                const docId = parseInt(this.currentDocument);
                if (!isNaN(docId)) {
                    await this.loadAttachmentsForDisplay(docId);
                }
            } catch (error) {
                console.error('Error loading attachments in mount:', error);
            }
        }

        // Initialize syntax highlighting if available
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
        
        // Add event listeners for image editing ONLY in edit mode
        if (this.editMode) {
            document.querySelectorAll('.image-wrapper').forEach(wrapper => {
                // Remove existing listeners to avoid duplicates
                const newWrapper = wrapper.cloneNode(true);
                wrapper.parentNode.replaceChild(newWrapper, wrapper);
                
                newWrapper.addEventListener('click', (e) => {
                    // Don't trigger if clicking the resize handle (it has its own handler)
                    if (e.target.closest('.image-resize-handle')) {
                        e.stopPropagation();
                        this.editImageSize(newWrapper);
                    } else if (!e.target.closest('a')) {
                        // Only trigger on image wrapper, not on links inside
                        this.editImageSize(newWrapper);
                    }
                });
            });
            
            // Add event listeners for resize handles
            document.querySelectorAll('.image-resize-handle').forEach(handle => {
                handle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const wrapper = handle.closest('.image-wrapper');
                    if (wrapper) {
                        this.editImageSize(wrapper);
                    }
                });
            });
        }
    }
}
