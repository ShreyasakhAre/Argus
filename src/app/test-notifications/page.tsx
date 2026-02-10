'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestNotificationsPage() {
  const [message, setMessage] = useState('Test alert');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('critical');
  const [title, setTitle] = useState('Test Alert');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  const sendNotification = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, severity, title }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse('Error: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Test Notifications System</h1>

        <div className="bg-slate-900 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="bg-slate-800 text-white border-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message"
              className="bg-slate-800 text-white border-slate-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
            >
              <option>critical</option>
              <option>high</option>
              <option>medium</option>
              <option>low</option>
            </select>
          </div>

          <Button
            onClick={sendNotification}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-gray-200"
          >
            {loading ? 'Sending...' : '📤 Send Test Notification'}
          </Button>

          {response && (
            <pre className="bg-slate-800 p-4 rounded text-xs overflow-auto max-h-40">
              {response}
            </pre>
          )}
        </div>

        <div className="mt-8 p-6 bg-slate-900 rounded-lg">
          <h2 className="text-xl font-bold mb-4">📋 How It Works:</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>✅ Socket.IO server listens on port 4002</li>
            <li>✅ NotificationProvider handles all Socket.IO logic</li>
            <li>✅ Dispatch browser events (CustomEvent)</li>
            <li>✅ Components listen to browser events only</li>
            <li>✅ No duplicate listeners</li>
            <li>✅ Critical notifications play sound</li>
            <li>✅ Toast notifications with severity colors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
