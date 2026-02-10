import React, { useState } from 'react';
import { extractDocument, createOrderWithContainers } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Upload, FileText, Package, Plus, Trash2, Ship, Sparkles, 
  CheckCircle, Loader2, AlertCircle, Box
} from 'lucide-react';
import { toast } from 'sonner';

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);

const CreateOrder = () => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Review/Edit, 3: Confirm
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  
  const [orderData, setOrderData] = useState({
    bl_number: '',
    origin: '',
    destination: '',
    incoterm: 'FOB',
    notes: '',
    containers: []
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadedFile(file);
    setIsExtracting(true);
    
    try {
      const response = await extractDocument(file);
      
      if (response.data.success && response.data.extracted_data) {
        const data = response.data.extracted_data;
        setExtractedData(data);
        
        // Pre-fill form with extracted data
        setOrderData({
          bl_number: data.bl_number || '',
          origin: data.origin_port || '',
          destination: data.destination_port || '',
          incoterm: data.incoterm || 'FOB',
          notes: data.cargo_description || '',
          containers: (data.containers || []).map((c, idx) => ({
            id: `cont-${idx}`,
            container_number: c.number || '',
            size: c.size || '40ft',
            type: c.type || 'dry',
            seal_number: c.seal || '',
            weight: c.weight || 0,
            products: (c.products || []).map((p, pIdx) => ({
              id: `prod-${idx}-${pIdx}`,
              sku: p.sku || '',
              product_name: p.description || '',
              brand: '',
              quantity: p.quantity || 0,
              unit_price: null
            }))
          }))
        });
        
        toast.success('Documento analizado con IA exitosamente');
        setStep(2);
      } else {
        toast.error('No se pudo extraer información del documento');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Error al procesar el documento');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualEntry = () => {
    setOrderData({
      bl_number: '',
      origin: '',
      destination: '',
      incoterm: 'FOB',
      notes: '',
      containers: [{
        id: `cont-0`,
        container_number: '',
        size: '40ft',
        type: 'dry',
        seal_number: '',
        weight: 0,
        products: [{
          id: `prod-0-0`,
          sku: '',
          product_name: '',
          brand: '',
          quantity: 0,
          unit_price: null
        }]
      }]
    });
    setStep(2);
  };

  const addContainer = () => {
    const newId = `cont-${orderData.containers.length}`;
    setOrderData({
      ...orderData,
      containers: [...orderData.containers, {
        id: newId,
        container_number: '',
        size: '40ft',
        type: 'dry',
        seal_number: '',
        weight: 0,
        products: [{
          id: `prod-${orderData.containers.length}-0`,
          sku: '',
          product_name: '',
          brand: '',
          quantity: 0,
          unit_price: null
        }]
      }]
    });
  };

  const removeContainer = (containerId) => {
    setOrderData({
      ...orderData,
      containers: orderData.containers.filter(c => c.id !== containerId)
    });
  };

  const updateContainer = (containerId, field, value) => {
    setOrderData({
      ...orderData,
      containers: orderData.containers.map(c => 
        c.id === containerId ? { ...c, [field]: value } : c
      )
    });
  };

  const addProduct = (containerId) => {
    setOrderData({
      ...orderData,
      containers: orderData.containers.map(c => {
        if (c.id === containerId) {
          const newProdId = `prod-${c.id}-${c.products.length}`;
          return {
            ...c,
            products: [...c.products, {
              id: newProdId,
              sku: '',
              product_name: '',
              brand: '',
              quantity: 0,
              unit_price: null
            }]
          };
        }
        return c;
      })
    });
  };

  const removeProduct = (containerId, productId) => {
    setOrderData({
      ...orderData,
      containers: orderData.containers.map(c => {
        if (c.id === containerId) {
          return {
            ...c,
            products: c.products.filter(p => p.id !== productId)
          };
        }
        return c;
      })
    });
  };

  const updateProduct = (containerId, productId, field, value) => {
    setOrderData({
      ...orderData,
      containers: orderData.containers.map(c => {
        if (c.id === containerId) {
          return {
            ...c,
            products: c.products.map(p => 
              p.id === productId ? { ...p, [field]: value } : p
            )
          };
        }
        return c;
      })
    });
  };

  const handleCreateOrder = async () => {
    // Validation
    if (!orderData.origin || !orderData.destination) {
      toast.error('Ingrese origen y destino');
      return;
    }
    if (orderData.containers.length === 0) {
      toast.error('Agregue al menos un contenedor');
      return;
    }
    
    setIsCreating(true);
    try {
      const response = await createOrderWithContainers(orderData);
      toast.success(response.data.message);
      setStep(3);
    } catch (error) {
      toast.error('Error al crear la orden');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="create-order-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nueva Orden de Importación</h1>
        <p className="text-slate-500 mt-1">Crea una orden con múltiples contenedores y productos</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        {[
          { num: 1, label: 'Subir Documento' },
          { num: 2, label: 'Revisar y Editar' },
          { num: 3, label: 'Confirmación' }
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= s.num ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
            </div>
            <span className={`ml-2 text-sm ${step >= s.num ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {s.label}
            </span>
            {idx < 2 && <div className="w-12 h-0.5 bg-slate-200 mx-4" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload Document */}
      {step === 1 && (
        <Card className="border-slate-200 rounded-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Extracción Inteligente con IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              Sube el BL (Bill of Lading), Packing List o Factura Comercial y la IA extraerá 
              automáticamente la información de contenedores y productos.
            </p>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              {isExtracting ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                  <p className="text-slate-600">Analizando documento con IA...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">
                    Arrastra un archivo aquí o haz clic para seleccionar
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="doc-upload"
                  />
                  <label htmlFor="doc-upload">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 rounded-sm cursor-pointer">
                      <span>
                        <FileText className="w-4 h-4 mr-2" />
                        Seleccionar Documento
                      </span>
                    </Button>
                  </label>
                  <p className="text-xs text-slate-400 mt-3">
                    Formatos: PDF, PNG, JPG, TXT
                  </p>
                </>
              )}
            </div>

            <Separator />

            <div className="text-center">
              <p className="text-slate-500 mb-3">¿No tienes documento? Ingresa la información manualmente</p>
              <Button variant="outline" onClick={handleManualEntry} className="rounded-sm">
                <Plus className="w-4 h-4 mr-2" />
                Crear Orden Manual
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review and Edit */}
      {step === 2 && (
        <div className="space-y-6">
          {extractedData && (
            <Card className="border-green-200 bg-green-50 rounded-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700">
                  Información extraída automáticamente. Revisa y ajusta si es necesario.
                </span>
              </CardContent>
            </Card>
          )}

          {/* Order Details */}
          <Card className="border-slate-200 rounded-sm">
            <CardHeader>
              <CardTitle>Datos de la Orden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>No. BL</Label>
                  <Input 
                    value={orderData.bl_number}
                    onChange={(e) => setOrderData({...orderData, bl_number: e.target.value})}
                    placeholder="BL-2024-XXXXX"
                  />
                </div>
                <div>
                  <Label>Puerto Origen *</Label>
                  <Input 
                    value={orderData.origin}
                    onChange={(e) => setOrderData({...orderData, origin: e.target.value})}
                    placeholder="Shanghai"
                  />
                </div>
                <div>
                  <Label>Puerto Destino *</Label>
                  <Input 
                    value={orderData.destination}
                    onChange={(e) => setOrderData({...orderData, destination: e.target.value})}
                    placeholder="Manzanillo"
                  />
                </div>
                <div>
                  <Label>Incoterm</Label>
                  <Select value={orderData.incoterm} onValueChange={(v) => setOrderData({...orderData, incoterm: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB</SelectItem>
                      <SelectItem value="CIF">CIF</SelectItem>
                      <SelectItem value="CFR">CFR</SelectItem>
                      <SelectItem value="EXW">EXW</SelectItem>
                      <SelectItem value="DDP">DDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notas / Descripción</Label>
                <Textarea 
                  value={orderData.notes}
                  onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                  placeholder="Descripción general de la carga..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Containers */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Contenedores ({orderData.containers.length})</h3>
            <Button onClick={addContainer} className="rounded-sm bg-slate-900">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Contenedor
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {orderData.containers.map((container, cIdx) => (
                <Card key={container.id} className="border-slate-200 rounded-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Contenedor #{cIdx + 1}
                      </CardTitle>
                      {orderData.containers.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeContainer(container.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-xs">No. Contenedor</Label>
                        <Input 
                          value={container.container_number}
                          onChange={(e) => updateContainer(container.id, 'container_number', e.target.value)}
                          placeholder="MSKU1234567"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tamaño</Label>
                        <Select 
                          value={container.size} 
                          onValueChange={(v) => updateContainer(container.id, 'size', v)}
                        >
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20ft">20 pies</SelectItem>
                            <SelectItem value="40ft">40 pies</SelectItem>
                            <SelectItem value="40ft HC">40 pies HC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select 
                          value={container.type} 
                          onValueChange={(v) => updateContainer(container.id, 'type', v)}
                        >
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dry">Dry</SelectItem>
                            <SelectItem value="reefer">Reefer</SelectItem>
                            <SelectItem value="flat_rack">Flat Rack</SelectItem>
                            <SelectItem value="open_top">Open Top</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">No. Sello</Label>
                        <Input 
                          value={container.seal_number}
                          onChange={(e) => updateContainer(container.id, 'seal_number', e.target.value)}
                          placeholder="SEAL123"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Peso (kg)</Label>
                        <Input 
                          type="number"
                          value={container.weight}
                          onChange={(e) => updateContainer(container.id, 'weight', parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {/* Products in Container */}
                    <div className="bg-slate-50 p-3 rounded-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Box className="w-4 h-4 text-slate-500" />
                          Productos ({container.products.length})
                        </h4>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addProduct(container.id)}
                          className="text-xs h-7"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Producto
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {container.products.map((product, pIdx) => (
                          <div key={product.id} className="flex items-center gap-2 bg-white p-2 rounded-sm">
                            <div className="flex-1 grid grid-cols-4 gap-2">
                              <Input 
                                placeholder="SKU"
                                value={product.sku}
                                onChange={(e) => updateProduct(container.id, product.id, 'sku', e.target.value)}
                                className="text-xs h-8"
                              />
                              <Input 
                                placeholder="Nombre del producto"
                                value={product.product_name}
                                onChange={(e) => updateProduct(container.id, product.id, 'product_name', e.target.value)}
                                className="text-xs h-8 col-span-2"
                              />
                              <Input 
                                type="number"
                                placeholder="Cantidad"
                                value={product.quantity}
                                onChange={(e) => updateProduct(container.id, product.id, 'quantity', parseInt(e.target.value) || 0)}
                                className="text-xs h-8"
                              />
                            </div>
                            {container.products.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeProduct(container.id, product.id)}
                                className="text-red-500 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="rounded-sm">
              Volver
            </Button>
            <Button 
              onClick={handleCreateOrder} 
              className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Crear Orden
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <Card className="border-emerald-200 bg-emerald-50 rounded-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-800 mb-2">¡Orden Creada Exitosamente!</h2>
            <p className="text-emerald-600 mb-6">
              La orden ha sido registrada con {orderData.containers.length} contenedor(es).
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep(1);
                  setOrderData({
                    bl_number: '', origin: '', destination: '', incoterm: 'FOB', notes: '', containers: []
                  });
                  setExtractedData(null);
                  setUploadedFile(null);
                }}
                className="rounded-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Otra Orden
              </Button>
              <Button 
                onClick={() => window.location.href = '/orders'}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
              >
                Ver Órdenes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateOrder;
