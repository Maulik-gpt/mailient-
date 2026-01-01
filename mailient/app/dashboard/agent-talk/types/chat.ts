export interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

export interface ConversationState {
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onModalStateChange?: (isOpen: boolean) => void;
  onEmailModalStateChange?: (isOpen: boolean) => void;
  selectedEmails?: Email[];
  onEmailSelect?: (emails: Email[]) => void;
  onEmailRemove?: (id: string) => void;
}

export interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
}

export interface MessageBubbleProps {
  message: Message;
}