'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * React component for recording interface with pause and stop functionality
 * Integrates with the RecordingManager for audio/video recording
 */
export default function RecordingInterface({
  onRecordingComplete,
  onRecordingError,
  onStateChange,
  className = ''
}) {
  const recordingManagerRef = useRef(null);
  const [recordingState, setRecordingState] = useState('stopped');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize recording manager
  useEffect(() => {
    const initializeRecording = async () => {
      try {
        // Dynamic import for client-side only
        const { RecordingManager } = await import('../lib/recording-manager.js');

        const manager = new RecordingManager();
        recordingManagerRef.current = manager;

        // Set up callbacks
        manager.setStateChangeCallback((state) => {
          setRecordingState(state);
          onStateChange?.(state);
        });

        manager.setRecordingCompleteCallback((blob, chunks) => {
          onRecordingComplete?.(blob, chunks);
        });

        manager.setErrorCallback((error) => {
          setError(error.message);
          onRecordingError?.(error);
        });

        setIsLoading(false);
      } catch (err) {
        setError('Failed to initialize recording manager');
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      setIsLoading(true);
      initializeRecording();
    }

    return () => {
      // Cleanup on unmount
      if (recordingManagerRef.current) {
        recordingManagerRef.current._cleanup();
      }
    };
  }, [onRecordingComplete, onRecordingError, onStateChange]);

  // Initialize MediaRecorder when component mounts
  const initializeMediaRecorder = async () => {
    if (!recordingManagerRef.current) return false;

    setError(null);
    const constraints = { audio: true, video: false };
    const options = { mimeType: 'audio/webm' };

    return await recordingManagerRef.current.initializeRecording(constraints, options);
  };

  // Handle pause/resume button click
  const handlePauseClick = async () => {
    if (!recordingManagerRef.current) return;

    const state = recordingManagerRef.current.getState();

    if (state.isStopped) {
      // Start new recording
      const initialized = await initializeMediaRecorder();
      if (initialized) {
        recordingManagerRef.current.startRecording();
      }
    } else if (state.isRecording) {
      // Pause recording
      recordingManagerRef.current.pauseRecording();
    } else if (state.isPaused) {
      // Resume recording
      recordingManagerRef.current.resumeRecording();
    }
  };

  // Handle stop button click
  const handleStopClick = () => {
    if (!recordingManagerRef.current) return;

    recordingManagerRef.current.stopRecording();
  };

  // Get button text based on state
  const getPauseButtonText = () => {
    if (recordingState === 'active') return '⏸';
    if (recordingState === 'paused') return '▶';
    return '⏸';
  };

  const getPauseButtonTitle = () => {
    if (recordingState === 'active') return 'Pause Recording';
    if (recordingState === 'paused') return 'Resume Recording';
    return 'Start Recording';
  };

  if (isLoading) {
    return (
      <div className={`recording-interface ${className}`}>
        <div className="recording-loading">Initializing recording...</div>
      </div>
    );
  }

  if (error && !recordingManagerRef.current) {
    return (
      <div className={`recording-interface ${className}`}>
        <div className="recording-error">
          Error: {error}
          {!RecordingManager?.isRecordingSupported() && (
            <div style={{ marginTop: '10px', fontSize: '14px' }}>
              Recording is not supported in this browser
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`recording-interface ${className}`}>
      {/* Recording Status Indicator */}
      {recordingState === 'active' && (
        <div className="recording-status active">
          <span className="recording-dot"></span>
          Recording...
        </div>
      )}

      {recordingState === 'paused' && (
        <div className="recording-status paused">
          <span className="recording-dot paused"></span>
          Paused
        </div>
      )}

      {/* Control Buttons */}
      <div className="recording-controls">
        <button
          id="pause-btn"
          className={`control-btn pause-btn ${recordingState}`}
          onClick={handlePauseClick}
          disabled={isLoading}
          title={getPauseButtonTitle()}
          aria-label={getPauseButtonTitle()}
        >
          {getPauseButtonText()}
        </button>

        <button
          id="stop-btn"
          className={`control-btn stop-btn ${recordingState === 'stopped' ? 'disabled' : ''}`}
          onClick={handleStopClick}
          disabled={recordingState === 'stopped' || isLoading}
          title={recordingState === 'stopped' ? 'No Active Recording' : 'Stop Recording'}
          aria-label={recordingState === 'stopped' ? 'No Active Recording' : 'Stop Recording'}
        >
          ⏹
        </button>
      </div>

      {/* Error Display */}
      {error && recordingManagerRef.current && (
        <div className="recording-error">
          {error}
        </div>
      )}

      <style jsx>{`
        .recording-interface {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .recording-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .recording-status.active {
          background-color: #fee;
          color: #c33;
        }

        .recording-status.paused {
          background-color: #fff3cd;
          color: #856404;
        }

        .recording-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #dc3545;
          animation: pulse 1.5s infinite;
        }

        .recording-dot.paused {
          animation: none;
          background-color: #ffc107;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .recording-controls {
          display: flex;
          gap: 12px;
        }

        .control-btn {
          width: 50px;
          height: 50px;
          border: none;
          border-radius: 8px;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }

        .control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .control-btn:not(:disabled):hover {
          transform: translateY(-2px);
        }

        .control-btn:not(:disabled):active {
          transform: translateY(0);
        }

        .pause-btn {
          background-color: #ffc107;
          color: #212529;
        }

        .pause-btn.active {
          background-color: #fd7e14;
          color: white;
        }

        .pause-btn.paused {
          background-color: #28a745;
          color: white;
        }

        .stop-btn {
          background-color: #dc3545;
          color: white;
        }

        .stop-btn.disabled {
          background-color: #6c757d;
        }

        .recording-loading {
          padding: 15px;
          color: #666;
          font-style: italic;
        }

        .recording-error {
          padding: 10px 15px;
          background-color: #f8d7da;
          color: #721c24;
          border-radius: 5px;
          font-size: 14px;
          max-width: 300px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

/**
 * Hook for using recording functionality in React components
 */
export function useRecording(options = {}) {
  const [recordingState, setRecordingState] = useState('stopped');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const recordingManagerRef = useRef(null);

  const initializeRecording = async () => {
    try {
      const { RecordingManager } = await import('../lib/recording-manager.js');
      const manager = new RecordingManager();
      recordingManagerRef.current = manager;

      manager.setStateChangeCallback((state) => {
        setRecordingState(state);
        setIsRecording(state === 'active');
        setIsPaused(state === 'paused');
        options.onStateChange?.(state);
      });

      manager.setRecordingCompleteCallback(options.onRecordingComplete);
      manager.setErrorCallback(options.onError);

      return manager;
    } catch (error) {
      options.onError?.(error);
      return null;
    }
  };

  const startRecording = async () => {
    if (!recordingManagerRef.current) {
      await initializeRecording();
    }

    if (recordingManagerRef.current) {
      const constraints = options.constraints || { audio: true, video: false };
      const recorderOptions = options.recorderOptions || { mimeType: 'audio/webm' };

      const initialized = await recordingManagerRef.current.initializeRecording(constraints, recorderOptions);
      if (initialized) {
        return recordingManagerRef.current.startRecording();
      }
    }
    return false;
  };

  const pauseRecording = () => {
    return recordingManagerRef.current?.pauseRecording();
  };

  const resumeRecording = () => {
    return recordingManagerRef.current?.resumeRecording();
  };

  const stopRecording = () => {
    return recordingManagerRef.current?.stopRecording();
  };

  const getRecordingBlob = () => {
    return recordingManagerRef.current?.getRecordingBlob();
  };

  useEffect(() => {
    return () => {
      if (recordingManagerRef.current) {
        recordingManagerRef.current._cleanup();
      }
    };
  }, []);

  return {
    recordingState,
    isRecording,
    isPaused,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    getRecordingBlob,
    isSupported: typeof window !== 'undefined' && !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    )
  };
}