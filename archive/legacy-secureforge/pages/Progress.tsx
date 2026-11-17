// Progress & Assessments Page
// Learning progress, assessments, grades, skill metrics

import React, { useState } from 'react';
import { Card, Button, Badge, EmptyState, Icon, ProgressBar, Spinner, Dialog } from '../components/ui';
import { useAppStore } from '../stores/appStore';

// ─── Progress & Assessments ─────────────────────────────────────────
export default function Progress(): React.JSX.Element {
  const [assessment, setAssessment] = useState({
    module: 'Python HTTP Server',
    score: 85,
    time: '15 min',
    status: 'completed',
  });
  const [showResult, setShowResult] = useState(false);

  const grades = [
    { module: 'Python Basics', grade: 'A', score: 92, icon: 'code', color: 'blue', time: '45 min' },
    { module: 'HTTP Servers', grade: 'A-', score: 88, icon: 'code', color: 'blue', time: '40 min' },
    { module: 'C++ Memory Mgmt', grade: 'B+', score: 82, icon: 'code', color: 'violet', time: '50 min' },
    { module: 'Cryptography', grade: 'A', score: 90, icon: 'crypto', color: 'red', time: '55 min' },
    { module: 'Embedded Systems', grade: 'B', score: 75, icon: 'embedded', color: 'green', time: '60 min' },
  ];

  const skillTrends = [
    { skill: 'Python', trend: '▲ 8%', current: 90, color: 'blue' },
    { skill: 'C/C++', trend: '▲ 12%', current: 55, color: 'violet' },
    { skill: 'Cryptography', trend: '▲ 5%', current: 60, color: 'red' },
    { skill: 'Embedded', trend: '→ 3%', current: 25, color: 'green' },
    { skill: 'Security', trend: '▲ 8%', current: 45, color: 'red' },
  ];

  const averageScore = Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Progress & Assessments</h1>
          <p className="text-sm text-gray-400 mt-1">Track your learning progress, assessments, and skill growth.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="download" size={18} /> Export Report</Button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Icon name="check" size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Average Score</p>
              <p className="text-lg font-semibold text-white">{averageScore}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Icon name="check-circle" size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Modules Completed</p>
              <p className="text-lg font-semibold text-white">3/5</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Icon name="sparkles" size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Study Streak</p>
              <p className="text-lg font-semibold text-white">12 days</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Icon name="clock" size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Weekly Hours</p>
              <p className="text-lg font-semibold text-white">6.5h</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Grades table */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Assessment Results</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 pr-4 text-gray-400 font-medium">Module</th>
                <th className="text-left py-3 pr-4 text-gray-400 font-medium">Grade</th>
                <th className="text-left py-3 pr-4 text-gray-400 font-medium">Score</th>
                <th className="text-left py-3 text-gray-400 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g) => (
                <tr key={g.module} className="border-b border-white/5">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Icon name={g.icon} size={16} className={g.color === 'blue' ? 'text-blue-400' : g.color === 'violet' ? 'text-violet-400' : 'text-green-400'} />
                      <span className="text-gray-200">{g.module}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge color={g.grade.startsWith('A') ? 'green' : g.grade.startsWith('B') ? 'blue' : 'yellow'}>{g.grade}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-gray-300 font-mono">{g.score}%</td>
                  <td className="py-3 text-gray-500">{g.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Skill trends */}
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Skill Trends</h2>
        <div className="space-y-3">
          {skillTrends.map((t) => (
            <div key={t.skill}>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-200">{t.skill}</span>
                <span className="text-xs text-gray-400 font-mono">{t.trend}</span>
              </div>
              <ProgressBar value={t.current} max={100} color={t.color as any} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
