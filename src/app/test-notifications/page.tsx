'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestNotificationsPage() {
  const [content, setContent] = useState(
    'URGENT wire transfer needed immediately'
  );

  const [sender, setSender] = useState('ceo@verify-now.xyz');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<any>(null);

  const runThreatScan = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ML_API}/predict`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_id: 'NEW001',
            org_id: 'ORG001',
            department: 'Finance',
            sender,
            receiver: 'finance@company.com',
            content,
            timestamp: '2026-01-01 10:00:00',
            channel: 'Email',
            sender_domain: sender.split('@')[1],
            priority: 'critical',
            country: 'India',
            device_type: 'Laptop',
            attachment_type: 'none',
            contains_url: 0,
            risk_score: 0,
          }),
        }
      );

      if (!res.ok) throw new Error('ML service failed');

      const data = await res.json();
      setResponse(data);

      await fetch('/api/test-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `ARGUS Alert - ${data.status}`,
          message: content,
          severity:
            data.risk_level === 'High'
              ? 'critical'
              : data.risk_level === 'Medium'
              ? 'high'
              : 'low',
        }),
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }

    setLoading(false);
  };

  const danger =
    response?.status === 'Threat' || response?.is_flagged;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">
          🛡️ ARGUS Live Threat Simulator
        </h1>

        <div className="bg-slate-900 p-6 rounded-xl space-y-4">

          <div>
            <label className="block mb-2">Sender</label>
            <Input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div>
            <label className="block mb-2">Message</label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <Button
            onClick={runThreatScan}
            disabled={loading}
            className="w-full bg-white text-black"
          >
            {loading ? 'Scanning...' : '🚀 Scan With ARGUS AI'}
          </Button>

          {error && (
            <div className="bg-red-900 p-3 rounded">
              {error}
            </div>
          )}

          {response && (
            <div
              className={`p-4 rounded mt-4 space-y-2 ${
                danger ? 'bg-red-900' : 'bg-green-900'
              }`}
            >
              <p>📌 Status: {response.status}</p>
              <p>⚠️ Risk Score: {response.risk_score}</p>
              <p>🔥 Risk Level: {response.risk_level}</p>
              <p>🚨 Flagged: {response.is_flagged ? 'Yes' : 'No'}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}