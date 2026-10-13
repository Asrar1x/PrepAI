import React, { useState } from 'react';
import { adminApi, ReportExportType } from '../../api/admin';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Download, FileSpreadsheet, FileText } from '../../components/icons';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const ReportExport: React.FC = () => {
  const [reportType, setReportType] = useState('full-batch');
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [batch, setBatch] = useState('2026 Batch CS/IT');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(30);
    try {
      const filename = await adminApi.exportReport(reportType as ReportExportType, format === 'excel' ? 'csv' : 'pdf', batch);
      setExportProgress(100);
      toast.success(`Export ready! Downloaded ${filename}`);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-amber-500/30">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Export reports</h1>
          <p className="text-xs text-gray-400 max-w-xl">
            Download batch results, interview transcripts and company readiness as files for NIRF and other institutional reporting.
          </p>
        </div>
      </div>

      <Card className="p-8 bg-[#171716] border-gray-800 space-y-6">
        <div className="space-y-4">
          <Select
            label="Report Scope"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'full-batch', label: 'Complete Batch Roster with Readiness Scores & Streaks' },
              { value: 'weak-topics', label: 'Weak topics and suggested remedial classes' },
              { value: 'company-readiness', label: 'Company Cutoff Clearance & Eligible Student List' },
              { value: 'ats-audit', label: 'Resume ATS Compliance & Formatting Audit' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Batch Cohort"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              options={[
                { value: '2026 Batch CS/IT', label: '2026 Batch (B.Tech CS / IT)' },
                { value: '2026 Batch ECE/EEE', label: '2026 Batch (Circuit Branches)' },
                { value: '2027 Pre-Final Year', label: '2027 Pre-Final Year Internship Cohort' },
              ]}
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-medium text-gray-300">Export Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('excel')}
                  aria-pressed={format === 'excel'}
                  className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                    format === 'excel'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-[#1F1F1E] border-gray-800 text-gray-400'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel / CSV (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('pdf')}
                  aria-pressed={format === 'pdf'}
                  className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                    format === 'pdf'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-400'
                      : 'bg-[#1F1F1E] border-gray-800 text-gray-400'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>PDF Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {isExporting && (
          <div className="p-4 rounded-xl bg-[#1F1F1E] border border-gray-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-300">Generating report tables...</span>
              <span className="font-mono text-amber-400 font-bold">{exportProgress}%</span>
            </div>
            <ProgressBar value={exportProgress} color="warning" size="sm" />
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            isLoading={isExporting}
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
            className="bg-amber-700 hover:bg-amber-800 border-amber-500/30"
          >
            Generate & Download Report
          </Button>
        </div>
      </Card>
    </div>
  );
};
