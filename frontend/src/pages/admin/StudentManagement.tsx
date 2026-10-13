import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { AdminStudentSummary } from '../../types/admin';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Search, Flame, FileText } from '../../components/icons';
import { Link } from 'react-router-dom';

export const StudentManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentSummary | null>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin-students', search],
    queryFn: () => adminApi.getStudents(search),
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="p-8 rounded-xl bg-[#1F1F1E] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Students</h1>
          <p className="text-xs text-gray-400">
            Each student's interview transcripts, aptitude history and readiness.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search candidate name, dept or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="bg-[#171716] border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 bg-[#1F1F1E]/50 text-gray-400 font-semibold">
                <th className="py-3.5 px-4">Candidate</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Target Role</th>
                <th className="py-3.5 px-4">Readiness</th>
                <th className="py-3.5 px-4">Practice Activity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {(isLoading || students.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-xs text-gray-500">
                    {isLoading ? 'Loading students…' : 'No students found.'}
                  </td>
                </tr>
              )}
              {students.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="hover:bg-[#1F1F1E]/40 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-600/20 text-brand-400 font-bold flex items-center justify-center shrink-0">
                        {(student.name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-200">{student.name || 'Candidate'}</div>
                        <div className="text-[11px] text-gray-400">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-300">{student.department || 'Computer Science'}</td>
                  <td className="py-4 px-4 text-brand-300 font-medium">{student.targetRole || 'Software Development Engineer'}</td>
                  <td className="py-4 px-4">
                    <div className="w-24 space-y-1">
                      <span className="font-mono font-bold text-emerald-400">{student.readinessScore ?? 0}%</span>
                      <ProgressBar value={student.readinessScore ?? 0} color="success" size="sm" />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-gray-300 font-mono">
                      {student.interviewsCompleted ?? 0} Mocks • {student.aptitudeCompleted ?? 0} Apt
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant={
                        (student.placementStatus === 'Placed' || (student.readinessScore || 0) >= 85)
                          ? 'success'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {student.placementStatus || 'In Process'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Button variant="ghost" size="sm" className="text-amber-400">
                      View Profile
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Drill-Down Modal */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={selectedStudent.name}
          description={`${selectedStudent.department} • Batch of ${selectedStudent.batchYear}`}
          maxWidth="lg"
        >
          <div className="space-y-6 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#171716] border border-gray-800">
                <div className="text-[11px] text-gray-400 font-semibold">Placement Readiness</div>
                <div className="text-3xl font-semibold text-emerald-400 font-mono mt-1">
                  {selectedStudent.readinessScore}%
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#171716] border border-gray-800">
                <div className="text-[11px] text-gray-400 font-semibold">Activity Streak</div>
                <div className="text-2xl font-bold text-amber-400 font-mono mt-1 flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-amber-400" /> {selectedStudent.streak} Days
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Email Address:</span>
                <span className="text-gray-200 font-mono">{selectedStudent.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Aspirational Target:</span>
                <span className="text-brand-400 font-bold">{selectedStudent.targetRole}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Last Practice Active:</span>
                <span className="text-gray-300 font-mono">{selectedStudent.lastActive}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-800">
                <span className="text-gray-400">Placement Clearance:</span>
                <span className="text-emerald-400 font-bold">{selectedStudent.placementStatus}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              {selectedStudent.latestInterviewId ? (
                <Link to={`/report/${selectedStudent.latestInterviewId}`}>
                  <Button variant="primary" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
                    Inspect Latest Mock Report
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" size="sm" disabled leftIcon={<FileText className="w-4 h-4" />}>
                  Inspect Latest Mock Report
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
