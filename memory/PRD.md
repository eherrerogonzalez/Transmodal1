# Transmodal Client Portal - PRD

## Problem Statement
Aplicación web para clientes de Transmodal para gestión de cadena de suministro:
- **Objetivo Principal**: Garantizar que el cliente final NUNCA se quede sin producto
- Flujo: ORIGEN → INBOUND → CEDIS (Almacén) → DISTRIBUCIÓN → CLIENTE FINAL
- Sistema de confirmación de órdenes (no alertas)
- Órdenes con múltiples contenedores, cada contenedor con múltiples productos
- Extracción automática de información de documentos con AI
- **Chatbot inteligente con acceso a datos en tiempo real, gráficos y reportes**

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI (Python) con endpoints mock + AI integrations
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 vía Emergent Integrations
- **Auth**: Token JWT simulado

## Core Features Implemented ✅

### 1. Sistema de Confirmación de Órdenes (`/confirmations`)
- Pedidos a Origen: Confirmar/Rechazar pedidos al proveedor
- Distribuciones: Confirmar/Rechazar envíos a clientes finales
- Bulk actions para confirmar múltiples órdenes

### 2. Órdenes con Múltiples Contenedores (`/orders/new`)
- Una orden puede tener múltiples contenedores
- Cada contenedor con: número, tamaño, tipo, sello, peso
- Cada contenedor con múltiples productos (SKU, nombre, cantidad)
- **Extracción AI de documentos** (BL, Packing List, Factura)

### 3. Chatbot Inteligente con Datos en Tiempo Real
El chatbot ahora puede:
- **Consultar datos reales** del inventario, órdenes, contenedores
- **Generar gráficos** (barras, pie charts) dinámicamente
- **Crear reportes** con tablas de datos específicos
- Responder sobre clientes finales (Walmart, Costco, etc.)
- Mostrar productos críticos, rutas de tránsito, acciones pendientes

**Consultas disponibles:**
- "Dame un reporte del inventario" → Tabla con todos los productos
- "Gráfico del inventario por marca" → Gráfico de barras
- "Gráfico del estado del inventario" → Pie chart
- "Resumen de clientes finales" → Tabla con Walmart, Costco, etc.
- "Reporte de Walmart" → Detalle específico de un cliente
- "Productos críticos" → Lista de productos en estado crítico
- "Pedidos pendientes" → Órdenes pendientes de confirmar
- "Rutas de tránsito" → Tiempos y costos de cada ruta

### 4. Planificación de Cadena de Suministro
- Visibilidad completa: ORIGEN → CEDIS → CLIENTE FINAL
- Predicciones de cuándo pedir a origen
- Lead times de rutas marítimas/intermodales
- Tiempos de distribución por región

### 5. Inventario de Clientes Finales
- Walmart, Costco, HEB, Soriana, La Comer, Chedraui
- Stock por tienda, velocidad de venta, alertas de desabasto

## API Endpoints

### AI Chatbot (con datos reales)
- `POST /api/ai/chat` - Chatbot con acceso a datos del sistema
  - Detecta intención del usuario
  - Ejecuta queries apropiadas
  - Retorna texto + datos estructurados (tablas/gráficos)
- `POST /api/ai/extract-document` - Extraer info de BL/facturas

### Orders & Confirmations
- `GET /api/orders/pending-origin` - Pedidos pendientes
- `POST /api/orders/pending-origin/{id}/confirm` - Confirmar
- `GET /api/orders/pending-distribution` - Distribuciones pendientes
- `POST /api/orders/create-with-containers` - Crear orden completa

### Supply Chain
- `GET /api/planning/supply-chain` - Plan integrado
- `GET /api/inventory/end-clients/{name}` - Inventario por cliente

## Frontend Pages
- `/dashboard` - Dashboard con KPIs
- `/confirmations` - Confirmación de órdenes
- `/orders` - Lista de órdenes
- `/orders/new` - Nueva orden con AI
- `/containers` - Lista de contenedores
- `/map` - Mapa de tracking
- `/inventory` - Cadena de suministro
- `/planning` - Planeación
- `/additionals` - Adicionales
- `/account` - Estado de cuenta

## Technical Notes
- **DATOS MOCK**: Generados en Python con random
- **AI**: Claude vía Emergent Integrations (EMERGENT_LLM_KEY)
- Chatbot tiene contexto de datos del sistema en cada request

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- Sistema de confirmación de órdenes
- Órdenes con múltiples contenedores
- Extracción AI de documentos
- **Chatbot con datos reales, gráficos y reportes**

### P1 (High Priority) - Pendiente
- Integración real con ERP vía API
- Google Maps para tracking real
- Persistencia de datos en MongoDB

### P2 (Medium Priority)
- Notificaciones push
- Exportación PDF
- Multi-idioma
