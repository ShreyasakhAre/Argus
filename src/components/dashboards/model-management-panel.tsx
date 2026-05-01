'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  RefreshCw, 
  History, 
  Settings, 
  Shield, 
  BarChart3, 
  Activity,
  Cpu,
  Save,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  total_samples: number;
  version: string;
  last_trained: string;
}

export function ModelManagementPanel() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse stats JSON:', parseError, 'Text was:', text.substring(0, 100));
        throw new Error('Invalid JSON from /api/stats');
      }
      
      if (data.model_metrics) {
        setMetrics(data.model_metrics);
      }
    } catch (error) {
      console.error('[Model Management] Error fetching metrics:', error);
      toast.error('Failed to fetch model metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    toast.promise(
      fetch('/api/retrain', { method: 'POST' })
        .then(async (res) => {
          if (!res.ok) throw new Error('Retraining failed');
          const data = await res.json();
          setMetrics(data.metrics);
          return data;
        }),
      {
        loading: 'Retraining ensemble model on 10,000 samples...',
        success: 'Model retrained successfully!',
        error: 'Retraining failed. Check ML service logs.',
      }
    );
    setRetraining(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Model Management</h2>
          <p className="text-zinc-400">Monitor and update the ARGUS fraud detection engine</p>
        </div>
        <Button 
            onClick={handleRetrain} 
            disabled={retraining}
            className="bg-purple-600 hover:bg-purple-500 text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${retraining ? 'animate-spin' : ''}`} />
          Retrain Model
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Current Version</p>
                <p className="text-2xl font-bold text-white">v{metrics?.version || '1.1.0'}</p>
              </div>
              <Cpu className="w-8 h-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Model Type</p>
                <p className="text-2xl font-bold text-white">Ensemble</p>
              </div>
              <Brain className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Samples Used</p>
                <p className="text-2xl font-bold text-white">{metrics?.total_samples.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Last Updated</p>
                <p className="text-2xl font-bold text-white">
                    {metrics?.last_trained ? new Date(metrics.last_trained).toLocaleDateString() : 'Today'}
                </p>
              </div>
              <History className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-500" />
                In-Depth Metrics
            </CardTitle>
            <CardDescription className="text-zinc-400">Precision-Recall and Accuracy analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
                {[
                    { label: 'Accuracy', value: metrics?.accuracy, color: 'bg-green-500' },
                    { label: 'Precision', value: metrics?.precision, color: 'bg-blue-500' },
                    { label: 'Recall', value: metrics?.recall, color: 'bg-purple-500' },
                    { label: 'F1 Score', value: metrics?.f1_score, color: 'bg-pink-500' }
                ].map((stat) => (
                    <div key={stat.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">{stat.label}</span>
                            <span className="text-white font-mono font-bold">{((stat.value ?? 0) * 100).toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div 
                                className={`${stat.color} h-full rounded-full transition-all duration-1000`} 
                                style={{ width: `${(stat.value ?? 0) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-400" />
                Pipeline Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Logistic Regression Weights</span>
                    <Badge variant="outline" className="text-zinc-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">XGBoost Boosting Rounds</span>
                    <span className="text-sm font-mono text-cyan-500">100</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">TF-IDF Max Features</span>
                    <span className="text-sm font-mono text-cyan-500">5000</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Ensemble Voting Type</span>
                    <span className="text-sm font-mono text-cyan-500">Soft (Probs)</span>
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-400">
                    <Save className="w-4 h-4 mr-2" />
                    Save Config
                </Button>
                <Button variant="outline" className="flex-1 border-zinc-700 text-red-500/50 hover:text-red-500 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset Model
                </Button>
            </div>

            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <p className="text-xs text-yellow-500/80">
                    Retraining will use the latest 10,000 notifications and any manual labels provided by analysts. 
                    This process takes approximately 15-30 seconds.
                </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
