import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Mail, Building2, Lightbulb, ExternalLink } from 'lucide-react';
import { Contact } from '../App';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  recommendations?: ContactRecommendation[];
}

interface ContactRecommendation {
  id: string;
  contactType: 'In Your Network' | 'Suggested Contact' | 'Industry Expert' | 'Mutual Connection';
  name?: string;
  role: string;
  company: string;
  explanation: string;
  suggestedQuestions: string[];
  inNetwork: boolean;
  contactId?: string;
}

interface ChatAssistantProps {
  contacts: Contact[];
  onViewContact: (contact: Contact) => void;
}

export function ChatAssistant({ contacts, onViewContact }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I can help you find the right people to talk to. Just ask me something like "Who should I talk to about AI?" or "Who can help me learn about product management?"',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getRecommendationsForQuery = (query: string): ContactRecommendation[] => {
    const lowerQuery = query.toLowerCase();
    const recommendations: ContactRecommendation[] = [];
    
    const matchingContacts = contacts.filter(contact => {
      const searchableText = `
        ${contact.name} 
        ${contact.title} 
        ${contact.company} 
        ${contact.notes}
        ${contact.keyFacts.map(f => f.text).join(' ')}
        ${contact.funFacts.map(f => f.text).join(' ')}
      `.toLowerCase();
      
      if (lowerQuery.includes('product') || lowerQuery.includes('pm')) {
        return searchableText.includes('product') || searchableText.includes('pm');
      }
      if (lowerQuery.includes('design') || lowerQuery.includes('ux') || lowerQuery.includes('ui')) {
        return searchableText.includes('design') || searchableText.includes('ux') || searchableText.includes('ui');
      }
      if (lowerQuery.includes('engineer') || lowerQuery.includes('tech') || lowerQuery.includes('ai') || lowerQuery.includes('ml')) {
        return searchableText.includes('engineer') || searchableText.includes('ai') || searchableText.includes('ml') || searchableText.includes('quantum');
      }
      if (lowerQuery.includes('marketing') || lowerQuery.includes('growth')) {
        return searchableText.includes('marketing') || searchableText.includes('growth');
      }
      if (lowerQuery.includes('climate') || lowerQuery.includes('sustainability') || lowerQuery.includes('green') || lowerQuery.includes('environmental')) {
        return searchableText.includes('climate') || searchableText.includes('sustainability') || searchableText.includes('green') || searchableText.includes('environment');
      }
      if (lowerQuery.includes('invest') || lowerQuery.includes('vc') || lowerQuery.includes('funding')) {
        return searchableText.includes('invest') || searchableText.includes('fund') || searchableText.includes('venture') || searchableText.includes('capital');
      }
      
      return false;
    });

    matchingContacts.slice(0, 2).forEach(contact => {
      const keyHighlights = contact.keyFacts.slice(0, 2).map(f => f.text).join('. ');
      const explanation = keyHighlights || contact.notes.slice(0, 150) + '...';
      const suggestedQuestions = generateQuestionsForContact(contact, lowerQuery);
      
      recommendations.push({
        id: contact.id,
        contactType: 'In Your Network',
        name: contact.name,
        role: contact.title,
        company: contact.company,
        explanation: explanation,
        suggestedQuestions: suggestedQuestions,
        inNetwork: true,
        contactId: contact.id
      });
    });

    const externalSuggestions = getExternalSuggestions(lowerQuery);
    recommendations.push(...externalSuggestions.slice(0, 2));

    if (recommendations.length === 0) {
      const connectorContacts = contacts.filter(c => 
        c.notes.toLowerCase().includes('network') || 
        c.notes.toLowerCase().includes('intro') ||
        c.title.toLowerCase().includes('ceo') ||
        c.title.toLowerCase().includes('founder')
      ).slice(0, 2);
      
      connectorContacts.forEach(contact => {
        recommendations.push({
          id: contact.id,
          contactType: 'In Your Network',
          name: contact.name,
          role: contact.title,
          company: contact.company,
          explanation: `${contact.name} has a broad network and has mentioned being open to making introductions. They might be able to connect you with relevant people in this area.`,
          suggestedQuestions: [
            'Do you know anyone who works in this area?',
            'Can you point me in the right direction?',
            'Who in your network might be helpful to talk to?'
          ],
          inNetwork: true,
          contactId: contact.id
        });
      });
    }

    return recommendations.length > 0 ? recommendations : getDefaultRecommendations();
  };

  const generateQuestionsForContact = (contact: Contact, query: string): string[] => {
    const questions: string[] = [];
    
    if (contact.keyFacts.some(f => f.category === 'Background')) {
      questions.push(`How did you get into ${contact.title.toLowerCase()}?`);
    } else {
      questions.push(`What path led you to your current role?`);
    }
    
    const professionalFacts = contact.keyFacts.filter(f => f.category === 'Professional');
    if (professionalFacts.length > 0) {
      const fact = professionalFacts[0].text;
      questions.push(`Can you tell me more about ${fact.toLowerCase()}?`);
    }
    
    if (query.includes('learn') || query.includes('break into') || query.includes('start')) {
      questions.push('What advice would you give someone starting in this field?');
    } else {
      questions.push('Do you know others I should talk to in this space?');
    }
    
    return questions.slice(0, 3);
  };

  const getExternalSuggestions = (query: string): ContactRecommendation[] => {
    if (query.includes('aerospace') || query.includes('space')) {
      return [{
        id: 'ext-1',
        contactType: 'Industry Expert',
        role: 'Senior Aerospace Engineer',
        company: 'SpaceX',
        explanation: 'Aerospace engineers at leading companies like SpaceX often attend industry conferences and are active in professional organizations. Look for speakers at aerospace conferences.',
        suggestedQuestions: [
          'What skills are most valuable for breaking into aerospace?',
          'How is the industry evolving with commercial space travel?',
          'What conferences or events would you recommend?'
        ],
        inNetwork: false
      }];
    }
    
    if (query.includes('startup') || query.includes('founder')) {
      return [{
        id: 'ext-2',
        contactType: 'Suggested Contact',
        role: 'Startup Founder',
        company: 'YC Alumni Network',
        explanation: 'Connect with founders through startup communities like YC, TechStars, or local entrepreneurship groups. Many are willing to share their experiences.',
        suggestedQuestions: [
          'What were the biggest challenges in your first year?',
          'How did you find your co-founder?',
          'What resources were most helpful when starting out?'
        ],
        inNetwork: false
      }];
    }

    return [];
  };

  const getDefaultRecommendations = (): ContactRecommendation[] => {
    return contacts.slice(0, 2).map(contact => ({
      id: contact.id,
      contactType: 'In Your Network',
      name: contact.name,
      role: contact.title,
      company: contact.company,
      explanation: `${contact.name} has a broad professional network and experience. They might be able to provide guidance or connect you with relevant people.`,
      suggestedQuestions: [
        'Can you point me in the right direction for this topic?',
        'Do you know anyone who works in this area?',
        'What resources would you recommend?'
      ],
      inNetwork: true,
      contactId: contact.id
    }));
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const recommendations = getRecommendationsForQuery(inputValue);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Great question! Based on your network and industry connections, here are some people you should consider talking to:`,
        timestamp: new Date(),
        recommendations,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleDraftMessage = (recommendation: ContactRecommendation) => {
    alert(`Draft message to ${recommendation.name || recommendation.role}:\n\nThis would open your email client or messaging interface.`);
  };

  const getContactTypeLightColor = (type: string) => {
    switch (type) {
      case 'In Your Network':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700';
      case 'Mutual Connection':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700';
      case 'Industry Expert':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700';
      case 'Suggested Contact':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const quickPrompts = [
    'Who should I talk to about aerospace?',
    'Who can help me with product management?',
    'Who knows about climate tech?',
    'Who can I learn from about design?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="max-w-[85%]">
              {message.content && (
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              )}

              {message.recommendations && message.recommendations.length > 0 && (
                <div className="space-y-3 mt-4 w-full">
                  {message.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 hover:border-teal-300 dark:hover:border-teal-600 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getContactTypeLightColor(rec.contactType)}`}>
                              {rec.contactType}
                            </span>
                          </div>
                          
                          {rec.name && (
                            <h3 className="text-slate-900 dark:text-slate-100 font-medium mb-1">{rec.name}</h3>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{rec.role} at {rec.company}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {rec.explanation}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>Suggested Questions:</span>
                        </div>
                        <ul className="space-y-1.5">
                          {rec.suggestedQuestions.map((question, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600"
                            >
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {rec.inNetwork && rec.contactId ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const contact = contacts.find(c => c.id === rec.contactId);
                              if (contact) onViewContact(contact);
                            }}
                            className="flex-1 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 hover:from-teal-100 hover:to-cyan-100 dark:hover:from-teal-900/50 dark:hover:to-cyan-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View Profile</span>
                          </button>
                          <button
                            onClick={() => handleDraftMessage(rec)}
                            className="flex-1 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <Mail className="w-4 h-4" />
                            <span>Message</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDraftMessage(rec)}
                          className="w-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Draft Message</span>
                        </button>
                      )}
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

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="pb-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
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
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about who to talk to..."
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 disabled:from-slate-200 disabled:to-slate-300 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-all flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}