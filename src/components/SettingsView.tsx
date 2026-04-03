import { useEffect, useState, type ReactNode } from 'react';
import { Check, X, Mail, Calendar, Video, MessageSquare, Linkedin, Hash, ChevronRight, Shield, AlertCircle, Moon, Sun, Download, Sparkles } from 'lucide-react';
import { connectIntegration, disconnectIntegration, exportData, getIntegrations, getSettings, updateSettings } from '../lib/api';
import type { AppSettings, IntegrationItem } from '../lib/types';
import { useTheme } from './ThemeContext';

const providerIcons: Record<string, ReactNode> = {
  gmail: <Mail className="w-5 h-5" />,
  'outlook-calendar': <Calendar className="w-5 h-5" />,
  zoom: <Video className="w-5 h-5" />,
  teams: <MessageSquare className="w-5 h-5" />,
  linkedin: <Linkedin className="w-5 h-5" />,
  slack: <Hash className="w-5 h-5" />,
};

export function SettingsView() {
  const { theme, applyTheme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [settingsResponse, integrationsResponse] = await Promise.all([getSettings(), getIntegrations()]);
      setSettings(settingsResponse);
      setIntegrations(integrationsResponse.items);
      applyTheme(settingsResponse.theme);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleThemeToggle = async () => {
    setMessage('');
    const nextTheme = toggleTheme();
    setSettings((prev) => prev ? { ...prev, theme: nextTheme } : prev);
    try {
      await updateSettings({ theme: nextTheme });
      setMessage(`Theme updated to ${nextTheme}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to save theme');
    }
  };

  const handleIntegrationClick = async (integration: IntegrationItem) => {
    setMessage('');
    setError('');
    try {
      if (integration.status === 'connected') {
        await disconnectIntegration(integration.provider);
        setMessage(`${integration.name} disconnected.`);
      } else {
        await connectIntegration(integration.provider, integration.permissions);
        setMessage(`${integration.name} connected.`);
      }
      await loadData();
    } catch (integrationError) {
      setError(integrationError instanceof Error ? integrationError.message : 'Unable to update integration');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setMessage('');
    setError('');
    try {
      const response = await exportData(format);
      setMessage(`Export created at ${response.path}`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export data');
    }
  };

  const getStatusColor = (status: IntegrationItem['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'disconnected':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusDot = (status: IntegrationItem['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'disconnected':
        return 'bg-slate-500';
      case 'pending':
        return 'bg-yellow-500';
    }
  };

  if (isLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading settings...</div>;
  }

  if (error && !settings) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="mb-3">{error}</p>
        <button onClick={() => void loadData()} className="rounded-lg bg-white px-4 py-2 text-red-700 border border-red-200">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {message && <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className={`rounded-xl p-5 border ${
        settings?.aiConfigured
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            settings?.aiConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${settings?.aiConfigured ? 'text-emerald-900' : 'text-amber-900'}`}>
              {settings?.aiConfigured ? 'Gemini Connected' : 'Gemini API Key Missing'}
            </h3>
            <p className={`text-sm mt-1 ${settings?.aiConfigured ? 'text-emerald-800' : 'text-amber-800'}`}>
              {settings?.aiConfigured
                ? `AI summaries, OCR, insights, and action items are active using ${settings.aiModel || 'your configured Gemini model'}.`
                : 'Add GEMINI_API_KEY to the project .env file and restart the backend to enable AI summaries, OCR, and richer insights.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <h3 className="text-slate-900 dark:text-slate-100 font-semibold mb-3">Appearance</h3>
        <button
          onClick={() => void handleThemeToggle()}
          className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-slate-200" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </div>
            <div>
              <p className="text-slate-900 dark:text-slate-100 font-medium">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Stored locally and synced to your account</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 font-semibold">Connected Platforms</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">These connections are stored in your backend account.</p>
          </div>
        </div>

        <div className="space-y-3">
          {integrations.map((integration) => (
            <button
              key={integration.provider}
              onClick={() => void handleIntegrationClick(integration)}
              className="w-full text-left bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                  {providerIcons[integration.provider]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-slate-900 dark:text-slate-100 font-semibold">{integration.name}</h3>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">{integration.description}</p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${getStatusColor(integration.status)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(integration.status)}`}></div>
                      <span className="capitalize">{integration.status}</span>
                    </div>
                    {integration.lastSyncAt && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full text-xs">
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
                        <span>Synced {new Date(integration.lastSyncAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {integration.permissions.length > 0 && (
                    <div className="bg-white dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Permissions</span>
                      </div>
                      <ul className="space-y-1">
                        {integration.permissions.map((permission) => (
                          <li key={permission} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                            {integration.status === 'connected' ? <Check className="w-3 h-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />}
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
          <div className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Notifications</span>
              <span className="text-xs text-slate-500">{settings?.notifications ? 'Saved' : 'Default'}</span>
            </div>
          </div>
          <div className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Privacy & Data</span>
              <span className="text-xs text-slate-500">Managed server-side</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => void handleExport('json')} className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300">
              <Download className="w-4 h-4" />
              JSON Export
            </button>
            <button onClick={() => void handleExport('csv')} className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300">
              <Download className="w-4 h-4" />
              CSV Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
