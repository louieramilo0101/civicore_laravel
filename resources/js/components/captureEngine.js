import { scanDocument, extractDocument, createCornerEditor } from 'scanic';

const CAPTURE_PROFILES = {
    desktop: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        facingMode: 'user'
    },
    mobile: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
        facingMode: 'environment'
    }
};

export const detectCaptureEnvironment = () => {
    if (typeof window === 'undefined') return 'desktop';
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
    const narrowViewport = window.matchMedia?.('(max-width: 1024px)')?.matches;
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator?.userAgent || '');
    return coarsePointer || narrowViewport || mobileUA ? 'mobile' : 'desktop';
};

/**
 * Creates camera management interface using standard WebRTC
 */
export const createCaptureEngine = () => {
    const environment = detectCaptureEnvironment();
    const profile = CAPTURE_PROFILES[environment];
    let activeStream = null;
    let lastFacingMode = profile.facingMode;
    let isDetecting = false;

    const stop = () => {
        if (activeStream) {
            try {
                activeStream.getTracks().forEach(track => {
                    track.stop();
                    track.enabled = false;
                });
            } catch (e) {}
            activeStream = null;
        }
    };

    const startPreview = async ({ videoElement, facingMode } = {}) => {
        stop();
        lastFacingMode = facingMode || lastFacingMode || profile.facingMode;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('WebRTC camera stream requires HTTPS or localhost.');
        }

        const constraints = {
            video: {
                facingMode: lastFacingMode,
                width: profile.width,
                height: profile.height,
            }
        };

        try {
            activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (_) {
            activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: lastFacingMode } });
        }

        if (videoElement) {
            videoElement.srcObject = activeStream;
            await videoElement.play().catch(() => {});
        }
        return activeStream;
    };

    /**
     * Real-time live frame detection via Scanic WASM
     */
    const detectEdges = async ({ videoElement } = {}) => {
        if (!videoElement || videoElement.readyState < 2 || videoElement.paused || videoElement.ended || isDetecting) {
            return null;
        }

        isDetecting = true;
        try {
            const res = await scanDocument(videoElement, {
                mode: 'detect',
                detector: 'classical',
                maxProcessingDimension: 600,
            });
            if (res.success && res.corners) {
                return res.corners;
            }
            return null;
        } catch (e) {
            return null;
        } finally {
            isDetecting = false;
        }
    };

    /**
     * Captures a high-resolution frame from the video feed
     */
    const capture = ({ videoElement, quality = 0.95 } = {}) => {
        if (!videoElement) return null;

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1920;
        canvas.height = videoElement.videoHeight || 1080;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                resolve({
                    canvas,
                    file,
                    dataUrl: canvas.toDataURL('image/jpeg', quality)
                });
            }, 'image/jpeg', quality);
        });
    };

    const retake = ({ videoElement, facingMode } = {}) => startPreview({ videoElement, facingMode });

    return {
        environment,
        profile,
        startPreview,
        detectEdges,
        capture,
        retake,
        stop
    };
};

/**
 * Scanic Corner Detection on any image or canvas
 */
export const detectDocumentCorners = async (imageOrCanvas) => {
    if (!imageOrCanvas) return null;
    try {
        const res = await scanDocument(imageOrCanvas, {
            mode: 'detect',
            detector: 'classical',
            maxProcessingDimension: 1200
        });
        if (res.success && res.corners) {
            return res.corners;
        }
    } catch (e) {
        console.warn("Scanic corner detection failed:", e);
    }
    return null;
};

/**
 * Flattens an image given 4 corners using Scanic's bilinear homography warp
 */
export const extractFlatDocument = async (imageOrCanvas, corners) => {
    if (!imageOrCanvas || !corners) return null;
    try {
        const res = await extractDocument(imageOrCanvas, corners, {
            output: 'canvas'
        });
        if (res.success && res.output) {
            const outCanvas = res.output;
            return new Promise((resolve) => {
                outCanvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(null);
                        return;
                    }
                    const file = new File([blob], `scanic-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    resolve({
                        canvas: outCanvas,
                        file,
                        dataUrl: outCanvas.toDataURL('image/jpeg', 0.92)
                    });
                }, 'image/jpeg', 0.92);
            });
        }
    } catch (err) {
        console.warn("Scanic document extraction failed:", err);
    }
    return null;
};

export const ensureOpenCvLoaded = () => Promise.resolve(true);
export { scanDocument, extractDocument, createCornerEditor };
