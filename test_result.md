#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "SIM Porseni MI Kecamatan Plosoklaten - role-based competition management app (Super Admin, Admin Madrasah, Panitia). Next.js + MongoDB. Features: auth+roles, lomba CRUD, participant registration with file upload, verification, print sheets, results/winners, certificate & ID card engine."

backend:
  - task: "Multi-device login (token array) — one account usable on multiple devices simultaneously"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE for multi-device: previously each login OVERWROTE the single user.token, invalidating all other devices. Now users keep a `tokens` array. register + POST /users initialize tokens:[initToken]. login generates a NEW token and does {$set:{token}, $addToSet:{tokens:token}} (does NOT invalidate previous tokens). getUser() now matches {$or:[{tokens:token},{token}]}. clean()/cleanUserAdmin()/profile handlers now also strip `tokens` (must NOT leak). admin/restore also $addToSet the current super_admin token. Verified manually: login twice -> both device tokens valid on /auth/me, no leak. TEST: (1) super_admin login twice (T1 then T2); GET /auth/me with T1 -> 200 (old token STILL valid), with T2 -> 200. (2) Ensure /auth/me, /auth/login, /auth/register, GET /users do NOT leak tokens/token/password/hash. (3) Create panitia via POST /users, login twice, both tokens work. (4) Regression: invalid/no token -> 401. Seed: super@porseni.id/admin123."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 4 SCENARIOS PASSED - Comprehensive backend testing of multi-device login (token array) feature. SCENARIO 1 (Multi-device core): Super admin login Device 1 (super@porseni.id/admin123) returned token T1, login Device 2 with SAME credentials returned DIFFERENT token T2. 🔍 CRITICAL TEST PASS: GET /auth/me with T1 (old device token) returned HTTP 200 with correct user AFTER Device 2 login (proves old token NOT invalidated - this was the key bug fix). GET /auth/me with T2 also returned 200. Both device tokens valid simultaneously. Login responses do NOT leak sensitive fields in user object. SCENARIO 2 (No sensitive leak): GET /users (super_admin) correctly shows password_plain (for super_admin visibility) but does NOT leak _id/password/token/tokens. GET /auth/me does NOT leak password/password_plain/token/tokens/_id. SCENARIO 3 (New user multi-device): Created individu lomba 'Test Multi-Device Lomba'. POST /users created panitia user with assigned_lomba_id, auto-verified with default password 12345678, response shows password_plain but does NOT leak token/tokens/_id. Panitia login Device 1 returned token Tp1, login Device 2 returned DIFFERENT token Tp2. 🔍 CRITICAL TEST PASS: GET /auth/me with Tp1 (old panitia device token) returned HTTP 200 AFTER Device 2 login (multi-device working for newly created users too). GET /auth/me with Tp2 also returned 200. SCENARIO 4 (Regression): GET /auth/me with NO Authorization header correctly returned 401. GET /auth/me with invalid/random token correctly returned 401. GET /lomba (public, no auth) correctly returned 200 with array. Multi-device login feature working correctly: (1) Each login generates NEW unique token and adds to tokens array via $addToSet (does NOT overwrite/invalidate previous tokens). (2) getUser() matches {$or:[{tokens:token},{token}]} so ALL device tokens remain valid. (3) clean()/cleanUserAdmin() strip both token and tokens fields (no leak). (4) Works for super_admin, panitia, and all roles. NO SENSITIVE DATA LEAKS DETECTED. The key regression (old device tokens being invalidated on new login) is FIXED."
  - task: "Edit biodata peserta (PUT /peserta/:id) — admin_madrasah own-only scoping + super_admin any"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: PUT /peserta/:id now (1) returns 404 if peserta not found (before any body parse), (2) admin_madrasah can only edit OWN peserta (created_by===self else 403), (3) super_admin & panitia unchanged (can edit any). Accepted biodata fields unchanged: participant_name, gender, nisn, ttl, madrasah_name, lomba_id (recomputes lomba_name), files, status, nomor_peserta; complete recomputed. Frontend: Super Admin Data Pendaftar + Admin Madrasah Daftar Peserta now have 'Edit' button opening a biodata edit dialog. Test: (1) super_admin login; create lomba A + lomba B (individu); create admin_madrasah 'MI A' + login; MI A POST /peserta in lomba A -> pesertaA. (2) MI A PUT /peserta/pesertaA {participant_name:'Baru', gender:'P', nisn:'123', ttl:'Kediri, 2015', lomba_id: lombaB.id} -> 200, lomba_name updated to B, fields persisted. (3) create second admin_madrasah 'MI B' + login; MI B PUT /peserta/pesertaA -> 403 (not own). (4) super_admin PUT /peserta/pesertaA {madrasah_name:'MI X', nomor_peserta:'077'} -> 200 persisted. (5) PUT /peserta/nonexistent-id -> 404. (6) PUT with no token -> 401. Do NOT test Google integration endpoints."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 10 TESTS PASSED - Comprehensive end-to-end testing of PUT /peserta/:id authorization scoping and biodata edit feature. (1) Super admin login successful (super@porseni.id/admin123), no sensitive data leaks. (2) Created Lomba A (Test Lomba A - Olahraga/individu) and Lomba B (Test Lomba B - Seni/individu). (3) Created admin_madrasah 'MI A' (mi.a@porseni.id) with default password 12345678, login successful. (4) MI A created peserta 'Ahmad' (gender L, nisn 111, ttl 'Kediri, 2015') in Lomba A. (5) 🔍 CORE TEST PASS: MI A successfully edited OWN peserta (200) - ALL fields updated correctly: participant_name 'Ahmad' -> 'Ahmad Baru', gender 'L' -> 'P', nisn '111' -> '222', ttl 'Kediri, 2015' -> 'Kediri, 2016', lomba_id changed from Lomba A to Lomba B, lomba_name RECOMPUTED from 'Test Lomba A' to 'Test Lomba B'. GET /peserta confirmed lomba_name persisted correctly. (6) Created admin_madrasah 'MI B' (mi.b@porseni.id), login successful. (7) 🔍 CORE TEST PASS: MI B correctly REJECTED with 403 when trying to edit MI A's peserta (not own) - error message: 'Anda hanya dapat mengubah peserta milik madrasah Anda'. (8) 🔍 CORE TEST PASS: super_admin successfully edited ANY peserta (200) - madrasah_name 'MI A' -> 'MI X', nomor_peserta -> '077', both fields persisted correctly. (9) 🔍 CORE TEST PASS: super_admin PUT to nonexistent peserta correctly returned 404 - error message: 'Peserta tidak ditemukan' (404 returned BEFORE body parsing as required). (10) 🔍 CORE TEST PASS: PUT without Authorization header correctly returned 401 - error message: 'Tidak terautentikasi'. Authorization scoping working correctly: admin_madrasah can ONLY edit OWN peserta (created_by check enforced), super_admin can edit ANY peserta, 404 returned before body parsing, all accepted fields working (participant_name, gender, nisn, ttl, madrasah_name, lomba_id, nomor_peserta, files, status), lomba_name recomputed when lomba_id changes, complete flag recomputed on update. NO SENSITIVE DATA LEAKS DETECTED."

  - task: "Auth register/login/me (role-based, token auth, super_admin auto-verified, others pending)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Token stored in user.token, Bearer auth. super_admin auto verified; admin_madrasah/panitia pending until verified. Login blocks pending accounts."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (7 tests): super_admin register returns token immediately, admin_madrasah/panitia return {pending:true}, duplicate email rejected with 400, pending account login blocked with 403, wrong password rejected with 401, verified accounts login successfully, /auth/me returns user with Bearer token. No _id/password/token leaks."
  - task: "Password visibility + reset (super_admin) + forgot-password request"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "NEW: (1) register now stores password_plain alongside sha256 hash. (2) GET /users (super_admin) uses cleanUserAdmin => returns password_plain (but NOT hash/token); clean() strips password_plain everywhere else (login/register/me must NOT leak it). (3) PUT /users/:id accepts {password} => sets hash + password_plain + reset_requested:false. (4) POST /auth/forgot {email} (PUBLIC) sets reset_requested:true on matching user, returns generic ok message (no leak if email missing). Please test: register user then GET /users shows password_plain; login/register/me responses do NOT include password_plain or password; PUT password updates and login works with new password; forgot sets reset_requested and clears after reset."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 15 TESTS PASSED (4 scenarios): (1) password_plain visibility & no-leak (5/5): Register admin_madrasah returns {pending:true} with NO password/password_plain leak; GET /users shows password_plain='secret123' visible to super_admin but NOT password hash or token; Login response does NOT contain password_plain/password/token in user object; /auth/me does NOT contain password_plain/password/token. (2) Password reset by super_admin (4/4): Super admin resets password via PUT /users/:id with no hash/token leak; Old password login fails (401); New password login succeeds; GET /users shows updated password_plain='newpass99'. (3) Forgot password request (4/4): POST /auth/forgot sets reset_requested=true for existing user; Returns generic ok:true for non-existent email (no leak); GET /users shows reset_requested=true; Password reset clears reset_requested to false. (4) Regression sanity (2/2): GET /lomba public endpoint works; Super admin login works. All password features working correctly with proper visibility controls and no sensitive data leaks."

  - task: "Lomba CRUD (super_admin only for write, public GET)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "GET public, POST/PUT/DELETE require super_admin. judging_criteria array."
        -working: true
        -agent: "testing"
        -comment: "ALL TESTS PASSED earlier."
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: added 'type' field (individu|kelompok) to POST and PUT. Default 'individu'. Please retest POST/PUT persist type and GET returns it."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (5 tests): POST /lomba with type='individu' returns type='individu', POST /lomba with type='kelompok' returns type='kelompok', POST /lomba WITHOUT type defaults to type='individu', PUT /lomba/:id changing type from individu to kelompok persists correctly, GET /lomba returns type field on all lomba. Type field working as expected."
  - task: "Users management (list/verify/delete) super_admin"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "PUT status verify, DELETE. Only super_admin."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (3 tests): GET /users returns all users (super_admin only), PUT /users/:id {status:'verified'} successfully verifies pending users, user verification enables login. No sensitive data leaks."
  - task: "Peserta CRUD role-filtered + nomor_peserta auto + drive_path mock + status update"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "testing"
        -comment: "ALL TESTS PASSED earlier (nomor_peserta auto, drive_path, role filtering, status update)."
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: added 'gender' (L|P) and computed 'complete' boolean (complete = participant_name+gender+lomba_id present AND files akte+surat_ket+pas_photo all uploaded). POST stores gender+complete. General PUT /peserta/:id now accepts gender+files and RECOMPUTES complete (also updates lomba_name when lomba_id changes). GET /peserta for PANITIA now filters {lomba_id, complete:true} so incomplete peserta are hidden from panitia. admin_madrasah still sees all own; super_admin sees all. Please retest: (1) POST with gender + partial files => complete:false; (2) PUT to add all 3 files => complete:true; (3) panitia GET only sees complete peserta of assigned lomba."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (7 tests): POST /peserta with gender='L' and no files returns complete=false with nomor_peserta auto-generated, POST /peserta with gender='P' and all 3 files returns complete=true, POST /peserta WITHOUT gender saves gender='' and complete=false even with files present, PUT /peserta/:id adding all 3 files recomputes complete to true, PUT /peserta/:id changing lomba_id updates lomba_name accordingly, GET /peserta as PANITIA returns ONLY complete=true peserta of assigned lomba (incomplete peserta hidden), admin_madrasah GET /peserta returns all own peserta (complete + incomplete), super_admin GET /peserta returns all peserta. Gender field and complete flag working correctly with proper visibility filtering."
  - task: "Hasil upload record + Juara assign/list/delete"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "testing"
        -comment: "ALL TESTS PASSED earlier (hasil create/list, juara upsert one per rank per lomba)."
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: Juara POST now supports GROUP winners. If body.is_group true OR lomba.type==='kelompok', stores {is_group:true, madrasah_name, peserta_id:null, participant_name=madrasah_name}. Individual path unchanged (peserta_id, is_group:false). Still upserts one per rank per lomba (deleteMany by lomba_id+rank). Please retest: individual juara assign still works; group juara assign with {lomba_id,rank,madrasah_name,is_group:true} stores madrasah_name; upsert replaces same rank."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (5 tests): POST /juara for kelompok lomba with is_group=true stores {is_group:true, madrasah_name:'MI Al-Hidayah', peserta_id:null, participant_name:'MI Al-Hidayah'}, POST /juara again with same rank different madrasah upserts correctly (only one Juara 1 per lomba), POST /juara for individu lomba with peserta_id stores {is_group:false, participant_name from peserta, madrasah_name from peserta}, GET /juara?lomba_id= filters correctly, DELETE /juara/:id works. Group winner support working correctly with proper upsert behavior."
  - task: "Templates upsert by type (certificate/idcard) + File upload (disk) + File serve"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "POST /upload multipart -> disk .uploads + files collection. GET /files/:id serves bytes. Templates upsert by type."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED (4 tests): POST /upload multipart returns {id,url,name}, GET /files/:id serves file bytes correctly, POST /templates upserts by type (updates existing, creates new), GET /templates?type= filters correctly. File upload and serve working."

  - task: "Profile self-service (GET/PUT /auth/profile)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "NEW: GET /auth/profile returns current user (incl password_plain, photo_url, assigned_lomba_id, madrasah_name) for the authenticated user (any role). PUT /auth/profile updates own name, photo_url, and password (rehash + password_plain). Must be authenticated (401 if no token). Should NOT allow changing role/email. Test: login each role -> GET returns own data with password_plain; PUT name+password updates and login works with new password."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 10 TESTS PASSED (5 scenarios): (1) GET /auth/profile with super_admin token returns password_plain='admin123', photo_url=null (optional field), no password/token/_id leak. (2) GET /auth/profile with admin_madrasah token returns password_plain, madrasah_name='MI Al-Hidayah', photo_url (optional), no leaks. (3) GET /auth/profile with panitia token returns password_plain, assigned_lomba_id, no leaks. (4) GET /auth/profile with no token returns 401. (5) GET /auth/profile with invalid token returns 401. (6) PUT /auth/profile updates name='Admin MI Updated', photo_url='/api/files/test-photo-123', password='newpass123' (rehashed + password_plain updated). (7) Login with OLD password (admin123) fails with 401. (8) Login with NEW password (newpass123) succeeds. (9) GET /auth/profile shows updated name, photo_url, password_plain='newpass123'. (10) /auth/login response does NOT leak password/password_plain/token in user object. Profile self-service working correctly with proper authentication and no sensitive data leaks. NOTE: admin.mi@porseni.id password changed to newpass123."

  - task: "Lomba team_size field (kelompok team registration support)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: POST /lomba now stores team_size (Number or null). PUT /lomba/:id allows updating team_size. GET returns it. Test: create kelompok lomba with team_size=6 persists; individu lomba team_size null; PUT updates team_size."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 5 TESTS PASSED: (1) POST /lomba with type='kelompok' and team_size=6 returns team_size=6. (2) POST /lomba with type='individu' (no team_size) returns team_size=null. (3) PUT /lomba/:id {team_size:8} on kelompok lomba updates team_size to 8. (4) GET /lomba returns team_size field for both kelompok (team_size=8) and individu (team_size=null) lomba. (5) Clean up - deleted 2 test lomba. Lomba team_size field working correctly with proper persistence and retrieval."

  - task: "Peserta nomor_peserta manual edit (PUT /peserta/:id)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: PUT /peserta/:id now accepts nomor_peserta in allowed fields so Panitia can set display order manually. Test: PUT nomor_peserta='005' persists and GET returns updated value."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 3 TESTS PASSED: (1) POST /peserta to create participant in Kaligrafi (individu) as admin_madrasah returns peserta with auto-generated nomor_peserta='001'. (2) PUT /peserta/:id {nomor_peserta:'099'} updates nomor_peserta to '099'. (3) GET /peserta verifies nomor_peserta='099' persisted correctly. Peserta nomor_peserta manual edit working correctly."

  - task: "Team registration (POST /peserta/team) for kelompok lomba"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "NEW: POST /peserta/team {lomba_id, madrasah_name, members:[{participant_name,gender,nisn,ttl,files}]}. Creates one peserta doc per member sharing team_id + team_name, is_group:true, auto nomor_peserta sequential per lomba, computes complete per member (each member needs own akte+surat_ket+pas_photo). Returns {team_id, team_name, count, members[]}. Requires auth. Empty members -> 400. Test: register a Futsal team (team_size 10) with members having own files -> creates N peserta with shared team_id; members with all 3 files complete=true."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 4 TESTS PASSED: (1) POST /peserta/team with 3 members (no files) as admin_madrasah for Futsal (kelompok) returns {team_id, team_name, count:3, members:[...]} with all members having is_group=true, same team_id, sequential nomor_peserta=['001','002','003'], complete=false (no files). (2) POST /peserta/team with 1 member WITH all 3 files (akte, surat_ket, pas_photo each with .id and .name) returns member with complete=true. (3) POST /peserta/team with empty members array returns HTTP 400 as expected. (4) POST /peserta/team with no token returns HTTP 401 as expected. Team registration working correctly with proper team_id sharing, sequential numbering, and completeness computation per member."

  - task: "Google Drive (OAuth) + Google Sheets (service account) integration"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js, lib/porseni/google.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Sheets via service account: peserta auto-append to tab 'Peserta' on POST /peserta & /peserta/team; POST /integrations/sync overwrites full sheet. Drive via OAuth user delegation (service account has no storage quota): POST /upload -> user's Drive folder w/ nested folder path, GET /files/:id streams bytes back. OAuth flow: GET /google/start?token=<super_admin> -> consent; GET /google/callback stores refresh_token in settings collection. GET /integrations/status reports sheets_configured/oauth_configured/drive_connected. Verified end-to-end MANUALLY (real spreadsheet append + real drive_url upload + serve-back). NOT auto-tested to avoid polluting user's real Google Sheet/Drive."

  - task: "Users PUT edit — now accepts email (dedup) + role (with role-consistent field cleanup)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: PUT /users/:id (super_admin only) now also accepts 'email' (lowercased, trimmed, rejects duplicate used by another user with 400) and 'role'. When role set: admin_madrasah -> assigned_lomba_id nulled; panitia -> madrasah_name nulled; super_admin -> both nulled. Existing name/madrasah_name/assigned_lomba_id/status/password still work. Test: create a panitia user via POST /users, then PUT to change assigned_lomba_id (divisi lomba) persists; PUT changing role panitia->admin_madrasah nulls assigned_lomba_id and sets madrasah_name; PUT email to an existing user's email -> 400; PUT unique new email persists (login with new email works). Seed: super@porseni.id/admin123."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 8 TEST SCENARIOS PASSED (comprehensive testing). (1) Super admin login successful with token. (2) Created 2 lomba (Test Lomba A - Olahraga/individu, Test Lomba B - Seni/individu). (3) POST /users created panitia user 'Panitia Test' with assigned_lomba_id=Lomba A id, status=verified. (4) PUT /users/:id {assigned_lomba_id: Lomba B id} successfully updated assigned_lomba_id to Lomba B (divisi lomba edit feature working), verified with GET /users. (5) PUT /users/:id {role:'admin_madrasah', madrasah_name:'MI Test'} successfully changed role, set madrasah_name='MI Test', and nulled assigned_lomba_id (role-consistent field cleanup working), verified with GET /users. (6) Created second user with email user.two@porseni.id, then PUT first user {email:'user.two@porseni.id'} correctly rejected with HTTP 400 'Email sudah digunakan pengguna lain' (duplicate email detection working). (7) PUT first user {email:'panitia.new@porseni.id'} (unique) persisted successfully, verified with GET /users, login with new email 'panitia.new@porseni.id' and default password '12345678' succeeded (email update + login working). (8) Regression tests: PUT {name:'Renamed'} and PUT {status:'pending'} both successful (existing fields still work). Non-super admin attempt: created admin_madrasah user, logged in, attempted PUT /users/:id rejected with HTTP 403 'Akses ditolak' (authorization working). All features working correctly: email deduplication, role-specific field cleanup (assigned_lomba_id nulled for admin_madrasah, madrasah_name nulled for panitia), email update persistence, regression compatibility, and proper authorization."
  - task: "NEW: Peserta verify super_admin-only; POST /users bulk create; lomba idcard_image_url; juara gender; backup/restore; 5 required files"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "DELTA to test: (1) PUT /peserta/:id/status now super_admin ONLY (403 for admin_madrasah/panitia, 200 for super_admin). (2) POST /users (super_admin only) creates VERIFIED user, default password '12345678' if none; duplicate -> 400; non-super -> 403; response has password_plain but NO password hash/token/_id. (3) Lomba POST/PUT accepts idcard_image_url; GET returns it. (4) POST /juara keyed by lomba_id+rank+gender: Juara 1 gender L and Juara 1 gender P for same lomba BOTH persist; same rank+gender upserts. GET /juara returns gender. (5) GET /admin/backup (super_admin) returns {collections:{...}}; POST /admin/restore {collections:{...}} wipes+reinserts, keeps super_admin session (can still call /auth/me). (6) computeComplete requires 5 files: akte,surat_ket,pas_photo,nisn_doc,raport -> only-3-files peserta now complete:false. Seed: super@porseni.id/admin123."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 30 TESTS PASSED. (1) POST /users bulk create: auto-verified, default password 12345678, login works, duplicate->400, non-super->403, no hash/token/_id leak. (2) PUT /peserta/:id/status super_admin-only: admin_madrasah->403, super_admin->200. (3) Lomba idcard_image_url persists on POST/PUT and returned by GET. (4) Juara gender: Juara 1 L and Juara 1 P coexist (2 docs); re-POST same rank+gender upserts (replaces only matching gender, other gender untouched). (5) Backup returns all 8 collections; non-super->403; restore round-trips and super_admin session preserved (/auth/me 200 after). (6) computeComplete: 3 files->complete:false, 5 files (akte,surat_ket,pas_photo,nisn_doc,raport)->complete:true."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 6 SCENARIOS PASSED (comprehensive backend testing). (1) POST /users bulk-create (7/7 tests): super_admin creates verified user with default password '12345678', no password hash/token/_id leak in response, login with default password succeeds (proves auto-verified), duplicate email rejected with 400, non-super user POST /users rejected with 403. (2) PUT /peserta/:id/status super_admin-only (4/4 tests): admin_madrasah PUT /peserta/:id/status rejected with 403, super_admin PUT /peserta/:id/status returns 200 with status=verified. (3) Lomba idcard_image_url (4/4 tests): POST /lomba with idcard_image_url persists correctly, PUT /lomba/:id updates idcard_image_url, GET /lomba includes idcard_image_url. (4) Juara gender upsert by lomba_id+rank+gender (9/9 tests): POST /juara with rank='Juara 1' gender='L' creates juara L, POST /juara with rank='Juara 1' gender='P' creates juara P, GET /juara returns 2 docs (both rank='Juara 1', genders L and P coexist), POST /juara again with same rank+gender upserts (replaces L only, P unchanged, still 2 total docs). (5) Backup & Restore (4/4 tests): GET /admin/backup returns collections array with all 8 keys (users, lomba, peserta, hasil, juara, templates, files, settings), non-super GET /admin/backup rejected with 403, POST /admin/restore round-trips successfully, GET /auth/me with SAME super_admin token returns 200 (session preserved, not locked out). (6) computeComplete requires 5 files (2/2 tests): POST /peserta with only 3 files (akte, surat_ket, pas_photo) returns complete=false, PUT /peserta/:id adding nisn_doc and raport (all 5 files) returns complete=true. All backend APIs functioning correctly with proper authentication, authorization, data persistence, and validation. NO SENSITIVE DATA LEAKS DETECTED."

  - task: "DELETE /peserta/:id authorization scoping (super_admin any; admin_madrasah own only; panitia forbidden)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CHANGE: DELETE /peserta/:id now role-scoped. super_admin deletes any; admin_madrasah only own (created_by===self else 403); panitia always 403; unknown id -> 404; no token -> 401. Previously any authenticated user could delete any peserta."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 14 TESTS PASSED (12 authorization tests + 2 regression tests). Comprehensive testing of DELETE /peserta/:id authorization scoping: (1) super_admin login successful. (2) Created lomba 'Test Delete Auth' (Olahraga/individu). (3) Created admin_madrasah user 'MI A', login successful. (4) Created admin_madrasah user 'MI B', login successful. (5) MI A created peserta1 (Peserta A, gender L). (6) MI B created peserta2 (Peserta B, gender P). (7) MI A DELETE peserta2 (not own) -> 403 as expected (admin_madrasah can only delete own peserta). (8) MI A DELETE peserta1 (own) -> 200 successful. (9) Verified peserta1 no longer in MI A's GET /peserta list. (10) Created panitia user assigned to lomba, login successful. (11) Panitia DELETE peserta2 -> 403 as expected (panitia cannot delete any peserta). (12) super_admin DELETE peserta2 -> 200 successful (super_admin can delete any peserta). (13) super_admin DELETE nonexistent-id-123 -> 404 as expected. (14) DELETE without Authorization header -> 401 as expected. Regression tests: GET /lomba (public) returns 200 with array, super_admin login returns 200 with no password/password_plain/token/_id leaks. All authorization rules working correctly: super_admin can delete ANY peserta, admin_madrasah can delete ONLY own peserta (created_by check), panitia always forbidden, proper 404 for nonexistent id, proper 401 for missing token."

  - task: "User gender field (register, POST /users, PUT /users, PUT /auth/profile) for sertifikat/idcard"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "NEW: users now support optional 'gender' (L/P/null) so panitia certificates & ID cards can show Jenis Kelamin (Putra/Putri). Changes: (1) POST /auth/register stores gender (b.gender||null). (2) POST /users (super_admin) stores gender. (3) PUT /users/:id accepts 'gender' in allowed fields. (4) PUT /auth/profile accepts gender (set.gender). gender returned via GET /users (cleanUserAdmin) and GET /auth/profile (rest spread) — not a sensitive field. Test: (1) super_admin login super@porseni.id/admin123. (2) POST /lomba individu. (3) POST /users create panitia with gender:'L' -> response includes gender='L', no password hash/token/_id leak. (4) PUT /users/:id {gender:'P'} -> GET /users shows gender='P'. (5) PUT /users/:id {gender:null} clears. (6) Regression: GET /lomba 200; login/me no leak. Do NOT test Google integration endpoints."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL 8 TESTS PASSED - Comprehensive backend testing of user gender field feature. STEP 1 (Super admin login): super@porseni.id/admin123 login successful, user object does NOT leak password/password_plain/token/tokens/_id. STEP 2 (Create lomba): POST /lomba created individu lomba 'Test Gender Lomba' successfully. STEP 3 (Create panitia with gender): POST /users (super_admin) created panitia user with gender:'L' and assigned_lomba_id, response includes gender='L', status='verified', password_plain='12345678' (visible to super_admin), and does NOT leak password (hash)/token/tokens/_id. STEP 4 (GET /users shows gender): GET /users (super_admin) returned 2 users, panitia appears with gender='L', no token/tokens/hash/_id leak (password_plain is allowed for super_admin listing). STEP 5 (PUT /users gender='P'): PUT /users/:id {gender:'P'} successful, GET /users confirms gender='P' persisted correctly. STEP 6 (PUT /users gender=null): PUT /users/:id {gender:null} successful, GET /users confirms gender=null (cleared successfully). STEP 7 (Regression): (a) POST /auth/register with gender:'L' for admin_madrasah accepted without error, returns {pending:true}. (b) GET /lomba (public, no auth) returns 200 with array. (c) GET /auth/me with super_admin token returns 200 with no sensitive leak. STEP 8 (PUT /auth/profile gender): Panitia login successful with default password 12345678, PUT /auth/profile {gender:'L'} successful, GET /auth/profile confirms gender='L' persisted correctly, no password/token leak in both PUT and GET responses. User gender field working correctly: (1) POST /auth/register accepts optional gender field (L/P/null). (2) POST /users (super_admin) stores gender and returns it (with password_plain but no hash/token/_id). (3) PUT /users/:id accepts gender field and persists changes (L, P, or null). (4) PUT /auth/profile accepts gender field for self-service updates. (5) GET /users (super_admin) returns gender field with no sensitive leaks. (6) GET /auth/profile returns gender field with no sensitive leaks. NO SENSITIVE DATA LEAKS DETECTED. All backend APIs functioning correctly with proper authentication, authorization, data persistence, and validation."

frontend:
  - task: "User gender + sertifikat/idcard gender element + precise overlay editor + multiline name (Textarea)"
    implemented: true
    working: "NA"
    file: "components/porseni/OverlayEditor.jsx, lib/porseni/canvasgen.js, lib/porseni/constants.js, components/porseni/SuperAdmin.jsx, components/porseni/AdminMadrasah.jsx, components/porseni/ProfileView.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Frontend-only (user tests UI): (1) Added 'gender_label' (Putra/Putri) element to CERT_DEFAULT_FIELDS, CERT_PANITIA_FIELDS, IDCARD_PESERTA_FIELDS, IDCARD_PANITIA_FIELDS; populated values in all TemplateStudio targets (peserta from peserta.gender, panitia from user.gender). (2) OverlayEditor now has numeric X/Y/Size inputs + 'Lebar Maks Baris' (maxWidth wrap) control for precise, reproducible positioning across all templates. (3) canvasgen renderOverlay renders multi-line names (respects \\n from Enter) + auto word-wrap by maxWidth. (4) participant_name inputs converted to Textarea (satuan/team/edit in AdminMadrasah + EditBiodata in SuperAdmin) so names can be entered with line breaks. (5) EditUserDialog + ProfileView have Jenis Kelamin select so panitia gender can be set."

  - task: "Asal Madrasah filter on Data Pendaftar (Super Admin)"
    implemented: true
    working: true
    file: "components/porseni/SuperAdmin.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Added 'Asal Madrasah' dropdown filter (Semua Madrasah + unique madrasah_name options) between Cabang Lomba and Jenis Kelamin filters. Applied to rows filter and print sheet title. Verified via screenshot: filter renders and table shows all madrasah."
  - task: "Panitia kelompok (Voli/Futsal) grouped-by-Asal-Madrasah accordion"
    implemented: true
    working: true
    file: "components/porseni/Panitia.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "For panitia whose lomba.type==='kelompok' (Voli/Futsal), DaftarPeserta now groups peserta by Asal Madrasah as collapsible cards (madrasah name + peserta count + verified badge shown first; click expands to reveal member names/table). Individu lombas keep the original flat table. Verified via screenshot: MI Al-Hidayah expanded shows Andi/Budi, MI Nurul Huda collapsed."
  - task: "Super Admin Dashboard medal standings (Perolehan Juara per Asal Madrasah)"
    implemented: true
    working: true
    file: "components/porseni/SuperAdmin.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: true
        -agent: "main"
        -comment: "Dashboard now loads /juara and shows a medal standings table per Asal Madrasah: Juara 1=Emas(5pt), Juara 2=Perak(3pt), Juara 3=Perunggu(1pt), Harapan=0. Sorted by total poin desc (tie-break gold/silver/bronze/name). Verified via screenshot: MI Nurul Huda 1 Emas+1 Perak=8pt, MI Al-Hidayah 1 Emas=5pt (correct)."
  - task: "Manajemen Pengguna: Cetak/Export Excel (nama, user/email, password_plain, peran, keterangan, status)"
    implemented: true
    working: "NA"
    file: "components/porseni/SuperAdmin.jsx, lib/porseni/excel.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added exportUsersToExcel(users, lomba) in excel.js (columns: No, Nama, User email/kode, Kata Sandi=password_plain, Peran, Keterangan=madrasah/lomba, Status) and a 'Cetak Excel' button in ManajemenPengguna PageHeader. Uses existing GET /users (super_admin returns password_plain) so NO backend change. Frontend-only; user tests UI."
  - task: "MOVE cek berkas to Super Admin Data Pendaftar (Berkas column) + Hapus action; keep Berkas column in Panitia"
    implemented: true
    working: "NA"
    file: "components/porseni/SuperAdmin.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "User request: (1) add 'cek berkas pendaftar' (file view links) to Super Admin Data Pendaftar (Panitia keeps its Berkas column too). (2) Add Hapus (delete) action on Super Admin Data Pendaftar. Added new 'Berkas' column (file links via fileUrl) between Cabang Lomba and Kelengkapan, and a Trash2 delete button (with confirm) in Aksi column calling DELETE /peserta/:id then reload. Panitia.jsx unchanged. Frontend not auto-tested (user tests UI)."

  - task: "NEW: Cetak Absensi photo column + Manajemen Pengguna edit dialog (divisi lomba) + Tempat Tgl Lahir (TTL) column"
    implemented: true
    working: "NA"
    file: "components/porseni/Panitia.jsx, components/porseni/SuperAdmin.jsx, app/globals.css"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Feature 1: Panitia Cetak Absensi now has a 'Foto' column rendering peserta pas_photo (files.pas_photo via fileUrl); placeholder box if none; print CSS added (.peserta-photo, color-adjust exact). ADDED per user feedback: Foto column also on SuperAdmin CetakAdmin (Cetak Administrasi) absensi print, and on SuperAdmin DataPendaftar (Data Pendaftar) both the on-screen verification table and the 'Cetak Semua' print sheet. Feature 2: Manajemen Pengguna row has new 'Edit' button (non-super_admin) opening EditUserDialog to edit name, email, role, madrasah_name (admin_madrasah) and assigned_lomba_id (Divisi/Cabang Lomba for panitia). Feature 3 (NEW per user): 'Tempat, Tgl Lahir' (ttl) column added to peserta data tables & absensi prints: SuperAdmin DataPendaftar (screen + print), SuperAdmin CetakAdmin absensi print, Panitia DaftarPeserta table, Panitia Cetak absensi print, and AdminMadrasah Daftar Peserta Saya table. ttl field already captured at registration (no backend change needed). Verified: CetakAdmin page renders without JS error, uploaded pas_photo served as image/png (200). NOTE: Frontend not auto-tested via testing agent yet (user testing themselves)."
  - task: "Gender in registration + Excel template/bulk import + Persyaratan upload + completeness gating (Admin Madrasah)"
    implemented: true
    working: true
    file: "components/porseni/AdminMadrasah.jsx, lib/porseni/excel.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added gender select (L/P), Excel template download + bulk upload import, per-peserta Persyaratan upload dialog (Akte/Surat Ket/Pas Photo), completeness badge. Peserta only forwarded to Panitia when complete."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED: (1) Pendaftaran Peserta page shows 'Pendaftaran Massal via Excel' card with Template and Upload Excel buttons, (2) Satuan form has all required fields including Jenis Kelamin select (L/P) and Berkas Persyaratan section with 3 upload rows (Akte, Surat Keterangan, Pas Photo), (3) Successfully registered 2 participants (Ahmad Fauzi L, Siti Aminah P), (4) Daftar Peserta Saya table shows L/P column and Kelengkapan column with 'Belum' badges for incomplete files, (5) Persyaratan dialog opens with all 3 upload rows visible. NOTE: File upload automation is limited - cannot test actual file upload, but UI elements are correct."
  - task: "Panitia cetak gender filter + Juara kelompok (per MI)"
    implemented: true
    working: true
    file: "components/porseni/Panitia.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Cetak Absensi/Penilaian has gender filter (Semua/L/P) + L/P column. Penetapan Juara shows MI dropdown when lomba.type==kelompok."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED: (1) Cetak Administrasi page has 'Jenis Kelamin' filter with options Semua/Laki-laki/Perempuan, (2) Both print buttons found (Cetak Absensi, Cetak Lembar Penilaian), (3) Print preview shows L/P column in table, (4) Upload Hasil & Juara for Kaligrafi (individu) shows peserta dropdown with 'Pilih peserta' placeholder, (5) Upload Hasil & Juara for Cerdas Cermat (kelompok) shows heading '(Kelompok — per Madrasah)' and madrasah dropdown with 'Pilih madrasah' placeholder. Gender filter and kelompok mode working correctly."
  - task: "SuperAdmin lomba type, dashboard breakdown, Data Pendaftar print-all, Sertifikat group modes + bug robustness"
    implemented: true
    working: true
    file: "components/porseni/SuperAdmin.jsx, components/porseni/Shell.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Lomba form has Jenis (individu/kelompok). Dashboard shows L/P totals + per-lomba rekap. New Data Pendaftar menu (filters + Cetak Semua). Sertifikat supports group modes (Per Peserta / Per Regu) and is robust to empty data (previously appeared to error due to missing MONGO_URL env, now fixed)."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED: (1) Manajemen Lomba dialog has 'Jenis Lomba' select with Individu/Kelompok options, lomba table has 'Jenis' column showing type correctly, (2) CRITICAL: Manajemen Sertifikat page loaded WITHOUT any JS errors - shows upload template button and generate section with no crash (previously errored, now fixed), (3) Dashboard shows 'Peserta Laki-laki' and 'Peserta Perempuan' stat cards, 'Rekap Pendaftar per Cabang Lomba' table has Laki-laki/Perempuan/Total columns, (4) Data Pendaftar page has 'Cetak Semua' button and filter selects for Cabang Lomba and Jenis Kelamin. All Super Admin features working correctly. NO JS ERRORS DETECTED."

  - task: "Panitia GET /peserta requires status='verified' (unverified peserta excluded from akun lomba & cetak administrasi)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "BUG FIX: User reported peserta whose berkas NOT yet verified by super_admin were still appearing in Panitia (akun lomba) & Cetak Administrasi. Backend change: panitia GET /peserta filter changed from {lomba_id, complete:true} to {lomba_id, complete:true, status:'verified'}. So panitia now ONLY receives verified peserta (dashboard, daftar peserta, cetak administrasi, hasil dropdowns). super_admin and admin_madrasah GET /peserta UNCHANGED (still see all). Test: (1) super_admin create lomba + create panitia user assigned to that lomba; (2) admin_madrasah (or super_admin creates peserta) create a COMPLETE peserta (5 files) in that lomba -> status defaults 'pending'; (3) panitia GET /peserta returns EMPTY (peserta pending, not verified) even though complete; (4) super_admin PUT /peserta/:id/status {status:'verified'}; (5) panitia GET /peserta now returns that peserta. Also verify admin_madrasah still sees own pending peserta and super_admin sees all."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL TESTS PASSED - BUG FIX VERIFIED. Comprehensive end-to-end testing of panitia GET /peserta status='verified' filter: (1) Super admin login successful (super@porseni.id/admin123), no sensitive data leaks (_id/password/password_plain/token). (2) Created individu lomba 'Test Verify Lomba' (Olahraga). (3) Created panitia user 'Panitia X' (panitia.x@porseni.id) assigned to lomba, login successful. (4) Created admin_madrasah user 'MI X' (mi.x@porseni.id), login successful. (5) Admin madrasah created COMPLETE peserta 'Ahmad Test' with ALL 5 files (akte, surat_ket, pas_photo, nisn_doc, raport) -> complete=true, status='pending'. (6) 🔍 CORE TEST PASS: Panitia GET /peserta returned EMPTY array (unverified peserta correctly hidden from panitia even though complete=true). (7) Super admin verified peserta (PUT /peserta/:id/status {status:'verified'}). (8) 🔍 CORE TEST PASS: Panitia GET /peserta now returns exactly 1 peserta (verified peserta now visible to panitia). (9) Regression PASS: Admin madrasah GET /peserta still returns own peserta (sees own regardless of verification status). (10) Regression PASS: Super admin GET /peserta returns all peserta. The bug fix is working correctly: panitia users now ONLY see verified peserta (complete + status='verified'), unverified peserta are correctly hidden from panitia's akun lomba & cetak administrasi. super_admin and admin_madrasah behavior UNCHANGED (super_admin sees all, admin_madrasah sees own)."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 13
  run_ui: false

test_plan:
  current_focus:
    - "User gender field (register, POST /users, PUT /users, PUT /auth/profile) for sertifikat/idcard"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"
  run_ui: false

agent_communication:
    -agent: "main"
    -message: "NEW DELTA to test (backend only, high_first). Task: 'User gender field'. .env was missing on continuation start -> restored (MONGO_URL=mongodb://localhost:27017, DB_NAME=porseni_db, NEXT_PUBLIC_BASE_URL, CORS_ORIGINS=*) + re-seeded super_admin via /api/auth/register (super@porseni.id/admin123, ONLY account). Backend change: users now accept optional 'gender' (L/P/null). Test steps: (1) super_admin login. (2) POST /lomba (individu) for panitia assignment. (3) POST /users create panitia {gender:'L', assigned_lomba_id} -> response has gender='L', NO password hash/token/tokens/_id leak (password_plain OK). (4) GET /users shows the panitia with gender='L'. (5) PUT /users/:id {gender:'P'} -> GET /users shows gender='P'. (6) PUT /users/:id {gender:null} -> gender cleared. (7) Regression: GET /lomba public 200; super_admin login + /auth/me no sensitive leak. Do NOT test Google integration endpoints."
    -agent: "main"
    -message: "NEW FEATURE DELTA (continuation). .env was MISSING on start -> restored (MONGO_URL, DB_NAME=porseni_db, NEXT_PUBLIC_BASE_URL preview, CORS=*) + re-seeded super_admin (super@porseni.id/admin123, only account). Please test ONLY backend, high_first, the task 'Multi-device login (token array)'. Focus: (1) super_admin login TWICE -> get T1 then T2; GET /auth/me with T1 must be 200 (old device token STILL valid after 2nd login), GET /auth/me with T2 must be 200. (2) No leak of `tokens`/`token`/`password`/`password_plain` in /auth/me, /auth/login, /auth/register responses, and GET /users (super_admin) must show password_plain but NOT token/tokens/hash. (3) POST /users creates a panitia (need a lomba first), login that panitia twice -> both tokens valid. (4) Regression: GET /auth/me with no token -> 401, with invalid token -> 401; GET /lomba public -> 200. Do NOT test Google integration endpoints. NOTE: other frontend-only features added this round (Asal Madrasah filter on Data Pendaftar, Panitia kelompok grouped-by-madrasah accordion, Super Admin dashboard medal standings per madrasah) are UI-only and will be tested separately by user."

    -agent: "testing"
    -message: "✅ MULTI-DEVICE LOGIN BACKEND TESTING COMPLETE - ALL 4 SCENARIOS PASSED. Comprehensive end-to-end testing of token array implementation for simultaneous multi-device login. SCENARIO 1 (Multi-device core - THE KEY TEST): Super admin logged in twice with same credentials (super@porseni.id/admin123), received two DIFFERENT tokens (T1 and T2). 🔍🔍🔍 CRITICAL REGRESSION FIX VERIFIED: GET /auth/me with T1 (Device 1 old token) returned HTTP 200 with correct user data AFTER Device 2 login with T2. This proves the old device token was NOT invalidated by the second login - the key bug is FIXED. GET /auth/me with T2 also returned 200. Both device tokens work simultaneously. No sensitive data leaks in login responses (user object does NOT contain _id/password/password_plain/token/tokens). SCENARIO 2 (No sensitive leak): GET /users (super_admin) correctly returns password_plain (for super_admin visibility) but does NOT leak _id/password/token/tokens. GET /auth/me does NOT leak any sensitive fields. SCENARIO 3 (New user multi-device): Created test lomba (individu). POST /users created panitia user with assigned_lomba_id, auto-verified with default password 12345678. Panitia logged in twice (Tp1, Tp2 - different tokens). 🔍 CRITICAL: GET /auth/me with Tp1 returned 200 AFTER Tp2 login (multi-device working for newly created users). GET /auth/me with Tp2 also returned 200. POST /users response shows password_plain but does NOT leak token/tokens/_id. SCENARIO 4 (Regression): GET /auth/me with NO Authorization header correctly returned 401. GET /auth/me with invalid/random Bearer token correctly returned 401. GET /lomba (public, no auth) correctly returned 200 with array. Implementation verified: (1) Each login generates NEW unique token via uuidv4(). (2) Login does {$set:{token}, $addToSet:{tokens:token}} - adds new token to array WITHOUT removing old tokens. (3) getUser() matches {$or:[{tokens:token},{token}]} - checks both tokens array and legacy token field, so ALL device tokens remain valid. (4) clean() and cleanUserAdmin() strip both 'token' and 'tokens' fields (no leak). (5) Works correctly for super_admin, panitia, admin_madrasah, and all roles. The multi-device login feature is working correctly - one account can now be used on multiple devices simultaneously without invalidating previous device tokens. NO SENSITIVE DATA LEAKS DETECTED. Ready for main agent to summarize and finish."
    -agent: "main"
    -message: "BUG FIX DELTA to test (backend only, high_first). .env was MISSING on continuation start -> restored (MONGO_URL=mongodb://localhost:27017, DB_NAME=porseni_db, NEXT_PUBLIC_BASE_URL preview, CORS=*). DB was empty -> re-seeded super_admin (super@porseni.id/admin123, only account). Task to test: 'Panitia GET /peserta requires status=verified'. The panitia GET /peserta filter is now {lomba_id, complete:true, status:'verified'}. Steps: (1) super_admin login; POST /lomba (individu) -> lombaX; POST /users create a panitia assigned_lomba_id=lombaX (default pw 12345678), and an admin_madrasah (default pw 12345678). (2) As admin_madrasah, POST /peserta in lombaX WITH all 5 files (akte,surat_ket,pas_photo,nisn_doc,raport) so complete=true; status defaults 'pending'. (3) panitia login; GET /peserta -> should be EMPTY array (peserta is complete but NOT verified). (4) super_admin PUT /peserta/:id/status {status:'verified'}. (5) panitia GET /peserta -> should now contain that 1 peserta. (6) Regression: admin_madrasah GET /peserta still returns own peserta regardless of verify; super_admin GET /peserta returns all. Do NOT test Google integration endpoints."

    -agent: "main"
    -message: "NEW DELTA to test (backend only, high_first). Task: 'DELETE /peserta/:id authorization scoping'. .env was missing on continuation start -> restored (MONGO_URL, DB_NAME=porseni_db, NEXT_PUBLIC_BASE_URL, CORS) + re-seeded super_admin (super@porseni.id/admin123, only user). Backend change: DELETE /peserta/:id now role-scoped: super_admin can delete any peserta; admin_madrasah only own (created_by===self else 403); panitia always 403; unknown id -> 404; no token -> 401. Test steps: (1) super_admin login; create a lomba; create an admin_madrasah user (POST /users) 'MI A' + login; admin_madrasah POST /peserta -> peserta1 (own). (2) create second admin_madrasah 'MI B' + login; POST /peserta -> peserta2. (3) MI A DELETE peserta2 -> 403 (not own); MI A DELETE peserta1 -> 200 (own, gone from GET). (4) create a panitia user assigned to lomba; panitia DELETE any peserta -> 403. (5) super_admin DELETE remaining peserta -> 200. (6) DELETE unknown id -> 404; DELETE with no token -> 401. Do NOT test Google integration endpoints."

    -message: "CONTINUATION DELTA. .env was missing on start -> restored (MONGO_URL, DB_NAME, NEXT_PUBLIC_BASE_URL, CORS) + re-seeded super_admin (super@porseni.id/admin123, only user). Please test ONLY backend, high_first, the task 'Users PUT edit — now accepts email (dedup) + role'. Steps: (1) POST /users create a panitia user (need a lomba first: POST /lomba as super_admin). (2) PUT /users/:id {assigned_lomba_id: <other lomba id>} persists (GET /users shows updated). (3) PUT /users/:id {role:'admin_madrasah', madrasah_name:'MI Test'} nulls assigned_lomba_id and sets madrasah_name. (4) PUT /users/:id {email:'<existing other user email>'} -> 400 duplicate; PUT unique new email -> persists and login works with new email. (5) Regression: PUT name/status still work; non-super PUT -> 403. Do NOT test Google integration endpoints."
    -agent: "main"
    -message: "NEW backend delta to test: password features. (1) register stores password_plain; (2) GET /users returns password_plain for super_admin only (verify NO password_plain/hash/token leak in /auth/login, /auth/register, /auth/me); (3) PUT /users/:id {password} resets password (login with new password must work) and clears reset_requested; (4) POST /auth/forgot {email} public sets reset_requested true (generic ok msg even for unknown email). Kop surat uses existing /templates type=kopsurat (no new endpoint). Super admin: super@porseni.id / admin123."
    -agent: "testing"
    -message: "✅ BACKEND TESTING COMPLETE - ALL 22 TESTS PASSED. Tested all recent changes: (1) Lomba type field (individu/kelompok with defaults) working correctly, (2) Peserta gender (L/P) and complete flag computed correctly, panitia visibility filter working (only sees complete peserta of assigned lomba), (3) Juara group support working (is_group, madrasah_name for kelompok lomba, upsert behavior correct). No sensitive data leaks (_id/password/token). All backend APIs functioning as expected. Ready for main agent to summarize and finish."
    -agent: "testing"
    -message: "✅ FRONTEND TESTING COMPLETE - ALL FLOWS PASSED. Comprehensive UI testing completed covering all 3 roles (Super Admin, Admin Madrasah, Panitia). Key findings: (1) CRITICAL: Manajemen Sertifikat page loads WITHOUT JS errors (previously errored, now fixed), (2) All Super Admin features working: lomba type field (Individu/Kelompok), dashboard gender breakdown (L/P stats + rekap table), Data Pendaftar with filters and Cetak Semua button, (3) Admin Madrasah: Excel bulk import card present, satuan form has gender select and berkas persyaratan section, participants registered successfully, L/P column and Kelengkapan badges working, Persyaratan dialog shows all 3 upload rows, (4) Panitia: Cetak Administrasi has gender filter (Semua/L/P) and print buttons, Upload Hasil & Juara shows peserta dropdown for individu lomba and madrasah dropdown for kelompok lomba. NO JS ERRORS DETECTED. All UI elements and integrations working correctly. NOTE: File upload automation is limited - cannot test actual file upload, but UI elements are correct. Ready for main agent to summarize and finish."
    -agent: "testing"
    -message: "✅ PASSWORD FEATURES TESTING COMPLETE - ALL 15 TESTS PASSED (4 scenarios). Comprehensive testing of new password features: (1) password_plain visibility & no-leak (5/5 tests): Register returns {pending:true} with NO password leak; GET /users shows password_plain visible to super_admin only; Login/register/me responses do NOT leak password_plain/password/token. (2) Password reset by super_admin (4/4 tests): Reset via PUT /users/:id works; Old password fails, new password succeeds; password_plain updated in GET /users. (3) Forgot password request (4/4 tests): POST /auth/forgot sets reset_requested=true; Generic response for non-existent emails (no leak); Reset clears reset_requested. (4) Regression sanity (2/2 tests): GET /lomba public and super_admin login still working. All password features implemented correctly with proper security controls. NO SENSITIVE DATA LEAKS DETECTED."
    -agent: "main"
    -message: "NEW backend delta (FASE 1) to test. Please test ONLY backend, high_first. (1) Profile: GET /auth/profile returns own user incl password_plain/photo_url/assigned_lomba_id/madrasah_name (401 if no token); PUT /auth/profile updates name+photo_url+password (rehash + password_plain), then login with new password works; must NOT leak on /auth/login. (2) Lomba team_size: POST /lomba {type:'kelompok',team_size:6} persists team_size=6; individu -> null; PUT updates team_size. (3) Peserta nomor manual: PUT /peserta/:id {nomor_peserta:'005'} persists. (4) Team registration: POST /peserta/team {lomba_id (a kelompok lomba), madrasah_name, members:[{participant_name,gender,nisn,ttl,files:{}}...]} creates one peserta per member sharing team_id+team_name, is_group:true, sequential nomor_peserta; empty members -> 400; members with all 3 files (akte,surat_ket,pas_photo each having .id) complete=true else false. Seed present: super@porseni.id/admin123 (super), admin.mi@porseni.id/admin123 (admin_madrasah MI Al-Hidayah, verified), panitia@porseni.id/admin123 (panitia assigned Bola Voli Putra, verified). Lomba: Kaligrafi(individu), Bola Voli Putra(kelompok,6), Futsal(kelompok,10). NOTE: to set password_plain for admin/panitia you may need super_admin reset or they were created via register (password_plain stored). Do NOT reset super admin password."

    -agent: "testing"
    -message: "✅ FASE 1 BACKEND TESTING COMPLETE - ALL 23 TESTS PASSED (4 feature areas). Comprehensive testing of NEW/CHANGED backend endpoints: (1) Profile self-service (10/10 tests): GET /auth/profile with super_admin/admin_madrasah/panitia tokens returns own data including password_plain, photo_url (optional), assigned_lomba_id, madrasah_name with NO password/token/_id leak; 401 with no/invalid token; PUT /auth/profile updates name, photo_url, password (rehashed + password_plain updated); login with NEW password succeeds; /auth/login response does NOT leak password/password_plain/token. (2) Lomba team_size (5/5 tests): POST /lomba with type='kelompok' and team_size=6 persists team_size=6; type='individu' returns team_size=null; PUT /lomba/:id updates team_size to 8; GET /lomba returns team_size field; cleanup successful. (3) Peserta nomor_peserta manual edit (3/3 tests): POST /peserta creates participant with auto nomor_peserta; PUT /peserta/:id {nomor_peserta:'099'} persists; GET verifies update. (4) Team registration (4/4 tests): POST /peserta/team with 3 members (no files) creates team with shared team_id, sequential nomor_peserta, complete=false; member WITH all 3 files (akte, surat_ket, pas_photo) has complete=true; empty members returns 400; no token returns 401. All backend APIs functioning correctly with proper authentication, data persistence, and validation. NOTE: admin.mi@porseni.id password changed to newpass123 during testing. Ready for main agent to summarize and finish."

    -agent: "main"
    -message: "REGRESSION CHECK ONLY. Changed next.config.js to add experimental.cpus=1 and workerThreads=false (to fix EAGAIN process-limit crash during 'next build' on user's cPanel shared hosting). This is a BUILD-TIME only change; runtime behavior should be identical. Env restored earlier and only super_admin seeded (super@porseni.id/admin123). Please run a quick backend regression sanity test: (1) GET /api/lomba public returns 200 (array, may be empty), (2) super_admin login works, (3) /auth/me works with token. Do NOT test Google integrations (real Google APIs). Confirm no regressions from the config change."

    -agent: "testing"
    -message: "✅ REGRESSION CHECK PASSED. next.config.js change (experimental.cpus=1, workerThreads=false) caused NO regressions. GET /api/lomba 200 (array), super_admin login 200 (no password/token leak), /auth/me 200. Core endpoints healthy."

    -agent: "main"
    -message: "REGRESSION CHECK #2. Moved autoprefixer/postcss/tailwindcss from devDependencies to dependencies in package.json (cPanel prod mode skips devDeps -> 'Cannot find module autoprefixer' during build). Also added eslint.ignoreDuringBuilds=true in next.config.js. These are build/packaging changes; runtime unaffected. Please re-run the SAME quick backend regression sanity check: (1) GET /api/lomba 200 array; (2) super_admin login super@porseni.id/admin123 200 with token and NO password/token leak; (3) /auth/me 200. Do NOT test Google integration endpoints."

    -agent: "testing"
    -message: "✅ REGRESSION CHECK #2 PASSED - ALL 3 TESTS PASSED. Verified core endpoints after package.json (moved autoprefixer/postcss/tailwindcss to dependencies) + next.config.js (eslint.ignoreDuringBuilds=true) changes: (1) GET /api/lomba (public, no auth) returns HTTP 200 with JSON array (empty array - expected), (2) POST /api/auth/login with super@porseni.id/admin123 returns HTTP 200 with token and user object (role: super_admin), user object does NOT leak password/password_plain/token/_id fields, (3) GET /api/auth/me with Bearer token returns HTTP 200 with super_admin user (email: super@porseni.id). NO REGRESSION DETECTED. The build/packaging changes have no impact on runtime behavior. All core backend APIs functioning correctly."

    -agent: "main"
    -message: "REGRESSION CHECK #3. Removed output:'standalone' from next.config.js — it conflicts with the custom server.js (next start-style getRequestHandler), which caused /api/* routes to return Next.js 404 in production on cPanel/Passenger. Verified locally in PRODUCTION mode (node server.js): GET / ->200, GET /api/lomba ->200 [], GET /api/auth/me (no token) ->401, and the standalone warning is gone. Please re-run the SAME quick backend regression sanity check on the running preview (dev): (1) GET /api/lomba 200 array; (2) super_admin login super@porseni.id/admin123 200 with token and NO password/token leak; (3) /auth/me 200 with token. Do NOT test Google integration endpoints."

    -agent: "main"
    -message: "GOOGLE INTEGRATION ADDED (Drive OAuth + Sheets service account). Env restored (.env was missing) + super_admin re-seeded (super@porseni.id/admin123). Sheets: service account writes to spreadsheet tab 'Peserta'; peserta auto-append on create; POST /integrations/sync full re-sync. Drive: OAuth user delegation because service accounts have no storage quota; /google/start + /google/callback store refresh_token in settings collection; /upload -> Drive (fallback disk if not connected); /files/:id streams from Drive. New SuperAdmin 'Integrasi Google' page. Verified end-to-end MANUALLY (real Google APIs) - both working. Did NOT run automated backend testing agent to avoid writing junk into the user's real Google Sheet/Drive. If automated testing is desired later, point it at a throwaway spreadsheet/folder."

    -agent: "main"
    -message: "REGRESSION CHECK ONLY. Changed next.config.js to add experimental.cpus=1 and workerThreads=false (to fix EAGAIN process-limit crash during 'next build' on user's cPanel shared hosting). This is a BUILD-TIME only change; runtime behavior should be identical. Env restored earlier and only super_admin seeded (super@porseni.id/admin123). Please run a quick backend regression sanity test: (1) GET /api/lomba public returns 200 (array, may be empty), (2) super_admin login works, (3) /auth/me works with token. Do NOT test Google integrations (real Google APIs). Confirm no regressions from the config change."

    -agent: "testing"
    -message: "✅ REGRESSION SANITY CHECK COMPLETE - ALL 3 TESTS PASSED. Verified core endpoints after next.config.js change (experimental.cpus=1, workerThreads=false): (1) GET /api/lomba (public, no auth) returns HTTP 200 with JSON array (empty array - DB recently reset, as expected), (2) POST /api/auth/login with super@porseni.id/admin123 returns HTTP 200 with token and user object (role: super_admin), user object does NOT leak password/password_plain/token/_id fields, (3) GET /api/auth/me with Bearer token returns HTTP 200 with super_admin user (email: super@porseni.id). NO REGRESSION DETECTED. The next.config.js build-time change has no impact on runtime behavior. All core backend APIs functioning correctly."

    -agent: "testing"
    -message: "✅ REGRESSION CHECK #3 PASSED - ALL 3 TESTS PASSED. Verified core endpoints after removing output:'standalone' from next.config.js (conflicted with custom server.js, caused /api 404 in production): (1) GET /api/lomba (public, no auth) returns HTTP 200 with JSON array (empty array - expected), (2) POST /api/auth/login with super@porseni.id/admin123 returns HTTP 200 with token and user object (role: super_admin), user object does NOT leak password/password_plain/token/_id fields, (3) GET /api/auth/me with Bearer token returns HTTP 200 with super_admin user (email: super@porseni.id). NO REGRESSION DETECTED. The next.config.js change has no impact on runtime behavior on the dev preview. All /api routes working correctly."

    -agent: "main"
    -message: "NEW FEATURE DELTA (continuation). .env was missing on start -> restored (MONGO_URL, DB_NAME, NEXT_PUBLIC_BASE_URL, CORS) + re-seeded super_admin (super@porseni.id/admin123). Please test ONLY backend, high_first, the new task 'NEW: Peserta verify super_admin-only; ...'. Focus: (1) PUT /peserta/:id/status is super_admin-only (create an admin_madrasah + peserta, verify 403 when admin_madrasah tries, 200 when super_admin). (2) POST /users super_admin creates verified user w/ default password 12345678 (login works), duplicate->400, non-super->403, no hash/token leak. (3) Lomba idcard_image_url persists (POST/PUT/GET). (4) Juara gender: POST Juara 1 L and Juara 1 P same lomba both persist (GET returns 2 with gender), re-POST same rank+gender upserts to 1. (5) Backup/Restore: GET /admin/backup returns collections; POST /admin/restore round-trips and super_admin token still valid (/auth/me 200 after). (6) computeComplete requires 5 files now (only-3-files peserta -> complete:false). Do NOT test Google integration endpoints."

    -agent: "testing"
    -message: "✅ NEW FEATURE DELTA BACKEND TESTING COMPLETE - ALL 6 SCENARIOS PASSED (30 total tests). Comprehensive testing of all new backend features: (1) POST /users bulk-create: super_admin-only, auto-verified, default password '12345678', duplicate rejection, non-super 403, no leaks. (2) PUT /peserta/:id/status: super_admin-only (admin_madrasah 403, super_admin 200). (3) Lomba idcard_image_url: POST/PUT/GET all working. (4) Juara gender: upsert by lomba_id+rank+gender (L and P coexist for same rank, same rank+gender upserts correctly). (5) Backup & Restore: GET /admin/backup returns all 8 collections, non-super 403, POST /admin/restore round-trips, session preserved. (6) computeComplete: requires 5 files (akte, surat_ket, pas_photo, nisn_doc, raport) - 3 files = complete:false, 5 files = complete:true. All backend APIs functioning correctly with proper authentication, authorization, data persistence, and validation. NO SENSITIVE DATA LEAKS DETECTED. Ready for main agent to summarize and finish."
    -agent: "testing"
    -message: "✅ USERS PUT EDIT BACKEND TESTING COMPLETE - ALL 8 TEST SCENARIOS PASSED. Comprehensive testing of 'Users PUT edit — now accepts email (dedup) + role (with role-consistent field cleanup)' feature: (1) Super admin login successful. (2) Created 2 lomba (Test Lomba A - Olahraga/individu, Test Lomba B - Seni/individu). (3) POST /users created panitia user with assigned_lomba_id=Lomba A id, status=verified. (4) PUT /users/:id {assigned_lomba_id: Lomba B id} successfully updated (divisi lomba edit feature working), verified with GET /users. (5) PUT /users/:id {role:'admin_madrasah', madrasah_name:'MI Test'} successfully changed role, set madrasah_name, and nulled assigned_lomba_id (role-consistent field cleanup working), verified with GET /users. (6) Duplicate email correctly rejected with HTTP 400 'Email sudah digunakan pengguna lain'. (7) Unique email update persisted, login with new email 'panitia.new@porseni.id' and default password '12345678' succeeded. (8) Regression tests passed: PUT {name:'Renamed'} and PUT {status:'pending'} successful; non-super admin PUT /users rejected with HTTP 403 'Akses ditolak'. All features working correctly: email deduplication, role-specific field cleanup (assigned_lomba_id nulled for admin_madrasah, madrasah_name nulled for panitia), email update persistence, regression compatibility, and proper authorization. NO SENSITIVE DATA LEAKS DETECTED. Ready for main agent to summarize and finish."
    -agent: "testing"
    -message: "✅ DELETE /peserta/:id AUTHORIZATION SCOPING BACKEND TESTING COMPLETE - ALL 14 TESTS PASSED (12 authorization tests + 2 regression tests). Comprehensive end-to-end testing of role-based DELETE authorization: (1) super_admin can delete ANY peserta (200) - verified by deleting peserta created by MI B. (2) admin_madrasah can delete ONLY own peserta (created_by check) - MI A successfully deleted own peserta1 (200), but MI A DELETE of MI B's peserta2 correctly rejected with 403. (3) panitia role always forbidden (403) - panitia DELETE any peserta correctly rejected with 403. (4) Nonexistent peserta id returns 404 - super_admin DELETE nonexistent-id-123 correctly returned 404. (5) No auth token returns 401 - DELETE without Authorization header correctly returned 401. Regression tests: GET /lomba (public) returns 200 with array, super_admin login returns 200 with no password/password_plain/token/_id leaks. All authorization rules implemented correctly and working as expected. NO SENSITIVE DATA LEAKS DETECTED. Ready for main agent to summarize and finish."
    -agent: "testing"
    -message: "✅ BUG FIX TESTING COMPLETE - 'Panitia GET /peserta requires status=verified' - ALL TESTS PASSED. Tested the bug fix where unverified peserta were incorrectly appearing in Panitia's akun lomba & Cetak Administrasi. Backend filter for panitia GET /peserta now correctly includes status:'verified' (line 482 in route.js). Test results: (1) Created complete peserta (5 files) with status='pending' -> panitia GET /peserta returned EMPTY array ✅ (unverified peserta correctly hidden). (2) Super admin verified peserta -> panitia GET /peserta returned exactly 1 peserta ✅ (verified peserta now visible). (3) Regression tests PASS: admin_madrasah still sees own peserta regardless of verification status ✅, super_admin sees all peserta ✅. (4) No sensitive data leaks in login responses ✅. The bug fix is working correctly - panitia users now ONLY see verified peserta (complete=true AND status='verified'), which prevents unverified registrations from appearing in their dashboard and print sheets. Ready for main agent to summarize and finish."

    -agent: "main"
    -message: "NEW FEATURE DELTA (continuation). .env was MISSING on start -> restored (MONGO_URL=mongodb://localhost:27017, DB_NAME=porseni_db, NEXT_PUBLIC_BASE_URL preview, CORS=*). node_modules was missing -> yarn install ran. DB empty -> re-seeded super_admin (super@porseni.id/admin123, only account). Please test ONLY backend, high_first, the new task 'Edit biodata peserta (PUT /peserta/:id) — admin_madrasah own-only scoping + super_admin any'. Backend change: PUT /peserta/:id now returns 404 if peserta not found, and admin_madrasah can only edit OWN peserta (created_by check, else 403); super_admin & panitia can edit any (unchanged). Fields accepted: participant_name, gender, nisn, ttl, madrasah_name, lomba_id (recomputes lomba_name), nomor_peserta, files, status; complete recomputed. Steps: (1) super_admin login; POST /lomba A + B (individu). (2) POST /users create admin_madrasah 'MI A' (default pw 12345678) + login; MI A POST /peserta in lomba A -> pesertaA. (3) MI A PUT /peserta/pesertaA {participant_name,gender,nisn,ttl,lomba_id:B} -> 200, verify lomba_name changed to B and fields persisted. (4) POST /users create 'MI B' + login; MI B PUT /peserta/pesertaA -> 403 (not own). (5) super_admin PUT /peserta/pesertaA {madrasah_name,nomor_peserta} -> 200 persisted. (6) PUT /peserta/nonexistent-id -> 404. (7) PUT with no token -> 401. Do NOT test Google integration endpoints."


    -agent: "testing"
    -message: "✅ USER GENDER FIELD BACKEND TESTING COMPLETE - ALL 8 TESTS PASSED. Comprehensive end-to-end testing of user gender field feature for sertifikat/idcard. STEP 1 (Super admin login): super@porseni.id/admin123 login successful (HTTP 200), user object does NOT leak password/password_plain/token/tokens/_id. STEP 2 (Create lomba): POST /lomba created individu lomba 'Test Gender Lomba' successfully. STEP 3 (Create panitia with gender): POST /users (super_admin) created panitia user with gender:'L' and assigned_lomba_id, response includes gender='L', status='verified', password_plain='12345678' (visible to super_admin for account management), and does NOT leak password (hash)/token/tokens/_id. STEP 4 (GET /users shows gender): GET /users (super_admin) returned 2 users, panitia appears with gender='L', no token/tokens/hash/_id leak (password_plain is allowed for super_admin listing). STEP 5 (PUT /users gender='P'): PUT /users/:id {gender:'P'} successful (HTTP 200), GET /users confirms gender='P' persisted correctly. STEP 6 (PUT /users gender=null): PUT /users/:id {gender:null} successful (HTTP 200), GET /users confirms gender=null (cleared successfully). STEP 7 (Regression): (a) POST /auth/register with gender:'L' for admin_madrasah accepted without error, returns {pending:true}. (b) GET /lomba (public, no auth) returns HTTP 200 with array. (c) GET /auth/me with super_admin token returns HTTP 200 with no sensitive leak. STEP 8 (PUT /auth/profile gender): Panitia login successful with default password 12345678, PUT /auth/profile {gender:'L'} successful (HTTP 200), GET /auth/profile confirms gender='L' persisted correctly, no password/token leak in both PUT and GET responses. User gender field working correctly across all endpoints: (1) POST /auth/register accepts optional gender field (L/P/null) without error. (2) POST /users (super_admin) stores gender and returns it in response (with password_plain but no hash/token/_id). (3) PUT /users/:id accepts gender field and persists changes (L, P, or null). (4) PUT /auth/profile accepts gender field for self-service updates by any authenticated user. (5) GET /users (super_admin) returns gender field with no sensitive leaks. (6) GET /auth/profile returns gender field with no sensitive leaks. Gender field is properly integrated into the user model and available for use in panitia certificates & ID cards (Jenis Kelamin: Putra/Putri). NO SENSITIVE DATA LEAKS DETECTED. All backend APIs functioning correctly with proper authentication, authorization, data persistence, and validation. Ready for main agent to summarize and finish."
    -agent: "testing"
    -message: "✅ BACKEND TESTING COMPLETE - 'Edit biodata peserta (PUT /peserta/:id) — admin_madrasah own-only scoping + super_admin any' - ALL 10 TESTS PASSED. Comprehensive end-to-end testing completed successfully. Key findings: (1) Authorization scoping working correctly: admin_madrasah can ONLY edit OWN peserta (created_by check enforced with 403 for non-own), super_admin can edit ANY peserta (200 for all edits). (2) 404 returned BEFORE body parsing when peserta not found (as required). (3) All accepted fields working correctly: participant_name, gender, nisn, ttl, madrasah_name, lomba_id, nomor_peserta, files, status. (4) lomba_name RECOMPUTED correctly when lomba_id changes (verified: changed from 'Test Lomba A' to 'Test Lomba B' when lomba_id updated). (5) complete flag recomputed on update. (6) 401 returned when no Authorization header. (7) No sensitive data leaks detected in any response. All backend APIs functioning correctly with proper authentication, authorization, data persistence, field updates, and validation. Ready for main agent to summarize and finish."
