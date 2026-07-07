# API Contract — Employee Task CRM & Reporting System

Base URL (dev): `http://localhost:5000/api`
All protected routes require header: `Authorization: Bearer <accessToken>`

## Roles
`superadmin`, `employee`

## Auth
- POST `/auth/login` { email, password, rememberMe } -> { accessToken, refreshToken, user }
- POST `/auth/refresh` { refreshToken } -> { accessToken }
- POST `/auth/logout` { refreshToken } -> 204
- POST `/auth/forgot-password` { email } -> sends email with reset link
- POST `/auth/reset-password/:token` { password } -> 200
- POST `/auth/change-password` { oldPassword, newPassword } (auth) -> 200
- GET `/auth/me` (auth) -> user profile

## Users / Employees (superadmin only unless noted)
- GET `/users` ?page&limit&search&department&team&status&role
- POST `/users` (create employee) { name, email, password, phone, department, designation, manager, joiningDate, role }
- GET `/users/:id`
- PUT `/users/:id`
- DELETE `/users/:id`
- PATCH `/users/:id/status` { isActive }
- PATCH `/users/:id/reset-password` { newPassword }
- PATCH `/users/:id/assign` { department, team, manager }
- GET `/users/:id/performance`
- PUT `/users/me/profile` (self, any role) { name, phone, profilePhoto }

## Departments
- GET/POST `/departments`
- PUT/DELETE `/departments/:id`

## Teams
- GET/POST `/teams`
- PUT/DELETE `/teams/:id`

## Projects
- GET/POST `/projects`
- PUT/DELETE `/projects/:id`

## Clients
- GET/POST `/clients`
- PUT/DELETE `/clients/:id`

## Task Categories
- GET/POST `/task-categories`
- PUT/DELETE `/task-categories/:id`

## Tasks
- GET `/tasks` ?page&limit&search&status&priority&project&department&employee&dateFrom&dateTo&sortBy&sortOrder
  (employee role auto-scoped to own tasks; superadmin sees all / can filter by employee)
- POST `/tasks` (multipart/form-data for attachments) { title, description, project, client, department, priority, taskType, startTime, endTime, taskDate, expectedCompletion, status, remarks, githubLink, taskUrl, notes }
- GET `/tasks/:id`
- PUT `/tasks/:id`
- DELETE `/tasks/:id`
- PATCH `/tasks/:id/status` { status }
- POST `/tasks/:id/duplicate`
- POST `/tasks/bulk-update` { ids: [], update: {} }
- POST `/tasks/bulk-delete` { ids: [] }
- GET `/tasks/copy-previous` -> returns yesterday's tasks for prefill

## Dashboard
- GET `/dashboard/admin` -> cards + recent activity summary
- GET `/dashboard/employee` -> cards for logged-in employee

## Analytics
- GET `/analytics/productivity?range=daily|weekly|monthly`
- GET `/analytics/department-performance`
- GET `/analytics/employee-performance`
- GET `/analytics/top-performers`
- GET `/analytics/completion-trend`

## Reports
- GET `/reports/pdf` ?type=employee|department|project|status|manager&employeeId&dateFrom&dateTo -> PDF stream
- GET `/reports/excel` ?...same filters -> xlsx stream
- GET `/reports/csv` ?...same filters -> csv stream

## Notifications
- GET `/notifications` (own, paginated)
- PATCH `/notifications/:id/read`
- PATCH `/notifications/read-all`
- DELETE `/notifications/:id`
- Socket.io event: `notification:new` pushed to room `user:<id>`

## Activity Logs (superadmin)
- GET `/activity-logs` ?page&limit&user&action&dateFrom&dateTo

## Attendance
- POST `/attendance/clock-in`
- POST `/attendance/clock-out`
- GET `/attendance/me?month=`
- GET `/attendance` (superadmin, all employees, filters)

## Holidays / Calendar
- GET/POST `/holidays`
- DELETE `/holidays/:id`
- GET `/calendar?month=&year=` -> merges task deadlines + holidays

## Settings (superadmin)
- GET `/settings`
- PUT `/settings` { companyName, logo, timezone, dateFormat, workingDays, officeHours, theme }

## Common response envelope
Success: `{ success: true, data, meta? }`
Error: `{ success: false, message, errors? }`

## Users model key fields
employeeId, name, email, phone, passwordHash, role, department(ref), team(ref), designation, manager(ref User), joiningDate, profilePhoto, isActive, lastLogin

## Task model key fields
title, description, project(ref), client(ref), department(ref), assignedTo(ref User), priority[low,medium,high,urgent], taskType[development,bugfix,meeting,testing,research,design,support,deployment,documentation,training,other], startTime, endTime, totalHours, taskDate, expectedCompletion, actualCompletion, status[pending,in-progress,completed,hold,cancelled], remarks, attachments[{url,type,name}], githubLink, taskUrl, notes, isArchived
