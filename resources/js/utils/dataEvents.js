/**
 * Typed mutation event emitter for targeted cache invalidation.
 *
 * Instead of refreshing ALL data sources on every mutation (5 API calls
 * per action), components emit typed events. Each cache subscribes only
 * to the events that affect it, minimising redundant network traffic.
 *
 * At 300K+ records this matters — re-fetching and re-processing the entire
 * dataset on every mutation is expensive CPU work, not just network cost.
 */

const listeners = new Map();

/** Subscribe to a typed mutation event. */
export function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
}

/** Emit a typed mutation event to all subscribers. */
export function emit(event, payload) {
    const fns = listeners.get(event);
    if (fns) fns.forEach(fn => fn(payload));
}

// ── Typed event constants ──────────────────────────────────────────────

export const Events = {
    // Documents
    DOCUMENT_UPLOADED:     'document:uploaded',
    DOCUMENT_UPDATED:      'document:updated',
    DOCUMENT_DELETED:      'document:deleted',
    DOCUMENT_RESTORED:     'document:restored',
    DOCUMENT_PURGED:       'document:purged',
    DOCUMENT_BULK_APPROVE: 'document:bulk-approve',
    DOCUMENT_BULK_DELETE:  'document:bulk-delete',
    DOCUMENT_BULK_PROCESS: 'document:bulk-process',
    DOCUMENTOCR_STATUS:    'document:ocr-status',

    // Issuances
    ISSUANCE_CREATED:   'issuance:created',
    ISSUANCE_UPDATED:   'issuance:updated',
    ISSUANCE_DELETED:   'issuance:deleted',
    ISSUANCE_ISSUED:    'issuance:issued',
    ISSUANCE_REQUESTED: 'issuance:request-print',
    ISSUANCE_APPROVED:  'issuance:approve-print',
    ISSUANCE_REJECTED:  'issuance:reject-print',

    // Tickets
    TICKET_CREATED:    'ticket:created',
    TICKET_UPDATED:    'ticket:updated',
    TICKET_CANCELLED:  'ticket:cancelled',
    TICKET_ISSUED:     'ticket:issued',
    TICKET_ATTACHED:   'ticket:attached',
    TICKET_LINKED:     'ticket:linked-document',

    // Accounts
    ACCOUNT_CREATED:   'account:created',
    ACCOUNT_UPDATED:   'account:updated',
    ACCOUNT_DISABLED:  'account:disabled',
    ACCOUNT_REENABLED: 'account:reenabled',

    // Templates / Settings
    TEMPLATE_UPDATED:   'template:updated',
    SETTINGS_UPDATED:   'settings:updated',
    ANNOUNCEMENT_CREATED: 'announcement:created',
    ANNOUNCEMENT_UPDATED: 'announcement:updated',
    ANNOUNCEMENT_DELETED: 'announcement:deleted',

    // Backup
    BACKUP_CREATED:  'backup:created',
    BACKUP_RESTORED:  'backup:restored',
    BACKUP_PRUNED:   'backup:pruned',

    // System
    SYSTEM_RESTARTED: 'system:restarted',
};