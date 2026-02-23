#!/usr/bin/env python3

import requests
import sys
import base64
import json
from datetime import datetime
import time

class EcoSayahatAPITester:
    def __init__(self, base_url="https://eco-sayahat-demo.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tourist_token = None
        self.taxi_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test data
        self.tourist_email = f"tourist_{datetime.now().strftime('%H%M%S')}@test.com"
        self.taxi_email = f"taxi_{datetime.now().strftime('%H%M%S')}@test.com"
        self.admin_email = f"admin_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_password = "TestPass123!"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)
            
        if token:
            default_headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200] if response.text else 'No response'
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration for all roles"""
        print("\n🔐 Testing User Registration...")
        
        # Test tourist registration
        success, response = self.run_test(
            "Tourist Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.tourist_email,
                "password": self.test_password,
                "name": "Test Tourist",
                "role": "tourist"
            }
        )
        if success and 'token' in response:
            self.tourist_token = response['token']
            print(f"   Tourist token obtained")

        # Test taxi driver registration
        success, response = self.run_test(
            "Taxi Driver Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.taxi_email,
                "password": self.test_password,
                "name": "Test Taxi Driver",
                "role": "taxi_driver"
            }
        )
        if success and 'token' in response:
            self.taxi_token = response['token']
            print(f"   Taxi driver token obtained")

        # Test admin registration
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.admin_email,
                "password": self.test_password,
                "name": "Test Admin",
                "role": "admin"
            }
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token obtained")

    def test_user_login(self):
        """Test user login"""
        print("\n🔑 Testing User Login...")
        
        success, response = self.run_test(
            "Tourist Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": self.tourist_email,
                "password": self.test_password
            }
        )
        
        if success and 'token' in response:
            print(f"   Login successful for tourist")

    def test_protected_routes(self):
        """Test protected routes with authentication"""
        print("\n🛡️  Testing Protected Routes...")
        
        if not self.tourist_token:
            print("❌ No tourist token available for protected route testing")
            return

        # Test /auth/me
        success, user_data = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            token=self.tourist_token
        )
        
        if success:
            print(f"   User data retrieved: {user_data.get('name', 'N/A')}")

    def test_regions_and_attractions(self):
        """Test regions and attractions endpoints"""
        print("\n🏔️  Testing Regions and Attractions...")
        
        # Get regions
        success, regions = self.run_test(
            "Get Regions",
            "GET",
            "regions",
            200
        )
        
        if success and regions:
            region_id = regions[0].get('id') if regions else None
            print(f"   Found {len(regions)} regions")
            
            if region_id:
                # Get attractions for first region
                success, attractions = self.run_test(
                    f"Get Attractions for {region_id}",
                    "GET",
                    f"regions/{region_id}/attractions",
                    200
                )
                
                if success:
                    print(f"   Found {len(attractions)} attractions for {region_id}")
                    
                    if attractions:
                        attraction_id = attractions[0].get('id')
                        # Test get single attraction
                        self.run_test(
                            f"Get Single Attraction",
                            "GET",
                            f"attractions/{attraction_id}",
                            200
                        )
                        
                        # Test get reviews
                        self.run_test(
                            f"Get Attraction Reviews",
                            "GET",
                            f"attractions/{attraction_id}/reviews",
                            200
                        )

    def test_hotels(self):
        """Test hotels endpoint"""
        print("\n🏨 Testing Hotels...")
        
        # Test with a known region ID (from regions test)
        self.run_test(
            "Get Hotels for Burabay",
            "GET",
            "hotels/burabay",
            200
        )

    def test_tasks_system(self):
        """Test tasks and submissions"""
        print("\n📋 Testing Tasks System...")
        
        # Get tasks
        success, tasks = self.run_test(
            "Get Tasks",
            "GET",
            "tasks",
            200
        )
        
        if success and tasks and self.tourist_token:
            print(f"   Found {len(tasks)} tasks")
            
            # Test task submission with a simple base64 image (1x1 pixel PNG)
            simple_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            
            task_id = tasks[0].get('id') if tasks else None
            if task_id:
                self.run_test(
                    "Submit Task",
                    "POST",
                    "tasks/submit",
                    200,
                    data={
                        "task_id": task_id,
                        "image_base64": simple_image
                    },
                    token=self.tourist_token
                )

    def test_ecocoins(self):
        """Test ecocoins system"""
        print("\n💰 Testing EcoCoins System...")
        
        if not self.tourist_token:
            print("❌ No tourist token available")
            return
            
        # Get balance
        self.run_test(
            "Get EcoCoins Balance",
            "GET",
            "ecocoins/balance",
            200,
            token=self.tourist_token
        )
        
        # Get transactions
        self.run_test(
            "Get EcoCoins Transactions",
            "GET",
            "ecocoins/transactions",
            200,
            token=self.tourist_token
        )
        
        # Get leaderboard
        self.run_test(
            "Get EcoCoins Leaderboard",
            "GET",
            "ecocoins/leaderboard",
            200
        )

    def test_ai_assistant(self):
        """Test AI assistant functionality"""
        print("\n🤖 Testing AI Assistant...")
        
        if not self.tourist_token:
            print("❌ No tourist token available")
            return
            
        # Test text message
        success, response = self.run_test(
            "AI Assistant Text Chat",
            "POST",
            "ai-assistant/chat",
            200,
            data={
                "message": "Hello, tell me about Burabay region",
                "language": "en"
            },
            token=self.tourist_token
        )
        
        if success:
            print(f"   AI Response received: {len(response.get('response', ''))} characters")
        
        # Test with image
        simple_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        success, response = self.run_test(
            "AI Assistant Image Analysis",
            "POST",
            "ai-assistant/chat",
            200,
            data={
                "message": "What do you see in this image?",
                "image_base64": simple_image,
                "language": "en"
            },
            token=self.tourist_token
        )
        
        if success:
            print(f"   AI Image analysis received: {len(response.get('response', ''))} characters")

    def test_taxi_system(self):
        """Test taxi ordering system"""
        print("\n🚕 Testing Taxi System...")
        
        if not self.tourist_token or not self.taxi_token:
            print("❌ Missing tokens for taxi testing")
            return
            
        # Tourist creates order
        success, order = self.run_test(
            "Create Taxi Order",
            "POST",
            "taxi/order",
            200,
            data={
                "from_location": "Aktau Center",
                "to_location": "Burabay Park",
                "from_lat": 43.6532,
                "from_lng": 51.1694,
                "to_lat": 53.0833,
                "to_lng": 70.2833
            },
            token=self.tourist_token
        )
        
        order_id = order.get('id') if success else None
        
        # Get orders (taxi driver view)
        self.run_test(
            "Get Taxi Orders (Driver View)",
            "GET",
            "taxi/orders",
            200,
            token=self.taxi_token
        )
        
        # Get orders (tourist view)
        self.run_test(
            "Get Taxi Orders (Tourist View)",
            "GET",
            "taxi/orders",
            200,
            token=self.tourist_token
        )
        
        # Accept order (if created)
        if order_id:
            self.run_test(
                "Accept Taxi Order",
                "POST",
                f"taxi/accept/{order_id}",
                200,
                token=self.taxi_token
            )

    def test_charging_stations(self):
        """Test charging stations"""
        print("\n⚡ Testing Charging Stations...")
        
        self.run_test(
            "Get Charging Stations",
            "GET",
            "charging-stations",
            200
        )

    def test_admin_functionality(self):
        """Test admin endpoints"""
        print("\n👨‍💼 Testing Admin Functionality...")
        
        if not self.admin_token:
            print("❌ No admin token available")
            return
            
        # Get all reviews for moderation
        self.run_test(
            "Get All Reviews (Admin)",
            "GET",
            "admin/reviews",
            200,
            token=self.admin_token
        )
        
        # Get admin stats
        self.run_test(
            "Get Admin Statistics",
            "GET",
            "admin/stats",
            200,
            token=self.admin_token
        )

    def run_all_tests(self):
        """Run comprehensive API testing"""
        print("🚀 Starting EcoSayahat API Testing...\n")
        print(f"Testing against: {self.base_url}")
        
        try:
            # Core authentication tests
            self.test_user_registration()
            self.test_user_login()
            self.test_protected_routes()
            
            # Core functionality tests
            self.test_regions_and_attractions()
            self.test_hotels()
            self.test_tasks_system()
            self.test_ecocoins()
            
            # AI and integration tests
            self.test_ai_assistant()
            
            # Role-specific functionality
            self.test_taxi_system()
            self.test_charging_stations()
            self.test_admin_functionality()
            
        except KeyboardInterrupt:
            print("\n⚠️  Testing interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error during testing: {e}")

    def print_summary(self):
        """Print test results summary"""
        print(f"\n📊 Test Results Summary")
        print(f"{'='*50}")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test.get('test', 'Unknown')}")
                if 'expected' in test:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                if 'response' in test:
                    print(f"   Response: {test['response']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = EcoSayahatAPITester()
    tester.run_all_tests()
    success = tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())