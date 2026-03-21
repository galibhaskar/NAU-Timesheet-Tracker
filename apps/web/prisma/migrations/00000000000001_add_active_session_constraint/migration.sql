-- Enforce at most one ACTIVE session per course assignment
CREATE UNIQUE INDEX "work_sessions_unique_active_per_assignment"
ON "work_sessions" ("assignment_id")
WHERE status = 'ACTIVE';
