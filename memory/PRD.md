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

## 7. Portal de Operaciones (`/ops/*`) - NUEVO ✅ (Feb 2026)
Portal separado para ejecutivos de operaciones con:

### Login Separado (`/ops/login`)
- Credenciales: operaciones / ops123
- Tipos de usuario diferenciados

### Dashboard de Rentabilidad (`/ops/dashboard`)
- **KPIs**: Ingresos totales, Costos totales, Utilidad, Margen %
- **Gráfico de Tendencia Mensual**: Ingresos, Costos y Utilidad por mes
- **Rentabilidad por Cliente**: Gráfico de barras horizontal
- **Top 5 Más/Menos Rentables**: Contenedores con mejor y peor margen
- **Tabla de Rentabilidad por Ruta**: Con totales y márgenes

### Vista de Contenedores (`/ops/containers`)
- Tabla con todos los contenedores y su rentabilidad
- Filtro por número de contenedor o cliente
- **Modal de Detalle de Rentabilidad**:
  - Resumen: Ingresos, Costos, Utilidad, Margen %
  - Info: Cliente, Origen, Destino, Estado
  - **Desglose de Costos**: Flete marítimo/ferroviario, maniobras, arrastre, aduanales, estadías, demoras
  - **Desglose de Ingresos**: Flete cobrado, servicios adicionales

### Módulo de Pricing (`/ops/pricing`) - ACTUALIZADO ✅ (Feb 19, 2026)

#### **Tarifas Reales de Transmodal Implementadas**
Se reemplazaron los datos mock con las **42 tarifas reales** de Transmodal:

**Veracruz:**
- FFCC Importación (20'/40'): Sin retorno, con retorno, IMO
- FFCC Exportación (20'/40')
- VEREX (FFCC + Inspección): Ferrovalle, TILH
- SPF (Camión RT): Sencillo, Full

**Manzanillo:**
- FFCC Importación (20'/40'): Sin retorno, con retorno, IMO
- FFCC Exportación (20'/40')
- SPF (Camión RT): Sencillo, Full

**Lázaro Cárdenas:**
- FFCC Importación (20'/40'): Sin retorno, con retorno
- FFCC Exportación (20'/40')
- SPF (Camión RT): Sencillo, Full

**Rutas Nacionales:**
- FFCC Nacional: Mexicali ↔ CDMX, Cd. Obregón ↔ CDMX
- Distribución: Guadalajara ↔ México, Monterrey ↔ México, Veracruz → México

**Mejoras en UI:**
- Etiquetas **+Retorno** (verde) e **IMO** (naranja) para distinguir tipos
- Notas descriptivas debajo de cada ruta
- Filas IMO con fondo naranja suave
- Moneda en **MXN** (Pesos Mexicanos)

### Módulo de Tarifas Pre-aprobadas (`/ops/pricing` > Tab "Tarifas Pre-aprobadas")
- **Crear paquetes de tarifas** para que el equipo comercial cotice en 1 click
- Flujo:
  1. Seleccionar ruta del pricing
  2. Definir costos (base + adicionales)
  3. Seleccionar margen (30%, 25%, 20%, 15%)
  4. Auto-generar servicios de venta o agregar manualmente
  5. Guardar tarifa pre-aprobada
- **Resumen en tiempo real**: Total costo, precio venta, utilidad, margen real

### Módulo de Cotizaciones (`/ops/quotes`)
- **Lista de cotizaciones**: Número, Cliente, Estado, Total, Margen, Válida hasta
- **Nueva Cotización**:
  - Datos del cliente (nombre, email, teléfono, cliente nuevo)
  - **Selector de Rutas**: Modal con todas las rutas disponibles
  - **Selector de Servicios**: Modal con servicios adicionales
  - Cantidades y precios editables
  - Cálculo automático: Subtotal, IVA 16%, Total, Margen
  - Notas adicionales
- **Exportación a PDF** (via print)

## API Endpoints - Portal de Operaciones (NUEVO)

### Autenticación
- `POST /api/ops/auth/login` - Login para operaciones

### Dashboard
- `GET /api/ops/dashboard/profitability` - Dashboard de rentabilidad

### Contenedores
- `GET /api/ops/containers` - Lista de contenedores con rentabilidad
- `GET /api/ops/containers/{id}/profitability` - Detalle de rentabilidad

### Pricing
- `GET /api/ops/pricing/routes` - Rutas con precios (filtrable)
- `GET /api/ops/pricing/services` - Servicios adicionales
- `GET /api/ops/pricing/origins` - Orígenes disponibles
- `GET /api/ops/pricing/destinations` - Destinos disponibles
- `GET /api/ops/pricing/tariffs` - Tarifas pre-aprobadas
- `POST /api/ops/pricing/tariffs` - Crear tarifa pre-aprobada

### Cotizaciones
- `POST /api/ops/quotes` - Crear cotización
- `GET /api/ops/quotes` - Lista de cotizaciones
- `GET /api/ops/quotes/{id}` - Detalle de cotización
- `PUT /api/ops/quotes/{id}/status` - Actualizar estado

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- Sistema de confirmación de órdenes
- Órdenes con múltiples contenedores
- Extracción AI de documentos
- Chatbot con datos reales, gráficos y reportes
- **Gestión de Patio con optimización de movimientos**
- **Tarifas reales de Transmodal implementadas** ✅

### P1 (High Priority) - Pendiente
- Validar formulario de creación de órdenes (Orders.jsx reescrito pero sin probar)
- Completar extracción AI de documentos en CreateOrder.jsx (frontend incompleto)
- Fix bug de navegación del Sidebar (issue recurrente)
- Probar renderizado de gráficos en Chatbot
- Exportación de cotizaciones a PDF
- Integración con ERP (requiere acceso al repo privado de GitHub)

### P2 (Medium Priority)
- Integración real con ERP vía API
- Google Maps para tracking real
- Persistencia de datos en MongoDB
- Notificaciones push
- Multi-idioma
