const CAPTURE_PROFILES = {
    desktop: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'user'
    },
    mobile: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
        facingMode: 'environment'
    }
};

/** Orders detected quadrilateral points clockwise from the top-left corner. */
const sortPoints = (pts) => {
    const sorted = [...pts].sort((a, b) => a.y - b.y);
    const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
    return { tl: top[0], tr: top[1], br: bottom[1], bl: bottom[0] };
};

/** Detects camera capabilities used to select the capture strategy. */
export const detectCaptureEnvironment = () => {
    if (typeof window === 'undefined') return 'desktop';

    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
    const narrowViewport = window.matchMedia?.('(max-width: 1024px)')?.matches;
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator?.userAgent || '');

    return coarsePointer || narrowViewport || mobileUA ? 'mobile' : 'desktop';
};

/** Creates the camera preview, edge-detection, capture, and cleanup API. */
export const createCaptureEngine = () => {
    const environment = detectCaptureEnvironment();
    const profile = CAPTURE_PROFILES[environment];
    let activeStream = null;
    let lastFacingMode = profile.facingMode;

    /** Stops the active media stream and releases camera resources. */
    const stop = () => {
        if (activeStream) {
            try {
                activeStream.getTracks().forEach((track) => track.stop());
            } catch (e) {}
            activeStream = null;
        }
    };

    const startPreview = async ({ videoElement, facingMode } = {}) => {
        stop();
        lastFacingMode = facingMode || lastFacingMode || profile.facingMode;

        // Check if mediaDevices API is supported (requires HTTPS or localhost on phones)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("navigator.mediaDevices.getUserMedia is not supported in this browser context (likely HTTP connection on mobile device).");
            throw new Error("WebRTC camera stream requires HTTPS or localhost. Please use secure connection or upload file directly.");
        }

        const constraintAttempts = [
            // Attempt 1: Facing mode ideal + flexible resolution
            {
                video: {
                    facingMode: { ideal: lastFacingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            },
            // Attempt 2: Just facing mode ideal
            {
                video: {
                    facingMode: { ideal: lastFacingMode }
                }
            },
            // Attempt 3: Exact facing mode
            {
                video: {
                    facingMode: lastFacingMode
                }
            },
            // Attempt 4: Any available video device
            {
                video: true
            }
        ];

        let stream = null;
        let lastError = null;

        for (const constraints of constraintAttempts) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (stream) break;
            } catch (err) {
                console.warn("Camera constraint attempt failed:", constraints, err);
                lastError = err;
            }
        }

        if (!stream) {
            console.error("All camera initialization attempts failed:", lastError);
            throw lastError || new Error("Failed to initialize camera");
        }

        activeStream = stream;

        if (videoElement) {
            try {
                videoElement.srcObject = stream;
                videoElement.setAttribute('playsinline', 'true');
                videoElement.setAttribute('webkit-playsinline', 'true');
                videoElement.muted = true;
                
                const playPromise = videoElement.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.warn("Engine video play promise catch:", e));
                }
            } catch (e) {
                console.warn("Failed setting video element srcObject:", e);
            }
        }

        return stream;
    };

    /** Detects likely document corners from the current video frame. */
    const detectEdges = ({ videoElement } = {}) => {
        const cv = window.cv;
        if (!videoElement || videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight || videoElement.videoWidth < 10 || videoElement.videoHeight < 10 || videoElement.paused || videoElement.ended) {
            return null;
        }

        // OpenCV-powered edge & contour detection
        if (cv && cv.Mat) {
            let src = null;
            let resized = null;
            let gray = null;
            let blurred = null;
            let edged = null;
            let contours = null;
            let hierarchy = null;
            let bestPts = null;

            try {
                src = cv.imread(videoElement);
                resized = new cv.Mat();
                const targetW = 400;
                const targetH = Math.round((400 / videoElement.videoWidth) * videoElement.videoHeight);
                const dsize = new cv.Size(targetW, targetH);
                if (dsize.width <= 0 || dsize.height <= 0) return null;

                cv.resize(src, resized, dsize, 0, 0, cv.INTER_AREA);

                gray = new cv.Mat();
                cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY);

                blurred = new cv.Mat();
                cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

                edged = new cv.Mat();
                cv.Canny(blurred, edged, 30, 120);

                contours = new cv.MatVector();
                hierarchy = new cv.Mat();
                cv.findContours(edged, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

                let maxArea = 0;

                for (let i = 0; i < contours.size(); i += 1) {
                    const contour = contours.get(i);
                    const area = cv.contourArea(contour);

                    if (area > 800) {
                        const perimeter = cv.arcLength(contour, true);
                        
                        let quadFound = false;
                        const epsilons = [0.02, 0.03, 0.015, 0.04];
                        
                        for (let epsRatio of epsilons) {
                            const approx = new cv.Mat();
                            cv.approxPolyDP(contour, approx, epsRatio * perimeter, true);
                            if (approx.rows === 4 && area > maxArea) {
                                maxArea = area;
                                bestPts = [];
                                for (let k = 0; k < 4; k++) {
                                    bestPts.push({
                                        x: (approx.data32S[k * 2] / dsize.width) * 100,
                                        y: (approx.data32S[k * 2 + 1] / dsize.height) * 100
                                    });
                                }
                                approx.delete();
                                quadFound = true;
                                break;
                            }
                            approx.delete();
                        }

                        if (!quadFound && area > maxArea && contour.rows >= 4) {
                            try {
                                const rotatedRect = cv.minAreaRect(contour);
                                const vertices = cv.RotatedRect.points(rotatedRect);
                                if (vertices && vertices.length === 4) {
                                    maxArea = area;
                                    bestPts = vertices.map(pt => ({
                                        x: (pt.x / dsize.width) * 100,
                                        y: (pt.y / dsize.height) * 100
                                    }));
                                }
                            } catch (rectErr) {}
                        }
                    }
                    contour.delete();
                }

                if (bestPts && bestPts.length === 4) {
                    return sortPoints(bestPts);
                }
            } catch (error) {
                console.error("OpenCV edge detection failed:", error);
            } finally {
                if (src) src.delete();
                if (resized) resized.delete();
                if (gray) gray.delete();
                if (blurred) blurred.delete();
                if (edged) edged.delete();
                if (contours) contours.delete();
                if (hierarchy) hierarchy.delete();
            }
        }

        // Fast Canvas-based Luminance Contrast Fallback Detector
        try {
            if (!window.fallbackCanvas) {
                window.fallbackCanvas = document.createElement('canvas');
                window.fallbackCanvas.width = 40;
                window.fallbackCanvas.height = 30;
            }
            const fctx = window.fallbackCanvas.getContext('2d');
            fctx.drawImage(videoElement, 0, 0, 40, 30);
            const imgData = fctx.getImageData(0, 0, 40, 30).data;

            let centerLuma = 0;
            let edgeLuma = 0;
            let centerCount = 0;
            let edgeCount = 0;

            for (let y = 0; y < 30; y++) {
                for (let x = 0; x < 40; x++) {
                    const idx = (y * 40 + x) * 4;
                    const luma = imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114;
                    if (x >= 8 && x <= 32 && y >= 6 && y <= 24) {
                        centerLuma += luma;
                        centerCount++;
                    } else {
                        edgeLuma += luma;
                        edgeCount++;
                    }
                }
            }

            const avgCenter = centerLuma / (centerCount || 1);
            const avgEdge = edgeLuma / (edgeCount || 1);
            const contrastDiff = Math.abs(avgCenter - avgEdge);

            if (contrastDiff > 18) {
                return sortPoints([
                    { x: 15, y: 15 },
                    { x: 85, y: 15 },
                    { x: 85, y: 85 },
                    { x: 15, y: 85 }
                ]);
            }
        } catch (fbErr) {}

        return null;
    };

    /** Captures the current video frame as a data URL and file. */
    const capture = ({ videoElement, quality = 0.9 } = {}) => {
        if (!videoElement) return null;

        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        const context = canvas.getContext('2d');
        context.drawImage(videoElement, 0, 0);

        return new Promise((resolve) => {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }
                const realMimeType = blob.type || 'image/jpeg';
                const extension = realMimeType.includes('png') ? 'png' : realMimeType.includes('webp') ? 'webp' : 'jpg';
                const file = new File([blob], `captured-${Date.now()}.${extension}`, { type: realMimeType });
                resolve({ dataUrl, file });
            }, 'image/jpeg', quality);
        });
    };

    const retake = async ({ videoElement, facingMode } = {}) => startPreview({
        videoElement,
        facingMode: facingMode || lastFacingMode
    });

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
