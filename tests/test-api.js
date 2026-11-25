import { readFile } from 'fs/promises';

const BASE_URL = 'http://127.0.0.1:3000/api/mgr/v1';

let adminToken = '';
let userToken = '';
let testUserId = null;
const uniqueId = Date.now();
const testUsername = `testuser${uniqueId}`;
const testEmail = `testuser${uniqueId}@example.com`;

// 辅助函数
async function request(method, path, body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

// 测试套件
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║          jitsi-mgr API Integration Tests              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 1. 管理员登录
    console.log('📝 Test 1: Admin Login');
    const loginRes = await request('POST', '/auth/login', {
      username: 'admin',
      password: 'Admin123!',
      deviceType: 'test'
    });
    if (loginRes.status === 200) {
      adminToken = loginRes.data.data.token;
      console.log('✅ Admin login successful');
      console.log(`   Token: ${adminToken.substring(0, 30)}...`);
    } else {
      console.log('❌ Admin login failed');
      return;
    }

    // 2. 用户注册
    console.log('\n📝 Test 2: User Registration');
    const regRes = await request('POST', '/auth/register', {
      username: testUsername,
      password: 'Test123!',
      email: testEmail,
      phone: '13800138123',
      displayName: '测试用户',
      reason: '自动化测试注册'
    });
    if (regRes.status === 201) {
      testUserId = regRes.data.data.userId;
      console.log('✅ User registration successful');
      console.log(`   Username: ${testUsername}`);
      console.log(`   User ID: ${testUserId}`);
      console.log(`   Status: ${regRes.data.data.status}`);
    } else {
      console.log('❌ User registration failed');
      console.log(`   Error: ${JSON.stringify(regRes.data)}`);
    }

    // 3. 获取待审核的注册申请
    console.log('\n📝 Test 3: Get Pending Registrations (Admin)');
    const registrationsRes = await request('GET', '/admin/registrations?status=pending', null, adminToken);
    let registrationId = null;
    if (registrationsRes.status === 200) {
      console.log('✅ Get registrations successful');
      console.log(`   Found ${registrationsRes.data.data.length} pending registrations`);
      console.log(`   Total: ${registrationsRes.data.pagination.total}`);
      
      // 找到我们刚注册的用户的申请
      const ourRegistration = registrationsRes.data.data.find(r => r.user_id === testUserId);
      if (ourRegistration) {
        registrationId = ourRegistration.id;
        console.log(`   Our registration ID: ${registrationId}`);
      }
    } else {
      console.log('❌ Get registrations failed');
    }

    // 4. 查看注册申请详情
    if (registrationId) {
      console.log('\n📝 Test 4: Get Registration Details (Admin)');
      const regDetailRes = await request('GET', `/admin/registrations/${registrationId}`, null, adminToken);
      if (regDetailRes.status === 200) {
        console.log('✅ Get registration details successful');
        console.log(`   Username: ${regDetailRes.data.data.username}`);
        console.log(`   Display Name: ${regDetailRes.data.data.display_name}`);
        console.log(`   Reason: ${regDetailRes.data.data.reason}`);
      } else {
        console.log('❌ Get registration details failed');
      }
    }

    // 5. 批准注册
    if (registrationId) {
      console.log('\n📝 Test 5: Approve Registration (Admin)');
      const approveRes = await request('POST', `/admin/registrations/${registrationId}/approve`, {
        comment: '自动化测试批准'
      }, adminToken);
      if (approveRes.status === 200) {
        console.log('✅ Approve registration successful');
        console.log(`   Message: ${approveRes.data.data.message}`);
      } else {
        console.log('❌ Approve registration failed');
        console.log(`   Error: ${JSON.stringify(approveRes.data)}`);
      }
    }

    // 6. 新用户登录
    console.log('\n📝 Test 6: User Login (After Approval)');
    const userLoginRes = await request('POST', '/auth/login', {
      username: testUsername,
      password: 'Test123!',
      deviceType: 'test'
    });
    if (userLoginRes.status === 200) {
      userToken = userLoginRes.data.data.token;
      console.log('✅ User login successful');
      console.log(`   Username: ${userLoginRes.data.data.user.username}`);
      console.log(`   Role: ${userLoginRes.data.data.user.role}`);
    } else {
      console.log('❌ User login failed');
    }

    // 7. 获取当前用户信息
    console.log('\n📝 Test 7: Get Current User Info');
    const meRes = await request('GET', '/users/me', null, userToken);
    if (meRes.status === 200) {
      console.log('✅ Get current user successful');
      console.log(`   Username: ${meRes.data.data.username}`);
      console.log(`   Email: ${meRes.data.data.email}`);
      console.log(`   Status: ${meRes.data.data.status}`);
    } else {
      console.log('❌ Get current user failed');
    }

    // 8. 更新用户信息
    console.log('\n📝 Test 8: Update User Info');
    const updateRes = await request('PUT', '/users/me', {
      displayName: '测试用户123（已更新）',
      phone: '13900139000'
    }, userToken);
    if (updateRes.status === 200) {
      console.log('✅ Update user info successful');
      console.log(`   New display name: ${updateRes.data.data.display_name}`);
      console.log(`   New phone: ${updateRes.data.data.phone}`);
    } else {
      console.log('❌ Update user info failed');
    }

    // 9. 获取用户会话列表
    console.log('\n📝 Test 9: Get User Sessions');
    const sessionsRes = await request('GET', '/users/me/sessions', null, userToken);
    if (sessionsRes.status === 200) {
      console.log('✅ Get sessions successful');
      console.log(`   Active sessions: ${sessionsRes.data.data.length}`);
    } else {
      console.log('❌ Get sessions failed');
    }

    // 10. 管理员查看用户列表
    console.log('\n📝 Test 10: Get Users List (Admin)');
    const usersRes = await request('GET', '/admin/users?status=approved', null, adminToken);
    if (usersRes.status === 200) {
      console.log('✅ Get users list successful');
      console.log(`   Found ${usersRes.data.data.length} approved users`);
      console.log(`   Total: ${usersRes.data.pagination.total}`);
    } else {
      console.log('❌ Get users list failed');
    }

    // 11. 管理员查看用户详情
    if (testUserId) {
      console.log('\n📝 Test 11: Get User Details (Admin)');
      const userDetailRes = await request('GET', `/admin/users/${testUserId}`, null, adminToken);
      if (userDetailRes.status === 200) {
        console.log('✅ Get user details successful');
        console.log(`   Username: ${userDetailRes.data.data.username}`);
        console.log(`   Status: ${userDetailRes.data.data.status}`);
        console.log(`   Active sessions: ${userDetailRes.data.data.activeSessions}`);
      } else {
        console.log('❌ Get user details failed');
      }
    }

    // 12. 查看审计日志
    console.log('\n📝 Test 12: Get Audit Logs (Admin)');
    const auditRes = await request('GET', '/admin/audit-logs?limit=5', null, adminToken);
    if (auditRes.status === 200) {
      console.log('✅ Get audit logs successful');
      console.log(`   Recent logs: ${auditRes.data.data.length}`);
      console.log(`   Total: ${auditRes.data.pagination.total}`);
      if (auditRes.data.data.length > 0) {
        console.log(`   Latest action: ${auditRes.data.data[0].action}`);
      }
    } else {
      console.log('❌ Get audit logs failed');
    }

    // 13. 修改密码
    console.log('\n📝 Test 13: Change Password');
    const changePwdRes = await request('POST', '/users/me/change-password', {
      oldPassword: 'Test123!',
      newPassword: 'NewTest123!'
    }, userToken);
    if (changePwdRes.status === 200) {
      console.log('✅ Change password successful');
    } else {
      console.log('❌ Change password failed');
    }

    // 14. 用新密码登录
    console.log('\n📝 Test 14: Login with New Password');
    const newLoginRes = await request('POST', '/auth/login', {
      username: testUsername,
      password: 'NewTest123!',
      deviceType: 'test'
    });
    if (newLoginRes.status === 200) {
      console.log('✅ Login with new password successful');
    } else {
      console.log('❌ Login with new password failed');
    }

    // 15. 获取 JWKS（供 Prosody 使用）
    console.log('\n📝 Test 15: Get JWKS (for Prosody)');
    const jwksRes = await request('GET', '/auth/jwks');
    if (jwksRes.status === 200) {
      console.log('✅ Get JWKS successful');
      console.log(`   Keys available: ${jwksRes.data.keys.length}`);
      console.log(`   Key ID: ${jwksRes.data.keys[0].kid}`);
      console.log(`   Algorithm: ${jwksRes.data.keys[0].alg}`);
    } else {
      console.log('❌ Get JWKS failed');
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              All Tests Completed! ✅                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n❌ Test suite failed:', err.message);
  }
}

// 运行测试
runTests();
