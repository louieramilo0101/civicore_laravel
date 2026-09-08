import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const DataContext = createContext();

/** Returns shared cached civic data and refresh operations. */
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

/** Owns shared dashboard, document, issuance, history, and template state. */
export const DataProvider = ({ children }) => {
    const DATA_VERSION = '1.0.3';
    
    // ── State for Stats ──────────────────────────────────────────────────────
    const [stats, setStats] = useState(() => {
        const cached = sessionStorage.getItem('civicore_stats');
        const version = sessionStorage.getItem('civicore_version');
        
        // Force clear if version mismatch or first time
        if (version !== DATA_VERSION) {
            sessionStorage.clear();
            sessionStorage.setItem('civicore_version', DATA_VERSION);
            return { totalDocs: 0, processedDocs: 0, pendingDocs: 0, totalUsers: 0, totalIssuances: 0, pendingIssuances: 0 };
        }
        
        return cached ? JSON.parse(cached) : {
            totalDocs: 0,
            processedDocs: 0,
            pendingDocs: 0,
            totalUsers: 0,
            totalIssuances: 0,
            pendingIssuances: 0
        };
    });

    // ── State for Documents ──────────────────────────────────────────────────
    const [documents, setDocuments] = useState(() => {
        const cached = sessionStorage.getItem('civicore_documents');
        return cached ? JSON.parse(cached) : [];
    });

    // ── State for Issuances ──────────────────────────────────────────────────
    const [issuances, setIssuances] = useState(() => {
        const cached = sessionStorage.getItem('civicore_issuances');
        return cached ? JSON.parse(cached) : [];
    });

    // ── State for History Logs ───────────────────────────────────────────────
    const [history, setHistory] = useState(() => {
        const cached = sessionStorage.getItem('civicore_history');
        return cached ? JSON.parse(cached) : [];
    });

    // ── State for Templates ──────────────────────────────────────────────────
    const [templates, setTemplates] = useState(() => {
        const cached = sessionStorage.getItem('civicore_templates');
        return cached ? JSON.parse(cached) : [];
    });

    const [loading, setLoading] = useState({
        stats: !sessionStorage.getItem('civicore_stats'),
        documents: !sessionStorage.getItem('civicore_documents'),
        issuances: !sessionStorage.getItem('civicore_issuances'),
        history: !sessionStorage.getItem('civicore_history'),
        templates: !sessionStorage.getItem('civicore_templates')
    });

    const lastFetch = useRef({
        stats: 0,
        documents: 0,
        issuances: 0,
        history: 0,
        templates: 0
    });

    // ── Background Task Management ──────────────────────────────────────────
    const [backgroundTasks, setBackgroundTasks] = useState([]);
    const [undoableTasks, setUndoableTasks] = useState([]);

    /** Runs an asynchronous action while exposing progress and undoable status. */
    const runBackgroundTask = useCallback(async (name, actionFn, options = {}) => {
        // High-precision ID to prevent state-update collisions
        const taskId = `${options.id || Math.random().toString(36).substring(2, 9)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Add "Running" task immediately for UI feedback
        if (!options.silent) {
            setBackgroundTasks(prev => [...prev, {
                id: taskId,
                name,
                status: 'running',
                timestamp: new Date()
            }]);
        }

        try {
            const result = await actionFn();
            
            // Update or remove task
            setBackgroundTasks(prev => {
                const filtered = prev.filter(t => t.id !== taskId);
                // Only show success toast if not silent
                if (result && result.success !== false && !options.silent) {
                    return [...filtered, {
                        id: taskId,
                        name,
                        status: 'success',
                        type: options.type,
                        message: result.message,
                        timestamp: new Date(),
                        ...options.meta
                    }];
                }
                return filtered;
            });

            // If it was a success toast, set a timeout to remove it
            if (result && result.success !== false && !options.silent) {
                setTimeout(() => {
                    setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
                }, 4000);
            }
            
            return result;
        } catch (err) {
            console.error(`Task ${name} failed:`, err);
            
            // Update to error status
            setBackgroundTasks(prev => {
                const filtered = prev.filter(t => t.id !== taskId);
                return [...filtered, {
                    id: taskId,
                    name,
                    status: 'error',
                    message: err.message || 'Operation failed',
                    timestamp: new Date()
                }];
            });
            
            setTimeout(() => {
                setBackgroundTasks(prev => prev.filter(t => t.id !== taskId));
            }, 6000);
            throw err;
        }
    }, []);

    const clearUndoableTask = useCallback((taskId) => {
        setUndoableTasks(prev => prev.filter(t => t.id !== taskId));
    }, []);

    // ── Fetching Logic ────────────────────────────────────────────────────────
    
    /** Checks whether the session contains a user with an assigned role. */
    const isAuthenticated = () => {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) return false;
        try {
            const user = JSON.parse(userJson);
            return !!user.role;
        } catch (e) {
            return false;
        }
    };

    const refreshStats = useCallback(async (force = false) => {
        if (!isAuthenticated()) return;
        const now = Date.now();
        if (!force && now - lastFetch.current.stats < 5000) return; // Debounce fetches
        
        try {
            const response = await fetch('/api/dashboard/stats', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            
            if (data.stats) {
                setStats(data.stats);
                sessionStorage.setItem('civicore_stats', JSON.stringify(data.stats));
            }
            if (data.chartData) {
                sessionStorage.setItem('civicore_chart_data', JSON.stringify(data.chartData));
            }
            lastFetch.current.stats = now;
        } catch (err) {
            console.error('Error refreshing stats:', err);
        } finally {
            setLoading(prev => ({ ...prev, stats: false }));
        }
    }, []);

    const refreshDocuments = useCallback(async (force = false) => {
        if (!isAuthenticated()) return;
        const now = Date.now();
        if (!force && now - lastFetch.current.documents < 5000) return;

        try {
            const response = await fetch('/api/documents', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch documents');
            const data = await response.json();
            
            if (data.data) {
                const mapped = data.data.map(doc => {
                    let ef = doc.extracted_fields;
                    if (typeof ef === 'string') {
                        try { ef = JSON.parse(ef); } catch (e) { ef = null; }
                    }
                    
                    let meta = doc.metadata;
                    if (typeof meta === 'string') {
                        try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
                    }

                    return {
                        id:               doc.id,
                        name:             doc.name,
                        type:             (doc.type && doc.type.toLowerCase() !== 'unknown') ? doc.type : 'birth',
                        size:             doc.size,
                        status:           doc.status ? doc.status.toLowerCase() : 'pending',
                        date:             doc.date || '',
                        detected_type:    (doc.detected_type && doc.detected_type.toLowerCase() !== 'unknown') ? doc.detected_type : 'birth',
                        extracted_fields: ef,
                        ocr_text:         doc.ocr_text,
                        encoded_by:       doc.encoded_by,
                        personName:       doc.personName || '',
                        barangay:         doc.barangay || '',
                        metadata:         meta || {},
                        created_at:       doc.created_at,
                        file_path:        doc.file_path,
                        has_duplicate:    !!doc.has_duplicate,
                        // batch progress fields (populated by server for active processing docs)
                        batch_progress:   doc.batch_progress,
                        batch_total:      doc.batch_total,
                        batch_processed:  doc.batch_processed,
                    };
                });
                setDocuments(mapped);
                sessionStorage.setItem('civicore_documents', JSON.stringify(mapped));
            }
            lastFetch.current.documents = now;
        } catch (err) {
            console.error('Error refreshing documents:', err);
        } finally {
            setLoading(prev => ({ ...prev, documents: false }));
        }
    }, []);

    const refreshIssuances = useCallback(async (force = false) => {
        if (!isAuthenticated()) return;
        const now = Date.now();
        if (!force && now - lastFetch.current.issuances < 5000) return;

        try {
            const response = await fetch('/api/issuances', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch issuances');
            const data = await response.json();
            
            if (data.data) {
                const mapped = data.data.map(i => ({
                    id:              i.id,
                    number:          i.certNumber,
                    type:            (i.type && i.type.toLowerCase() !== 'unknown') ? i.type : 'birth',
                    name:            i.name,
                    barangay:        i.barangay,
                    date:            i.issuanceDate,
                    status:          i.status || 'Pending',
                    encoded_by:      i.encoded_by,
                    document_id:     i.document_id,
                    or_number:       i.or_number,
                    print_remarks:   i.print_remarks,
                    requested_by:    i.requested_by,
                    approved_by:     i.approved_by,
                    ticket_number:   i.ticket_number,
                    created_at:      i.created_at,
                    source:          'issuance',
                    raw: {
                        ...i,
                        type: (i.type && i.type.toLowerCase() !== 'unknown') ? i.type : 'birth',
                        source: 'issuance'
                    }
                }));
                setIssuances(mapped);
                sessionStorage.setItem('civicore_issuances', JSON.stringify(mapped));
            }
            lastFetch.current.issuances = now;
        } catch (err) {
            console.error('Error refreshing issuances:', err);
        } finally {
            setLoading(prev => ({ ...prev, issuances: false }));
        }
    }, []);

    const refreshHistory = useCallback(async (force = false) => {
        if (!isAuthenticated()) return;
        const now = Date.now();
        if (!force && now - lastFetch.current.history < 5000) return;

        try {
            const response = await fetch('/api/documents/history', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();
            
            if (data.data) {
                setHistory(data.data);
                sessionStorage.setItem('civicore_history', JSON.stringify(data.data));
            }
            lastFetch.current.history = now;
        } catch (err) {
            console.error('Error refreshing history:', err);
        } finally {
            setLoading(prev => ({ ...prev, history: false }));
        }
    }, []);

    const refreshTemplates = useCallback(async (force = false) => {
        if (!isAuthenticated()) return;
        const now = Date.now();
        if (!force && now - lastFetch.current.templates < 5000) return;

        try {
            const response = await fetch('/api/templates', { credentials: 'include' });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to fetch templates: ${response.status} ${text}`);
            }
            const data = await response.json();
            
            if (data) {
                setTemplates(data);
                sessionStorage.setItem('civicore_templates', JSON.stringify(data));
            }
            lastFetch.current.templates = now;
        } catch (err) {
            console.error('Error refreshing templates:', err);
        } finally {
            setLoading(prev => ({ ...prev, templates: false }));
        }
    }, []);

    const pollingRef = useRef(null);
    const isVisibleRef = useRef(document.visibilityState === 'visible');

    const refreshAll = useCallback(() => {
        refreshStats(true);
        refreshDocuments(true);
        refreshIssuances(true);
        refreshHistory(true);
        refreshTemplates(true);
    }, [refreshStats, refreshDocuments, refreshIssuances, refreshHistory, refreshTemplates]);

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollingRef.current) {
            return;
        }

        pollingRef.current = window.setInterval(() => {
            if (!isVisibleRef.current) {
                return;
            }

            refreshStats();
            refreshDocuments();
            refreshIssuances();
            refreshHistory();
            refreshTemplates();
        }, 15000);
    }, [refreshStats, refreshDocuments, refreshIssuances, refreshHistory, refreshTemplates]);

    // ── Global Polling ────────────────────────────────────────────────────────
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === 'visible';
            if (isVisibleRef.current) {
                refreshAll();
                startPolling();
            } else {
                stopPolling();
            }
        };

        refreshAll();
        if (isVisibleRef.current) {
            startPolling();
        }
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshAll, startPolling, stopPolling]);

    const value = {
        stats,
        documents,
        issuances,
        history,
        templates,
        loading,
        backgroundTasks,
        undoableTasks,
        runBackgroundTask,
        clearUndoableTask,
        refreshStats,
        refreshDocuments,
        refreshIssuances,
        refreshHistory,
        refreshTemplates,
        // Helper to refresh everything at once (e.g. after a mutation)
        refreshAll,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
