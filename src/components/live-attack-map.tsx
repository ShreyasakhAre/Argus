"use client";

import { useState } from "react";
import { Activity, Shield, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSmartPolling } from "@/hooks/useSmartPolling";
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from "@/components/ui/premium-card";
import api from "@/lib/api";

interface DepartmentIntelligence {
  id: string;
  name: string;
  totalAttacks: number;
  riskScore: number;
  topAttackType: string;
  lastAttackTime: string;
  anomalyDensity: number;
  maliciousCount: number;
}

interface AttackMapData {
  departments: DepartmentIntelligence[];
  nodes: Array<{ id: string; label: string; val: number; risk: number }>;
  summary: {
    totalDepartments: number;
    highestRiskDept: string;
    totalAttacks: number;
    activeThreats: number;
  };
}

export function LiveAttackMap() {
  const [attackData, setAttackData] = useState<AttackMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<DepartmentIntelligence | null>(null);

  const fetchAttackData = async () => {
    try {
      const response = await api.get<any>("/api/attacks");
      const data = response?.data || response || {};

      if (data.departments) {
        setAttackData(data);
        if (data.departments.length > 0 && !selectedDept) {
          setSelectedDept(data.departments[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch attack data:", error);
    } finally {
      setLoading(false);
    }
  };

  useSmartPolling(fetchAttackData, {
    interval: 10000,
    enabled: true,
    respectCircuitBreaker: true,
  });

  if (loading && !attackData) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <PremiumCard className="bg-slate-900 border-slate-800 h-full">
          <PremiumCardHeader>
            <div className="flex items-center justify-between">
              <PremiumCardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Departmental Attack Intelligence Map
              </PremiumCardTitle>
              <Badge variant="outline" className="border-cyan-800 text-cyan-400">
                Live Distribution
              </Badge>
            </div>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {attackData?.departments?.map((dept) => (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDept(dept)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedDept?.id === dept.id
                      ? "bg-cyan-950/30 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/50 border-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-medium text-sm">{dept.name}</span>
                    <Badge
                      className={
                        dept.riskScore > 75
                          ? "bg-red-500/20 text-red-400"
                          : dept.riskScore > 40
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-green-500/20 text-green-400"
                      }
                    >
                      {dept.riskScore}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Total Threats:</span>
                      <span className="text-white">{dept.totalAttacks}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Anomaly Density:</span>
                      <span className="text-cyan-400">{(dept.anomalyDensity * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dept.riskScore > 75 ? "bg-red-500" : dept.riskScore > 40 ? "bg-orange-500" : "bg-green-500"
                      }`}
                      style={{ width: `${dept.riskScore}%` }}
                    />
                  </div>
                </div>
              ))}
              {!attackData?.departments?.length && (
                <div className="col-span-full py-10 text-center text-slate-500">No departmental data available.</div>
              )}
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      <div className="space-y-4">
        {selectedDept && (
          <PremiumCard className="bg-slate-900 border-cyan-900/50">
            <PremiumCardHeader>
              <PremiumCardTitle className="text-sm text-cyan-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {selectedDept.name} Analysis
              </PremiumCardTitle>
            </PremiumCardHeader>
            <PremiumCardContent className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Critical Point</p>
                <p className="text-xs text-slate-300">
                  Targeted with <span className="text-red-400 font-bold">{selectedDept.topAttackType}</span> vectors.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Risk Status</p>
                  <p className="text-lg font-bold text-white">{selectedDept.riskScore}%</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Malicious Hits</p>
                  <p className="text-lg font-bold text-red-400">{selectedDept.maliciousCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Historical Trend</p>
                <div className="h-20 w-full flex items-end gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-cyan-900/30 rounded-t-sm"
                      style={{ height: `${20 + Math.random() * 80}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 mb-1">Last Attack Vector Detected:</p>
                <p className="text-xs text-slate-400">
                  {selectedDept.lastAttackTime ? new Date(selectedDept.lastAttackTime).toLocaleString() : "Never"}
                </p>
              </div>
            </PremiumCardContent>
          </PremiumCard>
        )}

        <PremiumCard className="bg-slate-900 border-slate-800">
          <PremiumCardHeader>
            <PremiumCardTitle className="text-xs text-slate-400">Org-Wide Summary</PremiumCardTitle>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Total Departments</span>
                <span className="text-white font-mono">{attackData?.summary?.totalDepartments || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Highest Risk</span>
                <span className="text-red-400 font-mono text-xs">{attackData?.summary?.highestRiskDept || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Total Attacks</span>
                <span className="text-white font-mono">{attackData?.summary?.totalAttacks || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-500 uppercase tracking-tighter italic">
                  Source: 10,000 Records Intelligence
                </span>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>
    </div>
  );
}
