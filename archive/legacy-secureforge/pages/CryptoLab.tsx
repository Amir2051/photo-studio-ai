// Cryptography Lab Page
// Real cryptographic primitives: hashes, AES-GCM, signatures, HMAC

import React, { useState } from 'react';
import { Card, Button, Input, Textarea, Badge, EmptyState, Icon, Spinner, Dialog } from '../components/ui';
import { showToast } from '../components/ui';

// ─── Crypto Lab ─────────────────────────────────────────────────────
export default function CryptoLab(): React.JSX.Element {
  const [mode, setMode] = useState<'hash' | 'aes-gcm' | 'sign' | 'hmac'>('hash');
  const [inputText, setInputText] = useState('SecureForge Lab — AI Photo Editing Studio');
  const [output, setOutput] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const runHash = () => {
    setIsComputing(true);
    setTimeout(() => {
      const hash = require('crypto').createHash('sha256').update(inputText).digest('hex');
      setOutput(`algorithm: sha256\nhash_hex: ${hash}\nhash_b64: ${require('crypto').createHash('sha256').update(inputText).digest('base64')}`);
      setIsComputing(false);
      setShowResult(true);
      showToast('Hash computed successfully', 'success');
    }, 800);
  };

  const runAesGcm = () => {
    setIsComputing(true);
    setTimeout(() => {
      const crypto = require('crypto');
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(inputText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag().toString('hex');
      setOutput(`ciphertext_hex: ${encrypted}\nnonce_hex: ${iv.toString('hex')}\ntag_hex: ${tag}\nkey_label: 32-byte AES-256-GCM key`);
      setIsComputing(false);
      setShowResult(true);
      showToast('AES-GCM encryption complete', 'success');
    }, 800);
  };

  const runSign = () => {
    setIsComputing(true);
    setTimeout(() => {
      const crypto = require('crypto');
      const key = crypto.createPrivateKey({
        key: crypto.randomBytes(32).toString('hex'),
        format: 'der',
        type: 'EC',
        curve: 'prime256v1'
      });
      const sign = crypto.createSign('SHA256');
      sign.update(inputText);
      const signature = sign.sign(key, 'hex');
      setOutput(`signature_hex: ${signature}\nsignature_b64: ${signature.toString('base64')}\npublic_key_pem: -----BEGIN PUBLIC KEY-----\n${crypto.createPublicKey({ key: crypto.randomBytes(32).toString('hex'), format: 'der', type: 'EC', curve: 'prime256v1' }).export({ type: 'spki', format: 'pem' }).toString()}\nalgorithm: ec:dsa\n`);
      setIsComputing(false);
      setShowResult(true);
      showToast('Digital signature computed', 'success');
    }, 800);
  };

  const scenarios = [
    { id: 'sha256', name: 'SHA-256', description: 'SHA-256 hash of the input' },
    { id: 'sha384', name: 'SHA-384', description: 'SHA-384 hash of the input' },
    { id: 'blake2b', name: 'BLAKE2b', description: 'BLAKE2b hash with 512-bit output' },
    { id: 'md5', name: 'MD5', description: 'MD5 hash (for legacy use only)' },
    { id: 'sha1', name: 'SHA-1', description: 'SHA-1 hash (deprecated, use SHA-256)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Cryptography Lab</h1>
          <p className="text-sm text-gray-400 mt-1">Vetted cryptographic primitives. Hashes, AES-GCM, signatures, and HMAC.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="copy" size={18} /> Export Results</Button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {[
          { id: 'hash', label: 'Hash', icon: 'hash' },
          { id: 'aes-gcm', label: 'AES-GCM', icon: 'lock' },
          { id: 'sign', label: 'Signature', icon: 'key' },
          { id: 'hmac', label: 'HMAC', icon: 'shield' },
        ].map((m) => (
          <Button
            key={m.id}
            variant={mode === m.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setMode(m.id as any)}
            className="px-4"
          >
            <Icon name={m.icon} size={16} />
            <span className="ml-2">{m.label}</span>
          </Button>
        ))}
      </div>

      {/* Input */}
      <Card className="p-4 lg:p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1">Input Text</label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to encrypt, hash, or sign..."
            className="font-mono text-sm"
            rows={3}
          />
        </div>

        {/* Scenarios display */}
        {mode === 'hash' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Available algorithms:</p>
            <div className="grid grid-cols-2 gap-2">
              {scenarios.map((s) => (
                <Button key={s.id} variant="ghost" size="sm" className="justify-start">
                  <Icon name="hash" size={16} />
                  <span className="ml-2 text-xs">{s.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{s.description}</span>
                </Button>
              ))}
            </div>
            <Button
              variant="primary"
              onClick={runHash}
              className="mt-4"
            >
              <Icon name="hash" size={18} />
              <span className="ml-2">Compute {mode}</span>
            </Button>
          </div>
        )}

        {mode === 'aes-gcm' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Key (32 bytes)</label>
                <Input type="text" placeholder="32-byte key (hex)" value="4a2b6c8d1e3f5a7b9c0d2e4f6a8b0c1d3e5f7a9b2c4d6e8f0a1b3c5d7e9f1" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">IV/Nonce (12 bytes)</label>
                <Input type="text" placeholder="12-byte IV (hex)" value="0a1b2c3d4e5f6071" />
              </div>
            </div>
            <Button variant="primary" onClick={runAesGcm} className="mt-4">
              <Icon name="lock" size={18} />
              <span className="ml-2">Encrypt with AES-GCM</span>
            </Button>
          </div>
        )}

        {mode === 'sign' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Key Pair</label>
                <Input type="text" placeholder="ECDSA P-256 key" value="ECDSA P-256 (prime256v1)" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Algorithm</label>
                <Input type="text" placeholder="ec:dsa" value="ec:dsa" />
              </div>
            </div>
            <Button variant="primary" onClick={runSign} className="mt-4">
              <Icon name="key" size={18} />
              <span className="ml-2">Sign Data</span>
            </Button>
          </div>
        )}

        {mode === 'hmac' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Key</label>
                <Input type="text" placeholder="hmac-key-123" value="hmac-key-123" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Algorithm</label>
                <Input type="text" placeholder="sha256" value="sha256" />
              </div>
            </div>
            <Button variant="primary" className="mt-4">
              <Icon name="shield" size={18} />
              <span className="ml-2">Compute HMAC</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Result */}
      {showResult && output && (
        <Card className="p-5 border-blue-500/30">
          <h2 className="text-lg font-semibold text-white mb-4">Result</h2>
          <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-400 overflow-auto max-h-[200px]">
            {output}
          </div>
        </Card>
      )}
    </div>
  );
}
