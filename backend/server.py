from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import random

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

# Include the router in the main app
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
