/**
 * Recording Manager - Handles audio/video recording with pause and stop functionality
 * Compatible with MediaRecorder API for web-based implementations
 */

class RecordingManager {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.recordedChunks = [];
    this.recordingState = 'stopped'; // 'active', 'paused', 'stopped'
    this.onStateChange = null;
    this.onDataAvailable = null;
    this.onRecordingComplete = null;
    this.onError = null;
  }

  /**
   * Initialize recording with media constraints
   * @param {Object} constraints - MediaStream constraints
   * @param {Object} options - MediaRecorder options
   */
  async initializeRecording(constraints = { audio: true, video: false }, options = { mimeType: 'audio/webm' }) {
    try {
      // Request media stream
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Initialize MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Set up event listeners
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          if (this.onDataAvailable) {
            this.onDataAvailable(event.data);
          }
        }
      };

      this.mediaRecorder.onstop = () => {
        this.recordingState = 'stopped';
        this._notifyStateChange();
        if (this.onRecordingComplete) {
          const blob = new Blob(this.recordedChunks, { type: options.mimeType || 'audio/webm' });
          this.onRecordingComplete(blob, this.recordedChunks);
        }
        this._cleanup();
      };

      this.mediaRecorder.onerror = (event) => {
        this.recordingState = 'stopped';
        this._notifyStateChange();
        if (this.onError) {
          this.onError(event.error);
        }
        this._cleanup();
      };

      return true;
    } catch (error) {
      console.error('Failed to initialize recording:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  /**
   * Start recording
   */
  startRecording() {
    if (!this.mediaRecorder || this.recordingState !== 'stopped') {
      console.warn('Cannot start recording. MediaRecorder not ready or already recording.');
      return false;
    }

    try {
      this.recordedChunks = [];
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.recordingState = 'active';
      this._notifyStateChange();
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording() {
    if (!this.mediaRecorder || this.recordingState !== 'active') {
      console.warn('Cannot pause recording. MediaRecorder not active.');
      return false;
    }

    try {
      this.mediaRecorder.pause();
      this.recordingState = 'paused';
      this._notifyStateChange();
      return true;
    } catch (error) {
      console.error('Failed to pause recording:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  /**
   * Resume recording from pause
   */
  resumeRecording() {
    if (!this.mediaRecorder || this.recordingState !== 'paused') {
      console.warn('Cannot resume recording. MediaRecorder not paused.');
      return false;
    }

    try {
      this.mediaRecorder.resume();
      this.recordingState = 'active';
      this._notifyStateChange();
      return true;
    } catch (error) {
      console.error('Failed to resume recording:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  /**
   * Stop recording
   */
  stopRecording() {
    if (!this.mediaRecorder || this.recordingState === 'stopped') {
      console.warn('Cannot stop recording. MediaRecorder not active.');
      return false;
    }

    try {
      this.mediaRecorder.stop();
      // Note: State will be updated in onstop event handler
      return true;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  /**
   * Get current recording state
   */
  getState() {
    return {
      state: this.recordingState,
      isRecording: this.recordingState === 'active',
      isPaused: this.recordingState === 'paused',
      isStopped: this.recordingState === 'stopped',
      duration: this._getRecordingDuration()
    };
  }

  /**
   * Set state change callback
   */
  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  /**
   * Set data available callback
   */
  setDataAvailableCallback(callback) {
    this.onDataAvailable = callback;
  }

  /**
   * Set recording complete callback
   */
  setRecordingCompleteCallback(callback) {
    this.onRecordingComplete = callback;
  }

  /**
   * Set error callback
   */
  setErrorCallback(callback) {
    this.onError = callback;
  }

  /**
   * Check if recording is supported
   */
  static isRecordingSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  /**
   * Get supported MIME types for MediaRecorder
   */
  static getSupportedMimeTypes() {
    const possibleTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/wav',
      'video/webm',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/mp4'
    ];

    return possibleTypes.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Clean up resources
   */
  _cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }

  /**
   * Notify state change listeners
   */
  _notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.recordingState);
    }
  }

  /**
   * Get recording duration (approximate)
   */
  _getRecordingDuration() {
    // This is an approximation - for precise timing, you'd need to track start time
    return this.recordedChunks.length * 100; // Assuming 100ms chunks
  }
}

/**
 * Recording Interface Controller - Handles UI interactions for recording buttons
 */
class RecordingInterface {
  constructor(recordingManager) {
    this.recordingManager = recordingManager;
    this.pauseBtn = null;
    this.stopBtn = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the recording interface with button elements
   * @param {string} pauseBtnId - ID of the pause button
   * @param {string} stopBtnId - ID of the stop button
   */
  initialize(pauseBtnId = 'pause-btn', stopBtnId = 'stop-btn') {
    this.pauseBtn = document.getElementById(pauseBtnId);
    this.stopBtn = document.getElementById(stopBtnId);

    if (!this.pauseBtn || !this.stopBtn) {
      console.error('Recording buttons not found. Make sure elements with IDs "' + pauseBtnId + '" and "' + stopBtnId + '" exist.');
      return false;
    }

    this._setupEventListeners();
    this._updateButtonStates();
    this.isInitialized = true;

    // Set up state change listener
    this.recordingManager.setStateChangeCallback((state) => {
      this._updateButtonStates();
      this._handleStateChange(state);
    });

    return true;
  }

  /**
   * Set up event listeners for buttons
   */
  _setupEventListeners() {
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => {
        this._handlePauseClick();
      });
    }

    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => {
        this._handleStopClick();
      });
    }
  }

  /**
   * Handle pause button click
   */
  _handlePauseClick() {
    const state = this.recordingManager.getState();

    if (state.isRecording) {
      this.recordingManager.pauseRecording();
    } else if (state.isPaused) {
      this.recordingManager.resumeRecording();
    }
  }

  /**
   * Handle stop button click
   */
  _handleStopClick() {
    this.recordingManager.stopRecording();
  }

  /**
   * Update button states based on recording state
   */
  _updateButtonStates() {
    if (!this.pauseBtn || !this.stopBtn) return;

    const state = this.recordingManager.getState();

    // Update pause button
    if (state.isRecording) {
      this.pauseBtn.textContent = '||'; // Pause symbol
      this.pauseBtn.title = 'Pause Recording';
      this.pauseBtn.disabled = false;
    } else if (state.isPaused) {
      this.pauseBtn.textContent = '▶'; // Play symbol (resume)
      this.pauseBtn.title = 'Resume Recording';
      this.pauseBtn.disabled = false;
    } else {
      this.pauseBtn.textContent = '||';
      this.pauseBtn.title = 'Start Recording';
      this.pauseBtn.disabled = true;
    }

    // Update stop button
    this.stopBtn.disabled = state.isStopped;
    this.stopBtn.title = state.isStopped ? 'No Active Recording' : 'Stop Recording';
  }

  /**
   * Handle state changes
   */
  _handleStateChange(state) {
    // Additional UI updates can be added here
    console.log('Recording state changed to:', state);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RecordingManager, RecordingInterface };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
  window.RecordingManager = RecordingManager;
  window.RecordingInterface = RecordingInterface;
}