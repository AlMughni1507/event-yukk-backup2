-- Migration: Fix payment registration_id references
-- Date: 2025-11-26

-- For payments that reference non-existent event_registrations, set registration_id to NULL
UPDATE payments p
SET p.registration_id = NULL
WHERE p.registration_id NOT IN (SELECT id FROM event_registrations WHERE id IS NOT NULL);

-- Note: The foreign key constraint will be handled by the application startup
