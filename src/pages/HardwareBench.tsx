// Virtual Hardware Bench Page
// Simulated ARM Cortex-M hardware with virtual peripherals

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Icon, Spinner, Dialog, EmptyState } from '../components/ui';

// ─── Hardware Bench ─────────────────────────────────────────────────
export default function HardwareBench(): React.JSX.Element {
  const [selectedDevice, setSelectedDevice] = useState('ARM Cortex-M4');
  const [activePanel, setActivePanel] = useState<'io' | 'memory' | 'debug' | 'network'>('io');

  const devices = [
    { id: 'cortex-m4', name: 'ARM Cortex-M4', cores: 1, ram: '128 KB', flash: '512 KB', vendors: 'STM32, NXP, TI', description: '32-bit ARM processor with DSP instructions' },
    { id: 'cortex-m7', name: 'ARM Cortex-M7', cores: 1, ram: '256 KB', flash: '1 MB', vendors: 'STM32, NXP', description: 'Higher performance with FPU' },
    { id: 'rp2040', name: 'Raspberry Pi RP2040', cores: 2, ram: '264 KB', flash: '2 MB', vendors: 'Raspberry Pi', description: 'Dual-core ARM Cortex-M0+' },
    { id: 'avr', name: 'AVR ATmega328P', cores: 1, ram: '2 KB', flash: '32 KB', vendors: 'Microchip', description: '8-bit microcontroller' },
  ];

  const [registers, setRegisters] = useState({
    R0: '0x00000000', R1: '0x00000000', R2: '0x00000000', R3: '0x00000000',
    R4: '0x00000000', R5: '0x00000000', R6: '0x00000000', R7: '0x00000000',
    R12: '0x00000000', LR: '0x00000000', PC: '0x00000000', xPSR: '0x00000000',
  });

  const [memoryContents, setMemoryContents] = useState([
    { addr: '0x20000000', size: '32 KB', value: '00 01 02 03 04 05 06 07' },
    { addr: '0x20000020', size: '32 KB', value: '08 09 0A 0B 0C 0D 0E 0F' },
    { addr: '0x20000040', size: '32 KB', value: '10 11 12 13 14 15 16 17' },
  ]);

  const [uartLog, setUartLog] = useState([
    { time: '00:00:01', msg: '[SYS] SecureForge Hardware Bench v1.0' },
    { time: '00:00:02', msg: '[CPU] ARM Cortex-M4 core initialized' },
    { time: '00:00:03', msg: '[GPIO] Port A initialized (16 pins)' },
    { time: '00:00:04', msg: '[UART] UART0 configured @ 115200 baud' },
    { time: '00:00:05', msg: '[SYS] Boot complete. Ready.' },
  ]);

  const [inputText, setInputText] = useState('');

  const handleGpioWrite = (pin: string, value: number) => {
    setUartLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: `[GPIO] Pin ${pin} set to ${value}` }]);
  };

  const handleUartWrite = () => {
    setUartLog((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: inputText }]);
    setInputText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Virtual Hardware Bench</h1>
          <p className="text-sm text-gray-400 mt-1">Simulated embedded hardware for firmware engineering.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="upload" size={18} /> Load Firmware</Button>
          <Button><Icon name="download" size={18} /> Export</Button>
        </div>
      </div>

      {/* Device selector */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Hardware Platform</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {devices.map((dev) => (
            <Button
              key={dev.id}
              variant={selectedDevice === dev.name ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedDevice(dev.name)}
              className="justify-start text-xs"
            >
              <div className="font-medium text-white">{dev.name}</div>
              <div className="text-xs text-gray-500">{dev.cores} cores · {dev.ram} RAM</div>
              <div className="text-xs text-gray-500">{dev.flash} Flash</div>
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* I/O Panel */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">I/O Ports</h3>
          <div className="space-y-3">
            {['PA0', 'PA1', 'PA2', 'PA3', 'PA4', 'PA5'].map((pin) => (
              <div key={pin} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon name="gpio" size={16} className="text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{pin}</p>
                  <p className="text-xs text-gray-500">Port A</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGpioWrite(pin, 1)}
                  className="text-xs"
                >
                  High
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGpioWrite(pin, 0)}
                  className="text-xs"
                >
                  Low
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button variant="secondary" className="w-full text-sm">
              <Icon name="flash" size={16} />
              <span className="ml-2">Flash All to High</span>
            </Button>
          </div>
        </Card>

        {/* Memory View */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Memory View</h3>
          <div className="space-y-3">
            {memoryContents.map((mem) => (
              <div key={mem.addr}>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{mem.addr}</span>
                  <span>{mem.size}</span>
                </div>
                <div className="h-8 bg-black/30 rounded flex items-center px-2 font-mono text-xs text-green-400">
                  {mem.value}
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-3 text-xs">
            <Icon name="upload2" size={14} />
            <span className="ml-1">Dump Memory</span>
          </Button>
        </Card>

        {/* Debug Registers */}
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-white mb-4">CPU Registers</h3>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {Object.entries(registers).map(([name, value]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-10 font-mono">{name}</span>
                <span className="text-xs font-mono text-white">{value}</span>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-3">
            <Icon name="refresh" size={14} />
            <span className="ml-1">Reset CPU</span>
          </Button>
        </Card>

        {/* UART Console */}
        <Card className="p-5 lg:col-span-4">
          <h3 className="text-lg font-semibold text-white mb-4">UART Console</h3>
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
