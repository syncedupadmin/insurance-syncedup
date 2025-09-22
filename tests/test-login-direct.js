// Test the login handler directly
require('dotenv').config()

const loginHandler = require('./api/auth/login.js')

// Mock request and response objects
const mockReq = {
  method: 'POST',
  body: {
    email: 'agent1@phsagency.com',
    password: 'useh#=1JWNhEYCN^m^L'
  }
}

const mockRes = {
  status: function(code) {
    console.log('Response status:', code)
    return this
  },
  json: function(data) {
    console.log('Response data:', JSON.stringify(data, null, 2))
    return this
  },
  setHeader: function(name, value) {
    console.log('Set header:', name, '=', value)
    return this
  },
  end: function() {
    console.log('Response ended')
    return this
  }
}

// Test the login function
async function testLogin() {
  try {
    console.log('Testing login with:', mockReq.body)
    await loginHandler(mockReq, mockRes)
  } catch (error) {
    console.error('Error during login test:', error)
  }
}

testLogin()