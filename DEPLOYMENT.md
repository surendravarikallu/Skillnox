# Skillnox LAN Deployment Guide

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **For production:**
   ```bash
   npm run build
   npm start
   ```

3. **Access the application:**
   - Local: `http://localhost:3000`
   - LAN: `http://[YOUR_IP]:3000` (IP will be displayed when server starts)

## Configuration

### Port Configuration
- Default port: `3000`
- To change port, set environment variable: `PORT=4000`

### LAN Access
The application is configured to accept connections from:
- Localhost (127.0.0.1)
- LAN IPs in ranges:
  - 192.168.x.x
  - 10.x.x.x
  - 172.16-31.x.x

### Database Setup
Make sure your `.env` file contains:
```
DATABASE_URL="your_database_connection_string"
SESSION_SECRET="your_session_secret"
NODE_ENV="production"
```

## Network Access

### Finding Your IP Address
When you start the server, it will display:
```
🚀 Server running on:
   Local:   http://localhost:3000
   Network: http://192.168.1.100:3000
   Port:    3000
```

### Accessing from Other Devices
Other devices on the same network can access the application using:
`http://[YOUR_IP]:3000`

### Firewall Configuration
Make sure your firewall allows incoming connections on port 3000.

## Production Deployment

For production deployment:

1. Set environment variables:
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export DATABASE_URL="your_production_database_url"
   export SESSION_SECRET="your_secure_session_secret"
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Start the production server:
   ```bash
   npm start
   ```

## Troubleshooting

### CORS Issues
If you encounter CORS issues, check that the client is accessing the correct IP and port.

### Database Connection
Ensure your database is accessible and the DATABASE_URL is correctly set.

### Port Already in Use
If port 3000 is already in use, change it by setting the PORT environment variable.
