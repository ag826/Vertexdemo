import { Check, X, Settings as SettingsIcon, Mail, Calendar, Video, MessageSquare, Linkedin, Hash, ChevronRight, Shield, AlertCircle } from 'lucide-react';

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
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'disconnected':
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
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

  const handlePlatformClick = (platform: Platform) => {
    if (platform.status === 'connected') {
      alert(`${platform.name} settings: Manage permissions, disconnect, or view sync history`);
    } else {
      alert(`Connect ${platform.name}: Authorization flow would start here`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">Your Data is Protected</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Vertex uses end-to-end encryption and only accesses data with your explicit permission. You can revoke access at any time.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-white font-semibold text-lg mb-1 px-1">Platform Integrations</h2>
        <p className="text-slate-400 text-sm mb-4 px-1">Manage connected platforms and permissions</p>

        <div className="space-y-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformClick(platform)}
              className="w-full bg-slate-900 rounded-lg p-4 border border-slate-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-300 flex-shrink-0 group-hover:bg-slate-700 transition-colors">
                  {platform.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-white font-semibold">{platform.name}</h3>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                  </div>

                  <p className="text-slate-400 text-sm mb-3 leading-relaxed">
                    {platform.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${getStatusColor(platform.status)}`}>
                      {getStatusIcon(platform.status)}
                      <span>{getStatusText(platform.status)}</span>
                    </div>

                    {platform.lastSync && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/50 text-slate-400 rounded-full text-xs">
                        <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                        <span>Synced {platform.lastSync}</span>
                      </div>
                    )}
                  </div>

                  {platform.status === 'connected' && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-slate-400 text-xs font-medium">Permissions</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {platform.permissions.map((permission, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="text-white font-semibold mb-3">Additional Settings</h3>
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Notification Preferences</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>
          <button className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Privacy & Data</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>
          <button className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Export Data</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
