// Quick Redis connection test script
const redis = require('redis');
require('dotenv').config({ path: '.env.local' });

const REDIS_URI = process.env.REDIS_URI;

if (!REDIS_URI) {
  console.error('REDIS_URI not set in environment variables.');
  process.exit(1);
}

const client = redis.createClient({ url: REDIS_URI });

client.on('error', (err) => {
  console.error('Redis connection error:', err);
  process.exit(1);
});

client.connect()
  .then(() => {
    console.log('Successfully connected to Redis!');
    return client.quit();
  })
  .catch((err) => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  });
