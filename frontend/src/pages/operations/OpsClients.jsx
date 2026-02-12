import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, RefreshCw, X, FileText, Check, Upload, CreditCard, Mail, Phone, Save, TrendingUp, Package, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

const INDUSTRIES = { bebidas: 'Bebidas', alimentos: 'Alimentos', automotriz: 'Automotriz', retail: 'Retail', farmaceutica: 'Farmacéutica', otro: 'Otro' };
const DOC_TYPES = { acta_constitutiva: 'Acta Constitutiva', ine_representante: 'INE Representante Legal', csf: 'Constancia Situación Fiscal', contrato: 'Contrato', otro: 'Otro' };
const CONTRACT_STATUS = { pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' }, sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' }, signed: { label: 'Firmado', color: 'bg-emerald-100 text-emerald-700' }, expired: { label: 'Expirado', color: 'bg-red-100 text-red-700' } };

export default function OpsClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [showAddDoc, setShowAddDoc] = useState(false);

  const [newClient, setNewClient] = useState({ company_name: '', trade_name: '', rfc: '', industry: 'bebidas', contact_name: '', contact_email: '', contact_phone: '', address: '', city: '', state: '', credit_days: 30, credit_limit: 0, payment_method: 'transferencia', notes: '' });
  const [newDoc, setNewDoc] = useState({ doc_type: 'acta_constitutiva', file_name: '', notes: '' });

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterIndustry) params.append('industry', filterIndustry);
      const response = await api.get(`/ops/clients?${params.toString()}`);
      setClients(response.data.clients);
    } catch (error) { toast.error('Error al cargar clientes'); }
    finally { setLoading(false); }
  };

  const handleCreateClient = async () => {
    if (!newClient.company_name || !newClient.rfc || !newClient.contact_email) { toast.error('Completa los campos requeridos'); return; }
    try {
      const response = await api.post('/ops/clients', newClient);
      setClients([response.data.client, ...clients]);
      setShowNewClient(false);
      setNewClient({ company_name: '', trade_name: '', rfc: '', industry: 'bebidas', contact_name: '', contact_email: '', contact_phone: '', address: '', city: '', state: '', credit_days: 30, credit_limit: 0, payment_method: 'transferencia', notes: '' });
      toast.success('Cliente creado');
    } catch (error) { toast.error('Error al crear cliente'); }
  };

  const handleAddDocument = async () => {
    if (!newDoc.file_name) { toast.error('Ingresa nombre de archivo'); return; }
    try {
      const response = await api.post(`/ops/clients/${selectedClient.id}/documents`, newDoc);
      selectedClient.documents.push(response.data.document);
      setShowAddDoc(false);
      setNewDoc({ doc_type: 'acta_constitutiva', file_name: '', notes: '' });
      toast.success('Documento agregado');
    } catch (error) { toast.error('Error al agregar documento'); }
  };

  const handleSignContract = async () => {
    try {
      const response = await api.post(`/ops/clients/${selectedClient.id}/sign-contract`);
      const updated = response.data.client;
      setClients(clients.map(c => c.id === updated.id ? updated : c));
      setSelectedClient(updated);
      toast.success('Contrato firmado');
    } catch (error) { toast.error('Error al firmar contrato'); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v);
  const filtered = clients.filter(c => c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || c.rfc.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6" data-testid="ops-clients">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800">Clientes</h1><p className="text-slate-500">Gestión de clientes y documentación</p></div>
        <Button onClick={() => setShowNewClient(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Nuevo Cliente</Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar por nombre o RFC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
            <div className="min-w-[150px]"><select value={filterIndustry} onChange={(e) => { setFilterIndustry(e.target.value); loadClients(); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"><option value="">Todas las industrias</option>{Object.entries(INDUSTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => {
          const contractStatus = CONTRACT_STATUS[client.contract_status] || CONTRACT_STATUS.pending;
          return (
            <Card key={client.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedClient(client); setActiveTab('info'); }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div><h3 className="font-semibold text-slate-800">{client.company_name}</h3><p className="text-xs text-slate-500">{client.rfc}</p></div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${contractStatus.color}`}>{contractStatus.label}</span>
                </div>
                <div className="flex items-center gap-2 mb-3"><span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{INDUSTRIES[client.industry]}</span></div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{client.contact_email}</div>
                  <div className="flex items-center gap-2"><CreditCard className="w-3 h-3" />{client.credit_days} días crédito</div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                  <div><p className="text-lg font-bold text-slate-800">{client.total_shipments}</p><p className="text-xs text-slate-500">Embarques</p></div>
                  <div><p className="text-lg font-bold text-emerald-600">{formatCurrency(client.total_revenue)}</p><p className="text-xs text-slate-500">Ingresos</p></div>
                  <div><p className="text-lg font-bold text-blue-600">{client.avg_margin?.toFixed(1)}%</p><p className="text-xs text-slate-500">Margen</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Client Modal */}
      {showNewClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-semibold text-slate-800">Nuevo Cliente</h3><button onClick={() => setShowNewClient(false)}><X className="w-5 h-5 text-slate-500" /></button></div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Razón Social *</label><Input value={newClient.company_name} onChange={(e) => setNewClient({...newClient, company_name: e.target.value})} placeholder="Empresa SA de CV" /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Nombre Comercial</label><Input value={newClient.trade_name} onChange={(e) => setNewClient({...newClient, trade_name: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">RFC *</label><Input value={newClient.rfc} onChange={(e) => setNewClient({...newClient, rfc: e.target.value.toUpperCase()})} placeholder="XXX000000XXX" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Industria</label><select value={newClient.industry} onChange={(e) => setNewClient({...newClient, industry: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">{Object.entries(INDUSTRIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 block mb-1">Contacto</label><Input value={newClient.contact_name} onChange={(e) => setNewClient({...newClient, contact_name: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Email *</label><Input type="email" value={newClient.contact_email} onChange={(e) => setNewClient({...newClient, contact_email: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Teléfono</label><Input value={newClient.contact_phone} onChange={(e) => setNewClient({...newClient, contact_phone: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Ciudad</label><Input value={newClient.city} onChange={(e) => setNewClient({...newClient, city: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Estado</label><Input value={newClient.state} onChange={(e) => setNewClient({...newClient, state: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Días de Crédito</label><Input type="number" value={newClient.credit_days} onChange={(e) => setNewClient({...newClient, credit_days: parseInt(e.target.value) || 0})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Límite de Crédito</label><Input type="number" value={newClient.credit_limit} onChange={(e) => setNewClient({...newClient, credit_limit: parseFloat(e.target.value) || 0})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Método de Pago</label><select value={newClient.payment_method} onChange={(e) => setNewClient({...newClient, payment_method: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"><option value="transferencia">Transferencia</option><option value="cheque">Cheque</option><option value="efectivo">Efectivo</option></select></div>
              </div>
              <div><label className="text-xs text-slate-500 block mb-1">Notas</label><textarea value={newClient.notes} onChange={(e) => setNewClient({...newClient, notes: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-20" /></div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowNewClient(false)}>Cancelar</Button><Button onClick={handleCreateClient} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar</Button></div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div><h3 className="font-semibold text-slate-800">{selectedClient.company_name}</h3><p className="text-sm text-slate-500">{selectedClient.rfc}</p></div>
              <button onClick={() => setSelectedClient(null)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {['info', 'documents', 'stats', 'contract'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'info' && 'Información'}{tab === 'documents' && 'Documentos'}{tab === 'stats' && 'Estadísticas'}{tab === 'contract' && 'Contrato'}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-700">Datos Generales</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Industria:</span><span className="text-slate-800">{INDUSTRIES[selectedClient.industry]}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Contacto:</span><span className="text-slate-800">{selectedClient.contact_name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="text-slate-800">{selectedClient.contact_email}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Teléfono:</span><span className="text-slate-800">{selectedClient.contact_phone}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ubicación:</span><span className="text-slate-800">{selectedClient.city}, {selectedClient.state}</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-700">Información Comercial</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Días de Crédito:</span><span className="text-slate-800 font-medium">{selectedClient.credit_days} días</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Límite de Crédito:</span><span className="text-slate-800 font-medium">{formatCurrency(selectedClient.credit_limit)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Método de Pago:</span><span className="text-slate-800">{selectedClient.payment_method}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><h4 className="font-medium text-slate-700">Documentos del Cliente</h4><Button size="sm" onClick={() => setShowAddDoc(true)}><Upload className="w-4 h-4 mr-1" />Subir Documento</Button></div>
                  {showAddDoc && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div><label className="text-xs text-slate-500 block mb-1">Tipo de Documento</label><select value={newDoc.doc_type} onChange={(e) => setNewDoc({...newDoc, doc_type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">{Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                        <div><label className="text-xs text-slate-500 block mb-1">Nombre del Archivo</label><Input value={newDoc.file_name} onChange={(e) => setNewDoc({...newDoc, file_name: e.target.value})} placeholder="documento.pdf" /></div>
                        <div><label className="text-xs text-slate-500 block mb-1">Notas</label><Input value={newDoc.notes} onChange={(e) => setNewDoc({...newDoc, notes: e.target.value})} /></div>
                      </div>
                      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setShowAddDoc(false)}>Cancelar</Button><Button size="sm" onClick={handleAddDocument}>Guardar</Button></div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedClient.documents?.map((doc) => (
                      <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3"><FileText className="w-8 h-8 text-blue-500" /><div><p className="font-medium text-slate-800">{DOC_TYPES[doc.doc_type]}</p><p className="text-xs text-slate-500">{doc.file_name}</p></div></div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status === 'approved' ? 'Aprobado' : 'Pendiente'}</span>
                      </div>
                    ))}
                  </div>
                  {(!selectedClient.documents || selectedClient.documents.length === 0) && <p className="text-slate-500 text-center py-4">Sin documentos</p>}
                </div>
              )}

              {/* Stats Tab */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl text-center"><Package className="w-8 h-8 text-blue-500 mx-auto mb-2" /><p className="text-3xl font-bold text-slate-800">{selectedClient.total_shipments}</p><p className="text-sm text-slate-500">Embarques Totales</p></div>
                    <div className="p-4 bg-emerald-50 rounded-xl text-center"><DollarSign className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="text-3xl font-bold text-emerald-600">{formatCurrency(selectedClient.total_revenue)}</p><p className="text-sm text-slate-500">Ingresos Totales</p></div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center"><TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" /><p className="text-3xl font-bold text-purple-600">{selectedClient.avg_margin?.toFixed(1)}%</p><p className="text-sm text-slate-500">Margen Promedio</p></div>
                  </div>
                </div>
              )}

              {/* Contract Tab */}
              {activeTab === 'contract' && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-medium mb-4 ${CONTRACT_STATUS[selectedClient.contract_status]?.color}`}>{selectedClient.contract_status === 'signed' && <Check className="w-5 h-5" />}{CONTRACT_STATUS[selectedClient.contract_status]?.label}</div>
                    {selectedClient.contract_status === 'signed' ? (
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-600">Firmado: {selectedClient.contract_signed_at?.split('T')[0]}</p>
                        <p className="text-slate-600">Vigencia: {selectedClient.contract_start} - {selectedClient.contract_end}</p>
                      </div>
                    ) : (
                      <div className="space-y-4"><p className="text-slate-600">El contrato está pendiente de firma.</p><Button onClick={handleSignContract} className="bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 mr-2" />Firmar Contrato</Button></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
