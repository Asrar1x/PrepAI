import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const DriveActivation: React.FC = () => {
  const [company, setCompany] = useState('TCS');
  const [batch, setBatch] = useState('2026 Batch CS/IT');
  const [durationDays, setDurationDays] = useState(14);
  const [focusTopics, setFocusTopics] = useState('Quantitative Speed, Logic Puzzles, Hands-on Coding');
  const [mandatoryMocks, setMandatoryMocks] = useState(2);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [activated, setActivated] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.activateCompanyDrive({
        companyName: company,
        targetBatch: batch,
        durationDays,
        focusTopics: focusTopics.split(',').map((s) => s.trim()),
        mandatoryMockRounds: mandatoryMocks,
      }),
    onSuccess: (res) => {
      setConfirmModalOpen(false);
      setActivated(true);
      toast.success(res.message);
    },
    onError: (err) => {
      toast.error(getFriendlyErrorMessage(err));
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Company drives</h1>
          <p className="text-xs text-gray-400">
            Switch on drive mode for a visiting company to set its cutoffs and the mock rounds students must complete.
          </p>
        </div>

        {activated && (
          <Badge variant="success" size="md">
            Drive Mode Active for {company}
          </Badge>
        )}
      </div>

      {/* Activation Settings */}
      <Card className="p-8 bg-[#171716] border-gray-800 space-y-6">
        <div className="space-y-4">
          <Select
            label="Visiting Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            options={[
              { value: 'TCS', label: 'TCS (Tata Consultancy Services - NQT Drive)' },
              { value: 'Amazon', label: 'Amazon (SDE-1 Campus OA & Voice Loop)' },
              { value: 'Infosys', label: 'Infosys (Specialist Programmer Drive)' },
              { value: 'Zoho', label: 'Zoho Corporation (Console App Track)' },
              { value: 'Accenture', label: 'Accenture (Cognitive & Technical AMCAT)' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Target Batch Cohort"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
            <Input
              label="Drive Preparation Window (Days)"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mandatory Mock Rounds per Student"
              type="number"
              value={mandatoryMocks}
              onChange={(e) => setMandatoryMocks(Number(e.target.value))}
            />
            <Input
              label="Curriculum Focus Topics"
              value={focusTopics}
              onChange={(e) => setFocusTopics(e.target.value)}
            />
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="p-5 rounded-lg bg-[#1F1F1E] border border-gray-800 space-y-3">
          <span className="text-xs font-bold text-amber-400">
            Drive Mode Live Preview:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block">Company:</span>
              <span className="font-bold text-white">{company}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Audience:</span>
              <span className="font-bold text-white">{batch}</span>
            </div>
            <div>
              <span className="text-gray-400 block">Duration:</span>
              <span className="font-mono text-brand-400 font-bold">{durationDays} Days</span>
            </div>
            <div>
              <span className="text-gray-400 block">Required Mocks:</span>
              <span className="font-mono text-emerald-400 font-bold">{mandatoryMocks} Sessions</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setConfirmModalOpen(true)}
            className="bg-amber-700 hover:bg-amber-800 border-amber-500/30 shadow-lg"
          >
            Launch Drive Mode Notification
          </Button>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={`Activate ${company} Drive Mode?`}
        description={`This will notify all students in "${batch}" to prioritize ${company} aptitude formats and take ${mandatoryMocks} mandatory mock interviews.`}
      >
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" size="sm" onClick={() => setConfirmModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="bg-amber-700 hover:bg-amber-800"
          >
            Confirm & Broadcast
          </Button>
        </div>
      </Modal>
    </div>
  );
};
