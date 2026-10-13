import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { aptitudeApi } from '../../api/aptitude';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatDateTime } from '../../lib/formatters';
import { Search, BookOpen } from '../../components/icons';

export const AptitudeHistory: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['aptitude-history'],
    queryFn: () => aptitudeApi.getHistory(),
  });

  const filtered = useMemo(() => {
    if (!search) return history;
    const q = search.toLowerCase();
    return history.filter(
      (h) =>
        h.role.toLowerCase().includes(q) ||
        (h.company && h.company.toLowerCase().includes(q))
    );
  }, [history, search]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Aptitude test history</h1>
          <p className="text-xs text-gray-400">
            Past scores, section accuracy and time taken for each test.
          </p>
        </div>

        <Link to="/aptitude">
          <Button variant="primary" size="md" leftIcon={<BookOpen className="w-4 h-4" />}>
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          placeholder="Filter by role or company pattern..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4 text-gray-400" />}
        />
      </div>

      {/* History Table */}
      <Card className="bg-[#171716] border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#1F1F1E]/50 text-gray-400 font-semibold">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Job Role</th>
                <th className="py-3.5 px-4">Company Pattern</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4">Accuracy</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {(isLoading || filtered.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-xs text-gray-500">
                    {isLoading ? 'Loading history…' : 'No aptitude tests taken yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.sessionId} className="hover:bg-[#1F1F1E]/40 transition-colors">
                  <td className="py-4 px-4 text-gray-400 font-mono">{formatDateTime(item.date)}</td>
                  <td className="py-4 px-4 font-bold text-gray-200">{item.role}</td>
                  <td className="py-4 px-4">
                    <Badge variant="neutral" size="sm">{item.company || 'Standard'}</Badge>
                  </td>
                  <td className="py-4 px-4 text-gray-400 font-mono">{item.durationMinutes} mins</td>
                  <td className="py-4 px-4">
                    <span className="font-bold text-brand-400 font-mono text-sm">{item.scorePercentage}%</span>
                  </td>
                  <td className="py-4 px-4 font-mono text-emerald-400">{item.accuracyPercentage}%</td>
                  <td className="py-4 px-4 text-right">
                    <Link to={`/aptitude/${item.sessionId}/results`}>
                      <Button variant="ghost" size="sm" className="text-brand-400">
                        View Review
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
