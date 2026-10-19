// Learning Roadmap Page
// Visual progression through the engineering curriculum

import React from 'react';
import { Card, Badge, EmptyState, Icon, Button, ProgressBar, cx } from '../components/ui';
import { useAppStore } from '../stores/appStore';

const STAGES = [
  {
    id: 'stage-1',
    label: 'Python Application Developer',
    icon: 'code',
    color: 'blue',
    modules: [
      { id: 'm1', name: 'Python Basics', completed: true },
      { id: 'm2', name: 'HTTP Servers and APIs', completed: true },
      { id: 'm3', name: 'Asynchronous Programming', completed: false },
      { id: 'm4', name: 'Database Integration', completed: false },
      { id: 'm5', name: 'Testing and CI/CD', completed: false },
    ],
  },
  {
    id: 'stage-2',
    label: 'C/C++ Application Developer',
    icon: 'code',
    color: 'violet',
    modules: [
      { id: 'm1', name: 'C Memory Management', completed: false },
      { id: 'm2', name: 'Pointers and Dynamic Allocation', completed: false },
      { id: 'm3', name: 'C++ Classes and Objects', completed: false },
      { id: 'm4', name: 'STL Containers', completed: false },
      { id: 'm5', name: 'Templates and Generics', completed: false },
    ],
  },
  {
    id: 'stage-3',
    label: 'Embedded Systems Engineer',
    icon: 'embedded',
    color: 'green',
    modules: [
      { id: 'm1', name: 'ARM Cortex-M Basics', completed: false },
      { id: 'm2', name: 'Peripheral Configuration', completed: false },
      { id: 'm3', name: 'Real-Time Operating Systems', completed: false },
      { id: 'm4', name: 'Interrupt Handling', completed: false },
      { id: 'm5', name: 'Bootloaders and Firmware', completed: false },
    ],
  },
  {
    id: 'stage-4',
    label: 'Firmware Engineering Expert',
    icon: 'hardware',
    color: 'red',
    modules: [
      { id: 'm1', name: 'Secure Boot Implementation', completed: false },
      { id: 'm2', name: 'Firmware Updates (OTA)', completed: false },
      { id: 'm3', name: 'Hardware Security Modules', completed: false },
      { id: 'm4', name: 'Crypto Auth (ECC/RSA)', completed: false },
      { id: 'm5', name: 'Production Firmware', completed: false },
    ],
  },
];

const ADVANCED_TOPICS = [
  { id: 't1', title: 'Cryptography', level: 65, tags: ['hash', 'aes', 'rsa'] },
  { id: 't2', title: 'Embedded Firmware', level: 20, tags: ['arm', 'rtos', 'ota'] },
  { id: 't3', title: 'Security Testing', level: 30, tags: ['pen-test', 'static', 'dynamic'] },
  { id: 't4', title: 'AI Integration', level: 40, tags: ['llm', 'prompt', 'ml'] },
];

const MILESTONES = [
  { id: 'm1', title: 'Python HTTP Server', description: 'Build a web server from scratch in Python', icon: 'code', completed: true },
  { id: 'm2', title: 'Crypto Hash Explorer', description: 'Explore SHA-256, Keccak, and more', icon: 'crypto', completed: true },
  { id: 'm3', title: 'C++ Sandbox', description: 'Sandboxed C++ compilation and execution', icon: 'code', completed: false },
  { id: 'm4', title: 'Virtual Hardware Bench', description: 'Simulate ARM MCU peripherals', icon: 'hardware', completed: false },
  { id: 'm5', title: 'Security Testing Lab', description: 'Vulnerability discovery and remediation', icon: 'security', completed: false },
];

export default function Roadmap(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Learning Roadmap</h1>
          <p className="text-sm text-gray-400 mt-1">Your path from Python to Firmware Engineering. Track your progress.</p>
        </div>
        <Button variant="secondary"><Icon name="roadmap" size={18} /> Print Roadmap</Button>
      </div>

      {/* Stage progression */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const completedCount = stage.modules.filter((m) => m.completed).length;
          const totalCount = stage.modules.length;
          const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          return (
            <Card key={stage.id} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={cx('w-12 h-12 rounded-xl flex items-center justify-center', stage.color === 'blue' ? 'bg-blue-500/20' : stage.color === 'violet' ? 'bg-violet-500/20' : 'bg-green-500/20')}>
                  <Icon name={stage.icon} size={24} className={stage.color === 'blue' ? 'text-blue-400' : stage.color === 'violet' ? 'text-violet-400' : 'text-green-400'} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{stage.label}</h3>
                  <p className="text-xs text-gray-500">{completedCount}/{totalCount} modules complete</p>
                </div>
              </div>
              <ProgressBar value={progress} max={100} color={stage.color as any} showLabel={false} />
              <div className="flex flex-wrap gap-1 mt-3">
                {stage.modules.map((module) => (
                  <Badge key={module.id} color={module.completed ? 'green' : 'gray'}>
                    {module.name.split(' ').map(w => w[0]).join('')}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Advanced topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Advanced Topics</h2>
          <div className="space-y-4">
            {ADVANCED_TOPICS.map((topic) => (
              <div key={topic.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-200">{topic.title}</span>
                  <span className="text-xs text-gray-400 font-mono">{topic.level}%</span>
                </div>
                <ProgressBar value={topic.level} max={100} color="blue" />
                <div className="flex gap-1 mt-2">
                  {topic.tags.map((tag) => (
                    <Badge key={tag} color="gray">{tag}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Milestones */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Milestones</h2>
          <div className="space-y-4">
            {MILESTONES.map((m) => (
              <div key={m.id} className={cx('p-3 rounded-lg', m.completed ? 'bg-green-500/5 border border-green-500/20' : 'bg-white/5 border border-white/5')}>
                <div className="flex items-center gap-3">
                  <div className={cx('w-10 h-10 rounded-lg flex items-center justify-center', m.completed ? 'bg-green-500/20' : 'bg-white/10')}>
                    <Icon name={m.icon} size={20} className={m.completed ? 'text-green-400' : 'text-gray-500'} />
                  </div>
                  <div className="flex-1">
                    <h4 className={cx('text-sm font-semibold', m.completed ? 'text-white' : 'text-gray-400')}>{m.title}</h4>
                    <p className="text-xs text-gray-500">{m.description}</p>
                  </div>
                  {m.completed && <Icon name="check" size={20} className="text-green-400" />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
