const employeeFields = [
  { name: "employeeCode", label: "Employee code", placeholder: "EMP-001" },
  { name: "firstName", label: "First name", placeholder: "First name" },
  { name: "lastName", label: "Last name", placeholder: "Last name" },
  { name: "email", label: "Work email", type: "email", placeholder: "name@company.com" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+92…", required: false },
  { name: "departmentId", label: "Department", optionsKey: "departments" },
  { name: "designationId", label: "Designation", optionsKey: "designations" },
  { name: "joinDate", label: "Joining date", type: "date" },
  { name: "basicSalary", label: "Basic salary (PKR)", type: "number", placeholder: "0" },
];

const employeeEditFields = [...employeeFields, { name: "status", label: "Employment status", options: [{ value: "active", label: "Active" }, { value: "probation", label: "Probation" }, { value: "left", label: "Left" }] }, { name: "endDate", label: "Last working day", type: "date", required: false }];

const leaveFields = [
  { name: "type", label: "Leave type", optionsKey: "leaveTypes" },
  { name: "startDate", label: "From", type: "date" },
  { name: "endDate", label: "To", type: "date" },
  { name: "reason", label: "Reason", placeholder: "A short reason for your request" },
];

export const moduleDefinitions = {
  admin: {
    "organization/settings": { title: "Company settings", description: "Office hours, weekend, location and attendance rules configured by your Admin.", endpoint: "/organization/settings", kind: "settings", method: "PATCH", fields: [
      { name: "companyName", label: "Company name" }, { name: "officeStart", label: "Office start time", type: "time" }, { name: "officeEnd", label: "Office end time", type: "time" }, { name: "graceMinutes", label: "Grace period (minutes)", type: "number" }, { name: "halfDayHours", label: "Half-day threshold (hours)", type: "number" }, { name: "weekendDays", label: "Weekend days (0=Sun … 6=Sat)", placeholder: "Example: 0,6" }, { name: "officeLatitude", label: "Office latitude", type: "number", required: false }, { name: "officeLongitude", label: "Office longitude", type: "number", required: false }, { name: "officeRadiusMeters", label: "Office radius (meters)", type: "number", required: false },
    ] },
    "organization/departments": { title: "Departments", description: "Create departments used by employee records and reports.", endpoint: "/organization/departments", kind: "collection", fields: [{ name: "name", label: "Department name" }, { name: "code", label: "Department code", required: false }, { name: "description", label: "Description", required: false }] },
    "organization/designations": { title: "Designations", description: "Maintain the company’s job titles.", endpoint: "/organization/designations", kind: "collection", fields: [{ name: "name", label: "Designation" }, { name: "departmentId", label: "Department", optionsKey: "departments", required: false }] },
    "organization/leave-types": { title: "Leave types and quotas", description: "Configure leave types and yearly quotas. The server applies policy rules.", endpoint: "/organization/leave-types", kind: "collection", fields: [{ name: "name", label: "Leave type" }, { name: "annualQuota", label: "Yearly quota (days)", type: "number", required: false }, { name: "isPaid", label: "Paid leave", options: [{ value: "true", label: "Paid" }, { value: "false", label: "Unpaid" }], required: false }] },
    "organization/holidays": { title: "Public holidays", description: "Add company holidays used by attendance and leave calculations.", endpoint: "/organization/holidays", kind: "collection", fields: [{ name: "name", label: "Holiday name" }, { name: "date", label: "Date", type: "date" }, { name: "description", label: "Description", required: false }] },
    "organization/users": { title: "User access", description: "Create HR accounts and manage account status. Employee logins are created with employee registration.", endpoint: "/organization/users", kind: "users", fields: [{ name: "name", label: "Full name" }, { name: "email", label: "Work email", type: "email" }, { name: "role", label: "Role", options: [{ value: "hr", label: "HR" }] }] },
    employees: { title: "Employee directory", description: "View company employees and their job details.", endpoint: "/employees", kind: "employees", columns: ["employeeCode", "firstName", "lastName", "email", "departmentName", "designationName", "status"] },
    attendance: { title: "Attendance overview", description: "Company-wide attendance records returned by the server.", endpoint: "/attendance", kind: "attendance-admin", columns: ["date", "employeeName", "departmentName", "checkIn", "checkOut", "workedMinutes", "status"] },
    leave: { title: "Leave overview", description: "Company leave requests and their current decisions.", endpoint: "/leave/requests", kind: "collection", columns: ["employeeName", "type", "startDate", "endDate", "days", "status"] },
    payroll: { title: "Payroll finalization", description: "Review payroll runs prepared by HR. Finalizing locks the run.", endpoint: "/payroll/runs", kind: "payroll-admin", columns: ["period", "employeeCount", "grossTotal", "netTotal", "status"] },
    analytics: { title: "Company analytics", description: "Company metrics computed from records by the backend.", endpoint: "/dashboards/admin", kind: "analytics" },
    announcements: { title: "Announcements", description: "Share a company update with employees.", endpoint: "/announcements", kind: "collection", fields: [{ name: "title", label: "Announcement title" }, { name: "body", label: "Message" }, { name: "audience", label: "Audience (company, HR, or employee)" }] },
    notifications: { title: "Notifications", description: "Your account’s in-app updates.", endpoint: "/notifications", kind: "notifications", columns: ["title", "message", "createdAt", "readAt"] },
    audit: { title: "Audit log", description: "Read-only record of important company actions.", endpoint: "/audit", kind: "collection", columns: ["createdAt", "actorName", "action", "entity", "entityId"] },
    assistant: { title: "AI assistant", description: "Ask a question about company data or policy. Answers follow your role’s access scope.", endpoint: "/ai/chat", kind: "assistant" },
  },
  hr: {
    employees: { title: "Employee directory", description: "Search, review and register employees. Registration creates their login.", endpoint: "/employees", kind: "employees", method: "POST", fields: employeeFields, editFields: employeeEditFields, columns: ["employeeCode", "firstName", "lastName", "email", "departmentName", "designationName", "status"], search: true },
    attendance: { title: "Daily attendance", description: "Review attendance records and decide on correction requests with a comment.", endpoint: "/attendance", kind: "attendance-hr", columns: ["date", "employeeName", "departmentName", "checkIn", "checkOut", "workedMinutes", "status"] },
    leave: { title: "Leave inbox", description: "Review requests and add a comment when approving or rejecting.", endpoint: "/leave/requests", kind: "leave-hr", columns: ["employeeName", "type", "startDate", "endDate", "days", "status"] },
    payroll: { title: "Payroll drafts", description: "Create and review a monthly draft", endpoint: "/payroll/runs", kind: "payroll-hr", method: "POST", fields: [{ name: "period", label: "Payroll month", type: "month" }], columns: ["period", "employeeCount", "grossTotal", "netTotal", "status"] },
    analytics: { title: "HR analytics", description: "People metrics computed by the backend from current records.", endpoint: "/dashboards/hr", kind: "analytics" },
    announcements: { title: "Announcements", description: "Post an update for the company or a specific audience.", endpoint: "/announcements", kind: "collection", fields: [{ name: "title", label: "Announcement title" }, { name: "body", label: "Message" }, { name: "audience", label: "Audience (company, HR, or employee)" }] },
    notifications: { title: "Notifications", description: "Your account’s in-app updates.", endpoint: "/notifications", kind: "notifications", columns: ["title", "message", "createdAt", "readAt"] },
    assistant: { title: "AI assistant", description: "Ask about HR records and company policy. Answers are scoped to HR access.", endpoint: "/ai/chat", kind: "assistant" },
  },
  employee: {
    attendance: { title: "My attendance", description: "Check in or out, review your calendar and request a correction with a reason.", endpoint: "/attendance", kind: "attendance-employee", columns: ["date", "checkIn", "checkOut", "workedMinutes", "status"], fields: [{ name: "date", label: "Attendance date", type: "date" }, { name: "requestedCheckIn", label: "Requested check-in time", type: "time", required: false }, { name: "requestedCheckOut", label: "Requested check-out time", type: "time", required: false }, { name: "reason", label: "Reason for correction" }], submitPath: "/attendance/corrections" },
    leave: { title: "My leave", description: "View your balance and history, or request leave. The server checks eligibility and dates.", endpoint: "/leave/requests", kind: "leave-employee", method: "POST", fields: leaveFields, columns: ["type", "startDate", "endDate", "days", "status"] },
    payslips: { title: "My payslips", description: "View and download payslips available to your account.", endpoint: "/payroll/payslips", kind: "payslips", columns: ["period", "gross", "deduction", "tax", "net", "createdAt"] },
    profile: { title: "My profile", description: "Update your own phone and address. Other profile fields are managed by HR.", endpoint: "/profile", kind: "profile", method: "PATCH", fields: [{ name: "phone", label: "Phone", type: "tel", required: false }, { name: "address", label: "Address", required: false }] },
    announcements: { title: "Announcements", description: "Company updates for your role.", endpoint: "/announcements", kind: "collection", columns: ["title", "body", "createdAt", "authorName"] },
    notifications: { title: "Notifications", description: "Your in-app updates.", endpoint: "/notifications", kind: "notifications", columns: ["title", "message", "createdAt", "readAt"] },
    assistant: { title: "AI assistant", description: "Ask about your own records or company policy.", endpoint: "/ai/chat", kind: "assistant" },
    
  },
};

export const organizationSections = [
  ["settings", "Company settings"], ["departments", "Departments"], ["designations", "Designations"], ["leave-types", "Leave types"], ["holidays", "Holidays"], ["users", "User access"],
];
