# Transmodal Client Portal - PRD

## Problem Statement
Aplicación web para clientes de Transmodal para gestión de cadena de suministro:
- **Objetivo Principal**: Garantizar que el cliente final NUNCA se quede sin producto
- Flujo: ORIGEN → INBOUND → CEDIS (Almacén) → DISTRIBUCIÓN → CLIENTE FINAL
- Sistema de confirmación de órdenes (no alertas)
- Órdenes con múltiples contenedores, cada contenedor con múltiples productos
- Extracción automática de información de documentos con AI
- **Chatbot inteligente con acceso a datos en tiempo real, gráficos y reportes**
- **Gestión de Patio con optimización de movimientos**

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

### 6. Gestión de Patio (`/yard`) - NUEVO ✅ (Feb 2026)
- **Layout Visual**: Grid del patio con celdas de colores (verde <60%, amarillo 60-80%, rojo >80%)
- **KPIs**: Total contenedores, llenos, vacíos, % utilización
- **Búsqueda**: Localizar contenedores por número
- **Algoritmo de Optimización**: Calcula plan de recuperación minimizando movimientos
  - Considera fechas de salida de contenedores encima
  - Muestra secuencia de movimientos paso a paso
  - Estima tiempo total de operación
- **Salidas Programadas**: Vista de contenedores con salida hoy y esta semana
- **Estadísticas**: Por cliente y por tamaño de contenedor

## API Endpoints

### AI Chatbot (con datos reales)
- `POST /api/ai/chat` - Chatbot con acceso a datos del sistema
- `POST /api/ai/extract-document` - Extraer info de BL/facturas

### Orders & Confirmations
- `GET /api/orders/pending-origin` - Pedidos pendientes
- `POST /api/orders/pending-origin/{id}/confirm` - Confirmar
- `GET /api/orders/pending-distribution` - Distribuciones pendientes
- `POST /api/orders/create-with-containers` - Crear orden completa

### Supply Chain
- `GET /api/planning/supply-chain` - Plan integrado
- `GET /api/inventory/end-clients/{name}` - Inventario por cliente

### Yard Management (NUEVO)
- `GET /api/yard/layout` - Layout completo del patio
- `GET /api/yard/stats` - Estadísticas (por cliente, tamaño, salidas)
- `GET /api/yard/search/{container_number}` - Buscar contenedor
- `POST /api/yard/optimize-retrieval/{container_number}` - Plan óptimo de recuperación
- `GET /api/yard/containers/by-departure` - Ordenados por fecha de salida
- `POST /api/yard/reset` - Regenerar datos mock

## Frontend Pages
- `/dashboard` - Dashboard con KPIs
- `/confirmations` - Confirmación de órdenes
- `/orders` - Lista de órdenes
- `/orders/new` - Nueva orden con AI
- `/containers` - Lista de contenedores
- `/map` - Mapa de tracking
- `/inventory` - Cadena de suministro
- `/planning` - Planeación
- `/yard` - **Gestión de Patio** (NUEVO)
- `/additionals` - Adicionales
- `/account` - Estado de cuenta

## Technical Notes
- **DATOS MOCK**: Generados en Python con random
- **AI**: Claude vía Emergent Integrations (EMERGENT_LLM_KEY)
- Chatbot tiene contexto de datos del sistema en cada request
- Yard data usa cache global (_yard_cache) que se regenera con reset

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- Sistema de confirmación de órdenes
- Órdenes con múltiples contenedores
- Extracción AI de documentos
- Chatbot con datos reales, gráficos y reportes
- **Gestión de Patio con optimización de movimientos**

### P1 (High Priority) - Pendiente
- Validar formulario de creación de órdenes (Orders.jsx reescrito pero sin probar)
- Completar extracción AI de documentos en CreateOrder.jsx (frontend incompleto)
- Fix bug de navegación del Sidebar (issue recurrente)
- Probar renderizado de gráficos en Chatbot

### P2 (Medium Priority)
- Integración real con ERP vía API
- Google Maps para tracking real
- Persistencia de datos en MongoDB
- Notificaciones push
- Exportación PDF
- Multi-idioma
