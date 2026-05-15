'use client';

import React, { useState, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Clock,
  ChevronDown,
  ChevronUp,
  Mail,
  Slack,
  ExternalLink,
} from 'lucide-react';

type NotificationType = 'BUILD_COMPLETE' | 'BUILD_FAILED' | 'GOVERNANCE' | 'APPROVAL' | 'SYSTEM';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  relativeTime: string;
  read: boolean;
};

type FilterTab = 'ALL' | 'UNREAD' | 'BUILDS' | 'GOVERNANCE' | 'SYSTEM';

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n20', type: 'BUILD_COMPLETE', title: 'Payments Portal v1.4.2 deployed', body: 'Build completed successfully and is now live on production.', timestamp: '2026-05-15T10:00:00Z', relativeTime: '2 hours ago', read: false },
  { id: 'n19', type: 'GOVERNANCE', title: 'Policy gate triggered on Auth Service', body: 'RBAC rule blocked an unapproved tool call. Review the audit log.', timestamp: '2026-05-15T09:30:00Z', relativeTime: '3 hours ago', read: false },
  { id: 'n18', type: 'APPROVAL', title: 'Approval required: CRM Dashboard v1.3.9', body: 'A build is awaiting your review before it can proceed to staging.', timestamp: '2026-05-15T08:00:00Z', relativeTime: '4 hours ago', read: false },
  { id: 'n17', type: 'BUILD_FAILED', title: 'Auth Service v1.3.9 build failed', body: 'Missing env var OAUTH_CLIENT_SECRET caused the build to fail.', timestamp: '2026-05-14T22:00:00Z', relativeTime: 'yesterday', read: false },
  { id: 'n16', type: 'BUILD_COMPLETE', title: 'CRM Dashboard v1.4.0 deployed', body: 'New chart components shipped. All smoke tests passed.', timestamp: '2026-05-14T16:30:00Z', relativeTime: 'yesterday', read: false },
  { id: 'n15', type: 'SYSTEM', title: 'Scheduled maintenance in 24 hours', body: 'The DSG runtime will be unavailable on May 16 from 02:00–03:00 UTC.', timestamp: '2026-05-14T12:00:00Z', relativeTime: 'yesterday', read: true },
  { id: 'n14', type: 'GOVERNANCE', title: 'Weekly governance digest ready', body: '3 policy violations and 1 override recorded this week.', timestamp: '2026-05-14T09:00:00Z', relativeTime: 'yesterday', read: true },
  { id: 'n13', type: 'BUILD_COMPLETE', title: 'Auth Service v1.3.8 deployed', body: 'Auth redirect fix is live. No regressions detected.', timestamp: '2026-05-13T14:00:00Z', relativeTime: '2 days ago', read: true },
  { id: 'n12', type: 'APPROVAL', title: 'Approval required: Inventory Manager bulk import', body: 'CSV pipeline needs security review before enabling in production.', timestamp: '2026-05-12T11:30:00Z', relativeTime: '3 days ago', read: false },
  { id: 'n11', type: 'BUILD_COMPLETE', title: 'Inventory Manager v1.3.7 build started', body: 'Build is queued and processing. ETA: ~3 minutes.', timestamp: '2026-05-12T10:45:00Z', relativeTime: '3 days ago', read: true },
  { id: 'n10', type: 'BUILD_COMPLETE', title: 'Analytics Hub v1.3.5 deployed', body: 'Cohort retention chart is now available on the analytics dashboard.', timestamp: '2026-05-11T08:30:00Z', relativeTime: '4 days ago', read: true },
  { id: 'n09', type: 'BUILD_FAILED', title: 'Analytics Hub v1.3.2 build failed', body: 'D3 v8 breaking change caused chart rendering errors. Reverting.', timestamp: '2026-05-08T20:00:00Z', relativeTime: '7 days ago', read: true },
  { id: 'n08', type: 'GOVERNANCE', title: 'New compliance rule applied', body: 'PII masking policy is now enforced across all data pipeline tools.', timestamp: '2026-05-08T15:00:00Z', relativeTime: '7 days ago', read: true },
  { id: 'n07', type: 'BUILD_COMPLETE', title: 'Support Inbox v1.3.1 deployed', body: 'Slack thread sync for support tickets is now live.', timestamp: '2026-05-07T09:30:00Z', relativeTime: '8 days ago', read: true },
  { id: 'n06', type: 'SYSTEM', title: 'Billing cycle renewed', body: 'Your Pro plan has been renewed. Next billing date: June 15, 2026.', timestamp: '2026-05-07T08:00:00Z', relativeTime: '8 days ago', read: true },
  { id: 'n05', type: 'APPROVAL', title: 'Approval required: Support Inbox email pipeline', body: 'New inbound email integration needs owner sign-off.', timestamp: '2026-05-05T15:00:00Z', relativeTime: '10 days ago', read: true },
  { id: 'n04', type: 'BUILD_COMPLETE', title: 'Support Inbox v1.2.0 deployed', body: 'Initial email-to-ticket pipeline is live and processing messages.', timestamp: '2026-05-05T14:00:00Z', relativeTime: '10 days ago', read: true },
  { id: 'n03', type: 'GOVERNANCE', title: 'RBAC audit completed', body: '12 users reviewed. 2 excess permissions revoked automatically.', timestamp: '2026-05-03T10:00:00Z', relativeTime: '12 days ago', read: true },
  { id: 'n02', type: 'BUILD_COMPLETE', title: 'Auth Service v1.1.0 deployed', body: 'RBAC layer shipped. All permission matrix tests passed.', timestamp: '2026-05-02T11:00:00Z', relativeTime: '13 days ago', read: true },
  { id: 'n01', type: 'SYSTEM', title: 'Welcome to DSG One', body: 'Your workspace is ready. Start building your first app in the App Builder.', timestamp: '2026-04-28T09:00:00Z', relativeTime: '17 days ago', read: true },
];

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'UNREAD', label: 'Unread' },
  { id: 'BUILDS', label: 'Builds' },
  { id: 'GOVERNANCE', label: 'Governance' },
  { id: 'SYSTEM', label: 'System' },
];

function NotifIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'BUILD_COMPLETE': return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case 'BUILD_FAILED': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'GOVERNANCE': return <ShieldAlert className="h-5 w-5 text-amber-400" />;
    case 'APPROVAL': return <Clock className="h-5 w-5 text-indigo-400" />;
    case 'SYSTEM': return <Bell className="h-5 w-5 text-slate-400" />;
  }
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition ${
          checked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-600 bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Settings toggles
  const [settings, setSettings] = useState({
    emailBuildComplete: true,
    emailBuildFailed: true,
    slack: false,
    governanceAlerts: true,
    weeklyDigest: false,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.read;
    if (activeTab === 'BUILDS') return n.type === 'BUILD_COMPLETE' || n.type === 'BUILD_FAILED';
    if (activeTab === 'GOVERNANCE') return n.type === 'GOVERNANCE';
    if (activeTab === 'SYSTEM') return n.type === 'SYSTEM' || n.type === 'APPROVAL';
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleTabChange = useCallback((tab: FilterTab) => {
    setActiveTab(tab);
    setVisibleCount(10);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600">
              <Bell className="h-5 w-5 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
              <p className="text-sm text-slate-400">{unreadCount} unread</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              Mark all as read
            </button>
          )}
        </header>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-1">
          {FILTER_TABS.map((tab) => {
            const count = tab.id === 'UNREAD' ? unreadCount : null;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {tab.label}
                {count !== null && count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        {visible.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-4 text-lg font-bold text-slate-400">No notifications</p>
            <p className="mt-2 text-sm text-slate-500">You're all caught up.</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {visible.map((notif) => (
              <li
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`relative cursor-pointer overflow-hidden rounded-3xl border bg-slate-900 p-5 transition hover:border-slate-700 ${
                  !notif.read ? 'border-slate-800' : 'border-slate-800/50 opacity-75'
                }`}
              >
                {/* Unread left border accent */}
                {!notif.read && (
                  <span className="absolute inset-y-0 left-0 w-1 rounded-l-3xl bg-indigo-500" />
                )}
                <div className="flex items-start gap-3 pl-1">
                  <span className="mt-0.5 shrink-0">
                    <NotifIcon type={notif.type} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className={`text-sm font-bold leading-5 ${
                        !notif.read ? 'text-slate-100' : 'text-slate-400'
                      }`}>
                        {notif.title}
                      </p>
                      <span className="shrink-0 text-xs text-slate-500">{notif.relativeTime}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{notif.body}</p>
                  </div>
                  {!notif.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => c + 10)}
              className="rounded-2xl border border-slate-700 px-6 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800"
            >
              Load more
            </button>
          </div>
        )}

        {/* Notification settings */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <span className="font-bold text-slate-100">Notification settings</span>
            </div>
            {settingsOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {settingsOpen && (
            <div className="space-y-4 border-t border-slate-800 px-5 pb-5 pt-4">
              <div className="space-y-1">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  <Mail className="h-3.5 w-3.5" /> Email
                </p>
                <Toggle
                  label="Email notifications for build complete"
                  checked={settings.emailBuildComplete}
                  onChange={(v) => setSettings((s) => ({ ...s, emailBuildComplete: v }))}
                />
                <Toggle
                  label="Email notifications for build failures"
                  checked={settings.emailBuildFailed}
                  onChange={(v) => setSettings((s) => ({ ...s, emailBuildFailed: v }))}
                />
                <Toggle
                  label="Governance approval alerts"
                  checked={settings.governanceAlerts}
                  onChange={(v) => setSettings((s) => ({ ...s, governanceAlerts: v }))}
                />
                <Toggle
                  label="Weekly digest email"
                  checked={settings.weeklyDigest}
                  onChange={(v) => setSettings((s) => ({ ...s, weeklyDigest: v }))}
                />
              </div>

              <div className="border-t border-slate-800 pt-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  <Slack className="h-3.5 w-3.5" /> Slack
                </p>
                <div className="flex items-center justify-between">
                  <Toggle
                    label="Slack notifications"
                    checked={settings.slack}
                    onChange={(v) => setSettings((s) => ({ ...s, slack: v }))}
                  />
                  {settings.slack && (
                    <a
                      href="#"
                      className="ml-4 flex shrink-0 items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                    >
                      Configure <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
