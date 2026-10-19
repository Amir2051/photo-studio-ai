// Embedded Systems Lab Page
// Virtual ARM Cortex-M MCU simulator with RAM, flash, GPIO, UART

import React, { useState } from 'react';
import { Card, Button, Input, Textarea, Badge, EmptyState, Icon, Spinner, Dialog } from '../components/ui';

// Simple class name utility
function cx(...classes: string[]) { return classes.filter(Boolean).join(' '); }

// ─── Embedded Systems Lab ───────────────────────────────────────────
export default function Embedded(): React.JSX.Element {
  const [selectedDevice, setSelectedDevice] = useState('default');
  const [activeView, setActiveView] = useState<'overview' | 'io' | 'memory' | 'firmware' | 'debug'>('overview');

  // Virtual memory state
  const [ram, setRam] = useState([
    { address: '0x20000000', name: 'SRAM', size: '32 KB', contents: '00 01 02 03 04 05 06 07' },
  ]);
  const [flash, setFlash] = useState([
    { address: '0x00000000', name: 'Bootloader', size: '8 KB', contents: '48 65 6c 6c 6f 20 57 6f 72 6c 64' },
    { address: '0x00002000', name: 'Application', size: '32 KB', contents: '48 65 6c 6c 6f 20 57 6f 72 6c 64 21' },
  ]);

  // GPIO state
  const [gpios, setGpios] = useState([
    { pin: 'PA0', name: 'GPIO0', value: 0, direction: 'in' },
    { pin: 'PA1', name: 'GPIO1', value: 1, direction: 'out' },
    { pin: 'PA2', name: 'GPIO2', value: 1, direction: 'out' },
  ]);

  // UART output
  const [uartLog, setUartLog] = useState([
    { time: '00:00:01', msg: 'SecureForge Embedded Lab started' },
    { time: '00:00:02', msg: 'Initializing GPIO...' },
    { time: '00:00:03', msg: 'Boot complete. Ready for input.' },
  ]);

  const [inputText, setInputText] = useState('');

  const handleGpioWrite = (pin: string, value: number) => {
    setGpios((prev) => prev.map((g) => (g.pin === pin ? { ...g, value } : g)));
  };

  const handleUartWrite = () => {
    setUartLog((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString(), msg: inputText },
    ]);
    setInputText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Embedded Systems Lab</h1>
          <p className="text-sm text-gray-400 mt-1">Virtual ARM Cortex-M MCU simulator for firmware engineering.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="upload" size={18} /> Load Firmware</Button>
          <Button><Icon name="download" size={18} /> Export Program</Button>
        </div>
      </div>

      {/* Virtual Hardware Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">ROM/Flash Memory</h2>
          <div className="space-y-3">
            {flash.map((f) => (
              <div key={f.address} className="p-3 rounded-lg bg-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-200">{f.name}</span>
                  <Badge color="gray">{f.size}</Badge>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">{f.address}</p>
                <p className="text-xs text-gray-500 font-mono">{f.contents}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">RAM Memory</h2>
          <div className="space-y-3">
            {ram.map((r) => (
              <div key={r.address} className="p-3 rounded-lg bg-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-200">{r.name}</span>
                  <Badge color="green">{r.size}</Badge>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">{r.address}</p>
                <p className="text-xs text-gray-500 font-mono">{r.contents}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GPIO */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-white mb-4">GPIO Pins</h2>
          <div className="space-y-3">
            {gpios.map((gpio) => (
              <div key={gpio.pin} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className={cx(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  gpio.value === 1 ? 'bg-green-500/20' : 'bg-red-500/20'
                )}>
                  <Icon name={gpio.value === 1 ? 'check' : 'x'} size={14} className={gpio.value === 1 ? 'text-green-400' : 'text-red-400'} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{gpio.name} ({gpio.pin})</p>
                  <p className="text-xs text-gray-500">{gpio.direction === 'out' ? 'Output' : 'Input'}</p>
                </div>
                <Button
                  variant={gpio.value === 1 ? 'ghost' : 'primary'}
                  size="sm"
                  onClick={() => handleGpioWrite(gpio.pin, gpio.value === 1 ? 0 : 1)}
                >
                  {gpio.value === 1 ? 'Low' : 'High'}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* UART Console */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">UART Console</h2>
          <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-green-400 h-[150px] overflow-auto mb-3">
            {uartLog.map((log) => (
              <div key={log.time} className="mb-1">
                <span className="text-gray-500">{log.time}:</span> {log.msg}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type to output to UART..."
              className="flex-1"
            />
            <Button onClick={handleUartWrite}>
              <Icon name="send" size={16} />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
