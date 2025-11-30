# PHASE 3B.5: Mobile App Integration - User Guide

## Översikt

Mobile App Integration ger realtidsfunktionalitet för mobilappar via WebSocket och push-notifikationer. Systemet är byggt för att fungera både i utvecklingsmiljö (localhost) och i produktion.

**Funktioner:**
- WebSocket real-time kommunikation
- Push-notifikationer (mock i utveckling, FCM/APNs i produktion)
- Live courier tracking
- Order status updates i realtid
- Mobile-specifika API endpoints

**Viktigt:** Systemet fungerar fullt ut på localhost utan extern infrastruktur!

---

## Snabbstart

### 1. Starta servern

```bash
cd /home/macfatty/foodie/Annos/backend
npm start
```

Du ska se:
```
✅ WebSocket server initialized
✅ Push Notification Service initialized (mode: mock)
✅ Real-time Event Service initialized
```

### 2. Verifiera att systemet fungerar

```bash
# Kör testerna
node test-mobile.js
```

Förväntat resultat: **12/12 tester ska passera**

---

## WebSocket Integration

### Ansluta från klient

**URL:** `http://localhost:3001` (eller din serveradress)
**Path:** `/socket.io`
**Auth:** JWT token (cookie eller `auth.token`)

#### JavaScript/TypeScript exempel (Socket.io client)

```javascript
import { io } from 'socket.io-client';

// Hämta token från cookie eller localStorage
const token = getCookie('token') || localStorage.getItem('token');

const socket = io('http://localhost:3001', {
  path: '/socket.io',
  auth: {
    token: token
  },
  transports: ['websocket', 'polling']
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connected', (data) => {
  console.log('User authenticated:', data);
  // { userId, role, timestamp }
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

#### React Native exempel

```javascript
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const connectWebSocket = async () => {
  const token = await AsyncStorage.getItem('authToken');

  const socket = io('http://192.168.1.100:3001', { // Din dator's IP
    path: '/socket.io',
    auth: { token },
    transports: ['websocket']
  });

  return socket;
};
```

---

## WebSocket Events

### Klient -> Server (Emit)

#### Courier: Skicka GPS-position

```javascript
socket.emit('courier:location', {
  latitude: 59.3293,
  longitude: 18.0686,
  accuracy: 10,
  orderId: 123  // Optional: om levererar en specifik order
});
```

#### Courier: Uppdatera status

```javascript
socket.emit('courier:status', {
  status: 'available'  // 'available', 'busy', 'offline'
});
```

#### Customer: Prenumerera på order-uppdateringar

```javascript
socket.emit('order:subscribe', orderId);
```

#### Customer: Avprenumerera från order

```javascript
socket.emit('order:unsubscribe', orderId);
```

#### Ping (hålla anslutningen vid liv)

```javascript
socket.emit('ping');

socket.on('pong', (data) => {
  console.log('Server responded at:', data.timestamp);
});
```

### Server -> Klient (Listen)

#### Order-händelser

```javascript
// Ny order skapad (för couriers och admins)
socket.on('order:new', (order) => {
  console.log('New order available:', order);
});

// Order status ändrad
socket.on('order:status', (event) => {
  console.log('Order status changed:', event);
  // { orderId, oldStatus, newStatus, timestamp, order }
});

// Order tilldelad courier
socket.on('order:assigned', (event) => {
  console.log('Order assigned:', event);
  // { orderId, courierId, timestamp, order }
});
```

#### Delivery tracking (för customers)

```javascript
// Courier location update
socket.on('delivery:location', (location) => {
  console.log('Courier location:', location);
  // { courierId, latitude, longitude, accuracy, timestamp }

  // Uppdatera karta med courier's position
  updateMapMarker(location.latitude, location.longitude);
});
```

#### Courier-händelser (för admins)

```javascript
// Courier location update
socket.on('courier:location:update', (location) => {
  console.log('Courier moved:', location);
});

// Courier status change
socket.on('courier:status:update', (status) => {
  console.log('Courier status:', status);
  // { courierId, status, timestamp }
});
```

#### System-meddelanden

```javascript
// Generell notifikation
socket.on('notification', (notification) => {
  console.log('Notification:', notification);
  showNotification(notification.title, notification.body);
});

// System announcement
socket.on('system:announcement', (announcement) => {
  console.log('System announcement:', announcement);
  // { title, message, severity, timestamp }
});
```

---

## Push Notifications

### Registrera enhet

**Endpoint:** `POST /api/mobile/device/register`

**Request:**
```json
{
  "token": "fcm_device_token_här",
  "platform": "android"
}
```

**Platform:** `"android"` eller `"ios"`

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "platform": "android",
    "registeredAt": "2025-11-30T10:00:00.000Z"
  }
}
```

**cURL exempel:**
```bash
curl -X POST http://localhost:3001/api/mobile/device/register \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "device_token_123",
    "platform": "android"
  }'
```

### Avregistrera enhet

**Endpoint:** `POST /api/mobile/device/unregister`

```bash
curl -X POST http://localhost:3001/api/mobile/device/unregister \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### Utvecklingsläge (Mock)

I utveckling körs push-notifikationer i **mock mode**. Notifikationer loggas till console istället för att skickas till riktiga enheter.

**Exempel output:**
```
📬 MOCK PUSH NOTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: User 1 (android)
Title: 🚚 Order #123
Body: Your order is on the way!
Data: { type: 'order_status', orderId: 123, status: 'in_transit' }
Sent at: 2025-11-30T10:30:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Produktionsläge (FCM/APNs)

För produktion, lägg till i `.env`:

```bash
# Push Notifications
PUSH_MODE=production
FCM_SERVER_KEY=your_fcm_server_key_here  # För Android
APNS_KEY_ID=your_apns_key_id_here        # För iOS
APNS_TEAM_ID=your_team_id_here
APNS_KEY_PATH=/path/to/apns/key.p8
```

---

## Mobile API Endpoints

Alla endpoints kräver autentisering via JWT token.

**Base URL:** `http://localhost:3001/api/mobile`

### WebSocket Info

Hämta information för att ansluta till WebSocket.

**Endpoint:** `GET /api/mobile/websocket/info`

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3001",
    "path": "/socket.io",
    "connected": false,
    "auth": {
      "method": "token",
      "description": "Include JWT token in auth.token or cookie"
    }
  }
}
```

### Order Tracking

Hämta tracking-information för en order.

**Endpoint:** `GET /api/mobile/order/:orderId/tracking`

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 123,
      "status": "in_transit",
      "created_at": "2025-11-30T09:00:00.000Z",
      "updated_at": "2025-11-30T10:00:00.000Z",
      "courier_id": 5,
      "restaurant_slug": "burger-bros",
      "customer_address": "Drottninggatan 10, Stockholm"
    },
    "courierLocation": {
      "courierId": 5,
      "latitude": 59.3293,
      "longitude": 18.0686,
      "accuracy": 10,
      "timestamp": "2025-11-30T10:30:00.000Z"
    },
    "webSocketSubscription": "order:123",
    "tracking": {
      "canTrack": true,
      "status": "in_transit",
      "lastUpdate": "2025-11-30T10:00:00.000Z"
    }
  }
}
```

**Användning:**
```javascript
// Hämta tracking info
const response = await fetch(`http://localhost:3001/api/mobile/order/${orderId}/tracking`, {
  headers: {
    'Cookie': `token=${token}`
  }
});

const { data } = await response.json();

// Anslut WebSocket för live updates
socket.emit('order:subscribe', data.webSocketSubscription);

// Visa courier location på karta
if (data.courierLocation) {
  showCourierOnMap(data.courierLocation.latitude, data.courierLocation.longitude);
}
```

### Courier: Aktiva leveranser

Hämta courier's pågående leveranser (endast för couriers).

**Endpoint:** `GET /api/mobile/courier/deliveries`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "status": "in_transit",
      "customer_name": "Anna Andersson",
      "customer_phone": "0701234567",
      "customer_address": "Drottninggatan 10, Stockholm",
      "items_total": 15000,
      "delivery_fee": 5000,
      "grand_total": 20000
    }
  ],
  "count": 1
}
```

### Courier Location

Hämta en specifik courier's senaste position.

**Endpoint:** `GET /api/mobile/courier/:courierId/location`

**Response:**
```json
{
  "success": true,
  "data": {
    "courierId": 5,
    "latitude": 59.3293,
    "longitude": 18.0686,
    "accuracy": 10,
    "timestamp": "2025-11-30T10:30:00.000Z"
  }
}
```

### All Courier Locations (Admin)

Hämta alla courier's positioner (endast admin).

**Endpoint:** `GET /api/mobile/couriers/locations`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "courierId": 5,
      "latitude": 59.3293,
      "longitude": 18.0686,
      "accuracy": 10,
      "timestamp": "2025-11-30T10:30:00.000Z"
    },
    {
      "courierId": 8,
      "latitude": 59.3345,
      "longitude": 18.0632,
      "accuracy": 15,
      "timestamp": "2025-11-30T10:29:00.000Z"
    }
  ],
  "count": 2
}
```

### Real-time Statistics (Admin)

Hämta statistik om real-time systemet.

**Endpoint:** `GET /api/mobile/stats/realtime`

**Response:**
```json
{
  "success": true,
  "data": {
    "websocket": {
      "connectedUsers": 15,
      "activeCouriers": 7
    },
    "pushNotifications": {
      "registeredDevices": 42,
      "mode": "mock"
    }
  }
}
```

---

## Testing Endpoints

### Skicka test-notifikation

**Endpoint:** `POST /api/mobile/test/notification`

```bash
curl -X POST http://localhost:3001/api/mobile/test/notification \
  -H "Cookie: token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "This is a test",
    "data": { "type": "test" }
  }'
```

### Hämta notifikationshistorik (Admin)

**Endpoint:** `GET /api/mobile/test/notification/history?limit=50`

```bash
curl "http://localhost:3001/api/mobile/test/notification/history?limit=20" \
  -H "Cookie: token=$TOKEN"
```

### Broadcast system announcement (Admin)

**Endpoint:** `POST /api/mobile/announcement`

```bash
curl -X POST http://localhost:3001/api/mobile/announcement \
  -H "Cookie: token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Maintenance",
    "message": "The system will be down for maintenance at 2AM",
    "severity": "warning"
  }'
```

**Severity:** `"info"`, `"warning"`, eller `"critical"`

---

## Komplett Exempel: Customer Order Tracking

### React Native App

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import io from 'socket.io-client';

function OrderTrackingScreen({ orderId, token }) {
  const [order, setOrder] = useState(null);
  const [courierLocation, setCourierLocation] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // 1. Hämta initial tracking info
    fetch(`http://192.168.1.100:3001/api/mobile/order/${orderId}/tracking`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setOrder(data.data.order);
        setCourierLocation(data.data.courierLocation);
      });

    // 2. Anslut WebSocket för live updates
    const newSocket = io('http://192.168.1.100:3001', {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      newSocket.emit('order:subscribe', orderId);
    });

    newSocket.on('order:status', (event) => {
      console.log('Order status updated:', event.newStatus);
      setOrder(prev => ({ ...prev, status: event.newStatus }));
    });

    newSocket.on('delivery:location', (location) => {
      console.log('Courier moved:', location);
      setCourierLocation(location);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.emit('order:unsubscribe', orderId);
        newSocket.disconnect();
      }
    };
  }, [orderId]);

  return (
    <View style={{ flex: 1 }}>
      <Text>Order #{orderId} - {order?.status}</Text>

      {courierLocation && (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: courierLocation.latitude,
            longitude: courierLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
        >
          <Marker
            coordinate={{
              latitude: courierLocation.latitude,
              longitude: courierLocation.longitude
            }}
            title="Din courier"
            description={`Uppdaterad: ${courierLocation.timestamp}`}
          />
        </MapView>
      )}
    </View>
  );
}

export default OrderTrackingScreen;
```

---

## Komplett Exempel: Courier App

### React Native Courier App

```javascript
import React, { useState, useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import io from 'socket.io-client';

function CourierDashboard({ token }) {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('offline');
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [locationInterval, setLocationInterval] = useState(null);

  useEffect(() => {
    // Anslut WebSocket
    const newSocket = io('http://192.168.1.100:3001', {
      auth: { token },
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      console.log('Courier connected');
    });

    newSocket.on('order:assigned', (event) => {
      console.log('New order assigned:', event.orderId);
      loadActiveDeliveries();
    });

    setSocket(newSocket);

    // Hämta aktiva leveranser
    loadActiveDeliveries();

    return () => {
      if (newSocket) newSocket.disconnect();
      if (locationInterval) clearInterval(locationInterval);
    };
  }, []);

  const loadActiveDeliveries = async () => {
    const response = await fetch('http://192.168.1.100:3001/api/mobile/courier/deliveries', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setActiveDeliveries(data.data);
  };

  const startTracking = () => {
    setStatus('available');
    socket.emit('courier:status', { status: 'available' });

    // Skicka position var 10:e sekund
    const interval = setInterval(() => {
      Geolocation.getCurrentPosition(
        (position) => {
          socket.emit('courier:location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            orderId: activeDeliveries[0]?.id  // Om levererar första ordern
          });
        },
        (error) => console.error(error),
        { enableHighAccuracy: true }
      );
    }, 10000);

    setLocationInterval(interval);
  };

  const stopTracking = () => {
    setStatus('offline');
    socket.emit('courier:status', { status: 'offline' });

    if (locationInterval) {
      clearInterval(locationInterval);
      setLocationInterval(null);
    }
  };

  return (
    <View>
      <Text>Status: {status}</Text>
      <Text>Active Deliveries: {activeDeliveries.length}</Text>

      {status === 'offline' ? (
        <Button title="Start Tracking" onPress={startTracking} />
      ) : (
        <Button title="Stop Tracking" onPress={stopTracking} />
      )}

      {activeDeliveries.map(delivery => (
        <View key={delivery.id}>
          <Text>Order #{delivery.id}</Text>
          <Text>{delivery.customer_name}</Text>
          <Text>{delivery.customer_address}</Text>
        </View>
      ))}
    </View>
  );
}

export default CourierDashboard;
```

---

## Utveckling vs Produktion

### Utveckling (Localhost)

**WebSocket URL:** `http://localhost:3001`
**Push Notifications:** Mock mode (loggas till console)
**Ingen SSL krävs:** Fungerar direkt med http://

### Produktion (Live Server)

**WebSocket URL:** `https://your-domain.com` (eller `wss://`)
**Push Notifications:** FCM/APNs (riktiga push)
**SSL krävs:** WebSocket över HTTPS (wss://)

**Miljövariabler för produktion:**
```bash
WEBSOCKET_URL=https://api.annos.se
PUSH_MODE=production
FCM_SERVER_KEY=...
APNS_KEY_ID=...
```

---

## Felsökning

### WebSocket ansluter inte

**Problem:** `Error: Authentication required`

**Lösning:** Verifiera att JWT token är giltig och inkluderad i anslutningen.

```javascript
// Kolla att token finns
console.log('Token:', token);

// Test token
fetch('http://localhost:3001/api/mobile/websocket/info', {
  headers: { 'Cookie': `token=${token}` }
})
  .then(res => res.json())
  .then(console.log);
```

### Push notifications fungerar inte

**Problem:** Notifikationer skickas inte

**Lösning i utveckling:** Kolla console output. I mock mode loggas alla notifikationer.

**Lösning i produktion:** Verifiera FCM/APNs credentials.

### Courier location uppdateras inte

**Problem:** Location events kommer inte fram

**Lösning:**
1. Verifiera att courier är ansluten via WebSocket
2. Kontrollera att courier skickar `courier:location` events
3. Verifiera att customer har prenumererat på ordern (`order:subscribe`)

---

## Testning

### Kör test suite

```bash
node test-mobile.js
```

**Förväntat:** 12/12 tester ska passera

### Manual testing

```bash
# 1. Starta server
npm start

# 2. Öppna två terminaler

# Terminal 1: Simulera courier
node
> const io = require('socket.io-client');
> const socket = io('http://localhost:3001', {
    auth: { token: 'YOUR_COURIER_TOKEN' }
  });
> socket.emit('courier:location', {
    latitude: 59.3293,
    longitude: 18.0686,
    accuracy: 10,
    orderId: 123
  });

# Terminal 2: Simulera customer
node
> const io = require('socket.io-client');
> const socket = io('http://localhost:3001', {
    auth: { token: 'YOUR_CUSTOMER_TOKEN' }
  });
> socket.on('delivery:location', console.log);
> socket.emit('order:subscribe', 123);
```

---

## Nästa Steg

Efter PHASE 3B.5 kan du:

1. **Integrera med mobil app:** Använd exemplen ovan i React Native, Flutter, etc.
2. **Aktivera FCM/APNs:** För riktiga push notifications i produktion
3. **Lägg till geofencing:** Notifiera när courier är nära destination
4. **ETA-beräkning:** Beräkna estimated time of arrival baserat på location
5. **Offline support:** Cachea data för offline användning

---

**Guide skapad:** 2025-11-30
**Version:** 1.0
**Test Status:** 12/12 tester passerade
**För frågor:** Se backend/src/services/ för implementation
