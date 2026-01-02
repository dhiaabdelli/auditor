export class TodoPage {
    constructor() {
        this.todos = [];
        this.draggedElement = null;
        this.dragOverColumn = null;
        this.activeTab = 'all';
        this.tabs = [
            { id: 'all', name: 'All Tasks', icon: 'fa-list' },
            { id: 'personal', name: 'Personal', icon: 'fa-user' },
            { id: 'work', name: 'Work', icon: 'fa-briefcase' },
            { id: 'projects', name: 'Projects', icon: 'fa-folder' }
        ];
    }

    async render() {
        return `
            <div class="page-container-full todo-full-page">
                <div class="todo-tabs-row">
                    <div class="todo-tabs" id="todo-tabs"></div>
                    <div class="todo-tabs-actions">
                            <button class="btn btn-secondary btn-sm" onclick="todoInstance.showNewTabModal()" title="Add New Tab">
                                <i class="fas fa-plus"></i> New Tab
                            </button>
                        <button class="btn btn-secondary btn-sm" id="new-task-btn" onclick="todoInstance.showNewTodoModal()" title="New Task">
                            <i class="fas fa-plus"></i> New Task
                        </button>
                        <button class="btn btn-danger btn-sm" id="delete-active-tab-btn" onclick="todoInstance.deleteActiveTab()" title="Delete Current Tab">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>

                <div class="todo-board" id="todo-board">
                    <div class="todo-column" data-status="todo">
                        <div class="todo-column-header">
                            <h3><i class="fas fa-list"></i> To Do</h3>
                            <span class="todo-count" id="count-todo">0</span>
                        </div>
                        <div class="todo-column-content" ondrop="todoInstance.handleDrop(event)" ondragover="todoInstance.handleDragOver(event)" ondragleave="todoInstance.handleDragLeave(event)">
                            <div class="todo-items" id="todos-todo"></div>
                        </div>
                    </div>

                    <div class="todo-column" data-status="in-progress">
                        <div class="todo-column-header">
                            <h3><i class="fas fa-spinner"></i> In Progress</h3>
                            <span class="todo-count" id="count-in-progress">0</span>
                        </div>
                        <div class="todo-column-content" ondrop="todoInstance.handleDrop(event)" ondragover="todoInstance.handleDragOver(event)" ondragleave="todoInstance.handleDragLeave(event)">
                            <div class="todo-items" id="todos-in-progress"></div>
                        </div>
                    </div>

                    <div class="todo-column" data-status="done">
                        <div class="todo-column-header">
                            <h3><i class="fas fa-check-circle"></i> Done</h3>
                            <span class="todo-count" id="count-done">0</span>
                        </div>
                        <div class="todo-column-content" ondrop="todoInstance.handleDrop(event)" ondragover="todoInstance.handleDragOver(event)" ondragleave="todoInstance.handleDragLeave(event)">
                            <div class="todo-items" id="todos-done"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async mount() {
        window.todoInstance = this;
        await this.loadTabs();
        this.renderTabsUI(); // Render tabs after loading from database
        await this.loadTodos();
        this.setupEventListeners();
        this.updateBoardActions(); // Update board actions visibility
    }
    
    renderTabsUI() {
        const tabsContainer = document.getElementById('todo-tabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = this.tabs.map(tab => {
                // Count tasks in this tab
                const taskCount = tab.id === 'all' 
                    ? this.todos.length 
                    : this.todos.filter(t => t && t.tab === tab.id).length;
                
                return `
                    <div class="todo-tab-wrapper" data-tab-id="${tab.id}">
                        <button class="todo-tab ${this.activeTab === tab.id ? 'active' : ''}" 
                                onclick="todoInstance.switchTab('${tab.id}')"
                                data-tab="${tab.id}">
                            <div class="todo-tab-content">
                                <i class="fas ${tab.icon}"></i>
                                <span class="todo-tab-name">${tab.name}</span>
                                ${taskCount > 0 ? `<span class="todo-tab-count">${taskCount}</span>` : ''}
                            </div>
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        // Update board actions visibility
        this.updateBoardActions();
    }

    async loadTabs() {
        try {
            const response = await fetch('/api/todo-tabs');
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to load tabs:', errorText);
                throw new Error(`Failed to load tabs: ${errorText}`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                // Use data even if empty - default tabs will be created by backend
                if (data.length > 0) {
                    this.tabs = data;
                } else {
                    // If no tabs returned, use defaults (backend should create them)
                    this.tabs = [
                        { id: 'all', name: 'All Tasks', icon: 'fa-list', position: 0 },
                        { id: 'personal', name: 'Personal', icon: 'fa-user', position: 1 },
                        { id: 'work', name: 'Work', icon: 'fa-briefcase', position: 2 },
                        { id: 'projects', name: 'Projects', icon: 'fa-folder', position: 3 }
                    ];
                }
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error loading tabs:', error);
            // Fallback to default tabs if API fails
            this.tabs = [
                { id: 'all', name: 'All Tasks', icon: 'fa-list', position: 0 },
                { id: 'personal', name: 'Personal', icon: 'fa-user', position: 1 },
                { id: 'work', name: 'Work', icon: 'fa-briefcase', position: 2 },
                { id: 'projects', name: 'Projects', icon: 'fa-folder', position: 3 }
            ];
        }
        
        // Load active tab from localStorage (UI preference only)
        const savedActiveTab = localStorage.getItem('todo-active-tab');
        if (savedActiveTab && this.tabs.find(t => t.id === savedActiveTab)) {
            this.activeTab = savedActiveTab;
        }
    }

    saveTabs() {
        // Only save active tab preference to localStorage
        localStorage.setItem('todo-active-tab', this.activeTab);
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        this.saveTabs();
        this.updateTabsUI();
        this.updateBoardActions();
        this.renderTodos();
        this.renderTabsUI(); // Re-render to update counts
    }
    
    deleteActiveTab() {
        if (this.activeTab === 'all') {
            this.showError('Cannot delete the "All Tasks" tab');
            return;
        }
        this.deleteTab(this.activeTab);
    }
    
    updateBoardActions() {
                const deleteBtn = document.getElementById('delete-active-tab-btn');
                if (deleteBtn) {
            if (this.activeTab === 'all') {
                deleteBtn.style.display = 'none';
            } else {
                deleteBtn.style.display = 'inline-flex';
                    const activeTab = this.tabs.find(t => t.id === this.activeTab);
                    if (activeTab) {
                        deleteBtn.title = `Delete ${activeTab.name}`;
                }
            }
        }
    }
    
    updateNewTaskButton() {
        // Button visibility is now controlled by updateBoardActions
        // This method is kept for compatibility but functionality moved to updateBoardActions
    }

    updateTabsUI() {
        const tabButtons = document.querySelectorAll('.todo-tab');
        tabButtons.forEach(btn => {
            const tabId = btn.dataset.tab;
            if (tabId === this.activeTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    showNewTabModal() {
        const modalContent = `
            <form id="new-tab-form" class="todo-form">
                <div class="todo-form-section">
                    <label class="todo-form-label">
                        <span class="todo-form-label-text">Tab Name <span class="required">*</span></span>
                        <input type="text" id="new-tab-name" class="todo-form-input" required placeholder="Enter tab name..." autofocus>
                    </label>
                </div>
                
                <div class="todo-form-section">
                    <label class="todo-form-label">
                        <span class="todo-form-label-text">Icon</span>
                        <select id="new-tab-icon" class="todo-form-select">
                            <option value="fa-star">⭐ Star</option>
                            <option value="fa-heart">❤️ Heart</option>
                            <option value="fa-fire">🔥 Fire</option>
                            <option value="fa-rocket">🚀 Rocket</option>
                            <option value="fa-lightbulb">💡 Lightbulb</option>
                            <option value="fa-trophy">🏆 Trophy</option>
                            <option value="fa-book">📚 Book</option>
                            <option value="fa-gamepad">🎮 Gamepad</option>
                            <option value="fa-music">🎵 Music</option>
                            <option value="fa-camera">📷 Camera</option>
                        </select>
                    </label>
                </div>
                
                <div class="todo-form-actions">
                    <button type="button" class="todo-form-btn todo-form-btn-cancel" onclick="window.modalInstance.close()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="submit" class="todo-form-btn todo-form-btn-submit">
                        <i class="fas fa-plus"></i> Create Tab
                    </button>
                </div>
            </form>
        `;
        
        window.modalInstance.open('Create New Tab', modalContent, [], false, false);
        
        setTimeout(() => {
            const form = document.getElementById('new-tab-form');
            const nameInput = document.getElementById('new-tab-name');
            
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = nameInput.value.trim();
                    const icon = document.getElementById('new-tab-icon').value;
                    
                    if (!name) {
                        this.showError('Tab name is required');
                        return;
                    }
                    
                    const newTab = {
                        id: `tab-${Date.now()}`,
                        name: name,
                        icon: icon
                    };
                    
                    // Save to database
                    try {
                        const response = await fetch('/api/todo-tabs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newTab)
                        });
                        
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(errorText || 'Failed to create tab');
                        }
                        
                        const savedTab = await response.json();
                        this.tabs.push(savedTab);
                        this.saveTabs();
                        this.switchTab(savedTab.id);
                        window.modalInstance.close();
                        this.renderTabsUI();
                        this.showSuccess('Tab created successfully!');
                    } catch (error) {
                        console.error('Error creating tab:', error);
                        this.showError(error.message || 'Failed to create tab');
                    }
                });
            }
            
            if (nameInput) {
                nameInput.focus();
            }
        }, 150);
    }

    async deleteTab(tabId) {
        if (tabId === 'all') {
            this.showError('Cannot delete the "All Tasks" tab');
            return;
        }
        
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        
        const confirmed = await this.showConfirm(`Are you sure you want to delete the "${tab.name}" tab?`, 'Delete Tab');
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/todo-tabs/delete?id=${tabId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to delete tab');
            }
            
            this.tabs = this.tabs.filter(t => t.id !== tabId);
            
            if (this.activeTab === tabId) {
                this.activeTab = 'all';
            }
            
            this.saveTabs();
            this.renderTabsUI();
            this.renderTodos();
            this.updateBoardActions();
            this.showSuccess('Tab deleted successfully!');
        } catch (error) {
            console.error('Error deleting tab:', error);
            this.showError(error.message || 'Failed to delete tab');
        }
    }

    setupEventListeners() {
        // Make all todo cards draggable
        document.querySelectorAll('.todo-card').forEach(card => {
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', (e) => this.handleDragStart(e));
            card.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }

    async loadTodos() {
        const board = document.getElementById('todo-board');
        try {
            if (board) {
                board.style.opacity = '0.5';
            }
            
            const response = await fetch('/api/todos');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to load todos');
            }
            const data = await response.json();
            // Ensure todos is always an array
            this.todos = Array.isArray(data) ? data : [];
            this.renderTodos();
            
            if (board) {
                board.style.opacity = '1';
            }
        } catch (error) {
            console.error('Error loading todos:', error);
            // Set to empty array on error to prevent null reference
            this.todos = [];
            this.renderTodos();
            this.showError('Failed to load tasks. Please refresh the page.');
            if (board) {
                board.style.opacity = '1';
            }
        }
    }

    renderTodos() {
        // Ensure todos is always an array
        if (!Array.isArray(this.todos)) {
            this.todos = [];
        }
        
        // Filter todos by active tab
        let filteredTodos = this.todos;
        if (this.activeTab !== 'all') {
            // Only show todos that belong to the active tab
            // Tasks without a tab (tab is null/undefined/empty) should only appear in "all"
            filteredTodos = this.todos.filter(t => {
                if (!t) return false;
                // If task has no tab assigned, it should only show in "all"
                if (!t.tab || t.tab === '' || t.tab === null) {
                    return false;
                }
                // Show tasks that match the active tab
                return t.tab === this.activeTab;
            });
        } else {
            // In "all" tab, show all todos including those without a tab
            filteredTodos = this.todos;
        }
        
        const statuses = ['todo', 'in-progress', 'done'];
        
        statuses.forEach(status => {
            const container = document.getElementById(`todos-${status}`);
            const countEl = document.getElementById(`count-${status}`);
            
            if (!container) return;
            if (!countEl) return;
            
            const filtered = filteredTodos.filter(t => t && t.status === status);
            countEl.textContent = filtered.length;
            
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="todo-empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No tasks here</p>
                        <small>Drag tasks here or create a new one</small>
                    </div>
                `;
            } else {
                container.innerHTML = filtered
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
                    .map(todo => this.renderTodoItem(todo))
                    .join('');
            }
        });

        // Re-setup event listeners for new items
        setTimeout(() => {
            this.setupEventListeners();
            this.renderTabsUI(); // Update tab counts
        }, 100);
    }

    formatRelativeDate(date, taskStatus = 'todo') {
        if (!date || isNaN(date.getTime())) return '';
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const due = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let colorClass = '';
        let urgency = 'normal'; // 'overdue', 'urgent', 'soon', 'normal', 'far'
        
        // If task is done, don't show overdue - just show the date normally
        const isDone = taskStatus === 'done';
        
        if (diffDays < 0 && !isDone) {
            // Overdue - only show for non-done tasks
            colorClass = 'todo-card-date-overdue';
            urgency = 'overdue';
            if (diffDays === -1) {
                return { text: 'Yesterday', isOverdue: true, isToday: false, colorClass, urgency };
            } else {
                return { text: `${Math.abs(diffDays)} days overdue`, isOverdue: true, isToday: false, colorClass, urgency };
            }
        } else if (isDone) {
            // Task is done - show actual date
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            const dateFormatted = `${day}/${month}/${year}`;
            return { text: `${dateFormatted} at ${timeFormatted}`, isOverdue: false, isToday: false, colorClass: 'todo-card-date-done', urgency: 'done' };
        } else if (diffDays === 0) {
            // Today - urgent
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            colorClass = 'todo-card-date-urgent';
            urgency = 'urgent';
            return { text: `Today at ${timeFormatted}`, isOverdue: false, isToday: true, colorClass, urgency };
        } else if (diffDays === 1) {
            // Tomorrow - urgent
            colorClass = 'todo-card-date-urgent';
            urgency = 'urgent';
            return { text: 'Tomorrow', isOverdue: false, isToday: false, colorClass, urgency };
        } else if (diffDays <= 3) {
            // 2-3 days - soon
            colorClass = 'todo-card-date-soon';
            urgency = 'soon';
            return { text: `${diffDays} days left`, isOverdue: false, isToday: false, colorClass, urgency };
        } else if (diffDays <= 7) {
            // 4-7 days - normal
            colorClass = 'todo-card-date-normal';
            urgency = 'normal';
            return { text: `${diffDays} days left`, isOverdue: false, isToday: false, colorClass, urgency };
        } else {
            // More than 7 days - far
            colorClass = 'todo-card-date-far';
            urgency = 'far';
            return { text: `${diffDays} days left`, isOverdue: false, isToday: false, colorClass, urgency };
        }
    }

    renderTodoItem(todo) {
        const priorityConfig = {
            low: { color: '#10b981', bg: '#d1fae5' },
            medium: { color: '#f59e0b', bg: '#fef3c7' },
            high: { color: '#ef4444', bg: '#fee2e2' }
        };
        const priority = priorityConfig[todo.priority] || priorityConfig.medium;
        
        let dueDate = null;
        let dateInfo = null;
        let isOverdue = false;
        
        if (todo.dueDate && todo.dueDate !== '' && todo.dueDate !== null) {
            try {
                dueDate = new Date(todo.dueDate);
                if (!isNaN(dueDate.getTime())) {
                    dateInfo = this.formatRelativeDate(dueDate, todo.status);
                    // Only show overdue for todo or in-progress tasks
                    isOverdue = dateInfo.isOverdue && (todo.status === 'todo' || todo.status === 'in-progress');
                }
            } catch (e) {
                console.error('Error parsing date:', e);
            }
        }

        // Get tab info for display in "All Tasks" view
        const todoTab = todo.tab || '';
        const tabInfo = this.tabs.find(t => t.id === todoTab);
        const showTabBadge = this.activeTab === 'all';
        const isUnassigned = !todoTab || !tabInfo;
        
        // Category colors based on tab
        const categoryColors = {
            'work': '#3b82f6',
            'personal': '#8b5cf6',
            'projects': '#10b981',
            'fun': '#f59e0b'
        };
        const categoryColor = tabInfo ? (categoryColors[tabInfo.id] || '#64748b') : '#64748b';
        const categoryName = tabInfo ? tabInfo.name : (isUnassigned ? 'Unassigned' : '');

        // Subtask progress
        const subtasksTotal = todo.subtasksTotal || 0;
        const subtasksCompleted = todo.subtasksCompleted || 0;

        // Tab icon for avatar
        const tabIcon = tabInfo ? tabInfo.icon : 'fa-tag';
        const tabIconBg = tabInfo ? (categoryColors[tabInfo.id] || '#64748b') : '#94a3b8';

        // Format date for display
        let dateStr = '';
        let dateClass = '';
        if (dateInfo) {
            dateStr = dateInfo.text;
            // Remove color coding if task is done
            if (todo.status === 'done') {
                dateClass = 'todo-card-date-done';
            } else {
                dateClass = dateInfo.colorClass || '';
            }
        }

        return `
            <div class="todo-card" draggable="true" data-id="${todo.id}" data-status="${todo.status}" data-priority="${todo.priority || 'medium'}">
                <div class="todo-card-header-image">
                    <div class="todo-card-avatar" style="background: ${tabIconBg};">
                        <i class="fas ${tabIcon}"></i>
                    </div>
                    <div class="todo-card-title-wrapper">
                        <h4 class="todo-card-title">${this.escapeHtml(todo.title)}</h4>
                    </div>
                </div>
                <div class="todo-card-footer-image">
                    <div class="todo-card-stats-image">
                        ${dateStr ? `
                            <span class="todo-card-stat-image ${dateClass}">
                                <i class="fas ${todo.status === 'done' ? 'fa-check-circle' : dateInfo.urgency === 'overdue' ? 'fa-exclamation-triangle' : dateInfo.urgency === 'urgent' ? 'fa-clock' : dateInfo.urgency === 'soon' ? 'fa-hourglass-half' : 'fa-calendar'}"></i>
                                <span>${dateStr}</span>
                            </span>
                        ` : ''}
                        ${subtasksTotal > 0 ? `
                            <span class="todo-card-stat-image">
                                <i class="fas fa-check-circle"></i>
                                <span>${subtasksCompleted}/${subtasksTotal}</span>
                            </span>
                        ` : ''}
                    </div>
                    <div class="todo-card-actions-image">
                        <button class="todo-card-action-image" onclick="event.stopPropagation(); todoInstance.editTodo(${todo.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="todo-card-action-image" onclick="event.stopPropagation(); todoInstance.deleteTodo(${todo.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async toggleTodoStatus(id, checked) {
        const newStatus = checked ? 'done' : 'todo';
        const todo = this.todos.find(t => t && t.id === id);
        if (!todo) return;
        
        try {
            const requestData = {
                id,
                title: todo.title,
                description: todo.description || '',
                priority: todo.priority || 'medium',
                status: newStatus,
                dueDate: todo.dueDate || null,
                tab: todo.tab || null
            };
            
            const response = await fetch('/api/todos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to update task');
            }
            
            await this.loadTodos();
        } catch (error) {
            console.error('Error toggling todo status:', error);
            this.showError('Failed to update task status');
        }
    }

    async showSubtaskModal(todoId) {
        try {
            // Load subtasks
            const response = await fetch(`/api/todos/subtasks?todo_id=${todoId}`);
            if (!response.ok) throw new Error('Failed to load subtasks');
            const subtasks = await response.json();

            // Get todo info
            const todo = this.todos.find(t => t && t.id === todoId);
            if (!todo) return;

            const subtasksHtml = subtasks.map(subtask => `
                <div class="subtask-item" data-id="${subtask.id}">
                    <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                           onchange="todoInstance.toggleSubtask(${subtask.id}, this.checked)">
                    <input type="text" class="subtask-title" value="${this.escapeHtml(subtask.title)}" 
                           onblur="todoInstance.updateSubtask(${subtask.id}, this.value)">
                    <button class="subtask-delete" onclick="todoInstance.deleteSubtask(${subtask.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            const content = `
                <div class="subtask-modal-content">
                    <div class="subtask-list">
                        ${subtasksHtml || '<p class="subtask-empty">No subtasks yet. Add one below!</p>'}
                    </div>
                    <div class="subtask-add">
                        <input type="text" class="subtask-input" placeholder="Add new subtask..." id="new-subtask-input">
                        <button class="subtask-add-btn" onclick="todoInstance.addSubtask(${todoId})">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </div>
                </div>
            `;

            const actions = [
                {
                    label: 'Close',
                    class: 'btn-secondary',
                    onclick: () => window.modalInstance.close()
                }
            ];

            window.modalInstance.open('Manage Checklist', content, actions);

            // Store todoId in modal for reloading
            let modal = document.querySelector('.modal-container');
            if (!modal) {
                modal = document.querySelector('.modal-overlay');
            }
            if (!modal) {
                modal = document.querySelector('.modal');
            }
            if (modal) {
                modal.dataset.todoId = todoId;
            }

            // Focus input and handle Enter key
            const input = document.getElementById('new-subtask-input');
            if (input) {
                input.focus();
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addSubtask(todoId);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading subtasks:', error);
            this.showError('Failed to load checklist');
        }
    }

    async addSubtask(todoId) {
        const input = document.getElementById('new-subtask-input');
        if (!input || !input.value.trim()) return;

        try {
            const response = await fetch('/api/todos/subtasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    todoId: todoId,
                    title: input.value.trim()
                })
            });

            if (!response.ok) throw new Error('Failed to add subtask');

            input.value = '';
            await this.loadTodos();
            await this.showSubtaskModal(todoId);
        } catch (error) {
            console.error('Error adding subtask:', error);
            this.showError('Failed to add subtask');
        }
    }

    async updateSubtask(id, title) {
        if (!title.trim()) return;

        try {
            const response = await fetch('/api/todos/subtasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    title: title.trim()
                })
            });

            if (!response.ok) throw new Error('Failed to update subtask');

            await this.loadTodos();
        } catch (error) {
            console.error('Error updating subtask:', error);
            this.showError('Failed to update subtask');
        }
    }

    async toggleSubtask(id, completed) {
        try {
            const response = await fetch('/api/todos/subtasks/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    completed: completed
                })
            });

            if (!response.ok) throw new Error('Failed to toggle subtask');

            await this.loadTodos();
        } catch (error) {
            console.error('Error toggling subtask:', error);
            this.showError('Failed to update subtask');
        }
    }

    async deleteSubtask(id) {
        const confirmed = await this.showConfirm('Delete this subtask?', 'Delete Subtask');
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/todos/subtasks?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete subtask');

            await this.loadTodos();
            
            // Reload modal if open
            let modal = document.querySelector('.modal-container');
            if (!modal) {
                modal = document.querySelector('.modal-overlay');
            }
            if (!modal) {
                modal = document.querySelector('.modal');
            }
            if (modal) {
                const todoId = parseInt(modal.dataset.todoId || '0');
                if (todoId) await this.showSubtaskModal(todoId);
            }
        } catch (error) {
            console.error('Error deleting subtask:', error);
            this.showError('Failed to delete subtask');
        }
    }

    handleDragStart(e) {
        this.draggedElement = e.target.closest('.todo-card');
        if (this.draggedElement) {
            this.draggedElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.draggedElement.outerHTML);
        }
    }

    handleDragEnd(e) {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        document.querySelectorAll('.todo-column-content').forEach(col => {
            col.classList.remove('drag-over');
        });
        this.draggedElement = null;
        this.dragOverColumn = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const column = e.currentTarget;
        column.classList.add('drag-over');
        this.dragOverColumn = column;
    }

    handleDragLeave(e) {
        const column = e.currentTarget;
        if (!column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        const column = e.currentTarget;
        const newStatus = column.closest('.todo-column').dataset.status;
        column.classList.remove('drag-over');

        if (!this.draggedElement) return;

        const todoId = parseInt(this.draggedElement.dataset.id);
        const oldStatus = this.draggedElement.dataset.status;
        
        if (!todoId || !oldStatus) return;

        if (newStatus === oldStatus) {
            // Just reordering within same column
            const items = Array.from(column.querySelectorAll('.todo-card'));
            const dropIndex = this.getDropIndex(e, items);
            await this.reorderTodos(todoId, newStatus, dropIndex);
        } else {
            // Moving to different column
            const items = Array.from(column.querySelectorAll('.todo-card'));
            const dropIndex = this.getDropIndex(e, items);
            await this.moveTodo(todoId, oldStatus, newStatus, dropIndex);
        }

        await this.loadTodos();
    }

    getDropIndex(e, items) {
        let dropIndex = items.length;
        for (let i = 0; i < items.length; i++) {
            const rect = items[i].getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
                dropIndex = i;
                break;
            }
        }
        return dropIndex;
    }

    async moveTodo(todoId, oldStatus, newStatus, position) {
        try {
            // Ensure todos is an array
            if (!Array.isArray(this.todos)) {
                this.todos = [];
            }
            
            // Get all todos in the new status
            const todosInNewStatus = this.todos
                .filter(t => t && t.status === newStatus && t.id !== todoId)
                .sort((a, b) => (a.position || 0) - (b.position || 0));

            // Update positions
            const updates = [];
            
            // Get the todo being moved to preserve its tab
            const movedTodo = this.todos.find(t => t && t.id === todoId);
            const todoTab = movedTodo && movedTodo.tab ? movedTodo.tab : null;
            
            // Update the moved todo (preserve tab)
            updates.push({
                id: todoId,
                status: newStatus,
                position: position,
                tab: todoTab
            });

            // Shift other todos (preserve their tabs)
            todosInNewStatus.forEach((todo, index) => {
                if (index >= position) {
                    updates.push({
                        id: todo.id,
                        status: newStatus,
                        position: index + 1,
                        tab: todo.tab || null
                    });
                }
            });

            // Update old status positions (filter by active tab too)
            const todosInOldStatus = this.todos
                .filter(t => {
                    if (!t || t.status !== oldStatus || t.id === todoId) return false;
                    // Only include todos from the same tab
                    if (this.activeTab !== 'all') {
                        return t.tab === this.activeTab;
                    }
                    return true;
                })
                .sort((a, b) => (a.position || 0) - (b.position || 0));

            todosInOldStatus.forEach((todo, index) => {
                updates.push({
                    id: todo.id,
                    status: oldStatus,
                    position: index,
                    tab: todo.tab || null
                });
            });

            await fetch('/api/todos/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            // Animate the move
            this.animateMove(this.draggedElement, newStatus);
        } catch (error) {
            console.error('Error moving todo:', error);
        }
    }

    async reorderTodos(todoId, status, position) {
        try {
            // Ensure todos is an array
            if (!Array.isArray(this.todos)) {
                this.todos = [];
            }
            
            const todosInStatus = this.todos
                .filter(t => t && t.status === status)
                .sort((a, b) => (a.position || 0) - (b.position || 0));

            const updates = [];
            const todo = todosInStatus.find(t => t.id === todoId);
            if (!todo) return;

            todosInStatus.forEach((t, index) => {
                if (t.id === todoId) {
                    updates.push({ 
                        id: t.id, 
                        status: status, 
                        position: position,
                        tab: t.tab || null
                    });
                } else if (index < position && t.position < todo.position) {
                    // No change needed
                } else if (index >= position && t.position > todo.position) {
                    // No change needed
                } else {
                    const newPos = index >= position ? index + 1 : index;
                    if (newPos !== t.position) {
                        updates.push({ 
                            id: t.id, 
                            status: status, 
                            position: newPos,
                            tab: t.tab || null
                        });
                    }
                }
            });

            if (updates.length > 0) {
                await fetch('/api/todos/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
            }
        } catch (error) {
            console.error('Error reordering todos:', error);
        }
    }

    animateMove(element, newStatus) {
        if (!element) return;
        element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        element.style.transform = 'scale(1.05)';
        setTimeout(() => {
            if (element.parentNode) {
                element.style.transform = '';
            }
        }, 300);
    }

    showNewTodoModal() {
        // Prevent creating tasks in "All Tasks" tab
        if (this.activeTab === 'all') {
            this.showError('Please select a specific tab to create a task');
            return;
        }
        
        const modalContent = `
            <div class="todo-modal-compact">
                <form id="new-todo-form" class="todo-form-compact">
                    <div class="todo-form-compact-header">
                        <h3 class="todo-form-compact-title">Create Task</h3>
                    </div>
                    
                    <div class="todo-form-compact-body">
                        <div class="todo-form-compact-row">
                            <input type="text" id="todo-title" class="todo-form-compact-title-input" required placeholder="Task title..." autofocus>
                            <select id="todo-priority" class="todo-form-compact-priority">
                                <option value="low">🟢</option>
                                <option value="medium" selected>🟡</option>
                                <option value="high">🔴</option>
                            </select>
                        </div>
                        
                        <textarea id="todo-description" class="todo-form-compact-description" rows="2" placeholder="Description (optional)"></textarea>
                        
                        <div class="todo-form-compact-row">
                            <input type="datetime-local" id="todo-due-date" class="todo-form-compact-date">
                            <select id="todo-status" class="todo-form-compact-status">
                                <option value="todo" selected>📋 To Do</option>
                                <option value="in-progress">⚙️ In Progress</option>
                                <option value="done">✅ Done</option>
                            </select>
                        </div>
                        
                        <div class="todo-form-compact-section">
                            <div class="todo-form-compact-section-header">
                                <span class="todo-form-compact-section-title">
                                    <i class="fas fa-tasks"></i> Subtasks
                                </span>
                            </div>
                            <div class="todo-form-compact-subtasks" id="new-todo-subtasks-list">
                                <p class="todo-form-compact-empty">No subtasks yet</p>
                            </div>
                            <div class="todo-form-compact-subtask-add">
                                <input type="text" class="todo-form-compact-subtask-input" id="new-todo-subtask-input" placeholder="Add subtask...">
                                <button type="button" class="todo-form-compact-subtask-btn" onclick="todoInstance.addSubtaskToForm('new')">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="todo-form-compact-actions">
                        <button type="button" class="todo-form-compact-btn todo-form-compact-btn-cancel" onclick="window.modalInstance.close()">
                            Cancel
                        </button>
                        <button type="submit" class="todo-form-compact-btn todo-form-compact-btn-submit" id="todo-submit-btn">
                            <i class="fas fa-plus"></i> Create
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        window.modalInstance.open('Create New Task', modalContent, [], false, false);
        
        // Handle Enter key for subtask input and initialize modal data
        setTimeout(() => {
            // Store subtasks in form data - find modal container
            let modal = document.querySelector('.modal-container');
            if (!modal) {
                modal = document.querySelector('.modal-overlay');
            }
            if (!modal) {
                modal = document.querySelector('.modal');
            }
            if (modal) {
                modal.dataset.subtasks = JSON.stringify([]);
            }
            
            const subtaskInput = document.getElementById('new-todo-subtask-input');
            if (subtaskInput) {
                subtaskInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addSubtaskToForm('new');
                    }
                });
            }
        }, 150);
        
        // Attach form handler after modal is rendered
        setTimeout(() => {
            const form = document.getElementById('new-todo-form');
            const titleInput = document.getElementById('todo-title');
            
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveNewTodo(e);
                });
            }
            
            if (titleInput) {
                titleInput.focus();
            }
        }, 150);
    }

    async saveNewTodo(e) {
        if (e) {
            e.preventDefault();
        }
        
        const form = document.getElementById('new-todo-form');
        const submitBtn = document.getElementById('todo-submit-btn');
        const titleInput = document.getElementById('todo-title');
        const descriptionInput = document.getElementById('todo-description');
        const prioritySelect = document.getElementById('todo-priority');
        const statusSelect = document.getElementById('todo-status');
        const dueDateInput = document.getElementById('todo-due-date');
        
        if (!titleInput || !form) {
            this.showError('Form elements not found. Please refresh the page.');
            return;
        }
        
        const title = titleInput.value.trim();
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        const priority = prioritySelect ? prioritySelect.value : 'medium';
        const status = statusSelect ? statusSelect.value : 'todo';
        
        // Handle datetime-local input - convert to ISO string
        let dueDate = null;
        if (dueDateInput && dueDateInput.value) {
            // datetime-local returns YYYY-MM-DDTHH:mm format
            dueDate = new Date(dueDateInput.value).toISOString();
        }

        // Validation
        if (!title) {
            titleInput.focus();
            titleInput.style.borderColor = '#ef4444';
            this.showError('Title is required');
            setTimeout(() => {
                titleInput.style.borderColor = '';
            }, 3000);
            return;
        }

        // Disable form during submission
        const originalText = submitBtn ? submitBtn.innerHTML : 'Create Task';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }

        try {
            const requestData = {
                title,
                description,
                priority,
                status,
                dueDate: dueDate || null,
                tab: this.activeTab !== 'all' ? this.activeTab : null
            };
            
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                let errorText = 'Failed to create task';
                try {
                    const errorData = await response.text();
                    if (errorData && errorData.trim()) {
                        errorText = errorData.trim();
                    } else {
                        errorText = `Server error: ${response.status}`;
                    }
                } catch (e) {
                    errorText = `Server error: ${response.status}`;
                }
                throw new Error(errorText);
            }

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('Invalid response from server');
            }
            
            // Validate response
            if (!result || typeof result !== 'object' || Array.isArray(result)) {
                throw new Error('Invalid response format');
            }
            
            // Save subtasks if any - try multiple selectors
            let modal = document.querySelector('.modal-container');
            if (!modal) {
                modal = document.querySelector('.modal-overlay');
            }
            if (!modal) {
                modal = document.querySelector('.modal');
            }
            if (modal && modal.dataset.subtasks) {
                try {
                    const subtasks = JSON.parse(modal.dataset.subtasks || '[]');
                    if (Array.isArray(subtasks) && subtasks.length > 0) {
                        const taskId = result.id || result.ID;
                        for (const subtask of subtasks) {
                            if (subtask.temp && subtask.title) {
                                try {
                                    const subtaskResponse = await fetch('/api/todos/subtasks', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            todoId: taskId,
                                            title: subtask.title
                                        })
                                    });
                                    if (!subtaskResponse.ok) {
                                        console.error('Failed to create subtask:', await subtaskResponse.text());
                                    }
                                } catch (error) {
                                    console.error('Error creating subtask:', error);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing subtasks:', error);
                }
            }
            
            // Show success message
            this.showSuccess('Task created successfully!');
            
            // Close modal
            if (window.modalInstance) {
                window.modalInstance.close();
            }
            
            // Clear form
            const form = document.getElementById('new-todo-form');
            if (form) {
                form.reset();
            }
            
            // Reload todos
            await this.loadTodos();
            
            // Scroll to the new task if we have an ID
            const taskId = result.id || result.ID;
            if (taskId !== undefined && taskId !== null) {
                setTimeout(() => {
                    const newTask = document.querySelector(`.todo-card[data-id="${taskId}"]`);
                    if (newTask) {
                        newTask.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        newTask.style.animation = 'pulse 0.5s ease';
                    }
                }, 300);
            }
        } catch (error) {
            // Extract error message - always ensure it's a clean string
            let errorMessage = 'Failed to create task. Please try again.';
            
            if (error) {
                if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error.message && typeof error.message === 'string') {
                    errorMessage = error.message;
                }
            }
            
            // Clean up error message
            errorMessage = errorMessage.replace(/\[object Object\]/g, '').trim();
            if (!errorMessage) {
                errorMessage = 'Failed to create task. Please try again.';
            }
            
            this.showError(errorMessage);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async editTodo(id) {
        // Ensure todos is an array
        if (!Array.isArray(this.todos)) {
            this.todos = [];
        }
        
        const todo = this.todos.find(t => t && t.id === id);
        if (!todo) {
            this.showError('Task not found');
            return;
        }

        // Load subtasks
        let subtasks = [];
        try {
            const subtasksResponse = await fetch(`/api/todos/subtasks?todo_id=${id}`);
            if (subtasksResponse.ok) {
                const subtasksData = await subtasksResponse.json();
                subtasks = Array.isArray(subtasksData) ? subtasksData.map(s => ({
                    ...s,
                    completed: s.completed === true || s.completed === 1 || s.completed === '1'
                })) : [];
            }
        } catch (error) {
            console.error('Error loading subtasks:', error);
            subtasks = [];
        }

        // Format due date for datetime-local input
        let dueDateValue = '';
        if (todo.dueDate) {
            try {
                const date = new Date(todo.dueDate);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    dueDateValue = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            } catch (e) {
                console.error('Error formatting date:', e);
            }
        }

        // Ensure subtasks is an array
        if (!Array.isArray(subtasks)) {
            subtasks = [];
        }

        const subtasksHtml = subtasks.map(subtask => {
            const completed = subtask.completed === true || subtask.completed === 1;
            return `
            <div class="todo-form-compact-subtask-item ${completed ? 'completed' : ''}" data-id="${subtask.id}">
                <label class="todo-form-compact-subtask-checkbox-wrapper">
                    <input type="checkbox" ${completed ? 'checked' : ''} 
                           onchange="todoInstance.toggleSubtaskInModal(${subtask.id}, this.checked)"
                           class="todo-form-compact-subtask-checkbox">
                    <span class="todo-form-compact-subtask-checkmark"></span>
                </label>
                <input type="text" class="todo-form-compact-subtask-text" value="${this.escapeHtml(subtask.title)}" 
                       onblur="todoInstance.updateSubtaskInModal(${subtask.id}, this.value)"
                       placeholder="Subtask title...">
                <button class="todo-form-compact-subtask-delete" onclick="todoInstance.deleteSubtaskInModal(${subtask.id}, ${id})" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        }).join('');

        const modalContent = `
            <div class="todo-modal-compact">
                <form id="edit-todo-form" class="todo-form-compact">
                    <div class="todo-form-compact-header">
                        <h3 class="todo-form-compact-title">Edit Task</h3>
                    </div>
                    
                    <div class="todo-form-compact-body">
                        <div class="todo-form-compact-row">
                            <input type="text" id="edit-todo-title" class="todo-form-compact-title-input" value="${this.escapeHtml(todo.title)}" required autofocus>
                            <select id="edit-todo-priority" class="todo-form-compact-priority">
                                <option value="low" ${todo.priority === 'low' ? 'selected' : ''}>🟢</option>
                                <option value="medium" ${todo.priority === 'medium' ? 'selected' : ''}>🟡</option>
                                <option value="high" ${todo.priority === 'high' ? 'selected' : ''}>🔴</option>
                            </select>
                        </div>
                        
                        <textarea id="edit-todo-description" class="todo-form-compact-description" rows="2">${this.escapeHtml(todo.description || '')}</textarea>
                        
                        <div class="todo-form-compact-row">
                            <input type="datetime-local" id="edit-todo-due-date" class="todo-form-compact-date" value="${dueDateValue}">
                            <select id="edit-todo-status" class="todo-form-compact-status">
                                <option value="todo" ${todo.status === 'todo' ? 'selected' : ''}>📋 To Do</option>
                                <option value="in-progress" ${todo.status === 'in-progress' ? 'selected' : ''}>⚙️ In Progress</option>
                                <option value="done" ${todo.status === 'done' ? 'selected' : ''}>✅ Done</option>
                            </select>
                        </div>
                        
                        <div class="todo-form-compact-section">
                            <div class="todo-form-compact-section-header">
                                <span class="todo-form-compact-section-title">
                                    <i class="fas fa-tasks"></i> Subtasks
                                    <span class="todo-form-compact-section-count">${subtasks.length}</span>
                                </span>
                            </div>
                            <div class="todo-form-compact-subtasks" id="edit-todo-subtasks-list">
                                ${subtasksHtml || '<p class="todo-form-compact-empty">No subtasks yet</p>'}
                            </div>
                            <div class="todo-form-compact-subtask-add">
                                <input type="text" class="todo-form-compact-subtask-input" id="edit-todo-subtask-input" placeholder="Add subtask...">
                                <button type="button" class="todo-form-compact-subtask-btn" onclick="todoInstance.addSubtaskToForm('edit', ${id})">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="todo-form-compact-actions">
                        <button type="button" class="todo-form-compact-btn todo-form-compact-btn-cancel" onclick="window.modalInstance.close()">
                            Cancel
                        </button>
                        <button type="submit" class="todo-form-compact-btn todo-form-compact-btn-submit" id="edit-todo-submit-btn">
                            <i class="fas fa-save"></i> Save
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        window.modalInstance.open('Edit Task', modalContent, [], false, false);
        
        // Store todoId and initialize subtasks array for management - find modal container
        setTimeout(() => {
            let modal = document.querySelector('.modal-container');
            if (!modal) {
                modal = document.querySelector('.modal-overlay');
            }
            if (!modal) {
                modal = document.querySelector('.modal');
            }
            if (modal) {
                modal.dataset.todoId = id;
                // Initialize subtasks array with existing subtasks (mark them as not temp)
                const existingSubtasks = subtasks.map(s => ({
                    id: s.id,
                    title: s.title,
                    completed: s.completed === true || s.completed === 1 || s.completed === '1',
                    temp: false
                }));
                modal.dataset.subtasks = JSON.stringify(existingSubtasks);
            }
        }, 150);
        
        // Attach form handler after modal is rendered
        setTimeout(() => {
            const form = document.getElementById('edit-todo-form');
            const titleInput = document.getElementById('edit-todo-title');
            
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveEditTodo(e, id);
                });
            }
            
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }

            // Handle Enter key for subtask input
            const subtaskInput = document.getElementById('edit-todo-subtask-input');
            if (subtaskInput) {
                subtaskInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.addSubtaskToForm('edit', id);
                    }
                });
            }
        }, 150);
    }

    addSubtaskToForm(mode, todoId = null) {
        const inputId = mode === 'new' ? 'new-todo-subtask-input' : 'edit-todo-subtask-input';
        const listId = mode === 'new' ? 'new-todo-subtasks-list' : 'edit-todo-subtasks-list';
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        
        if (!input || !list || !input.value.trim()) return;

        const title = input.value.trim();
        const tempId = `temp-${Date.now()}`;
        
        const subtaskHtml = `
            <div class="todo-form-compact-subtask-item" data-id="${tempId}" data-temp="true">
                <label class="todo-form-compact-subtask-checkbox-wrapper">
                    <input type="checkbox" onchange="todoInstance.toggleSubtaskInModal('${tempId}', this.checked)"
                           class="todo-form-compact-subtask-checkbox">
                    <span class="todo-form-compact-subtask-checkmark"></span>
                </label>
                <input type="text" class="todo-form-compact-subtask-text" value="${this.escapeHtml(title)}" 
                       onblur="todoInstance.updateSubtaskInModal('${tempId}', this.value)"
                       placeholder="Subtask title...">
                <button class="todo-form-compact-subtask-delete" onclick="todoInstance.deleteSubtaskInModal('${tempId}', ${todoId || 'null'})" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        if (list.querySelector('.todo-form-compact-empty')) {
            list.innerHTML = subtaskHtml;
        } else {
            list.insertAdjacentHTML('beforeend', subtaskHtml);
        }

        input.value = '';
        input.focus();

        // Store in modal data and update count - find modal container
        let modal = document.querySelector('.modal-container');
        if (!modal) {
            modal = document.querySelector('.modal-overlay');
        }
        if (!modal) {
            modal = document.querySelector('.modal');
        }
        if (modal) {
            try {
                const existing = JSON.parse(modal.dataset.subtasks || '[]');
                if (!Array.isArray(existing)) {
                    modal.dataset.subtasks = JSON.stringify([{ id: tempId, title, completed: false, temp: true }]);
                } else {
                    existing.push({ id: tempId, title, completed: false, temp: true });
                    modal.dataset.subtasks = JSON.stringify(existing);
                }
                
                // Update subtask count in UI
                const countElement = document.querySelector('.todo-form-compact-section-count');
                if (countElement) {
                    const currentCount = JSON.parse(modal.dataset.subtasks || '[]').length;
                    countElement.textContent = currentCount;
                }
            } catch (error) {
                console.error('Error storing subtask in modal:', error);
                modal.dataset.subtasks = JSON.stringify([{ id: tempId, title, completed: false, temp: true }]);
            }
        } else {
            console.warn('Modal not found when trying to store subtask');
        }
    }

    async toggleSubtaskInModal(id, completed) {
        let modal = document.querySelector('.modal-container');
        if (!modal) {
            modal = document.querySelector('.modal-overlay');
        }
        if (!modal) {
            modal = document.querySelector('.modal');
        }
        if (!modal) return;

        const subtasks = JSON.parse(modal.dataset.subtasks || '[]');
        const subtask = subtasks.find(s => String(s.id) === String(id));
        
        if (subtask) {
            // Update in modal data
            subtask.completed = completed;
            modal.dataset.subtasks = JSON.stringify(subtasks);
            
            // Update UI immediately - add/remove completed class
            const subtaskItem = document.querySelector(`.todo-form-compact-subtask-item[data-id="${id}"]`);
            if (subtaskItem) {
                if (completed) {
                    subtaskItem.classList.add('completed');
                } else {
                    subtaskItem.classList.remove('completed');
                }
            }
            
            // If it's a real subtask (not temp), also update via API
            if (!subtask.temp) {
                try {
                    const subtaskId = typeof id === 'string' ? parseInt(id) : id;
                    if (!isNaN(subtaskId)) {
                        await this.toggleSubtask(subtaskId, completed);
                    }
                } catch (error) {
                    console.error('Error toggling subtask:', error);
                    // Revert the checkbox state on error
                    const checkbox = document.querySelector(`.todo-form-compact-subtask-item[data-id="${id}"] input[type="checkbox"]`);
                    if (checkbox) {
                        checkbox.checked = !completed;
                    }
                    // Revert UI class
                    if (subtaskItem) {
                        if (completed) {
                            subtaskItem.classList.remove('completed');
                        } else {
                            subtaskItem.classList.add('completed');
                        }
                    }
                    // Revert modal data
                    subtask.completed = !completed;
                    modal.dataset.subtasks = JSON.stringify(subtasks);
                    this.showError('Failed to update subtask');
                }
            }
        } else {
            // Subtask not found in modal data - might be a real subtask, try API
            const subtaskId = typeof id === 'string' && !id.startsWith('temp-') ? parseInt(id) : (typeof id === 'number' ? id : null);
            if (subtaskId !== null && !isNaN(subtaskId)) {
                try {
                    await this.toggleSubtask(subtaskId, completed);
                } catch (error) {
                    console.error('Error toggling subtask:', error);
                    // Revert checkbox
                    const checkbox = document.querySelector(`.todo-form-compact-subtask-item[data-id="${id}"] input[type="checkbox"]`);
                    if (checkbox) {
                        checkbox.checked = !completed;
                    }
                    this.showError('Failed to update subtask');
                }
            }
        }
    }

    async updateSubtaskInModal(id, title) {
        if (!title.trim()) return;

        let modal = document.querySelector('.modal-container');
        if (!modal) {
            modal = document.querySelector('.modal-overlay');
        }
        if (!modal) {
            modal = document.querySelector('.modal');
        }
        if (!modal) return;

        const subtasks = JSON.parse(modal.dataset.subtasks || '[]');
        const subtask = subtasks.find(s => s.id == id);
        if (subtask) {
            subtask.title = title.trim();
            modal.dataset.subtasks = JSON.stringify(subtasks);
        } else if (typeof id === 'number' || !id.toString().startsWith('temp-')) {
            // Real subtask - update via API
            await this.updateSubtask(id, title);
        }
    }

    async deleteSubtaskInModal(id, todoId) {
        let modal = document.querySelector('.modal-container');
        if (!modal) {
            modal = document.querySelector('.modal-overlay');
        }
        if (!modal) {
            modal = document.querySelector('.modal');
        }
        if (!modal) return;

        const item = document.querySelector(`.todo-form-compact-subtask-item[data-id="${id}"]`);
        if (item) {
            item.remove();
            const listId = todoId ? 'edit-todo-subtasks-list' : 'new-todo-subtasks-list';
            const list = document.getElementById(listId);
            if (list && list.children.length === 0) {
                list.innerHTML = '<p class="todo-form-compact-empty">No subtasks yet</p>';
            }
        }

        if (id.toString().startsWith('temp-')) {
            // Temp subtask - just remove from modal data
            const subtasks = JSON.parse(modal.dataset.subtasks || '[]');
            const filtered = subtasks.filter(s => s.id != id);
            modal.dataset.subtasks = JSON.stringify(filtered);
        } else {
            // Real subtask - delete via API
            await this.deleteSubtask(id);
            if (todoId) {
                // Reload the edit modal
                await this.editTodo(todoId);
            }
        }
    }

    async saveEditTodo(e, id) {
        if (e) {
            e.preventDefault();
        }
        
        const form = document.getElementById('edit-todo-form');
        const submitBtn = document.getElementById('edit-todo-submit-btn');
        const titleInput = document.getElementById('edit-todo-title');
        const descriptionInput = document.getElementById('edit-todo-description');
        const prioritySelect = document.getElementById('edit-todo-priority');
        const statusSelect = document.getElementById('edit-todo-status');
        const dueDateInput = document.getElementById('edit-todo-due-date');
        
        if (!titleInput || !form) {
            this.showError('Form elements not found. Please refresh the page.');
            return;
        }
        
        // Ensure todos is an array and find the existing todo
        if (!Array.isArray(this.todos)) {
            this.todos = [];
        }
        const existingTodo = this.todos.find(t => t && t.id === id);
        if (!existingTodo) {
            this.showError('Task not found');
            return;
        }
        
        const title = titleInput.value.trim();
        const description = descriptionInput ? descriptionInput.value.trim() : '';
        const priority = prioritySelect ? prioritySelect.value : 'medium';
        const status = statusSelect ? statusSelect.value : 'todo';
        
        // Handle datetime-local input - convert to ISO string
        let dueDate = null;
        if (dueDateInput && dueDateInput.value) {
            // datetime-local returns YYYY-MM-DDTHH:mm format
            dueDate = new Date(dueDateInput.value).toISOString();
        }

        // Validation
        if (!title) {
            titleInput.focus();
            titleInput.style.borderColor = '#ef4444';
            this.showError('Title is required');
            setTimeout(() => {
                titleInput.style.borderColor = '';
            }, 3000);
            return;
        }

        // Disable form during submission
        const originalText = submitBtn ? submitBtn.innerHTML : 'Save Changes';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            // Preserve the existing tab - don't change it when editing
            const existingTab = existingTodo.tab || null;
            
            const requestData = {
                id,
                title,
                description,
                priority,
                status,
                dueDate: dueDate || null,
                tab: existingTab
            };
            
            const response = await fetch('/api/todos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                let errorText = 'Failed to update task';
                try {
                    const errorData = await response.text();
                    if (errorData && errorData.trim()) {
                        errorText = errorData.trim();
                    } else {
                        errorText = `Server error: ${response.status}`;
                    }
                } catch (e) {
                    errorText = `Server error: ${response.status}`;
                }
                throw new Error(errorText);
            }

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('Invalid response from server');
            }
            
            // Validate response
            if (!result || typeof result !== 'object' || Array.isArray(result)) {
                throw new Error('Invalid response format');
            }
            
            // Save new subtasks if any were added in the modal - try multiple selectors
            let modal = document.querySelector('.modal-container');
            if (!modal) {
                modal = document.querySelector('.modal-overlay');
            }
            if (!modal) {
                modal = document.querySelector('.modal');
            }
            if (modal && modal.dataset.subtasks) {
                try {
                    const subtasks = JSON.parse(modal.dataset.subtasks || '[]');
                    if (Array.isArray(subtasks) && subtasks.length > 0) {
                        for (const subtask of subtasks) {
                            if (subtask.temp && subtask.title) {
                                try {
                                    const subtaskResponse = await fetch('/api/todos/subtasks', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            todoId: id,
                                            title: subtask.title
                                        })
                                    });
                                    if (!subtaskResponse.ok) {
                                        console.error('Failed to create subtask:', await subtaskResponse.text());
                                    }
                                } catch (error) {
                                    console.error('Error creating subtask:', error);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error parsing subtasks:', error);
                }
            }
            
            this.showSuccess('Task updated successfully!');
            
            // Close modal
            if (window.modalInstance) {
                window.modalInstance.close();
            }
            
            // Reload todos
            await this.loadTodos();
        } catch (error) {
            // Extract error message - always ensure it's a clean string
            let errorMessage = 'Failed to update task. Please try again.';
            
            if (error) {
                if (typeof error === 'string') {
                    errorMessage = error;
                } else if (error.message && typeof error.message === 'string') {
                    errorMessage = error.message;
                }
            }
            
            // Clean up error message
            errorMessage = errorMessage.replace(/\[object Object\]/g, '').trim();
            if (!errorMessage) {
                errorMessage = 'Failed to update task. Please try again.';
            }
            
            this.showError(errorMessage);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async deleteTodo(id) {
        // Ensure todos is an array
        if (!Array.isArray(this.todos)) {
            this.todos = [];
        }
        
        const todo = this.todos.find(t => t && t.id === id);
        const todoTitle = todo ? todo.title : 'this task';
        
        const confirmed = await this.showConfirm(`Are you sure you want to delete "${todoTitle}"?`, 'Delete Task');
        if (!confirmed) return;

        const element = document.querySelector(`.todo-card[data-id="${id}"]`);
        
        try {
            // Animate removal immediately
            if (element) {
                element.style.transition = 'all 0.3s ease';
                element.style.opacity = '0';
                element.style.transform = 'scale(0.8)';
            }

            const response = await fetch(`/api/todos?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to delete task');
            }
            
            this.showSuccess('Task deleted successfully');
            await this.loadTodos();
        } catch (error) {
            console.error('Error deleting todo:', error);
            this.showError(error.message || 'Failed to delete task');
            // Restore element if deletion failed
            if (element) {
                element.style.opacity = '1';
                element.style.transform = '';
            }
        }
    }

    escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Remove existing notifications
        const existing = document.querySelector('.todo-notification');
        if (existing) existing.remove();

        // Ensure message is a string
        let messageText = '';
        if (message) {
            if (typeof message === 'string') {
                messageText = message;
            } else if (message.message) {
                messageText = String(message.message);
            } else if (message.toString && message.toString() !== '[object Object]') {
                messageText = message.toString();
            } else {
                messageText = 'An error occurred';
            }
        } else {
            messageText = 'An error occurred';
        }

        const notification = document.createElement('div');
        notification.className = 'todo-notification todo-notification-error';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${this.escapeHtml(messageText)}</span>
        `;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
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

    showSuccess(message) {
        // Remove existing notifications
        const existing = document.querySelector('.todo-notification');
        if (existing) existing.remove();

        // Ensure message is a string
        const messageText = typeof message === 'string' ? message : (message ? String(message) : 'Success');

        const notification = document.createElement('div');
        notification.className = 'todo-notification todo-notification-success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${this.escapeHtml(messageText)}</span>
        `;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}


