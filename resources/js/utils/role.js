/**
 * Maps internal database role values to friendly display labels.
 * Internal values stay unchanged so middleware, seeders, and tests
 * continue to pass. Only the user-facing labels are translated.
 */
export function roleLabel(role) {
    switch (role) {
        case 'SuperAdmin': return 'Admin';
        case 'Admin':      return 'Staff';
        default:           return role || 'Staff';
    }
}

/** Returns true if the user has system administrator privileges (internal SuperAdmin). */
export function isSuperAdmin(role) {
    return role === 'SuperAdmin';
}

/** Returns true if the user has staff-level access (Admin or SuperAdmin). */
export function isStaff(role) {
    return role === 'Admin' || role === 'SuperAdmin';
}