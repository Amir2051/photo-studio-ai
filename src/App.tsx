// Main App Component
// Handles layout and global state

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAuthStore, useAppStore, usePhotoEditorStore } from './stores/appStore';
import { initStorage } from './lib/storage';
import { ToastContainer } from './components/ui';

// Page imports
import Dashboard from './pages/Dashboard';
import AiTutor from './pages/AiTutor';
import Roadmap from './pages/Roadmap';
import CodingLab from './pages/CodingLab';
import CryptoLab from './pages/CryptoLab';
import Embedded from './pages/Embedded';
import HardwareBench from './pages/HardwareBench';
import Security from './pages/Security';
import Projects from './pages/Projects';
import Progress from './pages/Progress';
import Agents from './pages/Agents';
import Settings from './pages/Settings';
import Home from './pages/Home';

// Main Layout
const Layout: React.FC = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const _location = useLocation();

  useEffect(() => {
    // Update active section based on route
    if (_location.pathname === '/') setActiveSection('dashboard');
    else if (_location.pathname.startsWith('/ai-tutor')) setActiveSection('ai-tutor');
    else if (_location.pathname.startsWith('/roadmap')) setActiveSection('roadmap');
    else if (_location.pathname.startsWith('/coding-lab')) setActiveSection('coding-lab');
    else if (_location.pathname.startsWith('/crypto-lab')) setActiveSection('crypto-lab');
    else if (_location.pathname.startsWith('/embedded')) setActiveSection('embedded');
    else if (_location.pathname.startsWith('/hardware-bench')) setActiveSection('hardware-bench');
    else if (_location.pathname.startsWith('/security')) setActiveSection('security');
    else if (_location.pathname.startsWith('/projects')) setActiveSection('projects');
    else if (_location.pathname.startsWith('/progress')) setActiveSection('progress');
    else if (_location.pathname.startsWith('/agents')) setActiveSection('agents');
    else if (_location.pathname.startsWith('/settings')) setActiveSection('settings');
  }, [_location.pathname]);

  useEffect(() => {
    // Initialize storage on app load
    initStorage();
  }, []);

  return (
    <div className="flex h-screen">
      <main className="flex-1 overflow-auto bg-gray-900">
        <div className="p-4 md:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ai-tutor" element={<AiTutor />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/coding-lab" element={<CodingLab />} />
            <Route path="/crypto-lab" element={<CryptoLab />} />
            <Route path="/embedded" element={<Embedded />} />
            <Route path="/hardware-bench" element={<HardwareBench />} />
            <Route path="/security" element={<Security />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => {
  useAuthStore();
  useAppStore();
  usePhotoEditorStore();

  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
};

export default App;
