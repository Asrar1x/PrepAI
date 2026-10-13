import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { resumeApi } from '../../api/resume';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { UploadCloud, ArrowRight, ShieldCheck, FileCheck } from '../../components/icons';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const ResumeUpload: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast.error('Only PDF files under 5MB are supported.');
        return;
      }
      if (acceptedFiles[0]) {
        setFile(acceptedFiles[0]);
      }
    }
  });

  const handleUpload = async () => 
    {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(20);

    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p >= 90 ? p : p + 25));
    }, 400);

    try {
      const result = await resumeApi.uploadResume(file);
      clearInterval(progressTimer);
      setUploadProgress(100);
      toast.success('Resume analysed');
      navigate('/resume/score', { state: { result } });
    } catch (err) {
      clearInterval(progressTimer);
      toast.error(getFriendlyErrorMessage(err));
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="relative p-8 sm:p-9 rounded-xl bg-[#1E1E1C] border border-[#353532] overflow-hidden">

        <div className="relative z-10 space-y-3">
          <h1 className="text-2xl sm:text-4xl font-semibold text-[#F2F2EF] tracking-tight">
            Upload your resume
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            Upload a PDF. PrepAI scores it, checks it against a role, and lists the projects an interviewer is likely to ask about.
          </p>
        </div>
      </div>

      {/* Dropzone Card */}
      <Card variant="premium" className="p-7 sm:p-9 space-y-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
              : file
              ? 'border-emerald-500/50 bg-emerald-950/20'
              : 'border-[#353532] bg-[#1A1A19]/60 hover:border-brand-500/50 hover:bg-[#1E1E1C]/60'
          }`}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div
              className={`w-16 h-16 rounded-lg flex items-center justify-center text-white transition-transform duration-300 ${
                file
                  ? 'bg-emerald-500 scale-105'
                  : 'bg-brand-600'
              }`}
            >
              {file ? <FileCheck className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
            </div>

            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">{file.name}</p>
                <p className="text-xs font-mono text-emerald-400 font-semibold">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-200">
                  Drag & drop your resume PDF here, or <span className="text-brand-400 hover:underline">browse file</span>
                </p>
                <p className="text-xs text-gray-400">
                  Supports standard single/two-column PDF documents up to 5MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2 p-4 rounded-lg bg-[#141413] border border-[#353532]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-300">Extracting AST Sections & Verbs...</span>
              <span className="font-mono text-brand-400 font-bold">{uploadProgress}%</span>
            </div>
            <ProgressBar value={uploadProgress} color="accent" size="sm" />
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Private. Your resume is never shared without your permission.</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={!file || isUploading}
            isLoading={isUploading}
            onClick={handleUpload}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Run ATS Diagnosis
          </Button>
        </div>
      </Card>
    </div>
  );
};

