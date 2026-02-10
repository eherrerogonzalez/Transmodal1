# Transmodal Client Portal - PRD

## Problem Statement
Aplicación web para clientes de Transmodal para gestión de cadena de suministro:
- **Objetivo Principal**: Garantizar que el cliente final NUNCA se quede sin producto
- Flujo: ORIGEN → INBOUND → CEDIS (Almacén) → DISTRIBUCIÓN → CLIENTE FINAL
- Sistema de confirmación de órdenes (no solo alertas)
- Órdenes con múltiples contenedores, cada contenedor con múltiples productos
- Extracción automática de información de documentos con AI (Claude)
- Chatbot interno de customer service con AI

## User Personas
- **Cliente Corporativo** (ej: Pernod Ricard): Empresas que importan productos y los distribuyen a retailers como Walmart, Costco, HEB

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI (Python) con endpoints mock + AI integrations
- **Database**: MongoDB (para productos, citas y órdenes creadas)
- **AI**: Claude Sonnet 4.5 vía Emergent Integrations (chatbot y extracción de documentos)
- **Auth**: Token JWT simulado (para futura integración con ERP)

## Core Features Implemented ✅

### 1. Sistema de Confirmación de Órdenes
- **Pedidos a Origen**: Lista de productos que necesitan pedirse a origen
  - Confirmar/Rechazar individualmente o en lote
  - Muestra cantidad sugerida, origen, lead time, fecha esperada
- **Distribuciones a Clientes Finales**: Lista de envíos pendientes desde CEDIS
  - Confirmar/Rechazar individualmente o en lote
  - Muestra cliente, tienda, cantidad, prioridad
- **NO son alertas**, son órdenes que el usuario CONFIRMA

### 2. Órdenes con Múltiples Contenedores
- Una orden puede tener múltiples contenedores
- Cada contenedor tiene:
  - Número de contenedor
  - Tamaño (20ft, 40ft, 40ft HC)
  - Tipo (dry, reefer, flat rack, open top)
  - Número de sello
  - Peso
  - Lista de productos (SKU, nombre, cantidad)

### 3. Extracción AI de Documentos
- Subir BL, Packing List o Factura Comercial
- Claude AI extrae automáticamente:
  - Número BL, shipper, consignatario
  - Puertos origen/destino
  - Información de contenedores y productos
- Pre-llena el formulario de creación de orden

### 4. Chatbot AI de Customer Service
- Botón flotante en todas las páginas
- Usa Claude Sonnet 4.5
- Responde preguntas sobre:
  - Estado de contenedores y órdenes
  - Tiempos de tránsito
  - Cargos adicionales
  - Inventario y reabastecimiento
  - Cualquier consulta del portal

### 5. Planificación de Cadena de Suministro
- Visibilidad completa: ORIGEN → CEDIS → CLIENTE FINAL
- Predicciones de cuándo pedir a origen
- Lead times de rutas marítimas/intermodales
- Tiempos de distribución por región

### 6. Inventario de Clientes Finales
- Walmart, Costco, HEB, Soriana, La Comer, Chedraui
- Stock por tienda
- Velocidad de venta (sell-through rate)
- Alertas de desabasto
- Cantidad sugerida de resurtido

## API Endpoints

### Orders & Confirmations
- `GET /api/orders/pending-origin` - Pedidos a origen pendientes
- `POST /api/orders/pending-origin/{id}/confirm` - Confirmar pedido
- `POST /api/orders/pending-origin/{id}/reject` - Rechazar pedido
- `GET /api/orders/pending-distribution` - Distribuciones pendientes
- `POST /api/orders/pending-distribution/{id}/confirm` - Confirmar distribución
- `POST /api/orders/create-with-containers` - Crear orden con contenedores

### AI
- `POST /api/ai/extract-document` - Extraer info de documento
- `POST /api/ai/chat` - Chatbot customer service
- `GET /api/ai/chat/history/{session_id}` - Historial de chat

### Supply Chain
- `GET /api/planning/supply-chain` - Plan integrado
- `GET /api/planning/distribution-orders` - Órdenes de distribución
- `GET /api/planning/action-items` - Acciones a tomar hoy

### End Clients
- `GET /api/inventory/end-clients` - Lista de clientes
- `GET /api/inventory/end-clients/{name}` - Inventario por cliente
- `GET /api/inventory/end-clients-overview` - Resumen de todos

## Frontend Pages
- `/dashboard` - Dashboard con KPIs
- `/confirmations` - Confirmación de órdenes (NUEVO)
- `/orders` - Lista de órdenes
- `/orders/new` - Nueva orden con AI (NUEVO)
- `/containers` - Lista de contenedores
- `/map` - Mapa de tracking
- `/inventory` - Cadena de suministro integrada
- `/planning` - Planeación y forecast
- `/additionals` - Adicionales
- `/account` - Estado de cuenta

## Technical Notes
- **DATOS MOCK**: Todo generado en Python con random
- **AI**: Claude vía Emergent Integrations (EMERGENT_LLM_KEY)
- Lead times configurables en TRANSIT_ROUTES
- Tiempos de distribución por región en DISTRIBUTION_TIMES
- Clientes finales configurables en END_CLIENTS

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- Sistema de confirmación de órdenes
- Órdenes con múltiples contenedores
- Extracción AI de documentos
- Chatbot AI
- Planificación de cadena de suministro

### P1 (High Priority) - Pendiente
- Integración real con ERP vía API
- Google Maps para tracking real
- Autenticación real con ERP
- Almacenamiento real de documentos

### P2 (Medium Priority)
- Notificaciones push
- Exportación PDF
- Multi-idioma
- Dark mode

## Next Tasks
1. Integrar API del ERP para datos reales
2. Configurar Google Maps API
3. Conectar inventarios reales de clientes finales
4. Implementar almacenamiento de documentos
