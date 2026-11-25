import { readFile } from 'fs/promises';
import { resolve } from 'path';
import authService from '../src/services/authService.js';
import db from '../src/config/database.js';

async function createAdmin() {
  try {
    console.log('Creating admin user...');

    // 解析命令行参数
    const args = process.argv.slice(2);
    let username = process.env.ADMIN_USERNAME || 'admin';
    let password = process.env.ADMIN_PASSWORD;
    let email = process.env.ADMIN_EMAIL || 'admin@example.com';

    // 解析 --username, --password, --email
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--username' && args[i + 1]) {
        username = args[i + 1];
        i++;
      } else if (args[i] === '--password' && args[i + 1]) {
        password = args[i + 1];
        i++;
      } else if (args[i] === '--email' && args[i + 1]) {
        email = args[i + 1];
        i++;
      }
    }

    if (!password) {
      console.error('Error: Password is required');
      console.log('Usage: npm run admin:create -- --username admin --password yourpassword --email admin@example.com');
      process.exit(1);
    }

    // 连接数据库
    await db.connect();

    // 检查管理员是否已存在
    const existingAdmin = await db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingAdmin) {
      console.log(`Admin user "${username}" already exists`);
      await db.close();
      process.exit(0);
    }

    // 加载 JWT 密钥（用于初始化 authService）
    await authService.initialize();

    // 哈希密码
    const passwordHash = await authService.hashPassword(password);

    // 创建管理员用户
    const result = await db.run(
      `INSERT INTO users (username, password_hash, email, display_name, status, role, created_at, updated_at, approved_at)
       VALUES (?, ?, ?, ?, 'approved', 'admin', datetime('now'), datetime('now'), datetime('now'))`,
      [username, passwordHash, email, 'Administrator']
    );

    console.log('✓ Admin user created successfully');
    console.log(`  Username: ${username}`);
    console.log(`  Email:    ${email}`);
    console.log(`  Role:     admin`);
    console.log(`  User ID:  ${result.lastID}`);

    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin user:', err);
    await db.close();
    process.exit(1);
  }
}

createAdmin();
