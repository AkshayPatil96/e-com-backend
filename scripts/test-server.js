const { spawn } = require('child_process');

// Set minimal required environment variables
process.env.NODE_ENV = 'development';
process.env.PORT = '5000';
process.env.MONGO_URI = 'mongodb+srv://e-com:e-com123@dev.8udru.mongodb.net/e-com';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.SMTP_HOST = 'smtp.gmail.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SERVICE = 'gmail';
process.env.SMTP_MAIL = 'test@example.com';
process.env.SMTP_PASSWORD = 'test-password';
process.env.FRONTEND_URL = 'http://localhost:3000';

const tsNode = spawn('npx', ['ts-node', 'src/server.ts'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  cwd: process.cwd()
});

tsNode.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

tsNode.on('error', (error) => {
  console.error('Error starting process:', error);
});