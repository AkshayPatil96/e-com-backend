/**
 * Test script to demonstrate the new date-based logging structure
 */

const { loggerHelpers } = require('../dist/utils/logger');
const { logManager } = require('../dist/utils/logManagement');

async function testDateBasedLogging() {
  console.log('🧪 Testing date-based logging structure...\n');

  // Generate some test logs
  loggerHelpers.business('user_login', { 
    userId: 'test123', 
    email: 'test@example.com' 
  });
  
  loggerHelpers.security('suspicious_activity', 'MEDIUM', { 
    ip: '192.168.1.1', 
    userId: 'test123' 
  });
  
  loggerHelpers.performance('database_query', 750, { 
    query: 'SELECT * FROM users', 
    table: 'users' 
  });
  
  loggerHelpers.auth('login_success', 'test123', { 
    ip: '192.168.1.1' 
  });

  console.log('✅ Test logs generated');
  console.log('📁 Check the logs/ directory for today\'s date folder');
  console.log('🗂️  Inside you\'ll find: business.log, security.log, performance.log, etc.\n');

  // Wait a moment for logs to be written
  setTimeout(async () => {
    console.log('📊 Generating log management report...\n');
    try {
      const report = await logManager.generateReport();
      console.log(report);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  }, 1000);
}

testDateBasedLogging();