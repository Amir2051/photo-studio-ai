// Security Testing Center Page
// Security review workbench, vulnerability scanner, checklist

import React, { useState } from 'react';
import { Card, Button, Input, Badge, EmptyState, Icon, Spinner, Dialog, cx, showToast } from '../components/ui';

// ─── Security Testing Center ────────────────────────────────────────
export default function Security(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState('checklist');
  const [reviewResults, setReviewResults] = useState([
    { id: 's1', title: 'Input Validation', category: 'code', severity: 'high', status: 'pass', description: 'All inputs are validated with strict allowlists' },
    { id: 's2', title: 'SQL Injection', category: 'code', severity: 'critical', status: 'fail', description: 'Use parameterized queries to prevent SQL injection' },
    { id: 's3', title: 'XSS Protection', category: 'code', severity: 'high', status: 'pass', description: 'Output encoding is applied to all user data' },
    { id: 's4', title: 'Authentication', category: 'code', severity: 'critical', status: 'fail', description: 'Implement multi-factor authentication' },
    { id: 's5', title: 'Secrets Management', category: 'config', severity: 'high', status: 'pass', description: 'Private keys stored in encrypted vault' },
  ]);

  const [newFinding, setNewFinding] = useState({ title: '', category: 'code', severity: 'medium', description: '' });
  const [showForm, setShowForm] = useState(false);

  const handleSubmitFinding = () => {
    if (!newFinding.title || !newFinding.description) {
      showToast('Please provide a title and description', 'warning');
      return;
    }
    const finding = {
      id: 's' + Date.now(),
      title: newFinding.title,
      category: newFinding.category,
      severity: newFinding.severity,
      status: 'fail',
      description: newFinding.description,
    };
    setReviewResults((prev) => [finding, ...prev]);
    setNewFinding({ title: '', category: 'code', severity: 'medium', description: '' });
    setShowForm(false);
    showToast('Security finding registered', 'success');
  };

  const statusColors = {
    pass: 'bg-green-500/20 text-green-400 border-green-500/30',
    fail: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const severityColors = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Security Testing Center</h1>
          <p className="text-sm text-gray-400 mt-1">Security review workbench — identity preservation, crypto review, protocols</p>
        </div>
        <Button variant="secondary"><Icon name="shield" size={18} /> Run Scan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Checklist */}
        <Card className="p-5 lg:col-span-3">
          <h2 className="text-lg font-semibold text-white mb-4">Review Checklist</h2>
          <div className="space-y-3">
            {reviewResults.map((finding) => (
              <div key={finding.id} className={cx(
                'p-4 rounded-lg border',
                finding.status === 'pass' ? 'bg-green-500/5 border-green-500/20' : finding.status === 'fail' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5'
              )}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="shield" size={18} className={finding.status === 'pass' ? 'text-green-400' : 'text-red-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-200 truncate">{finding.title}</h4>
                      <Badge color={finding.severity === 'critical' ? 'red' : finding.severity === 'high' ? 'orange' : 'yellow'}>{finding.severity}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{finding.description}</p>
                    <Badge color={finding.status === 'pass' ? 'green' : finding.status === 'fail' ? 'red' : 'yellow'} className="mt-2">
                      {finding.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Register Finding */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Report Issue</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Title</label>
              <Input
                value={newFinding.title}
                onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
                placeholder="e.g., Missing rate limiting"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Severity</label>
              <select
                value={newFinding.severity}
                onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea
                value={newFinding.description}
                onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                rows={3}
                placeholder="Describe the security issue..."
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSubmitFinding}
              className="w-full"
              disabled={!newFinding.title || !newFinding.description}
            >
              <Icon name="upload" size={16} />
              <span className="ml-2">Register Finding</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
