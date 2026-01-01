'use client';

import { Send, Mail, Upload, Loader, History, X } from 'lucide-react';
import { useState } from 'react';

interface AgentMessage {
  id: number;
  type: 'agent';
  content: {
    text: string;
    list: string[];
    footer: string;
  };
  time: string;
}

interface UserMessage {
  id: number;
  type: 'user';
  content: string;
  time: string;
}

type Message = AgentMessage | UserMessage;

interface HistoryItem {
  id: string;
  user_message: string;
  agent_response: string;
  created_at: string;
}

export default function EmailAgentUI() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'agent',
      content: {
        text: "Hello! I'm your AI email agent. I've fetched and analyzed all your emails. You can ask me to:",
        list: [
          'Summarize your emails',
          'Find urgent messages',
          'Categorize emails',
          'Search for specific content',
          'Analyze email trends'
        ],
        footer: 'How can I help you today?'
      },
      time: '4:17:06 PM'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleSend = () => {
    if (message.trim()) {
      const newMessage: UserMessage = {
        id: messages.length + 1,
        type: 'user',
        content: message,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
      };
      setMessages([...messages, newMessage]);
      setIsLoading(true);
      setMessage('');

      // Call the backend API
      fetch('/api/agent-talk/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message, 
          conversationHistory: { messages: messages.slice(-6) } // send recent history
        }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const agentResponse: AgentMessage = {
          id: messages.length + 2,
          type: 'agent',
          // The backend now returns a simple string, so we adapt it.
          // A more robust solution would be to parse markdown from the AI.
          content: { text: data.message, list: [], footer: '' },
          time: new Date(data.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
        };
        setMessages(prev => [...prev, agentResponse]);
      })
      .catch(error => console.error('Error fetching AI response:', error))
      .finally(() => {
        setIsLoading(false);
      });
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/agent-talk/history');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHistory(data.history);
      setIsHistoryOpen(true);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const loadConversationFromHistory = (item: HistoryItem) => {
    const userMsg: UserMessage = { id: 1, type: 'user', content: item.user_message, time: new Date(item.created_at).toLocaleTimeString() };
    const agentMsg: AgentMessage = { 
      id: 2, 
      type: 'agent', 
      content: { text: item.agent_response, list: [], footer: '' }, 
      time: new Date(item.created_at).toLocaleTimeString() 
    };
    setMessages([userMsg, agentMsg]);
    setIsHistoryOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-2">
            <Mail className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-normal">AI Email Agent</h1>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 conversation-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-4">
              {msg.type === 'agent' && (
                <div className="flex-shrink-0">
                  <div className="bg-white rounded-full p-2 w-10 h-10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-black" />
                  </div>
                </div>
              )}
              
              <div className={`flex-1 ${msg.type === 'user' ? 'flex justify-end' : ''}`}>
                <div className={`rounded-2xl p-6 ${
                  msg.type === 'agent' 
                    ? 'bg-zinc-900 max-w-3xl' 
                    : 'bg-zinc-800 max-w-2xl'
                }`}>
                  {msg.type === 'agent' ? (
                    <>
                      <p className="text-gray-100 mb-4">{msg.content.text}</p>
                      <ul className="space-y-2 mb-4">
                        {msg.content.list.map((item, idx) => (
                          <li key={idx} className="text-gray-100">• {item}</li>
                        ))}
                      </ul>
                      <p className="text-gray-100 mb-3">{msg.content.footer}</p>
                      <p className="text-gray-500 text-sm">{msg.time}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-100">{msg.content}</p>
                      <p className="text-gray-500 text-sm mt-2">{msg.time}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="bg-white rounded-full p-2 w-10 h-10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-black" />
                </div>
              </div>
              <div className="flex-1">
                <div className="rounded-2xl p-6 bg-zinc-900 max-w-3xl flex items-center gap-3">
                  <Loader className="w-5 h-5 animate-spin" />
                  <p className="text-gray-400">Thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-6">
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your emails..."
                className="w-full bg-zinc-900 border border-gray-800 rounded-xl px-5 py-4 pr-12 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-700"
              />
            </div>
            <button
              onClick={handleSend}
              className="bg-gray-700 hover:bg-gray-600 rounded-xl p-4 transition-colors flex-shrink-0"
              disabled={!message.trim() || isLoading}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <button className="absolute -bottom-12 right-0 bg-transparent border border-gray-800 rounded-lg p-2 hover:bg-zinc-900 transition-colors">
            <Upload className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}