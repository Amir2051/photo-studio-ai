// Projects & Portfolio Page
// Track and showcase engineering projects

import React, { useState } from 'react';
import { Card, Button, Input, Badge, EmptyState, Icon, Spinner, Dialog, ProgressBar, showToast, cx } from '../components/ui';
import { useAppStore } from '../stores/appStore';

// ─── Projects & Portfolio ───────────────────────────────────────────
export default function Projects(): React.JSX.Element {
  const [projects, setProjects] = useState([
    { id: 'p1', title: 'SecureForge Lab — AI Photo Editor', description: 'Full-stack PWA with Canvas 2D/3D image processing, AI assistant, and scene placement studio.', progress: 75, tags: ['react', 'vite', 'canvas', 'ai'], icon: 'sparkles', color: 'blue', status: 'active' },
    { id: 'p2', title: 'Crypto Academy — PWA Boilerplate', description: 'Interactive cryptography learning platform with sandboxed code execution.', progress: 60, tags: ['fastapi', 'react', 'crypto'], icon: 'crypto', color: 'violet', status: 'active' },
    { id: 'p3', title: 'SafeNestT — AI Cybersecurity Platform', description: 'Secure intelligence platform for case management and evidence tracking.', progress: 45, tags: ['python', 'fastapi', 'supabase'], icon: 'shield', color: 'red', status: 'active' },
    { id: 'p4', title: 'Embedded Firmware Lab', description: 'ARM Cortex-M simulator with virtual peripherals.', progress: 30, tags: ['c', 'arm', 'embedded'], icon: 'embedded', color: 'green', status: 'planning' },
  ]);

  const [newProject, setNewProject] = useState({ title: '', description: '', tags: '' });
  const [showForm, setShowForm] = useState(false);

  const handleAddProject = () => {
    if (!newProject.title || !newProject.description) {
      showToast('Please provide a title and description', 'warning');
      return;
    }
    const project = {
      id: 'p' + Date.now(),
      title: newProject.title,
      description: newProject.description,
      progress: 0,
      tags: newProject.tags.split(',').map((t) => t.trim()).filter(Boolean),
      icon: 'code',
      color: 'blue',
      status: 'active',
    };
    setProjects([...projects, project]);
    setNewProject({ title: '', description: '', tags: '' });
    setShowForm(false);
    showToast('Project added to portfolio', 'success');
  };

  const handleUpdateProgress = (id: string, progress: number) => {
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, progress: Math.min(100, Math.max(0, progress)) } : p));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Projects & Portfolio</h1>
          <p className="text-sm text-gray-400 mt-1">Track your engineering projects and showcase your work.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowForm(!showForm)}>
            <Icon name="plus" size={18} />
            <span className="ml-2">{showForm ? 'Cancel' : 'New Project'}</span>
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <Input
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="e.g., Home Automation System"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
              <Input
                value={newProject.tags}
                onChange={(e) => setNewProject({ ...newProject, tags: e.target.value })}
                placeholder="react, node, docker"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                rows={3}
                placeholder="Brief description of the project..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" onClick={handleAddProject}>Save</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cx('w-12 h-12 rounded-xl flex items-center justify-center', project.color === 'blue' ? 'bg-blue-500/20' : project.color === 'violet' ? 'bg-violet-500/20' : 'bg-green-500/20')}>
                <Icon name={project.icon} size={24} className={project.color === 'blue' ? 'text-blue-400' : project.color === 'violet' ? 'text-violet-400' : 'text-green-400'} />
              </div>
              <Badge color={project.status === 'active' ? 'green' : 'gray'}>{project.status}</Badge>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
            <p className="text-sm text-gray-400 mb-4">{project.description}</p>
            <ProgressBar value={project.progress} max={100} color={project.color as any} />
            <div className="flex gap-1 mt-3">
              {project.tags.map((tag) => (
                <Badge key={tag} color="gray">{tag}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
