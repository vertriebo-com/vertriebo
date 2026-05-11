import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Filter, ChevronDown, Building2, Shield, AlertTriangle,
  Clock, DollarSign, BarChart3, Plus, MoreVertical, Eye, Lock, Unlock,
  FileText, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import moment from 'moment';

const TYPE_LABELS = {
  direct_customer: { label: 'Direktkunde', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  agency: { label: 'Agentur', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  agency_client: { label: 'Agentur-Kunde', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

const STATUS_LABELS = {
  active: { label: 'Aktiv', color: 'bg-emerald-50 text-emerald-700' },
  suspended: { label: 'Gesperrt', color: 'bg-red-50 text-red-700' },
  pending: { label: 'Ausstehend', color: 'bg-amber-50 text-amber-700' },
};

const BILLING_LABELS = {
  active: { label: 'Zahlend', color: 'bg-emerald-50 text-emerald-700' },
  trialing: { label: 'Trial', color: 'bg-blue-50 text-blue-700' },
  past_due: { label: 'Rückstand', color: 'bg-amber-50 text-amber-700' },
  unpaid: { label: 'Unbezahlt', color: 'bg-red-50 text-red-700' },
  canceled: { label: 'Gekündigt', color: 'bg-slate-50 text-slate-700' },
  incomplete: { label: 'Unvollständig', color: 'bg-slate-50 text-slate-700' },
  incomplete_expired: { label: 'Abgelaufen', color: 'bg-red-50 text-red-700' },
};

export default function PlatformAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const { data: responseData = {}, isLoading, refetch } = useQuery({
    queryKey: ['platform-organizations'],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getPlatformAdminData', {});
        if (res.data?.success) {
          return res.data;
        }
        if (res.status === 403) {
          throw new Error('Kein Zugriff auf das interne Plattform-Dashboard.');
        }
        throw new Error(res.data?.error || 'Fehler beim Laden der Organisationen');
      } catch (e) {
        console.error('[PlatformAdmin] getPlatformAdminData error:', e.message);
        throw e;
      }
    },
  });

  const organizations = responseData.organizations || [];
  const platformSummary = responseData.summary || {};

  // All data now comes from getPlatformAdminData backend function
  const plans = responseData.plans || [];

  // Filter organizations
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.owner_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || org.organization_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSuspend = async () => {
    if (!selectedOrg || !suspendReason.trim()) {
      toast.error('Grund erforderlich');
      return;
    }
    setSuspending(true);
    try {
      const user = await base44.auth.me();
      await base44.asServiceRole.entities.Organization.update(selectedOrg.id, {
        platform_status: 'suspended',
        suspended_reason: suspendReason,
        suspended_at: new Date().toISOString(),
        suspended_by: user.email,
      });
      await base44.asServiceRole.entities.PlatformAuditLog.create({
        actor_email: user.email,
        actor_role: user.role,
        action: 'suspend_organization',
        target_type: 'organization',
        target_id: selectedOrg.id,
        organization_id: selectedOrg.id,
        parent_agency_id: selectedOrg.parent_agency_id || null,
        reason: suspendReason,
      });
      toast.success('Organisation gesperrt');
      refetch();
      setShowSuspendDialog(false);
      setSelectedOrg(null);
      setSuspendReason('');
    } catch (e) {
      toast.error('Fehler: ' + e.message);
    } finally {
      setSuspending(false);
    }
  };

  const handleUnsuspend = async (org) => {
    try {
      const user = await base44.auth.me();
      await base44.asServiceRole.entities.Organization.update(org.id, {
        platform_status: 'active',
        suspended_reason: null,
        suspended_at: null,
        suspended_by: null,
      });
      await base44.asServiceRole.entities.PlatformAuditLog.create({
        actor_email: user.email,
        actor_role: user.role,
        action: 'unsuspend_organization',
        target_type: 'organization',
        target_id: org.id,
        organization_id: org.id,
        parent_agency_id: org.parent_agency_id || null,
      });
      toast.success('Organisation entsperrt');
      refetch();
    } catch (e) {
      toast.error('Fehler: ' + e.message);
    }
  };

  const getPlanName = (planId) => {
    return plans.find(p => p.id === planId)?.name || 'N/A';
  };

  const getAgencyStats = (agencyId) => {
    const clientOrgs = organizations.filter(org => org.parent_agency_id === agencyId);
    return {
      clientCount: clientOrgs.length,
      clients: clientOrgs,
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-slate-900" />
            <h1 className="text-3xl font-bold text-slate-900">Platform Admin Center</h1>
          </div>
          <p className="text-sm text-slate-600">Verwaltung aller Organisationen und Agenturen</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Firma oder E-Mail suchen…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-slate-700"
            >
              <option value="all">Alle Typen</option>
              <option value="direct_customer">Direktkunden</option>
              <option value="agency">Agenturen</option>
              <option value="agency_client">Agentur-Kunden</option>
            </select>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Firma</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Typ</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Owner</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Billing</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Leads</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map(org => {
                  const typeInfo = TYPE_LABELS[org.organization_type] || TYPE_LABELS.direct_customer;
                  return (
                    <tr key={org.id} className="border-b border-[#E2E8F0] hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{org.name}</p>
                            {org.parent_agency_id && (
                              <p className="text-xs text-slate-500">→ Agentur-Kunde</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{org.owner_email}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{getPlanName(org.plan_id)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded ${BILLING_LABELS[org.billing_status]?.color || 'bg-slate-100 text-slate-600'}`}>
                          {BILLING_LABELS[org.billing_status]?.label || org.billing_status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded ${STATUS_LABELS[org.platform_status]?.color || 'bg-slate-100'}`}>
                          {STATUS_LABELS[org.platform_status]?.label || org.platform_status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">{org.leads_count}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedOrg(org)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Details ansehen"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>
                          {org.platform_status === 'active' && (
                            <button
                              onClick={() => {
                                setSelectedOrg(org);
                                setShowSuspendDialog(true);
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Sperren"
                            >
                              <Lock className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                          {org.platform_status === 'suspended' && (
                            <button
                              onClick={() => handleUnsuspend(org)}
                              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Entsperren"
                            >
                              <Unlock className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredOrgs.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Keine Organisationen gefunden</p>
            </div>
          )}
        </div>

        {/* Organization Detail Modal */}
        {selectedOrg && !showSuspendDialog && (
          <Dialog open={!!selectedOrg} onOpenChange={() => setSelectedOrg(null)}>
            <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-900" />
                  {selectedOrg.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Stammdaten */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">Stammdaten</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Owner E-Mail</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedOrg.owner_email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Organisationstyp</p>
                      <p className="text-sm font-semibold text-slate-900">{TYPE_LABELS[selectedOrg.organization_type]?.label}</p>
                    </div>
                    {selectedOrg.parent_agency_id && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 font-medium">Übergeordnete Agentur</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {organizations.find(o => o.id === selectedOrg.parent_agency_id)?.name || 'N/A'}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Branche</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedOrg.industry || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Website</p>
                      <p className="text-sm font-semibold text-slate-900">{selectedOrg.website || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Billing */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">Billing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Billing-Status</p>
                      <p className={`text-sm font-semibold px-2 py-1 rounded inline-block ${BILLING_LABELS[selectedOrg.billing_status]?.color}`}>
                        {BILLING_LABELS[selectedOrg.billing_status]?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Plan</p>
                      <p className="text-sm font-semibold text-slate-900">{getPlanName(selectedOrg.plan_id)}</p>
                    </div>
                    {selectedOrg.trial_ends_at && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Trial endet</p>
                        <p className="text-sm font-semibold text-slate-900">{moment(selectedOrg.trial_ends_at).format('DD.MM.YYYY')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Platform Status */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">Plattform-Status</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">Status:</span>
                      <span className={`text-sm font-bold px-3 py-1 rounded ${STATUS_LABELS[selectedOrg.platform_status]?.color}`}>
                        {STATUS_LABELS[selectedOrg.platform_status]?.label}
                      </span>
                    </div>
                    {selectedOrg.suspended_reason && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Sperrungsgrund</p>
                        <p className="text-sm text-red-700 bg-red-50 rounded px-3 py-2">{selectedOrg.suspended_reason}</p>
                      </div>
                    )}
                    {selectedOrg.suspended_at && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Gesperrt am</p>
                        <p className="text-sm text-slate-900">{moment(selectedOrg.suspended_at).format('DD.MM.YYYY HH:mm')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nutzung */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">Nutzung</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-slate-500 font-medium">Leads</p>
                      <p className="text-lg font-bold text-blue-700">{selectedOrg.leads_count}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-slate-500 font-medium">Recherche-Läufe</p>
                      <p className="text-lg font-bold text-purple-700">{selectedOrg.research_runs_count}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-slate-500 font-medium">KI-Aktionen</p>
                      <p className="text-lg font-bold text-amber-700">{selectedOrg.ai_actions_used}</p>
                    </div>
                  </div>
                </div>

                {/* Agency-Info (falls Agency) */}
                {selectedOrg.organization_type === 'agency' && (
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">Agentur-Informationen</h3>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <p className="text-xs text-slate-600 font-medium mb-3">Zugehörige Kundenorganisationen: {getAgencyStats(selectedOrg.id).clientCount}</p>
                      {getAgencyStats(selectedOrg.id).clients.length > 0 ? (
                        <div className="space-y-2">
                          {getAgencyStats(selectedOrg.id).clients.map(client => (
                            <div key={client.id} className="text-xs bg-white rounded px-2 py-1 border border-purple-100">
                              <p className="font-semibold text-slate-900">{client.name}</p>
                              <p className="text-slate-500">{client.owner_email}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Keine Kunden zugewiesen</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Support Notes */}
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-600 mb-3">Support-Notizen</h3>
                  {(responseData.supportNotes || []).filter(n => n.organization_id === selectedOrg.id).length > 0 ? (
                    <div className="space-y-2">
                      {(responseData.supportNotes || []).filter(n => n.organization_id === selectedOrg.id).map(note => (
                        <div key={note.id} className={`rounded-lg p-3 border text-xs ${
                          note.severity === 'critical' ? 'bg-red-50 border-red-200' :
                          note.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                          'bg-slate-50 border-slate-200'
                        }`}>
                          <p className="font-semibold text-slate-900">{note.note}</p>
                          <p className="text-slate-500 mt-1">{note.created_by} • {moment(note.created_date).fromNow()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Keine Notizen</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => setSelectedOrg(null)} className="bg-white">
                  Schließen
                </Button>
                {selectedOrg.platform_status === 'active' && (
                  <Button onClick={() => setShowSuspendDialog(true)} className="bg-red-600 hover:bg-red-700 text-white gap-2">
                    <Lock className="w-4 h-4" /> Sperren
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Suspend Dialog */}
        {showSuspendDialog && selectedOrg && (
          <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
            <DialogContent className="max-w-sm bg-white border border-slate-200 shadow-xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" /> Organisation sperren
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Sie sperren: <strong>{selectedOrg.name}</strong>
                </p>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">Sperrungsgrund</label>
                  <textarea
                    value={suspendReason}
                    onChange={e => setSuspendReason(e.target.value)}
                    placeholder="z.B. Zahlungsausfall, AGB-Verstoß, Sicherheitsbedenken…"
                    rows={4}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 resize-none"
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">
                    <strong>Hinweis:</strong> Die Organisation wird in der Plattform als gesperrt gekennzeichnet. Kundenorganisationen werden nicht automatisch gesperrt.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSuspendDialog(false);
                      setSuspendReason('');
                    }}
                    disabled={suspending}
                    className="flex-1 bg-white"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleSuspend}
                    disabled={suspending || !suspendReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {suspending ? 'Wird gesperrt…' : 'Sperren'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}