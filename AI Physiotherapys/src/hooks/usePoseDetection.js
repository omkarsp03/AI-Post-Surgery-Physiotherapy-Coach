/**
 * Custom React hook for MediaPipe Pose detection.
 * All processing happens in-browser — NO data is sent to any server.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export function usePoseDetection() {
    const [isLoading, setIsLoading] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState(null);
    const [landmarks, setLandmarks] = useState(null);

    const poseLandmarkerRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const streamRef = useRef(null);
    const lastTimestampRef = useRef(-1);
    const prevLandmarksRef = useRef(null);
    const drawingUtilsRef = useRef(null);
    const isRunningRef = useRef(false);

    // Initialize pose landmarker
    const initialize = useCallback(async () => {
        if (poseLandmarkerRef.current) return true;
        setIsLoading(true);
        setError(null);
        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                numPoses: 1,
                minPoseDetectionConfidence: 0.7,
                minPosePresenceConfidence: 0.7,
                minTrackingConfidence: 0.7,
            });
            setIsLoading(false);
            return true;
        } catch (err) {
            console.error('Failed to initialize PoseLandmarker:', err);
            setError('Failed to load pose detection model. Please check your internet connection and try again.');
            setIsLoading(false);
            return false;
        }
    }, []);

    // Frame detection loop — uses refs only, no state dependencies
    const detectFrame = useCallback(() => {
        if (!isRunningRef.current) return;
        if (!poseLandmarkerRef.current || !videoRef.current || !canvasRef.current) {
            animFrameRef.current = requestAnimationFrame(detectFrame);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (video.readyState >= 2) {
            const now = performance.now();

            if (now !== lastTimestampRef.current) {
                lastTimestampRef.current = now;

                try {
                    const result = poseLandmarkerRef.current.detectForVideo(video, now);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    if (result.landmarks && result.landmarks.length > 0) {
                        const poseLandmarks = result.landmarks[0];
                        prevLandmarksRef.current = poseLandmarks;
                        setLandmarks(poseLandmarks);

                        // Draw skeleton
                        if (drawingUtilsRef.current) {
                            drawingUtilsRef.current.drawConnectors(
                                poseLandmarks,
                                PoseLandmarker.POSE_CONNECTIONS,
                                { color: 'rgba(51, 141, 255, 0.7)', lineWidth: 3 }
                            );
                            drawingUtilsRef.current.drawLandmarks(
                                poseLandmarks,
                                {
                                    color: 'rgba(23, 179, 124, 0.9)',
                                    fillColor: 'rgba(23, 179, 124, 0.5)',
                                    lineWidth: 1,
                                    radius: 4,
                                }
                            );
                        }
                    } else {
                        setLandmarks(null);
                    }
                } catch (err) {
                    // Silently handle frame detection errors
                }
            }
        }

        animFrameRef.current = requestAnimationFrame(detectFrame);
    }, []); // No dependencies — uses refs only

    // Start camera and detection
    const start = useCallback(async (videoElement, canvasElement) => {
        videoRef.current = videoElement;
        canvasRef.current = canvasElement;

        const initialized = await initialize();
        if (!initialized || !poseLandmarkerRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;
            videoElement.srcObject = stream;

            await new Promise((resolve) => {
                videoElement.onloadeddata = resolve;
            });
            await videoElement.play();

            // Set canvas size to match video
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;

            const ctx = canvasElement.getContext('2d');
            drawingUtilsRef.current = new DrawingUtils(ctx);

            isRunningRef.current = true;
            setIsRunning(true);
            lastTimestampRef.current = -1;

            // Start detection loop
            detectFrame();
        } catch (err) {
            console.error('Camera error:', err);
            if (err.name === 'NotAllowedError') {
                setError('Camera access denied. Please allow camera permission in your browser settings and reload the page.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found. Please connect a camera and try again.');
            } else {
                setError(`Camera error: ${err.message}`);
            }
        }
    }, [initialize, detectFrame]);

    // Stop detection and camera
    const stop = useCallback(() => {
        isRunningRef.current = false;
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsRunning(false);
        setLandmarks(null);
        prevLandmarksRef.current = null;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isRunningRef.current = false;
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (poseLandmarkerRef.current) {
                poseLandmarkerRef.current.close();
                poseLandmarkerRef.current = null;
            }
        };
    }, []);

    return {
        landmarks,
        prevLandmarks: prevLandmarksRef.current,
        isLoading,
        isRunning,
        error,
        start,
        stop,
    };
}
