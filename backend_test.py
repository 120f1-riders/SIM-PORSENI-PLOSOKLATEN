#!/usr/bin/env python3
"""
Backend API Testing for Multi-device Login Feature
Tests the token array implementation for simultaneous multi-device login
"""

import requests
import json
import sys
from typing import Dict, Any

# Base URL from .env
BASE_URL = "https://porseni-filter.preview.emergentagent.com/api"

# Seed credentials
SUPER_ADMIN_EMAIL = "super@porseni.id"
SUPER_ADMIN_PASSWORD = "admin123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(msg: str):
    print(f"{Colors.BLUE}[TEST]{Colors.END} {msg}")

def print_pass(msg: str):
    print(f"{Colors.GREEN}✓ PASS:{Colors.END} {msg}")

def print_fail(msg: str):
    print(f"{Colors.RED}✗ FAIL:{Colors.END} {msg}")

def print_info(msg: str):
    print(f"{Colors.YELLOW}[INFO]{Colors.END} {msg}")

def check_no_sensitive_leak(data: Dict[str, Any], context: str) -> bool:
    """Check that response does not contain sensitive fields"""
    
    if isinstance(data, dict):
        # For login responses: top-level 'token' is OK (it's the auth token being returned)
        # but the 'user' object must NOT contain sensitive fields
        if 'user' in data:
            user = data['user']
            forbidden_in_user = ['_id', 'password', 'password_plain', 'token', 'tokens']
            for field in forbidden_in_user:
                if field in user:
                    print_fail(f"{context}: user object contains sensitive field '{field}'")
                    return False
        
        # For non-login responses (like /auth/me, /auth/profile)
        # Check top-level fields
        if 'POST /auth/login' not in context and 'POST /users' not in context:
            forbidden_top_level = ['_id', 'password', 'password_plain', 'token', 'tokens']
            for field in forbidden_top_level:
                if field in data:
                    print_fail(f"{context}: response contains sensitive field '{field}'")
                    return False
        
        # For POST /users: password_plain is OK (super_admin needs to see it)
        # but token/tokens/_id/password should not be present
        if 'POST /users' in context:
            forbidden_in_post_users = ['_id', 'password', 'token', 'tokens']
            for field in forbidden_in_post_users:
                if field in data:
                    print_fail(f"{context}: response contains forbidden field '{field}'")
                    return False
    
    elif isinstance(data, list):
        # For array responses (like GET /users)
        for item in data:
            # GET /users should show password_plain but NOT _id/password/token/tokens
            forbidden_fields = ['_id', 'password', 'token', 'tokens']
            for field in forbidden_fields:
                if field in item:
                    print_fail(f"{context}: array item contains forbidden field '{field}'")
                    return False
    
    return True

def test_multi_device_core():
    """
    SCENARIO 1: MULTI-DEVICE CORE
    Login twice with same credentials, verify both tokens work
    """
    print("\n" + "="*80)
    print("SCENARIO 1: MULTI-DEVICE CORE - Login twice, both tokens must remain valid")
    print("="*80)
    
    try:
        # Login first time (Device 1)
        print_test("Device 1: Login with super@porseni.id/admin123")
        resp1 = requests.post(f"{BASE_URL}/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if resp1.status_code != 200:
            print_fail(f"Device 1 login failed: {resp1.status_code} - {resp1.text}")
            return False
        
        data1 = resp1.json()
        token1 = data1.get('token')
        
        if not token1:
            print_fail("Device 1 login response missing token")
            return False
        
        print_pass(f"Device 1 login successful, token: {token1[:20]}...")
        
        # Check no sensitive leak in login response
        if not check_no_sensitive_leak(data1, "POST /auth/login (Device 1)"):
            return False
        print_pass("Device 1 login response: no sensitive data leak")
        
        # Login second time (Device 2) - SAME credentials
        print_test("Device 2: Login with SAME credentials (super@porseni.id/admin123)")
        resp2 = requests.post(f"{BASE_URL}/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if resp2.status_code != 200:
            print_fail(f"Device 2 login failed: {resp2.status_code} - {resp2.text}")
            return False
        
        data2 = resp2.json()
        token2 = data2.get('token')
        
        if not token2:
            print_fail("Device 2 login response missing token")
            return False
        
        print_pass(f"Device 2 login successful, token: {token2[:20]}...")
        
        # Verify tokens are different
        if token1 == token2:
            print_fail("Device 1 and Device 2 tokens are IDENTICAL (should be different)")
            return False
        print_pass("Device 1 and Device 2 tokens are DIFFERENT (as expected)")
        
        # Check no sensitive leak in second login response
        if not check_no_sensitive_leak(data2, "POST /auth/login (Device 2)"):
            return False
        print_pass("Device 2 login response: no sensitive data leak")
        
        # CRITICAL TEST: Verify Device 1 token STILL works after Device 2 login
        print_test("CRITICAL: Verify Device 1 token STILL VALID after Device 2 login")
        resp_me1 = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token1}"
        })
        
        if resp_me1.status_code != 200:
            print_fail(f"Device 1 token INVALIDATED after Device 2 login! Status: {resp_me1.status_code}")
            print_fail("This is the KEY BUG: old device tokens should remain valid")
            return False
        
        me1_data = resp_me1.json()
        if me1_data.get('email') != SUPER_ADMIN_EMAIL:
            print_fail(f"Device 1 /auth/me returned wrong user: {me1_data.get('email')}")
            return False
        
        print_pass("✓✓✓ CRITICAL PASS: Device 1 token STILL VALID after Device 2 login")
        
        # Check no sensitive leak in /auth/me response
        if not check_no_sensitive_leak(me1_data, "GET /auth/me (Device 1)"):
            return False
        print_pass("Device 1 /auth/me response: no sensitive data leak")
        
        # Verify Device 2 token also works
        print_test("Verify Device 2 token works")
        resp_me2 = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token2}"
        })
        
        if resp_me2.status_code != 200:
            print_fail(f"Device 2 token invalid: {resp_me2.status_code}")
            return False
        
        me2_data = resp_me2.json()
        if me2_data.get('email') != SUPER_ADMIN_EMAIL:
            print_fail(f"Device 2 /auth/me returned wrong user: {me2_data.get('email')}")
            return False
        
        print_pass("Device 2 token works correctly")
        
        # Check no sensitive leak in Device 2 /auth/me response
        if not check_no_sensitive_leak(me2_data, "GET /auth/me (Device 2)"):
            return False
        print_pass("Device 2 /auth/me response: no sensitive data leak")
        
        print_pass("✓✓✓ SCENARIO 1 COMPLETE: Multi-device login working - both tokens valid simultaneously")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_multi_device_core: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_no_sensitive_leak(super_token: str):
    """
    SCENARIO 2: NO SENSITIVE LEAK
    Verify no token/tokens/password/password_plain/_id in responses
    """
    print("\n" + "="*80)
    print("SCENARIO 2: NO SENSITIVE LEAK - Verify no sensitive fields in responses")
    print("="*80)
    
    try:
        # Test GET /users (super_admin) - should show password_plain but NOT token/tokens/password/_id
        print_test("GET /users (super_admin) - should show password_plain but NOT token/tokens/password/_id")
        resp = requests.get(f"{BASE_URL}/users", headers={
            "Authorization": f"Bearer {super_token}"
        })
        
        if resp.status_code != 200:
            print_fail(f"GET /users failed: {resp.status_code}")
            return False
        
        users = resp.json()
        if not isinstance(users, list) or len(users) == 0:
            print_fail("GET /users returned empty or invalid response")
            return False
        
        # Check that password_plain is present (for super_admin visibility)
        has_password_plain = any('password_plain' in u for u in users)
        if not has_password_plain:
            print_fail("GET /users does NOT contain password_plain (should be visible to super_admin)")
            return False
        print_pass("GET /users contains password_plain (correct for super_admin)")
        
        # Check no other sensitive fields
        forbidden_fields = ['_id', 'password', 'token', 'tokens']
        for user in users:
            for field in forbidden_fields:
                if field in user:
                    print_fail(f"GET /users contains forbidden field '{field}'")
                    return False
        print_pass("GET /users does NOT leak _id/password/token/tokens")
        
        # Test /auth/me - should NOT contain any sensitive fields
        print_test("GET /auth/me - should NOT contain password/password_plain/token/tokens/_id")
        resp_me = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {super_token}"
        })
        
        if resp_me.status_code != 200:
            print_fail(f"GET /auth/me failed: {resp_me.status_code}")
            return False
        
        if not check_no_sensitive_leak(resp_me.json(), "GET /auth/me"):
            return False
        print_pass("GET /auth/me does NOT leak sensitive fields")
        
        print_pass("✓✓✓ SCENARIO 2 COMPLETE: No sensitive data leaks detected")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_no_sensitive_leak: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_new_user_multi_device(super_token: str):
    """
    SCENARIO 3: NEW USER MULTI-DEVICE
    Create panitia user, login twice, verify both tokens work
    """
    print("\n" + "="*80)
    print("SCENARIO 3: NEW USER MULTI-DEVICE - Create panitia, login twice, both tokens valid")
    print("="*80)
    
    try:
        # First create a lomba (needed for panitia)
        print_test("Create a test lomba (individu)")
        resp_lomba = requests.post(f"{BASE_URL}/lomba", 
            headers={"Authorization": f"Bearer {super_token}"},
            json={
                "name": "Test Multi-Device Lomba",
                "category": "Olahraga",
                "type": "individu"
            }
        )
        
        if resp_lomba.status_code != 200:
            print_fail(f"Failed to create lomba: {resp_lomba.status_code}")
            return False
        
        lomba = resp_lomba.json()
        lomba_id = lomba.get('id')
        print_pass(f"Created lomba: {lomba.get('name')} (id: {lomba_id})")
        
        # Create panitia user with unique email (timestamp to avoid conflicts)
        print_test("Create panitia user via POST /users")
        import time
        panitia_email = f"panitia.multidev.{int(time.time())}@porseni.id"
        resp_user = requests.post(f"{BASE_URL}/users",
            headers={"Authorization": f"Bearer {super_token}"},
            json={
                "name": "Panitia Multi-Device Test",
                "email": panitia_email,
                "role": "panitia",
                "assigned_lomba_id": lomba_id
            }
        )
        
        if resp_user.status_code != 200:
            print_fail(f"Failed to create panitia user: {resp_user.status_code} - {resp_user.text}")
            return False
        
        user_data = resp_user.json()
        print_pass(f"Created panitia user: {user_data.get('name')} ({user_data.get('email')})")
        
        # Check no sensitive leak in POST /users response
        if not check_no_sensitive_leak(user_data, "POST /users"):
            return False
        print_pass("POST /users response: no token/tokens/_id leak (password_plain OK)")
        
        # Login panitia first time (Device 1)
        print_test("Panitia Device 1: Login with default password 12345678")
        resp_p1 = requests.post(f"{BASE_URL}/auth/login", json={
            "email": panitia_email,
            "password": "12345678"  # default password
        })
        
        if resp_p1.status_code != 200:
            print_fail(f"Panitia Device 1 login failed: {resp_p1.status_code} - {resp_p1.text}")
            return False
        
        data_p1 = resp_p1.json()
        token_p1 = data_p1.get('token')
        
        if not token_p1:
            print_fail("Panitia Device 1 login response missing token")
            return False
        
        print_pass(f"Panitia Device 1 login successful, token: {token_p1[:20]}...")
        
        # Login panitia second time (Device 2)
        print_test("Panitia Device 2: Login with SAME credentials")
        resp_p2 = requests.post(f"{BASE_URL}/auth/login", json={
            "email": panitia_email,
            "password": "12345678"
        })
        
        if resp_p2.status_code != 200:
            print_fail(f"Panitia Device 2 login failed: {resp_p2.status_code} - {resp_p2.text}")
            return False
        
        data_p2 = resp_p2.json()
        token_p2 = data_p2.get('token')
        
        if not token_p2:
            print_fail("Panitia Device 2 login response missing token")
            return False
        
        print_pass(f"Panitia Device 2 login successful, token: {token_p2[:20]}...")
        
        # Verify tokens are different
        if token_p1 == token_p2:
            print_fail("Panitia Device 1 and Device 2 tokens are IDENTICAL (should be different)")
            return False
        print_pass("Panitia Device 1 and Device 2 tokens are DIFFERENT")
        
        # CRITICAL: Verify Device 1 token STILL works after Device 2 login
        print_test("CRITICAL: Verify Panitia Device 1 token STILL VALID after Device 2 login")
        resp_me_p1 = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token_p1}"
        })
        
        if resp_me_p1.status_code != 200:
            print_fail(f"Panitia Device 1 token INVALIDATED after Device 2 login! Status: {resp_me_p1.status_code}")
            return False
        
        me_p1_data = resp_me_p1.json()
        if me_p1_data.get('email') != panitia_email:
            print_fail(f"Panitia Device 1 /auth/me returned wrong user: {me_p1_data.get('email')}")
            return False
        
        print_pass("✓✓✓ CRITICAL PASS: Panitia Device 1 token STILL VALID after Device 2 login")
        
        # Verify Device 2 token also works
        print_test("Verify Panitia Device 2 token works")
        resp_me_p2 = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token_p2}"
        })
        
        if resp_me_p2.status_code != 200:
            print_fail(f"Panitia Device 2 token invalid: {resp_me_p2.status_code}")
            return False
        
        me_p2_data = resp_me_p2.json()
        if me_p2_data.get('email') != panitia_email:
            print_fail(f"Panitia Device 2 /auth/me returned wrong user: {me_p2_data.get('email')}")
            return False
        
        print_pass("Panitia Device 2 token works correctly")
        
        print_pass("✓✓✓ SCENARIO 3 COMPLETE: New user multi-device login working correctly")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_new_user_multi_device: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_regression():
    """
    SCENARIO 4: REGRESSION
    No auth -> 401, invalid token -> 401, public endpoint -> 200
    """
    print("\n" + "="*80)
    print("SCENARIO 4: REGRESSION - Auth validation and public endpoints")
    print("="*80)
    
    try:
        # Test /auth/me with NO Authorization header
        print_test("GET /auth/me with NO Authorization header -> should return 401")
        resp = requests.get(f"{BASE_URL}/auth/me")
        
        if resp.status_code != 401:
            print_fail(f"GET /auth/me with no auth returned {resp.status_code} (expected 401)")
            return False
        
        print_pass("GET /auth/me with no auth correctly returns 401")
        
        # Test /auth/me with INVALID token
        print_test("GET /auth/me with INVALID token -> should return 401")
        resp = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": "Bearer invalid-random-token-12345"
        })
        
        if resp.status_code != 401:
            print_fail(f"GET /auth/me with invalid token returned {resp.status_code} (expected 401)")
            return False
        
        print_pass("GET /auth/me with invalid token correctly returns 401")
        
        # Test public endpoint (GET /lomba)
        print_test("GET /lomba (public, no auth) -> should return 200")
        resp = requests.get(f"{BASE_URL}/lomba")
        
        if resp.status_code != 200:
            print_fail(f"GET /lomba (public) returned {resp.status_code} (expected 200)")
            return False
        
        data = resp.json()
        if not isinstance(data, list):
            print_fail(f"GET /lomba returned non-array: {type(data)}")
            return False
        
        print_pass(f"GET /lomba (public) correctly returns 200 with array ({len(data)} items)")
        
        print_pass("✓✓✓ SCENARIO 4 COMPLETE: Regression tests passed")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_regression: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*80)
    print("BACKEND API TESTING: Multi-device Login (Token Array)")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Seed: {SUPER_ADMIN_EMAIL} / {SUPER_ADMIN_PASSWORD}")
    print("="*80)
    
    results = []
    
    # Get super_admin token for subsequent tests
    print_info("Getting super_admin token for setup...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    
    if resp.status_code != 200:
        print_fail(f"Failed to get super_admin token: {resp.status_code}")
        sys.exit(1)
    
    super_token = resp.json().get('token')
    print_pass(f"Got super_admin token: {super_token[:20]}...")
    
    # Run all test scenarios
    results.append(("SCENARIO 1: Multi-device core", test_multi_device_core()))
    results.append(("SCENARIO 2: No sensitive leak", test_no_sensitive_leak(super_token)))
    results.append(("SCENARIO 3: New user multi-device", test_new_user_multi_device(super_token)))
    results.append(("SCENARIO 4: Regression", test_regression()))
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = f"{Colors.GREEN}✓ PASS{Colors.END}" if result else f"{Colors.RED}✗ FAIL{Colors.END}"
        print(f"{status} - {name}")
    
    print("="*80)
    print(f"Total: {passed}/{total} scenarios passed")
    print("="*80)
    
    if passed == total:
        print(f"{Colors.GREEN}✓✓✓ ALL TESTS PASSED{Colors.END}")
        sys.exit(0)
    else:
        print(f"{Colors.RED}✗✗✗ SOME TESTS FAILED{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()
