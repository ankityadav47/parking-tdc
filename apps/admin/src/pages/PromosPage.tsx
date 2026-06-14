import React, { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';

type PromoType = 'percent' | 'flat';
interface Promo { id: string; code: string; type: PromoType; value: number; used: number; max: number; active: boolean; expires: string; }

const MOCK_PROMOS: Promo[] = [
  { id: 'p1', code: 'PARK20', type: 'percent', value: 20, used: 145, max: 500, active: true, expires: 'Jul 31, 2026' },
  { id: 'p2', code: 'FLAT100', type: 'flat', value: 100, used: 88, max: 200, active: true, expires: 'Jun 30, 2026' },
  { id: 'p3', code: 'NEWUSER', type: 'percent', value: 15, used: 312, max: 1000, active: false, expires: 'Dec 31, 2026' },
  { id: 'p4', code: 'MONSOON50', type: 'flat', value: 50, used: 56, max: 300, active: true, expires: 'Sep 15, 2026' },
];

export default function PromosPage() {
  const [promos, setPromos] = useState(MOCK_PROMOS);
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<PromoType>('percent');
  const [newValue, setNewValue] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  const toggleActive = (id: string) => setPromos((p) => p.map((pr) => pr.id === id ? { ...pr, active: !pr.active } : pr));
  const deletePromo = (id: string) => setPromos((p) => p.filter((pr) => pr.id !== id));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newValue || !newMax || !newExpiry) return;
    setPromos((p) => [...p, {
      id: `p${Date.now()}`,
      code: newCode.toUpperCase(),
      type: newType,
      value: Number(newValue),
      used: 0,
      max: Number(newMax),
      active: true,
      expires: newExpiry,
    }]);
    setNewCode(''); setNewValue(''); setNewMax(''); setNewExpiry('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Promo Code Management</h1>
          <p className="text-slate-500 mt-1">Create, toggle, and monitor promotional discount codes.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> New Promo
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Create New Promo Code</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Code</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. SAVE20"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 uppercase" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as PromoType)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Value ({newType === 'percent' ? '%' : '₹'})</label>
              <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="20"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Max Redemptions</label>
              <input type="number" value={newMax} onChange={(e) => setNewMax(e.target.value)} placeholder="500"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Expiry Date</label>
              <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                Create Code
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promos.map((promo) => {
          const usagePct = Math.round((promo.used / promo.max) * 100);
          return (
            <div key={promo.id} className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${promo.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <Tag className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 font-mono text-xl tracking-widest">{promo.code}</p>
                    <p className="text-xs text-slate-500">
                      {promo.type === 'percent' ? `${promo.value}% off` : `₹${promo.value} off`} · Expires {promo.expires}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(promo.id)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    {promo.active ? <ToggleRight className="w-7 h-7 text-green-500" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                  <button onClick={() => deletePromo(promo.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{promo.used} / {promo.max} used</span>
                  <span className="font-bold text-slate-700">{usagePct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${usagePct > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
