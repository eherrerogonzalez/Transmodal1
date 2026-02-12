import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, RefreshCw, X, FileText, ClipboardCheck, Check, Upload, Calendar, CreditCard, Mail, Phone, MapPin, Save, Star, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

const SUPPLIER_TYPES = {
  naviera: 'Naviera',
  ferroviaria: 'Ferroviaria',
  transportista: 'Transportista',
  agente_aduanal: 'Agente Aduanal',
  almacen: 'Almacén',
  otro: 'Otro'
};

const DOC_TYPES = {
  acta_constitutiva: 'Acta Constitutiva',
  ine_representante: 'INE Representante Legal',
  csf: 'Constancia Situación Fiscal',
  contrato: 'Contrato',
  tarifario: 'Tarifario',
  otro: 'Otro'
};

const CONTRACT_STATUS = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  signed: { label: 'Firmado', color: 'bg-emerald-100 text-emerald-700' },
  expired: { label: 'Expirado', color: 'bg-red-100 text-red-700' }
};

export default function OpsSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [showAddAudit, setShowAddAudit] = useState(false);

  const [newSupplier, setNewSupplier] = useState({
    company_name: '', trade_name: '', rfc: '', supplier_type: 'naviera',
    contact_name: '', contact_email: '', contact_phone: '',
    address: '', city: '', state: '',
    credit_days: 30, credit_limit: 0, payment_method: 'transferencia',
    bank_name: '', bank_account: '', clabe: '', notes: ''
  });

  const [newDoc, setNewDoc] = useState({ doc_type: 'acta_constitutiva', file_name: '', notes: '' });
  const [newAudit, setNewAudit] = useState({
    audit_date: new Date().toISOString().split('T')[0], auditor_name: '', audit_type: 'seguimiento',
    score: 80, status: 'approved', findings: '', recommendations: '', next_audit_date: '', notes: ''
  });

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('supplier_type', filterType);
      const response = await api.get(`/ops/suppliers?${params.toString()}`);
      setSuppliers(response.data.suppliers);
    } catch (error) { toast.error('Error al cargar proveedores'); }
    finally { setLoading(false); }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.company_name || !newSupplier.rfc || !newSupplier.contact_email) {
      toast.error('Completa los campos requeridos'); return;
    }
    try {
      const response = await api.post('/ops/suppliers', newSupplier);
      setSuppliers([response.data.supplier, ...suppliers]);
      setShowNewSupplier(false);
      setNewSupplier({ company_name: '', trade_name: '', rfc: '', supplier_type: 'naviera', contact_name: '', contact_email: '', contact_phone: '', address: '', city: '', state: '', credit_days: 30, credit_limit: 0, payment_method: 'transferencia', bank_name: '', bank_account: '', clabe: '', notes: '' });
      toast.success('Proveedor creado');
    } catch (error) { toast.error('Error al crear proveedor'); }
  };

  const handleAddDocument = async () => {
    if (!newDoc.file_name) { toast.error('Ingresa nombre de archivo'); return; }
    try {
      const response = await api.post(`/ops/suppliers/${selectedSupplier.id}/documents`, newDoc);
      selectedSupplier.documents.push(response.data.document);
      setShowAddDoc(false);
      setNewDoc({ doc_type: 'acta_constitutiva', file_name: '', notes: '' });
      toast.success('Documento agregado');
    } catch (error) { toast.error('Error al agregar documento'); }
  };

  const handleAddAudit = async () => {
    if (!newAudit.auditor_name) { toast.error('Ingresa nombre del auditor'); return; }
    try {
      const auditData = { ...newAudit, findings: newAudit.findings.split(',').map(f => f.trim()).filter(f => f), recommendations: newAudit.recommendations.split(',').map(r => r.trim()).filter(r => r) };
      const response = await api.post(`/ops/suppliers/${selectedSupplier.id}/audits`, auditData);
      selectedSupplier.audits.push(response.data.audit);
      setShowAddAudit(false);
      setNewAudit({ audit_date: new Date().toISOString().split('T')[0], auditor_name: '', audit_type: 'seguimiento', score: 80, status: 'approved', findings: '', recommendations: '', next_audit_date: '', notes: '' });
      toast.success('Auditoría registrada');
    } catch (error) { toast.error('Error al registrar auditoría'); }
  };

  const handleSignContract = async () => {
    try {
      const response = await api.post(`/ops/suppliers/${selectedSupplier.id}/sign-contract`);
      const updated = response.data.supplier;
      setSuppliers(suppliers.map(s => s.id === updated.id ? updated : s));
      setSelectedSupplier(updated);
      toast.success('Contrato firmado');
    } catch (error) { toast.error('Error al firmar contrato'); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v);
  const filtered = suppliers.filter(s => s.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.rfc.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6" data-testid="ops-suppliers">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-bold text-slate-800">Proveedores</h1><p className="text-slate-500">Gestión de proveedores, documentos y auditorías</p></div>
        <Button onClick={() => setShowNewSupplier(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Nuevo Proveedor</Button>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar por nombre o RFC..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
            </div>
            <div className="min-w-[150px]">
              <select value={filterType} onChange={(e) => { setFilterType(e.target.value); loadSuppliers(); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Todos los tipos</option>
                {Object.entries(SUPPLIER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((supplier) => {
          const contractStatus = CONTRACT_STATUS[supplier.contract_status] || CONTRACT_STATUS.pending;
          const hasAllDocs = supplier.documents?.length >= 3;
          const lastAudit = supplier.audits?.[supplier.audits.length - 1];
          return (
            <Card key={supplier.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedSupplier(supplier); setActiveTab('info'); }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div><h3 className="font-semibold text-slate-800">{supplier.company_name}</h3><p className="text-xs text-slate-500">{supplier.rfc}</p></div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${contractStatus.color}`}>{contractStatus.label}</span>
                </div>
                <div className="flex items-center gap-2 mb-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{SUPPLIER_TYPES[supplier.supplier_type]}</span></div>
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{supplier.contact_email}</div>
                  <div className="flex items-center gap-2"><CreditCard className="w-3 h-3" />{supplier.credit_days} días crédito</div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1"><FileText className="w-4 h-4 text-slate-400" /><span className="text-xs text-slate-500">{supplier.documents?.length || 0} docs</span>{hasAllDocs && <Check className="w-3 h-3 text-emerald-500" />}</div>
                  {lastAudit && <div className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400" /><span className="text-xs font-medium">{lastAudit.score}</span></div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New Supplier Modal */}
      {showNewSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-semibold text-slate-800">Nuevo Proveedor</h3><button onClick={() => setShowNewSupplier(false)}><X className="w-5 h-5 text-slate-500" /></button></div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Razón Social *</label><Input value={newSupplier.company_name} onChange={(e) => setNewSupplier({...newSupplier, company_name: e.target.value})} placeholder="Empresa SA de CV" /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Nombre Comercial</label><Input value={newSupplier.trade_name} onChange={(e) => setNewSupplier({...newSupplier, trade_name: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">RFC *</label><Input value={newSupplier.rfc} onChange={(e) => setNewSupplier({...newSupplier, rfc: e.target.value.toUpperCase()})} placeholder="XXX000000XXX" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Tipo de Proveedor</label><select value={newSupplier.supplier_type} onChange={(e) => setNewSupplier({...newSupplier, supplier_type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">{Object.entries(SUPPLIER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="text-xs text-slate-500 block mb-1">Contacto</label><Input value={newSupplier.contact_name} onChange={(e) => setNewSupplier({...newSupplier, contact_name: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Email *</label><Input type="email" value={newSupplier.contact_email} onChange={(e) => setNewSupplier({...newSupplier, contact_email: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Teléfono</label><Input value={newSupplier.contact_phone} onChange={(e) => setNewSupplier({...newSupplier, contact_phone: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Ciudad</label><Input value={newSupplier.city} onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Estado</label><Input value={newSupplier.state} onChange={(e) => setNewSupplier({...newSupplier, state: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Días de Crédito</label><Input type="number" value={newSupplier.credit_days} onChange={(e) => setNewSupplier({...newSupplier, credit_days: parseInt(e.target.value) || 0})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Límite de Crédito</label><Input type="number" value={newSupplier.credit_limit} onChange={(e) => setNewSupplier({...newSupplier, credit_limit: parseFloat(e.target.value) || 0})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Banco</label><Input value={newSupplier.bank_name} onChange={(e) => setNewSupplier({...newSupplier, bank_name: e.target.value})} /></div>
                <div><label className="text-xs text-slate-500 block mb-1">CLABE</label><Input value={newSupplier.clabe} onChange={(e) => setNewSupplier({...newSupplier, clabe: e.target.value})} /></div>
              </div>
              <div><label className="text-xs text-slate-500 block mb-1">Notas</label><textarea value={newSupplier.notes} onChange={(e) => setNewSupplier({...newSupplier, notes: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-20" /></div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowNewSupplier(false)}>Cancelar</Button><Button onClick={handleCreateSupplier} className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar</Button></div>
          </div>
        </div>
      )}

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div><h3 className="font-semibold text-slate-800">{selectedSupplier.company_name}</h3><p className="text-sm text-slate-500">{selectedSupplier.rfc}</p></div>
              <button onClick={() => setSelectedSupplier(null)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {['info', 'documents', 'audits', 'contract'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'info' && 'Información'}{tab === 'documents' && 'Documentos'}{tab === 'audits' && 'Auditorías'}{tab === 'contract' && 'Contrato'}
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
                      <div className="flex justify-between"><span className="text-slate-500">Tipo:</span><span className="text-slate-800">{SUPPLIER_TYPES[selectedSupplier.supplier_type]}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Contacto:</span><span className="text-slate-800">{selectedSupplier.contact_name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="text-slate-800">{selectedSupplier.contact_email}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Teléfono:</span><span className="text-slate-800">{selectedSupplier.contact_phone}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Ubicación:</span><span className="text-slate-800">{selectedSupplier.city}, {selectedSupplier.state}</span></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-700">Información Comercial</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Días de Crédito:</span><span className="text-slate-800 font-medium">{selectedSupplier.credit_days} días</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Límite de Crédito:</span><span className="text-slate-800 font-medium">{formatCurrency(selectedSupplier.credit_limit)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Método de Pago:</span><span className="text-slate-800">{selectedSupplier.payment_method}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Banco:</span><span className="text-slate-800">{selectedSupplier.bank_name || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">CLABE:</span><span className="text-slate-800 font-mono text-xs">{selectedSupplier.clabe || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><h4 className="font-medium text-slate-700">Documentos del Proveedor</h4><Button size="sm" onClick={() => setShowAddDoc(true)}><Upload className="w-4 h-4 mr-1" />Subir Documento</Button></div>
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
                    {selectedSupplier.documents?.map((doc) => (
                      <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3"><FileText className="w-8 h-8 text-blue-500" /><div><p className="font-medium text-slate-800">{DOC_TYPES[doc.doc_type]}</p><p className="text-xs text-slate-500">{doc.file_name}</p></div></div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status === 'approved' ? 'Aprobado' : 'Pendiente'}</span>
                      </div>
                    ))}
                  </div>
                  {(!selectedSupplier.documents || selectedSupplier.documents.length === 0) && <p className="text-slate-500 text-center py-4">Sin documentos</p>}
                </div>
              )}

              {/* Audits Tab */}
              {activeTab === 'audits' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><h4 className="font-medium text-slate-700">Auditorías</h4><Button size="sm" onClick={() => setShowAddAudit(true)}><ClipboardCheck className="w-4 h-4 mr-1" />Nueva Auditoría</Button></div>
                  {showAddAudit && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div><label className="text-xs text-slate-500 block mb-1">Fecha</label><Input type="date" value={newAudit.audit_date} onChange={(e) => setNewAudit({...newAudit, audit_date: e.target.value})} /></div>
                        <div><label className="text-xs text-slate-500 block mb-1">Auditor</label><Input value={newAudit.auditor_name} onChange={(e) => setNewAudit({...newAudit, auditor_name: e.target.value})} /></div>
                        <div><label className="text-xs text-slate-500 block mb-1">Tipo</label><select value={newAudit.audit_type} onChange={(e) => setNewAudit({...newAudit, audit_type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"><option value="inicial">Inicial</option><option value="seguimiento">Seguimiento</option><option value="recertificacion">Recertificación</option></select></div>
                        <div><label className="text-xs text-slate-500 block mb-1">Calificación (0-100)</label><Input type="number" min="0" max="100" value={newAudit.score} onChange={(e) => setNewAudit({...newAudit, score: parseInt(e.target.value) || 0})} /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><label className="text-xs text-slate-500 block mb-1">Hallazgos (separados por coma)</label><Input value={newAudit.findings} onChange={(e) => setNewAudit({...newAudit, findings: e.target.value})} /></div>
                        <div><label className="text-xs text-slate-500 block mb-1">Recomendaciones (separadas por coma)</label><Input value={newAudit.recommendations} onChange={(e) => setNewAudit({...newAudit, recommendations: e.target.value})} /></div>
                      </div>
                      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setShowAddAudit(false)}>Cancelar</Button><Button size="sm" onClick={handleAddAudit} className="bg-emerald-600 hover:bg-emerald-700">Registrar</Button></div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {selectedSupplier.audits?.map((audit) => (
                      <div key={audit.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div><p className="font-medium text-slate-800">{audit.audit_type.charAt(0).toUpperCase() + audit.audit_type.slice(1)}</p><p className="text-xs text-slate-500">{audit.audit_date} • {audit.auditor_name}</p></div>
                          <div className="flex items-center gap-2"><div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${audit.score >= 80 ? 'bg-emerald-100 text-emerald-700' : audit.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{audit.score}</div></div>
                        </div>
                        {audit.findings?.length > 0 && <div className="mt-2"><p className="text-xs text-slate-500">Hallazgos:</p><ul className="text-sm text-slate-700 list-disc list-inside">{audit.findings.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
                      </div>
                    ))}
                  </div>
                  {(!selectedSupplier.audits || selectedSupplier.audits.length === 0) && <p className="text-slate-500 text-center py-4">Sin auditorías registradas</p>}
                </div>
              )}

              {/* Contract Tab */}
              {activeTab === 'contract' && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-medium mb-4 ${CONTRACT_STATUS[selectedSupplier.contract_status]?.color}`}>{selectedSupplier.contract_status === 'signed' && <Check className="w-5 h-5" />}{CONTRACT_STATUS[selectedSupplier.contract_status]?.label}</div>
                    {selectedSupplier.contract_status === 'signed' ? (
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-600">Firmado: {selectedSupplier.contract_signed_at?.split('T')[0]}</p>
                        <p className="text-slate-600">Vigencia: {selectedSupplier.contract_start} - {selectedSupplier.contract_end}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-slate-600">El contrato está pendiente de firma.</p>
                        <Button onClick={handleSignContract} className="bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 mr-2" />Firmar Contrato</Button>
                      </div>
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
