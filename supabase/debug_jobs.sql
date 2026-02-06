-- Check all jobs and their assignments
SELECT 
    j.id,
    j.description,
    j.status,
    j.staff_id,
    u.name as staff_name,
    u.email as staff_email,
    s.name as service_name,
    j.created_at
FROM jobs j
LEFT JOIN users u ON j.staff_id = u.id
LEFT JOIN services s ON j.service_id = s.id
ORDER BY j.created_at DESC;

-- Check if there's an ID mismatch
SELECT 
    'Jobs with staff_id' as check_type,
    COUNT(*) as count,
    staff_id
FROM jobs
GROUP BY staff_id;

-- Check all users
SELECT id, email, name, role FROM users;

-- Check auth users
SELECT id, email FROM auth.users;
