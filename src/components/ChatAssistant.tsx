import { useEffect, useRef, useState } from 'react';
import { Send, User, Bot, Mail, Building2, Lightbulb, ExternalLink } from 'lucide-react';
import { draftAssistantMessage, sendAssistantMessage } from '../lib/api';
import type { ChatMessage, ChatRecommendation } from '../lib/types';

interface ChatAssistantProps {
  onViewContact: (contactId: number) => void;
}

export function ChatAssistant({ onViewContact }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! Ask who you should talk to, what follow-up to make, or what part of your network is relevant to a topic.',
      timestamp: new Date(),
    },
  ]);
  const [chatSessionId, setChatSessionId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, draftMessage]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setError('');
    setDraftMessage('');
    setIsTyping(true);

    try {
      const response = await sendAssistantMessage({ chatSessionId, content: userMessage.content });
      setChatSessionId(response.chatSessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          type: 'assistant',
          content: response.message.content,
          timestamp: new Date(),
          recommendations: response.message.recommendations,
        },
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send message');
    } finally {
      setIsTyping(false);
    }
  };

  const handleDraftMessage = async (recommendation: ChatRecommendation) => {
    setDraftMessage('');
    try {
      const response = await draftAssistantMessage({
        contactId: recommendation.contactId,
        goal: `connect around ${recommendation.role} at ${recommendation.company}`,
      });
      setDraftMessage(`${response.subject}\n\n${response.body}`);
    } catch (draftError) {
      setDraftMessage(draftError instanceof Error ? draftError.message : 'Unable to draft message');
    }
  };

  const quickPrompts = [
    'Who should I talk to about AI products?',
    'Who in my network seems strongest for climate tech?',
    'Who should I follow up with after my recent conversations?',
    'Who can help me learn more about design leadership?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.recommendations && message.recommendations.length > 0 && (
                <div className="space-y-3 mt-4 w-full">
                  {message.recommendations.map((rec, index) => (
                    <div key={`${message.id}-${index}`} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 hover:border-teal-300 dark:hover:border-teal-600 transition-all shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-1 rounded-full border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700">
                              {rec.contactType}
                            </span>
                          </div>
                          {rec.name && <h3 className="text-slate-900 dark:text-slate-100 font-medium mb-1">{rec.name}</h3>}
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{rec.role} at {rec.company}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{rec.explanation}</p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Suggested Questions:</span>
                        </div>
                        <ul className="space-y-1.5">
                          {rec.suggestedQuestions.map((question) => (
                            <li key={question} className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600">
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-2">
                        {rec.inNetwork && rec.contactId ? (
                          <button
                            onClick={() => onViewContact(rec.contactId!)}
                            className="flex-1 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/50 dark:hover:to-cyan-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View Profile</span>
                          </button>
                        ) : (
                          <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm text-slate-500">
                            External recommendation
                          </div>
                        )}

                        <button
                          onClick={() => void handleDraftMessage(rec)}
                          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Draft</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {message.type === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {draftMessage && <pre className="whitespace-pre-wrap rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{draftMessage}</pre>}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="pb-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInputValue(prompt)}
                className="text-xs bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-full transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleSend()}
            placeholder="Ask about who to talk to..."
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-all flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
