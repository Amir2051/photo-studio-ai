// C/C++ Coding Lab Page
// Sandboxed compilation and execution of C/C++ code

import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Textarea, Badge, EmptyState, Icon, Spinner, Dialog } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import { cx } from '../components/ui';

// Sample code templates
const CODE_TEMPLATES = [
  {
    id: 'hello-world',
    name: 'Hello World',
    language: 'cpp',
    code: `#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci Sequence',
    language: 'cpp',
    code: `#include <iostream>
#include <vector>
std::vector<int> fibonacci(int n) {
    std::vector<int> seq;
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        seq.push_back(a);
        int next = a + b;
        a = b;
        b = next;
    }
    return seq;
}
int main() {
    auto seq = fibonacci(10);
    for (int num : seq) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    return 0;
}`
  },
  {
    id: 'sort',
    name: 'Sort Array',
    language: 'cpp',
    code: `#include <algorithm>
#include <vector>
#include <iostream>
int main() {
    std::vector<int> numbers = {5, 2, 8, 1, 9, 3};
    std::sort(numbers.begin(), numbers.end());
    for (int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;
    return 0;
}`
  },
  {
    id: 'hash',
    name: 'Hash Function',
    language: 'cpp',
    code: `#include <iostream>
#include <cstdint>
#include <string>
uint32_t simpleHash(const std::string& str) {
    uint32_t hash = 0;
    for (char c : str) {
        hash = (hash * 31) + static_cast<uint8_t>(c);
    }
    return hash;
}
int main() {
    std::string test = "SecureForge";
    std::cout << "Hash: " << simpleHash(test) << std::endl;
    return 0;
}`
  },
];

const EXERCISES = [
  {
    id: 'e1',
    title: 'Reverse a String',
    difficulty: 'easy',
    description: 'Write a function to reverse a string in place.',
    starter: `#include <iostream>
#include <string>
void reverseString(std::string& str) {
    // Your code here
}
int main() {
    std::string s = "SecureForge";
    reverseString(s);
    std::cout << s << std::endl;
    return 0;
}`
  },
  {
    id: 'e2',
    title: 'Find the Largest Element',
    difficulty: 'easy',
    description: 'Find the largest element in an array.',
    starter: `#include <iostream>
#include <vector>
#include <algorithm>
int main() {
    std::vector<int> numbers = {3, 7, 2, 9, 1, 5};
    auto largest = std::max_element(numbers.begin(), numbers.end());
    std::cout << "Largest: " << *largest << std::endl;
    return 0;
}`
  },
  {
    id: 'e3',
    title: 'Binary Search',
    difficulty: 'medium',
    description: 'Implement binary search on a sorted array.',
    starter: `#include <iostream>
#include <vector>
int binarySearch(const std::vector<int>& arr, int target) {
    // Your code here
    return -1;
}
int main() {
    std::vector<int> arr = {1, 3, 5, 7, 9, 11, 13, 15};
    int target = 7;
    int result = binarySearch(arr, target);
    std::cout << "Found at: " << result << std::endl;
    return 0;
}`
  },
  {
    id: 'e4',
    title: 'Prime Number Checker',
    difficulty: 'medium',
    description: 'Write a function to check if a number is prime.',
    starter: `#include <iostream>
#include <cmath>
bool isPrime(int n) {
    // Your code here
    return false;
}
int main() {
    int n = 17;
    std::cout << n << " is " << (isPrime(n) ? "prime" : "composite") << std::endl;
    return 0;
}`
  },
];

export default function CodingLab(): React.JSX.Element {
  const [code, setCode] = useState(CODE_TEMPLATES[0].code);
  const [language, setLanguage] = useState('cpp');
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [isCompiled, setIsCompiled] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(true);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    // Simulate compilation and execution
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setOutput('```\nProgram compiled successfully!\nRunning...\nHello from SecureForge Lab!\n```');
    setIsRunning(false);
    setIsCompiled(true);
  };

  const formatOutput = (output: string) => {
    // Simple syntax highlighting for output
    return output;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">C/C++ Coding Lab</h1>
          <p className="text-sm text-gray-400 mt-1">Sandboxed compilation and execution. Write, compile, and run C/C++ code.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary"><Icon name="code" size={18} /> Run</Button>
          <Button><Icon name="download" size={18} /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <Card className={cx('p-4 lg:p-6', showEditor ? 'block' : 'hidden lg:block')}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {CODE_TEMPLATES.map((tpl) => (
                <Button key={tpl.id} variant="ghost" size="sm" className="text-xs">
                  {tpl.name}
                </Button>
              ))}
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="rust">Rust</option>
            </select>
          </div>
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Write your C/C++ code here..."
            className="h-[400px] font-mono text-sm"
            rows={20}
          />
        </Card>

        {/* Output */}
        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Output</h3>
            {isRunning && <Spinner label="Running..." />}
            {!isRunning && isCompiled && <Badge color="green">Compiled & Ran</Badge>}
            {!isRunning && !isCompiled && <Badge color="gray">Ready</Badge>}
          </div>
          <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-400 h-[300px] overflow-auto">
            {output || <span className="text-gray-500">// Output appears here...</span>}
          </div>
        </Card>

        {/* Exercises */}
        <Card className="p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Exercises</h3>
          <div className="space-y-3">
            {EXERCISES.map((ex) => (
              <Button
                key={ex.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start py-3 text-left"
                onClick={() => {
                  setSelectedExercise(ex.id);
                  setCode(ex.starter || '');
                  setShowEditor(true);
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-300">{ex.title}</span>
                  <span className="text-xs text-gray-500">Difficulty: {ex.difficulty}</span>
                </div>
              </Button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button variant="secondary" onClick={() => setShowEditor(false)}>
              <Icon name="upload" size={18} /> Export Project
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
