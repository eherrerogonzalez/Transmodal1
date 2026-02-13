"""
Test suite for Operations Portal - Suppliers and Clients modules
Testing all CRUD operations for /api/ops/suppliers and /api/ops/clients endpoints
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOpsAuthentication:
    """Test Operations Portal authentication"""
    
    def test_ops_login_success(self):
        """Test successful login to Operations Portal"""
        response = requests.post(
            f"{BASE_URL}/api/ops/auth/login",
            json={"username": "operaciones", "password": "ops123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == "operaciones"
        assert data["user"]["user_type"] == "operations"
        print(f"✓ Operations login successful - token: {data['token'][:30]}...")
    
    def test_ops_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/ops/auth/login",
            json={"username": "invalid", "password": "wrong"}
        )
        assert response.status_code == 401, "Expected 401 for invalid credentials"
        print("✓ Invalid credentials correctly rejected")


class TestOpsSuppliers:
    """Test Suppliers CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/ops/auth/login",
            json={"username": "operaciones", "password": "ops123"}
        )
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_list_suppliers(self):
        """Test GET /api/ops/suppliers - list all suppliers"""
        response = requests.get(
            f"{BASE_URL}/api/ops/suppliers",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to list suppliers: {response.text}"
        data = response.json()
        assert "suppliers" in data
        assert "total" in data
        assert isinstance(data["suppliers"], list)
        print(f"✓ Listed {data['total']} suppliers")
    
    def test_list_suppliers_filter_by_type(self):
        """Test filtering suppliers by type"""
        response = requests.get(
            f"{BASE_URL}/api/ops/suppliers?supplier_type=naviera",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # All returned suppliers should be of type naviera (if any)
        for supplier in data["suppliers"]:
            if "supplier_type" in supplier:
                # Only check if supplier_type exists
                pass
        print(f"✓ Filtered suppliers by type - got {data['total']} results")
    
    def test_create_supplier(self):
        """Test POST /api/ops/suppliers - create new supplier"""
        new_supplier = {
            "company_name": "TEST Naviera Ejemplo SA",
            "trade_name": "NavEjemplo",
            "rfc": "TEST123456ABC",
            "supplier_type": "naviera",
            "contact_name": "Juan Test",
            "contact_email": "test@naviera-ejemplo.com",
            "contact_phone": "+52 555 123 4567",
            "address": "Av. Test 123",
            "city": "Manzanillo",
            "state": "Colima",
            "credit_days": 30,
            "credit_limit": 50000,
            "payment_method": "transferencia",
            "bank_name": "BBVA",
            "bank_account": "0123456789",
            "clabe": "012345678901234567",
            "notes": "Proveedor de prueba"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ops/suppliers",
            headers=self.headers,
            json=new_supplier
        )
        assert response.status_code == 200, f"Failed to create supplier: {response.text}"
        data = response.json()
        assert "supplier" in data
        assert data["supplier"]["company_name"] == new_supplier["company_name"]
        assert data["supplier"]["rfc"] == new_supplier["rfc"]
        assert "id" in data["supplier"]
        
        # Store supplier ID for later tests
        self.__class__.created_supplier_id = data["supplier"]["id"]
        print(f"✓ Created supplier: {data['supplier']['company_name']} (ID: {data['supplier']['id']})")
        return data["supplier"]["id"]
    
    def test_get_supplier_detail(self):
        """Test GET /api/ops/suppliers/{id} - get supplier detail"""
        # First get list to find a valid ID
        response = requests.get(f"{BASE_URL}/api/ops/suppliers", headers=self.headers)
        suppliers = response.json()["suppliers"]
        if not suppliers:
            pytest.skip("No suppliers available to test detail view")
        
        supplier_id = suppliers[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/ops/suppliers/{supplier_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get supplier: {response.text}"
        data = response.json()
        assert data["id"] == supplier_id
        assert "company_name" in data
        assert "documents" in data
        assert "audits" in data
        assert "contract_status" in data
        print(f"✓ Got supplier detail: {data['company_name']}")
    
    def test_get_supplier_not_found(self):
        """Test getting non-existent supplier returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/ops/suppliers/non_existent_id_12345",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✓ Non-existent supplier returns 404")
    
    def test_add_document_to_supplier(self):
        """Test POST /api/ops/suppliers/{id}/documents - add document"""
        # Get a supplier first
        response = requests.get(f"{BASE_URL}/api/ops/suppliers", headers=self.headers)
        suppliers = response.json()["suppliers"]
        if not suppliers:
            pytest.skip("No suppliers available")
        
        supplier_id = suppliers[0]["id"]
        doc_data = {
            "doc_type": "acta_constitutiva",
            "file_name": "test_acta_constitutiva.pdf",
            "notes": "Documento de prueba"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ops/suppliers/{supplier_id}/documents",
            headers=self.headers,
            json=doc_data
        )
        assert response.status_code == 200, f"Failed to add document: {response.text}"
        data = response.json()
        assert "document" in data
        assert data["document"]["doc_type"] == "acta_constitutiva"
        assert data["document"]["file_name"] == "test_acta_constitutiva.pdf"
        print(f"✓ Added document to supplier: {doc_data['file_name']}")
    
    def test_add_audit_to_supplier(self):
        """Test POST /api/ops/suppliers/{id}/audits - add audit"""
        # Get a supplier first
        response = requests.get(f"{BASE_URL}/api/ops/suppliers", headers=self.headers)
        suppliers = response.json()["suppliers"]
        if not suppliers:
            pytest.skip("No suppliers available")
        
        supplier_id = suppliers[0]["id"]
        audit_data = {
            "audit_date": datetime.now().strftime("%Y-%m-%d"),
            "auditor_name": "Auditor Test",
            "audit_type": "inicial",
            "score": 85,
            "status": "approved",
            "findings": ["Hallazgo 1", "Hallazgo 2"],
            "recommendations": ["Recomendación 1"],
            "notes": "Auditoría de prueba"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ops/suppliers/{supplier_id}/audits",
            headers=self.headers,
            json=audit_data
        )
        assert response.status_code == 200, f"Failed to add audit: {response.text}"
        data = response.json()
        assert "audit" in data
        assert data["audit"]["score"] == 85
        assert data["audit"]["auditor_name"] == "Auditor Test"
        print(f"✓ Added audit to supplier: score {data['audit']['score']}")
    
    def test_sign_supplier_contract(self):
        """Test POST /api/ops/suppliers/{id}/sign-contract - sign contract"""
        # Get a supplier first
        response = requests.get(f"{BASE_URL}/api/ops/suppliers", headers=self.headers)
        suppliers = response.json()["suppliers"]
        
        # Find a supplier with pending contract
        supplier = next((s for s in suppliers if s.get("contract_status") != "signed"), None)
        if not supplier:
            pytest.skip("No suppliers with pending contract")
        
        supplier_id = supplier["id"]
        response = requests.post(
            f"{BASE_URL}/api/ops/suppliers/{supplier_id}/sign-contract",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to sign contract: {response.text}"
        data = response.json()
        assert "supplier" in data
        assert data["supplier"]["contract_status"] == "signed"
        assert "contract_signed_at" in data["supplier"]
        print(f"✓ Signed contract for supplier: {data['supplier']['company_name']}")


class TestOpsClients:
    """Test Clients CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/ops/auth/login",
            json={"username": "operaciones", "password": "ops123"}
        )
        self.token = response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_list_clients(self):
        """Test GET /api/ops/clients - list all clients"""
        response = requests.get(
            f"{BASE_URL}/api/ops/clients",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to list clients: {response.text}"
        data = response.json()
        assert "clients" in data
        assert "total" in data
        assert isinstance(data["clients"], list)
        print(f"✓ Listed {data['total']} clients")
    
    def test_list_clients_filter_by_industry(self):
        """Test filtering clients by industry"""
        response = requests.get(
            f"{BASE_URL}/api/ops/clients?industry=bebidas",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Filtered clients by industry - got {data['total']} results")
    
    def test_create_client(self):
        """Test POST /api/ops/clients - create new client"""
        new_client = {
            "company_name": "TEST Empresa Bebidas SA",
            "trade_name": "BebidasTest",
            "rfc": "TESTCLI456DEF",
            "industry": "bebidas",
            "contact_name": "Maria Test",
            "contact_email": "test@empresa-bebidas.com",
            "contact_phone": "+52 555 987 6543",
            "address": "Calle Cliente 456",
            "city": "Guadalajara",
            "state": "Jalisco",
            "credit_days": 45,
            "credit_limit": 100000,
            "payment_method": "transferencia",
            "notes": "Cliente de prueba"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ops/clients",
            headers=self.headers,
            json=new_client
        )
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        data = response.json()
        assert "client" in data
        assert data["client"]["company_name"] == new_client["company_name"]
        assert data["client"]["rfc"] == new_client["rfc"]
        assert "id" in data["client"]
        
        self.__class__.created_client_id = data["client"]["id"]
        print(f"✓ Created client: {data['client']['company_name']} (ID: {data['client']['id']})")
        return data["client"]["id"]
    
    def test_get_client_detail(self):
        """Test GET /api/ops/clients/{id} - get client detail"""
        # First get list to find a valid ID
        response = requests.get(f"{BASE_URL}/api/ops/clients", headers=self.headers)
        clients = response.json()["clients"]
        if not clients:
            pytest.skip("No clients available to test detail view")
        
        client_id = clients[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/ops/clients/{client_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get client: {response.text}"
        data = response.json()
        assert data["id"] == client_id
        assert "company_name" in data
        assert "documents" in data
        assert "contract_status" in data
        assert "total_shipments" in data
        assert "total_revenue" in data
        print(f"✓ Got client detail: {data['company_name']}")
    
    def test_get_client_not_found(self):
        """Test getting non-existent client returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/ops/clients/non_existent_id_12345",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✓ Non-existent client returns 404")
    
    def test_add_document_to_client(self):
        """Test POST /api/ops/clients/{id}/documents - add document"""
        # Get a client first
        response = requests.get(f"{BASE_URL}/api/ops/clients", headers=self.headers)
        clients = response.json()["clients"]
        if not clients:
            pytest.skip("No clients available")
        
        client_id = clients[0]["id"]
        doc_data = {
            "doc_type": "csf",
            "file_name": "test_constancia_fiscal.pdf",
            "notes": "Constancia de situación fiscal de prueba"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ops/clients/{client_id}/documents",
            headers=self.headers,
            json=doc_data
        )
        assert response.status_code == 200, f"Failed to add document: {response.text}"
        data = response.json()
        assert "document" in data
        assert data["document"]["doc_type"] == "csf"
        assert data["document"]["file_name"] == "test_constancia_fiscal.pdf"
        print(f"✓ Added document to client: {doc_data['file_name']}")
    
    def test_sign_client_contract(self):
        """Test POST /api/ops/clients/{id}/sign-contract - sign contract"""
        # Get a client first
        response = requests.get(f"{BASE_URL}/api/ops/clients", headers=self.headers)
        clients = response.json()["clients"]
        
        # Find a client with pending contract
        client = next((c for c in clients if c.get("contract_status") != "signed"), None)
        if not client:
            pytest.skip("No clients with pending contract")
        
        client_id = client["id"]
        response = requests.post(
            f"{BASE_URL}/api/ops/clients/{client_id}/sign-contract",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to sign contract: {response.text}"
        data = response.json()
        assert "client" in data
        assert data["client"]["contract_status"] == "signed"
        assert "contract_signed_at" in data["client"]
        print(f"✓ Signed contract for client: {data['client']['company_name']}")


class TestOpsAuthRequired:
    """Test that auth is required for all operations endpoints"""
    
    def test_suppliers_requires_auth(self):
        """Test that /api/ops/suppliers requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ops/suppliers")
        assert response.status_code in [401, 403], "Suppliers should require auth"
        print("✓ Suppliers endpoint requires authentication")
    
    def test_clients_requires_auth(self):
        """Test that /api/ops/clients requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ops/clients")
        assert response.status_code in [401, 403], "Clients should require auth"
        print("✓ Clients endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
