// netlify/functions/login.js
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed. Use POST.' 
      })
    };
  }

  try {
    // Parse request body
    const { username, password } = JSON.parse(event.body || '{}');

    // Validate input
    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Username and password are required.' 
        })
      };
    }

    // Demo credentials - ganti dengan database real
    const validCredentials = [
      { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
      { username: 'user', password: 'user123', role: 'user', name: 'Regular User' },
      { username: 'demo', password: 'demo123', role: 'demo', name: 'Demo User' },
      { username: 'kasir', password: 'kasir123', role: 'kasir', name: 'Kasir' },
      { username: 'admin1', password: 'admin123', role: 'admin1', name: 'Admin Pembelian' }
    ];

    // Check credentials
    const user = validCredentials.find(
      u => u.username === username && u.password === password
    );

    if (user) {
      // Generate simple JWT-like token
      const token = Buffer.from(JSON.stringify({
        username: user.username,
        role: user.role,
        name: user.name,
        loginTime: new Date().toISOString(),
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      })).toString('base64');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Login successful',
          token: token,
          user: {
            username: user.username,
            role: user.role,
            name: user.name
          }
        })
      };
    } else {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid username or password.' 
        })
      };
    }

  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error. Please try again.' 
      })
    };
  }
};