const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Load API routes dynamically
function loadApiRoutes(dir, basePath = '') {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // Recursively load subdirectories
      loadApiRoutes(fullPath, `${basePath}/${file}`)
    } else if (file.endsWith('.js') && !file.startsWith('_')) {
      // Load .js files that don't start with underscore
      const routePath = `${basePath}/${file.replace('.js', '')}`
      const apiPath = `/api${routePath}`

      try {
        const handler = require(fullPath)

        // Register all HTTP methods
        app.all(apiPath, async (req, res) => {
          try {
            await handler(req, res)
          } catch (error) {
            console.error(`Error in ${apiPath}:`, error)
            res.status(500).json({ error: 'Internal server error' })
          }
        })

        console.log(`Registered: ${apiPath}`)
      } catch (error) {
        console.error(`Failed to load ${fullPath}:`, error.message)
      }
    }
  })
}

// Load all API routes
const apiDir = path.join(__dirname, 'api')
loadApiRoutes(apiDir)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`)
  console.log(`Test login at: http://localhost:${PORT}/api/auth/login`)
})