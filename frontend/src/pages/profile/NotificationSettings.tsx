import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFriendlyErrorMessage } from '../../api/client';
import { NotificationPreference } from '../../types/user';
import { notificationsApi } from '../../api/notifications';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from '../../components/icons';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const NotificationSettings: React.FC = () => {
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications(),
  });

  const queryClient = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => notificationsApi.getPreferences(),
  });

  const prefsMutation = useMutation({
    mutationFn: (update: Partial<NotificationPreference>) => notificationsApi.updatePreferences(update),
    onSuccess: (saved) => {
      queryClient.setQueryData(['notification-prefs'], saved);
      toast.success('Preference saved');
    },
    onError: (err) => toast.error(getFriendlyErrorMessage(err)),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const togglePref = (key: keyof NotificationPreference) => {
    if (!prefs) return;
    prefsMutation.mutate({ [key]: !prefs[key] });
  };

  const prefItems: { key: keyof NotificationPreference; title: string; desc: string }[] = [
    { key: 'dailyReminder', title: 'Daily Practice Reminders', desc: 'Alerts to maintain your daily problem-solving routine.' },
    { key: 'interviewReportReady', title: 'Interview Report Ready', desc: 'Instant ping when your voice mock 7D rubric report finishes processing.' },
    { key: 'streakAlert', title: 'Placement Streak Warnings', desc: 'Evening notification if you are at risk of losing your daily streak.' },
    { key: 'companyDriveActivated', title: 'Company Drive Mode Activation', desc: 'Priority notice when placement cell schedules an on-campus mock drive.' },
    { key: 'weeklyProgressReport', title: 'Weekly Progress Digest', desc: 'Summary of your score velocity and percentile changes sent every Sunday.' },
    { key: 'studyPlanBehind', title: 'Study Plan Catch-Up Alerts', desc: 'Gentle nudges when your daily topic checklist falls 2+ days behind.' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Notifications</h1>
          <p className="text-xs text-gray-400">
            Choose which reminders and placement updates you get.
          </p>
        </div>

        <Link to="/profile">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Profile
          </Button>
        </Link>
      </div>

      {/* Preferences Toggles */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-3">
          Practice & Diagnostic Alerts
        </h3>

        <div className="space-y-3">
          {prefItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-xl bg-[#1F1F1E] border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div>
                <h4 className="text-xs font-bold text-gray-200">{item.title}</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => togglePref(item.key)}
                disabled={!prefs || prefsMutation.isPending}
                aria-pressed={Boolean(prefs?.[item.key])}
                aria-label={item.title}
                className={`w-12 h-6 rounded-lg transition-colors relative p-0.5 shrink-0 disabled:opacity-50 ${
                  prefs?.[item.key] ? 'bg-brand-600' : 'bg-gray-800'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    prefs?.[item.key] ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Notification History Log */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-3">
          Recent Notifications
        </h3>

        <div className="space-y-3">
          {notifications.length === 0 && <p className="text-xs text-gray-500">No notifications yet.</p>}
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                notif.isRead ? 'bg-[#1F1F1E]/50 border-gray-800/80 text-gray-400' : 'bg-[#1F1F1E] border-brand-500/30 text-gray-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{notif.title}</span>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </div>
                <p className="text-xs text-gray-400">{notif.message}</p>
                <span className="text-[11px] text-gray-500 font-mono block pt-1">{new Date(notif.createdAt).toLocaleString('en-IN')}</span>
              </div>

              {notif.actionUrl && (
                <Link to={notif.actionUrl} onClick={() => !notif.isRead && readMutation.mutate(notif.id)}>
                  <Button variant="ghost" size="sm" className="text-xs text-brand-400 shrink-0">
                    Open
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
