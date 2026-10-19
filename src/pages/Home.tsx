// Home Page — Landing/Welcome
// Animated welcome with feature overview and quick actions

import React from 'react';
import { Button, Icon, Card, EmptyState, Spinner, Badge, cx } from '../components/ui';

// ─── Home Page ──────────────────────────────────────────────────────
export default function Home(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="hero rounded-2xl p-6 lg:p-10 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-violet-600/10 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight">
            SecureForge Lab
          </h1>
          <p className="text-lg text-gray-400 mt-3 max-w-lg mx-auto">
            AI-Powered Photo Editing Studio — Edit, enhance, and create stunning photographs
            with intelligent tools.
          </p>
          <Button size="lg" className="mt-6">
            <Icon name="upload" size={18} />
            <span className="ml-2">Open Editor</span>
          </Button>
          <p className="text-xs text-gray-500 mt-3">
            Works offline — upload, edit, and export photos locally.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: 'sparkles', title: 'AI Assistant', desc: 'Natural language photo editing with context-aware suggestions.', color: 'blue' },
          { icon: 'filter', title: '250+ Filters', desc: 'Composable presets for every style category — natural portraits, cinematic, vintage, and more.', color: 'violet' },
          { icon: 'mask', title: 'Face Preservation', desc: 'Identity protection by default. No face regeneration, adjustable retouching.', color: 'green' },
          { icon: 'scene', title: 'Scene Placement', desc: 'Place subjects into cities, streets, and landmarks with prompt-driven AI.', color: 'red' },
        ].map((f) => (
          <Card key={f.title} className="p-5">
            <div className={cx('w-12 h-12 rounded-xl flex items-center justify-center', f.color === 'blue' ? 'bg-blue-500/20' : f.color === 'violet' ? 'bg-violet-500/20' : f.color === 'green' ? 'bg-green-500/20' : 'bg-red-500/20')}>
              <Icon name={f.icon} size={24} className={f.color === 'blue' ? 'text-blue-400' : f.color === 'violet' ? 'text-violet-400' : f.color === 'green' ? 'text-green-400' : 'text-red-400'} />
            </div>
            <h3 className="text-base font-semibold text-white mt-4">{f.title}</h3>
            <p className="text-sm text-gray-400 mt-1">{f.desc}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Icon name="upload" size={24} className="text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-white mt-3">Upload Photo</h3>
          <p className="text-xs text-gray-500">Drag & drop or browse to add photos.</p>
          <Button variant="secondary" size="sm" className="mt-3 w-full">Open</Button>
        </Card>
        <Card className="p-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Icon name="sparkles" size={24} className="text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-white mt-3">AI Edit</h3>
          <p className="text-xs text-gray-500">Natural language photo editing.</p>
          <Button variant="secondary" size="sm" className="mt-3 w-full">AI Edit</Button>
        </Card>
        <Card className="p-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-green-500/20 flex items-center justify-center">
            <Icon name="save" size={24} className="text-green-400" />
          </div>
          <h3 className="text-sm font-semibold text-white mt-3">Export</h3>
          <p className="text-xs text-gray-500">Export at full resolution.</p>
          <Button variant="secondary" size="sm" className="mt-3 w-full">Export</Button>
        </Card>
      </div>
    </div>
  );
}
