// Dashboard Page — The main application hub
// Shows: current stage, today's tasks, completion percentage, skills, milestones

import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import { usePhotoEditorStore } from '../stores/appStore';
import { Card, Skeleton, Button, ProgressBar, Badge, Avatar, EmptyState, Icon, Sidebar, cx, Spinner } from '../components/ui';
import { formatDate, formatTime, formatBytes, generateId } from '../lib/utils';
import { FILTER_LIBRARY, CATEGORIES } from '../lib/filters';

// ─── Dashboard Data ──────────────────────────────────────────────────
const STAGES = [
  { id: 'python-app', label: 'Python Application Developer', icon: 'code', color: 'blue', level: 1 },
  { id: 'c-cpp', label: 'C/C++ Application Developer', icon: 'code', color: 'violet', level: 2 },
  { id: 'embedded', label: 'Embedded Systems Engineer', icon: 'embedded', color: 'green', level: 3 },
  { id: 'firmware', label: 'Firmware Engineering Expert', icon: 'hardware', color: 'red', level: 4 },
];

const TODAY_TASKS = [
  { id: 't1', label: 'Complete the Python HTTP server project', icon: 'code', category: 'project' },
  { id: 't2', label: 'Review C++ memory management exercises', icon: 'code', category: 'exercise' },
  { id: 't3', label: 'Study cryptographic hash functions', icon: 'crypto', category: 'study' },
  { id: 't4', label: 'Design virtual hardware bench module', icon: 'hardware', category: 'project' },
];

const SKILLS = [
  { id: 'js', label: 'JavaScript/TypeScript', level: 90, icon: 'code', color: 'blue' },
  { id: 'py', label: 'Python', level: 85, icon: 'code', color: 'blue' },
  { id: 'c', label: 'C/C++', level: 45, icon: 'code', color: 'violet' },
  { id: 'crypto', label: 'Cryptography', level: 40, icon: 'crypto', color: 'red' },
  { id: 'embedded', label: 'Embedded Systems', level: 20, icon: 'embedded', color: 'green' },
  { id: 'security', label: 'Security Testing', level: 30, icon: 'security', color: 'red' },
];

const PORTFOLIO_PROJECTS = [
  { id: 'p1', title: 'SecureForge Lab — AI Photo Editor', description: 'Full-stack PWA with Canvas 2D/3D image processing, AI assistant, and scene placement studio.', progress: 75, tags: ['react', 'vite', 'canvas', 'ai'], color: 'blue' },
  { id: 'p2', title: 'Crypto Academy — PWA Boilerplate', description: 'Interactive cryptography learning platform with sandboxed code execution.', progress: 60, tags: ['fastapi', 'react', 'crypto'], color: 'violet' },
  { id: 'p3', title: 'SafeNestT — AI Cybersecurity Platform', description: 'Secure intelligence platform for case management and evidence tracking.', progress: 45, tags: ['python', 'fastapi', 'supabase'], color: 'red' },
];

const RECENT_AI_CONVERSATIONS = [
  { id: 'a1', prompt: 'Make this brighter without washing out the skin', response: 'Brighter! I\'d suggest increasing exposure by +20 and boosting highlights by +15. Would you like me to apply these adjustments?', time: '10 min ago', icon: 'sparkles', color: 'blue' },
  { id: 'a2', prompt: 'Give this picture a warm film-camera look', response: 'Classic film look! I\'d add subtle grain (0.3), warm the temperature slightly, and apply a soft film fade. Shall I apply?', time: '1 hour ago', icon: 'film', color: 'yellow' },
  { id: 'a3', prompt: 'Apply the same style to all the pictures I select', response: 'Sure! I\'ll apply this style to all selected photos. Let me know which style you prefer.', time: '2 hours ago', icon: 'sparkles', color: 'green' },
];

const FAILURES = [
  { id: 'f1', error: 'Image data URL exceeded maximum length', suggestion: 'Use smaller preview images for initial upload. Re-export at full resolution for final output.', severity: 'info', time: '1 hour ago' },
  { id: 'f2', error: 'Filter preset not found', suggestion: 'Check that the preset ID exists in the library. Verify filter import in the component.', severity: 'warning', time: '2 hours ago' },
];

const NEXT_MILESTONE = {
  title: 'Firmware Engineering',
  description: 'Complete the embedded systems lab and achieve 80% course completion.',
  icon: 'hardware',
  color: 'green',
  tasks: ['Build a C++ HTTP server', 'Master cryptographic hash functions', 'Design a virtual hardware bench']
};

export default function Dashboard(): React.JSX.Element {
  const [currentStage, setCurrentStage] = useState(1);
  const [completion, setCompletion] = useState(62);
  const [selectedStage, setSelectedStage] = useState('python-app');
  const [showTasks, setShowTasks] = useState(true);

  const todayTaskCount = TODAY_TASKS.filter((t) => t.category === 'study').length;
  const masteredSkills = SKILLS.filter((s) => s.level >= 80).length;
  const needsReview = SKILLS.filter((s) => s.level < 50 && s.level >= 30).length;
  const successRate = 92;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Welcome back, Marc. Here's your engineering dashboard.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="upload" size={18} /> Upload</Button>
          <Button><Icon name="projects" size={18} /> New Project</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Icon name="dashboard" size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Current Stage</p>
              <p className="text-lg font-semibold text-white">{STAGES[currentStage - 1]?.label}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Icon name="check" size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Course Completion</p>
              <p className="text-lg font-semibold text-white">{completion}%</p>
            </div>
          </div>
          <ProgressBar value={completion} max={100} color="green" showLabel={false} />
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Icon name="sparkles" size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Skills Mastered</p>
              <p className="text-lg font-semibold text-white">{masteredSkills}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <Icon name="alert" size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Studies Today</p>
              <p className="text-lg font-semibold text-white">{todayTaskCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's tasks */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Today's Tasks</h2>
            <Button variant="ghost" size="sm">View all</Button>
          </div>
          <div className="space-y-3">
            {TODAY_TASKS.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className={cx(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  task.category === 'study' ? 'bg-blue-500/20' : task.category === 'exercise' ? 'bg-green-500/20' : 'bg-violet-500/20'
                )}>
                  <Icon name={task.icon} size={18} className={task.category === 'study' ? 'text-blue-400' : task.category === 'exercise' ? 'text-green-400' : 'text-violet-400'} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{task.label}</p>
                  <p className="text-xs text-gray-500">{task.category}</p>
                </div>
                <Button variant="ghost" size="sm"><Icon name="check" size={16} /></Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Current stage progression */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Progression</h2>
          <div className="space-y-4">
            {STAGES.map((stage, i) => (
              <div key={stage.id}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cx(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    i <= currentStage - 1 ? 'bg-blue-600' : 'bg-white/10'
                  )}>
                    {i < currentStage - 1 ? <Icon name="check" size={14} className="text-white" /> : <span className="text-xs font-medium">{i + 1}</span>}
                  </div>
                  <span className={cx(
                    'text-sm font-medium',
                    i <= currentStage - 1 ? 'text-white' : 'text-gray-500'
                  )}>{stage.label}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cx('h-full rounded-full transition-all duration-500', i < currentStage - 1 ? 'bg-green-500' : (i === currentStage - 1 ? 'bg-blue-500' : 'bg-white/20'))}
                    style={{ width: i < currentStage - 1 ? '100%' : (i === currentStage - 1 ? '75%' : '0%') }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Course Completion</span>
              <span className="text-white font-mono">{completion}%</span>
            </div>
            <ProgressBar value={completion} max={100} color="green" />
          </div>
        </Card>
      </div>

      {/* Skills & failures row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Skills Overview</h2>
          <div className="space-y-3">
            {SKILLS.map((skill) => (
              <div key={skill.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-200">{skill.label}</span>
                  <span className="text-xs text-gray-400 font-mono">{skill.level}%</span>
                </div>
                <ProgressBar value={skill.level} max={100} color={skill.color as 'blue' | 'violet' | 'green' | 'yellow' | 'red' | 'orange' | undefined} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-400">
            <span>Mastered: {masteredSkills} skills</span>
            <span>Needs review: {needsReview} skills</span>
          </div>
        </Card>

        {/* Recent AI & failures */}
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Recent AI Conversations</h2>
            <div className="space-y-4">
              {RECENT_AI_CONVERSATIONS.map((chat) => (
                <div key={chat.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-start gap-3">
                    <div className={cx('w-8 h-8 rounded-lg flex items-center justify-center', chat.color === 'blue' ? 'bg-blue-500/20' : chat.color === 'yellow' ? 'bg-yellow-500/20' : 'bg-green-500/20')}>
                      <Icon name={chat.icon} size={16} className={chat.color === 'blue' ? 'text-blue-400' : chat.color === 'yellow' ? 'text-yellow-400' : 'text-green-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200">{chat.prompt}</p>
                      <p className="text-xs text-gray-400 truncate">{chat.response}</p>
                      <p className="text-xs text-gray-500 mt-1">{chat.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Failures */}
          <Card className="p-5 border-red-500/20">
            <h2 className="text-lg font-semibold text-white mb-4">Latest Test Failures</h2>
            <div className="space-y-3">
              {FAILURES.map((failure) => (
                <div key={failure.id} className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Icon name="alert" size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200">{failure.error}</p>
                      <p className="text-xs text-gray-400">{failure.suggestion}</p>
                      <p className="text-xs text-gray-500 mt-1">{failure.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Next milestone & portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Next Milestone</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className={cx('w-12 h-12 rounded-xl flex items-center justify-center', NEXT_MILESTONE.color === 'green' ? 'bg-green-500/20' : 'bg-blue-500/20')}>
              <Icon name={NEXT_MILESTONE.icon} size={24} className={NEXT_MILESTONE.color === 'green' ? 'text-green-400' : 'text-blue-400'} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{NEXT_MILESTONE.title}</h3>
              <p className="text-sm text-gray-400">{NEXT_MILESTONE.description}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {NEXT_MILESTONE.tasks.map((task, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <Icon name="check" size={14} className="text-green-400" />
                {task}
              </li>
            ))}
          </ul>
        </Card>

        {/* Portfolio */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Projects</h2>
          <div className="space-y-4">
            {PORTFOLIO_PROJECTS.map((project) => (
              <div key={project.id} className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white truncate">{project.title}</h4>
                  <Badge color={project.color as any}>{project.progress}%</Badge>
                </div>
                <p className="text-xs text-gray-400">{project.description}</p>
                <div className="flex gap-1 mt-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-gray-400">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
