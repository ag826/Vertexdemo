import { useState } from 'react';
import { Search, Plus, ChevronRight, Users as UsersIcon, Zap, Settings as SettingsIcon, MessageCircle } from 'lucide-react';
import { TranscribingView } from './components/TranscribingView';
import { PersonaCard } from './components/PersonaCard';
import { ContactList } from './components/ContactList';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AllActionsView } from './components/AllActionsView';
import { SettingsView } from './components/SettingsView';
import { ChatAssistant } from './components/ChatAssistant';
import { ThemeProvider } from './components/ThemeContext';
import vertexLogo from 'figma:asset/62edb3c51125a4b122ed2c06dafbbf9a9e7bec60.png';

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedInUrl: string;
  profileImage: string;
  dateAdded: string;
  notes: string;
  keyFacts: Insight[];
  funFacts: Insight[];
  suggestedActions: SuggestedAction[];
  conversationDuration: string;
}

export interface SuggestedAction {
  id: string;
  type: 'email' | 'meeting' | 'follow-up' | 'introduction' | 'share' | 'call';
  title: 'Schedule coffee to discuss AI tools' | 'Send ProductCon ticket info' | 'Introduce to hiring manager';
  description: 'Sarah mentioned interest in AI automation tools for product teams' | 'She\'s speaking at ProductCon in March - offer to attend' | 'TechFlow is hiring 3 product managers in Q2';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  transcript: TranscriptDetail;
}

export interface Insight {
  text: string;
  source: 'Conversation' | 'LinkedIn' | 'Mutual Connection' | 'Website' | 'Social Media' | 'Email';
  category: 'Professional' | 'Personal' | 'Interest' | 'Background' | 'Goal';
  transcript?: TranscriptDetail;
}

export interface TranscriptDetail {
  platform: 'In-Person' | 'Phone Call' | 'Video Call' | 'Email' | 'LinkedIn Message' | 'Text Message';
  occasion: string;
  date: string;
  time: string;
  location?: string;
  fullTranscript: string;
  highlightedText: string;
}

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'recording' | 'persona' | 'actions' | 'settings'>('list');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'contacts' | 'actions' | 'chat' | 'settings'>('contacts');

  // Sample data
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Sarah Chen',
      title: 'VP of Product',
      company: 'TechFlow Inc',
      location: 'San Francisco, CA',
      linkedInUrl: 'linkedin.com/in/sarahchen',
      profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      dateAdded: '2026-02-03',
      notes: 'Met at Tech Summit 2026. Interested in AI automation tools for product teams. Mentioned they\'re hiring 3 product managers in Q2. Has a golden retriever named Max who loves the beach. Planning a trip to Japan in the fall.',
      keyFacts: [
        { 
          text: 'Leading complete product redesign launching in May', 
          source: 'Conversation', 
          category: 'Professional',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Product Leadership Panel',
            date: 'February 3, 2026',
            time: '2:30 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "Yeah, so I'm really excited about what we're building right now. We've been working on this complete product redesign for the past 6 months, and it's finally launching in May. The team has put so much effort into reimagining the entire user experience from the ground up. It's going to be a game-changer for our customers.",
            highlightedText: "We've been working on this complete product redesign for the past 6 months, and it's finally launching in May."
          }
        },
        { 
          text: 'Previously led product at Google for 6 years', 
          source: 'LinkedIn', 
          category: 'Background'
        },
        { 
          text: 'Expert in AI/ML product development', 
          source: 'Conversation', 
          category: 'Professional',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Networking Reception',
            date: 'February 3, 2026',
            time: '4:15 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "My background is really in AI and machine learning products. I spent most of my time at Google working on ML-powered features, and that's what I'm bringing to TechFlow. We're integrating AI into everything we do - it's not just a feature, it's core to our product philosophy.",
            highlightedText: "My background is really in AI and machine learning products."
          }
        },
        { 
          text: 'Speaking at ProductCon in March', 
          source: 'Conversation', 
          category: 'Professional',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Coffee Break Chat',
            date: 'February 3, 2026',
            time: '3:45 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "Oh, and I'm actually speaking at ProductCon next month! It's in March in New York. I'll be talking about AI-first product development and some of the lessons we've learned building ML-powered features at scale. You should come if you're going to be there!",
            highlightedText: "I'm actually speaking at ProductCon next month! It's in March in New York."
          }
        }
      ],
      funFacts: [
        { 
          text: 'Loves hiking in Tahoe every weekend', 
          source: 'Conversation', 
          category: 'Interest',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Lunch Discussion',
            date: 'February 3, 2026',
            time: '12:20 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "Work-life balance is super important to me. I make it a point to get out to Tahoe every single weekend. There's something about being in the mountains, you know? Just unplugging and hiking for a few hours. My golden retriever Max absolutely loves it - he's the best hiking companion.",
            highlightedText: "I make it a point to get out to Tahoe every single weekend. There's something about being in the mountains"
          }
        },
        { 
          text: 'Third-wave coffee enthusiast (roasts own beans)', 
          source: 'Conversation', 
          category: 'Interest',
          transcript: {
            platform: 'Video Call',
            occasion: 'Coffee Chat - Product Strategy Discussion',
            date: 'February 8, 2026',
            time: '10:00 AM',
            fullTranscript: "Oh, is that a coffee roaster in the background? Yeah! I'm super into third-wave coffee. I actually roast my own beans at home. It started as a pandemic hobby but now I'm totally obsessed. I've got like 5 different single-origin beans from different regions. The smell in my apartment on roasting day is incredible.",
            highlightedText: "I'm super into third-wave coffee. I actually roast my own beans at home."
          }
        },
        { 
          text: 'Speaks Mandarin and Japanese fluently', 
          source: 'LinkedIn', 
          category: 'Background'
        },
        { 
          text: 'Training for her first marathon', 
          source: 'Conversation', 
          category: 'Personal',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Networking Reception',
            date: 'February 3, 2026',
            time: '5:00 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "This is actually a bit crazy, but I signed up for my first marathon! It's in October. I've never been a runner before, but I figured why not challenge myself? I'm following this 16-week training plan and it's been pretty intense, but I'm enjoying it so far.",
            highlightedText: "I signed up for my first marathon! It's in October."
          }
        }
      ],
      conversationDuration: '8 min',
      suggestedActions: [
        {
          id: '1',
          type: 'meeting',
          title: 'Schedule coffee to discuss AI tools',
          description: 'Sarah mentioned interest in AI automation tools for product teams',
          priority: 'high',
          dueDate: 'February 15, 2026',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Lunch Discussion',
            date: 'February 3, 2026',
            time: '12:45 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "I'd love to learn more about what you're building on the AI side. We're really trying to figure out the right automation tools for our product team. Maybe we could grab coffee sometime and dive deeper into this? I'm always looking to learn from others in the space.",
            highlightedText: "Maybe we could grab coffee sometime and dive deeper into this?"
          }
        },
        {
          id: '2',
          type: 'email',
          title: 'Send ProductCon ticket info',
          description: 'She\'s speaking at ProductCon in March - offer to attend',
          priority: 'medium',
          dueDate: 'February 20, 2026',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Coffee Break Chat',
            date: 'February 3, 2026',
            time: '3:45 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "Oh, and I'm actually speaking at ProductCon next month! It's in March in New York. I'll be talking about AI-first product development and some of the lessons we've learned building ML-powered features at scale. You should come if you're going to be there!",
            highlightedText: "You should come if you're going to be there!"
          }
        },
        {
          id: '3',
          type: 'introduction',
          title: 'Introduce to hiring manager',
          description: 'TechFlow is hiring 3 product managers in Q2',
          priority: 'medium',
          transcript: {
            platform: 'In-Person',
            occasion: 'Tech Summit 2026 - Networking Reception',
            date: 'February 3, 2026',
            time: '4:45 PM',
            location: 'Moscone Center, San Francisco',
            fullTranscript: "We're actually scaling up the product team pretty aggressively. Looking to bring on three product managers in Q2. If you know anyone great who's looking, I'd love a warm intro. Finding good product people is always the hardest part.",
            highlightedText: "If you know anyone great who's looking, I'd love a warm intro."
          }
        }
      ]
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      title: 'Founder & CEO',
      company: 'GreenStart Ventures',
      location: 'Austin, TX',
      linkedInUrl: 'linkedin.com/in/marcusjohnson',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      dateAdded: '2026-02-03',
      notes: 'Met at Climate Tech Conference. Looking for sustainability-focused startups to invest in, particularly in the carbon capture and renewable energy space. Mentioned upcoming trip to Copenhagen for Nordic climate tech summit. Very passionate about ocean conservation.',
      keyFacts: [
        { 
          text: 'Serial entrepreneur (3 successful exits)', 
          source: 'LinkedIn', 
          category: 'Background'
        },
        { 
          text: 'Just closed $50M climate tech fund', 
          source: 'Conversation', 
          category: 'Professional',
          transcript: {
            platform: 'Video Call',
            occasion: 'Climate Tech Conference - Virtual Investor Panel',
            date: 'February 3, 2026',
            time: '11:00 AM',
            location: 'Virtual Event',
            fullTranscript: "I'm thrilled to announce that we just closed our $50 million climate tech fund last week. This has been in the works for over a year, and the response from LPs has been incredible. We're focused exclusively on early-stage companies working on carbon capture, renewable energy, and sustainable agriculture. The climate crisis is the defining challenge of our generation.",
            highlightedText: "we just closed our $50 million climate tech fund last week"
          }
        },
        { 
          text: 'Board member at Ocean Conservancy', 
          source: 'LinkedIn', 
          category: 'Professional'
        },
        { 
          text: 'Advising 2 unicorn startups', 
          source: 'Mutual Connection', 
          category: 'Professional'
        }
      ],
      funFacts: [
        { 
          text: 'Completed 5 marathons in 5 continents', 
          source: 'Conversation', 
          category: 'Interest',
          transcript: {
            platform: 'Phone Call',
            occasion: 'Follow-up Call - Investment Discussion',
            date: 'February 3, 2026',
            time: '3:30 PM',
            fullTranscript: "Running has always been my meditation. I've actually completed marathons on five different continents now - North America, Europe, Asia, Africa, and South America. Antarctica and Australia are still on my bucket list! Each race has been an incredible experience, not just physically but culturally too.",
            highlightedText: "I've actually completed marathons on five different continents now"
          }
        },
        { 
          text: 'Vegan chef (working on a cookbook)', 
          source: 'Social Media', 
          category: 'Interest',
          transcript: {
            platform: 'LinkedIn Message',
            occasion: 'Networking Follow-up',
            date: 'February 5, 2026',
            time: '2:15 PM',
            fullTranscript: "Thanks for connecting! I saw your question about sustainable living. Beyond the investing side, I'm personally very passionate about plant-based cooking. I've been working on a vegan cookbook for the past year - it combines my love for food with environmental sustainability. Hope to share it with the world soon!",
            highlightedText: "I've been working on a vegan cookbook for the past year"
          }
        },
        { 
          text: 'Has 500+ vinyl records collection', 
          source: 'Conversation', 
          category: 'Interest',
          transcript: {
            platform: 'Video Call',
            occasion: 'Zoom Coffee Chat - Portfolio Review',
            date: 'February 10, 2026',
            time: '9:00 AM',
            fullTranscript: "Oh those? Yeah, that's part of my vinyl collection behind me. I've been collecting records since college. I'm probably up to around 500 now? Everything from classic jazz to indie rock. There's something magical about the analog sound and the ritual of playing a record. My friends think I'm crazy but I love it.",
            highlightedText: "I've been collecting records since college. I'm probably up to around 500 now?"
          }
        },
        { 
          text: 'Surfs every morning before work', 
          source: 'Conversation', 
          category: 'Personal',
          transcript: {
            platform: 'Phone Call',
            occasion: 'Early Morning Check-in',
            date: 'February 7, 2026',
            time: '7:45 AM',
            fullTranscript: "Sorry, I just got out of the water - that's why I sound a bit out of breath. I surf every morning before work. It's non-negotiable for me. Even when it's cold, even when the waves are small. That hour in the ocean clears my head and sets the tone for the whole day.",
            highlightedText: "I surf every morning before work. It's non-negotiable for me."
          }
        }
      ],
      conversationDuration: '12 min',
      suggestedActions: [
        {
          id: '1',
          type: 'email',
          title: 'Send climate tech startup deck',
          description: 'Marcus is looking for carbon capture and renewable energy startups',
          priority: 'high',
          dueDate: 'February 18, 2026',
          transcript: {
            platform: 'Video Call',
            occasion: 'Climate Tech Conference - Virtual Investor Panel',
            date: 'February 3, 2026',
            time: '11:30 AM',
            location: 'Virtual Event',
            fullTranscript: "If you come across any interesting startups in the carbon capture or renewable energy space, definitely send them my way. We're actively looking to deploy capital right now. Early-stage is perfect - seed to Series A is our sweet spot.",
            highlightedText: "If you come across any interesting startups in the carbon capture or renewable energy space, definitely send them my way."
          }
        },
        {
          id: '2',
          type: 'follow-up',
          title: 'Follow up on Copenhagen conference',
          description: 'Ask about Nordic climate tech summit learnings',
          priority: 'low',
          dueDate: 'March 10, 2026',
          transcript: {
            platform: 'Video Call',
            occasion: 'Climate Tech Conference - Post-Panel Discussion',
            date: 'February 3, 2026',
            time: '12:15 PM',
            location: 'Virtual Event',
            fullTranscript: "I'm heading to Copenhagen next month for the Nordic climate tech summit. Super excited - the European climate scene is really heating up. I'll probably have some interesting insights to share when I get back.",
            highlightedText: "I'll probably have some interesting insights to share when I get back."
          }
        }
      ]
    },
    {
      id: '3',
      name: 'Elena Rodriguez',
      title: 'Head of Marketing',
      company: 'DataSync Solutions',
      location: 'New York, NY',
      linkedInUrl: 'linkedin.com/in/elenarodriguez',
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      dateAdded: '2026-02-02',
      notes: 'Met at MarketingWeek NYC. Just launched a major B2B campaign that increased leads by 300%. Two kids (ages 5 and 8), recently moved to Brooklyn from Manhattan. Loves discussing growth marketing strategies and content marketing. Mentioned she\'s looking for creative agencies.',
      keyFacts: [
        { 
          text: 'Led 3 successful product launches in past year', 
          source: 'Conversation', 
          category: 'Professional',
          transcript: {
            platform: 'Email',
            occasion: 'MarketingWeek NYC - Post-Event Follow-up',
            date: 'February 2, 2026',
            time: '9:15 AM',
            fullTranscript: "Hi! It was great meeting you at MarketingWeek. To answer your question about our launch strategy - we've successfully launched three major products in the past year. Each one required a different approach, but the common thread was deep customer research upfront and a strong narrative that resonated with our B2B audience. Happy to share our playbook if you're interested!",
            highlightedText: "we've successfully launched three major products in the past year"
          }
        },
        { 
          text: 'Expert in B2B growth marketing and demand gen', 
          source: 'LinkedIn', 
          category: 'Professional'
        },
        { 
          text: 'Former marketing director at HubSpot', 
          source: 'LinkedIn', 
          category: 'Background'
        },
        { 
          text: 'Speaking at 2 conferences this spring', 
          source: 'Conversation', 
          category: 'Professional'
        }
      ],
      funFacts: [
        { 
          text: 'Salsa dancing instructor on weekends', 
          source: 'Conversation', 
          category: 'Interest',
          transcript: {
            platform: 'In-Person',
            occasion: 'MarketingWeek NYC - Evening Social',
            date: 'February 2, 2026',
            time: '7:45 PM',
            location: 'Hudson Yards, New York',
            fullTranscript: "Oh, you like to dance? That's awesome! I actually teach salsa on the weekends at a studio in Brooklyn. It's my way of staying active and meeting people outside of the tech/marketing bubble. The music, the energy, the community - it's just so different from my day job and I love that balance.",
            highlightedText: "I actually teach salsa on the weekends at a studio in Brooklyn"
          }
        },
        { 
          text: 'Currently learning pottery (has a kiln!)', 
          source: 'Conversation', 
          category: 'Interest',
          transcript: {
            platform: 'Video Call',
            occasion: 'Teams Meeting - Campaign Review',
            date: 'February 9, 2026',
            time: '3:00 PM',
            fullTranscript: "Wait, what's that in the background? Oh! That's my pottery kiln. I just got into ceramics recently. It's been such a great creative outlet. I've been taking classes and just installed a small kiln in my spare room. My family thinks I'm going through a midlife crisis but honestly it's the most relaxed I've felt in years. Making something with your hands is so different from digital marketing.",
            highlightedText: "I just got into ceramics recently. It's been such a great creative outlet. I've been taking classes and just installed a small kiln"
          }
        },
        { 
          text: 'Bilingual English/Spanish household', 
          source: 'Conversation', 
          category: 'Background',
          transcript: {
            platform: 'Video Call',
            occasion: 'Teams Meeting - Q2 Planning',
            date: 'February 4, 2026',
            time: '4:30 PM',
            fullTranscript: "Sorry, can you hold on one sec? My daughter just walked in. Sí mija, en cinco minutos. Lo siento! We speak Spanish at home with the kids. It's important to me that they grow up bilingual and connected to their heritage. Sometimes the code-switching gets interesting though!",
            highlightedText: "We speak Spanish at home with the kids. It's important to me that they grow up bilingual"
          }
        },
        { 
          text: 'Makes the best empanadas (her words!)', 
          source: 'Conversation', 
          category: 'Personal',
          transcript: {
            platform: 'Text Message',
            occasion: 'Event Planning Discussion',
            date: 'February 11, 2026',
            time: '6:20 PM',
            fullTranscript: "For the team potluck? I'm making empanadas! My abuela's recipe. Everyone always asks me to bring them. I know it sounds cocky but they really are the best 😊 I've been making them since I was a kid. The secret is in the dough and not overfilling them.",
            highlightedText: "I'm making empanadas! My abuela's recipe. Everyone always asks me to bring them."
          }
        }
      ],
      conversationDuration: '6 min',
      suggestedActions: [
        {
          id: '1',
          type: 'introduction',
          title: 'Connect with creative agency contacts',
          description: 'Elena is looking for creative agencies for upcoming campaigns',
          priority: 'high',
          dueDate: 'February 25, 2026',
          transcript: {
            platform: 'In-Person',
            occasion: 'MarketingWeek NYC - Panel Discussion',
            date: 'February 2, 2026',
            time: '3:30 PM',
            location: 'Hudson Yards, New York',
            fullTranscript: "We're actually in the market for some fresh creative agency partners. Our current agencies are great but we want to bring in some new perspectives for Q2 campaigns. If you know any boutique agencies that do great B2B work, I'm all ears.",
            highlightedText: "If you know any boutique agencies that do great B2B work, I'm all ears."
          }
        },
        {
          id: '2',
          type: 'share',
          title: 'Share B2B campaign case study',
          description: 'Discuss the 300% lead increase campaign strategy',
          priority: 'medium',
          transcript: {
            platform: 'Email',
            occasion: 'MarketingWeek NYC - Post-Event Follow-up',
            date: 'February 2, 2026',
            time: '9:30 AM',
            fullTranscript: "The campaign that drove the 300% increase in leads was really interesting. It was a combination of thought leadership content, targeted LinkedIn ads, and a really tight sales enablement loop. I'd be happy to walk you through the full strategy if you're interested - might give you some ideas for your own campaigns.",
            highlightedText: "I'd be happy to walk you through the full strategy if you're interested"
          }
        }
      ]
    },
    {
      id: '4',
      name: 'David Park',
      title: 'Principal Engineer',
      company: 'Quantum Systems',
      location: 'Boston, MA',
      linkedInUrl: 'linkedin.com/in/davidpark',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      dateAdded: '2026-02-01',
      notes: 'Met at AI & Machine Learning Summit. Working on cutting-edge quantum computing applications. MIT grad, super humble despite incredible credentials. Mentioned interest in collaborating on open source projects. His team is hiring senior engineers.',
      keyFacts: [
        { text: 'PhD in Quantum Computing from MIT', source: 'LinkedIn', category: 'Background' },
        { text: 'Published 15+ peer-reviewed papers', source: 'LinkedIn', category: 'Professional' },
        { text: 'Leading quantum algorithm research team', source: 'Conversation', category: 'Professional' },
        { text: 'Contributed to major open source ML libraries', source: 'LinkedIn', category: 'Professional' }
      ],
      funFacts: [
        { text: 'Plays piano (jazz and classical)', source: 'Conversation', category: 'Interest' },
        { text: 'Rock climbing enthusiast (V7 level)', source: 'Conversation', category: 'Interest' },
        { text: 'Watches Korean dramas with his mom', source: 'Conversation', category: 'Personal' },
        { text: 'Makes his own kombucha', source: 'Conversation', category: 'Interest' }
      ],
      suggestedActions: [
        {
          id: '1',
          type: 'meeting',
          title: 'Discuss open source collaboration',
          description: 'David mentioned interest in collaborating on open source ML projects',
          priority: 'high',
          dueDate: 'February 22, 2026',
          transcript: {
            platform: 'In-Person',
            occasion: 'AI & ML Summit - Workshop Session',
            date: 'February 1, 2026',
            time: '2:15 PM',
            location: 'Boston Convention Center',
            fullTranscript: "I'm always looking for opportunities to collaborate on open source work. That's where the most interesting innovation happens. If you're working on anything in the ML space and want an extra set of hands or eyes on it, let me know. I love contributing to projects that push the boundaries.",
            highlightedText: "If you're working on anything in the ML space and want an extra set of hands or eyes on it, let me know."
          }
        }
      ],
      conversationDuration: '15 min'
    },
    {
      id: '5',
      name: 'Priya Sharma',
      title: 'Design Director',
      company: 'Creative Labs',
      location: 'Los Angeles, CA',
      linkedInUrl: 'linkedin.com/in/priyasharma',
      profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      dateAdded: '2026-01-30',
      notes: 'Met at Design Systems Conference. Leading a team of 12 designers. Very interested in accessibility and inclusive design. Mentioned her studio is working on a major rebrand for a Fortune 500 company.',
      keyFacts: [
        { text: 'Former lead designer at Airbnb', source: 'LinkedIn', category: 'Background' },
        { text: 'Specializes in design systems and accessibility', source: 'LinkedIn', category: 'Professional' },
        { text: 'Speaking at 3 design conferences this year', source: 'Conversation', category: 'Professional' },
        { text: 'Published a book on inclusive design', source: 'LinkedIn', category: 'Professional' }
      ],
      funFacts: [
        { text: 'Practices Bharatanatyam (classical Indian dance)', source: 'Conversation', category: 'Interest' },
        { text: 'Collects vintage cameras', source: 'Conversation', category: 'Interest' },
        { text: 'Vegetarian cook (hosts monthly dinner parties)', source: 'Conversation', category: 'Personal' },
        { text: 'Learning to speak Tamil', source: 'Conversation', category: 'Personal' }
      ],
      suggestedActions: [
        {
          id: '1',
          type: 'email',
          title: 'Share accessibility resources',
          description: 'Priya asked for recommendations on accessibility tools',
          priority: 'medium',
          dueDate: 'February 28, 2026',
          transcript: {
            platform: 'In-Person',
            occasion: 'Design Systems Conference - Workshop',
            date: 'January 30, 2026',
            time: '3:00 PM',
            location: 'Los Angeles Convention Center',
            fullTranscript: "I'm always on the lookout for better accessibility tools and resources. If you come across anything interesting - whether it's testing tools, guidelines, or case studies - I'd love to see them. We're really trying to make accessibility a core part of our design process, not just a checkbox.",
            highlightedText: "If you come across anything interesting - whether it's testing tools, guidelines, or case studies - I'd love to see them."
          }
        }
      ],
      conversationDuration: '10 min'
    }
  ]);

  const handleSignIn = () => {
    setIsSignedIn(true);
  };

  const handleStartTranscribing = () => {
    setCurrentView('recording');
  };

  const handleStopTranscribing = (newContact: Contact) => {
    setContacts([newContact, ...contacts]);
    setSelectedContact(newContact);
    setCurrentView('persona');
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setCurrentView('persona');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedContact(null);
  };

  const handleUpdateNotes = (contactId: string, newNotes: string) => {
    setContacts(contacts.map(c => 
      c.id === contactId ? { ...c, notes: newNotes } : c
    ));
    if (selectedContact?.id === contactId) {
      setSelectedContact({ ...selectedContact, notes: newNotes });
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isSignedIn) {
    return <WelcomeScreen onSignIn={handleSignIn} />;
  }

  if (currentView === 'recording') {
    return (
      <TranscribingView 
        onStop={handleStopTranscribing}
        onBack={handleBackToList}
      />
    );
  }

  if (currentView === 'persona' && selectedContact) {
    return (
      <PersonaCard
        contact={selectedContact}
        onBack={handleBackToList}
        onUpdateNotes={handleUpdateNotes}
      />
    );
  }

  if (currentView === 'actions') {
    return (
      <AllActionsView
        contacts={contacts}
        onBack={handleBackToList}
      />
    );
  }

  if (currentView === 'settings') {
    return (
      <SettingsView
        onBack={handleBackToList}
      />
    );
  }

  return (
    <ThemeProvider>
      <AppContent 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredContacts={filteredContacts}
        handleViewContact={handleViewContact}
        contacts={contacts}
        handleStartTranscribing={handleStartTranscribing}
      />
    </ThemeProvider>
  );
}

function AppContent({ 
  activeTab, 
  setActiveTab, 
  searchQuery, 
  setSearchQuery,
  filteredContacts,
  handleViewContact,
  contacts,
  handleStartTranscribing 
}: {
  activeTab: 'contacts' | 'actions' | 'chat' | 'settings';
  setActiveTab: (tab: 'contacts' | 'actions' | 'chat' | 'settings') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredContacts: Contact[];
  handleViewContact: (contact: Contact) => void;
  contacts: Contact[];
  handleStartTranscribing: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <img src={vertexLogo} alt="Vertex" className="h-10 mb-3" />
          
          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'contacts'
                  ? 'bg-teal-50 text-teal-700 border border-teal-200 shadow-sm dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Contacts</span>
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'actions'
                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Actions</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>

          {/* Search - Only show for contacts tab */}
          {activeTab === 'contacts' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {activeTab === 'contacts' ? (
          <ContactList 
            contacts={filteredContacts}
            onViewContact={handleViewContact}
            searchQuery={searchQuery}
          />
        ) : activeTab === 'actions' ? (
          <AllActionsView contacts={contacts} />
        ) : activeTab === 'chat' ? (
          <ChatAssistant contacts={contacts} onViewContact={handleViewContact} />
        ) : (
          <SettingsView />
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={handleStartTranscribing}
        className="fixed bottom-6 right-6 bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-cyan-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
        aria-label="Start new transcription"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
