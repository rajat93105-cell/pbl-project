import requests
import sys
import json
from datetime import datetime

class MUJMarketplaceAPITester:
    def __init__(self, base_url="https://mujmarket.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_flow(self):
        """Test authentication flow"""
        print("\n🔍 Testing Authentication...")
        
        # Test registration with valid MUJ email
        test_email = f"test{datetime.now().strftime('%H%M%S')}@muj.manipal.edu"
        register_data = {
            "name": "Test Student",
            "email": test_email,
            "password": "password123"
        }
        
        response = self.run_test("User Registration", "POST", "auth/register", 200, register_data)
        if response:
            self.token = response.get('access_token')
            self.user_id = response.get('user', {}).get('id')
        
        # Test registration with invalid email
        invalid_data = {
            "name": "Test Student",
            "email": "test@gmail.com",
            "password": "password123"
        }
        self.run_test("Invalid Email Registration", "POST", "auth/register", 422, invalid_data)
        
        # Test login
        login_data = {
            "email": test_email,
            "password": "password123"
        }
        self.run_test("User Login", "POST", "auth/login", 200, login_data)
        
        # Test get current user
        if self.token:
            self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_product_endpoints(self):
        """Test product CRUD operations"""
        print("\n🔍 Testing Product Endpoints...")
        
        if not self.token:
            print("❌ Skipping product tests - no auth token")
            return
        
        # Test get categories and conditions
        self.run_test("Get Categories", "GET", "products/categories", 200)
        self.run_test("Get Conditions", "GET", "products/conditions", 200)
        
        # Test get products (empty)
        self.run_test("Get Products (Empty)", "GET", "products", 200)
        
        # Test create product
        product_data = {
            "name": "Test Laptop",
            "category": "Electronics",
            "price": 25000.0,
            "condition": "Used",
            "description": "A test laptop for sale",
            "images": ["https://via.placeholder.com/400x300"]
        }
        
        response = self.run_test("Create Product", "POST", "products", 200, product_data)
        product_id = None
        if response:
            product_id = response.get('id')
        
        # Test get products (with data)
        self.run_test("Get Products (With Data)", "GET", "products", 200)
        
        # Test get single product
        if product_id:
            self.run_test("Get Single Product", "GET", f"products/{product_id}", 200)
            
            # Test update product
            update_data = {
                "name": "Updated Test Laptop",
                "price": 24000.0
            }
            self.run_test("Update Product", "PUT", f"products/{product_id}", 200, update_data)
            
            # Test get user products
            self.run_test("Get User Products", "GET", f"products/user/{self.user_id}", 200)
        
        # Test search and filters
        self.run_test("Search Products", "GET", "products?search=laptop", 200)
        self.run_test("Filter by Category", "GET", "products?category=Electronics", 200)
        self.run_test("Filter by Condition", "GET", "products?condition=Used", 200)
        
        return product_id

    def test_wishlist_endpoints(self):
        """Test wishlist functionality"""
        print("\n🔍 Testing Wishlist Endpoints...")
        
        if not self.token:
            print("❌ Skipping wishlist tests - no auth token")
            return
        
        # Create a product first for wishlist testing
        product_data = {
            "name": "Wishlist Test Item",
            "category": "Books & Study Material",
            "price": 500.0,
            "condition": "New",
            "description": "A test item for wishlist",
            "images": ["https://via.placeholder.com/400x300"]
        }
        
        response = self.run_test("Create Product for Wishlist", "POST", "products", 200, product_data)
        if not response:
            return
        
        product_id = response.get('id')
        
        # Test get empty wishlist
        self.run_test("Get Empty Wishlist", "GET", "wishlist", 200)
        
        # Test add to wishlist
        self.run_test("Add to Wishlist", "POST", f"wishlist/{product_id}", 200)
        
        # Test check wishlist
        self.run_test("Check Wishlist Status", "GET", f"wishlist/check/{product_id}", 200)
        
        # Test get wishlist with items
        self.run_test("Get Wishlist with Items", "GET", "wishlist", 200)
        
        # Test add duplicate (should fail)
        self.run_test("Add Duplicate to Wishlist", "POST", f"wishlist/{product_id}", 400)
        
        # Test remove from wishlist
        self.run_test("Remove from Wishlist", "DELETE", f"wishlist/{product_id}", 200)

    def test_user_endpoints(self):
        """Test user profile endpoints"""
        print("\n🔍 Testing User Endpoints...")
        
        if not self.token:
            print("❌ Skipping user tests - no auth token")
            return
        
        # Test update profile
        self.run_test("Update Profile", "PUT", "users/profile?name=Updated Test Student", 200)

    def test_cloudinary_endpoints(self):
        """Test Cloudinary signature endpoint"""
        print("\n🔍 Testing Cloudinary Endpoints...")
        
        if not self.token:
            print("❌ Skipping Cloudinary tests - no auth token")
            return
        
        # Test get signature (will work even with mock credentials)
        self.run_test("Get Cloudinary Signature", "GET", "cloudinary/signature", 200)

    def test_error_cases(self):
        """Test error handling"""
        print("\n🔍 Testing Error Cases...")
        
        # Test unauthorized access
        old_token = self.token
        self.token = None
        self.run_test("Unauthorized Product Creation", "POST", "products", 401, {
            "name": "Test",
            "category": "Electronics",
            "price": 100,
            "condition": "New",
            "description": "Test",
            "images": ["test.jpg"]
        })
        self.token = old_token
        
        # Test invalid product data
        invalid_product = {
            "name": "",
            "category": "Invalid Category",
            "price": -100,
            "condition": "Invalid",
            "description": "",
            "images": []
        }
        self.run_test("Invalid Product Data", "POST", "products", 422, invalid_product)
        
        # Test non-existent product
        self.run_test("Get Non-existent Product", "GET", "products/non-existent-id", 404)

    def cleanup_test_data(self, product_id):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if product_id and self.token:
            self.run_test("Delete Test Product", "DELETE", f"products/{product_id}", 200)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting MUJ Campus Marketplace API Tests...")
        print(f"Testing against: {self.base_url}")
        
        self.test_health_endpoints()
        self.test_auth_flow()
        product_id = self.test_product_endpoints()
        self.test_wishlist_endpoints()
        self.test_user_endpoints()
        self.test_cloudinary_endpoints()
        self.test_error_cases()
        
        if product_id:
            self.cleanup_test_data(product_id)
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            return 1

def main():
    tester = MUJMarketplaceAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())