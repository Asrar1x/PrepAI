import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { adminApi } from '../../api/admin';
import { QuestionUploadStats } from '../../types/admin';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FileSpreadsheet, Download } from '../../components/icons';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const QuestionUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<QuestionUploadStats | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    multiple: false,
    onDrop: (accepted) => {
      if (accepted[0]) setFile(accepted[0]);
    }
  });

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const data = await adminApi.uploadQuestions(file);
      setStats(data);
      setShowSummaryModal(true);
      toast.success(`Imported ${data.acceptedRows} of ${data.totalRows} question(s).`);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'category,sub_category,job_role,company_tags,difficulty,question_text,options,correct_answer,explanation\n' +
      'Quantitative Aptitude,Time and Work,Software Development Engineer,"TCS,Infosys",Medium,"A can do a job in 12 days...","A:6|B:8|C:7|D:10",B,"Work done in 4 days = 20 units..."';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PrepAI_Question_Upload_Template.csv';
    a.click();
    toast.success('Downloaded CSV template');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Upload questions</h1>
          <p className="text-xs text-gray-400">
            Add your college's own aptitude questions, tagged by company and topic.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownloadTemplate}
          leftIcon={<Download className="w-4 h-4 text-amber-400" />}
        >
          Download CSV Template
        </Button>
      </div>

      {/* Upload Dropzone */}
      <Card className="p-8 bg-[#171716] border-gray-800 space-y-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
              : file
              ? 'border-emerald-500/40 bg-emerald-950/10'
              : 'border-gray-700/80 bg-[#1F1F1E]/50 hover:border-gray-600'
          }`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div
              className={`w-16 h-16 rounded-lg flex items-center justify-center text-white ${
                file ? 'bg-emerald-600' : 'bg-amber-700'
              }`}
            >
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{file.name}</p>
                <p className="text-xs font-mono text-emerald-400">
                  {(file.size / 1024).toFixed(1)} KB • Valid CSV file selected
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-200">
                  Drop your question CSV here, or <span className="text-amber-400">browse file</span>
                </p>
                <p className="text-xs text-gray-500">
                  Must follow standard 9-column PrepAI schema
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="lg"
            disabled={!file || isUploading}
            isLoading={isUploading}
            onClick={handleUpload}
            className="bg-amber-700 hover:bg-amber-800 border-amber-500/30"
          >
            Validate & Ingest Questions
          </Button>
        </div>
      </Card>

      {/* Summary Modal */}
      {stats && (
        <Modal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          title="Question Ingestion Summary"
          description="Batch parser completed validation across all rows in your file."
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#171716] rounded-xl border border-gray-800">
                <div className="text-[11px] text-gray-400">Total Rows</div>
                <div className="text-xl font-bold font-mono text-white mt-1">{stats.totalRows}</div>
              </div>
              <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/30">
                <div className="text-[11px] text-emerald-400">Accepted</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{stats.acceptedRows}</div>
              </div>
              <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-500/30">
                <div className="text-[11px] text-rose-400">Rejected</div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1">{stats.rejectedRows}</div>
              </div>
            </div>

            {stats.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-950/15 border border-rose-900/30 text-xs text-rose-300 space-y-1">
                <span className="font-bold">Errors Detected:</span>
                {stats.errors.map((err, i) => (
                  <div key={i} className="text-[11px] font-mono">
                    Row {err.row}: {err.reason}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button variant="secondary" size="sm" onClick={() => setShowSummaryModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
