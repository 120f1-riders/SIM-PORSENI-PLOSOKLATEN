#!/usr/bin/env python3
"""
Backend API Testing for User Gender Field Feature
Tests gender field support in register, POST /users, PUT /users, PUT /auth/profile
"""

import requests
import json
import sys
import time
from typing import Dict, Any

# Base URL from .env
BASE_URL = "http://localhost:3000/api"

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
            forbidden_top_level = ['_id', 'password', 'token', 'tokens']
            # password_plain is OK for /auth/profile (user can see own password)
            if '/auth/profile' not in context:
                forbidden_top_level.append('password_plain')
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

def test_step_1_super_admin_login():
    """
    STEP 1: Super admin login
    Verify no password/password_plain/token/tokens/_id leak in user object
    """
    print("\n" + "="*80)
    print("STEP 1: Super admin login (super@porseni.id / admin123)")
    print("="*80)
    
    try:
        print_test("POST /auth/login with super@porseni.id / admin123")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if resp.status_code != 200:
            print_fail(f"Login failed: {resp.status_code} - {resp.text}")
            return None
        
        data = resp.json()
        token = data.get('token')
        
        if not token:
            print_fail("Login response missing token")
            return None
        
        print_pass(f"Login successful, token: {token[:20]}...")
        
        # Check no sensitive leak in user object
        if not check_no_sensitive_leak(data, "POST /auth/login"):
            return None
        print_pass("Login response: user object does NOT leak password/password_plain/token/tokens/_id")
        
        print_pass("✓✓✓ STEP 1 COMPLETE: Super admin login successful with no sensitive leak")
        return token
        
    except Exception as e:
        print_fail(f"Exception in test_step_1_super_admin_login: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def test_step_2_create_lomba(super_token: str):
    """
    STEP 2: POST /lomba (super_admin) create individu lomba
    """
    print("\n" + "="*80)
    print("STEP 2: POST /lomba (super_admin) create individu lomba")
    print("="*80)
    
    try:
        print_test("POST /lomba with type='individu'")
        resp = requests.post(f"{BASE_URL}/lomba", 
            headers={"Authorization": f"Bearer {super_token}"},
            json={
                "name": "Test Gender Lomba",
                "category": "Olahraga",
                "type": "individu"
            }
        )
        
        if resp.status_code != 200:
            print_fail(f"Failed to create lomba: {resp.status_code} - {resp.text}")
            return None
        
        lomba = resp.json()
        lomba_id = lomba.get('id')
        print_pass(f"Created lomba: {lomba.get('name')} (id: {lomba_id})")
        
        print_pass("✓✓✓ STEP 2 COMPLETE: Lomba created successfully")
        return lomba_id
        
    except Exception as e:
        print_fail(f"Exception in test_step_2_create_lomba: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def test_step_3_create_panitia_with_gender(super_token: str, lomba_id: str):
    """
    STEP 3: POST /users (super_admin) create panitia with gender:'L' and assigned_lomba_id
    Verify response includes gender='L', status 'verified', password_plain present,
    and does NOT leak password (hash)/token/tokens/_id
    """
    print("\n" + "="*80)
    print("STEP 3: POST /users create panitia with gender:'L' and assigned_lomba_id")
    print("="*80)
    
    try:
        panitia_email = f"panitia.gender.{int(time.time())}@porseni.id"
        print_test(f"POST /users with gender:'L', assigned_lomba_id={lomba_id}")
        resp = requests.post(f"{BASE_URL}/users",
            headers={"Authorization": f"Bearer {super_token}"},
            json={
                "name": "Panitia Gender Test",
                "email": panitia_email,
                "role": "panitia",
                "gender": "L",
                "assigned_lomba_id": lomba_id
            }
        )
        
        if resp.status_code != 200:
            print_fail(f"Failed to create panitia: {resp.status_code} - {resp.text}")
            return None
        
        user_data = resp.json()
        user_id = user_data.get('id')
        print_pass(f"Created panitia user: {user_data.get('name')} ({user_data.get('email')})")
        
        # Verify gender='L'
        if user_data.get('gender') != 'L':
            print_fail(f"Expected gender='L', got: {user_data.get('gender')}")
            return None
        print_pass("Response includes gender='L'")
        
        # Verify status='verified'
        if user_data.get('status') != 'verified':
            print_fail(f"Expected status='verified', got: {user_data.get('status')}")
            return None
        print_pass("Response includes status='verified'")
        
        # Verify password_plain is present
        if 'password_plain' not in user_data:
            print_fail("Response does NOT include password_plain (should be visible to super_admin)")
            return None
        print_pass(f"Response includes password_plain='{user_data.get('password_plain')}'")
        
        # Check no sensitive leak (password hash/token/tokens/_id should NOT be present)
        if not check_no_sensitive_leak(user_data, "POST /users"):
            return None
        print_pass("Response does NOT leak password (hash)/token/tokens/_id")
        
        print_pass("✓✓✓ STEP 3 COMPLETE: Panitia created with gender='L', all checks passed")
        return {"id": user_id, "email": panitia_email, "password": user_data.get('password_plain')}
        
    except Exception as e:
        print_fail(f"Exception in test_step_3_create_panitia_with_gender: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def test_step_4_get_users_shows_gender(super_token: str, panitia_id: str):
    """
    STEP 4: GET /users (super_admin) — the created panitia appears with gender='L'
    Ensure no token/tokens/hash/_id leak (password_plain is allowed for super_admin listing)
    """
    print("\n" + "="*80)
    print("STEP 4: GET /users (super_admin) — verify panitia appears with gender='L'")
    print("="*80)
    
    try:
        print_test("GET /users")
        resp = requests.get(f"{BASE_URL}/users", headers={
            "Authorization": f"Bearer {super_token}"
        })
        
        if resp.status_code != 200:
            print_fail(f"GET /users failed: {resp.status_code} - {resp.text}")
            return False
        
        users = resp.json()
        if not isinstance(users, list):
            print_fail(f"GET /users returned non-array: {type(users)}")
            return False
        
        print_pass(f"GET /users returned {len(users)} users")
        
        # Find the panitia user
        panitia = next((u for u in users if u.get('id') == panitia_id), None)
        if not panitia:
            print_fail(f"Panitia user (id={panitia_id}) not found in GET /users response")
            return False
        
        print_pass(f"Found panitia user: {panitia.get('name')}")
        
        # Verify gender='L'
        if panitia.get('gender') != 'L':
            print_fail(f"Expected gender='L', got: {panitia.get('gender')}")
            return False
        print_pass("Panitia has gender='L'")
        
        # Check no sensitive leak
        if not check_no_sensitive_leak(users, "GET /users"):
            return False
        print_pass("GET /users does NOT leak token/tokens/hash/_id (password_plain is allowed)")
        
        print_pass("✓✓✓ STEP 4 COMPLETE: GET /users shows panitia with gender='L', no sensitive leak")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_step_4_get_users_shows_gender: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_step_5_put_users_gender_p(super_token: str, panitia_id: str):
    """
    STEP 5: PUT /users/:id {gender:'P'} on that panitia -> then GET /users shows gender='P'
    """
    print("\n" + "="*80)
    print("STEP 5: PUT /users/:id {gender:'P'} -> verify GET /users shows gender='P'")
    print("="*80)
    
    try:
        print_test(f"PUT /users/{panitia_id} with gender:'P'")
        resp = requests.put(f"{BASE_URL}/users/{panitia_id}",
            headers={"Authorization": f"Bearer {super_token}"},
            json={"gender": "P"}
        )
        
        if resp.status_code != 200:
            print_fail(f"PUT /users failed: {resp.status_code} - {resp.text}")
            return False
        
        user_data = resp.json()
        print_pass(f"PUT /users successful")
        
        # Verify gender='P' in response
        if user_data.get('gender') != 'P':
            print_fail(f"Expected gender='P' in PUT response, got: {user_data.get('gender')}")
            return False
        print_pass("PUT response shows gender='P'")
        
        # Verify with GET /users
        print_test("GET /users to verify gender='P' persisted")
        resp_get = requests.get(f"{BASE_URL}/users", headers={
            "Authorization": f"Bearer {super_token}"
        })
        
        if resp_get.status_code != 200:
            print_fail(f"GET /users failed: {resp_get.status_code}")
            return False
        
        users = resp_get.json()
        panitia = next((u for u in users if u.get('id') == panitia_id), None)
        
        if not panitia:
            print_fail(f"Panitia user not found in GET /users")
            return False
        
        if panitia.get('gender') != 'P':
            print_fail(f"Expected gender='P' in GET /users, got: {panitia.get('gender')}")
            return False
        
        print_pass("GET /users shows gender='P' (persisted correctly)")
        
        print_pass("✓✓✓ STEP 5 COMPLETE: PUT /users gender='P' persisted successfully")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_step_5_put_users_gender_p: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_step_6_put_users_gender_null(super_token: str, panitia_id: str):
    """
    STEP 6: PUT /users/:id {gender:null} -> GET /users shows gender null (cleared)
    """
    print("\n" + "="*80)
    print("STEP 6: PUT /users/:id {gender:null} -> verify GET /users shows gender null")
    print("="*80)
    
    try:
        print_test(f"PUT /users/{panitia_id} with gender:null")
        resp = requests.put(f"{BASE_URL}/users/{panitia_id}",
            headers={"Authorization": f"Bearer {super_token}"},
            json={"gender": None}
        )
        
        if resp.status_code != 200:
            print_fail(f"PUT /users failed: {resp.status_code} - {resp.text}")
            return False
        
        user_data = resp.json()
        print_pass(f"PUT /users successful")
        
        # Verify gender is null in response
        if user_data.get('gender') is not None:
            print_fail(f"Expected gender=null in PUT response, got: {user_data.get('gender')}")
            return False
        print_pass("PUT response shows gender=null")
        
        # Verify with GET /users
        print_test("GET /users to verify gender=null persisted")
        resp_get = requests.get(f"{BASE_URL}/users", headers={
            "Authorization": f"Bearer {super_token}"
        })
        
        if resp_get.status_code != 200:
            print_fail(f"GET /users failed: {resp_get.status_code}")
            return False
        
        users = resp_get.json()
        panitia = next((u for u in users if u.get('id') == panitia_id), None)
        
        if not panitia:
            print_fail(f"Panitia user not found in GET /users")
            return False
        
        if panitia.get('gender') is not None:
            print_fail(f"Expected gender=null in GET /users, got: {panitia.get('gender')}")
            return False
        
        print_pass("GET /users shows gender=null (cleared successfully)")
        
        print_pass("✓✓✓ STEP 6 COMPLETE: PUT /users gender=null cleared successfully")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_step_6_put_users_gender_null: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_step_7_regression(super_token: str):
    """
    STEP 7: Regression tests
    (a) POST /auth/register with gender (optional) for admin_madrasah accepts gender without error
    (b) GET /lomba (public, no auth) returns 200 array
    (c) GET /auth/me with super_admin token returns 200 and no sensitive leak
    """
    print("\n" + "="*80)
    print("STEP 7: Regression tests")
    print("="*80)
    
    try:
        # (a) POST /auth/register with gender (optional) for admin_madrasah
        print_test("(a) POST /auth/register with gender:'L' for admin_madrasah")
        admin_email = f"admin.gender.{int(time.time())}@porseni.id"
        resp_reg = requests.post(f"{BASE_URL}/auth/register", json={
            "name": "Admin Madrasah Gender Test",
            "email": admin_email,
            "password": "testpass123",
            "role": "admin_madrasah",
            "gender": "L",
            "madrasah_name": "MI Test Gender"
        })
        
        if resp_reg.status_code != 200:
            print_fail(f"POST /auth/register failed: {resp_reg.status_code} - {resp_reg.text}")
            return False
        
        reg_data = resp_reg.json()
        if reg_data.get('pending') != True:
            print_fail(f"Expected {{pending:true}}, got: {reg_data}")
            return False
        
        print_pass("POST /auth/register with gender:'L' accepted without error, returns {pending:true}")
        
        # (b) GET /lomba (public, no auth) returns 200 array
        print_test("(b) GET /lomba (public, no auth)")
        resp_lomba = requests.get(f"{BASE_URL}/lomba")
        
        if resp_lomba.status_code != 200:
            print_fail(f"GET /lomba failed: {resp_lomba.status_code}")
            return False
        
        lomba_data = resp_lomba.json()
        if not isinstance(lomba_data, list):
            print_fail(f"GET /lomba returned non-array: {type(lomba_data)}")
            return False
        
        print_pass(f"GET /lomba (public) returns 200 with array ({len(lomba_data)} items)")
        
        # (c) GET /auth/me with super_admin token returns 200 and no sensitive leak
        print_test("(c) GET /auth/me with super_admin token")
        resp_me = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {super_token}"
        })
        
        if resp_me.status_code != 200:
            print_fail(f"GET /auth/me failed: {resp_me.status_code}")
            return False
        
        me_data = resp_me.json()
        if not check_no_sensitive_leak(me_data, "GET /auth/me"):
            return False
        
        print_pass("GET /auth/me returns 200 with no sensitive leak")
        
        print_pass("✓✓✓ STEP 7 COMPLETE: All regression tests passed")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_step_7_regression: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_step_8_put_auth_profile_gender(panitia_info: dict):
    """
    STEP 8: PUT /auth/profile
    Login as the panitia (default password 12345678), call PUT /auth/profile {gender:'L'}
    Then GET /auth/profile returns gender='L' and no password/token leak
    """
    print("\n" + "="*80)
    print("STEP 8: PUT /auth/profile - panitia updates own gender")
    print("="*80)
    
    try:
        # Login as panitia
        print_test(f"Login as panitia ({panitia_info['email']}) with password {panitia_info['password']}")
        resp_login = requests.post(f"{BASE_URL}/auth/login", json={
            "email": panitia_info['email'],
            "password": panitia_info['password']
        })
        
        if resp_login.status_code != 200:
            print_fail(f"Panitia login failed: {resp_login.status_code} - {resp_login.text}")
            return False
        
        login_data = resp_login.json()
        panitia_token = login_data.get('token')
        
        if not panitia_token:
            print_fail("Panitia login response missing token")
            return False
        
        print_pass(f"Panitia login successful, token: {panitia_token[:20]}...")
        
        # PUT /auth/profile {gender:'L'}
        print_test("PUT /auth/profile {gender:'L'}")
        resp_put = requests.put(f"{BASE_URL}/auth/profile",
            headers={"Authorization": f"Bearer {panitia_token}"},
            json={"gender": "L"}
        )
        
        if resp_put.status_code != 200:
            print_fail(f"PUT /auth/profile failed: {resp_put.status_code} - {resp_put.text}")
            return False
        
        put_data = resp_put.json()
        print_pass("PUT /auth/profile successful")
        
        # Verify gender='L' in response
        if put_data.get('gender') != 'L':
            print_fail(f"Expected gender='L' in PUT response, got: {put_data.get('gender')}")
            return False
        print_pass("PUT response shows gender='L'")
        
        # Check no password/token leak in PUT response
        forbidden_fields = ['_id', 'password', 'token', 'tokens']
        for field in forbidden_fields:
            if field in put_data:
                print_fail(f"PUT /auth/profile response contains forbidden field '{field}'")
                return False
        print_pass("PUT /auth/profile response does NOT leak password/token")
        
        # GET /auth/profile to verify
        print_test("GET /auth/profile to verify gender='L' persisted")
        resp_get = requests.get(f"{BASE_URL}/auth/profile", headers={
            "Authorization": f"Bearer {panitia_token}"
        })
        
        if resp_get.status_code != 200:
            print_fail(f"GET /auth/profile failed: {resp_get.status_code}")
            return False
        
        get_data = resp_get.json()
        
        # Verify gender='L'
        if get_data.get('gender') != 'L':
            print_fail(f"Expected gender='L' in GET /auth/profile, got: {get_data.get('gender')}")
            return False
        print_pass("GET /auth/profile shows gender='L' (persisted correctly)")
        
        # Check no password/token leak in GET response
        for field in forbidden_fields:
            if field in get_data:
                print_fail(f"GET /auth/profile response contains forbidden field '{field}'")
                return False
        print_pass("GET /auth/profile response does NOT leak password/token")
        
        print_pass("✓✓✓ STEP 8 COMPLETE: PUT /auth/profile gender update working correctly")
        return True
        
    except Exception as e:
        print_fail(f"Exception in test_step_8_put_auth_profile_gender: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*80)
    print("BACKEND API TESTING: User Gender Field Feature")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Seed: {SUPER_ADMIN_EMAIL} / {SUPER_ADMIN_PASSWORD}")
    print("="*80)
    
    results = []
    
    # STEP 1: Super admin login
    super_token = test_step_1_super_admin_login()
    if not super_token:
        print_fail("STEP 1 FAILED - Cannot continue")
        sys.exit(1)
    results.append(("STEP 1: Super admin login", True))
    
    # STEP 2: Create lomba
    lomba_id = test_step_2_create_lomba(super_token)
    if not lomba_id:
        print_fail("STEP 2 FAILED - Cannot continue")
        sys.exit(1)
    results.append(("STEP 2: Create lomba", True))
    
    # STEP 3: Create panitia with gender:'L'
    panitia_info = test_step_3_create_panitia_with_gender(super_token, lomba_id)
    if not panitia_info:
        print_fail("STEP 3 FAILED - Cannot continue")
        sys.exit(1)
    results.append(("STEP 3: Create panitia with gender:'L'", True))
    
    # STEP 4: GET /users shows gender='L'
    result_4 = test_step_4_get_users_shows_gender(super_token, panitia_info['id'])
    results.append(("STEP 4: GET /users shows gender='L'", result_4))
    
    # STEP 5: PUT /users gender='P'
    result_5 = test_step_5_put_users_gender_p(super_token, panitia_info['id'])
    results.append(("STEP 5: PUT /users gender='P'", result_5))
    
    # STEP 6: PUT /users gender=null
    result_6 = test_step_6_put_users_gender_null(super_token, panitia_info['id'])
    results.append(("STEP 6: PUT /users gender=null", result_6))
    
    # STEP 7: Regression tests
    result_7 = test_step_7_regression(super_token)
    results.append(("STEP 7: Regression tests", result_7))
    
    # STEP 8: PUT /auth/profile gender
    result_8 = test_step_8_put_auth_profile_gender(panitia_info)
    results.append(("STEP 8: PUT /auth/profile gender", result_8))
    
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
    print(f"Total: {passed}/{total} steps passed")
    print("="*80)
    
    if passed == total:
        print(f"{Colors.GREEN}✓✓✓ ALL TESTS PASSED{Colors.END}")
        sys.exit(0)
    else:
        print(f"{Colors.RED}✗✗✗ SOME TESTS FAILED{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()
