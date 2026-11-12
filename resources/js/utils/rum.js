import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

/**
 * Privacy-preserving Real User Monitoring reporter for CiviCORE.
 * Captures Core Web Vitals and posts them to the self-hosted Laravel backend.
 */
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    return 'Other';
}

function getOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
}

function sendMetric(metric) {
    // Navigator.sendBeacon is preferred for non-blocking transport on page unload/visibility state changes
    const payload = {
        name: metric.name.toLowerCase(),
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        title: document.title,
        connection: navigator.connection ? navigator.connection.effectiveType : 'unknown',
        device: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
    };

    const url = '/api/rum/metrics';
    const jsonStr = JSON.stringify(payload);

    if (navigator.sendBeacon) {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
    } else {
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonStr,
            keepalive: true,
            credentials: 'same-origin'
        }).catch(() => { /* non-blocking */ });
    }
}

/**
 * Tracks category validation timing for document upload workflow
 */
function trackCategoryValidation(metrics) {
    const startTime = performance.now();
    
    // Track validation timing after upload completes
    return {
        recordValidationTiming: function(metrics) {
            const validationTime = performance.now() - startTime;
            const payload = {
                name: 'category_validation',
                value: validationTime,
                page: window.location.pathname,
                rating: validationTime > 500 ? 'poor' : validationTime > 200 ? 'needs-improvement' : 'good',
                device: getDeviceType(),
                browser: getBrowser(),
                os: getOS(),
                validation_result: metrics.status,
                is_mismatch: metrics.is_mismatch || false,
                needs_user_decision: metrics.needs_decision || false
            };
            sendMetric(payload);
        },
        
        recordMismatchDecisionTiming: function() {
            const totalTime = performance.now() - startTime;
            const payload = {
                name: 'category_mismatch_decision',
                value: totalTime,
                page: window.location.pathname,
                rating: totalTime > 1000 ? 'poor' : totalTime > 500 ? 'needs-improvement' : 'good',
                device: getDeviceType(),
                browser: getBrowser(),
                os: getOS(),
                workflow: 'mismatch_resolution'
            };
            sendMetric(payload);
        }
    };
}

/**
 * Initializes RUM metrics collection. Call once at application boot.
 */
export function initRum() {
    // Only run in browser environments
    if (typeof window === 'undefined') return;

    try {
        onLCP(sendMetric);
        onINP(sendMetric);
        onCLS(sendMetric);
        onFCP(sendMetric);
        onTTFB(sendMetric);
        
        // Initialize category workflow tracking
        window.trackCategoryMetrics = trackCategoryValidation();
        
    } catch (err) {
        // Non-blocking catch to ensure performance reporting never breaks application execution
        console.warn('RUM initialization error:', err);
    }
}