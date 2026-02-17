import { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';

/**
 * CameraFeed — renders video + canvas overlay for pose skeleton.
 * Exposes video & canvas refs via forwardRef + useImperativeHandle.
 */
const CameraFeed = forwardRef(function CameraFeed({ isRunning }, ref) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getVideo: () => videoRef.current,
        getCanvas: () => canvasRef.current,
    }));

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-surface-900 border border-surface-700/50">
            {/* Aspect ratio container */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    style={{ transform: 'scaleX(-1)' }}
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ transform: 'scaleX(-1)' }}
                />

                {/* Camera loading state */}
                {!isRunning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-900/80 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-surface-800 border-2 border-surface-600 flex items-center justify-center mx-auto mb-3">
                                <span className="text-3xl">📷</span>
                            </div>
                            <p className="text-surface-400 text-sm">Camera will start when you begin the exercise</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Live indicator */}
            {isRunning && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-danger-600/80 backdrop-blur px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-xs font-semibold">LIVE</span>
                </div>
            )}

            {/* Privacy badge */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-surface-800/80 backdrop-blur px-2 py-1 rounded-lg">
                <span className="text-xs">🔒</span>
                <span className="text-surface-400 text-[10px] font-medium">Local Only</span>
            </div>
        </div>
    );
});

export default CameraFeed;
