import { Check, X, Settings as SettingsIcon, Mail, Calendar, Video, MessageSquare, Linkedin, Hash, ChevronRight, Shield, AlertCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'pending';
  permissions: string[];
  lastSync?: string;
  description: string;
}

export function SettingsView() {
  const { theme, toggleTheme } = useTheme();
  const platforms: Platform[] = [
    {
      id: 'email',
      name: 'Gmail',
      icon: <Mail className="w-5 h-5" />,
      status: 'connected',
      permissions: ['Read emails', 'Send emails', 'Access contacts'],
      lastSync: '2 minutes ago',
      description: 'Sync email conversations and extract insights'
    },
    {
      id: 'calendar',
      name: 'Outlook Calendar',
      icon: <Calendar className="w-5 h-5" />,
      status: 'connected',
      permissions: ['Read calendar events', 'Create events', 'View attendees'],
      lastSync: '15 minutes ago',
      description: 'Auto-schedule meetings and track conversation contexts'
    },
    {
      id: 'zoom',
      name: 'Zoom',
      icon: <Video className="w-5 h-5" />,
      status: 'connected',
      permissions: ['Record meetings', 'Access transcripts', 'View participants'],
      lastSync: '1 hour ago',
      description: 'Capture video call conversations and generate insights'
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      icon: <MessageSquare className="w-5 h-5" />,
      status: 'disconnected',
      permissions: ['Record meetings', 'Access chat history', 'View members'],
      description: 'Integrate Teams conversations and video calls'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <Linkedin className="w-5 h-5" />,
      status: 'connected',
      permissions: ['Read profile', 'Access connections', 'View messages'],
      lastSync: '30 minutes ago',
      description: 'Import professional background and connection data'
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: <Hash className="w-5 h-5" />,
      status: 'pending',
      permissions: ['Read messages', 'View channels', 'Access user info'],
      description: 'Track workplace conversations and interactions'
    }
  ];

  const getStatusColor = (status: Platform['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'disconnected':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusIcon = (status: Platform['status']) => {
    switch (status) {
      case 'connected':
        return <Check className="w-3.5 h-3.5" />;
      case 'disconnected':
        return <X className="w-3.5 h-3.5" />;
      case 'pending':
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const getStatusText = (status: Platform['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Not Connected';
      case 'pending':
        return 'Pending Setup';
    }
  };

  const getStatusDot = (status: Platform['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-slate-500';
      case 'pending':
        return 'bg-yellow-500';
    }
  };

  const handlePlatformClick = (platform: Platform) => {
    if (platform.status === 'connected') {
      alert(`${platform.name} settings: Manage permissions, disconnect, or view sync history`);
    } else {
      alert(`Connect ${platform.name}: Authorization flow would start here`);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Theme Toggle */}
      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h3 className="text-slate-900 dark:text-slate-100 font-semibold mb-3">Appearance</h3>
        <button 
          onClick={toggleTheme}
          className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-white" />
              ) : (
                <Moon className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <div className="text-slate-900 dark:text-slate-100 font-medium">Theme</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</div>
            </div>
          </div>
          <div className="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium">
            {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
          </div>
        </button>
      </div>

      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-5 border border-teal-200 dark:border-teal-700/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 font-semibold mb-1">Your Data is Protected</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              Vertex uses end-to-end encryption and only accesses data with your explicit permission. You can revoke access at any time.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-lg mb-1 px-1">Platform Integrations</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 px-1">Manage connected platforms and permissions</p>

        <div className="space-y-3">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformClick(platform)}
              className="w-full bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 flex-shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                  {platform.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-slate-900 dark:text-slate-100 font-semibold">{platform.name}</h3>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                    {platform.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${getStatusColor(platform.status)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(platform.status)}`}></div>
                      <span className="capitalize">{platform.status}</span>
                    </div>

                    {platform.lastSync && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full text-xs">
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
                        <span>Synced {platform.lastSync}</span>
                      </div>
                    )}
                  </div>

                  {platform.status === 'connected' && (
                    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 border border-slate-200 dark:border-slate-600 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Active Permissions:</span>
                      </div>
                      <ul className="space-y-1">
                        {platform.permissions.map((permission, index) => (
                          <li key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{permission}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h3 className="text-slate-900 dark:text-slate-100 font-semibold mb-3">Additional Settings</h3>
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Notification Preferences</span>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
          </button>
          <button className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Privacy & Data</span>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
          </button>
          <button className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Export Data</span>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}