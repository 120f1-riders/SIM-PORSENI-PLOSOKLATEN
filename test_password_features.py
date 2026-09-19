#!/usr/bin/env python3
"""
Backend API Test for SIM Porseni MI - Password Features
Focus: password_plain visibility, password reset, forgot password request
"""

import requests
import json
from datetime import datetime

# Base URL from .env
BASE_URL = "https://align-image-names.preview.emergentagent.com/api"

# Test data storage
test_data = {
    'super_admin': {'email': 'super@porseni.id', 'password': 'admin123'},
    'test_user': {}
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def check_no_leak(obj, fields, context):
    """Check that sensitive fields are NOT present in object"""
    for field in fields:
        if field in obj:
            log(f"  ❌ LEAK DETECTED: '{field}' found in {context}")
            log(f"     Object keys: {list(obj.keys())}")
            return False
    return True

# ============================================================================
# SCENARIO 1: password_plain visibility & no-leak
# ============================================================================

def test_register_admin_madrasah_no_leak():
    """Test: Register admin_madrasah => response must be {pending:true} with NO password/password_plain leak"""
    log("TEST 1.1: Register admin_madrasah - check for password leaks in response")
    try:
        payload = {
            "name": "Test Admin Leak",
            "email": "leaktest@porseni.id",
            "password": "secret123",
            "role": "admin_madrasah",
            "madrasah_name": "MI Test"
        }
        resp = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=10)
        log(f"  Status: {resp.status_code}")
        data = resp.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: Registration failed - {data}")
            return False
        
        # Must have pending:true
        if not data.get('pending'):
            log(f"  ❌ FAILED: Expected pending:true, got {data}")
            return False
        
        # Must NOT contain password or password_plain
        if not check_no_leak(data, ['password', 'password_plain', 'token'], 'register response'):
            return False
        
        test_data['test_user']['email'] = payload['email']
        test_data['test_user']['password'] = payload['password']
        
        log(f"  ✅ PASSED: Register returns {{pending:true}}, no password leak")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_get_users_shows_password_plain():
    """Test: GET /users as super_admin => user object MUST contain password_plain, MUST NOT contain password hash or token"""
    log("TEST 1.2: GET /users as super_admin - verify password_plain visible, hash/token hidden")
    try:
        # First login as super_admin
        login_payload = {
            "email": test_data['super_admin']['email'],
            "password": test_data['super_admin']['password']
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload, timeout=10)
        
        if resp.status_code == 401:
            # Try to register super_admin
            log("  Super admin not found, registering...")
            reg_payload = {
                "name": "Super Admin",
                "email": test_data['super_admin']['email'],
                "password": test_data['super_admin']['password'],
                "role": "super_admin"
            }
            resp = requests.post(f"{BASE_URL}/auth/register", json=reg_payload, timeout=10)
            if resp.status_code != 200:
                log(f"  ❌ FAILED: Cannot register super_admin")
                return False
            data = resp.json()
            test_data['super_admin']['token'] = data['token']
        else:
            data = resp.json()
            if resp.status_code != 200 or 'token' not in data:
                log(f"  ❌ FAILED: Super admin login failed - {data}")
                return False
            test_data['super_admin']['token'] = data['token']
        
        # Now GET /users
        headers = {"Authorization": f"Bearer {test_data['super_admin']['token']}"}
        resp = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: GET /users failed - {resp.json()}")
            return False
        
        users = resp.json()
        
        # Find leaktest@porseni.id user
        test_user = next((u for u in users if u.get('email') == 'leaktest@porseni.id'), None)
        
        if not test_user:
            log(f"  ❌ FAILED: leaktest@porseni.id user not found in users list")
            return False
        
        log(f"  Found user: {json.dumps(test_user, indent=2)}")
        
        # MUST contain password_plain
        if 'password_plain' not in test_user:
            log(f"  ❌ FAILED: password_plain NOT found in user object")
            log(f"     User keys: {list(test_user.keys())}")
            return False
        
        # Verify password_plain value
        if test_user['password_plain'] != 'secret123':
            log(f"  ❌ FAILED: password_plain mismatch - expected 'secret123', got '{test_user['password_plain']}'")
            return False
        
        # MUST NOT contain password (hash) or token
        if not check_no_leak(test_user, ['password', 'token'], 'GET /users response'):
            return False
        
        test_data['test_user']['id'] = test_user['id']
        
        log(f"  ✅ PASSED: password_plain='secret123' visible, password hash and token hidden")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_verify_user():
    """Test: Verify the test user"""
    log("TEST 1.3: Verify user (PUT /users/:id)")
    try:
        headers = {"Authorization": f"Bearer {test_data['super_admin']['token']}"}
        user_id = test_data['test_user']['id']
        payload = {"status": "verified"}
        resp = requests.put(f"{BASE_URL}/users/{user_id}", json=payload, headers=headers, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: Verification failed - {resp.json()}")
            return False
        
        data = resp.json()
        
        # Response should not leak password hash or token
        if not check_no_leak(data, ['password', 'token'], 'PUT /users/:id response'):
            return False
        
        log(f"  ✅ PASSED: User verified, no sensitive data leak")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_login_no_leak():
    """Test: Login as leaktest user => response MUST NOT contain password_plain or password"""
    log("TEST 1.4: Login as leaktest@porseni.id - verify no password_plain/password leak")
    try:
        payload = {
            "email": test_data['test_user']['email'],
            "password": test_data['test_user']['password']
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        log(f"  Status: {resp.status_code}")
        data = resp.json()
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: Login failed - {data}")
            return False
        
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        # Check token present
        if 'token' not in data:
            log(f"  ❌ FAILED: No token in login response")
            return False
        
        # Check user object present
        if 'user' not in data:
            log(f"  ❌ FAILED: No user object in login response")
            return False
        
        user_obj = data['user']
        
        # MUST NOT contain password_plain or password
        if not check_no_leak(user_obj, ['password_plain', 'password', 'token'], 'login response user object'):
            return False
        
        test_data['test_user']['token'] = data['token']
        
        log(f"  ✅ PASSED: Login successful, no password_plain/password/token in user object")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_auth_me_no_leak():
    """Test: GET /auth/me => MUST NOT contain password_plain or password"""
    log("TEST 1.5: GET /auth/me - verify no password_plain/password leak")
    try:
        headers = {"Authorization": f"Bearer {test_data['test_user']['token']}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: /auth/me failed - {resp.json()}")
            return False
        
        data = resp.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        # MUST NOT contain password_plain or password
        if not check_no_leak(data, ['password_plain', 'password', 'token'], '/auth/me response'):
            return False
        
        log(f"  ✅ PASSED: /auth/me returns user without password_plain/password/token")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

# ============================================================================
# SCENARIO 2: Password reset by super_admin
# ============================================================================

def test_password_reset_by_super_admin():
    """Test: Super admin resets password via PUT /users/:id"""
    log("TEST 2.1: Super admin resets password (PUT /users/:id with password)")
    try:
        headers = {"Authorization": f"Bearer {test_data['super_admin']['token']}"}
        user_id = test_data['test_user']['id']
        payload = {"password": "newpass99"}
        resp = requests.put(f"{BASE_URL}/users/{user_id}", json=payload, headers=headers, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: Password reset failed - {resp.json()}")
            return False
        
        data = resp.json()
        
        # Response must not leak hash/token
        if not check_no_leak(data, ['password', 'token'], 'PUT /users/:id password reset response'):
            return False
        
        log(f"  ✅ PASSED: Password reset successful, no hash/token leak")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_login_old_password_fails():
    """Test: Login with OLD password must FAIL (401)"""
    log("TEST 2.2: Login with OLD password secret123 - must FAIL")
    try:
        payload = {
            "email": test_data['test_user']['email'],
            "password": "secret123"  # OLD password
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            log(f"  ❌ FAILED: Login with old password should fail but succeeded")
            return False
        
        if resp.status_code != 401:
            log(f"  ❌ FAILED: Expected 401, got {resp.status_code}")
            return False
        
        log(f"  ✅ PASSED: Login with old password correctly rejected (401)")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_login_new_password_succeeds():
    """Test: Login with NEW password must SUCCEED"""
    log("TEST 2.3: Login with NEW password newpass99 - must SUCCEED")
    try:
        payload = {
            "email": test_data['test_user']['email'],
            "password": "newpass99"  # NEW password
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: Login with new password failed - {resp.json()}")
            return False
        
        data = resp.json()
        
        if 'token' not in data:
            log(f"  ❌ FAILED: No token in response")
            return False
        
        test_data['test_user']['token'] = data['token']
        test_data['test_user']['password'] = "newpass99"
        
        log(f"  ✅ PASSED: Login with new password successful")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_get_users_shows_new_password_plain():
    """Test: GET /users shows updated password_plain"""
    log("TEST 2.4: GET /users - verify password_plain updated to newpass99")
    try:
        headers = {"Authorization": f"Bearer {test_data['super_admin']['token']}"}
        resp = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: GET /users failed - {resp.json()}")
            return False
        
        users = resp.json()
        test_user = next((u for u in users if u.get('email') == test_data['test_user']['email']), None)
        
        if not test_user:
            log(f"  ❌ FAILED: Test user not found")
            return False
        
        if test_user.get('password_plain') != 'newpass99':
            log(f"  ❌ FAILED: password_plain not updated - expected 'newpass99', got '{test_user.get('password_plain')}'")
            return False
        
        log(f"  ✅ PASSED: password_plain correctly updated to 'newpass99'")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

# ============================================================================
# SCENARIO 3: Forgot password request (public)
# ============================================================================

def test_forgot_password_existing_user():
    """Test: POST /auth/forgot with existing email => sets reset_requested:true"""
    log("TEST 3.1: POST /auth/forgot with existing email (leaktest@porseni.id)")
    try:
        payload = {"email": "leaktest@porseni.id"}
        resp = requests.post(f"{BASE_URL}/auth/forgot", json=payload, timeout=10)
        log(f"  Status: {resp.status_code}")
        data = resp.json()
        log(f"  Response: {json.dumps(data, indent=2)}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: /auth/forgot failed - {data}")
            return False
        
        # Must return ok:true and generic message
        if not data.get('ok'):
            log(f"  ❌ FAILED: Expected ok:true, got {data}")
            return False
        
        if 'message' not in data:
            log(f"  ❌ FAILED: No message in response")
            return False
        
        log(f"  ✅ PASSED: /auth/forgot returns {{ok:true, message:...}}")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_get_users_shows_reset_requested():
    """Test: GET /users shows reset_requested:true for the user"""
    log("TEST 3.2: GET /users - verify reset_requested=true")
    try:
        headers = {"Authorization": f"Bearer {test_data['super_admin']['token']}"}
        resp = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: GET /users failed - {resp.json()}")
            return False
        
        users = resp.json()
        test_user = next((u for u in users if u.get('email') == test_data['test_user']['email']), None)
        
        if not test_user:
            log(f"  ❌ FAILED: Test user not found")
            return False
        
        if test_user.get('reset_requested') != True:
            log(f"  ❌ FAILED: reset_requested not set - expected true, got {test_user.get('reset_requested')}")
            return False
        
        log(f"  ✅ PASSED: reset_requested=true for user")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_forgot_password_nonexistent_user():
    """Test: POST /auth/forgot with non-existent email => still returns ok:true (no leak)"""
    log("TEST 3.3: POST /auth/forgot with non-existent email (doesnotexist@nowhere.id)")
    try:
        payload = {"email": "doesnotexist@nowhere.id"}
        resp = requests.post(f"{BASE_URL}/auth/forgot", json=payload, timeout=10)
        log(f"  Status: {resp.status_code}")
        data = resp.json()
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: /auth/forgot failed - {data}")
            return False
        
        # Must still return ok:true (generic response, no leak)
        if not data.get('ok'):
            log(f"  ❌ FAILED: Expected ok:true even for non-existent email, got {data}")
            return False
        
        log(f"  ✅ PASSED: /auth/forgot returns generic ok:true for non-existent email (no leak)")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_password_reset_clears_reset_requested():
    """Test: After super_admin resets password, reset_requested becomes false"""
    log("TEST 3.4: Super admin resets password - verify reset_requested cleared")
    try:
        headers = {"Authorization": f"Bearer {test_data['super_admin']['token']}"}
        user_id = test_data['test_user']['id']
        payload = {"password": "resetdone1"}
        resp = requests.put(f"{BASE_URL}/users/{user_id}", json=payload, headers=headers, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: Password reset failed - {resp.json()}")
            return False
        
        # Now GET /users to verify reset_requested is false
        resp = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
        users = resp.json()
        test_user = next((u for u in users if u.get('email') == test_data['test_user']['email']), None)
        
        if not test_user:
            log(f"  ❌ FAILED: Test user not found")
            return False
        
        if test_user.get('reset_requested') != False:
            log(f"  ❌ FAILED: reset_requested not cleared - expected false, got {test_user.get('reset_requested')}")
            return False
        
        log(f"  ✅ PASSED: reset_requested cleared to false after password reset")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

# ============================================================================
# SCENARIO 4: Regression sanity
# ============================================================================

def test_regression_lomba_public():
    """Test: GET /lomba still public and works"""
    log("TEST 4.1: Regression - GET /lomba (public)")
    try:
        resp = requests.get(f"{BASE_URL}/lomba", timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: GET /lomba failed - {resp.json()}")
            return False
        
        data = resp.json()
        
        if not isinstance(data, list):
            log(f"  ❌ FAILED: Expected array, got {type(data)}")
            return False
        
        log(f"  ✅ PASSED: GET /lomba public endpoint working ({len(data)} lomba)")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

def test_regression_super_admin_login():
    """Test: Super admin login still works"""
    log("TEST 4.2: Regression - Super admin login (super@porseni.id/admin123)")
    try:
        payload = {
            "email": "super@porseni.id",
            "password": "admin123"
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        log(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            log(f"  ❌ FAILED: Super admin login failed - {resp.json()}")
            return False
        
        data = resp.json()
        
        if 'token' not in data:
            log(f"  ❌ FAILED: No token in response")
            return False
        
        log(f"  ✅ PASSED: Super admin login working")
        return True
    except Exception as e:
        log(f"  ❌ EXCEPTION: {str(e)}")
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all password feature tests"""
    log("=" * 80)
    log("SIM PORSENI BACKEND API TESTS - PASSWORD FEATURES")
    log("=" * 80)
    
    tests = [
        # Scenario 1: password_plain visibility & no-leak
        ("1.1 Register admin_madrasah - no password leak", test_register_admin_madrasah_no_leak),
        ("1.2 GET /users shows password_plain", test_get_users_shows_password_plain),
        ("1.3 Verify user", test_verify_user),
        ("1.4 Login - no password_plain/password leak", test_login_no_leak),
        ("1.5 GET /auth/me - no password_plain/password leak", test_auth_me_no_leak),
        
        # Scenario 2: Password reset by super_admin
        ("2.1 Super admin resets password", test_password_reset_by_super_admin),
        ("2.2 Login with OLD password fails", test_login_old_password_fails),
        ("2.3 Login with NEW password succeeds", test_login_new_password_succeeds),
        ("2.4 GET /users shows new password_plain", test_get_users_shows_new_password_plain),
        
        # Scenario 3: Forgot password request
        ("3.1 POST /auth/forgot (existing user)", test_forgot_password_existing_user),
        ("3.2 GET /users shows reset_requested=true", test_get_users_shows_reset_requested),
        ("3.3 POST /auth/forgot (non-existent user)", test_forgot_password_nonexistent_user),
        ("3.4 Password reset clears reset_requested", test_password_reset_clears_reset_requested),
        
        # Scenario 4: Regression sanity
        ("4.1 Regression - GET /lomba public", test_regression_lomba_public),
        ("4.2 Regression - Super admin login", test_regression_super_admin_login),
    ]
    
    results = []
    for name, test_func in tests:
        log("")
        result = test_func()
        results.append((name, result))
    
    log("")
    log("=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    passed = sum(1 for _, r in results if r)
    failed = sum(1 for _, r in results if not r)
    
    log(f"Total: {len(results)} | Passed: {passed} | Failed: {failed}")
    log("")
    
    if failed > 0:
        log("FAILED TESTS:")
        for name, result in results:
            if not result:
                log(f"  ❌ {name}")
    else:
        log("✅ ALL TESTS PASSED!")
    
    log("=" * 80)
    
    # Detailed scenario summary
    log("")
    log("SCENARIO SUMMARY:")
    log("")
    
    scenario_1 = [r for n, r in results if n.startswith("1.")]
    scenario_2 = [r for n, r in results if n.startswith("2.")]
    scenario_3 = [r for n, r in results if n.startswith("3.")]
    scenario_4 = [r for n, r in results if n.startswith("4.")]
    
    log(f"Scenario 1 (password_plain visibility & no-leak): {sum(scenario_1)}/{len(scenario_1)} passed")
    log(f"Scenario 2 (Password reset by super_admin): {sum(scenario_2)}/{len(scenario_2)} passed")
    log(f"Scenario 3 (Forgot password request): {sum(scenario_3)}/{len(scenario_3)} passed")
    log(f"Scenario 4 (Regression sanity): {sum(scenario_4)}/{len(scenario_4)} passed")
    
    log("=" * 80)
    return passed, failed, results

if __name__ == "__main__":
    passed, failed, results = run_all_tests()
    exit(0 if failed == 0 else 1)
