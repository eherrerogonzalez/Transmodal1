from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import base64
import random
import json
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Transmodal Client Portal API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class UserInfo(BaseModel):
    id: str
    username: str
    company: str
    email: str

class DashboardData(BaseModel):
    total_containers: int
    containers_in_transit: int
    containers_delivered: int
    total_spent: float
    spent_this_month: float
    total_emissions: float
    emissions_this_month: float
    monthly_data: List[dict]

class TrackingEvent(BaseModel):
    event_name: str
    event_key: str
    scheduled_date: Optional[str] = None
    actual_date: Optional[str] = None
    status: str  # "completed", "in_progress", "pending", "na"
    location: Optional[str] = None
    notes: Optional[str] = None

class ContainerTracking(BaseModel):
    container_id: str
    transport_mode: str  # "maritime", "intermodal_train", "truck"
    events: List[TrackingEvent]

class ContainerLocation(BaseModel):
    container_id: str
    latitude: float
    longitude: float
    status: str
    origin: str
    destination: str
    vessel_name: Optional[str] = None
    eta: Optional[str] = None

class ContainerAdditional(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    reason_code: str
    reason_description: str
    amount: float
    status: str  # "pending", "approved", "rejected"
    requested_at: str
    approved_at: Optional[str] = None

# ==================== PLANNING MODELS ====================

class WarehouseConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    doors: int  # Number of loading docks/doors
    max_containers_per_day: int
    operating_hours: str = "08:00-18:00"
    working_days: List[str] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

class HistoricalData(BaseModel):
    year: int
    month: str
    containers: int
    logistics_cost: float
    extra_costs: float
    avg_cost_per_container: float

class ForecastData(BaseModel):
    month: str
    month_num: int
    forecasted_containers: int
    forecasted_logistics_cost: float
    forecasted_extra_costs: float
    confidence_level: float

class DeliverySlot(BaseModel):
    date: str
    day_name: str
    scheduled_containers: int
    max_capacity: int
    utilization_percent: float
    containers: List[dict]

class PlanningForecast(BaseModel):
    year: int
    historical_summary: dict
    annual_forecast: dict
    monthly_forecast: List[ForecastData]
    delivery_calendar: List[DeliverySlot]
    budget_comparison: dict

# ==================== INVENTORY & PRODUCTS MODELS ====================

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    name: str
    brand: str
    category: str
    unit: str = "cajas"
    units_per_container: int

class InventoryItem(BaseModel):
    product_id: str
    sku: str
    name: str
    brand: str
    current_stock: int
    minimum_stock: int
    maximum_stock: int
    reorder_point: int
    stock_status: str  # "critical", "low", "optimal", "excess"
    days_of_stock: float
    units_needed: int
    priority_score: float  # Higher = more urgent

class ContainerProduct(BaseModel):
    container_id: str
    container_number: str
    product_id: str
    sku: str
    product_name: str
    brand: str
    quantity: int
    eta: str
    status: str
    priority_score: float
    delivery_urgency: str  # "critical", "high", "medium", "low"

class StockReplanishment(BaseModel):
    product_id: str
    sku: str
    product_name: str
    brand: str
    current_stock: int
    minimum_stock: int
    units_needed: int
    containers_in_transit: int
    units_in_transit: int
    expected_stock_after_delivery: int
    priority_score: float
    status: str

# ==================== WAREHOUSE POSITIONS & APPOINTMENTS ====================

class WarehousePosition(BaseModel):
    position_id: str
    zone: str  # A, B, C, D, E
    aisle: str  # 01-20
    rack: str  # 01-10
    level: str  # 1-5
    full_code: str  # Z-AA-RR-L (e.g., A-05-03-2)
    capacity: int
    current_units: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    nearest_door: int

class ProductPositions(BaseModel):
    sku: str
    product_name: str
    brand: str
    total_units: int
    positions: List[WarehousePosition]
    recommended_door: int
    zone_distribution: dict

class DeliveryAppointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_number: str
    product_sku: str
    product_name: str
    brand: str
    quantity: int
    scheduled_date: str
    scheduled_time: str
    assigned_door: int
    operator_name: str
    operator_license: str
    insurance_policy: str
    truck_plates: str
    status: str  # "scheduled", "in_progress", "completed", "cancelled"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    notes: Optional[str] = None

class NewProductRequest(BaseModel):
    sku: str
    name: str
    brand: str
    category: str
    units_per_container: int
    minimum_stock: int
    maximum_stock: int
    zone_preference: str  # Preferred warehouse zone

# ==================== TRANSIT TIME & RESTOCK PLANNING MODELS ====================

class TransitRoute(BaseModel):
    route_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    origin: str
    destination: str
    transport_mode: str  # maritime, intermodal_train, truck
    transit_days: int
    port_handling_days: int = 2
    customs_days: int = 3
    inland_transport_days: int = 1
    total_lead_time_days: int
    cost_per_container: float
    
class RestockPrediction(BaseModel):
    product_id: str
    sku: str
    product_name: str
    brand: str
    current_stock: int
    minimum_stock: int
    daily_consumption_rate: float
    days_until_stockout: float
    reorder_point_date: str  # When to place order at origin
    expected_delivery_date: str  # When container arrives at CEDIS
    transit_time_days: int
    recommended_quantity: int
    urgency_level: str  # "immediate", "soon", "scheduled", "ok"
    suggested_origin: str
    route_details: dict

# ==================== CLIENT INVENTORY (WALMART, ETC.) MODELS ====================

class EndClientLocation(BaseModel):
    location_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str  # e.g., "Walmart", "Costco", "HEB"
    store_code: str
    store_name: str
    city: str
    state: str
    region: str

class EndClientInventory(BaseModel):
    location_id: str
    client_name: str
    store_code: str
    store_name: str
    sku: str
    product_name: str
    brand: str
    current_stock: int
    sell_through_rate: float  # Units sold per day
    days_of_stock: float
    minimum_stock: int
    reorder_point: int
    needs_restock: bool
    estimated_stockout_date: Optional[str]
    suggested_restock_date: str
    suggested_quantity: int
    priority_score: float

class EndClientSummary(BaseModel):
    client_name: str
    total_locations: int
    products_tracked: int
    locations_needing_restock: int
    critical_stockouts: int
    total_units_to_ship: int

# ==================== SUPPLY CHAIN PLANNING MODEL ====================

class SupplyChainPlan(BaseModel):
    """Planificación integrada de cadena de suministro para evitar desabasto en cliente final"""
    sku: str
    product_name: str
    brand: str
    
    # Estado actual en toda la cadena
    cedis_current_stock: int
    cedis_minimum_stock: int
    cedis_days_of_stock: float
    
    # Demanda agregada de clientes finales
    total_end_client_demand: int  # Unidades que necesitan los clientes finales
    end_clients_needing_restock: int
    critical_end_client_locations: int
    
    # Análisis de capacidad
    can_fulfill_from_cedis: bool  # ¿CEDIS puede surtir la demanda actual?
    cedis_deficit: int  # Unidades faltantes en CEDIS para surtir demanda
    
    # Fechas críticas
    earliest_end_client_stockout: Optional[str]  # Fecha más temprana de desabasto en cliente final
    distribution_ship_by_date: Optional[str]  # Cuándo debe salir de CEDIS
    cedis_reorder_date: Optional[str]  # Cuándo pedir a origen
    expected_inbound_date: Optional[str]  # Cuándo llega el inbound a CEDIS
    
    # Tiempos
    distribution_time_days: int  # CEDIS → Cliente final
    inbound_lead_time_days: int  # Origen → CEDIS
    
    # Acciones recomendadas
    action_required: str  # "none", "distribute", "order_now", "order_soon", "emergency"
    action_description: str
    
    # Detalle de rutas
    suggested_origin: str
    route_details: dict
    
    # Prioridad
    priority_score: float  # 0-100, mayor = más urgente

class DistributionOrder(BaseModel):
    """Orden de distribución de CEDIS a cliente final"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    product_name: str
    brand: str
    client_name: str
    store_code: str
    store_name: str
    region: str
    quantity: int
    ship_by_date: str
    expected_arrival: str
    distribution_time_days: int
    priority: str  # "critical", "high", "medium", "low"
    status: str = "pending"  # "pending", "shipped", "delivered"

class Container(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_number: str
    type: str
    size: str
    status: str
    origin: str
    destination: str
    vessel_name: Optional[str] = None
    eta: Optional[str] = None
    latitude: float
    longitude: float
    order_id: Optional[str] = None
    transport_mode: str = "maritime"
    is_invoiced: bool = False
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    has_additionals: bool = False
    additionals_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrderDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    url: str
    uploaded_at: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    client_id: str
    origin: str
    destination: str
    container_type: str
    container_size: str
    cargo_description: str
    weight: float
    status: str
    documents: List[OrderDocument] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    estimated_delivery: Optional[str] = None
    total_cost: float = 0.0

class OrderCreate(BaseModel):
    origin: str
    destination: str
    container_type: str
    container_size: str
    cargo_description: str
    weight: float

# ==================== NEW: CONTAINER PRODUCTS & ORDER CONTAINERS ====================

class ContainerProductItem(BaseModel):
    """Producto dentro de un contenedor"""
    sku: str
    product_name: str
    brand: str
    quantity: int
    unit_price: Optional[float] = None

class ContainerInOrder(BaseModel):
    """Contenedor dentro de una orden (una orden puede tener múltiples contenedores)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_number: str
    size: str  # 20ft, 40ft, 40ft HC
    type: str  # dry, reefer, flat rack
    seal_number: Optional[str] = None
    weight: float = 0.0
    products: List[ContainerProductItem] = []

class OrderCreateNew(BaseModel):
    """Crear una nueva orden con múltiples contenedores"""
    origin: str
    destination: str
    bl_number: Optional[str] = None
    containers: List[ContainerInOrder] = []
    total_weight: float = 0.0
    incoterm: str = "FOB"
    notes: Optional[str] = None

# ==================== NEW: AI DOCUMENT EXTRACTION ====================

class DocumentExtractionResult(BaseModel):
    """Resultado de extracción AI de documentos"""
    bl_number: Optional[str] = None
    shipper: Optional[str] = None
    consignee: Optional[str] = None
    origin_port: Optional[str] = None
    destination_port: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_number: Optional[str] = None
    containers: List[Dict[str, Any]] = []
    total_weight: Optional[float] = None
    total_packages: Optional[int] = None
    cargo_description: Optional[str] = None
    incoterm: Optional[str] = None
    confidence_score: float = 0.0

# ==================== NEW: PENDING ORDERS (CONFIRMATIONS) ====================

class PendingOriginOrder(BaseModel):
    """Orden pendiente de confirmar para pedir a origen"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    product_name: str
    brand: str
    suggested_quantity: int
    suggested_origin: str
    route_details: Dict[str, Any]
    lead_time_days: int
    expected_arrival: str
    reason: str
    cedis_current_stock: int
    cedis_deficit: int
    critical_end_locations: int
    status: str = "pending"  # pending, confirmed, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    confirmed_at: Optional[str] = None
    confirmed_quantity: Optional[int] = None

class PendingDistributionOrder(BaseModel):
    """Orden pendiente de confirmar para distribución a cliente final"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    product_name: str
    brand: str
    client_name: str
    store_code: str
    store_name: str
    region: str
    suggested_quantity: int
    distribution_time_days: int
    ship_by_date: str
    expected_arrival: str
    days_of_stock_at_store: float
    priority: str
    status: str = "pending"  # pending, confirmed, rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    confirmed_at: Optional[str] = None
    confirmed_quantity: Optional[int] = None

# ==================== NEW: CHATBOT ====================

class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

class Additional(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_number: str
    description: str
    amount: float
    status: str
    requested_at: str
    approved_at: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    description: str
    type: str
    amount: float
    balance: float
    order_number: Optional[str] = None

class AccountStatement(BaseModel):
    client_name: str
    account_number: str
    current_balance: float
    credit_limit: float
    available_credit: float
    transactions: List[Transaction]

# ==================== MOCK DATA GENERATION ====================

MOCK_USER = {
    "id": "usr_001",
    "username": "cliente_demo",
    "company": "Importadora Global S.A.",
    "email": "demo@importadoraglobal.com"
}

MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_erp_token"

PORTS = [
    {"name": "Shanghai", "lat": 31.2304, "lng": 121.4737},
    {"name": "Rotterdam", "lat": 51.9225, "lng": 4.4792},
    {"name": "Los Angeles", "lat": 33.7361, "lng": -118.2641},
    {"name": "Singapore", "lat": 1.2644, "lng": 103.8222},
    {"name": "Hamburg", "lat": 53.5511, "lng": 9.9937},
    {"name": "Manzanillo", "lat": 19.0528, "lng": -104.3186},
    {"name": "Veracruz", "lat": 19.1738, "lng": -96.1342},
    {"name": "Lazaro Cardenas", "lat": 17.9583, "lng": -102.1864},
]

CONTAINER_STATUSES = ["En Puerto Origen", "En Tránsito", "En Aduana", "En Puerto Destino", "Entregado"]
CONTAINER_TYPES = ["Dry", "Reefer", "Open Top", "Flat Rack"]
CONTAINER_SIZES = ["20ft", "40ft", "40ft HC", "45ft HC"]
VESSELS = ["MSC Gülsün", "CMA CGM Antoine", "COSCO Shipping Universe", "Maersk Emerald", "Evergreen Ever Given"]
TRANSPORT_MODES = ["maritime", "intermodal_train", "truck"]
CEDIS_LOCATIONS = ["CEDIS Guadalajara", "CEDIS CDMX", "CEDIS Monterrey", "CEDIS Querétaro", "CEDIS Puebla"]
TERMINALS = ["Terminal APM", "Terminal ICAVE", "Terminal SSA", "Terminal Hutchison"]
INTERMODAL_TERMINALS = ["Terminal Intermodal Pantaco", "Terminal Intermodal San Luis Potosí", "Terminal Ferromex GDL"]

# ==================== PERNOD RICARD PRODUCTS ====================

PERNOD_RICARD_PRODUCTS = [
    {"sku": "ABS-750", "name": "Absolut Vodka 750ml", "brand": "Absolut", "category": "Vodka", "units_per_container": 2400},
    {"sku": "ABS-1L", "name": "Absolut Vodka 1L", "brand": "Absolut", "category": "Vodka", "units_per_container": 1800},
    {"sku": "ABS-CITRON", "name": "Absolut Citron 750ml", "brand": "Absolut", "category": "Vodka", "units_per_container": 2400},
    {"sku": "ABS-MANGO", "name": "Absolut Mango 750ml", "brand": "Absolut", "category": "Vodka", "units_per_container": 2400},
    {"sku": "WYB-750", "name": "Wyborowa Vodka 750ml", "brand": "Wyborowa", "category": "Vodka", "units_per_container": 2400},
    {"sku": "WYB-1L", "name": "Wyborowa Vodka 1L", "brand": "Wyborowa", "category": "Vodka", "units_per_container": 1800},
    {"sku": "CHV-12", "name": "Chivas Regal 12 años 750ml", "brand": "Chivas Regal", "category": "Whisky", "units_per_container": 1800},
    {"sku": "CHV-18", "name": "Chivas Regal 18 años 750ml", "brand": "Chivas Regal", "category": "Whisky", "units_per_container": 1200},
    {"sku": "CHV-EXTRA", "name": "Chivas Extra 750ml", "brand": "Chivas Regal", "category": "Whisky", "units_per_container": 1500},
    {"sku": "JC-ESP", "name": "José Cuervo Especial 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 2000},
    {"sku": "JC-TRAD-SLV", "name": "José Cuervo Tradicional Silver 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1800},
    {"sku": "JC-TRAD-REP", "name": "José Cuervo Tradicional Reposado 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1800},
    {"sku": "JC-1800-SLV", "name": "1800 Silver 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1500},
    {"sku": "JC-1800-REP", "name": "1800 Reposado 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1500},
    {"sku": "JC-1800-ANJ", "name": "1800 Añejo 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1200},
    {"sku": "BAC-SUP", "name": "Bacardí Superior 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 2400},
    {"sku": "BAC-ORO", "name": "Bacardí Oro 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 2400},
    {"sku": "BAC-LIMON", "name": "Bacardí Limón 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 2400},
    {"sku": "BAC-8", "name": "Bacardí 8 Años 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 1500},
    {"sku": "HAVANA-7", "name": "Havana Club 7 Años 750ml", "brand": "Havana Club", "category": "Ron", "units_per_container": 1500},
    {"sku": "BFTR-750", "name": "Beefeater Gin 750ml", "brand": "Beefeater", "category": "Gin", "units_per_container": 2000},
    {"sku": "BFTR-PINK", "name": "Beefeater Pink 750ml", "brand": "Beefeater", "category": "Gin", "units_per_container": 2000},
    {"sku": "JAMESON", "name": "Jameson Irish Whiskey 750ml", "brand": "Jameson", "category": "Whisky", "units_per_container": 1800},
    {"sku": "BALLANT", "name": "Ballantine's Finest 750ml", "brand": "Ballantine's", "category": "Whisky", "units_per_container": 2000},
]

def generate_cedis_inventory():
    """Generate current inventory with stock levels for CEDIS"""
    inventory = []
    
    for product in PERNOD_RICARD_PRODUCTS:
        # Random stock levels
        min_stock = random.randint(500, 2000)
        max_stock = min_stock * 4
        current_stock = random.randint(int(min_stock * 0.3), int(max_stock * 1.1))
        reorder_point = int(min_stock * 1.5)
        
        # Calculate status and priority
        stock_ratio = current_stock / min_stock if min_stock > 0 else 1
        
        if stock_ratio <= 0.5:
            status = "critical"
            priority = 100 - (stock_ratio * 100)  # Higher priority for lower stock
        elif stock_ratio <= 1.0:
            status = "low"
            priority = 70 - (stock_ratio * 30)
        elif stock_ratio <= 2.0:
            status = "optimal"
            priority = 30 - (stock_ratio * 10)
        else:
            status = "excess"
            priority = 0
        
        # Calculate days of stock (assuming avg daily sales)
        avg_daily_sales = random.randint(20, 100)
        days_of_stock = round(current_stock / avg_daily_sales, 1) if avg_daily_sales > 0 else 999
        
        # Units needed to reach reorder point
        units_needed = max(0, reorder_point - current_stock)
        
        inventory.append(InventoryItem(
            product_id=str(uuid.uuid4()),
            sku=product["sku"],
            name=product["name"],
            brand=product["brand"],
            current_stock=current_stock,
            minimum_stock=min_stock,
            maximum_stock=max_stock,
            reorder_point=reorder_point,
            stock_status=status,
            days_of_stock=days_of_stock,
            units_needed=units_needed,
            priority_score=round(max(0, priority), 1)
        ))
    
    # Sort by priority (highest first)
    inventory.sort(key=lambda x: x.priority_score, reverse=True)
    
    return inventory

def generate_containers_with_products(inventory: List[InventoryItem]):
    """Generate containers with products, prioritizing low stock items"""
    containers = []
    
    # Get products that need restocking (sorted by priority)
    products_needing_stock = [inv for inv in inventory if inv.units_needed > 0]
    products_needing_stock.sort(key=lambda x: x.priority_score, reverse=True)
    
    # Generate containers for high priority products
    for i, inv_item in enumerate(products_needing_stock[:15]):  # Top 15 priority items
        product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == inv_item.sku), None)
        if not product:
            continue
        
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p["name"] in ["Manzanillo", "Veracruz", "Lazaro Cardenas"]])
        
        # Higher priority = closer to delivery
        if inv_item.priority_score >= 70:
            status = random.choice(["En Puerto Destino", "En Aduana", "En Tránsito"])
            urgency = "critical"
        elif inv_item.priority_score >= 40:
            status = random.choice(["En Tránsito", "En Aduana"])
            urgency = "high"
        else:
            status = random.choice(["En Puerto Origen", "En Tránsito"])
            urgency = "medium"
        
        eta_days = random.randint(1, 5) if urgency == "critical" else random.randint(5, 15)
        eta = (datetime.now(timezone.utc) + timedelta(days=eta_days)).isoformat()
        
        containers.append(ContainerProduct(
            container_id=str(uuid.uuid4()),
            container_number=generate_container_number(),
            product_id=inv_item.product_id,
            sku=inv_item.sku,
            product_name=inv_item.name,
            brand=inv_item.brand,
            quantity=product["units_per_container"],
            eta=eta,
            status=status,
            priority_score=inv_item.priority_score,
            delivery_urgency=urgency
        ))
    
    # Sort by priority
    containers.sort(key=lambda x: x.priority_score, reverse=True)
    
    return containers

# ==================== WAREHOUSE ZONE CONFIGURATION ====================

WAREHOUSE_ZONES = {
    "A": {"name": "Zona A - Vodkas", "door_range": [1, 2], "categories": ["Vodka"]},
    "B": {"name": "Zona B - Whiskies", "door_range": [2, 3], "categories": ["Whisky"]},
    "C": {"name": "Zona C - Tequilas", "door_range": [4, 5], "categories": ["Tequila"]},
    "D": {"name": "Zona D - Rones", "door_range": [5, 6], "categories": ["Ron"]},
    "E": {"name": "Zona E - Ginebras y Otros", "door_range": [7, 8], "categories": ["Gin", "Otros"]},
}

# ==================== TRANSIT ROUTES CONFIGURATION ====================

TRANSIT_ROUTES = [
    {"origin": "Shanghai", "destination": "Manzanillo", "mode": "maritime", "transit_days": 25, "port_days": 3, "customs_days": 4, "inland_days": 2, "cost": 4500},
    {"origin": "Rotterdam", "destination": "Veracruz", "mode": "maritime", "transit_days": 18, "port_days": 2, "customs_days": 3, "inland_days": 2, "cost": 3800},
    {"origin": "Hamburg", "destination": "Veracruz", "mode": "maritime", "transit_days": 20, "port_days": 2, "customs_days": 3, "inland_days": 2, "cost": 4000},
    {"origin": "Los Angeles", "destination": "CDMX", "mode": "intermodal_train", "transit_days": 8, "port_days": 1, "customs_days": 2, "inland_days": 3, "cost": 2800},
    {"origin": "Singapore", "destination": "Lazaro Cardenas", "mode": "maritime", "transit_days": 28, "port_days": 3, "customs_days": 4, "inland_days": 2, "cost": 4800},
    {"origin": "Miami", "destination": "Veracruz", "mode": "maritime", "transit_days": 5, "port_days": 1, "customs_days": 2, "inland_days": 1, "cost": 2200},
]

def get_transit_route(origin: str = None):
    """Get transit route info - random if no origin specified"""
    if origin:
        route = next((r for r in TRANSIT_ROUTES if r["origin"] == origin), None)
        if route:
            total_lead_time = route["transit_days"] + route["port_days"] + route["customs_days"] + route["inland_days"]
            return {**route, "total_lead_time": total_lead_time}
    route = random.choice(TRANSIT_ROUTES)
    total_lead_time = route["transit_days"] + route["port_days"] + route["customs_days"] + route["inland_days"]
    return {**route, "total_lead_time": total_lead_time}

# ==================== END CLIENT (WALMART, COSTCO, ETC.) CONFIGURATION ====================

END_CLIENTS = [
    {"name": "Walmart", "code_prefix": "WMT", "regions": ["Norte", "Centro", "Sur", "Occidente"], "stores_per_region": 8},
    {"name": "Costco", "code_prefix": "CST", "regions": ["Norte", "Centro", "Occidente"], "stores_per_region": 4},
    {"name": "HEB", "code_prefix": "HEB", "regions": ["Norte", "Noreste"], "stores_per_region": 6},
    {"name": "Soriana", "code_prefix": "SOR", "regions": ["Norte", "Centro", "Sur"], "stores_per_region": 5},
    {"name": "La Comer", "code_prefix": "LCM", "regions": ["Centro"], "stores_per_region": 4},
    {"name": "Chedraui", "code_prefix": "CHD", "regions": ["Sur", "Centro", "Golfo"], "stores_per_region": 5},
]

END_CLIENT_CITIES = {
    "Norte": ["Monterrey", "Saltillo", "Torreón", "Chihuahua"],
    "Noreste": ["Monterrey", "Reynosa", "Matamoros", "Nuevo Laredo"],
    "Centro": ["CDMX", "Toluca", "Querétaro", "Puebla"],
    "Sur": ["Oaxaca", "Tuxtla", "Mérida", "Villahermosa"],
    "Occidente": ["Guadalajara", "León", "Aguascalientes", "Morelia"],
    "Golfo": ["Veracruz", "Coatzacoalcos", "Tampico", "Xalapa"],
}

# Tiempos de distribución desde CEDIS a cada región (en días)
DISTRIBUTION_TIMES = {
    "Norte": 2,      # CEDIS → Monterrey, etc.
    "Noreste": 2,
    "Centro": 1,     # CEDIS está en centro
    "Sur": 3,
    "Occidente": 1,
    "Golfo": 2,
}

def get_distribution_time(region: str) -> int:
    """Get distribution time from CEDIS to a region"""
    return DISTRIBUTION_TIMES.get(region, 2)

def generate_end_client_inventory(client_name: str = None):
    """Generate inventory data for end clients (retailers)"""
    inventory_data = []
    
    clients_to_process = END_CLIENTS if not client_name else [c for c in END_CLIENTS if c["name"] == client_name]
    
    for client in clients_to_process:
        location_counter = 1
        for region in client["regions"]:
            cities = END_CLIENT_CITIES.get(region, ["Ciudad"])
            for _ in range(client["stores_per_region"]):
                city = random.choice(cities)
                store_code = f"{client['code_prefix']}-{location_counter:03d}"
                store_name = f"{client['name']} {city} {location_counter}"
                
                # Generate inventory for selected products at this location
                products_at_store = random.sample(PERNOD_RICARD_PRODUCTS, min(8, len(PERNOD_RICARD_PRODUCTS)))
                
                for product in products_at_store:
                    # Simulate different stock levels at retail
                    min_stock = random.randint(20, 100)
                    current_stock = random.randint(0, int(min_stock * 2.5))
                    sell_through = round(random.uniform(2, 15), 1)  # Units per day
                    days_of_stock = round(current_stock / sell_through, 1) if sell_through > 0 else 999
                    reorder_point = int(min_stock * 1.2)
                    
                    needs_restock = current_stock < reorder_point
                    
                    # Calculate estimated stockout and restock dates
                    stockout_date = None
                    if days_of_stock < 999 and current_stock > 0:
                        stockout_date = (datetime.now(timezone.utc) + timedelta(days=days_of_stock)).strftime("%Y-%m-%d")
                    
                    # Suggested restock: 3 days before stockout or now if critical
                    restock_buffer = max(0, days_of_stock - 3)
                    suggested_restock = (datetime.now(timezone.utc) + timedelta(days=restock_buffer)).strftime("%Y-%m-%d")
                    
                    # Priority score based on days of stock
                    if days_of_stock <= 3:
                        priority = 100
                    elif days_of_stock <= 7:
                        priority = 80
                    elif days_of_stock <= 14:
                        priority = 50
                    else:
                        priority = 20
                    
                    suggested_qty = max(0, reorder_point - current_stock + int(sell_through * 14))  # 2 weeks supply
                    
                    inventory_data.append(EndClientInventory(
                        location_id=str(uuid.uuid4()),
                        client_name=client["name"],
                        store_code=store_code,
                        store_name=store_name,
                        sku=product["sku"],
                        product_name=product["name"],
                        brand=product.get("brand", "Sin marca"),
                        current_stock=current_stock,
                        sell_through_rate=sell_through,
                        days_of_stock=days_of_stock,
                        minimum_stock=min_stock,
                        reorder_point=reorder_point,
                        needs_restock=needs_restock,
                        estimated_stockout_date=stockout_date,
                        suggested_restock_date=suggested_restock,
                        suggested_quantity=suggested_qty,
                        priority_score=priority
                    ))
                
                location_counter += 1
    
    return inventory_data

def generate_restock_predictions(inventory: List[InventoryItem]):
    """Generate predictions for when to order from origin based on transit time"""
    predictions = []
    
    for item in inventory:
        # Calculate daily consumption based on days_of_stock and current_stock
        daily_consumption = item.current_stock / item.days_of_stock if item.days_of_stock > 0 and item.days_of_stock < 999 else 50
        
        # Get route info for this product
        route = get_transit_route()
        lead_time = route["total_lead_time"]
        
        # Calculate when stock hits minimum
        days_until_min = (item.current_stock - item.minimum_stock) / daily_consumption if daily_consumption > 0 else 999
        
        # Reorder point: must order lead_time days before hitting minimum
        days_until_reorder = max(0, days_until_min - lead_time)
        
        # Determine urgency
        if days_until_reorder <= 0:
            urgency = "immediate"
        elif days_until_reorder <= 7:
            urgency = "soon"
        elif days_until_reorder <= 14:
            urgency = "scheduled"
        else:
            urgency = "ok"
        
        reorder_date = datetime.now(timezone.utc) + timedelta(days=days_until_reorder)
        delivery_date = reorder_date + timedelta(days=lead_time)
        
        product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == item.sku), None)
        recommended_qty = product["units_per_container"] if product else 1500
        
        predictions.append(RestockPrediction(
            product_id=item.product_id,
            sku=item.sku,
            product_name=item.name,
            brand=item.brand,
            current_stock=item.current_stock,
            minimum_stock=item.minimum_stock,
            daily_consumption_rate=round(daily_consumption, 1),
            days_until_stockout=round(days_until_min, 1),
            reorder_point_date=reorder_date.strftime("%Y-%m-%d"),
            expected_delivery_date=delivery_date.strftime("%Y-%m-%d"),
            transit_time_days=lead_time,
            recommended_quantity=recommended_qty,
            urgency_level=urgency,
            suggested_origin=route["origin"],
            route_details={
                "origin": route["origin"],
                "destination": route["destination"],
                "transport_mode": route["mode"],
                "transit_days": route["transit_days"],
                "port_handling_days": route["port_days"],
                "customs_days": route["customs_days"],
                "inland_transport_days": route["inland_days"],
                "total_lead_time": lead_time,
                "estimated_cost": route["cost"]
            }
        ))
    
    # Sort by urgency and days until reorder
    urgency_order = {"immediate": 0, "soon": 1, "scheduled": 2, "ok": 3}
    predictions.sort(key=lambda x: (urgency_order.get(x.urgency_level, 4), x.days_until_stockout))
    
    return predictions

def generate_supply_chain_plan():
    """
    Genera planificación integrada de cadena de suministro:
    ORIGEN → INBOUND → CEDIS → DISTRIBUCIÓN → CLIENTE FINAL
    
    El objetivo es que el cliente final NUNCA se quede sin producto.
    """
    plans = []
    
    # Obtener inventario de CEDIS
    cedis_inventory = generate_cedis_inventory()
    cedis_by_sku = {item.sku: item for item in cedis_inventory}
    
    # Obtener demanda de todos los clientes finales
    all_end_client_inventory = generate_end_client_inventory()
    
    # Agrupar demanda por SKU
    demand_by_sku = {}
    for item in all_end_client_inventory:
        if item.sku not in demand_by_sku:
            demand_by_sku[item.sku] = {
                "total_demand": 0,
                "locations_needing": 0,
                "critical_locations": 0,
                "earliest_stockout": None,
                "items": []
            }
        
        if item.needs_restock:
            demand_by_sku[item.sku]["total_demand"] += item.suggested_quantity
            demand_by_sku[item.sku]["locations_needing"] += 1
            
            if item.days_of_stock <= 3:
                demand_by_sku[item.sku]["critical_locations"] += 1
            
            # Track earliest stockout
            if item.estimated_stockout_date:
                current_earliest = demand_by_sku[item.sku]["earliest_stockout"]
                if not current_earliest or item.estimated_stockout_date < current_earliest:
                    demand_by_sku[item.sku]["earliest_stockout"] = item.estimated_stockout_date
            
            demand_by_sku[item.sku]["items"].append(item)
    
    # Generar plan para cada SKU
    for product in PERNOD_RICARD_PRODUCTS:
        sku = product["sku"]
        cedis_item = cedis_by_sku.get(sku)
        demand_info = demand_by_sku.get(sku, {"total_demand": 0, "locations_needing": 0, "critical_locations": 0, "earliest_stockout": None, "items": []})
        
        if not cedis_item:
            continue
        
        # Calcular si CEDIS puede surtir la demanda
        total_demand = demand_info["total_demand"]
        can_fulfill = cedis_item.current_stock >= total_demand
        deficit = max(0, total_demand - cedis_item.current_stock)
        
        # Obtener ruta de tránsito
        route = get_transit_route()
        inbound_lead_time = route["total_lead_time"]
        
        # Calcular tiempo de distribución promedio
        avg_distribution_time = 2  # días promedio CEDIS → cliente final
        
        # Fechas críticas
        earliest_stockout = demand_info["earliest_stockout"]
        today = datetime.now(timezone.utc).date()
        
        # Cuándo debe salir de CEDIS para evitar desabasto
        ship_by_date = None
        if earliest_stockout:
            stockout_date = datetime.strptime(earliest_stockout, "%Y-%m-%d").date()
            ship_by = stockout_date - timedelta(days=avg_distribution_time)
            ship_by_date = ship_by.strftime("%Y-%m-%d")
        
        # Cuándo pedir a origen
        cedis_reorder_date = None
        expected_inbound = None
        if not can_fulfill or cedis_item.stock_status in ["critical", "low"]:
            # Necesita inbound - calcular fecha de pedido
            if ship_by_date:
                ship_by = datetime.strptime(ship_by_date, "%Y-%m-%d").date()
                reorder_date = ship_by - timedelta(days=inbound_lead_time)
                cedis_reorder_date = max(today, reorder_date).strftime("%Y-%m-%d")
                expected_inbound = (datetime.strptime(cedis_reorder_date, "%Y-%m-%d").date() + timedelta(days=inbound_lead_time)).strftime("%Y-%m-%d")
            else:
                # No hay stockout inmediato, pero CEDIS está bajo
                days_until_cedis_min = (cedis_item.current_stock - cedis_item.minimum_stock) / (cedis_item.current_stock / cedis_item.days_of_stock) if cedis_item.days_of_stock > 0 else 30
                reorder_date = today + timedelta(days=max(0, days_until_cedis_min - inbound_lead_time))
                cedis_reorder_date = reorder_date.strftime("%Y-%m-%d")
                expected_inbound = (reorder_date + timedelta(days=inbound_lead_time)).strftime("%Y-%m-%d")
        
        # Determinar acción requerida
        if demand_info["critical_locations"] > 0 and not can_fulfill:
            action = "emergency"
            action_desc = f"🚨 EMERGENCIA: {demand_info['critical_locations']} ubicaciones críticas y CEDIS no puede surtir. Pedir a origen INMEDIATAMENTE."
            priority = 100
        elif demand_info["critical_locations"] > 0:
            action = "distribute"
            action_desc = f"⚠️ DISTRIBUIR YA: {demand_info['critical_locations']} ubicaciones en estado crítico. Stock en CEDIS suficiente."
            priority = 90
        elif not can_fulfill and demand_info["locations_needing"] > 0:
            action = "order_now"
            action_desc = f"📦 PEDIR A ORIGEN: Déficit de {deficit:,} unidades para surtir {demand_info['locations_needing']} ubicaciones."
            priority = 80
        elif cedis_item.stock_status == "critical":
            action = "order_now"
            action_desc = f"📦 PEDIR A ORIGEN: Stock CEDIS crítico ({cedis_item.days_of_stock:.1f} días)."
            priority = 75
        elif cedis_item.stock_status == "low" or demand_info["locations_needing"] > 5:
            action = "order_soon"
            action_desc = f"📋 PROGRAMAR PEDIDO: Stock bajo en CEDIS o múltiples ubicaciones necesitan restock."
            priority = 50
        elif demand_info["locations_needing"] > 0:
            action = "distribute"
            action_desc = f"🚚 PLANIFICAR DISTRIBUCIÓN: {demand_info['locations_needing']} ubicaciones necesitan resurtido."
            priority = 40
        else:
            action = "none"
            action_desc = "✅ Cadena de suministro saludable. No se requiere acción inmediata."
            priority = 10
        
        plans.append(SupplyChainPlan(
            sku=sku,
            product_name=product["name"],
            brand=product.get("brand", "Sin marca"),
            cedis_current_stock=cedis_item.current_stock,
            cedis_minimum_stock=cedis_item.minimum_stock,
            cedis_days_of_stock=cedis_item.days_of_stock,
            total_end_client_demand=total_demand,
            end_clients_needing_restock=demand_info["locations_needing"],
            critical_end_client_locations=demand_info["critical_locations"],
            can_fulfill_from_cedis=can_fulfill,
            cedis_deficit=deficit,
            earliest_end_client_stockout=earliest_stockout,
            distribution_ship_by_date=ship_by_date,
            cedis_reorder_date=cedis_reorder_date,
            expected_inbound_date=expected_inbound,
            distribution_time_days=avg_distribution_time,
            inbound_lead_time_days=inbound_lead_time,
            action_required=action,
            action_description=action_desc,
            suggested_origin=route["origin"],
            route_details={
                "origin": route["origin"],
                "destination": route["destination"],
                "transport_mode": route["mode"],
                "transit_days": route["transit_days"],
                "total_lead_time": inbound_lead_time,
                "cost": route["cost"]
            },
            priority_score=priority
        ))
    
    # Ordenar por prioridad
    plans.sort(key=lambda x: x.priority_score, reverse=True)
    return plans

def generate_distribution_orders():
    """Genera órdenes de distribución pendientes desde CEDIS a clientes finales"""
    orders = []
    
    cedis_inventory = generate_cedis_inventory()
    cedis_by_sku = {item.sku: item for item in cedis_inventory}
    
    all_end_client_inventory = generate_end_client_inventory()
    
    for item in all_end_client_inventory:
        if not item.needs_restock:
            continue
        
        cedis_item = cedis_by_sku.get(item.sku)
        if not cedis_item or cedis_item.current_stock < item.suggested_quantity:
            continue  # No hay stock en CEDIS para surtir
        
        # Determinar región y tiempo de distribución
        region = "Centro"  # Default
        for client in END_CLIENTS:
            if client["name"] == item.client_name:
                for r in client["regions"]:
                    region = r
                    break
                break
        
        dist_time = get_distribution_time(region)
        
        # Calcular fechas
        ship_by = datetime.strptime(item.suggested_restock_date, "%Y-%m-%d").date()
        arrival = ship_by + timedelta(days=dist_time)
        
        # Prioridad
        if item.days_of_stock <= 3:
            priority = "critical"
        elif item.days_of_stock <= 7:
            priority = "high"
        elif item.days_of_stock <= 14:
            priority = "medium"
        else:
            priority = "low"
        
        product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == item.sku), None)
        
        orders.append(DistributionOrder(
            sku=item.sku,
            product_name=item.product_name,
            brand=item.brand,
            client_name=item.client_name,
            store_code=item.store_code,
            store_name=item.store_name,
            region=region,
            quantity=item.suggested_quantity,
            ship_by_date=ship_by.strftime("%Y-%m-%d"),
            expected_arrival=arrival.strftime("%Y-%m-%d"),
            distribution_time_days=dist_time,
            priority=priority
        ))
    
    # Ordenar por prioridad y fecha
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    orders.sort(key=lambda x: (priority_order.get(x.priority, 4), x.ship_by_date))
    
    return orders

def get_zone_for_category(category: str) -> str:
    """Get warehouse zone for a product category"""
    for zone, config in WAREHOUSE_ZONES.items():
        if category in config["categories"]:
            return zone
    return "E"  # Default zone

def get_recommended_door(zone: str) -> int:
    """Get recommended door based on zone"""
    if zone in WAREHOUSE_ZONES:
        doors = WAREHOUSE_ZONES[zone]["door_range"]
        return random.choice(doors)
    return random.randint(1, 8)

def generate_warehouse_positions(sku: str, product_name: str, category: str, total_units: int):
    """Generate warehouse positions for a product"""
    zone = get_zone_for_category(category)
    positions = []
    remaining_units = total_units
    position_capacity = random.randint(200, 500)
    
    aisle_num = 1
    rack_num = 1
    level_num = 1
    
    while remaining_units > 0:
        units_in_position = min(remaining_units, position_capacity)
        
        position = WarehousePosition(
            position_id=str(uuid.uuid4()),
            zone=zone,
            aisle=f"{aisle_num:02d}",
            rack=f"{rack_num:02d}",
            level=str(level_num),
            full_code=f"{zone}-{aisle_num:02d}-{rack_num:02d}-{level_num}",
            capacity=position_capacity,
            current_units=units_in_position,
            product_sku=sku,
            product_name=product_name,
            nearest_door=get_recommended_door(zone)
        )
        positions.append(position)
        
        remaining_units -= units_in_position
        level_num += 1
        if level_num > 5:
            level_num = 1
            rack_num += 1
        if rack_num > 10:
            rack_num = 1
            aisle_num += 1
    
    return positions, zone

# Additional types with reason codes
ADDITIONAL_TYPES = [
    {"type": "DEMORA", "code": "DEM001", "description": "Demora en puerto - día adicional"},
    {"type": "DEMORA", "code": "DEM002", "description": "Demora en terminal intermodal"},
    {"type": "DEMORA", "code": "DEM003", "description": "Demora por inspección aduanal"},
    {"type": "ALMACENAJE", "code": "ALM001", "description": "Almacenaje extendido en puerto"},
    {"type": "ALMACENAJE", "code": "ALM002", "description": "Almacenaje en terminal destino"},
    {"type": "ALMACENAJE", "code": "ALM003", "description": "Almacenaje en CEDIS"},
    {"type": "MANIOBRA", "code": "MAN001", "description": "Maniobra especial de carga"},
    {"type": "MANIOBRA", "code": "MAN002", "description": "Maniobra de descarga con grúa"},
    {"type": "MANIOBRA", "code": "MAN003", "description": "Volteo de contenedor"},
    {"type": "INSPECCION", "code": "INS001", "description": "Inspección aduanal adicional"},
    {"type": "INSPECCION", "code": "INS002", "description": "Fumigación de contenedor"},
    {"type": "INSPECCION", "code": "INS003", "description": "Revisión fitosanitaria"},
    {"type": "TRANSPORTE", "code": "TRA001", "description": "Transporte terrestre urgente"},
    {"type": "TRANSPORTE", "code": "TRA002", "description": "Cambio de ruta de entrega"},
    {"type": "TRANSPORTE", "code": "TRA003", "description": "Entrega en horario especial"},
    {"type": "SEGURO", "code": "SEG001", "description": "Seguro adicional de carga"},
    {"type": "SEGURO", "code": "SEG002", "description": "Cobertura por daños"},
    {"type": "DOCUMENTACION", "code": "DOC001", "description": "Gestión documental adicional"},
    {"type": "DOCUMENTACION", "code": "DOC002", "description": "Corrección de BL"},
]

def generate_container_additionals(container_id: str, count: int = None):
    """Generate random additionals for a container"""
    if count is None:
        count = random.randint(0, 4)
    
    if count == 0:
        return []
    
    additionals = []
    selected_types = random.sample(ADDITIONAL_TYPES, min(count, len(ADDITIONAL_TYPES)))
    
    for add_type in selected_types:
        status = random.choice(["pending", "pending", "approved", "rejected"])
        requested_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10))
        
        additionals.append(ContainerAdditional(
            type=add_type["type"],
            reason_code=add_type["code"],
            reason_description=add_type["description"],
            amount=round(random.uniform(150, 3500), 2),
            status=status,
            requested_at=requested_at.isoformat(),
            approved_at=(requested_at + timedelta(days=random.randint(1, 3))).isoformat() if status == "approved" else None
        ))
    
    return additionals

def generate_tracking_events(container_status: str, transport_mode: str):
    """Generate realistic tracking events based on container status and transport mode"""
    
    base_date = datetime.now(timezone.utc) - timedelta(days=random.randint(5, 20))
    events = []
    
    # Define all possible events
    all_events = [
        ("Atraque de Buque", "vessel_arrival"),
        ("Solicitud Agente Aduanal", "customs_request"),
        ("Salida de Terminal", "terminal_departure"),
        ("Llegada Terminal Intermodal", "intermodal_arrival"),
        ("Salida Terminal Intermodal", "intermodal_departure"),
        ("Cita Llegada CEDIS", "cedis_appointment"),
        ("Llegada a CEDIS", "cedis_arrival"),
        ("Salida de Almacén", "warehouse_departure"),
        ("Entrega de Vacío", "empty_return")
    ]
    
    # Determine which events are applicable based on transport mode
    if transport_mode == "intermodal_train":
        applicable_events = all_events
    else:
        # Skip intermodal events for direct truck/maritime
        applicable_events = [e for e in all_events if "intermodal" not in e[1]]
    
    # Determine completed events based on status
    status_progress = {
        "En Puerto Origen": 0,
        "En Tránsito": 2,
        "En Aduana": 3,
        "En Puerto Destino": 4,
        "En Terminal Intermodal": 5,
        "En Tránsito Terrestre": 6,
        "En CEDIS": 7,
        "Entregado": len(applicable_events)
    }
    
    completed_count = status_progress.get(container_status, 2)
    now = datetime.now(timezone.utc)
    
    for i, (event_name, event_key) in enumerate(applicable_events):
        # Calculate dates based on position in timeline
        scheduled_date = base_date + timedelta(days=i * random.randint(1, 3), hours=random.randint(0, 12))
        
        # Determine status based on dates and position
        if i < completed_count:
            # Past events - completed
            actual_date = scheduled_date + timedelta(hours=random.randint(-2, 6))
            if actual_date > now:
                actual_date = now - timedelta(hours=random.randint(1, 12))
            status = "completed"
            actual_date_str = actual_date.isoformat()
            scheduled_date_str = scheduled_date.isoformat()
        elif i == completed_count:
            # Current event - in progress
            status = "in_progress"
            actual_date_str = None
            # Scheduled for near future
            scheduled_date = now + timedelta(hours=random.randint(1, 48))
            scheduled_date_str = scheduled_date.isoformat()
        else:
            # Future events - pending
            status = "pending"
            actual_date_str = None
            # Scheduled for future
            scheduled_date = now + timedelta(days=i - completed_count + 1, hours=random.randint(0, 12))
            scheduled_date_str = scheduled_date.isoformat()
        
        # Add location info
        if "terminal" in event_key.lower() and "intermodal" not in event_key:
            location = random.choice(TERMINALS)
        elif "intermodal" in event_key:
            location = random.choice(INTERMODAL_TERMINALS)
        elif "cedis" in event_key.lower() or "warehouse" in event_key.lower():
            location = random.choice(CEDIS_LOCATIONS)
        else:
            location = None
        
        events.append(TrackingEvent(
            event_name=event_name,
            event_key=event_key,
            scheduled_date=scheduled_date_str,
            actual_date=actual_date_str,
            status=status,
            location=location,
            notes=f"Referencia: REF-{random.randint(10000, 99999)}" if status == "completed" else None
        ))
    
    return events

def generate_container_number():
    prefix = random.choice(["MSKU", "CSQU", "CMAU", "MSCU", "EGLV"])
    numbers = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    return f"{prefix}{numbers}"

def generate_order_number():
    return f"TM-{datetime.now().year}-{random.randint(10000, 99999)}"

# ==================== AUTH HELPERS ====================

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    # In production, this would verify against the ERP
    return MOCK_USER

# ==================== ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Transmodal Client Portal API", "version": "1.0.0"}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Simulate ERP authentication - returns mock token"""
    # In production, this would call the ERP API
    if request.username and request.password:
        return LoginResponse(
            token=MOCK_TOKEN,
            user=MOCK_USER
        )
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@api_router.get("/auth/me", response_model=UserInfo)
async def get_current_user(user: dict = Depends(verify_token)):
    """Get current user info"""
    return UserInfo(**user)

@api_router.get("/dashboard", response_model=DashboardData)
async def get_dashboard(user: dict = Depends(verify_token)):
    """Get dashboard KPIs and charts data"""
    # Generate realistic monthly data
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    monthly_data = []
    for i, month in enumerate(months[:12]):
        containers = random.randint(15, 45)
        spent = round(random.uniform(25000, 75000), 2)
        emissions = round(containers * random.uniform(2.1, 3.5), 2)
        monthly_data.append({
            "month": month,
            "containers": containers,
            "spent": spent,
            "emissions": emissions
        })
    
    return DashboardData(
        total_containers=sum(d["containers"] for d in monthly_data),
        containers_in_transit=random.randint(8, 20),
        containers_delivered=random.randint(200, 350),
        total_spent=sum(d["spent"] for d in monthly_data),
        spent_this_month=monthly_data[-1]["spent"],
        total_emissions=sum(d["emissions"] for d in monthly_data),
        emissions_this_month=monthly_data[-1]["emissions"],
        monthly_data=monthly_data
    )

@api_router.get("/containers", response_model=List[Container])
async def get_containers(user: dict = Depends(verify_token)):
    """Get all containers for the client"""
    containers = []
    for i in range(random.randint(10, 20)):
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p != origin_port])
        status = random.choice(CONTAINER_STATUSES)
        transport_mode = random.choice(TRANSPORT_MODES)
        
        # Calculate position based on status
        if status == "En Puerto Origen":
            lat, lng = origin_port["lat"], origin_port["lng"]
        elif status == "Entregado" or status == "En Puerto Destino":
            lat, lng = dest_port["lat"], dest_port["lng"]
        else:
            # In transit - random position between origin and destination
            progress = random.uniform(0.2, 0.8)
            lat = origin_port["lat"] + (dest_port["lat"] - origin_port["lat"]) * progress
            lng = origin_port["lng"] + (dest_port["lng"] - origin_port["lng"]) * progress
        
        # Determine if invoiced (delivered containers are usually invoiced)
        is_invoiced = status == "Entregado" or (status == "En Puerto Destino" and random.random() > 0.5)
        invoice_date = (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5))).isoformat() if is_invoiced else None
        
        # Determine if has additionals
        has_additionals = random.random() > 0.6
        additionals_count = random.randint(1, 4) if has_additionals else 0
        
        containers.append(Container(
            container_number=generate_container_number(),
            type=random.choice(CONTAINER_TYPES),
            size=random.choice(CONTAINER_SIZES),
            status=status,
            origin=origin_port["name"],
            destination=dest_port["name"],
            vessel_name=random.choice(VESSELS) if status == "En Tránsito" else None,
            eta=(datetime.now(timezone.utc).isoformat() if status != "Entregado" else None),
            latitude=lat,
            longitude=lng,
            transport_mode=transport_mode,
            is_invoiced=is_invoiced,
            invoice_number=f"FAC-{random.randint(100000, 999999)}" if is_invoiced else None,
            invoice_date=invoice_date,
            has_additionals=has_additionals,
            additionals_count=additionals_count
        ))
    return containers

@api_router.get("/containers/{container_id}", response_model=Container)
async def get_container(container_id: str, user: dict = Depends(verify_token)):
    """Get single container details"""
    origin_port = random.choice(PORTS)
    dest_port = random.choice([p for p in PORTS if p != origin_port])
    status = random.choice(CONTAINER_STATUSES)
    
    return Container(
        id=container_id,
        container_number=generate_container_number(),
        type=random.choice(CONTAINER_TYPES),
        size=random.choice(CONTAINER_SIZES),
        status=status,
        origin=origin_port["name"],
        destination=dest_port["name"],
        vessel_name=random.choice(VESSELS),
        eta=datetime.now(timezone.utc).isoformat(),
        latitude=origin_port["lat"],
        longitude=origin_port["lng"],
        transport_mode=random.choice(TRANSPORT_MODES)
    )

@api_router.get("/containers/{container_id}/tracking", response_model=ContainerTracking)
async def get_container_tracking(container_id: str, user: dict = Depends(verify_token)):
    """Get detailed tracking timeline for a container"""
    status = random.choice(CONTAINER_STATUSES)
    transport_mode = random.choice(TRANSPORT_MODES)
    
    events = generate_tracking_events(status, transport_mode)
    
    return ContainerTracking(
        container_id=container_id,
        transport_mode=transport_mode,
        events=events
    )

@api_router.get("/containers/{container_id}/additionals", response_model=List[ContainerAdditional])
async def get_container_additionals(container_id: str, user: dict = Depends(verify_token)):
    """Get additionals for a specific container with reason codes"""
    count = random.randint(1, 5)
    return generate_container_additionals(container_id, count)

# ==================== PLANNING ENDPOINTS ====================

def generate_historical_data(years: int = 3):
    """Generate historical data for the past years"""
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    current_year = datetime.now().year
    historical = []
    
    # Base values that grow slightly each year
    base_containers = 25
    base_cost = 4500
    extra_cost_ratio = 0.12  # 12% extra costs on average
    
    for year_offset in range(years, 0, -1):
        year = current_year - year_offset
        growth_factor = 1 + (years - year_offset) * 0.08  # 8% annual growth
        
        for month_idx, month in enumerate(months):
            # Seasonal variation - more containers in Q4
            seasonal_factor = 1.0
            if month_idx >= 9:  # Oct-Dec
                seasonal_factor = 1.3
            elif month_idx >= 6:  # Jul-Sep
                seasonal_factor = 1.1
            elif month_idx <= 1:  # Jan-Feb
                seasonal_factor = 0.85
            
            containers = int(base_containers * growth_factor * seasonal_factor * random.uniform(0.9, 1.1))
            logistics_cost = round(containers * base_cost * random.uniform(0.95, 1.05), 2)
            extra_costs = round(logistics_cost * extra_cost_ratio * random.uniform(0.8, 1.4), 2)
            
            historical.append(HistoricalData(
                year=year,
                month=month,
                containers=containers,
                logistics_cost=logistics_cost,
                extra_costs=extra_costs,
                avg_cost_per_container=round(logistics_cost / containers, 2) if containers > 0 else 0
            ))
    
    return historical

def generate_forecast(historical_data: List[HistoricalData], forecast_year: int, warehouse_config: WarehouseConfig):
    """Generate forecast based on historical data"""
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    # Calculate averages and trends from historical data
    yearly_totals = {}
    for h in historical_data:
        if h.year not in yearly_totals:
            yearly_totals[h.year] = {"containers": 0, "cost": 0, "extras": 0}
        yearly_totals[h.year]["containers"] += h.containers
        yearly_totals[h.year]["cost"] += h.logistics_cost
        yearly_totals[h.year]["extras"] += h.extra_costs
    
    # Calculate growth rate
    years = sorted(yearly_totals.keys())
    if len(years) >= 2:
        growth_rate = (yearly_totals[years[-1]]["containers"] / yearly_totals[years[0]]["containers"]) ** (1 / len(years)) - 1
    else:
        growth_rate = 0.08  # Default 8% growth
    
    # Calculate monthly patterns (seasonality)
    monthly_patterns = {m: [] for m in months}
    for h in historical_data:
        monthly_patterns[h.month].append(h.containers)
    
    monthly_avg = {m: sum(v) / len(v) if v else 0 for m, v in monthly_patterns.items()}
    total_avg = sum(monthly_avg.values()) / 12
    seasonality = {m: v / total_avg if total_avg > 0 else 1 for m, v in monthly_avg.items()}
    
    # Generate forecast
    last_year_containers = yearly_totals[years[-1]]["containers"] if years else 300
    last_year_cost = yearly_totals[years[-1]]["cost"] if years else 1500000
    last_year_extras = yearly_totals[years[-1]]["extras"] if years else 180000
    
    forecasted_annual_containers = int(last_year_containers * (1 + growth_rate))
    monthly_forecast = []
    
    for month_idx, month in enumerate(months):
        seasonal = seasonality.get(month, 1)
        base_monthly = forecasted_annual_containers / 12
        
        forecasted_containers = int(base_monthly * seasonal * random.uniform(0.95, 1.05))
        forecasted_cost = round(forecasted_containers * (last_year_cost / last_year_containers) * 1.03, 2)  # 3% cost inflation
        forecasted_extras = round(forecasted_cost * 0.12 * random.uniform(0.9, 1.2), 2)
        
        # Confidence decreases for further months
        confidence = max(0.7, 0.95 - (month_idx * 0.02))
        
        monthly_forecast.append(ForecastData(
            month=month,
            month_num=month_idx + 1,
            forecasted_containers=forecasted_containers,
            forecasted_logistics_cost=forecasted_cost,
            forecasted_extra_costs=forecasted_extras,
            confidence_level=round(confidence, 2)
        ))
    
    return monthly_forecast, forecasted_annual_containers, growth_rate

def generate_delivery_calendar(monthly_forecast: List[ForecastData], warehouse_config: WarehouseConfig):
    """Generate delivery calendar based on forecast and warehouse capacity"""
    calendar = []
    current_date = datetime.now()
    
    # Working days mapping
    day_names = {
        0: "Lunes", 1: "Martes", 2: "Miércoles", 
        3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"
    }
    working_days_idx = [k for k, v in day_names.items() if v in warehouse_config.working_days]
    
    # Generate calendar for next 30 days
    containers_to_schedule = monthly_forecast[current_date.month - 1].forecasted_containers if monthly_forecast else 30
    containers_per_day = containers_to_schedule // 22  # ~22 working days per month
    
    for day_offset in range(30):
        date = current_date + timedelta(days=day_offset)
        day_of_week = date.weekday()
        
        if day_of_week in working_days_idx:
            # Schedule containers for this day
            scheduled = min(
                containers_per_day + random.randint(-2, 3),
                warehouse_config.max_containers_per_day
            )
            scheduled = max(0, scheduled)
            
            utilization = (scheduled / warehouse_config.max_containers_per_day) * 100 if warehouse_config.max_containers_per_day > 0 else 0
            
            # Generate container details
            containers = []
            for i in range(scheduled):
                containers.append({
                    "container_number": generate_container_number(),
                    "eta": f"{random.randint(8, 16)}:{random.choice(['00', '30'])}",
                    "origin": random.choice([p["name"] for p in PORTS]),
                    "type": random.choice(CONTAINER_TYPES)
                })
            
            calendar.append(DeliverySlot(
                date=date.strftime("%Y-%m-%d"),
                day_name=day_names[day_of_week],
                scheduled_containers=scheduled,
                max_capacity=warehouse_config.max_containers_per_day,
                utilization_percent=round(utilization, 1),
                containers=containers
            ))
    
    return calendar

@api_router.get("/planning/historical")
async def get_historical_data(user: dict = Depends(verify_token)):
    """Get historical logistics data for planning"""
    historical = generate_historical_data(3)
    
    # Aggregate by year
    yearly_summary = {}
    for h in historical:
        if h.year not in yearly_summary:
            yearly_summary[h.year] = {
                "containers": 0,
                "logistics_cost": 0,
                "extra_costs": 0,
                "months": []
            }
        yearly_summary[h.year]["containers"] += h.containers
        yearly_summary[h.year]["logistics_cost"] += h.logistics_cost
        yearly_summary[h.year]["extra_costs"] += h.extra_costs
        yearly_summary[h.year]["months"].append(h.model_dump())
    
    return {
        "historical_data": [h.model_dump() for h in historical],
        "yearly_summary": yearly_summary
    }

@api_router.get("/planning/forecast")
async def get_planning_forecast(
    doors: int = 8,
    user: dict = Depends(verify_token)
):
    """Get complete planning forecast with delivery calendar"""
    forecast_year = datetime.now().year + 1
    
    # Warehouse configuration
    warehouse = WarehouseConfig(
        name="CEDIS Principal",
        doors=doors,
        max_containers_per_day=doors,  # 1 container per door per day
        operating_hours="07:00-19:00",
        working_days=["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    )
    
    # Get historical data
    historical = generate_historical_data(3)
    
    # Generate forecast
    monthly_forecast, annual_containers, growth_rate = generate_forecast(historical, forecast_year, warehouse)
    
    # Generate delivery calendar
    delivery_calendar = generate_delivery_calendar(monthly_forecast, warehouse)
    
    # Calculate summaries
    total_forecasted_cost = sum(m.forecasted_logistics_cost for m in monthly_forecast)
    total_forecasted_extras = sum(m.forecasted_extra_costs for m in monthly_forecast)
    
    # Get current year actuals for comparison
    current_year = datetime.now().year
    current_year_data = [h for h in historical if h.year == current_year - 1]  # Use last full year
    actual_containers = sum(h.containers for h in current_year_data)
    actual_cost = sum(h.logistics_cost for h in current_year_data)
    actual_extras = sum(h.extra_costs for h in current_year_data)
    
    # Calculate working days per month for capacity planning
    working_days_per_month = 22  # Average
    monthly_capacity = warehouse.max_containers_per_day * working_days_per_month
    annual_capacity = monthly_capacity * 12
    
    return PlanningForecast(
        year=forecast_year,
        historical_summary={
            "years_analyzed": 3,
            "total_historical_containers": sum(h.containers for h in historical),
            "avg_monthly_containers": round(sum(h.containers for h in historical) / len(historical), 1),
            "growth_rate_percent": round(growth_rate * 100, 1),
            "avg_cost_per_container": round(sum(h.logistics_cost for h in historical) / sum(h.containers for h in historical), 2),
            "extra_cost_ratio_percent": round((sum(h.extra_costs for h in historical) / sum(h.logistics_cost for h in historical)) * 100, 1)
        },
        annual_forecast={
            "forecasted_containers": sum(m.forecasted_containers for m in monthly_forecast),
            "forecasted_logistics_cost": round(total_forecasted_cost, 2),
            "forecasted_extra_costs": round(total_forecasted_extras, 2),
            "total_forecasted_budget": round(total_forecasted_cost + total_forecasted_extras, 2),
            "avg_monthly_containers": round(sum(m.forecasted_containers for m in monthly_forecast) / 12, 1),
            "warehouse_capacity": {
                "doors": warehouse.doors,
                "daily_capacity": warehouse.max_containers_per_day,
                "monthly_capacity": monthly_capacity,
                "annual_capacity": annual_capacity,
                "utilization_forecast_percent": round((sum(m.forecasted_containers for m in monthly_forecast) / annual_capacity) * 100, 1)
            }
        },
        monthly_forecast=[m.model_dump() for m in monthly_forecast],
        delivery_calendar=[d.model_dump() for d in delivery_calendar],
        budget_comparison={
            "previous_year": {
                "year": current_year - 1,
                "containers": actual_containers,
                "logistics_cost": round(actual_cost, 2),
                "extra_costs": round(actual_extras, 2),
                "total": round(actual_cost + actual_extras, 2)
            },
            "forecast": {
                "year": forecast_year,
                "containers": sum(m.forecasted_containers for m in monthly_forecast),
                "logistics_cost": round(total_forecasted_cost, 2),
                "extra_costs": round(total_forecasted_extras, 2),
                "total": round(total_forecasted_cost + total_forecasted_extras, 2)
            },
            "variance": {
                "containers_diff": sum(m.forecasted_containers for m in monthly_forecast) - actual_containers,
                "containers_percent": round(((sum(m.forecasted_containers for m in monthly_forecast) - actual_containers) / actual_containers) * 100, 1) if actual_containers > 0 else 0,
                "cost_diff": round((total_forecasted_cost + total_forecasted_extras) - (actual_cost + actual_extras), 2),
                "cost_percent": round((((total_forecasted_cost + total_forecasted_extras) - (actual_cost + actual_extras)) / (actual_cost + actual_extras)) * 100, 1) if (actual_cost + actual_extras) > 0 else 0
            }
        }
    )

# ==================== INVENTORY ENDPOINTS ====================

@api_router.get("/inventory")
async def get_inventory(user: dict = Depends(verify_token)):
    """Get current CEDIS inventory with stock levels"""
    inventory = generate_cedis_inventory()
    
    # Summary stats
    critical_count = len([i for i in inventory if i.stock_status == "critical"])
    low_count = len([i for i in inventory if i.stock_status == "low"])
    optimal_count = len([i for i in inventory if i.stock_status == "optimal"])
    
    # Group by brand
    brands_summary = {}
    for item in inventory:
        if item.brand not in brands_summary:
            brands_summary[item.brand] = {"items": 0, "critical": 0, "low": 0}
        brands_summary[item.brand]["items"] += 1
        if item.stock_status == "critical":
            brands_summary[item.brand]["critical"] += 1
        elif item.stock_status == "low":
            brands_summary[item.brand]["low"] += 1
    
    return {
        "inventory": [i.model_dump() for i in inventory],
        "summary": {
            "total_products": len(inventory),
            "critical": critical_count,
            "low": low_count,
            "optimal": optimal_count,
            "needs_restock": critical_count + low_count
        },
        "brands_summary": brands_summary
    }

@api_router.get("/inventory/containers")
async def get_containers_by_product(user: dict = Depends(verify_token)):
    """Get containers in transit with product information, sorted by restock priority"""
    inventory = generate_cedis_inventory()
    containers = generate_containers_with_products(inventory)
    
    # Group containers by product
    products_in_transit = {}
    for c in containers:
        if c.sku not in products_in_transit:
            inv_item = next((i for i in inventory if i.sku == c.sku), None)
            products_in_transit[c.sku] = {
                "sku": c.sku,
                "product_name": c.product_name,
                "brand": c.brand,
                "current_stock": inv_item.current_stock if inv_item else 0,
                "minimum_stock": inv_item.minimum_stock if inv_item else 0,
                "priority_score": c.priority_score,
                "delivery_urgency": c.delivery_urgency,
                "containers": [],
                "total_units_in_transit": 0
            }
        products_in_transit[c.sku]["containers"].append(c.model_dump())
        products_in_transit[c.sku]["total_units_in_transit"] += c.quantity
    
    # Convert to list and sort by priority
    products_list = list(products_in_transit.values())
    products_list.sort(key=lambda x: x["priority_score"], reverse=True)
    
    return {
        "containers": [c.model_dump() for c in containers],
        "products_in_transit": products_list,
        "summary": {
            "total_containers": len(containers),
            "critical_deliveries": len([c for c in containers if c.delivery_urgency == "critical"]),
            "high_priority_deliveries": len([c for c in containers if c.delivery_urgency == "high"]),
            "products_being_restocked": len(products_in_transit)
        }
    }

@api_router.get("/inventory/restock-plan")
async def get_restock_plan(doors: int = 8, user: dict = Depends(verify_token)):
    """Get complete restock plan with delivery schedule based on priority"""
    inventory = generate_cedis_inventory()
    containers = generate_containers_with_products(inventory)
    
    # Create delivery schedule prioritized by stock levels
    warehouse = WarehouseConfig(
        name="CEDIS Principal",
        doors=doors,
        max_containers_per_day=doors,
        operating_hours="07:00-19:00",
        working_days=["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    )
    
    day_names = {0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"}
    working_days_idx = [k for k, v in day_names.items() if v in warehouse.working_days]
    
    # Schedule containers by priority
    schedule = []
    containers_sorted = sorted(containers, key=lambda x: x.priority_score, reverse=True)
    
    current_date = datetime.now(timezone.utc)
    day_offset = 0
    daily_count = 0
    
    for container in containers_sorted:
        # Find next available day
        while True:
            check_date = current_date + timedelta(days=day_offset)
            if check_date.weekday() in working_days_idx:
                if daily_count < warehouse.max_containers_per_day:
                    break
                else:
                    day_offset += 1
                    daily_count = 0
            else:
                day_offset += 1
        
        delivery_date = current_date + timedelta(days=day_offset)
        
        # Get inventory info for this product
        inv_item = next((i for i in inventory if i.sku == container.sku), None)
        
        schedule.append({
            "delivery_date": delivery_date.strftime("%Y-%m-%d"),
            "day_name": day_names[delivery_date.weekday()],
            "container_number": container.container_number,
            "sku": container.sku,
            "product_name": container.product_name,
            "brand": container.brand,
            "quantity": container.quantity,
            "current_stock": inv_item.current_stock if inv_item else 0,
            "minimum_stock": inv_item.minimum_stock if inv_item else 0,
            "stock_after_delivery": (inv_item.current_stock if inv_item else 0) + container.quantity,
            "priority_score": container.priority_score,
            "delivery_urgency": container.delivery_urgency,
            "slot_number": daily_count + 1
        })
        
        daily_count += 1
        if daily_count >= warehouse.max_containers_per_day:
            day_offset += 1
            daily_count = 0
    
    # Group by date for calendar view
    calendar = {}
    for item in schedule:
        date = item["delivery_date"]
        if date not in calendar:
            calendar[date] = {
                "date": date,
                "day_name": item["day_name"],
                "deliveries": [],
                "total_containers": 0,
                "capacity": warehouse.max_containers_per_day
            }
        calendar[date]["deliveries"].append(item)
        calendar[date]["total_containers"] += 1
    
    calendar_list = sorted(calendar.values(), key=lambda x: x["date"])
    
    return {
        "restock_schedule": schedule,
        "calendar": calendar_list,
        "warehouse_config": {
            "doors": warehouse.doors,
            "daily_capacity": warehouse.max_containers_per_day,
            "operating_hours": warehouse.operating_hours
        },
        "summary": {
            "total_containers_scheduled": len(schedule),
            "days_needed": len(calendar_list),
            "critical_products": len([s for s in schedule if s["delivery_urgency"] == "critical"]),
            "total_units_to_receive": sum(s["quantity"] for s in schedule)
        }
    }

@api_router.put("/inventory/{sku}/min-stock")
async def update_min_stock(sku: str, min_stock: int, user: dict = Depends(verify_token)):
    """Update minimum stock level for a product"""
    # In production, this would update the database
    return {
        "success": True,
        "message": f"Stock mínimo actualizado para {sku}",
        "sku": sku,
        "new_min_stock": min_stock
    }

# ==================== PRODUCT MANAGEMENT ENDPOINTS ====================

@api_router.post("/inventory/products")
async def create_product(product: NewProductRequest, user: dict = Depends(verify_token)):
    """Add a new product to the inventory"""
    # Validate SKU doesn't exist
    existing = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == product.sku), None)
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU {product.sku} ya existe")
    
    # In production, save to database
    new_product = {
        "id": str(uuid.uuid4()),
        "sku": product.sku,
        "name": product.name,
        "brand": product.brand,
        "category": product.category,
        "units_per_container": product.units_per_container,
        "minimum_stock": product.minimum_stock,
        "maximum_stock": product.maximum_stock,
        "zone_preference": product.zone_preference,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save to MongoDB
    await db.products.insert_one(new_product)
    
    # Remove MongoDB _id from response
    new_product.pop("_id", None)
    
    return {
        "success": True,
        "message": f"Producto {product.name} creado exitosamente",
        "product": new_product
    }

@api_router.get("/inventory/products")
async def get_all_products(user: dict = Depends(verify_token)):
    """Get all products including custom ones"""
    # Get products from database
    db_products = await db.products.find({}, {"_id": 0}).to_list(100)
    
    # Combine with default products
    all_products = []
    for p in PERNOD_RICARD_PRODUCTS:
        all_products.append({
            **p,
            "id": str(uuid.uuid4()),
            "minimum_stock": random.randint(500, 2000),
            "maximum_stock": random.randint(4000, 8000),
            "zone_preference": get_zone_for_category(p["category"]),
            "source": "default"
        })
    
    for p in db_products:
        all_products.append({**p, "source": "custom"})
    
    return {
        "products": all_products,
        "total": len(all_products),
        "categories": list(set(p.get("category", "Otros") for p in all_products)),
        "brands": list(set(p.get("brand", "Sin marca") for p in all_products))
    }

# ==================== WAREHOUSE POSITIONS ENDPOINTS ====================

@api_router.get("/inventory/{sku}/positions")
async def get_product_positions(sku: str, user: dict = Depends(verify_token)):
    """Get warehouse positions for a specific product"""
    # Find product
    product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == sku), None)
    if not product:
        # Check database
        db_product = await db.products.find_one({"sku": sku}, {"_id": 0})
        if db_product:
            product = db_product
        else:
            raise HTTPException(status_code=404, detail=f"Producto {sku} no encontrado")
    
    # Generate inventory for this product
    inventory = generate_cedis_inventory()
    inv_item = next((i for i in inventory if i.sku == sku), None)
    
    if not inv_item:
        raise HTTPException(status_code=404, detail=f"No hay inventario para {sku}")
    
    # Generate positions
    positions, zone = generate_warehouse_positions(
        sku=sku,
        product_name=product["name"],
        category=product.get("category", "Otros"),
        total_units=inv_item.current_stock
    )
    
    # Calculate zone distribution
    zone_dist = {}
    for pos in positions:
        if pos.zone not in zone_dist:
            zone_dist[pos.zone] = {"positions": 0, "units": 0}
        zone_dist[pos.zone]["positions"] += 1
        zone_dist[pos.zone]["units"] += pos.current_units
    
    # Get recommended door based on most common zone
    recommended_door = get_recommended_door(zone)
    
    return ProductPositions(
        sku=sku,
        product_name=product["name"],
        brand=product.get("brand", "Sin marca"),
        total_units=inv_item.current_stock,
        positions=positions,
        recommended_door=recommended_door,
        zone_distribution=zone_dist
    )

@api_router.get("/warehouse/zones")
async def get_warehouse_zones(user: dict = Depends(verify_token)):
    """Get warehouse zone configuration"""
    zones = []
    for zone_id, config in WAREHOUSE_ZONES.items():
        zones.append({
            "zone_id": zone_id,
            "name": config["name"],
            "door_range": config["door_range"],
            "categories": config["categories"],
            "description": f"Puertas {config['door_range'][0]}-{config['door_range'][1]}"
        })
    return {"zones": zones, "total_zones": len(zones)}

@api_router.get("/warehouse/map")
async def get_warehouse_map(user: dict = Depends(verify_token)):
    """Get warehouse map with all positions and their status"""
    inventory = generate_cedis_inventory()
    
    warehouse_map = []
    for zone_id, config in WAREHOUSE_ZONES.items():
        zone_products = []
        for inv in inventory:
            product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == inv.sku), None)
            if product and product.get("category") in config["categories"]:
                positions, _ = generate_warehouse_positions(
                    inv.sku, inv.name, product.get("category", "Otros"), inv.current_stock
                )
                zone_products.append({
                    "sku": inv.sku,
                    "name": inv.name,
                    "brand": inv.brand,
                    "positions_count": len(positions),
                    "total_units": inv.current_stock,
                    "stock_status": inv.stock_status
                })
        
        warehouse_map.append({
            "zone_id": zone_id,
            "zone_name": config["name"],
            "doors": config["door_range"],
            "products": zone_products,
            "products_count": len(zone_products)
        })
    
    return {"warehouse_map": warehouse_map}

# ==================== TRANSIT PLANNING & RESTOCK PREDICTIONS ====================

@api_router.get("/planning/transit-routes")
async def get_transit_routes(user: dict = Depends(verify_token)):
    """Get available transit routes with lead times"""
    routes = []
    for r in TRANSIT_ROUTES:
        total_lead = r["transit_days"] + r["port_days"] + r["customs_days"] + r["inland_days"]
        routes.append({
            "route_id": str(uuid.uuid4()),
            "origin": r["origin"],
            "destination": r["destination"],
            "transport_mode": r["mode"],
            "transit_days": r["transit_days"],
            "port_handling_days": r["port_days"],
            "customs_days": r["customs_days"],
            "inland_transport_days": r["inland_days"],
            "total_lead_time_days": total_lead,
            "cost_per_container": r["cost"]
        })
    return {"routes": routes, "total": len(routes)}

@api_router.get("/planning/restock-predictions")
async def get_restock_predictions(user: dict = Depends(verify_token)):
    """Get predictions for when to order products based on transit time"""
    inventory = generate_cedis_inventory()
    predictions = generate_restock_predictions(inventory)
    
    # Summary stats
    immediate_count = len([p for p in predictions if p.urgency_level == "immediate"])
    soon_count = len([p for p in predictions if p.urgency_level == "soon"])
    
    return {
        "predictions": [p.model_dump() for p in predictions],
        "summary": {
            "total_products": len(predictions),
            "immediate_action_required": immediate_count,
            "order_soon": soon_count,
            "avg_lead_time_days": round(sum(p.transit_time_days for p in predictions) / len(predictions), 1) if predictions else 0
        },
        "routes_used": list(set(p.suggested_origin for p in predictions))
    }

@api_router.get("/planning/restock-timeline")
async def get_restock_timeline(days: int = 30, user: dict = Depends(verify_token)):
    """Get timeline view of when orders need to be placed and expected deliveries"""
    inventory = generate_cedis_inventory()
    predictions = generate_restock_predictions(inventory)
    
    # Create timeline for next N days
    timeline = []
    today = datetime.now(timezone.utc).date()
    
    for day_offset in range(days):
        current_date = today + timedelta(days=day_offset)
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Orders to place on this day
        orders_to_place = [p for p in predictions if p.reorder_point_date == date_str]
        # Deliveries expected on this day
        deliveries_expected = [p for p in predictions if p.expected_delivery_date == date_str]
        
        if orders_to_place or deliveries_expected:
            timeline.append({
                "date": date_str,
                "day_name": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][current_date.weekday()],
                "orders_to_place": [{
                    "sku": o.sku,
                    "product_name": o.product_name,
                    "brand": o.brand,
                    "quantity": o.recommended_quantity,
                    "origin": o.suggested_origin,
                    "urgency": o.urgency_level
                } for o in orders_to_place],
                "deliveries_expected": [{
                    "sku": d.sku,
                    "product_name": d.product_name,
                    "brand": d.brand,
                    "quantity": d.recommended_quantity
                } for d in deliveries_expected],
                "orders_count": len(orders_to_place),
                "deliveries_count": len(deliveries_expected)
            })
    
    return {
        "timeline": timeline,
        "period_days": days,
        "total_orders_planned": sum(len(t["orders_to_place"]) for t in timeline),
        "total_deliveries_expected": sum(len(t["deliveries_expected"]) for t in timeline)
    }

# ==================== SUPPLY CHAIN PLANNING (INTEGRATED) ====================

@api_router.get("/planning/supply-chain")
async def get_supply_chain_plan(user: dict = Depends(verify_token)):
    """
    Obtiene la planificación integrada de cadena de suministro.
    ORIGEN → INBOUND → CEDIS → DISTRIBUCIÓN → CLIENTE FINAL
    
    El objetivo es garantizar que el cliente final NUNCA se quede sin producto.
    """
    plans = generate_supply_chain_plan()
    
    # Estadísticas
    emergency_count = len([p for p in plans if p.action_required == "emergency"])
    order_now_count = len([p for p in plans if p.action_required in ["order_now", "emergency"]])
    distribute_count = len([p for p in plans if p.action_required == "distribute"])
    
    total_critical_locations = sum(p.critical_end_client_locations for p in plans)
    total_deficit = sum(p.cedis_deficit for p in plans)
    
    return {
        "plans": [p.model_dump() for p in plans],
        "summary": {
            "total_skus_analyzed": len(plans),
            "emergency_actions": emergency_count,
            "orders_needed": order_now_count,
            "distributions_needed": distribute_count,
            "total_critical_end_locations": total_critical_locations,
            "total_cedis_deficit": total_deficit
        },
        "alerts": {
            "has_emergencies": emergency_count > 0,
            "message": f"🚨 {emergency_count} productos requieren acción de EMERGENCIA" if emergency_count > 0 
                      else f"⚠️ {order_now_count} productos necesitan pedido a origen" if order_now_count > 0
                      else "✅ Cadena de suministro estable"
        }
    }

@api_router.get("/planning/supply-chain/{sku}")
async def get_sku_supply_chain_plan(sku: str, user: dict = Depends(verify_token)):
    """Obtiene el plan de cadena de suministro para un SKU específico"""
    plans = generate_supply_chain_plan()
    plan = next((p for p in plans if p.sku == sku), None)
    
    if not plan:
        raise HTTPException(status_code=404, detail=f"SKU {sku} no encontrado")
    
    # Obtener detalle de ubicaciones de clientes finales que necesitan este producto
    all_end_client_inventory = generate_end_client_inventory()
    locations_needing = [
        {
            "client_name": item.client_name,
            "store_code": item.store_code,
            "store_name": item.store_name,
            "current_stock": item.current_stock,
            "days_of_stock": item.days_of_stock,
            "suggested_quantity": item.suggested_quantity,
            "estimated_stockout": item.estimated_stockout_date
        }
        for item in all_end_client_inventory 
        if item.sku == sku and item.needs_restock
    ]
    
    # Ordenar por días de stock (más urgente primero)
    locations_needing.sort(key=lambda x: x["days_of_stock"])
    
    return {
        "plan": plan.model_dump(),
        "end_client_locations_needing": locations_needing,
        "locations_count": len(locations_needing)
    }

@api_router.get("/planning/distribution-orders")
async def get_distribution_orders(user: dict = Depends(verify_token)):
    """
    Obtiene las órdenes de distribución pendientes.
    Estas son entregas que deben salir de CEDIS hacia clientes finales.
    """
    orders = generate_distribution_orders()
    
    # Agrupar por prioridad
    by_priority = {"critical": [], "high": [], "medium": [], "low": []}
    for order in orders:
        by_priority[order.priority].append(order.model_dump())
    
    # Agrupar por cliente
    by_client = {}
    for order in orders:
        if order.client_name not in by_client:
            by_client[order.client_name] = {"orders": 0, "units": 0}
        by_client[order.client_name]["orders"] += 1
        by_client[order.client_name]["units"] += order.quantity
    
    return {
        "orders": [o.model_dump() for o in orders],
        "by_priority": by_priority,
        "by_client": by_client,
        "summary": {
            "total_orders": len(orders),
            "critical_orders": len(by_priority["critical"]),
            "total_units": sum(o.quantity for o in orders),
            "clients_to_serve": len(by_client)
        }
    }

@api_router.get("/planning/action-items")
async def get_action_items(user: dict = Depends(verify_token)):
    """
    Obtiene una lista priorizada de acciones a tomar:
    1. Pedidos a origen que deben hacerse hoy
    2. Distribuciones que deben salir de CEDIS
    3. Alertas de desabasto inminente en clientes finales
    """
    plans = generate_supply_chain_plan()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    actions = {
        "origin_orders_today": [],
        "distributions_urgent": [],
        "end_client_alerts": []
    }
    
    for plan in plans:
        # Pedidos a origen para hoy
        if plan.cedis_reorder_date and plan.cedis_reorder_date <= today:
            if plan.action_required in ["emergency", "order_now"]:
                actions["origin_orders_today"].append({
                    "sku": plan.sku,
                    "product_name": plan.product_name,
                    "brand": plan.brand,
                    "action": plan.action_required,
                    "description": plan.action_description,
                    "origin": plan.suggested_origin,
                    "deficit": plan.cedis_deficit,
                    "expected_arrival": plan.expected_inbound_date,
                    "priority": plan.priority_score
                })
        
        # Distribuciones urgentes
        if plan.distribution_ship_by_date and plan.distribution_ship_by_date <= today:
            if plan.can_fulfill_from_cedis and plan.end_clients_needing_restock > 0:
                actions["distributions_urgent"].append({
                    "sku": plan.sku,
                    "product_name": plan.product_name,
                    "brand": plan.brand,
                    "locations_to_serve": plan.end_clients_needing_restock,
                    "units_needed": plan.total_end_client_demand,
                    "ship_by": plan.distribution_ship_by_date,
                    "priority": plan.priority_score
                })
        
        # Alertas de desabasto
        if plan.critical_end_client_locations > 0:
            actions["end_client_alerts"].append({
                "sku": plan.sku,
                "product_name": plan.product_name,
                "brand": plan.brand,
                "critical_locations": plan.critical_end_client_locations,
                "earliest_stockout": plan.earliest_end_client_stockout,
                "can_fulfill": plan.can_fulfill_from_cedis,
                "action": plan.action_description,
                "priority": plan.priority_score
            })
    
    # Ordenar cada lista por prioridad
    for key in actions:
        actions[key].sort(key=lambda x: x["priority"], reverse=True)
    
    return {
        "actions": actions,
        "summary": {
            "orders_to_place_today": len(actions["origin_orders_today"]),
            "urgent_distributions": len(actions["distributions_urgent"]),
            "end_client_alerts": len(actions["end_client_alerts"]),
            "requires_immediate_attention": len(actions["origin_orders_today"]) > 0 or len(actions["end_client_alerts"]) > 0
        },
        "generated_at": today
    }

# ==================== END CLIENT INVENTORY (WALMART, ETC.) ====================

@api_router.get("/inventory/end-clients")
async def get_end_clients_list(user: dict = Depends(verify_token)):
    """Get list of end clients (retailers) we track inventory for"""
    clients = []
    for client in END_CLIENTS:
        total_stores = sum(1 for r in client["regions"]) * client["stores_per_region"]
        clients.append({
            "name": client["name"],
            "code_prefix": client["code_prefix"],
            "regions": client["regions"],
            "total_stores": total_stores
        })
    return {"clients": clients, "total": len(clients)}

@api_router.get("/inventory/end-clients/{client_name}")
async def get_end_client_inventory(client_name: str, user: dict = Depends(verify_token)):
    """Get inventory details for a specific end client (e.g., Walmart)"""
    # Validate client exists
    client = next((c for c in END_CLIENTS if c["name"].lower() == client_name.lower()), None)
    if not client:
        raise HTTPException(status_code=404, detail=f"Cliente {client_name} no encontrado")
    
    inventory = generate_end_client_inventory(client["name"])
    
    # Group by store
    stores = {}
    for item in inventory:
        if item.store_code not in stores:
            stores[item.store_code] = {
                "store_code": item.store_code,
                "store_name": item.store_name,
                "products": [],
                "needs_restock_count": 0,
                "critical_count": 0
            }
        stores[item.store_code]["products"].append(item.model_dump())
        if item.needs_restock:
            stores[item.store_code]["needs_restock_count"] += 1
        if item.days_of_stock <= 3:
            stores[item.store_code]["critical_count"] += 1
    
    stores_list = sorted(stores.values(), key=lambda x: x["critical_count"], reverse=True)
    
    # Summary
    total_needs_restock = len([i for i in inventory if i.needs_restock])
    critical = len([i for i in inventory if i.days_of_stock <= 3])
    
    return {
        "client_name": client["name"],
        "stores": stores_list,
        "summary": EndClientSummary(
            client_name=client["name"],
            total_locations=len(stores),
            products_tracked=len(inventory),
            locations_needing_restock=len([s for s in stores_list if s["needs_restock_count"] > 0]),
            critical_stockouts=critical,
            total_units_to_ship=sum(i.suggested_quantity for i in inventory if i.needs_restock)
        ).model_dump(),
        "regions": client["regions"]
    }

@api_router.get("/inventory/end-clients/{client_name}/summary")
async def get_end_client_summary(client_name: str, user: dict = Depends(verify_token)):
    """Get summary of inventory needs for an end client"""
    client = next((c for c in END_CLIENTS if c["name"].lower() == client_name.lower()), None)
    if not client:
        raise HTTPException(status_code=404, detail=f"Cliente {client_name} no encontrado")
    
    inventory = generate_end_client_inventory(client["name"])
    
    # Group by product SKU for aggregation
    product_summary = {}
    for item in inventory:
        if item.sku not in product_summary:
            product_summary[item.sku] = {
                "sku": item.sku,
                "product_name": item.product_name,
                "brand": item.brand,
                "total_stores": 0,
                "stores_needing_restock": 0,
                "total_current_stock": 0,
                "total_suggested_restock": 0,
                "avg_days_of_stock": 0,
                "critical_stores": 0
            }
        product_summary[item.sku]["total_stores"] += 1
        product_summary[item.sku]["total_current_stock"] += item.current_stock
        if item.needs_restock:
            product_summary[item.sku]["stores_needing_restock"] += 1
            product_summary[item.sku]["total_suggested_restock"] += item.suggested_quantity
        if item.days_of_stock <= 3:
            product_summary[item.sku]["critical_stores"] += 1
        product_summary[item.sku]["avg_days_of_stock"] += item.days_of_stock
    
    # Calculate averages
    for sku, data in product_summary.items():
        data["avg_days_of_stock"] = round(data["avg_days_of_stock"] / data["total_stores"], 1)
    
    # Sort by critical stores
    products_list = sorted(product_summary.values(), key=lambda x: x["critical_stores"], reverse=True)
    
    return {
        "client_name": client["name"],
        "products": products_list,
        "total_products": len(products_list),
        "products_needing_restock": len([p for p in products_list if p["stores_needing_restock"] > 0]),
        "total_restock_units": sum(p["total_suggested_restock"] for p in products_list)
    }

@api_router.get("/inventory/end-clients-overview")
async def get_all_end_clients_overview(user: dict = Depends(verify_token)):
    """Get overview of all end clients' inventory status"""
    overview = []
    
    for client in END_CLIENTS:
        inventory = generate_end_client_inventory(client["name"])
        
        total_stores = len(set(i.store_code for i in inventory))
        needs_restock = len([i for i in inventory if i.needs_restock])
        critical = len([i for i in inventory if i.days_of_stock <= 3])
        
        overview.append({
            "client_name": client["name"],
            "total_stores": total_stores,
            "products_tracked": len(inventory),
            "items_needing_restock": needs_restock,
            "critical_stockouts": critical,
            "restock_urgency": "critical" if critical > 10 else "high" if needs_restock > 20 else "normal",
            "total_units_to_ship": sum(i.suggested_quantity for i in inventory if i.needs_restock)
        })
    
    # Sort by urgency
    urgency_order = {"critical": 0, "high": 1, "normal": 2}
    overview.sort(key=lambda x: (urgency_order.get(x["restock_urgency"], 3), -x["critical_stockouts"]))
    
    return {
        "clients": overview,
        "total_clients": len(overview),
        "total_critical_items": sum(c["critical_stockouts"] for c in overview),
        "total_restock_items": sum(c["items_needing_restock"] for c in overview)
    }

# ==================== APPOINTMENTS ENDPOINTS ====================

@api_router.post("/appointments")
async def create_appointment(
    container_number: str,
    product_sku: str,
    scheduled_date: str,
    scheduled_time: str,
    operator_name: str,
    operator_license: str,
    insurance_policy: str,
    truck_plates: str,
    notes: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """Create a delivery appointment"""
    # Find product
    product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == product_sku), None)
    if not product:
        db_product = await db.products.find_one({"sku": product_sku}, {"_id": 0})
        if db_product:
            product = db_product
        else:
            raise HTTPException(status_code=404, detail=f"Producto {product_sku} no encontrado")
    
    # Calculate recommended door
    zone = get_zone_for_category(product.get("category", "Otros"))
    assigned_door = get_recommended_door(zone)
    
    appointment = DeliveryAppointment(
        container_number=container_number,
        product_sku=product_sku,
        product_name=product["name"],
        brand=product.get("brand", "Sin marca"),
        quantity=product.get("units_per_container", 1500),
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        assigned_door=assigned_door,
        operator_name=operator_name,
        operator_license=operator_license,
        insurance_policy=insurance_policy,
        truck_plates=truck_plates,
        status="scheduled",
        notes=notes
    )
    
    # Save to MongoDB
    await db.appointments.insert_one(appointment.model_dump())
    
    return {
        "success": True,
        "message": "Cita creada exitosamente",
        "appointment": appointment.model_dump(),
        "door_assignment": {
            "assigned_door": assigned_door,
            "zone": zone,
            "zone_name": WAREHOUSE_ZONES[zone]["name"],
            "reason": f"Puerta {assigned_door} asignada por cercanía a {WAREHOUSE_ZONES[zone]['name']}"
        }
    }

@api_router.get("/appointments")
async def get_appointments(
    date: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """Get delivery appointments"""
    # Get from database
    query = {}
    if date:
        query["scheduled_date"] = date
    if status:
        query["status"] = status
    
    db_appointments = await db.appointments.find(query, {"_id": 0}).to_list(100)
    
    # If no appointments in DB, generate mock data
    if not db_appointments:
        inventory = generate_cedis_inventory()
        containers = generate_containers_with_products(inventory)
        
        mock_appointments = []
        operators = [
            {"name": "Juan Carlos Mendoza", "license": "LIC-MX-4521789", "insurance": "POL-SEG-2024-001"},
            {"name": "Roberto García Luna", "license": "LIC-MX-3287654", "insurance": "POL-SEG-2024-002"},
            {"name": "Miguel Ángel Torres", "license": "LIC-MX-9876543", "insurance": "POL-SEG-2024-003"},
            {"name": "Francisco Javier Ruiz", "license": "LIC-MX-1234567", "insurance": "POL-SEG-2024-004"},
            {"name": "Carlos Eduardo Vega", "license": "LIC-MX-7654321", "insurance": "POL-SEG-2024-005"},
        ]
        
        for i, container in enumerate(containers[:10]):
            operator = random.choice(operators)
            product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == container.sku), None)
            zone = get_zone_for_category(product.get("category", "Otros")) if product else "E"
            
            sched_date = datetime.now(timezone.utc) + timedelta(days=random.randint(0, 7))
            
            mock_appointments.append({
                "id": str(uuid.uuid4()),
                "container_number": container.container_number,
                "product_sku": container.sku,
                "product_name": container.product_name,
                "brand": container.brand,
                "quantity": container.quantity,
                "scheduled_date": sched_date.strftime("%Y-%m-%d"),
                "scheduled_time": f"{random.randint(7, 16):02d}:{random.choice(['00', '30'])}",
                "assigned_door": get_recommended_door(zone),
                "operator_name": operator["name"],
                "operator_license": operator["license"],
                "insurance_policy": operator["insurance"],
                "truck_plates": f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=3))}-{random.randint(100, 999)}-{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=1))}",
                "status": random.choice(["scheduled", "scheduled", "scheduled", "in_progress", "completed"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "notes": None
            })
        
        return {
            "appointments": mock_appointments,
            "total": len(mock_appointments),
            "by_status": {
                "scheduled": len([a for a in mock_appointments if a["status"] == "scheduled"]),
                "in_progress": len([a for a in mock_appointments if a["status"] == "in_progress"]),
                "completed": len([a for a in mock_appointments if a["status"] == "completed"])
            }
        }
    
    return {
        "appointments": db_appointments,
        "total": len(db_appointments),
        "by_status": {
            "scheduled": len([a for a in db_appointments if a.get("status") == "scheduled"]),
            "in_progress": len([a for a in db_appointments if a.get("status") == "in_progress"]),
            "completed": len([a for a in db_appointments if a.get("status") == "completed"])
        }
    }

@api_router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    new_status: str,
    user: dict = Depends(verify_token)
):
    """Update appointment status"""
    valid_statuses = ["scheduled", "in_progress", "completed", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {valid_statuses}")
    
    result = await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": f"Status actualizado a {new_status}",
        "appointment_id": appointment_id
    }

@api_router.get("/appointments/{appointment_id}/door-recommendation")
async def get_door_recommendation(appointment_id: str, user: dict = Depends(verify_token)):
    """Get intelligent door recommendation based on product storage location"""
    # Find appointment
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    
    if not appointment:
        # Generate mock recommendation
        product = random.choice(PERNOD_RICARD_PRODUCTS)
        zone = get_zone_for_category(product["category"])
        door = get_recommended_door(zone)
        
        return {
            "recommended_door": door,
            "zone": zone,
            "zone_name": WAREHOUSE_ZONES[zone]["name"],
            "reason": f"Producto {product['name']} se almacena en {WAREHOUSE_ZONES[zone]['name']}",
            "alternative_doors": WAREHOUSE_ZONES[zone]["door_range"],
            "distance_score": round(random.uniform(85, 99), 1),
            "optimization_details": {
                "storage_zone": zone,
                "nearest_aisles": [f"{zone}-{i:02d}" for i in range(1, 4)],
                "estimated_unload_time": f"{random.randint(45, 90)} minutos"
            }
        }
    
    product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == appointment.get("product_sku")), None)
    if product:
        zone = get_zone_for_category(product["category"])
        door = get_recommended_door(zone)
        
        return {
            "recommended_door": door,
            "zone": zone,
            "zone_name": WAREHOUSE_ZONES[zone]["name"],
            "reason": f"Producto {product['name']} se almacena en {WAREHOUSE_ZONES[zone]['name']}",
            "alternative_doors": WAREHOUSE_ZONES[zone]["door_range"],
            "distance_score": round(random.uniform(85, 99), 1)
        }
    
    return {"recommended_door": random.randint(1, 8), "zone": "E", "reason": "Zona por defecto"}

@api_router.get("/containers/locations/all", response_model=List[ContainerLocation])
async def get_all_container_locations(user: dict = Depends(verify_token)):
    """Get all container locations for map display"""
    locations = []
    for i in range(random.randint(8, 15)):
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p != origin_port])
        status = random.choice(CONTAINER_STATUSES)
        
        if status == "En Puerto Origen":
            lat, lng = origin_port["lat"], origin_port["lng"]
        elif status == "Entregado" or status == "En Puerto Destino":
            lat, lng = dest_port["lat"], dest_port["lng"]
        else:
            progress = random.uniform(0.2, 0.8)
            lat = origin_port["lat"] + (dest_port["lat"] - origin_port["lat"]) * progress
            lng = origin_port["lng"] + (dest_port["lng"] - origin_port["lng"]) * progress
        
        locations.append(ContainerLocation(
            container_id=generate_container_number(),
            latitude=lat,
            longitude=lng,
            status=status,
            origin=origin_port["name"],
            destination=dest_port["name"],
            vessel_name=random.choice(VESSELS) if status == "En Tránsito" else None,
            eta=datetime.now(timezone.utc).isoformat()
        ))
    return locations

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user: dict = Depends(verify_token)):
    """Get all orders for the client"""
    orders = []
    statuses = ["Pendiente", "En Proceso", "En Tránsito", "En Aduana", "Entregado", "Completado"]
    
    for i in range(random.randint(8, 15)):
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p != origin_port])
        
        orders.append(Order(
            order_number=generate_order_number(),
            client_id=user["id"],
            origin=origin_port["name"],
            destination=dest_port["name"],
            container_type=random.choice(CONTAINER_TYPES),
            container_size=random.choice(CONTAINER_SIZES),
            cargo_description=random.choice([
                "Electrónicos de consumo",
                "Autopartes",
                "Textiles",
                "Maquinaria industrial",
                "Productos químicos",
                "Alimentos enlatados"
            ]),
            weight=round(random.uniform(5000, 25000), 2),
            status=random.choice(statuses),
            total_cost=round(random.uniform(2500, 15000), 2),
            estimated_delivery=datetime.now(timezone.utc).isoformat()
        ))
    return orders

# IMPORTANT: These specific routes MUST come before /orders/{order_id}
@api_router.get("/orders/pending-origin")
async def get_pending_origin_orders_route(user: dict = Depends(verify_token)):
    """Get pending orders to origin that need confirmation"""
    pending = generate_pending_origin_orders()
    
    return {
        "pending_orders": [p.model_dump() for p in pending],
        "total": len(pending),
        "emergency_count": len([p for p in pending if "EMERGENCIA" in p.reason]),
        "total_containers_needed": len(pending),
        "message": f"Tienes {len(pending)} pedidos a origen pendientes de confirmar"
    }

@api_router.get("/orders/pending-distribution")
async def get_pending_distribution_orders_route(user: dict = Depends(verify_token)):
    """Get pending distribution orders that need confirmation"""
    pending = generate_pending_distribution_orders()
    
    by_client = {}
    for p in pending:
        if p.client_name not in by_client:
            by_client[p.client_name] = {"count": 0, "units": 0}
        by_client[p.client_name]["count"] += 1
        by_client[p.client_name]["units"] += p.suggested_quantity
    
    return {
        "pending_orders": [p.model_dump() for p in pending],
        "total": len(pending),
        "critical_count": len([p for p in pending if p.priority == "critical"]),
        "by_client": by_client,
        "total_units": sum(p.suggested_quantity for p in pending),
        "message": f"Tienes {len(pending)} distribuciones pendientes de confirmar"
    }

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user: dict = Depends(verify_token)):
    """Create a new order"""
    new_order = Order(
        order_number=generate_order_number(),
        client_id=user["id"],
        origin=order_data.origin,
        destination=order_data.destination,
        container_type=order_data.container_type,
        container_size=order_data.container_size,
        cargo_description=order_data.cargo_description,
        weight=order_data.weight,
        status="Pendiente",
        total_cost=round(random.uniform(2500, 8000), 2)
    )
    
    # Save to MongoDB
    doc = new_order.model_dump()
    await db.orders.insert_one(doc)
    
    return new_order

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user: dict = Depends(verify_token)):
    """Get single order details"""
    # Try to find in DB first
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order:
        return Order(**order)
    
    # Return mock data if not found
    origin_port = random.choice(PORTS)
    dest_port = random.choice([p for p in PORTS if p != origin_port])
    
    return Order(
        id=order_id,
        order_number=generate_order_number(),
        client_id=user["id"],
        origin=origin_port["name"],
        destination=dest_port["name"],
        container_type=random.choice(CONTAINER_TYPES),
        container_size=random.choice(CONTAINER_SIZES),
        cargo_description="Electrónicos de consumo",
        weight=round(random.uniform(5000, 25000), 2),
        status="En Proceso",
        total_cost=round(random.uniform(2500, 15000), 2)
    )

@api_router.post("/orders/{order_id}/documents")
async def upload_document(
    order_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    """Upload document to an order (simulates ERP upload)"""
    # Read file content
    content = await file.read()
    
    # In production, this would upload to ERP
    # For now, we'll simulate success
    document = OrderDocument(
        name=file.filename,
        type=file.content_type or "application/octet-stream",
        url=f"/documents/{order_id}/{file.filename}",
        uploaded_at=datetime.now(timezone.utc).isoformat()
    )
    
    return {
        "success": True,
        "message": "Documento subido exitosamente",
        "document": document.model_dump()
    }

@api_router.get("/additionals", response_model=List[Additional])
async def get_additionals(user: dict = Depends(verify_token)):
    """Get all pending additionals for approval"""
    additionals = []
    descriptions = [
        "Demora en puerto - día adicional",
        "Almacenaje extendido",
        "Fumigación de contenedor",
        "Inspección aduanal adicional",
        "Maniobra especial de carga",
        "Seguro adicional de carga",
        "Transporte terrestre urgente"
    ]
    
    for i in range(random.randint(3, 8)):
        additionals.append(Additional(
            order_id=str(uuid.uuid4()),
            order_number=generate_order_number(),
            description=random.choice(descriptions),
            amount=round(random.uniform(150, 2500), 2),
            status=random.choice(["Pendiente", "Pendiente", "Aprobado", "Rechazado"]),
            requested_at=datetime.now(timezone.utc).isoformat()
        ))
    return additionals

@api_router.put("/additionals/{additional_id}/approve")
async def approve_additional(additional_id: str, user: dict = Depends(verify_token)):
    """Approve an additional charge"""
    return {
        "success": True,
        "message": "Adicional aprobado exitosamente",
        "additional_id": additional_id,
        "approved_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.put("/additionals/{additional_id}/reject")
async def reject_additional(additional_id: str, user: dict = Depends(verify_token)):
    """Reject an additional charge"""
    return {
        "success": True,
        "message": "Adicional rechazado",
        "additional_id": additional_id,
        "rejected_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/account-statement", response_model=AccountStatement)
async def get_account_statement(user: dict = Depends(verify_token)):
    """Get account statement with transactions"""
    transactions = []
    balance = 50000.0
    
    transaction_types = [
        ("Factura", "charge"),
        ("Pago recibido", "payment"),
        ("Adicional", "charge"),
        ("Nota de crédito", "credit"),
    ]
    
    for i in range(random.randint(15, 25)):
        trans_desc, trans_type = random.choice(transaction_types)
        
        if trans_type == "charge":
            amount = round(random.uniform(1500, 12000), 2)
            balance += amount
        else:
            amount = -round(random.uniform(1000, 15000), 2)
            balance += amount
        
        transactions.append(Transaction(
            date=datetime.now(timezone.utc).isoformat(),
            description=f"{trans_desc} - {generate_order_number()}" if trans_type != "payment" else trans_desc,
            type=trans_type,
            amount=amount,
            balance=round(balance, 2),
            order_number=generate_order_number() if trans_type != "payment" else None
        ))
    
    return AccountStatement(
        client_name=user["company"],
        account_number="TM-CLT-001234",
        current_balance=round(balance, 2),
        credit_limit=100000.0,
        available_credit=round(100000.0 - balance, 2),
        transactions=transactions
    )

# ==================== AI DOCUMENT EXTRACTION ====================

UPLOAD_DIR = Path("/tmp/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/ai/extract-document")
async def extract_document_with_ai(
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    """Extract information from BL, packing list, or commercial invoice using AI"""
    try:
        # Save file temporarily
        file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{file.filename}"
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Determine mime type
        mime_type = "application/pdf"
        if file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            mime_type = "image/png" if file.filename.lower().endswith('.png') else "image/jpeg"
        elif file.filename.lower().endswith('.txt'):
            mime_type = "text/plain"
        
        # Use Gemini for document analysis
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"doc-extract-{uuid.uuid4()}",
            system_message="""You are a logistics document analyzer. Extract shipping information from documents.
            Always respond in JSON format with these fields:
            {
                "bl_number": "string or null",
                "shipper": "string or null",
                "consignee": "string or null",
                "origin_port": "string or null",
                "destination_port": "string or null",
                "vessel_name": "string or null",
                "voyage_number": "string or null",
                "containers": [{"number": "string", "size": "string", "type": "string", "seal": "string", "weight": number, "products": [{"description": "string", "quantity": number, "sku": "string if visible"}]}],
                "total_weight": number or null,
                "total_packages": number or null,
                "cargo_description": "string or null",
                "incoterm": "string or null"
            }"""
        ).with_model("gemini", "gemini-2.5-flash")
        
        file_content = FileContentWithMimeType(
            file_path=str(file_path),
            mime_type=mime_type
        )
        
        response = await chat.send_message(UserMessage(
            text="Extract all shipping information from this document. Return ONLY valid JSON.",
            file_contents=[file_content]
        ))
        
        # Clean up
        file_path.unlink(missing_ok=True)
        
        # Parse response
        try:
            # Clean response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            data = json.loads(clean_response)
        except:
            data = {"error": "Could not parse AI response", "raw": response[:500]}
        
        return {
            "success": True,
            "extracted_data": data,
            "confidence_score": 0.85
        }
        
    except Exception as e:
        logging.error(f"Document extraction error: {e}")
        return {
            "success": False,
            "error": str(e),
            "extracted_data": None
        }

# ==================== AI CHATBOT WITH DATA ACCESS ====================

# Store chat histories in memory (in production, use database)
chat_sessions = {}

def get_system_data_context():
    """Get current system data for AI context"""
    # Get inventory data
    inventory = generate_cedis_inventory()
    inv_summary = {
        "total_products": len(inventory),
        "critical": len([i for i in inventory if i.stock_status == "critical"]),
        "low": len([i for i in inventory if i.stock_status == "low"]),
        "optimal": len([i for i in inventory if i.stock_status == "optimal"]),
        "products": [{"sku": i.sku, "name": i.name, "brand": i.brand, "stock": i.current_stock, "status": i.stock_status, "days_of_stock": i.days_of_stock} for i in inventory[:20]]
    }
    
    # Get supply chain data
    plans = generate_supply_chain_plan()
    sc_summary = {
        "emergency_actions": len([p for p in plans if p.action_required == "emergency"]),
        "orders_needed": len([p for p in plans if p.action_required in ["order_now", "emergency"]]),
        "products_needing_action": [{"sku": p.sku, "name": p.product_name, "action": p.action_required, "cedis_stock": p.cedis_current_stock, "demand": p.total_end_client_demand} for p in plans if p.action_required != "none"][:10]
    }
    
    # Get end clients overview
    end_clients_data = []
    for client in END_CLIENTS:
        client_inv = generate_end_client_inventory(client["name"])
        critical = len([i for i in client_inv if i.days_of_stock <= 3])
        needs_restock = len([i for i in client_inv if i.needs_restock])
        end_clients_data.append({
            "name": client["name"],
            "stores": len(set(i.store_code for i in client_inv)),
            "critical_items": critical,
            "needs_restock": needs_restock
        })
    
    # Get pending orders
    pending_origin = generate_pending_origin_orders()
    pending_dist = generate_pending_distribution_orders()
    
    return {
        "inventory": inv_summary,
        "supply_chain": sc_summary,
        "end_clients": end_clients_data,
        "pending_origin_orders": len(pending_origin),
        "pending_distributions": len(pending_dist),
        "routes": [{"origin": r["origin"], "destination": r["destination"], "days": r["transit_days"] + r["port_days"] + r["customs_days"] + r["inland_days"]} for r in TRANSIT_ROUTES]
    }

def execute_data_query(query_type: str, params: dict = None):
    """Execute a data query based on type"""
    params = params or {}
    
    if query_type == "inventory_summary":
        inventory = generate_cedis_inventory()
        return {
            "type": "table",
            "title": "Resumen de Inventario CEDIS",
            "columns": ["SKU", "Producto", "Marca", "Stock", "Mínimo", "Estado", "Días Stock"],
            "data": [[i.sku, i.name, i.brand, i.current_stock, i.minimum_stock, i.stock_status, round(i.days_of_stock, 1)] for i in inventory]
        }
    
    elif query_type == "inventory_by_brand":
        inventory = generate_cedis_inventory()
        brand_data = {}
        for item in inventory:
            if item.brand not in brand_data:
                brand_data[item.brand] = {"total_stock": 0, "products": 0, "critical": 0, "low": 0}
            brand_data[item.brand]["total_stock"] += item.current_stock
            brand_data[item.brand]["products"] += 1
            if item.stock_status == "critical":
                brand_data[item.brand]["critical"] += 1
            elif item.stock_status == "low":
                brand_data[item.brand]["low"] += 1
        
        return {
            "type": "chart",
            "chart_type": "bar",
            "title": "Stock por Marca",
            "labels": list(brand_data.keys()),
            "datasets": [
                {"label": "Stock Total", "data": [v["total_stock"] for v in brand_data.values()]},
            ]
        }
    
    elif query_type == "inventory_status_chart":
        inventory = generate_cedis_inventory()
        status_counts = {"Crítico": 0, "Bajo": 0, "Óptimo": 0, "Exceso": 0}
        for item in inventory:
            if item.stock_status == "critical":
                status_counts["Crítico"] += 1
            elif item.stock_status == "low":
                status_counts["Bajo"] += 1
            elif item.stock_status == "optimal":
                status_counts["Óptimo"] += 1
            else:
                status_counts["Exceso"] += 1
        
        return {
            "type": "chart",
            "chart_type": "pie",
            "title": "Distribución de Estado de Inventario",
            "labels": list(status_counts.keys()),
            "data": list(status_counts.values()),
            "colors": ["#ef4444", "#f59e0b", "#10b981", "#3b82f6"]
        }
    
    elif query_type == "end_client_summary":
        results = []
        for client in END_CLIENTS:
            client_inv = generate_end_client_inventory(client["name"])
            critical = len([i for i in client_inv if i.days_of_stock <= 3])
            needs_restock = len([i for i in client_inv if i.needs_restock])
            total_units = sum(i.suggested_quantity for i in client_inv if i.needs_restock)
            results.append([client["name"], len(set(i.store_code for i in client_inv)), critical, needs_restock, total_units])
        
        return {
            "type": "table",
            "title": "Resumen de Clientes Finales",
            "columns": ["Cliente", "Tiendas", "Items Críticos", "Necesita Restock", "Unidades a Enviar"],
            "data": results
        }
    
    elif query_type == "end_client_chart":
        results = []
        for client in END_CLIENTS:
            client_inv = generate_end_client_inventory(client["name"])
            critical = len([i for i in client_inv if i.days_of_stock <= 3])
            needs_restock = len([i for i in client_inv if i.needs_restock])
            results.append({"name": client["name"], "critical": critical, "needs_restock": needs_restock})
        
        return {
            "type": "chart",
            "chart_type": "bar",
            "title": "Estado de Clientes Finales",
            "labels": [r["name"] for r in results],
            "datasets": [
                {"label": "Críticos", "data": [r["critical"] for r in results], "color": "#ef4444"},
                {"label": "Necesita Restock", "data": [r["needs_restock"] for r in results], "color": "#f59e0b"}
            ]
        }
    
    elif query_type == "pending_orders_summary":
        pending_origin = generate_pending_origin_orders()
        pending_dist = generate_pending_distribution_orders()
        
        origin_data = [[p.product_name, p.brand, p.suggested_quantity, p.suggested_origin, p.lead_time_days] for p in pending_origin[:10]]
        dist_data = [[p.product_name, p.client_name, p.store_name, p.suggested_quantity, p.priority] for p in pending_dist[:10]]
        
        return {
            "type": "multi_table",
            "tables": [
                {
                    "title": f"Pedidos Pendientes a Origen ({len(pending_origin)} total)",
                    "columns": ["Producto", "Marca", "Cantidad", "Origen", "Lead Time"],
                    "data": origin_data
                },
                {
                    "title": f"Distribuciones Pendientes ({len(pending_dist)} total)",
                    "columns": ["Producto", "Cliente", "Tienda", "Cantidad", "Prioridad"],
                    "data": dist_data
                }
            ]
        }
    
    elif query_type == "transit_routes":
        routes_data = []
        for r in TRANSIT_ROUTES:
            total = r["transit_days"] + r["port_days"] + r["customs_days"] + r["inland_days"]
            routes_data.append([r["origin"], r["destination"], r["mode"], r["transit_days"], total, f"${r['cost']:,}"])
        
        return {
            "type": "table",
            "title": "Rutas de Tránsito Disponibles",
            "columns": ["Origen", "Destino", "Modo", "Días Tránsito", "Lead Time Total", "Costo"],
            "data": routes_data
        }
    
    elif query_type == "critical_products":
        inventory = generate_cedis_inventory()
        critical = [i for i in inventory if i.stock_status in ["critical", "low"]]
        
        return {
            "type": "table",
            "title": "Productos Críticos y Bajos en CEDIS",
            "columns": ["SKU", "Producto", "Marca", "Stock Actual", "Mínimo", "Días de Stock", "Estado"],
            "data": [[i.sku, i.name, i.brand, i.current_stock, i.minimum_stock, round(i.days_of_stock, 1), i.stock_status] for i in critical],
            "highlight_rows": [idx for idx, i in enumerate(critical) if i.stock_status == "critical"]
        }
    
    elif query_type == "client_detail":
        client_name = params.get("client_name", "Walmart")
        client_inv = generate_end_client_inventory(client_name)
        
        if not client_inv:
            return {"type": "error", "message": f"Cliente {client_name} no encontrado"}
        
        # Group by product
        by_product = {}
        for item in client_inv:
            if item.sku not in by_product:
                by_product[item.sku] = {"name": item.product_name, "brand": item.brand, "stores": 0, "critical": 0, "total_qty": 0}
            by_product[item.sku]["stores"] += 1
            if item.days_of_stock <= 3:
                by_product[item.sku]["critical"] += 1
            if item.needs_restock:
                by_product[item.sku]["total_qty"] += item.suggested_quantity
        
        return {
            "type": "table",
            "title": f"Detalle de Inventario - {client_name}",
            "columns": ["Producto", "Marca", "Tiendas", "Tiendas Críticas", "Unidades a Enviar"],
            "data": [[v["name"], v["brand"], v["stores"], v["critical"], v["total_qty"]] for v in by_product.values()]
        }
    
    elif query_type == "supply_chain_actions":
        plans = generate_supply_chain_plan()
        actions = [p for p in plans if p.action_required != "none"]
        
        return {
            "type": "table",
            "title": "Acciones de Cadena de Suministro",
            "columns": ["Producto", "Marca", "Stock CEDIS", "Demanda", "Acción", "Fecha Pedido", "Fecha Entrega"],
            "data": [[p.product_name, p.brand, p.cedis_current_stock, p.total_end_client_demand, p.action_required, p.cedis_reorder_date or "N/A", p.expected_inbound_date or "N/A"] for p in actions[:15]],
            "highlight_rows": [idx for idx, p in enumerate(actions[:15]) if p.action_required == "emergency"]
        }
    
    return {"type": "error", "message": "Tipo de consulta no reconocido"}

@api_router.post("/ai/chat")
async def chat_with_ai(request: ChatRequest, user: dict = Depends(verify_token)):
    """Chat with AI assistant with data access capabilities"""
    session_id = request.session_id or str(uuid.uuid4())
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    
    # Get current data context
    data_context = get_system_data_context()
    
    # Check for data/chart/report requests in the message
    message_lower = request.message.lower()
    data_response = None
    
    # Detect query intent
    if any(word in message_lower for word in ["inventario", "stock", "productos"]):
        if any(word in message_lower for word in ["gráfico", "grafico", "chart", "gráfica", "grafica"]):
            if "marca" in message_lower:
                data_response = execute_data_query("inventory_by_brand")
            else:
                data_response = execute_data_query("inventory_status_chart")
        elif any(word in message_lower for word in ["crítico", "critico", "bajo", "alerta"]):
            data_response = execute_data_query("critical_products")
        elif any(word in message_lower for word in ["reporte", "tabla", "listado", "detalle", "resumen"]):
            data_response = execute_data_query("inventory_summary")
    
    elif any(word in message_lower for word in ["walmart", "costco", "heb", "soriana", "chedraui", "la comer", "cliente final", "clientes finales", "retail"]):
        specific_client = None
        for client in ["walmart", "costco", "heb", "soriana", "chedraui", "la comer"]:
            if client in message_lower:
                specific_client = client.title()
                if client == "la comer":
                    specific_client = "La Comer"
                break
        
        if specific_client:
            data_response = execute_data_query("client_detail", {"client_name": specific_client})
        elif any(word in message_lower for word in ["gráfico", "grafico", "chart"]):
            data_response = execute_data_query("end_client_chart")
        else:
            data_response = execute_data_query("end_client_summary")
    
    elif any(word in message_lower for word in ["pendiente", "confirmar", "pedido", "distribución", "distribucion"]):
        data_response = execute_data_query("pending_orders_summary")
    
    elif any(word in message_lower for word in ["ruta", "tránsito", "transito", "lead time", "tiempo"]):
        data_response = execute_data_query("transit_routes")
    
    elif any(word in message_lower for word in ["cadena", "suministro", "acciones", "plan"]):
        data_response = execute_data_query("supply_chain_actions")
    
    # Build system message with data context
    system_message = f"""Eres el asistente virtual inteligente de Transmodal, una empresa de logística internacional.
Tienes acceso a los datos del sistema en tiempo real y puedes proporcionar información precisa.

DATOS ACTUALES DEL SISTEMA:
- Inventario CEDIS: {data_context['inventory']['total_products']} productos
  - Críticos: {data_context['inventory']['critical']}
  - Bajos: {data_context['inventory']['low']}
  - Óptimos: {data_context['inventory']['optimal']}
  
- Cadena de Suministro:
  - Acciones de emergencia: {data_context['supply_chain']['emergency_actions']}
  - Pedidos necesarios: {data_context['supply_chain']['orders_needed']}
  
- Clientes Finales: {json.dumps(data_context['end_clients'], ensure_ascii=False)}

- Pedidos pendientes a origen: {data_context['pending_origin_orders']}
- Distribuciones pendientes: {data_context['pending_distributions']}

- Rutas disponibles: {json.dumps(data_context['routes'], ensure_ascii=False)}

CAPACIDADES:
1. Puedes proporcionar datos específicos del inventario, órdenes y clientes
2. Puedes generar reportes y tablas con datos reales
3. Puedes crear gráficos (barras, pastel, líneas)
4. Puedes analizar tendencias y dar recomendaciones

Responde siempre en español de manera profesional. Cuando el usuario pida datos, gráficos o reportes,
indica que estás proporcionando información en tiempo real del sistema.

Si se genera un gráfico o tabla, menciona que se está mostrando visualmente."""

    # Get or create chat session
    if session_id not in chat_sessions:
        chat_sessions[session_id] = {
            "messages": [],
            "chat": LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=system_message
            ).with_model("anthropic", "claude-sonnet-4-20250514")
        }
    
    session = chat_sessions[session_id]
    
    try:
        response = await session["chat"].send_message(UserMessage(text=request.message))
        
        # Store messages
        session["messages"].append({"role": "user", "content": request.message})
        session["messages"].append({"role": "assistant", "content": response})
        
        return {
            "response": response,
            "session_id": session_id,
            "data": data_response  # Include chart/table data if generated
        }
    except Exception as e:
        logging.error(f"Chat error: {e}")
        return {
            "response": "Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.",
            "session_id": session_id,
            "data": None
        }
        session["messages"].append({"role": "user", "content": request.message})
        session["messages"].append({"role": "assistant", "content": response})
        
        return ChatResponse(response=response, session_id=session_id)
    except Exception as e:
        logging.error(f"Chat error: {e}")
        return ChatResponse(
            response="Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.",
            session_id=session_id
        )

@api_router.get("/ai/chat/history/{session_id}")
async def get_chat_history(session_id: str, user: dict = Depends(verify_token)):
    """Get chat history for a session"""
    if session_id in chat_sessions:
        return {"messages": chat_sessions[session_id]["messages"]}
    return {"messages": []}

# ==================== PENDING ORDERS (CONFIRMATIONS) ====================

def generate_pending_origin_orders():
    """Generate pending orders to origin that need confirmation"""
    plans = generate_supply_chain_plan()
    pending = []
    
    for plan in plans:
        if plan.action_required in ["emergency", "order_now"]:
            pending.append(PendingOriginOrder(
                sku=plan.sku,
                product_name=plan.product_name,
                brand=plan.brand,
                suggested_quantity=1800,  # Standard container quantity
                suggested_origin=plan.suggested_origin,
                route_details=plan.route_details,
                lead_time_days=plan.inbound_lead_time_days,
                expected_arrival=plan.expected_inbound_date or "",
                reason=plan.action_description,
                cedis_current_stock=plan.cedis_current_stock,
                cedis_deficit=plan.cedis_deficit,
                critical_end_locations=plan.critical_end_client_locations
            ))
    
    return pending[:15]  # Limit to 15 pending

def generate_pending_distribution_orders():
    """Generate pending distribution orders that need confirmation"""
    orders = generate_distribution_orders()
    pending = []
    
    for order in orders:
        if order.priority in ["critical", "high"]:
            # Get days of stock at store
            all_inventory = generate_end_client_inventory()
            store_item = next((i for i in all_inventory if i.store_code == order.store_code and i.sku == order.sku), None)
            days_of_stock = store_item.days_of_stock if store_item else 0
            
            pending.append(PendingDistributionOrder(
                sku=order.sku,
                product_name=order.product_name,
                brand=order.brand,
                client_name=order.client_name,
                store_code=order.store_code,
                store_name=order.store_name,
                region=order.region,
                suggested_quantity=order.quantity,
                distribution_time_days=order.distribution_time_days,
                ship_by_date=order.ship_by_date,
                expected_arrival=order.expected_arrival,
                days_of_stock_at_store=days_of_stock,
                priority=order.priority
            ))
    
    return pending[:20]

@api_router.post("/orders/pending-origin/{order_id}/confirm")
async def confirm_origin_order(order_id: str, quantity: int = None, user: dict = Depends(verify_token)):
    """Confirm a pending origin order"""
    return {
        "success": True,
        "message": "Orden a origen confirmada exitosamente",
        "order_id": order_id,
        "confirmed_quantity": quantity,
        "confirmed_at": datetime.now(timezone.utc).isoformat(),
        "next_steps": "Se ha generado la orden de compra y enviado al proveedor"
    }

@api_router.post("/orders/pending-origin/{order_id}/reject")
async def reject_origin_order(order_id: str, reason: str = "", user: dict = Depends(verify_token)):
    """Reject a pending origin order"""
    return {
        "success": True,
        "message": "Orden rechazada",
        "order_id": order_id,
        "reason": reason
    }

@api_router.post("/orders/pending-distribution/{order_id}/confirm")
async def confirm_distribution_order(order_id: str, quantity: int = None, user: dict = Depends(verify_token)):
    """Confirm a pending distribution order"""
    return {
        "success": True,
        "message": "Distribución confirmada exitosamente",
        "order_id": order_id,
        "confirmed_quantity": quantity,
        "confirmed_at": datetime.now(timezone.utc).isoformat(),
        "next_steps": "Se ha programado el envío desde CEDIS"
    }

@api_router.post("/orders/pending-distribution/{order_id}/reject")
async def reject_distribution_order(order_id: str, reason: str = "", user: dict = Depends(verify_token)):
    """Reject a pending distribution order"""
    return {
        "success": True,
        "message": "Distribución rechazada",
        "order_id": order_id,
        "reason": reason
    }

@api_router.post("/orders/confirm-bulk-origin")
async def confirm_bulk_origin_orders(order_ids: List[str], user: dict = Depends(verify_token)):
    """Confirm multiple origin orders at once"""
    return {
        "success": True,
        "message": f"{len(order_ids)} órdenes a origen confirmadas",
        "confirmed_count": len(order_ids),
        "confirmed_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/orders/confirm-bulk-distribution")
async def confirm_bulk_distribution_orders(order_ids: List[str], user: dict = Depends(verify_token)):
    """Confirm multiple distribution orders at once"""
    return {
        "success": True,
        "message": f"{len(order_ids)} distribuciones confirmadas",
        "confirmed_count": len(order_ids),
        "confirmed_at": datetime.now(timezone.utc).isoformat()
    }

# ==================== NEW ORDER WITH CONTAINERS ====================

@api_router.post("/orders/create-with-containers")
async def create_order_with_containers(order: OrderCreateNew, user: dict = Depends(verify_token)):
    """Create a new order with multiple containers"""
    order_id = str(uuid.uuid4())
    order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
    
    # Calculate totals
    total_weight = sum(c.weight for c in order.containers)
    total_products = sum(sum(p.quantity for p in c.products) for c in order.containers)
    
    new_order = {
        "id": order_id,
        "order_number": order_number,
        "bl_number": order.bl_number,
        "origin": order.origin,
        "destination": order.destination,
        "containers": [c.model_dump() for c in order.containers],
        "container_count": len(order.containers),
        "total_weight": total_weight,
        "total_products": total_products,
        "incoterm": order.incoterm,
        "notes": order.notes,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store in database
    await db.orders_new.insert_one(new_order)
    
    return {
        "success": True,
        "order": {k: v for k, v in new_order.items() if k != "_id"},
        "message": f"Orden {order_number} creada con {len(order.containers)} contenedor(es)"
    }

# ==================== OPERATIONS MODULE - MODELS ====================

class UserType(BaseModel):
    """Tipos de usuario del sistema"""
    type: str  # "client", "operations", "admin"
    permissions: List[str] = []

class OperationsUser(BaseModel):
    """Usuario del portal de operaciones"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    full_name: str
    user_type: str = "operations"
    is_active: bool = True

class ContainerCost(BaseModel):
    """Costos asociados a un contenedor"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_id: str
    container_number: str
    cost_type: str  # flete_maritimo, flete_ferroviario, maniobras_portuarias, maniobra_patio_vacios, transporte_terrestre, almacenaje, servicios_aduanales, estadias, demoras
    description: str
    amount: float
    currency: str = "USD"
    date: str
    vendor: Optional[str] = None
    invoice_number: Optional[str] = None

class ContainerRevenue(BaseModel):
    """Ingresos asociados a un contenedor"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_id: str
    container_number: str
    revenue_type: str  # flete_cobrado, servicios_adicionales, almacenaje_cobrado, maniobras_cobradas
    description: str
    amount: float
    currency: str = "USD"
    date: str
    client_name: str
    invoice_number: Optional[str] = None

class ContainerProfitability(BaseModel):
    """Rentabilidad de un contenedor"""
    container_id: str
    container_number: str
    client_name: str
    origin: str
    destination: str
    status: str
    total_revenue: float
    total_costs: float
    profit: float
    margin_percent: float
    costs_breakdown: List[ContainerCost]
    revenue_breakdown: List[ContainerRevenue]

class ProfitabilityDashboard(BaseModel):
    """Dashboard de rentabilidad general"""
    period_start: str
    period_end: str
    total_revenue: float
    total_costs: float
    total_profit: float
    margin_percent: float
    containers_count: int
    by_client: List[dict]
    by_route: List[dict]
    top_profitable: List[dict]
    least_profitable: List[dict]
    monthly_trend: List[dict]

# ==================== PRICING/QUOTES MODULE - MODELS ====================

# Tipos de proveedores
SUPPLIER_CATEGORIES = {
    "ferrocarril": "Ferrocarril",
    "terminal_portuaria": "Terminal Portuaria", 
    "transportista": "Transportista",
    "custodia": "Custodia",
    "terminal_intermodal": "Terminal Intermodal",
    "naviera": "Naviera",
    "agente_aduanal": "Agente Aduanal"
}

class SupplierTariff(BaseModel):
    """Tarifa de un proveedor específico"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    supplier_name: str
    category: str  # ferrocarril, terminal_portuaria, transportista, custodia, terminal_intermodal
    service_name: str  # Nombre del servicio
    origin: Optional[str] = None
    destination: Optional[str] = None
    container_size: Optional[str] = None  # 20ft, 40ft, 40ft HC, 53ft
    unit: str = "por_contenedor"  # por_contenedor, por_dia, por_tonelada, fijo
    cost: float
    currency: str = "MXN"
    includes_return: bool = False  # Para ferrocarril
    is_imo: bool = False  # Carga peligrosa
    transit_days: Optional[int] = None
    validity_start: str = ""
    validity_end: str = ""
    notes: Optional[str] = None

class PurchaseSupplier(BaseModel):
    """Proveedor en el tarifario de compras"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    active: bool = True
    tariffs: List[SupplierTariff] = []

class SupplierQuote(BaseModel):
    """Cotización de un proveedor para una ruta"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_name: str
    supplier_type: str  # naviera, ferroviaria, transportista
    cost: float
    currency: str = "MXN"
    transit_days: int
    validity_start: str
    validity_end: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None

class RoutePrice(BaseModel):
    """Precio de una ruta específica con múltiples proveedores"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    origin: str
    destination: str
    transport_mode: str  # maritime, rail, truck, intermodal
    container_size: str  # 20ft, 40ft, 40ft HC
    container_type: str  # dry, reefer
    # Costos de proveedores
    supplier_quotes: List[SupplierQuote] = []
    avg_cost: float = 0.0  # Costo promedio calculado
    min_cost: float = 0.0  # Costo mínimo
    max_cost: float = 0.0  # Costo máximo
    best_supplier: Optional[str] = None  # Proveedor con mejor precio
    # Precio de venta
    suggested_price: float  # Precio sugerido al cliente
    margin_percent: float
    transit_days: int
    validity_start: str
    validity_end: str
    is_active: bool = True
    notes: Optional[str] = None

class CostComponent(BaseModel):
    """Componente de costo individual para una tarifa"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    amount: float
    is_base: bool = False  # True si es la tarifa base principal

class SaleService(BaseModel):
    """Servicio de venta incluido en la tarifa"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # 'tarifa' (incluido) o 'extra' (adicional opcional)
    amount: float

class PreapprovedTariff(BaseModel):
    """Tarifa pre-aprobada con costos desglosados y precio de venta"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    route_id: str  # Referencia a la ruta
    origin: str
    destination: str
    transport_mode: str
    container_size: str
    # Costos desglosados
    cost_components: List[CostComponent] = []
    total_cost: float = 0.0
    # Margen y precio de venta
    margin_percent: float = 20.0
    sale_price: float = 0.0  # Calculado: total_cost / (1 - margin)
    # Servicios incluidos en la venta (lo que se muestra al cliente)
    sale_services: List[SaleService] = []
    total_sale: float = 0.0
    # Metadata
    transit_days: int = 0
    validity_start: str = ""
    validity_end: str = ""
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = "sistema"
    notes: Optional[str] = None

class AdditionalService(BaseModel):
    """Servicio adicional para cotizaciones"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    description: str
    unit: str  # per_container, per_day, per_ton, fixed
    base_cost: float
    suggested_price: float
    is_active: bool = True

class QuoteLineItem(BaseModel):
    """Línea de cotización"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_type: str  # route, service
    description: str
    quantity: int = 1
    unit_price: float
    unit_cost: float
    total_price: float
    total_cost: float
    margin_percent: float

class Quote(BaseModel):
    """Cotización completa"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    is_new_client: bool = False
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    valid_until: str
    status: str = "draft"  # draft, sent, accepted, rejected, expired
    items: List[QuoteLineItem] = []
    subtotal: float = 0.0
    tax_percent: float = 16.0
    tax_amount: float = 0.0
    total: float = 0.0
    total_cost: float = 0.0
    total_margin: float = 0.0
    margin_percent: float = 0.0
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

# ==================== OPERATIONS MOCK DATA ====================

COST_TYPES = [
    {"code": "flete_maritimo", "name": "Flete Marítimo", "icon": "ship"},
    {"code": "flete_ferroviario", "name": "Flete Ferroviario", "icon": "train"},
    {"code": "maniobras_portuarias", "name": "Maniobras Portuarias", "icon": "anchor"},
    {"code": "maniobra_patio_vacios", "name": "Maniobra Patio de Vacíos", "icon": "box"},
    {"code": "transporte_terrestre", "name": "Transporte Terrestre", "icon": "truck"},
    {"code": "almacenaje", "name": "Almacenaje", "icon": "warehouse"},
    {"code": "servicios_aduanales", "name": "Servicios Aduanales", "icon": "file-text"},
    {"code": "estadias", "name": "Estadías", "icon": "clock"},
    {"code": "demoras", "name": "Demoras", "icon": "alert-triangle"},
]

REVENUE_TYPES = [
    {"code": "flete_cobrado", "name": "Flete Cobrado"},
    {"code": "servicios_adicionales", "name": "Servicios Adicionales"},
    {"code": "almacenaje_cobrado", "name": "Almacenaje Cobrado"},
    {"code": "maniobras_cobradas", "name": "Maniobras Cobradas"},
]

MOCK_OPERATIONS_USER = {
    "id": "ops_001",
    "username": "operaciones",
    "email": "operaciones@transmodal.com",
    "full_name": "Juan Pérez",
    "user_type": "operations"
}

CLIENTS_LIST = [
    "Pernod Ricard", "Diageo", "Beam Suntory", "Brown-Forman", "Campari Group",
    "AB InBev", "Heineken", "Coca-Cola FEMSA", "Nestlé", "Unilever"
]

def generate_container_costs(container_id: str, container_number: str):
    """Genera costos mock para un contenedor"""
    costs = []
    base_date = datetime.now(timezone.utc) - timedelta(days=random.randint(5, 30))
    
    # Flete marítimo o ferroviario
    mode = random.choice(["flete_maritimo", "flete_ferroviario"])
    costs.append(ContainerCost(
        container_id=container_id,
        container_number=container_number,
        cost_type=mode,
        description="Flete principal" if mode == "flete_maritimo" else "Flete ferroviario",
        amount=round(random.uniform(1800, 3500), 2),
        date=base_date.strftime("%Y-%m-%d"),
        vendor=random.choice(["MSC", "Maersk", "CMA CGM", "Ferromex", "KCSM"])
    ))
    
    # Maniobras portuarias
    costs.append(ContainerCost(
        container_id=container_id,
        container_number=container_number,
        cost_type="maniobras_portuarias",
        description="Maniobras en puerto",
        amount=round(random.uniform(150, 400), 2),
        date=(base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        vendor=random.choice(["SSA", "APM Terminals", "Hutchison"])
    ))
    
    # Transporte terrestre
    costs.append(ContainerCost(
        container_id=container_id,
        container_number=container_number,
        cost_type="transporte_terrestre",
        description="Arrastre local",
        amount=round(random.uniform(200, 600), 2),
        date=(base_date + timedelta(days=2)).strftime("%Y-%m-%d"),
        vendor=random.choice(["Transportes del Norte", "Fletes Rápidos", "Logística Express"])
    ))
    
    # Servicios aduanales
    costs.append(ContainerCost(
        container_id=container_id,
        container_number=container_number,
        cost_type="servicios_aduanales",
        description="Honorarios y trámites",
        amount=round(random.uniform(180, 350), 2),
        date=(base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
        vendor=random.choice(["Agencia Aduanal López", "Customs Pro", "Despachos Express"])
    ))
    
    # Opcionalmente agregar costos extras
    if random.random() > 0.6:
        costs.append(ContainerCost(
            container_id=container_id,
            container_number=container_number,
            cost_type="almacenaje",
            description=f"Almacenaje {random.randint(1,5)} días",
            amount=round(random.uniform(50, 200), 2),
            date=(base_date + timedelta(days=3)).strftime("%Y-%m-%d")
        ))
    
    if random.random() > 0.7:
        costs.append(ContainerCost(
            container_id=container_id,
            container_number=container_number,
            cost_type="estadias",
            description=f"Estadía {random.randint(1,3)} días",
            amount=round(random.uniform(100, 350), 2),
            date=(base_date + timedelta(days=4)).strftime("%Y-%m-%d")
        ))
    
    if random.random() > 0.8:
        costs.append(ContainerCost(
            container_id=container_id,
            container_number=container_number,
            cost_type="demoras",
            description="Demora por inspección",
            amount=round(random.uniform(150, 400), 2),
            date=(base_date + timedelta(days=5)).strftime("%Y-%m-%d")
        ))
    
    if random.random() > 0.7:
        costs.append(ContainerCost(
            container_id=container_id,
            container_number=container_number,
            cost_type="maniobra_patio_vacios",
            description="Maniobra retorno vacío",
            amount=round(random.uniform(80, 180), 2),
            date=(base_date + timedelta(days=6)).strftime("%Y-%m-%d")
        ))
    
    return costs

def generate_container_revenue(container_id: str, container_number: str, client_name: str, total_costs: float):
    """Genera ingresos mock para un contenedor basado en los costos"""
    revenues = []
    base_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10))
    
    # Margen objetivo entre 15% y 35%
    target_margin = random.uniform(0.15, 0.35)
    base_revenue = total_costs * (1 + target_margin)
    
    # Flete cobrado (80% del ingreso)
    flete_amount = base_revenue * 0.80
    revenues.append(ContainerRevenue(
        container_id=container_id,
        container_number=container_number,
        revenue_type="flete_cobrado",
        description="Servicio de transporte integral",
        amount=round(flete_amount, 2),
        date=base_date.strftime("%Y-%m-%d"),
        client_name=client_name,
        invoice_number=f"FAC-{random.randint(10000, 99999)}"
    ))
    
    # Servicios adicionales
    if random.random() > 0.5:
        revenues.append(ContainerRevenue(
            container_id=container_id,
            container_number=container_number,
            revenue_type="servicios_adicionales",
            description="Servicios adicionales",
            amount=round(base_revenue * random.uniform(0.05, 0.15), 2),
            date=base_date.strftime("%Y-%m-%d"),
            client_name=client_name
        ))
    
    # Almacenaje cobrado
    if random.random() > 0.6:
        revenues.append(ContainerRevenue(
            container_id=container_id,
            container_number=container_number,
            revenue_type="almacenaje_cobrado",
            description="Almacenaje en CEDIS",
            amount=round(random.uniform(100, 400), 2),
            date=base_date.strftime("%Y-%m-%d"),
            client_name=client_name
        ))
    
    return revenues

def generate_operations_containers():
    """Genera contenedores con datos de rentabilidad"""
    containers = []
    
    for i in range(50):
        container_id = str(uuid.uuid4())
        container_number = generate_container_number()
        client = random.choice(CLIENTS_LIST)
        origin = random.choice(["Shanghai", "Rotterdam", "Hamburg", "Los Angeles", "Singapore"])
        destination = random.choice(["Manzanillo", "Veracruz", "Lázaro Cárdenas", "Altamira"])
        status = random.choice(["delivered", "in_transit", "at_port", "customs"])
        
        # Generar costos e ingresos
        costs = generate_container_costs(container_id, container_number)
        total_costs = sum(c.amount for c in costs)
        revenues = generate_container_revenue(container_id, container_number, client, total_costs)
        total_revenue = sum(r.amount for r in revenues)
        
        profit = total_revenue - total_costs
        margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
        
        containers.append(ContainerProfitability(
            container_id=container_id,
            container_number=container_number,
            client_name=client,
            origin=origin,
            destination=destination,
            status=status,
            total_revenue=round(total_revenue, 2),
            total_costs=round(total_costs, 2),
            profit=round(profit, 2),
            margin_percent=round(margin, 1),
            costs_breakdown=costs,
            revenue_breakdown=revenues
        ))
    
    return containers

# Cache para datos de operaciones
_operations_containers_cache = None

def get_operations_containers():
    global _operations_containers_cache
    if _operations_containers_cache is None:
        _operations_containers_cache = generate_operations_containers()
    return _operations_containers_cache

def reset_operations_cache():
    global _operations_containers_cache
    _operations_containers_cache = None

# ==================== TARIFARIO DE COMPRAS (PROVEEDORES) ====================

_purchase_suppliers_cache = None

def generate_suppliers_with_tariffs():
    """Genera el catálogo de proveedores con sus tarifas reales de Transmodal"""
    suppliers = []
    validity_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    validity_end = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")
    
    # ==================== FERROCARRIL ====================
    # Ferromex
    ferromex = PurchaseSupplier(
        id="sup_ferromex",
        name="Ferromex",
        category="ferrocarril",
        contact_name="Ventas Corporativas",
        contact_email="ventas@ferromex.com.mx",
        contact_phone="55 5000 0000",
        tariffs=[
            # Veracruz - Importación
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Veracruz → CDMX", origin="Veracruz", destination="CDMX",
                container_size="20ft", cost=14140, includes_return=False, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Veracruz → CDMX", origin="Veracruz", destination="CDMX",
                container_size="20ft", cost=17180, includes_return=True, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Con retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Veracruz → CDMX IMO", origin="Veracruz", destination="CDMX",
                container_size="20ft", cost=19350, is_imo=True, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Carga peligrosa"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Veracruz → CDMX", origin="Veracruz", destination="CDMX",
                container_size="40ft", cost=14900, includes_return=False, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Veracruz → CDMX", origin="Veracruz", destination="CDMX",
                container_size="40ft", cost=18400, includes_return=True, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Con retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Veracruz → CDMX IMO", origin="Veracruz", destination="CDMX",
                container_size="40ft", cost=20670, is_imo=True, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Carga peligrosa"),
            # Veracruz - Exportación
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="CDMX → Veracruz", origin="CDMX", destination="Veracruz",
                container_size="20ft", cost=15600, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Exportación"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="CDMX → Veracruz", origin="CDMX", destination="Veracruz",
                container_size="40ft", cost=16290, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Exportación"),
            # Manzanillo - Importación
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Manzanillo → CDMX", origin="Manzanillo", destination="CDMX",
                container_size="20ft", cost=21450, includes_return=False, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Manzanillo → CDMX", origin="Manzanillo", destination="CDMX",
                container_size="20ft", cost=25400, includes_return=True, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Con retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Manzanillo → CDMX", origin="Manzanillo", destination="CDMX",
                container_size="40ft", cost=24180, includes_return=False, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Manzanillo → CDMX", origin="Manzanillo", destination="CDMX",
                container_size="40ft", cost=30530, includes_return=True, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Con retorno"),
            # Manzanillo - Exportación
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="CDMX → Manzanillo", origin="CDMX", destination="Manzanillo",
                container_size="20ft", cost=22350, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Exportación"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="CDMX → Manzanillo", origin="CDMX", destination="Manzanillo",
                container_size="40ft", cost=25620, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Exportación"),
            # Lázaro Cárdenas
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Lázaro Cárdenas → CDMX", origin="Lázaro Cárdenas", destination="CDMX",
                container_size="20ft", cost=25140, includes_return=False, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Lázaro Cárdenas → CDMX", origin="Lázaro Cárdenas", destination="CDMX",
                container_size="40ft", cost=33390, includes_return=False, transit_days=3,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
            # Rutas Nacionales
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Mexicali → CDMX", origin="Mexicali", destination="CDMX",
                container_size="53ft", cost=42090, transit_days=5,
                validity_start=validity_start, validity_end=validity_end),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="CDMX → Mexicali", origin="CDMX", destination="Mexicali",
                container_size="53ft", cost=62950, transit_days=5,
                validity_start=validity_start, validity_end=validity_end),
            SupplierTariff(supplier_id="sup_ferromex", supplier_name="Ferromex", category="ferrocarril",
                service_name="Cd. Obregón → CDMX", origin="Cd. Obregón", destination="CDMX",
                container_size="53ft", cost=35340, transit_days=4,
                validity_start=validity_start, validity_end=validity_end),
        ]
    )
    suppliers.append(ferromex)
    
    # ==================== TERMINALES PORTUARIAS ====================
    # Terminal Veracruz (ICAVE/SSA)
    terminal_veracruz = PurchaseSupplier(
        id="sup_terminal_veracruz",
        name="ICAVE Veracruz",
        category="terminal_portuaria",
        contact_name="Operaciones",
        contact_email="operaciones@icave.com.mx",
        tariffs=[
            SupplierTariff(supplier_id="sup_terminal_veracruz", supplier_name="ICAVE Veracruz", category="terminal_portuaria",
                service_name="Maniobras Importación", origin="Veracruz", container_size="20ft",
                cost=22024, unit="por_contenedor",
                validity_start=validity_start, validity_end=validity_end),
            SupplierTariff(supplier_id="sup_terminal_veracruz", supplier_name="ICAVE Veracruz", category="terminal_portuaria",
                service_name="Maniobras Importación", origin="Veracruz", container_size="40ft",
                cost=22024, unit="por_contenedor",
                validity_start=validity_start, validity_end=validity_end),
        ]
    )
    suppliers.append(terminal_veracruz)
    
    # Terminal Manzanillo (CONTECON/SSA)
    terminal_manzanillo = PurchaseSupplier(
        id="sup_terminal_manzanillo",
        name="CONTECON Manzanillo",
        category="terminal_portuaria",
        contact_name="Operaciones",
        contact_email="operaciones@contecon.com.mx",
        tariffs=[
            SupplierTariff(supplier_id="sup_terminal_manzanillo", supplier_name="CONTECON Manzanillo", category="terminal_portuaria",
                service_name="Maniobras Importación", origin="Manzanillo", container_size="20ft",
                cost=16800, unit="por_contenedor",
                validity_start=validity_start, validity_end=validity_end),
            SupplierTariff(supplier_id="sup_terminal_manzanillo", supplier_name="CONTECON Manzanillo", category="terminal_portuaria",
                service_name="Maniobras Importación", origin="Manzanillo", container_size="40ft",
                cost=16800, unit="por_contenedor",
                validity_start=validity_start, validity_end=validity_end),
        ]
    )
    suppliers.append(terminal_manzanillo)
    
    # Terminal Lázaro Cárdenas
    terminal_lazaro = PurchaseSupplier(
        id="sup_terminal_lazaro",
        name="APM Terminals Lázaro Cárdenas",
        category="terminal_portuaria",
        contact_name="Operaciones",
        contact_email="operaciones@apmterminals.com",
        tariffs=[
            SupplierTariff(supplier_id="sup_terminal_lazaro", supplier_name="APM Terminals Lázaro Cárdenas", category="terminal_portuaria",
                service_name="Maniobras Importación", origin="Lázaro Cárdenas", container_size="20ft",
                cost=15108, unit="por_contenedor",
                validity_start=validity_start, validity_end=validity_end),
            SupplierTariff(supplier_id="sup_terminal_lazaro", supplier_name="APM Terminals Lázaro Cárdenas", category="terminal_portuaria",
                service_name="Maniobras Importación", origin="Lázaro Cárdenas", container_size="40ft",
                cost=15108, unit="por_contenedor",
                validity_start=validity_start, validity_end=validity_end),
        ]
    )
    suppliers.append(terminal_lazaro)
    
    # ==================== TRANSPORTISTAS (SPF) ====================
    transmodal_spf = PurchaseSupplier(
        id="sup_transmodal_spf",
        name="Transmodal SPF",
        category="transportista",
        contact_name="Flotilla SPF",
        contact_email="spf@transmodal.com.mx",
        tariffs=[
            # Veracruz
            SupplierTariff(supplier_id="sup_transmodal_spf", supplier_name="Transmodal SPF", category="transportista",
                service_name="Veracruz ↔ CDMX Sencillo", origin="Veracruz", destination="CDMX",
                container_size="Sencillo", cost=33900, transit_days=1,
                validity_start=validity_start, validity_end=validity_end, notes="Puerta a Puerta RT - 25 Ton"),
            SupplierTariff(supplier_id="sup_transmodal_spf", supplier_name="Transmodal SPF", category="transportista",
                service_name="Veracruz ↔ CDMX Full", origin="Veracruz", destination="CDMX",
                container_size="Full", cost=53600, transit_days=1,
                validity_start=validity_start, validity_end=validity_end, notes="Puerta a Puerta RT - 22.5 Ton"),
            # Manzanillo
            SupplierTariff(supplier_id="sup_transmodal_spf", supplier_name="Transmodal SPF", category="transportista",
                service_name="Manzanillo ↔ CDMX Sencillo", origin="Manzanillo", destination="CDMX",
                container_size="Sencillo", cost=65600, transit_days=2,
                validity_start=validity_start, validity_end=validity_end, notes="Puerta a Puerta RT - 25 Ton"),
            SupplierTariff(supplier_id="sup_transmodal_spf", supplier_name="Transmodal SPF", category="transportista",
                service_name="Manzanillo ↔ CDMX Full", origin="Manzanillo", destination="CDMX",
                container_size="Full", cost=90700, transit_days=2,
                validity_start=validity_start, validity_end=validity_end, notes="Puerta a Puerta RT - 22.5 Ton"),
            # Lázaro Cárdenas
            SupplierTariff(supplier_id="sup_transmodal_spf", supplier_name="Transmodal SPF", category="transportista",
                service_name="Lázaro Cárdenas ↔ CDMX Sencillo", origin="Lázaro Cárdenas", destination="CDMX",
                container_size="Sencillo", cost=53400, transit_days=2,
                validity_start=validity_start, validity_end=validity_end, notes="Puerta a Puerta RT - 25 Ton"),
            SupplierTariff(supplier_id="sup_transmodal_spf", supplier_name="Transmodal SPF", category="transportista",
                service_name="Lázaro Cárdenas ↔ CDMX Full", origin="Lázaro Cárdenas", destination="CDMX",
                container_size="Full", cost=69300, transit_days=2,
                validity_start=validity_start, validity_end=validity_end, notes="Puerta a Puerta RT - 22.5 Ton"),
        ]
    )
    suppliers.append(transmodal_spf)
    
    # ==================== DISTRIBUCIÓN NACIONAL ====================
    transmodal_dist = PurchaseSupplier(
        id="sup_transmodal_dist",
        name="Transmodal Distribución",
        category="transportista",
        contact_name="Distribución Nacional",
        contact_email="distribucion@transmodal.com.mx",
        tariffs=[
            SupplierTariff(supplier_id="sup_transmodal_dist", supplier_name="Transmodal Distribución", category="transportista",
                service_name="Guadalajara → México", origin="Guadalajara", destination="México",
                container_size="53ft", cost=25000, transit_days=1,
                validity_start=validity_start, validity_end=validity_end, notes="One Way - 25 Ton"),
            SupplierTariff(supplier_id="sup_transmodal_dist", supplier_name="Transmodal Distribución", category="transportista",
                service_name="México → Guadalajara", origin="México", destination="Guadalajara",
                container_size="53ft", cost=27300, transit_days=1,
                validity_start=validity_start, validity_end=validity_end, notes="One Way - 25 Ton"),
            SupplierTariff(supplier_id="sup_transmodal_dist", supplier_name="Transmodal Distribución", category="transportista",
                service_name="Guadalajara → Monterrey", origin="Guadalajara", destination="Monterrey",
                container_size="53ft", cost=32000, transit_days=1,
                validity_start=validity_start, validity_end=validity_end, notes="One Way - 25 Ton"),
            SupplierTariff(supplier_id="sup_transmodal_dist", supplier_name="Transmodal Distribución", category="transportista",
                service_name="Monterrey → México", origin="Monterrey", destination="México",
                container_size="53ft", cost=30500, transit_days=1,
                validity_start=validity_start, validity_end=validity_end, notes="One Way - 25 Ton"),
            SupplierTariff(supplier_id="sup_transmodal_dist", supplier_name="Transmodal Distribución", category="transportista",
                service_name="México → Monterrey", origin="México", destination="Monterrey",
                container_size="53ft", cost=35650, transit_days=1,
                validity_start=validity_start, validity_end=validity_end, notes="One Way - 25 Ton"),
        ]
    )
    suppliers.append(transmodal_dist)
    
    # ==================== TERMINALES INTERMODALES (VEREX) ====================
    verex = PurchaseSupplier(
        id="sup_verex",
        name="VEREX Transmodal",
        category="terminal_intermodal",
        contact_name="Operaciones VEREX",
        contact_email="operaciones@transmodal.com.mx",
        tariffs=[
            SupplierTariff(supplier_id="sup_verex", supplier_name="VEREX Transmodal", category="terminal_intermodal",
                service_name="Veracruz → Ferrovalle", origin="Veracruz", destination="Ferrovalle",
                container_size="20ft/40ft", cost=35220, includes_return=False, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="FFCC + Inspección sin retorno"),
            SupplierTariff(supplier_id="sup_verex", supplier_name="VEREX Transmodal", category="terminal_intermodal",
                service_name="Veracruz → Ferrovalle RT", origin="Veracruz", destination="Ferrovalle",
                container_size="20ft/40ft", cost=39680, includes_return=True, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="FFCC + Inspección con retorno"),
            SupplierTariff(supplier_id="sup_verex", supplier_name="VEREX Transmodal", category="terminal_intermodal",
                service_name="Veracruz → TILH", origin="Veracruz", destination="TILH",
                container_size="20ft", cost=31330, includes_return=False, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
            SupplierTariff(supplier_id="sup_verex", supplier_name="VEREX Transmodal", category="terminal_intermodal",
                service_name="Veracruz → TILH", origin="Veracruz", destination="TILH",
                container_size="40ft", cost=31930, includes_return=False, transit_days=4,
                validity_start=validity_start, validity_end=validity_end, notes="Sin retorno"),
        ]
    )
    suppliers.append(verex)
    
    return suppliers

def get_purchase_suppliers():
    global _purchase_suppliers_cache
    if _purchase_suppliers_cache is None:
        _purchase_suppliers_cache = generate_suppliers_with_tariffs()
    return _purchase_suppliers_cache

def reset_purchase_suppliers_cache():
    global _purchase_suppliers_cache
    _purchase_suppliers_cache = None

# ==================== ROUTES PRICING DATA ====================

# Lista de proveedores por tipo de transporte
SUPPLIERS = {
    "maritime": [
        {"name": "MSC", "type": "naviera"},
        {"name": "Maersk", "type": "naviera"},
        {"name": "CMA CGM", "type": "naviera"},
        {"name": "Hapag-Lloyd", "type": "naviera"},
        {"name": "COSCO", "type": "naviera"},
        {"name": "Evergreen", "type": "naviera"},
    ],
    "rail": [
        {"name": "Ferromex", "type": "ferroviaria"},
        {"name": "KCSM", "type": "ferroviaria"},
        {"name": "BNSF", "type": "ferroviaria"},
        {"name": "Union Pacific", "type": "ferroviaria"},
    ],
    "intermodal": [
        {"name": "JB Hunt", "type": "intermodal"},
        {"name": "Schneider", "type": "intermodal"},
        {"name": "XPO Logistics", "type": "intermodal"},
        {"name": "Hub Group", "type": "intermodal"},
    ],
    "truck": [
        {"name": "Transportes del Norte", "type": "transportista"},
        {"name": "Fletes Rápidos", "type": "transportista"},
        {"name": "Logística Express", "type": "transportista"},
        {"name": "Carga Segura", "type": "transportista"},
    ]
}

def generate_supplier_quotes(transport_mode: str, base_cost: float, transit_days: int):
    """Genera cotizaciones de proveedores para una ruta"""
    suppliers = SUPPLIERS.get(transport_mode, SUPPLIERS["truck"])
    num_suppliers = random.randint(2, min(5, len(suppliers)))
    selected_suppliers = random.sample(suppliers, num_suppliers)
    
    quotes = []
    for supplier in selected_suppliers:
        # Variación de precio entre -15% y +20% del costo base
        variation = random.uniform(-0.15, 0.20)
        cost = base_cost * (1 + variation)
        # Variación de días de tránsito
        days_variation = random.randint(-3, 5)
        supplier_days = max(5, transit_days + days_variation)
        
        quotes.append(SupplierQuote(
            supplier_name=supplier["name"],
            supplier_type=supplier["type"],
            cost=round(cost, 2),
            transit_days=supplier_days,
            validity_start=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            validity_end=(datetime.now(timezone.utc) + timedelta(days=60)).strftime("%Y-%m-%d"),
            contact_name=f"Contacto {supplier['name']}",
            contact_email=f"ventas@{supplier['name'].lower().replace(' ', '')}.com"
        ))
    
    return quotes

def generate_route_prices():
    """Genera precios de rutas con tarifas reales de Transmodal"""
    routes = []
    
    # ==================== TARIFAS REALES TRANSMODAL ====================
    TARIFAS_TRANSMODAL = {
        "veracruz": {
            "puerto": "Veracruz",
            "descripcion": "Puerto del Golfo de México - Conexión Europa, USA, Sudamérica",
            "ffcc_importacion": {
                "modalidad": "FFCC",
                "tipo": "Ferrocarril",
                "trafico": "Importación",
                "ruta": "Veracruz → CDMX",
                "tarifas": [
                    {"tamano": "20'", "sin_retorno": 14140, "con_retorno": 17180, "imo_sin_retorno": 19350, "imo_con_retorno": 22380, "maniobras": 22024},
                    {"tamano": "40'", "sin_retorno": 14900, "con_retorno": 18400, "imo_sin_retorno": 20670, "imo_con_retorno": 24170, "maniobras": 22024}
                ]
            },
            "ffcc_exportacion": {
                "modalidad": "FFCC",
                "tipo": "Ferrocarril",
                "trafico": "Exportación",
                "ruta": "CDMX → Veracruz",
                "tarifas": [
                    {"tamano": "20'", "tarifa": 15600, "imo": 20440},
                    {"tamano": "40'", "tarifa": 16290, "imo": 21640}
                ]
            },
            "verex": {
                "modalidad": "VEREX",
                "tipo": "FFCC + Inspección",
                "trafico": "Importación",
                "tarifas": [
                    {"ruta": "Veracruz → Ferrovalle", "tamano": "20'/40'", "sin_retorno": 35220, "con_retorno": 39680},
                    {"ruta": "Veracruz → TILH", "tamano": "20'", "sin_retorno": 31330, "con_retorno": 33200},
                    {"ruta": "Veracruz → TILH", "tamano": "40'", "sin_retorno": 31930, "con_retorno": 33960}
                ]
            },
            "spf": {
                "modalidad": "SPF",
                "tipo": "Camión Puerta a Puerta RT",
                "trafico": "Importación/Exportación",
                "ruta": "Veracruz ↔ México",
                "tarifas": [
                    {"tipo_unidad": "Sencillo", "tarifa_rt": 33900, "peso_max": "25 Ton"},
                    {"tipo_unidad": "Full", "tarifa_rt": 53600, "peso_max": "22.5 Ton"}
                ]
            }
        },
        "manzanillo": {
            "puerto": "Manzanillo",
            "descripcion": "Puerto del Pacífico - Gateway Comercio Asia",
            "ffcc_importacion": {
                "modalidad": "FFCC",
                "tipo": "Ferrocarril",
                "trafico": "Importación",
                "ruta": "Manzanillo → CDMX",
                "tarifas": [
                    {"tamano": "20'", "sin_retorno": 21450, "con_retorno": 25400, "imo_sin_retorno": 32130, "imo_con_retorno": 36080, "maniobras": 16800},
                    {"tamano": "40'", "sin_retorno": 24180, "con_retorno": 30530, "imo_sin_retorno": 36910, "imo_con_retorno": 43260, "maniobras": 16800}
                ]
            },
            "ffcc_exportacion": {
                "modalidad": "FFCC",
                "tipo": "Ferrocarril",
                "trafico": "Exportación",
                "ruta": "CDMX → Manzanillo",
                "tarifas": [
                    {"tamano": "20'", "tarifa": 22350, "imo": 32170},
                    {"tamano": "40'", "tarifa": 25620, "imo": 37860}
                ]
            },
            "spf": {
                "modalidad": "SPF",
                "tipo": "Camión Puerta a Puerta RT",
                "trafico": "Importación/Exportación",
                "ruta": "Manzanillo ↔ México",
                "tarifas": [
                    {"tipo_unidad": "Sencillo", "tarifa_rt": 65600, "peso_max": "25 Ton"},
                    {"tipo_unidad": "Full", "tarifa_rt": 90700, "peso_max": "22.5 Ton"}
                ]
            }
        },
        "lazaro_cardenas": {
            "puerto": "Lázaro Cárdenas",
            "descripcion": "Puerto de Aguas Profundas - Buques Post-Panamax",
            "ffcc_importacion": {
                "modalidad": "FFCC",
                "tipo": "Ferrocarril",
                "trafico": "Importación",
                "ruta": "Lázaro Cárdenas → CDMX",
                "tarifas": [
                    {"tamano": "20'", "sin_retorno": 25140, "con_retorno": 29700, "imo_sin_retorno": 28590, "imo_con_retorno": 33150, "maniobras": 15108},
                    {"tamano": "40'", "sin_retorno": 33390, "con_retorno": 41880, "imo_sin_retorno": 36840, "imo_con_retorno": 45330, "maniobras": 15108}
                ]
            },
            "ffcc_exportacion": {
                "modalidad": "FFCC",
                "tipo": "Ferrocarril",
                "trafico": "Exportación",
                "ruta": "CDMX → Lázaro Cárdenas",
                "tarifas": [
                    {"tamano": "20'", "tarifa": 20920, "imo": 23420},
                    {"tamano": "40'", "tarifa": 26820, "imo": 29270}
                ]
            },
            "spf": {
                "modalidad": "SPF",
                "tipo": "Camión Puerta a Puerta RT",
                "trafico": "Importación/Exportación",
                "ruta": "Lázaro Cárdenas ↔ México",
                "tarifas": [
                    {"tipo_unidad": "Sencillo", "tarifa_rt": 53400, "peso_max": "25 Ton"},
                    {"tipo_unidad": "Full", "tarifa_rt": 69300, "peso_max": "22.5 Ton"}
                ]
            }
        },
        "rutas_nacionales": {
            "descripcion": "Rutas Nacionales FFCC y Distribución",
            "ffcc_nacional": {
                "modalidad": "FFCC",
                "tipo": "Ferrocarril",
                "trafico": "Nacional",
                "tarifas": [
                    {"ruta": "Mexicali → CDMX", "tamano": "53'", "tarifa": 42090},
                    {"ruta": "CDMX → Mexicali", "tamano": "53'", "tarifa": 62950},
                    {"ruta": "Cd. Obregón → CDMX", "tamano": "53'", "tarifa": 35340},
                    {"ruta": "CDMX → Cd. Obregón", "tamano": "53'", "tarifa": 47410}
                ]
            },
            "distribucion": {
                "modalidad": "DIST",
                "tipo": "Camión One Way",
                "trafico": "Nacional",
                "tarifas": [
                    {"ruta": "Guadalajara → México", "tamano": "53'", "tarifa": 25000, "peso_max": "25 Ton"},
                    {"ruta": "México → Guadalajara", "tamano": "53'", "tarifa": 27300, "peso_max": "25 Ton"},
                    {"ruta": "Guadalajara → Monterrey", "tamano": "53'", "tarifa": 32000, "peso_max": "25 Ton"},
                    {"ruta": "Monterrey → México", "tamano": "53'", "tarifa": 30500, "peso_max": "25 Ton"},
                    {"ruta": "México → Monterrey", "tamano": "53'", "tarifa": 35650, "peso_max": "25 Ton"},
                    {"ruta": "Veracruz → México", "tamano": "3.5 Ton", "tarifa": 22600, "peso_max": "3.5 Ton"},
                    {"ruta": "Veracruz → México", "tamano": "12 Ton", "tarifa": 19300, "peso_max": "12 Ton"}
                ]
            }
        }
    }
    
    validity_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    validity_end = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")
    
    route_id = 1
    
    # ==================== VERACRUZ - FFCC Importación ====================
    for t in TARIFAS_TRANSMODAL["veracruz"]["ffcc_importacion"]["tarifas"]:
        size = "20ft" if t["tamano"] == "20'" else "40ft"
        # Tarifa sin retorno
        routes.append(RoutePrice(
            id=f"VER-IMP-FFCC-{route_id}",
            origin="Veracruz",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["sin_retorno"],
                transit_days=3,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["sin_retorno"],
            min_cost=t["sin_retorno"],
            max_cost=t["con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["sin_retorno"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=3,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"FFCC Importación sin retorno. Maniobras: ${t['maniobras']:,} MXN"
        ))
        route_id += 1
        
        # Tarifa con retorno
        routes.append(RoutePrice(
            id=f"VER-IMP-FFCC-RT-{route_id}",
            origin="Veracruz",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["con_retorno"],
                transit_days=3,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["con_retorno"],
            min_cost=t["sin_retorno"],
            max_cost=t["con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["con_retorno"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=3,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"FFCC Importación CON retorno. Maniobras: ${t['maniobras']:,} MXN"
        ))
        route_id += 1
        
        # Tarifa IMO (carga peligrosa)
        routes.append(RoutePrice(
            id=f"VER-IMP-FFCC-IMO-{route_id}",
            origin="Veracruz",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="imo",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["imo_sin_retorno"],
                transit_days=4,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["imo_sin_retorno"],
            min_cost=t["imo_sin_retorno"],
            max_cost=t["imo_con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["imo_sin_retorno"] * 1.25, 2),
            margin_percent=25.0,
            transit_days=4,
            validity_start=validity_start,
            validity_end=validity_end,
            notes="FFCC Importación IMO (Carga Peligrosa) sin retorno"
        ))
        route_id += 1
    
    # ==================== VERACRUZ - FFCC Exportación ====================
    for t in TARIFAS_TRANSMODAL["veracruz"]["ffcc_exportacion"]["tarifas"]:
        size = "20ft" if t["tamano"] == "20'" else "40ft"
        routes.append(RoutePrice(
            id=f"VER-EXP-FFCC-{route_id}",
            origin="CDMX",
            destination="Veracruz",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["tarifa"],
                transit_days=3,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["tarifa"],
            min_cost=t["tarifa"],
            max_cost=t["imo"],
            best_supplier="Ferromex",
            suggested_price=round(t["tarifa"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=3,
            validity_start=validity_start,
            validity_end=validity_end,
            notes="FFCC Exportación"
        ))
        route_id += 1
    
    # ==================== VERACRUZ - VEREX (FFCC + Inspección) ====================
    for t in TARIFAS_TRANSMODAL["veracruz"]["verex"]["tarifas"]:
        dest = "Ferrovalle" if "Ferrovalle" in t["ruta"] else "TILH"
        size = "40ft" if "40'" in t["tamano"] else "20ft"
        routes.append(RoutePrice(
            id=f"VER-VEREX-{route_id}",
            origin="Veracruz",
            destination=dest,
            transport_mode="intermodal",
            container_size=size if size != "20ft" else "20ft",
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="VEREX Transmodal",
                supplier_type="intermodal",
                cost=t["sin_retorno"],
                transit_days=4,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Operaciones VEREX",
                contact_email="operaciones@transmodal.com.mx"
            )],
            avg_cost=t["sin_retorno"],
            min_cost=t["sin_retorno"],
            max_cost=t["con_retorno"],
            best_supplier="VEREX Transmodal",
            suggested_price=round(t["sin_retorno"] * 1.18, 2),
            margin_percent=18.0,
            transit_days=4,
            validity_start=validity_start,
            validity_end=validity_end,
            notes="VEREX - FFCC + Inspección sin retorno"
        ))
        route_id += 1
    
    # ==================== VERACRUZ - SPF (Camión RT) ====================
    for t in TARIFAS_TRANSMODAL["veracruz"]["spf"]["tarifas"]:
        size = "Sencillo" if t["tipo_unidad"] == "Sencillo" else "Full"
        routes.append(RoutePrice(
            id=f"VER-SPF-{route_id}",
            origin="Veracruz",
            destination="CDMX",
            transport_mode="truck",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Transmodal SPF",
                supplier_type="transportista",
                cost=t["tarifa_rt"],
                transit_days=1,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Flotilla SPF",
                contact_email="spf@transmodal.com.mx"
            )],
            avg_cost=t["tarifa_rt"],
            min_cost=t["tarifa_rt"],
            max_cost=t["tarifa_rt"],
            best_supplier="Transmodal SPF",
            suggested_price=round(t["tarifa_rt"] * 1.15, 2),
            margin_percent=15.0,
            transit_days=1,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"Camión Puerta a Puerta RT - {t['tipo_unidad']} ({t['peso_max']})"
        ))
        route_id += 1
    
    # ==================== MANZANILLO - FFCC Importación ====================
    for t in TARIFAS_TRANSMODAL["manzanillo"]["ffcc_importacion"]["tarifas"]:
        size = "20ft" if t["tamano"] == "20'" else "40ft"
        routes.append(RoutePrice(
            id=f"MZN-IMP-FFCC-{route_id}",
            origin="Manzanillo",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["sin_retorno"],
                transit_days=4,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            ), SupplierQuote(
                supplier_name="KCSM",
                supplier_type="ferroviaria",
                cost=round(t["sin_retorno"] * 1.05, 2),
                transit_days=4,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas KCSM",
                contact_email="ventas@kcsm.com.mx"
            )],
            avg_cost=t["sin_retorno"],
            min_cost=t["sin_retorno"],
            max_cost=t["con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["sin_retorno"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=4,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"FFCC Importación sin retorno. Maniobras: ${t['maniobras']:,} MXN"
        ))
        route_id += 1
        
        # Con retorno
        routes.append(RoutePrice(
            id=f"MZN-IMP-FFCC-RT-{route_id}",
            origin="Manzanillo",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["con_retorno"],
                transit_days=4,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["con_retorno"],
            min_cost=t["sin_retorno"],
            max_cost=t["con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["con_retorno"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=4,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"FFCC Importación CON retorno. Maniobras: ${t['maniobras']:,} MXN"
        ))
        route_id += 1
        
        # IMO
        routes.append(RoutePrice(
            id=f"MZN-IMP-FFCC-IMO-{route_id}",
            origin="Manzanillo",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="imo",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["imo_sin_retorno"],
                transit_days=5,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["imo_sin_retorno"],
            min_cost=t["imo_sin_retorno"],
            max_cost=t["imo_con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["imo_sin_retorno"] * 1.25, 2),
            margin_percent=25.0,
            transit_days=5,
            validity_start=validity_start,
            validity_end=validity_end,
            notes="FFCC Importación IMO (Carga Peligrosa) sin retorno"
        ))
        route_id += 1
    
    # ==================== MANZANILLO - FFCC Exportación ====================
    for t in TARIFAS_TRANSMODAL["manzanillo"]["ffcc_exportacion"]["tarifas"]:
        size = "20ft" if t["tamano"] == "20'" else "40ft"
        routes.append(RoutePrice(
            id=f"MZN-EXP-FFCC-{route_id}",
            origin="CDMX",
            destination="Manzanillo",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["tarifa"],
                transit_days=4,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["tarifa"],
            min_cost=t["tarifa"],
            max_cost=t["imo"],
            best_supplier="Ferromex",
            suggested_price=round(t["tarifa"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=4,
            validity_start=validity_start,
            validity_end=validity_end,
            notes="FFCC Exportación"
        ))
        route_id += 1
    
    # ==================== MANZANILLO - SPF (Camión RT) ====================
    for t in TARIFAS_TRANSMODAL["manzanillo"]["spf"]["tarifas"]:
        size = "Sencillo" if t["tipo_unidad"] == "Sencillo" else "Full"
        routes.append(RoutePrice(
            id=f"MZN-SPF-{route_id}",
            origin="Manzanillo",
            destination="CDMX",
            transport_mode="truck",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Transmodal SPF",
                supplier_type="transportista",
                cost=t["tarifa_rt"],
                transit_days=2,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Flotilla SPF",
                contact_email="spf@transmodal.com.mx"
            )],
            avg_cost=t["tarifa_rt"],
            min_cost=t["tarifa_rt"],
            max_cost=t["tarifa_rt"],
            best_supplier="Transmodal SPF",
            suggested_price=round(t["tarifa_rt"] * 1.15, 2),
            margin_percent=15.0,
            transit_days=2,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"Camión Puerta a Puerta RT - {t['tipo_unidad']} ({t['peso_max']})"
        ))
        route_id += 1
    
    # ==================== LÁZARO CÁRDENAS - FFCC Importación ====================
    for t in TARIFAS_TRANSMODAL["lazaro_cardenas"]["ffcc_importacion"]["tarifas"]:
        size = "20ft" if t["tamano"] == "20'" else "40ft"
        routes.append(RoutePrice(
            id=f"LZC-IMP-FFCC-{route_id}",
            origin="Lázaro Cárdenas",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["sin_retorno"],
                transit_days=3,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["sin_retorno"],
            min_cost=t["sin_retorno"],
            max_cost=t["con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["sin_retorno"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=3,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"FFCC Importación sin retorno. Maniobras: ${t['maniobras']:,} MXN"
        ))
        route_id += 1
        
        # Con retorno
        routes.append(RoutePrice(
            id=f"LZC-IMP-FFCC-RT-{route_id}",
            origin="Lázaro Cárdenas",
            destination="CDMX",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["con_retorno"],
                transit_days=3,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["con_retorno"],
            min_cost=t["sin_retorno"],
            max_cost=t["con_retorno"],
            best_supplier="Ferromex",
            suggested_price=round(t["con_retorno"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=3,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"FFCC Importación CON retorno. Maniobras: ${t['maniobras']:,} MXN"
        ))
        route_id += 1
    
    # ==================== LÁZARO CÁRDENAS - FFCC Exportación ====================
    for t in TARIFAS_TRANSMODAL["lazaro_cardenas"]["ffcc_exportacion"]["tarifas"]:
        size = "20ft" if t["tamano"] == "20'" else "40ft"
        routes.append(RoutePrice(
            id=f"LZC-EXP-FFCC-{route_id}",
            origin="CDMX",
            destination="Lázaro Cárdenas",
            transport_mode="rail",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["tarifa"],
                transit_days=3,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["tarifa"],
            min_cost=t["tarifa"],
            max_cost=t["imo"],
            best_supplier="Ferromex",
            suggested_price=round(t["tarifa"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=3,
            validity_start=validity_start,
            validity_end=validity_end,
            notes="FFCC Exportación"
        ))
        route_id += 1
    
    # ==================== LÁZARO CÁRDENAS - SPF (Camión RT) ====================
    for t in TARIFAS_TRANSMODAL["lazaro_cardenas"]["spf"]["tarifas"]:
        size = "Sencillo" if t["tipo_unidad"] == "Sencillo" else "Full"
        routes.append(RoutePrice(
            id=f"LZC-SPF-{route_id}",
            origin="Lázaro Cárdenas",
            destination="CDMX",
            transport_mode="truck",
            container_size=size,
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Transmodal SPF",
                supplier_type="transportista",
                cost=t["tarifa_rt"],
                transit_days=2,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Flotilla SPF",
                contact_email="spf@transmodal.com.mx"
            )],
            avg_cost=t["tarifa_rt"],
            min_cost=t["tarifa_rt"],
            max_cost=t["tarifa_rt"],
            best_supplier="Transmodal SPF",
            suggested_price=round(t["tarifa_rt"] * 1.15, 2),
            margin_percent=15.0,
            transit_days=2,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"Camión Puerta a Puerta RT - {t['tipo_unidad']} ({t['peso_max']})"
        ))
        route_id += 1
    
    # ==================== RUTAS NACIONALES - FFCC ====================
    for t in TARIFAS_TRANSMODAL["rutas_nacionales"]["ffcc_nacional"]["tarifas"]:
        parts = t["ruta"].split(" → ")
        origin = parts[0]
        dest = parts[1]
        routes.append(RoutePrice(
            id=f"NAC-FFCC-{route_id}",
            origin=origin,
            destination=dest,
            transport_mode="rail",
            container_size="53ft",
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Ferromex",
                supplier_type="ferroviaria",
                cost=t["tarifa"],
                transit_days=5,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Ventas Ferromex",
                contact_email="ventas@ferromex.com.mx"
            )],
            avg_cost=t["tarifa"],
            min_cost=t["tarifa"],
            max_cost=t["tarifa"],
            best_supplier="Ferromex",
            suggested_price=round(t["tarifa"] * 1.20, 2),
            margin_percent=20.0,
            transit_days=5,
            validity_start=validity_start,
            validity_end=validity_end,
            notes="FFCC Nacional"
        ))
        route_id += 1
    
    # ==================== RUTAS NACIONALES - Distribución ====================
    for t in TARIFAS_TRANSMODAL["rutas_nacionales"]["distribucion"]["tarifas"]:
        parts = t["ruta"].split(" → ")
        origin = parts[0]
        dest = parts[1]
        routes.append(RoutePrice(
            id=f"NAC-DIST-{route_id}",
            origin=origin,
            destination=dest,
            transport_mode="truck",
            container_size=t["tamano"],
            container_type="dry",
            supplier_quotes=[SupplierQuote(
                supplier_name="Transmodal Distribución",
                supplier_type="transportista",
                cost=t["tarifa"],
                transit_days=1,
                validity_start=validity_start,
                validity_end=validity_end,
                contact_name="Distribución Nacional",
                contact_email="distribucion@transmodal.com.mx"
            )],
            avg_cost=t["tarifa"],
            min_cost=t["tarifa"],
            max_cost=t["tarifa"],
            best_supplier="Transmodal Distribución",
            suggested_price=round(t["tarifa"] * 1.18, 2),
            margin_percent=18.0,
            transit_days=1,
            validity_start=validity_start,
            validity_end=validity_end,
            notes=f"Camión One Way - {t.get('peso_max', 'N/A')}"
        ))
        route_id += 1
    
    return routes

def generate_additional_services():
    """Genera servicios adicionales"""
    services = [
        AdditionalService(code="ALM001", name="Almacenaje en Puerto", description="Por día después de período libre", unit="per_day", base_cost=25, suggested_price=45),
        AdditionalService(code="ALM002", name="Almacenaje en CEDIS", description="Por día en almacén", unit="per_day", base_cost=15, suggested_price=30),
        AdditionalService(code="MAN001", name="Maniobra de Carga", description="Carga/descarga en puerto", unit="per_container", base_cost=150, suggested_price=250),
        AdditionalService(code="MAN002", name="Maniobra Patio Vacíos", description="Manejo de contenedor vacío", unit="per_container", base_cost=80, suggested_price=150),
        AdditionalService(code="SEG001", name="Seguro de Carga", description="Cobertura básica", unit="per_container", base_cost=50, suggested_price=120),
        AdditionalService(code="SEG002", name="Seguro Premium", description="Cobertura total", unit="per_container", base_cost=150, suggested_price=300),
        AdditionalService(code="ADU001", name="Despacho Aduanal", description="Trámites de importación", unit="per_container", base_cost=180, suggested_price=350),
        AdditionalService(code="ADU002", name="Revisión en Origen", description="Inspección pre-embarque", unit="per_container", base_cost=100, suggested_price=200),
        AdditionalService(code="TRA001", name="Arrastre Local", description="Transporte puerto-CEDIS", unit="per_container", base_cost=200, suggested_price=380),
        AdditionalService(code="TRA002", name="Entrega Final", description="Distribución última milla", unit="per_container", base_cost=150, suggested_price=280),
        AdditionalService(code="DOC001", name="Gestión Documental", description="BL, facturas, certificados", unit="fixed", base_cost=50, suggested_price=120),
        AdditionalService(code="URG001", name="Servicio Express", description="Prioridad en operación", unit="per_container", base_cost=200, suggested_price=450),
    ]
    return services

_route_prices_cache = None
_additional_services_cache = None
_quotes_cache = []

def get_route_prices():
    global _route_prices_cache
    if _route_prices_cache is None:
        _route_prices_cache = generate_route_prices()
    return _route_prices_cache

def get_additional_services():
    global _additional_services_cache
    if _additional_services_cache is None:
        _additional_services_cache = generate_additional_services()
    return _additional_services_cache

# ==================== OPERATIONS ENDPOINTS ====================

@api_router.post("/ops/auth/login")
async def operations_login(request: LoginRequest):
    """Login para portal de operaciones"""
    # Credenciales mock para operaciones
    valid_users = {
        "operaciones": {"password": "ops123", "user": MOCK_OPERATIONS_USER},
        "admin": {"password": "admin123", "user": {**MOCK_OPERATIONS_USER, "id": "ops_002", "username": "admin", "full_name": "Admin Sistema", "user_type": "admin"}}
    }
    
    if request.username in valid_users and request.password == valid_users[request.username]["password"]:
        return {
            "token": f"ops_token_{request.username}_{uuid.uuid4().hex[:8]}",
            "user": valid_users[request.username]["user"]
        }
    
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

# ==================== WMS ENDPOINTS ====================

MOCK_WMS_USER = {
    "id": "wms_001",
    "username": "almacen",
    "full_name": "Supervisor Almacén",
    "email": "almacen@transmodal.com",
    "user_type": "wms"
}

@api_router.post("/wms/auth/login")
async def wms_login(request: LoginRequest):
    """Login para portal WMS"""
    valid_users = {
        "operaciones": {"password": "ops123", "user": MOCK_WMS_USER},
        "almacen": {"password": "wms123", "user": MOCK_WMS_USER},
        "admin": {"password": "admin123", "user": {**MOCK_WMS_USER, "id": "wms_002", "username": "admin", "full_name": "Admin WMS"}}
    }
    
    if request.username in valid_users and request.password == valid_users[request.username]["password"]:
        return {
            "token": f"wms_token_{request.username}_{uuid.uuid4().hex[:8]}",
            "user": valid_users[request.username]["user"]
        }
    
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

# ==================== TRANSPORT ENDPOINTS ====================

MOCK_TRANSPORT_USER = {
    "id": "transport_001",
    "username": "transporte",
    "full_name": "Coordinador Transporte",
    "email": "transporte@transmodal.com",
    "user_type": "transport"
}

@api_router.post("/transport/auth/login")
async def transport_login(request: LoginRequest):
    """Login para portal de transporte"""
    valid_users = {
        "operaciones": {"password": "ops123", "user": MOCK_TRANSPORT_USER},
        "transporte": {"password": "trans123", "user": MOCK_TRANSPORT_USER},
        "admin": {"password": "admin123", "user": {**MOCK_TRANSPORT_USER, "id": "transport_002", "username": "admin", "full_name": "Admin Transporte"}}
    }
    
    if request.username in valid_users and request.password == valid_users[request.username]["password"]:
        return {
            "token": f"transport_token_{request.username}_{uuid.uuid4().hex[:8]}",
            "user": valid_users[request.username]["user"]
        }
    
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

# ==================== WAREHOUSE OPERATOR ENDPOINTS ====================

MOCK_WAREHOUSE_OPERATOR_USER = {
    "id": "warehouse_op_001",
    "username": "operador1",
    "full_name": "Carlos Mendoza",
    "email": "operador1@transmodal.com",
    "user_type": "warehouse_operator"
}

@api_router.post("/warehouse-op/auth/login")
async def warehouse_operator_login(request: LoginRequest):
    """Login para portal de operador de almacén"""
    valid_users = {
        "operaciones": {"password": "ops123", "user": MOCK_WAREHOUSE_OPERATOR_USER},
        "operador1": {"password": "op123", "user": MOCK_WAREHOUSE_OPERATOR_USER},
        "operador2": {"password": "op123", "user": {**MOCK_WAREHOUSE_OPERATOR_USER, "id": "warehouse_op_002", "username": "operador2", "full_name": "María González"}},
        "admin": {"password": "admin123", "user": {**MOCK_WAREHOUSE_OPERATOR_USER, "id": "warehouse_op_admin", "username": "admin", "full_name": "Admin Almacén"}}
    }
    
    if request.username in valid_users and request.password == valid_users[request.username]["password"]:
        return {
            "token": f"warehouse_op_token_{request.username}_{uuid.uuid4().hex[:8]}",
            "user": valid_users[request.username]["user"]
        }
    
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@api_router.get("/ops/dashboard/profitability")
async def get_profitability_dashboard(
    period_start: str = None,
    period_end: str = None,
    user: dict = Depends(verify_token)
):
    """Dashboard de rentabilidad general"""
    containers = get_operations_containers()
    
    # Calcular totales
    total_revenue = sum(c.total_revenue for c in containers)
    total_costs = sum(c.total_costs for c in containers)
    total_profit = total_revenue - total_costs
    margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    # Por cliente
    by_client = {}
    for c in containers:
        if c.client_name not in by_client:
            by_client[c.client_name] = {"revenue": 0, "costs": 0, "profit": 0, "containers": 0}
        by_client[c.client_name]["revenue"] += c.total_revenue
        by_client[c.client_name]["costs"] += c.total_costs
        by_client[c.client_name]["profit"] += c.profit
        by_client[c.client_name]["containers"] += 1
    
    by_client_list = [
        {
            "client": k,
            "revenue": round(v["revenue"], 2),
            "costs": round(v["costs"], 2),
            "profit": round(v["profit"], 2),
            "margin": round((v["profit"] / v["revenue"] * 100) if v["revenue"] > 0 else 0, 1),
            "containers": v["containers"]
        }
        for k, v in by_client.items()
    ]
    by_client_list.sort(key=lambda x: x["profit"], reverse=True)
    
    # Por ruta
    by_route = {}
    for c in containers:
        route_key = f"{c.origin} → {c.destination}"
        if route_key not in by_route:
            by_route[route_key] = {"revenue": 0, "costs": 0, "profit": 0, "containers": 0}
        by_route[route_key]["revenue"] += c.total_revenue
        by_route[route_key]["costs"] += c.total_costs
        by_route[route_key]["profit"] += c.profit
        by_route[route_key]["containers"] += 1
    
    by_route_list = [
        {
            "route": k,
            "revenue": round(v["revenue"], 2),
            "costs": round(v["costs"], 2),
            "profit": round(v["profit"], 2),
            "margin": round((v["profit"] / v["revenue"] * 100) if v["revenue"] > 0 else 0, 1),
            "containers": v["containers"]
        }
        for k, v in by_route.items()
    ]
    by_route_list.sort(key=lambda x: x["profit"], reverse=True)
    
    # Top y bottom
    sorted_containers = sorted(containers, key=lambda x: x.margin_percent, reverse=True)
    top_profitable = [
        {"container": c.container_number, "client": c.client_name, "margin": c.margin_percent, "profit": c.profit}
        for c in sorted_containers[:5]
    ]
    least_profitable = [
        {"container": c.container_number, "client": c.client_name, "margin": c.margin_percent, "profit": c.profit}
        for c in sorted_containers[-5:]
    ]
    
    # Tendencia mensual (mock)
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"]
    monthly_trend = [
        {
            "month": m,
            "revenue": round(random.uniform(80000, 150000), 2),
            "costs": round(random.uniform(60000, 110000), 2),
            "profit": round(random.uniform(15000, 40000), 2)
        }
        for m in months
    ]
    
    return ProfitabilityDashboard(
        period_start=period_start or (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d"),
        period_end=period_end or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        total_revenue=round(total_revenue, 2),
        total_costs=round(total_costs, 2),
        total_profit=round(total_profit, 2),
        margin_percent=round(margin, 1),
        containers_count=len(containers),
        by_client=by_client_list,
        by_route=by_route_list,
        top_profitable=top_profitable,
        least_profitable=least_profitable,
        monthly_trend=monthly_trend
    )

@api_router.get("/ops/containers")
async def get_operations_containers_list(user: dict = Depends(verify_token)):
    """Lista de contenedores con rentabilidad"""
    containers = get_operations_containers()
    return {
        "total": len(containers),
        "containers": [
            {
                "container_id": c.container_id,
                "container_number": c.container_number,
                "client_name": c.client_name,
                "origin": c.origin,
                "destination": c.destination,
                "status": c.status,
                "total_revenue": c.total_revenue,
                "total_costs": c.total_costs,
                "profit": c.profit,
                "margin_percent": c.margin_percent
            }
            for c in containers
        ]
    }

@api_router.get("/ops/containers/{container_id}/profitability")
async def get_container_profitability(container_id: str, user: dict = Depends(verify_token)):
    """Detalle de rentabilidad de un contenedor"""
    containers = get_operations_containers()
    container = next((c for c in containers if c.container_id == container_id), None)
    
    if not container:
        raise HTTPException(status_code=404, detail="Contenedor no encontrado")
    
    return container

# ==================== TARIFARIO DE COMPRAS (PROVEEDORES) ENDPOINTS ====================

@api_router.get("/ops/purchases/categories")
async def get_supplier_categories(user: dict = Depends(verify_token)):
    """Obtener categorías de proveedores"""
    return {"categories": SUPPLIER_CATEGORIES}

@api_router.get("/ops/purchases/suppliers")
async def get_all_suppliers(
    category: str = None,
    user: dict = Depends(verify_token)
):
    """Obtener todos los proveedores con sus tarifas"""
    suppliers = get_purchase_suppliers()
    
    if category:
        suppliers = [s for s in suppliers if s.category == category]
    
    # Contar tarifas por categoría
    categories_count = {}
    for s in get_purchase_suppliers():
        if s.category not in categories_count:
            categories_count[s.category] = {"count": 0, "tariffs": 0}
        categories_count[s.category]["count"] += 1
        categories_count[s.category]["tariffs"] += len(s.tariffs)
    
    return {
        "total": len(suppliers),
        "suppliers": [s.model_dump() for s in suppliers],
        "categories_summary": categories_count
    }

@api_router.get("/ops/purchases/suppliers/{supplier_id}")
async def get_supplier_detail(supplier_id: str, user: dict = Depends(verify_token)):
    """Obtener detalle de un proveedor"""
    suppliers = get_purchase_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    return supplier.model_dump()

@api_router.post("/ops/purchases/suppliers")
async def create_supplier(data: dict, user: dict = Depends(verify_token)):
    """Crear un nuevo proveedor"""
    global _purchase_suppliers_cache
    suppliers = get_purchase_suppliers()
    
    new_supplier = PurchaseSupplier(
        name=data["name"],
        category=data["category"],
        contact_name=data.get("contact_name"),
        contact_email=data.get("contact_email"),
        contact_phone=data.get("contact_phone"),
        address=data.get("address"),
        tariffs=[]
    )
    
    suppliers.append(new_supplier)
    _suppliers_cache = suppliers
    
    return {"success": True, "supplier": new_supplier.model_dump()}

@api_router.post("/ops/purchases/suppliers/{supplier_id}/tariffs")
async def add_supplier_tariff(supplier_id: str, data: dict, user: dict = Depends(verify_token)):
    """Agregar tarifa a un proveedor"""
    global _purchase_suppliers_cache
    suppliers = get_purchase_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    validity_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    validity_end = (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")
    
    new_tariff = SupplierTariff(
        supplier_id=supplier_id,
        supplier_name=supplier.name,
        category=supplier.category,
        service_name=data["service_name"],
        origin=data.get("origin"),
        destination=data.get("destination"),
        container_size=data.get("container_size"),
        unit=data.get("unit", "por_contenedor"),
        cost=data["cost"],
        currency=data.get("currency", "MXN"),
        includes_return=data.get("includes_return", False),
        is_imo=data.get("is_imo", False),
        transit_days=data.get("transit_days"),
        validity_start=data.get("validity_start", validity_start),
        validity_end=data.get("validity_end", validity_end),
        notes=data.get("notes")
    )
    
    supplier.tariffs.append(new_tariff)
    _suppliers_cache = suppliers
    
    return {"success": True, "tariff": new_tariff.model_dump()}

@api_router.put("/ops/purchases/suppliers/{supplier_id}/tariffs/{tariff_id}")
async def update_supplier_tariff(supplier_id: str, tariff_id: str, data: dict, user: dict = Depends(verify_token)):
    """Actualizar tarifa de un proveedor"""
    global _purchase_suppliers_cache
    suppliers = get_purchase_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    tariff = next((t for t in supplier.tariffs if t.id == tariff_id), None)
    if not tariff:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    
    # Actualizar campos
    for key, value in data.items():
        if hasattr(tariff, key):
            setattr(tariff, key, value)
    
    _suppliers_cache = suppliers
    return {"success": True, "tariff": tariff.model_dump()}

@api_router.delete("/ops/purchases/suppliers/{supplier_id}/tariffs/{tariff_id}")
async def delete_supplier_tariff(supplier_id: str, tariff_id: str, user: dict = Depends(verify_token)):
    """Eliminar tarifa de un proveedor"""
    global _purchase_suppliers_cache
    suppliers = get_purchase_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    original_len = len(supplier.tariffs)
    supplier.tariffs = [t for t in supplier.tariffs if t.id != tariff_id]
    
    if len(supplier.tariffs) == original_len:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    
    _suppliers_cache = suppliers
    return {"success": True, "message": "Tarifa eliminada"}

# ==================== PRICING/QUOTES ENDPOINTS ====================

@api_router.get("/ops/pricing/routes")
async def get_pricing_routes(
    origin: str = None,
    destination: str = None,
    transport_mode: str = None,
    container_size: str = None,
    user: dict = Depends(verify_token)
):
    """Obtener rutas con precios"""
    routes = get_route_prices()
    
    if origin:
        routes = [r for r in routes if r.origin.lower() == origin.lower()]
    if destination:
        routes = [r for r in routes if r.destination.lower() == destination.lower()]
    if transport_mode:
        routes = [r for r in routes if r.transport_mode == transport_mode]
    if container_size:
        routes = [r for r in routes if r.container_size == container_size]
    
    return {"total": len(routes), "routes": routes}

@api_router.get("/ops/pricing/services")
async def get_pricing_services(user: dict = Depends(verify_token)):
    """Obtener servicios adicionales"""
    return {"services": get_additional_services()}

@api_router.get("/ops/pricing/origins")
async def get_available_origins(user: dict = Depends(verify_token)):
    """Obtener orígenes disponibles"""
    routes = get_route_prices()
    origins = list(set(r.origin for r in routes))
    return {"origins": sorted(origins)}

@api_router.get("/ops/pricing/destinations")
async def get_available_destinations(user: dict = Depends(verify_token)):
    """Obtener destinos disponibles"""
    routes = get_route_prices()
    destinations = list(set(r.destination for r in routes))
    return {"destinations": sorted(destinations)}

@api_router.get("/ops/pricing/suppliers")
async def get_available_suppliers(user: dict = Depends(verify_token)):
    """Obtener lista de proveedores disponibles"""
    return {"suppliers": SUPPLIERS}

@api_router.get("/ops/pricing/routes/{route_id}")
async def get_route_detail(route_id: str, user: dict = Depends(verify_token)):
    """Obtener detalle de una ruta con sus proveedores"""
    routes = get_route_prices()
    route = next((r for r in routes if r.id == route_id), None)
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return route

@api_router.post("/ops/pricing/routes/{route_id}/suppliers")
async def add_supplier_to_route(route_id: str, supplier_data: dict, user: dict = Depends(verify_token)):
    """Agregar cotización de proveedor a una ruta"""
    global _route_prices_cache
    routes = get_route_prices()
    route = next((r for r in routes if r.id == route_id), None)
    
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    # Crear nueva cotización de proveedor
    new_quote = SupplierQuote(
        supplier_name=supplier_data.get("supplier_name"),
        supplier_type=supplier_data.get("supplier_type", "naviera"),
        cost=float(supplier_data.get("cost", 0)),
        transit_days=int(supplier_data.get("transit_days", 0)),
        validity_start=supplier_data.get("validity_start", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        validity_end=supplier_data.get("validity_end", (datetime.now(timezone.utc) + timedelta(days=60)).strftime("%Y-%m-%d")),
        contact_name=supplier_data.get("contact_name"),
        contact_email=supplier_data.get("contact_email"),
        notes=supplier_data.get("notes")
    )
    
    # Agregar a la ruta
    route.supplier_quotes.append(new_quote)
    
    # Recalcular estadísticas
    costs = [q.cost for q in route.supplier_quotes]
    route.avg_cost = round(sum(costs) / len(costs), 2)
    route.min_cost = round(min(costs), 2)
    route.max_cost = round(max(costs), 2)
    route.best_supplier = min(route.supplier_quotes, key=lambda x: x.cost).supplier_name
    
    # Recalcular margen
    if route.suggested_price > 0:
        route.margin_percent = round(((route.suggested_price - route.avg_cost) / route.suggested_price) * 100, 1)
    
    return {"success": True, "route": route}

@api_router.delete("/ops/pricing/routes/{route_id}/suppliers/{supplier_id}")
async def remove_supplier_from_route(route_id: str, supplier_id: str, user: dict = Depends(verify_token)):
    """Eliminar cotización de proveedor de una ruta"""
    routes = get_route_prices()
    route = next((r for r in routes if r.id == route_id), None)
    
    if not route:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    
    route.supplier_quotes = [q for q in route.supplier_quotes if q.id != supplier_id]
    
    if route.supplier_quotes:
        costs = [q.cost for q in route.supplier_quotes]
        route.avg_cost = round(sum(costs) / len(costs), 2)
        route.min_cost = round(min(costs), 2)
        route.max_cost = round(max(costs), 2)
        route.best_supplier = min(route.supplier_quotes, key=lambda x: x.cost).supplier_name
    else:
        route.avg_cost = 0
        route.min_cost = 0
        route.max_cost = 0
        route.best_supplier = None
    
    return {"success": True, "route": route}

# ==================== TARIFAS PRE-APROBADAS ====================
_preapproved_tariffs_cache = None

def generate_preapproved_tariffs():
    """Genera tarifas pre-aprobadas - Lista vacía para que el usuario cree las suyas"""
    # El usuario creará sus propias tarifas usando las rutas del pricing real
    return []

def get_preapproved_tariffs():
    global _preapproved_tariffs_cache
    if _preapproved_tariffs_cache is None:
        _preapproved_tariffs_cache = generate_preapproved_tariffs()
    return _preapproved_tariffs_cache

@api_router.get("/ops/pricing/tariffs")
async def get_tariffs(user: dict = Depends(verify_token)):
    """Obtener todas las tarifas pre-aprobadas"""
    tariffs = get_preapproved_tariffs()
    return {"tariffs": [t.model_dump() for t in tariffs]}

@api_router.get("/ops/pricing/tariffs/{tariff_id}")
async def get_tariff(tariff_id: str, user: dict = Depends(verify_token)):
    """Obtener una tarifa pre-aprobada específica"""
    tariffs = get_preapproved_tariffs()
    tariff = next((t for t in tariffs if t.id == tariff_id), None)
    if not tariff:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    return {"tariff": tariff.model_dump()}

@api_router.post("/ops/pricing/tariffs")
async def create_tariff(tariff_data: dict, user: dict = Depends(verify_token)):
    """Crear una nueva tarifa pre-aprobada"""
    global _preapproved_tariffs_cache
    tariffs = get_preapproved_tariffs()
    
    # Crear componentes de costo
    cost_components = []
    total_cost = 0
    for comp in tariff_data.get("cost_components", []):
        cost_comp = CostComponent(
            name=comp.get("name"),
            amount=float(comp.get("amount", 0)),
            is_base=comp.get("is_base", False)
        )
        cost_components.append(cost_comp)
        total_cost += cost_comp.amount
    
    # Calcular precio de venta con margen
    margin = float(tariff_data.get("margin_percent", 20))
    sale_price = total_cost / (1 - margin / 100) if margin < 100 else total_cost
    
    # Crear servicios de venta
    sale_services = []
    total_sale = 0
    for svc in tariff_data.get("sale_services", []):
        sale_svc = SaleService(
            name=svc.get("name"),
            type=svc.get("type", "tarifa"),
            amount=float(svc.get("amount", 0))
        )
        sale_services.append(sale_svc)
        total_sale += sale_svc.amount
    
    # Si no hay servicios de venta, usar precio sugerido
    if not sale_services:
        total_sale = sale_price
    
    new_tariff = PreapprovedTariff(
        route_id=tariff_data.get("route_id", ""),
        origin=tariff_data.get("origin", ""),
        destination=tariff_data.get("destination", ""),
        transport_mode=tariff_data.get("transport_mode", "maritime"),
        container_size=tariff_data.get("container_size", "40ft"),
        cost_components=cost_components,
        total_cost=total_cost,
        margin_percent=margin,
        sale_price=round(sale_price, 2),
        sale_services=sale_services,
        total_sale=round(total_sale, 2),
        transit_days=int(tariff_data.get("transit_days", 0)),
        validity_start=tariff_data.get("validity_start", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        validity_end=tariff_data.get("validity_end", (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d")),
        created_by=user.get("username", "sistema"),
        notes=tariff_data.get("notes")
    )
    
    tariffs.append(new_tariff)
    _preapproved_tariffs_cache = tariffs
    
    return {"success": True, "tariff": new_tariff.model_dump()}

@api_router.put("/ops/pricing/tariffs/{tariff_id}")
async def update_tariff(tariff_id: str, tariff_data: dict, user: dict = Depends(verify_token)):
    """Actualizar una tarifa pre-aprobada"""
    global _preapproved_tariffs_cache
    tariffs = get_preapproved_tariffs()
    tariff_idx = next((i for i, t in enumerate(tariffs) if t.id == tariff_id), None)
    
    if tariff_idx is None:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    
    tariff = tariffs[tariff_idx]
    
    # Actualizar campos
    if "cost_components" in tariff_data:
        cost_components = []
        total_cost = 0
        for comp in tariff_data["cost_components"]:
            cost_comp = CostComponent(
                name=comp.get("name"),
                amount=float(comp.get("amount", 0)),
                is_base=comp.get("is_base", False)
            )
            cost_components.append(cost_comp)
            total_cost += cost_comp.amount
        tariff.cost_components = cost_components
        tariff.total_cost = total_cost
    
    if "margin_percent" in tariff_data:
        tariff.margin_percent = float(tariff_data["margin_percent"])
    
    # Recalcular precio de venta
    tariff.sale_price = round(tariff.total_cost / (1 - tariff.margin_percent / 100), 2)
    
    if "sale_services" in tariff_data:
        sale_services = []
        total_sale = 0
        for svc in tariff_data["sale_services"]:
            sale_svc = SaleService(
                name=svc.get("name"),
                type=svc.get("type", "tarifa"),
                amount=float(svc.get("amount", 0))
            )
            sale_services.append(sale_svc)
            total_sale += sale_svc.amount
        tariff.sale_services = sale_services
        tariff.total_sale = total_sale if sale_services else tariff.sale_price
    
    _preapproved_tariffs_cache = tariffs
    return {"success": True, "tariff": tariff.model_dump()}

@api_router.delete("/ops/pricing/tariffs/{tariff_id}")
async def delete_tariff(tariff_id: str, user: dict = Depends(verify_token)):
    """Eliminar una tarifa pre-aprobada"""
    global _preapproved_tariffs_cache
    tariffs = get_preapproved_tariffs()
    
    original_len = len(tariffs)
    tariffs = [t for t in tariffs if t.id != tariff_id]
    
    if len(tariffs) == original_len:
        raise HTTPException(status_code=404, detail="Tarifa no encontrada")
    
    _preapproved_tariffs_cache = tariffs
    return {"success": True, "message": "Tarifa eliminada"}

@api_router.post("/ops/quotes")
async def create_quote(quote_data: dict, user: dict = Depends(verify_token)):
    """Crear nueva cotización"""
    global _quotes_cache
    
    quote_number = f"COT-{datetime.now().year}-{random.randint(10000, 99999)}"
    
    items = []
    total_price = 0
    total_cost = 0
    
    for item in quote_data.get("items", []):
        unit_price = item.get("unit_price", 0)
        unit_cost = item.get("unit_cost", 0)
        quantity = item.get("quantity", 1)
        item_total_price = unit_price * quantity
        item_total_cost = unit_cost * quantity
        
        items.append(QuoteLineItem(
            item_type=item.get("item_type", "service"),
            description=item.get("description", ""),
            quantity=quantity,
            unit_price=unit_price,
            unit_cost=unit_cost,
            total_price=item_total_price,
            total_cost=item_total_cost,
            margin_percent=round(((unit_price - unit_cost) / unit_price * 100) if unit_price > 0 else 0, 1)
        ))
        
        total_price += item_total_price
        total_cost += item_total_cost
    
    tax_percent = quote_data.get("tax_percent", 16.0)
    tax_amount = total_price * (tax_percent / 100)
    total_with_tax = total_price + tax_amount
    total_margin = total_price - total_cost
    margin_percent = (total_margin / total_price * 100) if total_price > 0 else 0
    
    quote = Quote(
        quote_number=quote_number,
        client_name=quote_data.get("client_name", ""),
        client_email=quote_data.get("client_email"),
        client_phone=quote_data.get("client_phone"),
        is_new_client=quote_data.get("is_new_client", False),
        created_by=user.get("username", "system"),
        valid_until=(datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
        status="draft",
        items=items,
        subtotal=round(total_price, 2),
        tax_percent=tax_percent,
        tax_amount=round(tax_amount, 2),
        total=round(total_with_tax, 2),
        total_cost=round(total_cost, 2),
        total_margin=round(total_margin, 2),
        margin_percent=round(margin_percent, 1),
        notes=quote_data.get("notes"),
        terms_conditions=quote_data.get("terms_conditions", "Precios válidos por 30 días. Sujeto a disponibilidad.")
    )
    
    _quotes_cache.append(quote)
    
    return {"success": True, "quote": quote}

@api_router.get("/ops/quotes")
async def get_quotes(status: str = None, user: dict = Depends(verify_token)):
    """Obtener cotizaciones"""
    quotes = _quotes_cache
    
    if status:
        quotes = [q for q in quotes if q.status == status]
    
    return {"total": len(quotes), "quotes": quotes}

@api_router.get("/ops/quotes/{quote_id}")
async def get_quote(quote_id: str, user: dict = Depends(verify_token)):
    """Obtener detalle de cotización"""
    quote = next((q for q in _quotes_cache if q.id == quote_id), None)
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return quote

@api_router.put("/ops/quotes/{quote_id}/status")
async def update_quote_status(quote_id: str, new_status: str, user: dict = Depends(verify_token)):
    """Actualizar estado de cotización"""
    quote = next((q for q in _quotes_cache if q.id == quote_id), None)
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    
    quote.status = new_status
    return {"success": True, "quote": quote}

@api_router.get("/ops/cost-types")
async def get_cost_types(user: dict = Depends(verify_token)):
    """Obtener tipos de costos"""
    return {"cost_types": COST_TYPES}

@api_router.post("/ops/reset-data")
async def reset_operations_data(user: dict = Depends(verify_token)):
    """Resetear datos de operaciones"""
    reset_operations_cache()
    return {"success": True, "message": "Datos regenerados"}

# ==================== SUPPLIERS & CLIENTS MODULE ====================

class SupplierDocument(BaseModel):
    """Documento de proveedor"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    doc_type: str  # acta_constitutiva, ine_representante, csf, contrato, tarifario, otro
    file_name: str
    file_url: Optional[str] = None
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "pending"  # pending, approved, rejected
    notes: Optional[str] = None

class SupplierAudit(BaseModel):
    """Auditoría de proveedor"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    audit_date: str
    auditor_name: str
    audit_type: str  # inicial, seguimiento, recertificacion
    score: int  # 0-100
    status: str  # approved, conditional, rejected
    findings: List[str] = []
    recommendations: List[str] = []
    next_audit_date: Optional[str] = None
    notes: Optional[str] = None

class Supplier(BaseModel):
    """Proveedor completo"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Info básica
    company_name: str
    trade_name: Optional[str] = None
    rfc: str
    supplier_type: str  # naviera, ferroviaria, transportista, agente_aduanal, almacen, otro
    # Contacto
    contact_name: str
    contact_email: str
    contact_phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "México"
    # Comercial
    credit_days: int = 0
    credit_limit: float = 0.0
    currency: str = "USD"
    payment_method: str = "transferencia"  # transferencia, cheque, efectivo
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    clabe: Optional[str] = None
    # Documentos y auditorías
    documents: List[SupplierDocument] = []
    audits: List[SupplierAudit] = []
    # Contrato
    contract_status: str = "pending"  # pending, sent, signed, expired
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    contract_signed_at: Optional[str] = None
    # Estado
    status: str = "active"  # active, inactive, blocked, pending_approval
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    notes: Optional[str] = None

class ClientDocument(BaseModel):
    """Documento de cliente"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    doc_type: str
    file_name: str
    file_url: Optional[str] = None
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "pending"
    notes: Optional[str] = None

class Client(BaseModel):
    """Cliente completo"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Info básica
    company_name: str
    trade_name: Optional[str] = None
    rfc: str
    industry: str  # bebidas, alimentos, automotriz, retail, farmaceutica, otro
    # Contacto
    contact_name: str
    contact_email: str
    contact_phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "México"
    # Comercial
    credit_days: int = 0
    credit_limit: float = 0.0
    currency: str = "USD"
    payment_method: str = "transferencia"
    # Documentos
    documents: List[ClientDocument] = []
    # Contrato
    contract_status: str = "pending"
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    contract_signed_at: Optional[str] = None
    # Estadísticas
    total_shipments: int = 0
    total_revenue: float = 0.0
    avg_margin: float = 0.0
    # Estado
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Optional[str] = None
    notes: Optional[str] = None

# Mock data storage
_suppliers_cache = []
_clients_cache = []

def generate_mock_suppliers():
    """Genera proveedores mock"""
    suppliers_data = [
        {"name": "MSC Mediterranean Shipping", "type": "naviera", "rfc": "MSC850101ABC"},
        {"name": "Maersk Line", "type": "naviera", "rfc": "MAE900215DEF"},
        {"name": "Ferromex", "type": "ferroviaria", "rfc": "FER980512GHI"},
        {"name": "KCSM", "type": "ferroviaria", "rfc": "KCS010823JKL"},
        {"name": "Transportes del Norte", "type": "transportista", "rfc": "TDN150607MNO"},
        {"name": "Agencia Aduanal López", "type": "agente_aduanal", "rfc": "AAL880930PQR"},
        {"name": "Almacenes Logísticos SA", "type": "almacen", "rfc": "ALS920115STU"},
        {"name": "CMA CGM", "type": "naviera", "rfc": "CMA870420VWX"},
    ]
    
    suppliers = []
    for data in suppliers_data:
        docs = [
            SupplierDocument(doc_type="acta_constitutiva", file_name="acta_constitutiva.pdf", status="approved"),
            SupplierDocument(doc_type="csf", file_name="csf_2024.pdf", status="approved"),
        ]
        if random.random() > 0.3:
            docs.append(SupplierDocument(doc_type="ine_representante", file_name="ine_rep_legal.pdf", status="approved"))
        if random.random() > 0.5:
            docs.append(SupplierDocument(doc_type="tarifario", file_name="tarifario_2024.xlsx", status="approved"))
        
        audits = []
        if random.random() > 0.4:
            audits.append(SupplierAudit(
                audit_date=(datetime.now(timezone.utc) - timedelta(days=random.randint(30, 180))).strftime("%Y-%m-%d"),
                auditor_name="Auditor Interno",
                audit_type="inicial",
                score=random.randint(70, 98),
                status="approved" if random.random() > 0.2 else "conditional",
                findings=["Documentación completa", "Procesos estandarizados"],
                next_audit_date=(datetime.now(timezone.utc) + timedelta(days=365)).strftime("%Y-%m-%d")
            ))
        
        suppliers.append(Supplier(
            company_name=data["name"],
            trade_name=data["name"],
            rfc=data["rfc"],
            supplier_type=data["type"],
            contact_name=f"Contacto {data['name'].split()[0]}",
            contact_email=f"ventas@{data['name'].lower().replace(' ', '')[:10]}.com",
            contact_phone=f"+52 55 {random.randint(1000,9999)} {random.randint(1000,9999)}",
            city=random.choice(["CDMX", "Guadalajara", "Monterrey", "Manzanillo"]),
            state=random.choice(["CDMX", "Jalisco", "Nuevo León", "Colima"]),
            credit_days=random.choice([0, 15, 30, 45, 60]),
            credit_limit=random.randint(50000, 500000),
            documents=docs,
            audits=audits,
            contract_status=random.choice(["signed", "signed", "pending", "sent"]),
            contract_start=(datetime.now(timezone.utc) - timedelta(days=random.randint(100, 500))).strftime("%Y-%m-%d") if random.random() > 0.3 else None,
            contract_end=(datetime.now(timezone.utc) + timedelta(days=random.randint(100, 500))).strftime("%Y-%m-%d") if random.random() > 0.3 else None,
            status="active"
        ))
    return suppliers

def generate_mock_clients():
    """Genera clientes mock"""
    clients_data = [
        {"name": "Pernod Ricard México", "industry": "bebidas", "rfc": "PRM850101ABC"},
        {"name": "Diageo México", "industry": "bebidas", "rfc": "DIA900215DEF"},
        {"name": "Beam Suntory", "industry": "bebidas", "rfc": "BSU980512GHI"},
        {"name": "Coca-Cola FEMSA", "industry": "bebidas", "rfc": "CCF010823JKL"},
        {"name": "Nestlé México", "industry": "alimentos", "rfc": "NES150607MNO"},
        {"name": "Walmart México", "industry": "retail", "rfc": "WMX880930PQR"},
        {"name": "Liverpool", "industry": "retail", "rfc": "LIV920115STU"},
        {"name": "Grupo Modelo", "industry": "bebidas", "rfc": "GMO870420VWX"},
    ]
    
    clients = []
    for data in clients_data:
        docs = [
            ClientDocument(doc_type="acta_constitutiva", file_name="acta_constitutiva.pdf", status="approved"),
            ClientDocument(doc_type="csf", file_name="csf_2024.pdf", status="approved"),
        ]
        
        clients.append(Client(
            company_name=data["name"],
            trade_name=data["name"],
            rfc=data["rfc"],
            industry=data["industry"],
            contact_name=f"Contacto {data['name'].split()[0]}",
            contact_email=f"logistica@{data['name'].lower().replace(' ', '')[:10]}.com",
            contact_phone=f"+52 55 {random.randint(1000,9999)} {random.randint(1000,9999)}",
            city=random.choice(["CDMX", "Guadalajara", "Monterrey"]),
            state=random.choice(["CDMX", "Jalisco", "Nuevo León"]),
            credit_days=random.choice([30, 45, 60, 90]),
            credit_limit=random.randint(100000, 1000000),
            documents=docs,
            contract_status=random.choice(["signed", "signed", "signed", "pending"]),
            contract_start=(datetime.now(timezone.utc) - timedelta(days=random.randint(100, 500))).strftime("%Y-%m-%d"),
            contract_end=(datetime.now(timezone.utc) + timedelta(days=random.randint(100, 500))).strftime("%Y-%m-%d"),
            total_shipments=random.randint(10, 200),
            total_revenue=random.randint(50000, 500000),
            avg_margin=random.uniform(15, 30),
            status="active"
        ))
    return clients

def get_suppliers():
    global _suppliers_cache
    if not _suppliers_cache:
        _suppliers_cache = generate_mock_suppliers()
    return _suppliers_cache

def get_clients():
    global _clients_cache
    if not _clients_cache:
        _clients_cache = generate_mock_clients()
    return _clients_cache

# ==================== SUPPLIERS ENDPOINTS ====================

@api_router.get("/ops/suppliers")
async def list_suppliers(status: str = None, supplier_type: str = None, user: dict = Depends(verify_token)):
    """Listar proveedores"""
    suppliers = get_suppliers()
    if status:
        suppliers = [s for s in suppliers if s.status == status]
    if supplier_type:
        suppliers = [s for s in suppliers if s.supplier_type == supplier_type]
    return {"total": len(suppliers), "suppliers": suppliers}

@api_router.get("/ops/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str, user: dict = Depends(verify_token)):
    """Obtener detalle de proveedor"""
    suppliers = get_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return supplier

@api_router.post("/ops/suppliers")
async def create_supplier(supplier_data: dict, user: dict = Depends(verify_token)):
    """Crear nuevo proveedor"""
    global _suppliers_cache
    
    new_supplier = Supplier(
        company_name=supplier_data.get("company_name"),
        trade_name=supplier_data.get("trade_name"),
        rfc=supplier_data.get("rfc"),
        supplier_type=supplier_data.get("supplier_type", "otro"),
        contact_name=supplier_data.get("contact_name"),
        contact_email=supplier_data.get("contact_email"),
        contact_phone=supplier_data.get("contact_phone"),
        address=supplier_data.get("address"),
        city=supplier_data.get("city"),
        state=supplier_data.get("state"),
        credit_days=supplier_data.get("credit_days", 0),
        credit_limit=supplier_data.get("credit_limit", 0),
        payment_method=supplier_data.get("payment_method", "transferencia"),
        bank_name=supplier_data.get("bank_name"),
        bank_account=supplier_data.get("bank_account"),
        clabe=supplier_data.get("clabe"),
        notes=supplier_data.get("notes"),
        status="pending_approval"
    )
    
    _suppliers_cache = get_suppliers()
    _suppliers_cache.insert(0, new_supplier)
    
    return {"success": True, "supplier": new_supplier}

@api_router.put("/ops/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, supplier_data: dict, user: dict = Depends(verify_token)):
    """Actualizar proveedor"""
    suppliers = get_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    for key, value in supplier_data.items():
        if hasattr(supplier, key) and value is not None:
            setattr(supplier, key, value)
    supplier.updated_at = datetime.now(timezone.utc).isoformat()
    
    return {"success": True, "supplier": supplier}

@api_router.post("/ops/suppliers/{supplier_id}/documents")
async def add_supplier_document(supplier_id: str, doc_data: dict, user: dict = Depends(verify_token)):
    """Agregar documento a proveedor"""
    suppliers = get_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    new_doc = SupplierDocument(
        doc_type=doc_data.get("doc_type"),
        file_name=doc_data.get("file_name"),
        file_url=doc_data.get("file_url"),
        status="pending",
        notes=doc_data.get("notes")
    )
    supplier.documents.append(new_doc)
    
    return {"success": True, "document": new_doc}

@api_router.post("/ops/suppliers/{supplier_id}/audits")
async def add_supplier_audit(supplier_id: str, audit_data: dict, user: dict = Depends(verify_token)):
    """Agregar auditoría a proveedor"""
    suppliers = get_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    new_audit = SupplierAudit(
        audit_date=audit_data.get("audit_date"),
        auditor_name=audit_data.get("auditor_name"),
        audit_type=audit_data.get("audit_type", "seguimiento"),
        score=audit_data.get("score", 0),
        status=audit_data.get("status", "pending"),
        findings=audit_data.get("findings", []),
        recommendations=audit_data.get("recommendations", []),
        next_audit_date=audit_data.get("next_audit_date"),
        notes=audit_data.get("notes")
    )
    supplier.audits.append(new_audit)
    
    return {"success": True, "audit": new_audit}

@api_router.post("/ops/suppliers/{supplier_id}/sign-contract")
async def sign_supplier_contract(supplier_id: str, user: dict = Depends(verify_token)):
    """Firmar contrato con proveedor"""
    suppliers = get_suppliers()
    supplier = next((s for s in suppliers if s.id == supplier_id), None)
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    supplier.contract_status = "signed"
    supplier.contract_signed_at = datetime.now(timezone.utc).isoformat()
    if not supplier.contract_start:
        supplier.contract_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not supplier.contract_end:
        supplier.contract_end = (datetime.now(timezone.utc) + timedelta(days=365)).strftime("%Y-%m-%d")
    supplier.status = "active"
    
    return {"success": True, "supplier": supplier}

# ==================== CLIENTS ENDPOINTS ====================

@api_router.get("/ops/clients")
async def list_clients(status: str = None, industry: str = None, user: dict = Depends(verify_token)):
    """Listar clientes"""
    clients = get_clients()
    if status:
        clients = [c for c in clients if c.status == status]
    if industry:
        clients = [c for c in clients if c.industry == industry]
    return {"total": len(clients), "clients": clients}

@api_router.get("/ops/clients/{client_id}")
async def get_client(client_id: str, user: dict = Depends(verify_token)):
    """Obtener detalle de cliente"""
    clients = get_clients()
    client = next((c for c in clients if c.id == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client

@api_router.post("/ops/clients")
async def create_client(client_data: dict, user: dict = Depends(verify_token)):
    """Crear nuevo cliente"""
    global _clients_cache
    
    new_client = Client(
        company_name=client_data.get("company_name"),
        trade_name=client_data.get("trade_name"),
        rfc=client_data.get("rfc"),
        industry=client_data.get("industry", "otro"),
        contact_name=client_data.get("contact_name"),
        contact_email=client_data.get("contact_email"),
        contact_phone=client_data.get("contact_phone"),
        address=client_data.get("address"),
        city=client_data.get("city"),
        state=client_data.get("state"),
        credit_days=client_data.get("credit_days", 0),
        credit_limit=client_data.get("credit_limit", 0),
        payment_method=client_data.get("payment_method", "transferencia"),
        notes=client_data.get("notes"),
        status="active"
    )
    
    _clients_cache = get_clients()
    _clients_cache.insert(0, new_client)
    
    return {"success": True, "client": new_client}

@api_router.put("/ops/clients/{client_id}")
async def update_client(client_id: str, client_data: dict, user: dict = Depends(verify_token)):
    """Actualizar cliente"""
    clients = get_clients()
    client = next((c for c in clients if c.id == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    for key, value in client_data.items():
        if hasattr(client, key) and value is not None:
            setattr(client, key, value)
    client.updated_at = datetime.now(timezone.utc).isoformat()
    
    return {"success": True, "client": client}

@api_router.post("/ops/clients/{client_id}/documents")
async def add_client_document(client_id: str, doc_data: dict, user: dict = Depends(verify_token)):
    """Agregar documento a cliente"""
    clients = get_clients()
    client = next((c for c in clients if c.id == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    new_doc = ClientDocument(
        doc_type=doc_data.get("doc_type"),
        file_name=doc_data.get("file_name"),
        file_url=doc_data.get("file_url"),
        status="pending",
        notes=doc_data.get("notes")
    )
    client.documents.append(new_doc)
    
    return {"success": True, "document": new_doc}

@api_router.post("/ops/clients/{client_id}/sign-contract")
async def sign_client_contract(client_id: str, user: dict = Depends(verify_token)):
    """Firmar contrato con cliente"""
    clients = get_clients()
    client = next((c for c in clients if c.id == client_id), None)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    client.contract_status = "signed"
    client.contract_signed_at = datetime.now(timezone.utc).isoformat()
    if not client.contract_start:
        client.contract_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not client.contract_end:
        client.contract_end = (datetime.now(timezone.utc) + timedelta(days=365)).strftime("%Y-%m-%d")
    
    return {"success": True, "client": client}

# Include the router in the main app
# ==================== YARD MANAGEMENT MODELS ====================

class YardLocation(BaseModel):
    """Una ubicación/celda en el patio de contenedores"""
    row: int  # Fila (1-10)
    column: int  # Columna (A-Z representada como 1-26)
    stack_level: int  # Nivel de apilamiento (0 = vacío, 1-5 = niveles)
    
class YardContainer(BaseModel):
    """Un contenedor en el patio"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_number: str
    size: str  # 20ft, 40ft, 40ft HC
    type: str  # dry, reefer, open_top
    status: str  # full, empty
    arrival_date: str
    expected_departure: Optional[str] = None
    client_name: str
    destination: Optional[str] = None
    priority: int = 5  # 1 = más urgente, 10 = menos urgente
    weight: float = 0.0
    # Posición en patio
    row: int
    column: int
    stack_level: int

class YardCell(BaseModel):
    """Una celda del patio con sus contenedores apilados"""
    row: int
    column: int
    column_letter: str
    max_stack: int = 5
    containers: List[YardContainer] = []
    is_occupied: bool = False
    total_containers: int = 0

class YardLayout(BaseModel):
    """Layout completo del patio"""
    rows: int
    columns: int
    cells: List[YardCell]
    total_capacity: int
    total_occupied: int
    utilization_percent: float
    full_containers: int
    empty_containers: int

class MoveOperation(BaseModel):
    """Una operación de movimiento de contenedor"""
    container_number: str
    from_position: str
    to_position: str
    reason: str

class RetrievalPlan(BaseModel):
    """Plan de recuperación de un contenedor"""
    target_container: YardContainer
    target_position: str
    containers_above: int
    moves_required: List[MoveOperation]
    total_moves: int
    estimated_time_minutes: int

class OptimizedRetrievalResponse(BaseModel):
    """Respuesta de optimización de retrieval"""
    container_number: str
    found: bool
    current_position: str
    stack_level: int
    containers_above: int
    retrieval_plan: Optional[RetrievalPlan] = None
    message: str

# ==================== YARD MOCK DATA GENERATION ====================

YARD_CONFIG = {
    "rows": 8,
    "columns": 12,
    "max_stack": 5
}

def generate_yard_data():
    """Genera datos mock del patio de contenedores"""
    cells = []
    all_containers = []
    
    # Clientes para los contenedores
    clients = ["Pernod Ricard", "Diageo", "Beam Suntory", "Brown-Forman", "Campari Group"]
    destinations = ["CEDIS GDL", "CEDIS MTY", "CEDIS CDMX", "Walmart Centro", "Costco Norte", "HEB Noreste"]
    
    for row in range(1, YARD_CONFIG["rows"] + 1):
        for col in range(1, YARD_CONFIG["columns"] + 1):
            col_letter = chr(64 + col)  # 1=A, 2=B, etc.
            
            # Probabilidad de tener contenedores en esta celda
            has_containers = random.random() > 0.3  # 70% de celdas ocupadas
            
            cell_containers = []
            if has_containers:
                # Número aleatorio de contenedores apilados (1-4)
                num_containers = random.randint(1, 4)
                
                for level in range(1, num_containers + 1):
                    # Algunos contenedores vacíos, otros llenos
                    is_empty = random.random() > 0.7  # 30% vacíos
                    
                    # Prioridad basada en fecha de salida
                    days_until_departure = random.randint(0, 14)
                    priority = min(10, max(1, days_until_departure))
                    
                    arrival_date = (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
                    departure_date = None if is_empty else (datetime.now(timezone.utc) + timedelta(days=days_until_departure)).strftime("%Y-%m-%d")
                    
                    container = YardContainer(
                        container_number=generate_container_number(),
                        size=random.choice(["20ft", "40ft", "40ft HC"]),
                        type=random.choice(["dry", "dry", "dry", "reefer"]),
                        status="empty" if is_empty else "full",
                        arrival_date=arrival_date,
                        expected_departure=departure_date,
                        client_name=random.choice(clients) if not is_empty else "N/A",
                        destination=random.choice(destinations) if not is_empty else None,
                        priority=priority if not is_empty else 10,
                        weight=0.0 if is_empty else round(random.uniform(8000, 25000), 0),
                        row=row,
                        column=col,
                        stack_level=level
                    )
                    cell_containers.append(container)
                    all_containers.append(container)
            
            cells.append(YardCell(
                row=row,
                column=col,
                column_letter=col_letter,
                max_stack=YARD_CONFIG["max_stack"],
                containers=cell_containers,
                is_occupied=len(cell_containers) > 0,
                total_containers=len(cell_containers)
            ))
    
    # Calcular estadísticas
    total_capacity = YARD_CONFIG["rows"] * YARD_CONFIG["columns"] * YARD_CONFIG["max_stack"]
    total_occupied = len(all_containers)
    full_containers = len([c for c in all_containers if c.status == "full"])
    empty_containers = len([c for c in all_containers if c.status == "empty"])
    
    return YardLayout(
        rows=YARD_CONFIG["rows"],
        columns=YARD_CONFIG["columns"],
        cells=cells,
        total_capacity=total_capacity,
        total_occupied=total_occupied,
        utilization_percent=round((total_occupied / total_capacity) * 100, 1),
        full_containers=full_containers,
        empty_containers=empty_containers
    )

# Cache para mantener consistencia durante la sesión
_yard_cache = None

def get_yard_layout():
    """Obtiene el layout del patio (cached)"""
    global _yard_cache
    if _yard_cache is None:
        _yard_cache = generate_yard_data()
    return _yard_cache

def reset_yard_cache():
    """Resetea el cache del patio"""
    global _yard_cache
    _yard_cache = None

def find_container_in_yard(container_number: str, yard: YardLayout) -> Optional[tuple]:
    """Encuentra un contenedor en el patio. Retorna (cell, container) o None"""
    for cell in yard.cells:
        for container in cell.containers:
            if container.container_number == container_number:
                return (cell, container)
    return None

def calculate_optimal_retrieval(container_number: str, yard: YardLayout) -> OptimizedRetrievalResponse:
    """
    Calcula el plan óptimo para recuperar un contenedor.
    Considera las fechas de salida de los contenedores que hay que mover.
    """
    result = find_container_in_yard(container_number, yard)
    
    if not result:
        return OptimizedRetrievalResponse(
            container_number=container_number,
            found=False,
            current_position="",
            stack_level=0,
            containers_above=0,
            retrieval_plan=None,
            message=f"❌ Contenedor {container_number} no encontrado en el patio"
        )
    
    cell, target_container = result
    col_letter = chr(64 + cell.column)
    position = f"{col_letter}{cell.row}"
    
    # Encontrar contenedores encima del target
    containers_above = [c for c in cell.containers if c.stack_level > target_container.stack_level]
    containers_above.sort(key=lambda x: x.stack_level, reverse=True)  # De arriba a abajo
    
    if not containers_above:
        # No hay contenedores encima - retrieval directo
        return OptimizedRetrievalResponse(
            container_number=container_number,
            found=True,
            current_position=position,
            stack_level=target_container.stack_level,
            containers_above=0,
            retrieval_plan=RetrievalPlan(
                target_container=target_container,
                target_position=position,
                containers_above=0,
                moves_required=[],
                total_moves=0,
                estimated_time_minutes=5
            ),
            message=f"✅ Contenedor en posición {position}-{target_container.stack_level}. Acceso directo, sin movimientos necesarios."
        )
    
    # Hay contenedores encima - calcular plan de movimientos
    moves = []
    
    # Encontrar celdas vacías cercanas ordenadas por proximidad
    empty_positions = []
    for c in yard.cells:
        if c.total_containers < YARD_CONFIG["max_stack"]:
            distance = abs(c.row - cell.row) + abs(c.column - cell.column)
            available_slots = YARD_CONFIG["max_stack"] - c.total_containers
            empty_positions.append((c, distance, available_slots))
    
    # Ordenar por distancia y disponibilidad
    empty_positions.sort(key=lambda x: (x[1], -x[2]))
    
    # Asignar movimientos priorizando por fecha de salida (mover primero los que salen después)
    containers_above.sort(key=lambda x: (x.expected_departure or "9999-99-99"), reverse=True)
    
    position_index = 0
    for container_to_move in containers_above:
        if position_index >= len(empty_positions):
            # No hay más espacio - buscar cualquier celda disponible
            continue
            
        target_cell, distance, _ = empty_positions[position_index]
        target_col_letter = chr(64 + target_cell.column)
        new_level = target_cell.total_containers + 1
        
        from_pos = f"{col_letter}{cell.row}-{container_to_move.stack_level}"
        to_pos = f"{target_col_letter}{target_cell.row}-{new_level}"
        
        reason = f"Mover para acceder a {container_number}"
        if container_to_move.expected_departure:
            reason += f" (sale: {container_to_move.expected_departure})"
        
        moves.append(MoveOperation(
            container_number=container_to_move.container_number,
            from_position=from_pos,
            to_position=to_pos,
            reason=reason
        ))
        
        # Actualizar disponibilidad de la celda destino
        empty_positions[position_index] = (
            target_cell, 
            distance, 
            empty_positions[position_index][2] - 1
        )
        if empty_positions[position_index][2] <= 0:
            position_index += 1
    
    # Tiempo estimado: 5 min por movimiento + 5 min para el retrieval final
    estimated_time = len(moves) * 5 + 5
    
    return OptimizedRetrievalResponse(
        container_number=container_number,
        found=True,
        current_position=position,
        stack_level=target_container.stack_level,
        containers_above=len(containers_above),
        retrieval_plan=RetrievalPlan(
            target_container=target_container,
            target_position=position,
            containers_above=len(containers_above),
            moves_required=moves,
            total_moves=len(moves),
            estimated_time_minutes=estimated_time
        ),
        message=f"📦 Contenedor en {position}-{target_container.stack_level}. Se requieren {len(moves)} movimiento(s) para acceder."
    )

# ==================== YARD MANAGEMENT ENDPOINTS ====================

@api_router.get("/yard/layout", response_model=YardLayout)
async def get_yard_layout_endpoint(user: dict = Depends(verify_token)):
    """Obtener el layout completo del patio de contenedores"""
    return get_yard_layout()

@api_router.get("/yard/stats")
async def get_yard_statistics(user: dict = Depends(verify_token)):
    """Obtener estadísticas del patio"""
    yard = get_yard_layout()
    
    # Agrupar por cliente
    containers_by_client = {}
    containers_by_status = {"full": 0, "empty": 0}
    containers_by_size = {}
    departures_today = []
    departures_week = []
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_end = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    
    for cell in yard.cells:
        for container in cell.containers:
            # Por cliente
            client = container.client_name
            if client not in containers_by_client:
                containers_by_client[client] = 0
            containers_by_client[client] += 1
            
            # Por status
            containers_by_status[container.status] += 1
            
            # Por tamaño
            if container.size not in containers_by_size:
                containers_by_size[container.size] = 0
            containers_by_size[container.size] += 1
            
            # Salidas próximas
            if container.expected_departure:
                if container.expected_departure <= today:
                    departures_today.append({
                        "container": container.container_number,
                        "client": container.client_name,
                        "destination": container.destination,
                        "position": f"{chr(64+container.column)}{container.row}-{container.stack_level}"
                    })
                elif container.expected_departure <= week_end:
                    departures_week.append({
                        "container": container.container_number,
                        "client": container.client_name,
                        "destination": container.destination,
                        "expected_date": container.expected_departure,
                        "position": f"{chr(64+container.column)}{container.row}-{container.stack_level}"
                    })
    
    return {
        "total_capacity": yard.total_capacity,
        "total_occupied": yard.total_occupied,
        "utilization_percent": yard.utilization_percent,
        "full_containers": yard.full_containers,
        "empty_containers": yard.empty_containers,
        "by_client": containers_by_client,
        "by_status": containers_by_status,
        "by_size": containers_by_size,
        "departures_today": departures_today,
        "departures_this_week": departures_week
    }

@api_router.get("/yard/search/{container_number}")
async def search_container_in_yard(container_number: str, user: dict = Depends(verify_token)):
    """Buscar un contenedor específico en el patio"""
    yard = get_yard_layout()
    result = find_container_in_yard(container_number, yard)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Contenedor {container_number} no encontrado")
    
    cell, container = result
    col_letter = chr(64 + cell.column)
    
    return {
        "found": True,
        "container": container,
        "position": {
            "row": cell.row,
            "column": cell.column,
            "column_letter": col_letter,
            "stack_level": container.stack_level,
            "full_position": f"{col_letter}{cell.row}-{container.stack_level}"
        },
        "containers_above": len([c for c in cell.containers if c.stack_level > container.stack_level]),
        "containers_below": len([c for c in cell.containers if c.stack_level < container.stack_level])
    }

@api_router.post("/yard/optimize-retrieval/{container_number}", response_model=OptimizedRetrievalResponse)
async def optimize_container_retrieval(container_number: str, user: dict = Depends(verify_token)):
    """
    Calcula el plan óptimo para recuperar un contenedor minimizando movimientos.
    Considera las fechas de salida de los contenedores que hay que mover.
    """
    yard = get_yard_layout()
    return calculate_optimal_retrieval(container_number, yard)

@api_router.get("/yard/containers/by-departure")
async def get_containers_by_departure(user: dict = Depends(verify_token)):
    """Obtener contenedores ordenados por fecha de salida (más urgentes primero)"""
    yard = get_yard_layout()
    
    containers_with_departure = []
    for cell in yard.cells:
        for container in cell.containers:
            if container.status == "full" and container.expected_departure:
                col_letter = chr(64 + container.column)
                containers_above = len([c for c in cell.containers if c.stack_level > container.stack_level])
                
                containers_with_departure.append({
                    "container_number": container.container_number,
                    "client_name": container.client_name,
                    "destination": container.destination,
                    "expected_departure": container.expected_departure,
                    "position": f"{col_letter}{container.row}-{container.stack_level}",
                    "containers_above": containers_above,
                    "needs_moves": containers_above > 0,
                    "priority": container.priority
                })
    
    # Ordenar por fecha de salida y prioridad
    containers_with_departure.sort(key=lambda x: (x["expected_departure"], x["priority"]))
    
    return {
        "total": len(containers_with_departure),
        "containers": containers_with_departure
    }

@api_router.post("/yard/reset")
async def reset_yard_data(user: dict = Depends(verify_token)):
    """Resetear los datos del patio (regenerar datos mock)"""
    reset_yard_cache()
    return {"message": "Datos del patio regenerados", "success": True}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
