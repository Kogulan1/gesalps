# Features for Later Implementation

This document outlines features that were removed from the Overview page to keep it focused on essential actions, but are planned for future implementation.

## Overview Page Simplification

The Overview page has been streamlined to focus on the most essential actions for project management. The following features have been moved or are planned for later implementation:

## 1. Download Feature
**Current Status:** Removed from Overview page  
**Planned Location:** Project Details page, Runs page, Datasets page  
**Purpose:** Allow users to export various project-related artifacts

### Use Cases:
- **Raw Dataset Export:** Download original uploaded datasets in CSV/Excel format
- **Synthetic Dataset Export:** Download generated synthetic data with metadata
- **Run Reports:** Export detailed synthesis reports including privacy metrics, quality scores, and generation parameters
- **Project Archive:** Download complete project data including all datasets, runs, and configurations
- **API Integration:** Provide programmatic access to data via REST API endpoints

### Implementation Notes:
- Should include format options (CSV, Excel, JSON, Parquet)
- Should support bulk downloads for multiple datasets/runs
- Should include data lineage and metadata in exports
- Should respect user permissions and data access controls

## 2. Project Settings
**Current Status:** Removed from Overview page  
**Planned Location:** Dedicated Project Settings page  
**Purpose:** Provide granular control over project configurations

### Use Cases:
- **Access Permissions:** Manage team member access levels (view, edit, admin)
- **Advanced Synthesis Parameters:** Configure default privacy levels, quality thresholds, and method preferences
- **Data Retention Policies:** Set automatic cleanup rules for old runs and datasets
- **Integration Settings:** Configure connections to external systems (databases, cloud storage, APIs)
- **Notification Preferences:** Set up alerts for run completion, errors, or quota limits
- **Project Metadata:** Manage project descriptions, tags, and categorization

### Implementation Notes:
- Should include role-based access control (RBAC)
- Should support project templates for common configurations
- Should include audit logging for configuration changes
- Should integrate with enterprise SSO systems

## 3. Archive Feature
**Current Status:** Removed from Overview page  
**Planned Location:** Project Management section or dedicated Archive page  
**Purpose:** Project lifecycle management without permanent deletion

### Use Cases:
- **Project Cleanup:** Move inactive projects out of the main view while preserving data
- **Temporary Suspension:** Pause projects without losing configuration or data
- **Compliance Requirements:** Meet data retention policies while reducing active project clutter
- **Cost Management:** Reduce active project count for billing purposes
- **Project Restoration:** Restore archived projects when needed

### Implementation Notes:
- Should include bulk archive operations
- Should preserve all project data and configurations
- Should include archive date and reason tracking
- Should support automatic archiving based on inactivity rules
- Should include search and filter capabilities for archived projects

## 4. Advanced Search & Filtering
**Current Status:** Basic search in header, removed from Overview page  
**Planned Location:** Enhanced search across all pages  
**Purpose:** Provide powerful search and filtering capabilities

### Use Cases:
- **Cross-Project Search:** Find datasets, runs, or configurations across multiple projects
- **Advanced Filters:** Filter by date ranges, status, privacy levels, data types, etc.
- **Saved Searches:** Create and save frequently used search queries
- **Search History:** Track and reuse previous search queries
- **Full-Text Search:** Search within dataset contents, run descriptions, and project metadata

### Implementation Notes:
- Should include Elasticsearch or similar search engine
- Should support faceted search with multiple filter combinations
- Should include search result highlighting and relevance scoring
- Should support search analytics and usage tracking

## 5. Bulk Operations
**Current Status:** Not implemented  
**Planned Location:** All list views (Projects, Datasets, Runs)  
**Purpose:** Enable efficient management of multiple items

### Use Cases:
- **Bulk Delete:** Remove multiple projects, datasets, or runs at once
- **Bulk Archive:** Archive multiple projects simultaneously
- **Bulk Export:** Download multiple datasets or run reports together
- **Bulk Status Updates:** Change status or settings for multiple items
- **Bulk Tagging:** Apply tags or categories to multiple items

### Implementation Notes:
- Should include selection checkboxes and "Select All" functionality
- Should show progress indicators for long-running operations
- Should include confirmation dialogs for destructive operations
- Should support undo functionality where possible

## 6. Project Templates
**Current Status:** Not implemented  
**Planned Location:** Project creation flow  
**Purpose:** Accelerate project setup with pre-configured templates

### Use Cases:
- **Industry Templates:** Pre-configured projects for healthcare, finance, research, etc.
- **Method Templates:** Templates optimized for specific synthesis methods (GAN, VAE, etc.)
- **Privacy Templates:** Templates with pre-set privacy levels and compliance settings
- **Custom Templates:** User-created templates for recurring project types

### Implementation Notes:
- Should include template marketplace or sharing system
- Should support template versioning and updates
- Should include template preview and customization options
- Should integrate with project cloning functionality

## Implementation Priority

1. **High Priority:** Download feature, Project Settings
2. **Medium Priority:** Archive feature, Advanced Search
3. **Low Priority:** Bulk Operations, Project Templates

## Technical Considerations

- All features should maintain the current authentication and authorization system
- Features should be designed with scalability in mind for enterprise users
- UI/UX should remain consistent with the current design system
- Features should include proper error handling and user feedback
- All operations should be logged for audit purposes
