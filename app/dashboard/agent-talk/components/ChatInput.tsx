'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChatInputProps, Email } from '../types/chat';
import { IntegrationsModal } from '@/components/ui/integrations-modal';
import { EmailSelectionModal } from '@/components/ui/email-selection-modal';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Mic, Mail, Plus, Send, Mail as EmailIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type RecordingState = 'idle' | 'recording' | 'paused';

// Extend Window interface for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Recording Manager for MediaRecorder functionality
class MediaRecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private state: RecordingState = 'idle';
  private onStateChange: ((state: RecordingState) => void) | null = null;
  private onDataAvailable: ((data: Blob) => void) | null = null;
  private onRecordingComplete: ((blob: Blob, chunks: Blob[]) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;

  async initializeRecording(constraints = { audio: true, video: false }, options = { mimeType: 'audio/webm' }) {
    try {
      console.log('MediaRecordingManager: Checking getUserMedia support...', {
        hasNavigator: !!navigator,
        hasMediaDevices: !!navigator?.mediaDevices,
        hasGetUserMedia: !!navigator?.mediaDevices?.getUserMedia,
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        constraints,
        timestamp: new Date().toISOString()
      });

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      console.log('MediaRecordingManager: Requesting user media...', constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('MediaRecordingManager: User media granted successfully', {
        streamActive: this.stream.active,
        tracks: this.stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      });

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          if (this.onDataAvailable) {
            this.onDataAvailable(event.data);
          }
        }
      };

      this.mediaRecorder.onstop = () => {
        this.state = 'idle';
        this.onStateChange?.(this.state);
        if (this.onRecordingComplete) {
          const blob = new Blob(this.recordedChunks, { type: options.mimeType || 'audio/webm' });
          this.onRecordingComplete(blob, this.recordedChunks);
        }
        this.cleanup();
      };

      this.mediaRecorder.onerror = (event) => {
        this.state = 'idle';
        this.onStateChange?.(this.state);
        if (this.onError) {
          this.onError(new Error(event.error?.message || 'Recording error'));
        }
        this.cleanup();
      };

      return true;
    } catch (error) {
      console.error('MediaRecordingManager: Failed to initialize MediaRecorder:', {
        error: error instanceof Error ? error.message : error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        constraints,
        options,
        timestamp: new Date().toISOString()
      });
      if (this.onError) {
        this.onError(error as Error);
      }
      return false;
    }
  }

  startRecording() {
    if (!this.mediaRecorder || this.state !== 'idle') {
      return false;
    }

    try {
      this.recordedChunks = [];
      this.mediaRecorder.start(100);
      this.state = 'recording';
      this.onStateChange?.(this.state);
      return true;
    } catch (error) {
      console.error('Failed to start MediaRecorder:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
      return false;
    }
  }

  pauseRecording() {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.state = 'paused';
      this.onStateChange?.(this.state);
      return true;
    }
    return false;
  }

  resumeRecording() {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.state = 'recording';
      this.onStateChange?.(this.state);
      return true;
    }
    return false;
  }

  stopRecording() {
    if (this.mediaRecorder && this.state !== 'idle') {
      this.mediaRecorder.stop();
      return true;
    }
    return false;
  }

  getState() {
    return {
      state: this.state,
      isRecording: this.state === 'recording',
      isPaused: this.state === 'paused',
      isIdle: this.state === 'idle'
    };
  }

  setStateChangeCallback(callback: (state: RecordingState) => void) {
    this.onStateChange = callback;
  }

  setDataAvailableCallback(callback: (data: Blob) => void) {
    this.onDataAvailable = callback;
  }

  setRecordingCompleteCallback(callback: (blob: Blob, chunks: Blob[]) => void) {
    this.onRecordingComplete = callback;
  }

  setErrorCallback(callback: (error: Error) => void) {
    this.onError = callback;
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }

  getRecordedBlob() {
    if (this.recordedChunks.length === 0) return null;
    return new Blob(this.recordedChunks, { type: 'audio/webm' });
  }

  static isSupported() {
    return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && typeof MediaRecorder !== 'undefined');
  }
}

export function ChatInput({ onSendMessage, disabled, placeholder, onModalStateChange, onEmailModalStateChange, selectedEmails = [], onEmailSelect, onEmailRemove }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [volumeData, setVolumeData] = useState<number[]>([]);
  const [isSilent, setIsSilent] = useState(false);
  const [placeholderText, setPlaceholderText] = useState(placeholder || "Ask anything about your emails");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecordingManager | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showResumeButton, setShowResumeButton] = useState(false);
  const [mediaRecorderState, setMediaRecorderState] = useState<RecordingState>('idle');

  const handleSubmit = () => {
    console.log('handleSubmit called:', {
      hasMessage: !!message.trim(),
      selectedEmailsCount: selectedEmails.length,
      disabled,
      recordingState,
      isListening
    });

    if ((message.trim() || selectedEmails.length > 0) && !disabled) {
      console.log('Submitting message:', message.trim());
      const emailTexts = selectedEmails.map(e => `[Email: ${e.subject} from ${e.from}]`).join(' ');
      const fullMessage = `${emailTexts} ${message.trim()}`.trim();
      onSendMessage(fullMessage);
      setMessage('');
      if (onEmailSelect) {
        onEmailSelect([]);
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } else {
      console.log('Submit blocked:', {
        hasMessage: !!message.trim(),
        selectedEmailsCount: selectedEmails.length,
        disabled,
        recordingState,
        isListening
      });
    }
  };

  const removeSelectedEmail = (id: string) => {
    if (onEmailRemove) {
      onEmailRemove(id);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('handleKeyDown:', {
      key: e.key,
      shiftKey: e.shiftKey,
      hasMessage: !!message.trim(),
      disabled
    });

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('handleInputChange:', {
      newValue: e.target.value,
      length: e.target.value.length,
      previousMessage: message
    });

    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = 128; // 8rem in pixels (max-h-32)
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Initialize MediaRecorder manager
  useEffect(() => {
    if (typeof window !== 'undefined' && MediaRecordingManager.isSupported()) {
      console.log('Initializing MediaRecorder manager...');
      mediaRecorderRef.current = new MediaRecordingManager();

      // Set up MediaRecorder callbacks
      mediaRecorderRef.current.setStateChangeCallback((state) => {
        setMediaRecorderState(state);
        console.log('MediaRecorder state changed to:', state);
      });

      mediaRecorderRef.current.setRecordingCompleteCallback((blob, chunks) => {
        recordedBlobRef.current = blob;
        console.log('MediaRecorder recording completed:', blob.size, 'bytes');
        // Here you could save the audio blob or send it to your backend
      });

      mediaRecorderRef.current.setErrorCallback((error) => {
        console.error('MediaRecorder error:', error);
        setMediaRecorderState('idle');
      });
    } else {
      console.log('MediaRecorder not supported in this browser');
    }

    return () => {
      // Cleanup function - called when component unmounts
      console.log('Component unmounting - cleaning up recording resources...');

      // Stop any active recording
      if (mediaRecorderRef.current) {
        const mediaState = mediaRecorderRef.current.getState();
        if (mediaState.isRecording || mediaState.isPaused) {
          try {
            mediaRecorderRef.current.stopRecording();
            console.log('MediaRecorder stopped during cleanup');
          } catch (error) {
            console.error('Error stopping MediaRecorder during cleanup:', error);
          }
        }
        mediaRecorderRef.current.cleanup();
        console.log('MediaRecorder cleanup completed');
      }

      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          console.log('Aborting speech recognition during component cleanup', {
            timestamp: new Date().toISOString(),
            currentState: recordingState,
            isListening: isListening,
            hasMessage: !!message.trim()
          });
          recognitionRef.current.abort();
          console.log('Speech recognition aborted during cleanup successfully');
        } catch (e) {
          console.error('Error aborting speech recognition during cleanup:', e, {
            timestamp: new Date().toISOString(),
            currentState: recordingState
          });
        }
        recognitionRef.current = null;
      }

      // Reset states
      setRecordingState('idle');
      setMediaRecorderState('idle');
      setIsListening(false);
      setShowResumeButton(false);
      setPlaceholderText(placeholder || "Ask anything about your emails");

      // Clear recorded blob
      recordedBlobRef.current = null;
    };
  }, []);

  const createNewRecognition = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        // Clean up existing instance
        if (recognitionRef.current) {
          try {
            console.log('Cleaning up existing recognition instance in createNewRecognition', {
              timestamp: new Date().toISOString(),
              currentState: recordingState,
              isListening: isListening
            });
            recognitionRef.current.abort();
            console.log('Existing recognition instance aborted successfully');
          } catch (e) {
            console.error('Error aborting existing recognition during cleanup:', e, {
              timestamp: new Date().toISOString()
            });
          }
          recognitionRef.current = null;
        }

        // Create new instance
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Changed to false for better control
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          console.log('Speech recognition result received:', {
            resultIndex: event.resultIndex,
            resultsLength: event.results.length,
            timestamp: new Date().toISOString()
          });

          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const newMessage = finalTranscript + interimTranscript;
          console.log('Setting message from speech:', {
            finalTranscript,
            interimTranscript,
            combinedLength: newMessage.length,
            previousMessage: message
          });

          setMessage(newMessage);
        };

        recognition.onerror = (event: any) => {
          // Suppress abort errors as they are intentional stops, not actual errors
          if (event.error === 'aborted') {
            // Silent handling for intentional aborts - just cleanup
            recognitionRef.current = null;
            return;
          }

          // Log only non-abort errors
          console.error('Speech recognition error:', event.error, {
            currentRecordingState: recordingState,
            isListening: isListening,
            timestamp: new Date().toISOString(),
            errorType: event.error,
            errorMessage: event.message || 'No message',
            stackTrace: new Error().stack // Add stack trace to see call origin
          });

          // Reset states for actual errors
          setRecordingState('idle');
          setIsListening(false);
          recognitionRef.current = null;
        };

        recognition.onend = () => {
          console.log('Speech recognition ended, current state:', recordingState, {
            timestamp: new Date().toISOString(),
            wasAborted: recognitionRef.current === null,
            mediaRecorderState: mediaRecorderState,
            currentMessage: message,
            messageLength: message.length
          });
          setIsListening(false);

          // Keep recording state active - user can continue speaking
          // Don't reset to idle unless explicitly stopped
          if (recordingState === 'recording') {
            console.log('Recording session still active - ready for more speech');
            // Keep showResumeButton true so user can pause/resume/stop
            // The session remains active for continued speaking
          }

          recognitionRef.current = null;
        };

        recognition.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };

        recognition.onaudiostart = () => {
          console.log('Audio capture started');
        };

        recognition.onsoundstart = () => {
          console.log('Sound detected - speaking...');
        };

        recognition.onsoundend = () => {
          console.log('Sound ended - stopped speaking');
        };

        recognition.onaudioend = () => {
          console.log('Audio capture ended');
        };

        recognitionRef.current = recognition;
        return recognition;
      }
    }
    return null;
  };

  const startRecording = async () => {
    if (!disabled) {
      console.log('Start recording clicked, current state:', recordingState);

      // Check if MediaRecorder is supported
      if (!MediaRecordingManager.isSupported()) {
        console.warn('MediaRecorder not supported, falling back to Speech Recognition');
        setPlaceholderText('');
        return startSpeechRecognition();
      }

      try {
        // Ensure MediaRecorder manager exists (should be initialized in useEffect)
        if (!mediaRecorderRef.current) {
          console.error('MediaRecorder manager not available');
          return;
        }

        // Initialize MediaRecorder with audio constraints
        const initialized = await mediaRecorderRef.current.initializeRecording(
          { audio: true, video: false },
          { mimeType: 'audio/webm' }
        );

        if (initialized) {
          const started = mediaRecorderRef.current.startRecording();
          if (started) {
            setRecordingState('recording');
            setIsListening(true);
            setPlaceholderText('Recording your audio...');
            console.log('MediaRecorder started successfully');
          } else {
            console.error('Failed to start MediaRecorder');
            setRecordingState('idle');
            setIsListening(false);
            setPlaceholderText(placeholder || "Ask anything about your emails");
          }
        } else {
          console.error('Failed to initialize MediaRecorder');
          setRecordingState('idle');
          setIsListening(false);
          setPlaceholderText(placeholder || "Ask anything about your emails");
        }
      } catch (error) {
        console.error('MediaRecorder error:', error);
        alert('Audio recording failed. Please check microphone permissions and try again.');
        setRecordingState('idle');
        setIsListening(false);
        setShowResumeButton(false);
        setPlaceholderText(placeholder || "Ask anything about your emails");
      }
    }
  };

  const startSpeechRecognition = async () => {
    try {
      console.log('startSpeechRecognition: Creating recognition instance...');

      const recognition = createNewRecognition();
      if (recognition) {
        console.log('startSpeechRecognition: Starting speech recognition...');
        recognition.start();
        setPlaceholderText('Recording your audio...');
      } else {
        console.error('startSpeechRecognition: Failed to create recognition instance');
        setPlaceholderText(placeholder || "Ask anything about your emails");
      }
    } catch (error) {
      console.error('startSpeechRecognition: Error during speech recognition setup:', {
        error: error instanceof Error ? error.message : error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      setPlaceholderText(placeholder || "Ask anything about your emails");
    }
  };

  const pauseRecording = () => {
    console.log('Pause button clicked, current state:', recordingState, {
      timestamp: new Date().toISOString(),
      hasRecognition: !!recognitionRef.current,
      mediaRecorderState: mediaRecorderRef.current?.getState()
    });

    // Pause MediaRecorder if available and recording
    if (mediaRecorderRef.current) {
      const mediaState = mediaRecorderRef.current.getState();
      if (mediaState.isRecording) {
        const paused = mediaRecorderRef.current.pauseRecording();
        if (paused) {
          console.log('MediaRecorder paused successfully');
        } else {
          console.warn('MediaRecorder pause failed');
        }
      } else {
        console.log('MediaRecorder not in recording state, current state:', mediaState.state);
      }
    }

    // Also pause speech recognition
    if (recognitionRef.current && recordingState === 'recording') {
      try {
        console.log('Pausing speech recognition - calling stop()', {
          timestamp: new Date().toISOString(),
          currentState: recordingState,
          isListening: isListening,
          hasMessage: !!message.trim()
        });
        recognitionRef.current.stop();
        console.log('Speech recognition stop requested successfully');
      } catch (error) {
        console.error('Error stopping speech recognition:', error, {
          timestamp: new Date().toISOString(),
          currentState: recordingState
        });
      }
      setRecordingState('paused');
      setIsListening(false);
      console.log('Speech recognition paused - states updated');
    } else {
      console.log('Speech recognition not active or not in recording state', {
        hasRecognition: !!recognitionRef.current,
        recordingState: recordingState,
        isListening: isListening
      });
    }
  };

  const resumeRecording = async () => {
    if (recordingState === 'paused' && !disabled) {
      console.log('Resume button clicked, resuming recording...');

      // Resume MediaRecorder if available and paused
      if (mediaRecorderRef.current) {
        const mediaState = mediaRecorderRef.current.getState();
        if (mediaState.isPaused) {
          const resumed = mediaRecorderRef.current.resumeRecording();
          if (resumed) {
            console.log('MediaRecorder resumed successfully');
          } else {
            console.warn('MediaRecorder resume failed');
          }
        } else {
          console.log('MediaRecorder not in paused state, current state:', mediaState.state);
        }
      }

      // Resume speech recognition
      try {
        const recognition = createNewRecognition();
        if (recognition) {
          setRecordingState('recording');
          setIsListening(true);
          recognition.start();
          setPlaceholderText('Recording your audio...');
          console.log('Speech recognition resumed');
        } else {
          console.error('Failed to create recognition instance for resume');
          setRecordingState('idle');
          setIsListening(false);
          setPlaceholderText(placeholder || "Ask anything about your emails");
        }
      } catch (error) {
        console.error('Error resuming speech recognition:', error);
        setRecordingState('idle');
        setIsListening(false);
        setPlaceholderText(placeholder || "Ask anything about your emails");
      }
    } else {
      console.log('Resume ignored - state:', recordingState, 'disabled:', disabled);
    }
  };

  const stopRecording = () => {
    console.log('Stop button clicked, stopping recording completely...', {
      timestamp: new Date().toISOString(),
      currentRecordingState: recordingState,
      hasRecognition: !!recognitionRef.current,
      mediaRecorderState: mediaRecorderRef.current?.getState(),
      currentMessage: message
    });

    // Stop MediaRecorder if available and actively recording
    if (mediaRecorderRef.current) {
      const mediaState = mediaRecorderRef.current.getState();
      if (mediaState.isRecording || mediaState.isPaused) {
        mediaRecorderRef.current.stopRecording();
        console.log('MediaRecorder stopped');
      }
    }

    // Stop speech recognition - use abort to force immediate stop
    if (recognitionRef.current) {
      try {
        console.log('Aborting speech recognition via stopRecording()', {
          timestamp: new Date().toISOString(),
          currentState: recordingState,
          isListening: isListening,
          hasMessage: !!message.trim()
        });
        recognitionRef.current.abort();
        console.log('Speech recognition aborted successfully');
      } catch (error) {
        console.error('Error aborting speech recognition:', error, {
          timestamp: new Date().toISOString(),
          currentState: recordingState
        });
      }
      recognitionRef.current = null;
    }

    // Force cleanup of any remaining media streams
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.cleanup();
      console.log('MediaRecorder cleanup completed');
    }

    // Reset all states immediately
    setRecordingState('idle');
    setMediaRecorderState('idle');
    setIsListening(false);
    setShowResumeButton(false);
    setPlaceholderText(placeholder || "Ask anything about your emails");

    console.log('Recording stopped completely - all states reset, message preserved:', message);
  };

  const cancelRecording = () => {
    console.log('Cancel recording clicked - deleting all recorded data...', {
      timestamp: new Date().toISOString(),
      currentRecordingState: recordingState,
      hasRecognition: !!recognitionRef.current,
      mediaRecorderState: mediaRecorderRef.current?.getState(),
      currentMessage: message
    });

    // Stop MediaRecorder if available and actively recording
    if (mediaRecorderRef.current) {
      const mediaState = mediaRecorderRef.current.getState();
      if (mediaState.isRecording || mediaState.isPaused) {
        mediaRecorderRef.current.stopRecording();
        console.log('MediaRecorder stopped for cancellation');
      }
    }

    // Stop speech recognition - use abort to force immediate stop
    if (recognitionRef.current) {
      try {
        console.log('Aborting speech recognition via cancelRecording()', {
          timestamp: new Date().toISOString(),
          currentState: recordingState,
          isListening: isListening,
          hasMessage: !!message.trim()
        });
        recognitionRef.current.abort();
        console.log('Speech recognition aborted successfully');
      } catch (error) {
        console.error('Error aborting speech recognition:', error, {
          timestamp: new Date().toISOString(),
          currentState: recordingState
        });
      }
      recognitionRef.current = null;
    }

    // Force cleanup of any remaining media streams
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.cleanup();
      console.log('MediaRecorder cleanup completed');
    }

    // Clear the transcribed message and reset all states
    setMessage('');
    setRecordingState('idle');
    setMediaRecorderState('idle');
    setIsListening(false);
    setShowResumeButton(false);
    setPlaceholderText(placeholder || "Ask anything about your emails");

    // Clear recorded blob
    recordedBlobRef.current = null;

    console.log('Recording cancelled completely - all data cleared and states reset');
  };

  const confirmRecording = async () => {
    setIsTranscribing(true);
    console.log('Confirm recording clicked - processing speech-to-text...', {
      timestamp: new Date().toISOString(),
      currentRecordingState: recordingState,
      hasRecognition: !!recognitionRef.current,
      mediaRecorderState: mediaRecorderRef.current?.getState(),
      currentMessage: message,
      messageLength: message.length
    });

    // Stop MediaRecorder if available and actively recording
    if (mediaRecorderRef.current) {
      const mediaState = mediaRecorderRef.current.getState();
      if (mediaState.isRecording || mediaState.isPaused) {
        mediaRecorderRef.current.stopRecording();
        console.log('MediaRecorder stopped for confirmation');
      }
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        console.log('Speech recognition aborted successfully');
      } catch (error) {
        console.error('Error aborting speech recognition:', error);
      }
      recognitionRef.current = null;
    }

    // Wait for MediaRecorder to complete and set the blob
    await new Promise(resolve => setTimeout(resolve, 500));

    const blob = recordedBlobRef.current;
    console.log('Confirm recording - blob available:', !!blob, blob?.size);

    if (blob) {
      console.log('Sending audio blob to Assembly AI for transcription:', blob.size, 'bytes');

      try {
        const formData = new FormData();
        formData.append('audio', blob);

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        console.log('Transcription API response:', data);

        if (data.transcription) {
          console.log('Transcription received:', data.transcription);
          setMessage(data.transcription);
        } else {
          console.error('No transcription received:', data);
        }
      } catch (error) {
        console.error('Error transcribing audio:', error);
        // Fallback to existing message if transcription fails
      }
    } else {
      console.error('No audio blob available for transcription');
    }

    // Force cleanup of any remaining media streams
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.cleanup();
      console.log('MediaRecorder cleanup completed');
    }

    // Reset recording states
    setRecordingState('idle');
    setMediaRecorderState('idle');
    setIsListening(false);
    setShowResumeButton(false);
    setPlaceholderText(placeholder || "Ask anything about your emails");

    // Clear recorded blob
    recordedBlobRef.current = null;

    console.log('Recording confirmed - transcription completed, message ready for sending:', message);

    // Auto-submit the transcribed message if we have content
    if (message.trim()) {
      console.log('Auto-submitting transcribed message:', message.trim());
      setTimeout(() => {
        handleSubmit();
      }, 100);
    }

    setIsTranscribing(false);
  };





  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="relative group transition-all duration-500">
        {/* Glow effect on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-neutral-800 to-neutral-700 rounded-[2.5rem] blur opacity-10 group-hover:opacity-30 transition duration-1000"></div>

        <div className="relative flex flex-col bg-[#0f0f0f] border border-neutral-800/40 rounded-[2.5rem] shadow-2xl backdrop-blur-sm px-7 py-4 focus-within:border-neutral-800/40 focus-within:ring-0 focus-within:outline-none">
          {/* Recording indicator */}
          {(recordingState === 'recording' || recordingState === 'paused') && (
            <div className="absolute -top-3 left-10 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full flex items-center gap-2 z-10">
              <div className={`w-2 h-2 rounded-full ${recordingState === 'recording' ? 'bg-white animate-pulse' : 'bg-neutral-500'}`}></div>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">
                {recordingState === 'recording' ? 'Recording' : 'Paused'}
              </span>
            </div>
          )}

          {/* Selected Emails Display */}
          {selectedEmails.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 pt-1 font-sans">
              {selectedEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center bg-neutral-900/80 rounded-full px-3 py-1.5 text-[11px] border border-neutral-800 hover:border-neutral-700 transition-colors group/item"
                >
                  <Mail className="w-3 h-3 mr-2 text-neutral-500" />
                  <span className="text-neutral-300 truncate max-w-[150px]" title={email.subject}>
                    {email.subject}
                  </span>
                  <button
                    onClick={() => removeSelectedEmail(email.id)}
                    className="ml-2 p-0.5 hover:bg-neutral-800 rounded-full text-neutral-600 hover:text-white transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3 min-h-[56px]">
            {/* Left side icons */}
            <div className="flex items-center gap-2 mb-1.5 flex-shrink-0">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onModalStateChange?.(true)}
                      className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full transition-all duration-200 outline-none border-none focus:ring-0 focus:outline-none"
                    >
                      <Plus className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Integrations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onEmailModalStateChange?.(true)}
                      className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full transition-all duration-200 relative outline-none border-none focus:ring-0 focus:outline-none"
                    >
                      <EmailIcon className="w-5 h-5" strokeWidth={1.5} />
                      <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.6)]"></div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Attach email</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex-1 relative min-w-0 py-3">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholderText}
                disabled={disabled}
                className="w-full resize-none bg-transparent text-white placeholder:text-neutral-600 focus:outline-none focus:ring-0 focus:ring-offset-0 ring-0 focus-visible:ring-0 focus-visible:outline-none border-none p-0 min-h-[28px] max-h-32 text-[16px] leading-relaxed overflow-y-auto scrollbar-none selection:bg-neutral-800 font-sans"
                rows={1}
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>

            {/* Right side icons */}
            <div className="flex items-center gap-2 mb-1.5 flex-shrink-0">
              {recordingState !== 'idle' ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={cancelRecording}
                    className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all outline-none focus:ring-0"
                    title="Cancel"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setIsTranscribing(true); confirmRecording(); }}
                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-all outline-none focus:ring-0"
                    disabled={isTranscribing}
                  >
                    {isTranscribing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={startRecording}
                        disabled={disabled}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 outline-none border-none focus:ring-0 focus:outline-none ${isListening ? 'text-white bg-white/10 animate-pulse' : 'text-neutral-500 hover:text-white hover:bg-neutral-800'}`}
                      >
                        {isListening ? (
                          <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                        ) : (
                          <Mic className="w-5 h-5" strokeWidth={1.5} />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Voice Input</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <button
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                className={`w-10 h-10 flex items-center justify-center transition-all duration-300 rounded-full outline-none border-none focus:ring-0 focus:outline-none ${message.trim() ? 'bg-white text-black hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-neutral-800 text-neutral-600 opacity-40'} disabled:cursor-not-allowed`}
              >
                <Send className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        textarea:focus, 
        textarea:active, 
        textarea:focus-visible {
          outline: 1px solid #0f0f0f !important;
          box-shadow: 0 0 0 1px #0f0f0f !important;
          border: none !important;
          background-color: transparent !important;
          -webkit-appearance: none !important;
        }
        
        textarea {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
