import React, { useState } from 'react';
import { resumeApi } from '../../api/resume';
import { BulletImprovement } from '../../types/resume';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Copy, Check, ArrowRight, ArrowLeft } from '../../components/icons';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../api/client';

export const BulletGenerator: React.FC = () => {
  const [inputBullet, setInputBullet] = useState(
    'Worked on a full stack dashboard with React and Node.js to show analytics and fixed bugs.'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BulletImprovement | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!inputBullet.trim()) return;
    setIsLoading(true);
    try {
      const data = await resumeApi.improveBullet(inputBullet);
      setResult(data);
      toast.success(`Generated ${data.improvedVariants.length} rewritten bullet point(s)`);
    } catch (err) {
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Bullet point copied');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Rewrite resume bullet points</h1>
          <p className="text-xs text-gray-400">
            Turn a duty into a result: what you built, how you built it, and what changed because of it.
          </p>
        </div>

        <Link to="/resume">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Resume
          </Button>
        </Link>
      </div>

      {/* Input Card */}
      <Card className="p-6 bg-[#171716] border-gray-800 space-y-4">
        <label className="block text-xs font-semibold text-gray-300">
          Enter Your Current Resume Bullet Point
        </label>
        <textarea
          rows={3}
          value={inputBullet}
          onChange={(e) => setInputBullet(e.target.value)}
          placeholder="e.g. Built an API in Python to process orders and handle user database queries."
          className="w-full bg-[#1F1F1E] border border-gray-700/80 rounded-xl p-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 leading-relaxed"
        />

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            isLoading={isLoading}
            onClick={handleGenerate}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Generate Quantified Variants
          </Button>
        </div>
      </Card>

      {/* Results Variants */}
      {result && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-200">
            Optimized High-Impact Variants
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {result.improvedVariants.map((item, idx) => (
              <Card key={idx} className="p-6 bg-[#171716] border-gray-800 space-y-3 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <Badge variant={idx === 0 ? 'success' : idx === 1 ? 'accent' : 'secondary'} size="sm">
                    {item.focus}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopy(item.variant, idx)}
                    leftIcon={copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedIdx === idx ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <p className="text-xs sm:text-sm text-gray-100 leading-relaxed font-medium">
                  {item.variant}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
