import React, { forwardRef, useState, useEffect, useRef, useCallback, createContext, useContext, TextareaHTMLAttributes, ElementRef, ComponentPropsWithoutRef } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, BrainCog, Monitor, FileText, Film, Music, Globe, Mail, Search, Infinity, Workflow, Bug, MessageSquare, Check, ChevronDown, Plus, Plug, Database, Calendar, Layout } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectorsModal } from './connectors-modal';

// Utility function for className merging
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");

// Embedded CSS for minimal custom styles
const styles = `
  *:focus-visible {
    outline-offset: 0 !important;
    --ring-offset: 0 !important;
  }
  textarea::-webkit-scrollbar {
    width: 6px;
  }
  textarea::-webkit-scrollbar-track {
    background: transparent;
  }
  textarea::-webkit-scrollbar-thumb {
    background-color: #444444;
    border-radius: 3px;
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: #555555;
  }
`;

// Inject styles into document (with check for SSR/re-renders)
if (typeof document !== 'undefined' && !document.getElementById('ai-prompt-box-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = 'ai-prompt-box-styles';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

// Textarea Component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border-none bg-transparent px-3 py-3 text-base text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[60px] resize-none scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-500",
      className
    )}
    ref={ref}
    rows={props.rows || 2}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// Tooltip Components
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-[#333333] bg-black px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Dialog Components
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#333333] bg-black p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2E3033]/80 p-2 hover:bg-[#2E3033] transition-all">
        <X className="h-5 w-5 text-gray-200 hover:text-white" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-gray-100", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-white hover:bg-white/80 text-black",
      outline: "border border-white/10 bg-transparent hover:bg-white/5",
      ghost: "bg-transparent hover:bg-white/5",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// VoiceRecorder Component
interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
}
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isRecording) {
      onStartRecording();
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onStopRecording(time);
      setTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, onStartRecording, onStopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">{formatTime(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {[...Array(visualizerBars)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-white/50 animate-pulse"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ImageViewDialog Component
interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}
const ImageViewDialog: React.FC<ImageViewDialogProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-black rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-2xl"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => { },
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});
function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
}

interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}
const PromptInput = forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
      onFocus,
      onBlur,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };
    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          <div
            ref={ref}
            onFocus={onFocus}
            onBlur={onBlur}
            className={cn(
              "rounded-3xl border border-white/10 bg-[#2b2b2b] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300",
              isLoading && "border-red-500/70",
              className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  }
);
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
}
const PromptInputTextarea: React.FC<PromptInputTextareaProps & React.ComponentProps<typeof Textarea>> = ({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  ...props
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};

interface PromptInputActionsProps {
  children: React.ReactNode;
  className?: string;
}
const PromptInputActions: React.FC<PromptInputActionsProps> = ({ children, className }) => (
  <div className={cn("flex items-center gap-2", className)}>
    {children}
  </div>
);

interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}
const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

// Custom Divider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1px] mx-0.5">
    <div className="absolute inset-0 bg-white/10 rounded-full" />
  </div>
);

// Helper for file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Main PromptInputBox Component
interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[], options?: { isDeepThinking?: boolean; isCanvas?: boolean; isSearch?: boolean; isPlanMode?: boolean }) => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  onSearchClick?: () => void;
  onAttachEmailClick?: () => void;
  onPersonalityClick?: () => void;
  selectedEmailsCount?: number;
  suggestionInput?: { text: string; id: number };
  activeMode?: 'agent' | 'plan';
  onModeChange?: (mode: 'agent' | 'plan') => void;
  showConnectBanner?: boolean;
}

const MODES = [
  { id: 'agent', label: 'Agent', icon: Infinity, description: 'Autonomous agent for complex workflows' },
  { id: 'plan', label: 'Plan', icon: Workflow, description: 'Create detailed plans for accomplishing tasks' },
] as const;

type AgentMode = typeof MODES[number]['id'];

export const PromptInputBox = forwardRef<HTMLDivElement, PromptInputBoxProps>((props, ref) => {
  const {
    onSend = () => { },
    onStop,
    isLoading = false,
    placeholder = "Assign a task or ask anything",
    className,
    onSearchClick,
    onAttachEmailClick,
    onPersonalityClick,
    selectedEmailsCount = 0
  } = props;

  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [filePreviews, setFilePreviews] = React.useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [activeMode, setActiveMode] = React.useState<AgentMode>(props.activeMode || 'agent');
  const [isModeMenuOpen, setIsModeMenuOpen] = React.useState(false);
  const [isConnectorsModalOpen, setIsConnectorsModalOpen] = React.useState(false);
  const [isDismissedConnectBanner, setIsDismissedConnectBanner] = React.useState(false);
  const [integrationStatuses, setIntegrationStatuses] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/integrations/status');
        if (res.ok) {
          const data = await res.json();
          const statuses: Record<string, boolean> = {};
          Object.entries(data.integrations).forEach(([key, val]: [string, any]) => {
            statuses[key] = (val as any).connected;
          });
          setIntegrationStatuses(statuses);
        }
      } catch (err) {
        console.error('Failed to fetch integration status:', err);
      }
    };
    fetchStatus();
  }, []);
  const recognitionRef = React.useRef<any>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const promptBoxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.suggestionInput) {
      setInput(props.suggestionInput.text);
    }
  }, [props.suggestionInput]);

  const handleModeChange = (mode: AgentMode) => {
    setActiveMode(mode);
    props.onModeChange?.(mode);
    setIsModeMenuOpen(false);
  };

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    if (type.includes('video')) return <Film className="w-8 h-8 text-blue-400" />;
    if (type.includes('audio')) return <Music className="w-8 h-8 text-green-400" />;
    return <FileText className="w-8 h-8 text-gray-400" />;
  };

  const processFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return;
    }

    setFiles(prev => [...prev, file]);

    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreviews(prev => ({ ...prev, [file.name]: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(processFile);
  }, []);

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove && filePreviews[fileToRemove.name]) {
      const newPreviews = { ...filePreviews };
      delete newPreviews[fileToRemove.name];
      setFilePreviews(newPreviews);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openImageModal = (imageUrl: string) => setSelectedImage(imageUrl);

  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1 || items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
        }
      }
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      onSend(input, files, {
        isDeepThinking: activeMode === 'plan',
        isCanvas: activeMode === 'plan',
        isSearch: activeMode === 'agent',
        isPlanMode: activeMode === 'plan'
      });
      setInput("");
      setFiles([]);
      setFilePreviews({});
    }
  };

  const handleStartRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopRecording = (duration: number) => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const hasContent = input.trim() !== "" || files.length > 0;

  return (
    <>
      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        disabled={isLoading || isRecording}
        ref={(node) => {
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          (promptBoxRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "w-full bg-[#2b2b2b] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out focus:ring-0 focus:outline-none focus-within:ring-0 focus-within:outline-none",
          isRecording && "border-red-500/70",
          className
        )}
      >
        <AnimatePresence>
          {files.length > 0 && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 p-2 pb-1 transition-all duration-300"
            >
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group"
                >
                  <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden p-1 flex items-center gap-2 pr-3 min-w-[120px] max-w-[200px]">
                    {isImageFile(file) && filePreviews[file.name] ? (
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => openImageModal(filePreviews[file.name])}
                      >
                        <img
                          src={filePreviews[file.name]}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center">
                        {getFileIcon(file)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/70 truncate font-medium">{file.name}</p>
                      <p className="text-[9px] text-white/30 font-mono">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                      className="rounded-full bg-black/40 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={cn(
            "transition-all duration-300",
            isRecording ? "h-0 overflow-hidden opacity-0" : "opacity-100"
          )}
        >
          <PromptInputTextarea
            placeholder={
              activeMode === 'plan'
                ? "Describe the goal for your plan..."
                : activeMode === 'agent'
                  ? "Describe a mission for the agent..."
                  : placeholder
            }
            className="text-base"
          />
        </div>

        {isRecording && (
          <VoiceRecorder
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}

        <PromptInputActions className="flex items-center justify-between gap-1 p-0 pt-2 border-t border-white/[0.05] mt-1 relative z-10">
          <div
            className={cn(
              "flex items-center gap-2 transition-opacity duration-300",
              isRecording ? "opacity-0 invisible h-0" : "opacity-100 visible"
            )}
          >
            {/* Mode Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[#F97316]"
              >
                {React.createElement(MODES.find(m => m.id === activeMode)?.icon || Workflow, { className: "w-3.5 h-3.5" })}
                <span className="text-[12px] font-bold tracking-tight capitalize">{activeMode}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isModeMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isModeMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsModeMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden p-1.5"
                    >
                      {MODES.map((mode) => (
                        <div key={mode.id} className="relative group">
                          <button
                            type="button"
                            onClick={() => handleModeChange(mode.id)}
                            className={cn(
                              "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                              activeMode === mode.id 
                                ? "bg-white/5 text-white" 
                                : "hover:bg-white/[0.03] text-white/40 hover:text-white/80"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <mode.icon className={cn("w-4 h-4", activeMode === mode.id ? "text-[#F97316]" : "text-inherit")} />
                              <span className="text-[13px] font-bold">{mode.label}</span>
                            </div>
                            {activeMode === mode.id && <Check className="w-3.5 h-3.5 text-[#F97316]" />}
                          </button>

                          {/* Tooltip / Description for each mode on hover */}
                          <div className="absolute left-full ml-2 top-0 invisible group-hover:visible w-48 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-xl z-[80]">
                            <p className="text-[11px] text-white/60 leading-relaxed">
                              {mode.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            <PromptInputAction tooltip="Upload files">
              <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/10 rounded-full mr-1">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex h-6 w-6 text-white/40 cursor-pointer items-center justify-center rounded-full transition-all hover:bg-white/10 hover:text-white"
                  disabled={isRecording}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        Array.from(e.target.files).forEach(processFile);
                      }
                      if (e.target) e.target.value = "";
                    }}
                  />
                </button>
              </div>
            </PromptInputAction>

          </div>

          <PromptInputAction
            tooltip={
              isLoading
                ? "Stop generation"
                : isRecording
                  ? "Stop recording"
                  : hasContent
                    ? "Send message"
                    : "Voice message"
            }
          >
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center font-medium h-8 w-8 rounded-full transition-all duration-200 outline-none",
                isRecording
                  ? "bg-transparent hover:bg-white/5 text-red-500 hover:text-red-400"
                  : isLoading
                    ? "bg-white hover:bg-white/80 text-black"
                    : hasContent
                      ? "bg-white hover:bg-white/80 text-black"
                      : "bg-transparent hover:bg-white/5 text-white/40 hover:text-white/60"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (isLoading && onStop) onStop();
                else if (isRecording) setIsRecording(false);
                else if (hasContent) handleSubmit();
                else setIsRecording(true);
              }}
              disabled={isLoading && !onStop}
            >
              {isLoading ? (
                <Square className="h-4 w-4 fill-white" />
              ) : isRecording ? (
                <StopCircle className="h-5 w-5 text-red-500" />
              ) : hasContent ? (
                <ArrowUp className="h-4 w-4 text-black" />
              ) : (
                <Mic className="h-5 w-5 text-[#9CA3AF] transition-colors" />
              )}
            </button>
          </PromptInputAction>
        </PromptInputActions>

        {/* Connect Banner - Manus Aesthetic Refinement */}
        <AnimatePresence>
          {props.showConnectBanner && !isDismissedConnectBanner && !isRecording && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between group"
            >
              <button 
                onClick={() => setIsConnectorsModalOpen(true)}
                className="flex items-center gap-2.5 text-white/50 hover:text-white/90 transition-all text-[13px] font-medium tracking-tight"
              >
                <div className="w-5 h-5 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <Plug className="w-3.5 h-3.5" />
                </div>
                Connect your tools to Arcus
              </button>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center -space-x-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  {/* Google Calendar */}
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/5 flex items-center justify-center backdrop-blur-md overflow-hidden">
                    <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 141.7 141.7"><path fill="#fff" d="M95.8,45.9H45.9V95.8H95.8Z"/><path fill="#34a853" d="M95.8,95.8H45.9v22.5H95.8Z"/><path fill="#4285f4" d="M95.8,23.4H30.9a7.55462,7.55462,0,0,0-7.5,7.5V95.8H45.9V45.9H95.8Z"/><path fill="#188038" d="M23.4,95.8v15a7.55462,7.55462,0,0,0,7.5,7.5h15V95.8Z"/><path fill="#fbbc04" d="M118.3,45.9H95.8V95.8h22.5Z"/><path fill="#1967d2" d="M118.3,45.9v-15a7.55462,7.55462,0,0,0-7.5-7.5h-15V45.9Z"/><path fill="#ea4335" d="M95.8,118.3l22.5-22.5H95.8Z"/></svg>
                  </div>
                  {/* Notion */}
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/5 flex items-center justify-center backdrop-blur-md overflow-hidden">
                    <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#fff" fillRule="evenodd" d="m5.2,47.56s8,10.37,8.48,10.83c1.16,1.11,2.73,1.69,4.33,1.6,8.37-.42,27.54-1.38,35.57-1.78,3.11-.16,5.55-2.72,5.56-5.83l.1-35.5c0-1.99-1.03-3.83-2.72-4.87t0,0c-2.99-1.84-8.91-5.49-10.7-6.68-1.46-.97-3.2-1.43-4.96-1.32-5.96.38-23.45,1.51-30.85,1.98-2.96.19-5.24,2.62-5.24,5.54v34.78c0,.45.15.89.43,1.24h0Zm50.01-28.91v.02l-.1,33.7c0,.97-.77,1.77-1.74,1.82l-35.57,1.78c-.5.03-.99-.16-1.35-.5-.36-.34-.57-.82-.57-1.32V20.71c0-.97.75-1.77,1.72-1.82l35.67-2.06c.5-.03.99.15,1.36.5.36.34.57.82.57,1.32h0Zm-11.98,21.42v-13.72c-.63-.72-1.63-.67-3.07-1.11-.1-.03-.19-.11-.23-.21-.04-.1-.03-.22.03-.31,1.72-2.53,6.63-.95,9.83-1.96.09-.03.2-.02.28.05.08.07.11.17.09.27-.31,1.39-1.4,2.1-2.95,2.4v22.57c0,.75-.45,1.44-1.15,1.72-.64.26-1.31.54-1.31.54-1.54.8-3.43.29-4.37-1.17l-11.46-17.87v16.27c.62.72,1.63.67,3.07,1.11.1.03.19.11.23.21.04.1.03.22-.03.31-1.73,2.53-6.63.95-9.83,1.96-.09.04-.2.02-.28-.05-.08-.06-.11-.17-.09-.27.31-1.39,1.4-2.1,2.95-2.4v-21.31l-3.02-.29s.21-2.45,3.09-2.73c1.42-.14,5.13-.3,6.47-.36.3-.01.59.13.77.38l10.99,15.95h0ZM15.03,14.28c.55.42,1.24.63,1.93.59,5.09-.29,26.82-1.53,32.21-1.84.17-.01.31-.13.35-.29.04-.16-.03-.33-.17-.42-2.39-1.49-4.74-2.95-5.76-3.63-.73-.48-1.6-.71-2.48-.66,0,0-24.7,1.36-29.78,1.91-.64.07-.78.3-.8.39-.09.31.02.54.27.74,1.02.78,3.07,2.33,4.23,3.21h0Z"/></svg>
                  </div>
                  {/* Slack */}
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/5 flex items-center justify-center backdrop-blur-md overflow-hidden">
                    <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M27.255 80.719c0 7.33-5.978 13.317-13.309 13.317C6.616 94.036.63 88.049.63 80.719s5.987-13.317 13.317-13.317h13.309zm6.709 0c0-7.33 5.987-13.317 13.317-13.317s13.317 5.986 13.317 13.317v33.335c0 7.33-5.986 13.317-13.317 13.317-7.33 0-13.317-5.987-13.317-13.317zm0 0" fill="#de1c59"/><path d="M47.281 27.255c-7.33 0-13.317-5.978-13.317-13.309C33.964 6.616 39.951.63 47.281.63s13.317 5.987 13.317 13.317v13.309zm0 6.709c7.33 0 13.317 5.987 13.317 13.317s-5.986 13.317-13.317 13.317H13.946C6.616 60.598.63 54.612.63 47.281c0-7.33 5.987-13.317 13.317-13.317zm0 0" fill="#35c5f0"/><path d="M100.745 47.281c0-7.33 5.978-13.317 13.309-13.317 7.33 0 13.317 5.987 13.317 13.317s-5.987 13.317-13.317 13.317h-13.309zm-6.709 0c0 7.33-5.987 13.317-13.317 13.317s-13.317-5.986-13.317-13.317V13.946C67.402 6.616 73.388.63 80.719.63c7.33 0 13.317 5.987 13.317 13.317zm0 0" fill="#2eb57d"/><path d="M80.719 100.745c7.33 0 13.317 5.978 13.317 13.309 0 7.33-5.987 13.317-13.317 13.317s-13.317-5.987-13.317-13.317v-13.309zm0-6.709c-7.33 0-13.317-5.987-13.317-13.317s5.986-13.317 13.317-13.317h33.335c7.33 0 13.317 5.986 13.317 13.317 0 7.33-5.987 13.317-13.317 13.317zm0 0" fill="#ebb02e"/></svg>
                  </div>
                  {/* Cal.com */}
                  <div className="w-5 h-5 rounded-full bg-white border border-white/5 flex items-center justify-center backdrop-blur-md overflow-hidden">
                    <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M458 512H56c-30.4 0-55-24.6-55-55V55C1 24.6 25.6 0 56 0h402c30.4 0 55 24.6 55 55v402c0 30.4-24.6 55-55 55" style={{ fill: '#fff' }}/><path d="M162.8 347.3c-50.4 0-88.4-39.9-88.4-89.3s35.9-89.6 88.4-89.6c27.9 0 47 8.6 62.1 28l-24.3 20.1c-10.1-10.8-22.5-16.2-37.8-16.2-34.1 0-52.8 26.1-52.8 57.6s20.5 57.1 52.8 57.1c15.1 0 28-5.3 38.4-16.2l23.9 21c-14.5 18.9-34.3 27.5-62.3 27.5m166.4-131.2h32.7v128.1h-32.7v-18.7c-6.7 13.2-18.1 22.2-39.7 22.2-34.6 0-62.3-30.1-62.3-66.9 0-37 27.7-66.9 62.3-66.9 21.5 0 33 8.9 39.7 22.2zm1.1 64.5c0-20-13.8-36.6-35.4-36.6-20.8 0-34.4 16.7-34.4 36.6 0 19.4 13.6 36.6 34.4 36.6 21.4 0 35.4-16.7 35.4-36.6M385 164.3h32.7v179.6H385z" style={{ fill: '#242424' }}/></svg>
                  </div>
                  {/* Google Meet */}
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/5 flex items-center justify-center backdrop-blur-md overflow-hidden">
                    <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#00ac47" d="M24,21.45V25a2.0059,2.0059,0,0,1-2,2H9V21h9V16Z"/><polygon fill="#31a950" points="24 11 24 21.45 18 16 18 11 24 11"/><polygon fill="#ea4435" points="9 5 9 11 3 11 9 5"/><rect width="6" height="11" x="3" y="11" fill="#4285f4"/><path fill="#ffba00" d="M24,7v4h-.5L18,16V11H9V5H22A2.0059,2.0059,0,0,1,24,7Z"/><path fill="#0066da" d="M9,21v6H5a2.0059,2.0059,0,0,1-2-2V21Z"/><path fill="#00ac47" d="M29,8.26V23.74a.9989.9989,0,0,1-1.67.74L24,21.45,18,16l5.5-5,.5-.45,3.33-3.03A.9989.9989,0,0,1,29,8.26Z"/><polygon fill="#188038" points="24 10.55 24 21.45 18 16 23.5 11 24 10.55"/></svg>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDismissedConnectBanner(true)}
                  className="p-1 hover:bg-white/5 rounded-md text-white/10 hover:text-white/30 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PromptInput>

      <ConnectorsModal 
        isOpen={isConnectorsModalOpen} 
        onClose={() => setIsConnectorsModalOpen(false)} 
      />

      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
});

PromptInputBox.displayName = "PromptInputBox";
