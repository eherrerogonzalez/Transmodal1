#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Transmodal Client Portal
Tests all mock endpoints with realistic scenarios
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class TransmodalAPITester:
    def __init__(self, base_url="https://logistic-dashboard-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[Any, Any] = None, files: Dict[str, Any] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    headers.pop('Content-Type', None)
                    response = self.session.post(url, files=files, headers=headers)
                else:
                    response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {"message": "Success - No JSON response"}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_data = response.json()
                    self.log(f"   Error details: {error_data}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "ERROR")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_login_valid(self):
        """Test login with valid credentials"""
        success, response = self.run_test(
            "Login (Valid Credentials)",
            "POST",
            "auth/login",
            200,
            data={"username": "demo", "password": "demo123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log(f"   Token obtained: {self.token[:20]}...", "INFO")
            return True
        return False

    def test_login_invalid(self):
        """Test login with empty credentials"""
        success, _ = self.run_test(
            "Login (Empty Credentials)",
            "POST", 
            "auth/login",
            401,
            data={"username": "", "password": ""}
        )
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            required_fields = ['id', 'username', 'company', 'email']
            for field in required_fields:
                if field not in response:
                    self.log(f"   Missing field: {field}", "WARN")
                    return False
            self.log(f"   User: {response.get('username')} - {response.get('company')}", "INFO")
        return success

    def test_dashboard_data(self):
        """Test dashboard KPIs endpoint"""
        success, response = self.run_test(
            "Dashboard Data",
            "GET",
            "dashboard",
            200
        )
        
        if success:
            required_fields = ['total_containers', 'containers_in_transit', 'total_spent', 'monthly_data']
            for field in required_fields:
                if field not in response:
                    self.log(f"   Missing field: {field}", "WARN")
                    return False
            
            self.log(f"   Total containers: {response.get('total_containers')}", "INFO")
            self.log(f"   In transit: {response.get('containers_in_transit')}", "INFO")
            self.log(f"   Monthly data points: {len(response.get('monthly_data', []))}", "INFO")
        return success

    def test_containers_list(self):
        """Test containers list endpoint"""
        success, response = self.run_test(
            "Containers List",
            "GET",
            "containers",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} containers", "INFO")
            if response:
                container = response[0]
                required_fields = ['container_number', 'type', 'status', 'origin', 'destination']
                for field in required_fields:
                    if field not in container:
                        self.log(f"   Missing container field: {field}", "WARN")
                        return False
        return success

    def test_container_locations(self):
        """Test container locations for map"""
        success, response = self.run_test(
            "Container Locations",
            "GET",
            "containers/locations/all",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} container locations", "INFO")
            if response:
                location = response[0]
                required_fields = ['container_id', 'latitude', 'longitude', 'status']
                for field in required_fields:
                    if field not in location:
                        self.log(f"   Missing location field: {field}", "WARN")
                        return False
        return success

    def test_orders_list(self):
        """Test orders list endpoint"""
        success, response = self.run_test(
            "Orders List",
            "GET",
            "orders",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} orders", "INFO")
            if response:
                order = response[0]
                required_fields = ['order_number', 'origin', 'destination', 'status', 'total_cost']
                for field in required_fields:
                    if field not in order:
                        self.log(f"   Missing order field: {field}", "WARN")
                        return False
        return success

    def test_create_order(self):
        """Test creating a new order"""
        order_data = {
            "origin": "Shanghai",
            "destination": "Los Angeles",
            "container_type": "Dry",
            "container_size": "40ft",
            "cargo_description": "Test Electronics",
            "weight": 15000.0
        }
        
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            201,
            data=order_data
        )
        
        if success:
            self.log(f"   Created order: {response.get('order_number')}", "INFO")
            # Store order ID for document upload test
            self.created_order_id = response.get('id')
        return success

    def test_upload_document(self):
        """Test document upload to order"""
        if not hasattr(self, 'created_order_id') or not self.created_order_id:
            self.log("   Skipping - No order ID available", "WARN")
            return True
            
        # Create a mock file
        mock_file_content = b"Mock PDF content for testing"
        files = {
            'file': ('test_document.pdf', mock_file_content, 'application/pdf')
        }
        
        success, response = self.run_test(
            "Upload Document",
            "POST",
            f"orders/{self.created_order_id}/documents",
            200,
            files=files
        )
        
        if success:
            self.log(f"   Document uploaded: {response.get('message')}", "INFO")
        return success

    def test_additionals_list(self):
        """Test additionals list endpoint"""
        success, response = self.run_test(
            "Additionals List",
            "GET",
            "additionals",
            200
        )
        
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} additionals", "INFO")
            if response:
                additional = response[0]
                required_fields = ['id', 'description', 'amount', 'status']
                for field in required_fields:
                    if field not in additional:
                        self.log(f"   Missing additional field: {field}", "WARN")
                        return False
                # Store first additional ID for approval test
                self.additional_id = additional['id']
        return success

    def test_approve_additional(self):
        """Test approving an additional charge"""
        if not hasattr(self, 'additional_id') or not self.additional_id:
            self.log("   Skipping - No additional ID available", "WARN")
            return True
            
        success, response = self.run_test(
            "Approve Additional",
            "PUT",
            f"additionals/{self.additional_id}/approve",
            200
        )
        
        if success:
            self.log(f"   Additional approved: {response.get('message')}", "INFO")
        return success

    def test_reject_additional(self):
        """Test rejecting an additional charge"""
        if not hasattr(self, 'additional_id') or not self.additional_id:
            self.log("   Skipping - No additional ID available", "WARN")
            return True
            
        # Use a different ID to avoid conflicts
        test_id = "test-additional-id"
        success, response = self.run_test(
            "Reject Additional",
            "PUT",
            f"additionals/{test_id}/reject",
            200
        )
        
        if success:
            self.log(f"   Additional rejected: {response.get('message')}", "INFO")
        return success

    def test_account_statement(self):
        """Test account statement endpoint"""
        success, response = self.run_test(
            "Account Statement",
            "GET",
            "account-statement",
            200
        )
        
        if success:
            required_fields = ['client_name', 'current_balance', 'credit_limit', 'transactions']
            for field in required_fields:
                if field not in response:
                    self.log(f"   Missing statement field: {field}", "WARN")
                    return False
            
            self.log(f"   Client: {response.get('client_name')}", "INFO")
            self.log(f"   Balance: ${response.get('current_balance'):,.2f}", "INFO")
            self.log(f"   Transactions: {len(response.get('transactions', []))}", "INFO")
        return success

    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Unauthorized Access",
            "GET",
            "dashboard",
            401
        )
        
        # Restore token
        self.token = original_token
        return success

    def run_all_tests(self):
        """Run all API tests in sequence"""
        self.log("🚀 Starting Transmodal API Tests", "START")
        self.log(f"   Base URL: {self.base_url}", "INFO")
        
        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_login_invalid,
            self.test_login_valid,
            self.test_unauthorized_access,
            self.test_get_current_user,
            self.test_dashboard_data,
            self.test_containers_list,
            self.test_container_locations,
            self.test_orders_list,
            self.test_create_order,
            self.test_upload_document,
            self.test_additionals_list,
            self.test_approve_additional,
            self.test_reject_additional,
            self.test_account_statement,
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log(f"❌ Test {test.__name__} failed with exception: {e}", "ERROR")
        
        # Results
        self.log("", "")
        self.log("📊 TEST RESULTS", "RESULT")
        self.log(f"   Tests Run: {self.tests_run}", "RESULT")
        self.log(f"   Tests Passed: {self.tests_passed}", "RESULT")
        self.log(f"   Tests Failed: {self.tests_run - self.tests_passed}", "RESULT")
        self.log(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%", "RESULT")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
            return 0
        else:
            self.log("⚠️  SOME TESTS FAILED", "WARNING")
            return 1

def main():
    """Main test execution"""
    tester = TransmodalAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())