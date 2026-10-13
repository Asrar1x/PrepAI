import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Calendar, Clock, Users, Plus } from '../../components/icons';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const InterviewEvents: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => adminApi.getEvents(),
  });

  const [eventName, setEventName] = useState('TCS NQT Pre-Placement Mock Marathon');
  const [scheduledDate, setScheduledDate] = useState('2026-10-15');
  const [scheduledTime, setScheduledTime] = useState('10:00 AM');
  const roleTitle = 'Software Development Engineer';
  const [companyName, setCompanyName] = useState('TCS');
  const [batchName, setBatchName] = useState('2026 Batch CS/IT');

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createEvent({
        eventName,
        scheduledDate,
        scheduledTime,
        roleTitle,
        companyName,
        batchName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      toast.success('Interview event scheduled');
    },
    onError: (err) => {
      toast.error(getFriendlyErrorMessage(err));
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-amber-500/30">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Mock interview events</h1>
          <p className="text-xs text-gray-400 max-w-xl">
            Schedule mock interview sessions for a batch before a recruitment drive.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Create Event Form */}
        <Card className="lg:col-span-5 p-6 bg-[#171716] border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white border-b border-gray-800 pb-3">
            Schedule New Mock Event
          </h3>

          <form onSubmit={handleCreate} className="space-y-3.5">
            <Input
              label="Event Title"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
              <Input
                label="Time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            <Select
              label="Recruiter Target"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              options={[
                { value: 'TCS', label: 'TCS (Tata Consultancy Services)' },
                { value: 'Amazon', label: 'Amazon' },
                { value: 'Infosys', label: 'Infosys' },
                { value: 'Zoho', label: 'Zoho Corporation' },
              ]}
            />

            <Input
              label="Target Batch"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createMutation.isPending}
              leftIcon={<Plus className="w-4 h-4" />}
              className="w-full mt-2 bg-amber-700 hover:bg-amber-800 border-amber-500/30"
            >
              Publish Event to Students
            </Button>
          </form>
        </Card>

        {/* Existing Events List */}
        <Card className="lg:col-span-7 p-6 bg-[#171716] border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="text-base font-bold text-white">Active Placement Calendars</h3>
            <span className="text-xs text-gray-400 font-mono">{events.length} Scheduled</span>
          </div>

          <div className="space-y-3">
            {isLoading && <p className="text-xs text-gray-400">Loading events…</p>}
            {!isLoading && events.length === 0 && <p className="text-xs text-gray-500">No events scheduled yet.</p>}
            {events.map((evt, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800 space-y-2 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-100">{evt.eventName}</h4>
                  <Badge variant="accent" size="sm">{evt.companyName}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" /> {evt.scheduledDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" /> {evt.scheduledTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" /> {evt.batchName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
