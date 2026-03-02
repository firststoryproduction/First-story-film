
# 📘 ACTIVITY LOG MODULE
## (Developer Technical Specification + AI Prompt Template)

---

# 1. Module Overview

The Activity Log Module is a reusable system component designed to record and monitor all important user activities performed within the application.

It ensures:

- Accountability
- Transparency
- User action tracking
- Internal auditing capability
- System monitoring

This module acts as the centralized System Activity Tracking Engine for any admin-based system.

---

# 2. Core Purpose

The module must capture:

- Who performed the action
- What action was performed
- When it was performed
- On which record it was performed
- The result of the action (Success / Failed)

Optional (recommended minimal enhancement):

- Old value snapshot
- New value snapshot

---

# 3. Log Record Structure

Each activity log entry must contain the following fields:

Required Fields:

- id
- user_id
- user_name (snapshot at time of action)
- action_type (Create / Update / Delete / Login / Logout)
- module_name (string reference)
- record_id (affected record ID)
- description (human-readable summary)
- status (Success / Failed)
- ip_address (optional but recommended)
- created_at (timestamp)

---

# 4. Setup & Operation

## 4.1 Automatic Logging

Logs must be generated automatically at backend level when:

- A record is created
- A record is updated
- A record is deleted
- A user logs in
- A user logs out

Logging must not depend on frontend execution.

---

## 4.2 Logging Rules

- Logging must occur after successful operation.
- Failed operations may also be logged (recommended).
- Logging must not interrupt primary system operations.

---

# 5. Access Control

Only authorized users can:

- View activity logs
- Export logs
- Delete logs

The module should support:

- View-only permission
- Full control (View + Export + Delete)

Delete permission must be restricted to high-level users.

---

# 6. UI Design – Table List View

The Activity Log module must use a structured table-based interface.

---

## 6.1 Table Columns

The table must display:

- Date & Time
- User Name
- Action Type
- Module Name
- Record ID
- Description
- Status
- IP Address (optional)

---

## 6.2 Table Features

The table must support:

- Pagination
- Column sorting
- Adjustable page size
- Responsive layout

---

# 7. Search & Filter Requirements

The module must support filtering by:

- Date Range (From Date – To Date) [Mandatory]
- User
- Action Type
- Module Name
- Status (Success / Failed)
- Global keyword search

All filters must work together (multi-filter support).

---

# 8. Export Functionality

The module must support exporting filtered results.

Supported formats:

- PDF
- Excel
- CSV

Export must strictly respect applied filters.

Example:
If user applies date range filter → exported file must contain only filtered records.

---

# 9. Delete Log Functionality

## 9.1 Delete by Date Range

Authorized users must be able to:

- Select From Date
- Select To Date
- Delete all logs within selected range

---

## 9.2 Safety Rules

- System must show confirmation before deletion.
- Deletion is irreversible.
- Log deletion action must itself be logged.
- Date range is mandatory before deletion.

---

# 10. Performance & Data Handling

To handle high log volume:

- Use pagination
- Index date field for fast filtering
- Avoid loading entire dataset at once
- Optimize queries for date-based filtering
- Support large dataset export handling

---

# 11. Minimum Required Features (Current Version)

The initial implementation must include:

- Automatic backend logging
- Log table list view
- Date range filter
- User filter
- Action type filter
- Status filter
- Export (PDF / Excel / CSV)
- Delete logs by date range
- Access restriction

No advanced workflow required at this stage.

---

# 12. AI Implementation Prompt Template

PROMPT START

Create a reusable Activity Log Module with:

1. Automatic backend logging for Create, Update, Delete, Login, Logout.
2. Log structure including user, action, module, record ID, description, status, timestamp.
3. Table-based UI with pagination and sorting.
4. Filtering by date range (mandatory), user, action type, module, status.
5. Export functionality (PDF, Excel, CSV) that respects filters.
6. Delete logs by date range with confirmation and safety rules.
7. Backend validation for access control.

Generate:

- Data model
- Logging middleware logic
- API endpoints
- Filtering logic
- Export handling
- Delete-by-date-range logic

Ensure production-ready modular architecture.

PROMPT END

---

# Final Summary

This Activity Log Module provides:

- Automatic Activity Tracking
- Structured Log Storage
- Filterable Log View
- Export Capability
- Controlled Log Deletion
- Backend-Enforced Security

This module serves as the centralized System Activity Tracking Engine for any admin system.
