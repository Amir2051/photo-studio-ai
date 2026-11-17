// AI Agent Control Center Page
// Manage AI agents, tasks, and audit trails

import React, { useState } from 'react';
import { Card, Button, Input, Badge, EmptyState, Icon, Spinner, Dialog } from '../components/ui';
import { showToast, cx } from '../components/ui';

// ─── AI Agent Control Center ────────────────────────────────────────
export default function Agents(): React.JSX.Element {
  const [agents, setAgents] = useState([
    { id: 'agent-1', name: 'Code Interpreter', type: 'implementation', status: 'idle', tasks: 3, lastActive: '2 min ago', icon: 'code', color: 'blue' },
    { id: 'agent-2', name: 'Reviewer', type: 'review', status: 'active', tasks: 1, lastActive: '1 min ago', icon: 'shield', color: 'green' },
    { id: 'agent-3', name: 'Test Engineer', type: 'testing', status: 'idle', tasks: 5, lastActive: '10 min ago', icon: 'check-circle', color: 'yellow' },
    { id: 'agent-4', name: 'Documentation Writer', type: 'documentation', status: 'offline', tasks: 0, lastActive: '1 hour ago', icon: 'file', color: 'gray' },
  ]);

  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', type: 'implementation', task: '' });

  const handleCreateAgent = () => {
    if (!newAgent.name || !newAgent.task) {
      showToast('Please provide a name and task', 'warning');
      return;
    }
    const agent = {
      id: 'agent-' + Date.now(),
      name: newAgent.name,
      type: newAgent.type as any,
      status: 'idle',
      tasks: 0,
      lastActive: 'just now',
      icon: 'code',
      color: 'blue',
    };
    setAgents([agent, ...agents]);
    setNewAgent({ name: '', type: 'implementation', task: '' });
    setShowCreate(false);
    showToast('Agent created', 'success');
  };

  const statusColors = {
    idle: 'bg-yellow-500/20 text-yellow-400',
    active: 'bg-green-500/20 text-green-400',
    offline: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">AI Agent Control Center</h1>
          <p className="text-sm text-gray-400 mt-1">Manage AI agents, tasks, and audit trails.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="user" size={18} /> User Management</Button>
        </div>
      </div>

      {/* Agent list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={cx(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                agent.color === 'blue' ? 'bg-blue-500/20' : agent.color === 'green' ? 'bg-green-500/20' : agent.color === 'yellow' ? 'bg-yellow-500/20' : 'bg-gray-500/20'
              )}>
                <Icon name={agent.icon} size={20} className={agent.color === 'blue' ? 'text-blue-400' : agent.color === 'green' ? 'text-green-400' : agent.color === 'yellow' ? 'text-yellow-400' : 'text-gray-400'} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                <p className="text-xs text-gray-500">{agent.type}</p>
              </div>
              <Badge color={agent.status === 'active' ? 'green' : agent.status === 'idle' ? 'yellow' : 'gray'} className="mt-1">{agent.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Icon name="check" size={12} /> {agent.tasks} tasks</span>
              <span>Last active: {agent.lastActive}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Create New Agent</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Agent Name</label>
            <Input
              value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              placeholder="e.g., Test Runner"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              value={newAgent.type}
              onChange={(e) => setNewAgent({ ...newAgent, type: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="implementation">Implementation</option>
              <option value="review">Review</option>
              <option value="testing">Testing</option>
              <option value="documentation">Documentation</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Task Description</label>
            <textarea
              value={newAgent.task}
              onChange={(e) => setNewAgent({ ...newAgent, task: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              rows={3}
              placeholder="What should this agent do?"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="primary" onClick={handleCreateAgent}>
            <Icon name="user" size={16} />
            <span className="ml-2">Create Agent</span>
          </Button>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}
