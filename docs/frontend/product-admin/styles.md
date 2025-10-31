# CSS Styles for Product Admin Panel

This document provides comprehensive CSS styles for the Product Admin Panel components.

## 1. Base Styles

### base.css
```css
/* Reset and Base Styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  color: #2d3748;
  background-color: #f7fafc;
}

/* Color Variables */
:root {
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  --green-50: #ecfdf5;
  --green-100: #d1fae5;
  --green-500: #10b981;
  --green-600: #059669;
  
  --red-50: #fef2f2;
  --red-100: #fee2e2;
  --red-500: #ef4444;
  --red-600: #dc2626;
  
  --yellow-50: #fffbeb;
  --yellow-100: #fef3c7;
  --yellow-500: #f59e0b;
  --yellow-600: #d97706;
  
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  
  --radius-sm: 0.25rem;
  --radius: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}

/* Button Base Styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-600);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-700);
}

.btn-secondary {
  background-color: transparent;
  color: var(--gray-700);
  border-color: var(--gray-300);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--gray-50);
}

.btn-danger {
  background-color: var(--red-600);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: var(--red-700);
}

/* Form Base Styles */
.form-input,
.form-select,
.form-textarea {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--gray-900);
  background-color: white;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
}

.form-input.error,
.form-select.error,
.form-textarea.error {
  border-color: var(--red-500);
}

/* Loading Spinner */
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-200);
  border-radius: 50%;
  border-top-color: var(--primary-600);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Badge Styles */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
}

.badge-success {
  background-color: var(--green-100);
  color: var(--green-600);
}

.badge-warning {
  background-color: var(--yellow-100);
  color: var(--yellow-600);
}

.badge-danger {
  background-color: var(--red-100);
  color: var(--red-600);
}

.badge-info {
  background-color: var(--blue-100);
  color: var(--blue-600);
}

.badge-secondary {
  background-color: var(--gray-100);
  color: var(--gray-600);
}
```

## 2. Product List Styles

### product-list.css
```css
.product-list {
  padding: 1.5rem;
  max-width: 100%;
  overflow-x: auto;
}

.product-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.product-list-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--gray-900);
}

/* Filters */
.product-filters {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.search-bar {
  margin-bottom: 1rem;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
}

.search-input {
  padding-left: 2.5rem !important;
}

.filter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-label {
  font-weight: 500;
  color: var(--gray-700);
}

.filter-select {
  min-width: 120px;
  padding: 0.5rem 0.75rem;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--gray-100);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  color: var(--gray-600);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.clear-filters-btn:hover {
  background-color: var(--gray-200);
}

.results-count {
  font-size: 0.875rem;
  color: var(--gray-600);
}

/* Bulk Actions */
.bulk-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--blue-50);
  border: 1px solid var(--blue-200);
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.bulk-actions-info {
  font-size: 0.875rem;
  color: var(--blue-700);
  font-weight: 500;
}

.bulk-actions-dropdown {
  position: relative;
}

.bulk-actions-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: white;
  border: 1px solid var(--blue-300);
  border-radius: var(--radius);
  color: var(--blue-700);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.bulk-actions-trigger:hover:not(:disabled) {
  background-color: var(--blue-50);
}

.bulk-actions-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 50;
  min-width: 150px;
  margin-top: 0.25rem;
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.bulk-action-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background-color: transparent;
  border: none;
  color: var(--gray-700);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.bulk-action-item:hover:not(:disabled) {
  background-color: var(--gray-50);
}

.bulk-action-item.dangerous {
  color: var(--red-600);
}

.bulk-action-item.dangerous:hover:not(:disabled) {
  background-color: var(--red-50);
}

.bulk-actions-loading {
  font-size: 0.875rem;
  color: var(--blue-600);
}
```

## 3. Product Table Styles

### product-table.css
```css
.product-table-container {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  overflow-x: auto;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 1200px;
}

.product-table th {
  background-color: var(--gray-50);
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--gray-700);
  border-bottom: 1px solid var(--gray-200);
  white-space: nowrap;
}

.product-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease-in-out;
}

.product-table th.sortable:hover {
  background-color: var(--gray-100);
}

.product-table th.checkbox-column {
  width: 40px;
  text-align: center;
}

.product-table th.actions-column {
  width: 60px;
  text-align: center;
}

.product-table td {
  padding: 1rem 0.75rem;
  border-bottom: 1px solid var(--gray-100);
  vertical-align: top;
}

.product-row {
  transition: background-color 0.15s ease-in-out;
}

.product-row:hover {
  background-color: var(--gray-50);
}

.product-row.selected {
  background-color: var(--blue-50);
}

.product-row.deleted {
  opacity: 0.6;
  background-color: var(--red-50);
}

/* Product Cell */
.product-cell {
  min-width: 280px;
}

.product-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.product-thumbnail {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
  flex-shrink: 0;
}

.product-details {
  flex: 1;
  min-width: 0;
}

.product-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--gray-900);
  line-height: 1.25;
  margin-bottom: 0.25rem;
}

.featured-icon {
  color: var(--yellow-500);
}

.sale-badge {
  padding: 0.125rem 0.375rem;
  background-color: var(--red-100);
  color: var(--red-600);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
}

.product-meta {
  font-size: 0.75rem;
  color: var(--gray-500);
}

/* SKU */
.sku {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: var(--gray-100);
  border-radius: var(--radius-sm);
  color: var(--gray-700);
}

/* Price Cell */
.price-cell {
  min-width: 120px;
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.base-price {
  font-weight: 600;
  color: var(--gray-900);
}

.compare-price {
  font-size: 0.75rem;
  color: var(--gray-500);
  text-decoration: line-through;
}

/* Stock Info */
.stock-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stock-numbers {
  font-size: 0.75rem;
  color: var(--gray-500);
}

/* Links */
.category-link,
.brand-link {
  color: var(--primary-600);
  text-decoration: none;
  cursor: pointer;
}

.category-link:hover,
.brand-link:hover {
  text-decoration: underline;
}

/* Date Info */
.date-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
}

.created-by {
  font-size: 0.75rem;
  color: var(--gray-500);
}

/* Actions */
.actions-cell {
  text-align: center;
}

.actions-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  color: var(--gray-500);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.actions-trigger:hover {
  background-color: var(--gray-100);
  color: var(--gray-700);
}

/* Loading and Empty States */
.loading-cell,
.empty-cell {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--gray-500);
}

/* Status Badges */
.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-published {
  background-color: var(--green-100);
  color: var(--green-600);
}

.status-draft {
  background-color: var(--yellow-100);
  color: var(--yellow-600);
}

.status-archived {
  background-color: var(--gray-100);
  color: var(--gray-600);
}

/* Stock Status Badges */
.stock-badge {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.stock-in-stock {
  background-color: var(--green-100);
  color: var(--green-600);
}

.stock-low-stock {
  background-color: var(--yellow-100);
  color: var(--yellow-600);
}

.stock-out-of-stock {
  background-color: var(--red-100);
  color: var(--red-600);
}
```

## 4. Product Form Styles

### product-form.css
```css
.product-form {
  background-color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--gray-200);
  background-color: var(--gray-50);
}

.form-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--gray-900);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary-100);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-700);
}

.form-field .error-message {
  font-size: 0.75rem;
  color: var(--red-600);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--gray-700);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary-600);
}

.save-reminder {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--yellow-100);
  border: 1px solid var(--yellow-300);
  border-radius: var(--radius);
  color: var(--yellow-700);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: var(--shadow-md);
  z-index: 50;
}

/* Rich Text Editor */
.rich-text-editor {
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  overflow: hidden;
}

.rich-text-editor.focused {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
}

.rich-text-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  background-color: var(--gray-50);
  border-bottom: 1px solid var(--gray-200);
}

.rich-text-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--gray-600);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.rich-text-button:hover {
  background-color: var(--gray-200);
  color: var(--gray-800);
}

.rich-text-button.active {
  background-color: var(--primary-100);
  color: var(--primary-700);
  border-color: var(--primary-200);
}

.rich-text-content {
  min-height: 150px;
  padding: 0.75rem;
  outline: none;
  line-height: 1.6;
}

/* Image Upload */
.image-upload {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
  border: 2px dashed var(--gray-300);
  border-radius: var(--radius);
  background-color: var(--gray-50);
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.image-upload-area:hover {
  border-color: var(--primary-400);
  background-color: var(--primary-50);
}

.image-upload-area.drag-over {
  border-color: var(--primary-500);
  background-color: var(--primary-100);
}

.image-upload-icon {
  color: var(--gray-400);
  margin-bottom: 1rem;
}

.image-upload-text {
  text-align: center;
  color: var(--gray-600);
}

.image-upload-hint {
  font-size: 0.75rem;
  color: var(--gray-500);
  margin-top: 0.5rem;
}

.image-preview {
  position: relative;
  max-width: 300px;
}

.image-preview img {
  width: 100%;
  height: auto;
  border-radius: var(--radius);
}

.image-remove {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: var(--red-600);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.image-remove:hover {
  background-color: var(--red-700);
}
```

## 5. Search Styles

### product-search.css
```css
.product-search {
  position: relative;
  max-width: 400px;
}

.search-input-container {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  padding-right: 2.5rem;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 0.875rem;
  background-color: white;
  transition: all 0.15s ease-in-out;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
}

.clear-button {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: transparent;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  transition: color 0.15s ease-in-out;
}

.clear-button:hover {
  color: var(--gray-600);
}

.search-spinner {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: 2px solid var(--gray-200);
  border-radius: 50%;
  border-top-color: var(--primary-600);
  animation: spin 1s ease-in-out infinite;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 0.25rem;
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  max-height: 400px;
  overflow-y: auto;
}

.results-list {
  padding: 0.5rem;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.search-result-item:hover {
  background-color: var(--gray-50);
}

.result-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--gray-200);
  flex-shrink: 0;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-weight: 500;
  color: var(--gray-900);
  line-height: 1.25;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--gray-500);
  margin-bottom: 0.25rem;
}

.result-sku {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  padding: 0.125rem 0.25rem;
  background-color: var(--gray-100);
  border-radius: var(--radius-sm);
}

.result-price {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-900);
}

.result-status {
  flex-shrink: 0;
}

.no-results,
.search-prompt {
  padding: 2rem;
  text-align: center;
  color: var(--gray-500);
}

.no-results p,
.search-prompt p {
  margin: 0;
}
```

## 6. Statistics Styles

### product-statistics.css
```css
.product-statistics {
  padding: 1.5rem;
}

.product-statistics h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-card.variant-success {
  border-left: 4px solid var(--green-500);
}

.stat-card.variant-warning {
  border-left: 4px solid var(--yellow-500);
}

.stat-card.variant-danger {
  border-left: 4px solid var(--red-500);
}

.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.stat-card-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-card-icon {
  color: var(--gray-400);
}

.stat-card-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--gray-900);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.stat-percentage {
  color: var(--gray-500);
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
}

.stat-trend.up {
  color: var(--green-600);
}

.stat-trend.down {
  color: var(--red-600);
}

.stat-trend.neutral {
  color: var(--gray-500);
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card,
.top-list-card {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.chart-card h3,
.top-list-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 1rem;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.top-list-item {
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--gray-50);
  border-radius: var(--radius);
}

.item-name {
  font-weight: 500;
  color: var(--gray-900);
  flex: 1;
}

.item-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item-count {
  font-weight: 600;
  color: var(--gray-700);
}

.item-percentage {
  font-size: 0.75rem;
  color: var(--gray-500);
}

.financial-overview {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.financial-overview h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: 1rem;
}

.financial-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.financial-stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--gray-600);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
}
```

## 7. Responsive Styles

### responsive.css
```css
/* Tablet Styles */
@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .financial-stats {
    grid-template-columns: 1fr;
  }
  
  .product-table {
    min-width: 800px;
  }
}

/* Mobile Styles */
@media (max-width: 768px) {
  .product-list {
    padding: 1rem;
  }
  
  .product-list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-group {
    width: 100%;
    justify-content: flex-start;
  }
  
  .filter-select {
    min-width: 100px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    padding: 1rem;
  }
  
  .form-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .form-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .bulk-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .search-results {
    left: -1rem;
    right: -1rem;
  }
  
  .product-table-container {
    margin: 0 -1rem;
  }
}

/* Small Mobile Styles */
@media (max-width: 480px) {
  .product-filters {
    padding: 1rem;
  }
  
  .search-input-wrapper {
    max-width: none;
  }
  
  .product-info {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .product-thumbnail {
    width: 100%;
    height: auto;
    max-width: 120px;
  }
  
  .btn {
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-card-value {
    font-size: 1.5rem;
  }
  
  .form-section {
    gap: 1rem;
  }
  
  .save-reminder {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }
}

/* Print Styles */
@media print {
  .product-filters,
  .bulk-actions,
  .form-actions,
  .actions-cell,
  .save-reminder {
    display: none !important;
  }
  
  .product-table-container,
  .stat-card,
  .chart-card,
  .top-list-card {
    box-shadow: none !important;
    border: 1px solid #000 !important;
  }
  
  .product-row:hover {
    background-color: transparent !important;
  }
  
  body {
    background-color: white !important;
  }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
  :root {
    --gray-50: #1f2937;
    --gray-100: #374151;
    --gray-200: #4b5563;
    --gray-300: #6b7280;
    --gray-400: #9ca3af;
    --gray-500: #d1d5db;
    --gray-600: #e5e7eb;
    --gray-700: #f3f4f6;
    --gray-800: #f9fafb;
    --gray-900: #ffffff;
  }
  
  body {
    background-color: #111827;
    color: #f9fafb;
  }
  
  .form-input,
  .form-select,
  .form-textarea {
    background-color: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  
  .product-table-container,
  .stat-card,
  .chart-card,
  .top-list-card,
  .product-filters {
    background-color: #1f2937;
    border-color: #374151;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .loading-spinner {
    animation: none;
  }
}

/* High Contrast */
@media (prefers-contrast: high) {
  .badge,
  .status-badge,
  .stock-badge {
    border: 1px solid currentColor;
  }
  
  .btn {
    border: 2px solid currentColor;
  }
  
  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: 3px solid currentColor;
    outline-offset: 2px;
  }
}
```

These CSS styles provide a comprehensive, accessible, and responsive design system for the Product Admin Panel. The styles include:

1. **Modern Design System** with consistent spacing, colors, and typography
2. **Responsive Layout** that works on all device sizes
3. **Accessibility Features** including focus states, high contrast support, and reduced motion
4. **Dark Mode Support** for users who prefer dark themes
5. **Print Styles** for generating reports
6. **Component-Specific Styles** for all UI components
7. **Interactive States** with hover, focus, and active states
8. **Loading States** and error handling visual feedback