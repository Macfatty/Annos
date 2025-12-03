# Phase 1.1.3: Component Architecture Design

**Date:** 2025-12-02
**Project:** Annos Food Delivery Platform
**Scope:** Frontend Architecture for Phase 1 Admin Dashboard
**Phase:** 1.1.3 - Component Architecture Design

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [State Management Architecture (Zustand)](#2-state-management-architecture-zustand)
3. [Data Fetching Architecture (React Query)](#3-data-fetching-architecture-react-query)
4. [Component Hierarchy](#4-component-hierarchy)
5. [Form Validation Schemas (Zod)](#5-form-validation-schemas-zod)
6. [Routing Architecture](#6-routing-architecture)
7. [File Structure](#7-file-structure)
8. [Implementation Code Examples](#8-implementation-code-examples)

---

## 1. Executive Summary

This document defines the complete frontend architecture for the Phase 1 Admin Dashboard, including state management, data fetching, component structure, and validation patterns.

### Architecture Decisions

| Aspect | Technology | Rationale |
|--------|-----------|-----------|
| **State Management** | Zustand | Lightweight (3KB), simple API, no boilerplate |
| **Server State** | React Query | Automatic caching, refetching, optimistic updates |
| **UI Components** | Material-UI | Production-ready, accessible, comprehensive |
| **Forms** | React Hook Form | Performant, minimal re-renders |
| **Validation** | Zod | Type-safe schemas, runtime validation |
| **Routing** | React Router 7 | Already installed, latest features |

### Key Principles

1. **Separation of Concerns**
   - Server state (React Query) vs Client state (Zustand)
   - Presentation components vs Container components
   - Business logic in custom hooks

2. **Code Reusability**
   - Shared components in `components/common/`
   - Custom hooks in `hooks/`
   - Reusable validation schemas

3. **Type Safety**
   - Zod schemas provide runtime validation
   - Consistent data shapes throughout app

4. **Performance**
   - React Query caching reduces API calls
   - Zustand minimal re-renders
   - Code splitting by route

---

## 2. State Management Architecture (Zustand)

### 2.1 State Categories

**Zustand stores should only manage UI/client state:**
- Authentication state (user, role, permissions)
- UI preferences (dark mode, sidebar collapsed)
- Temporary UI state (selected items, filters)

**Server state is managed by React Query:**
- Orders data
- Restaurants data
- Menu data
- Analytics data

### 2.2 Zustand Stores

#### 2.2.1 Auth Store

**File:** `frontend/src/stores/authStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,

      // Actions
      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),

      // Computed getters
      getRole: () => {
        const state = useAuthStore.getState();
        return state.user?.role || null;
      },

      hasPermission: (permission) => {
        const state = useAuthStore.getState();
        const role = state.user?.role;

        // Admin has all permissions
        if (role === 'admin') return true;

        // Permission mapping
        const rolePermissions = {
          restaurant: ['orders:view', 'menu:edit'],
          courier: ['orders:view', 'courier:view'],
          customer: [],
        };

        return rolePermissions[role]?.includes(permission) || false;
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

**Usage:**
```javascript
import { useAuthStore } from '@/stores/authStore';

function AdminPanel() {
  const { user, isAuthenticated, hasPermission } = useAuthStore();

  if (!hasPermission('admin')) {
    return <AccessDenied />;
  }

  return <div>Welcome, {user.namn}!</div>;
}
```

---

#### 2.2.2 UI Store

**File:** `frontend/src/stores/uiStore.js`

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      // State
      darkMode: false,
      sidebarOpen: true,
      selectedRestaurantSlug: null,
      orderFilters: {
        status: 'all',
        dateFrom: null,
        dateTo: null,
      },

      // Actions
      toggleDarkMode: () =>
        set((state) => ({
          darkMode: !state.darkMode,
        })),

      toggleSidebar: () =>
        set((state) => ({
          sidebarOpen: !state.sidebarOpen,
        })),

      setSelectedRestaurant: (slug) =>
        set({
          selectedRestaurantSlug: slug,
        }),

      setOrderFilters: (filters) =>
        set((state) => ({
          orderFilters: { ...state.orderFilters, ...filters },
        })),

      resetOrderFilters: () =>
        set({
          orderFilters: {
            status: 'all',
            dateFrom: null,
            dateTo: null,
          },
        }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
```

**Usage:**
```javascript
import { useUIStore } from '@/stores/uiStore';

function OrdersPage() {
  const { orderFilters, setOrderFilters } = useUIStore();

  return (
    <div>
      <OrderFilters
        filters={orderFilters}
        onChange={setOrderFilters}
      />
      <OrdersTable filters={orderFilters} />
    </div>
  );
}
```

---

## 3. Data Fetching Architecture (React Query)

### 3.1 Query Client Configuration

**File:** `frontend/src/lib/queryClient.js`

```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch on window focus (default: true)
      refetchOnWindowFocus: true,

      // Retry failed requests (default: 3)
      retry: 1,

      // Cache time (default: 5 minutes)
      gcTime: 5 * 60 * 1000,

      // Stale time (data considered fresh for 1 minute)
      staleTime: 1 * 60 * 1000,

      // Refetch interval for real-time data (orders)
      refetchInterval: false, // Override per query
    },
    mutations: {
      // Retry failed mutations
      retry: 0,

      // Error handling
      onError: (error) => {
        console.error('Mutation error:', error);
        // Could add toast notification here
      },
    },
  },
});
```

**Setup in App:**
```javascript
// frontend/src/main.jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

### 3.2 Query Keys Structure

**File:** `frontend/src/lib/queryKeys.js`

```javascript
/**
 * Centralized query keys for React Query
 * Hierarchical structure enables efficient invalidation
 */
export const queryKeys = {
  // Authentication
  auth: {
    all: ['auth'],
    profile: () => [...queryKeys.auth.all, 'profile'],
  },

  // Orders
  orders: {
    all: ['orders'],
    lists: () => [...queryKeys.orders.all, 'list'],
    list: (filters) => [...queryKeys.orders.lists(), filters],
    details: () => [...queryKeys.orders.all, 'detail'],
    detail: (id) => [...queryKeys.orders.details(), id],
    admin: () => [...queryKeys.orders.lists(), 'admin'],
    restaurant: (slug) => [...queryKeys.orders.lists(), 'restaurant', slug],
  },

  // Restaurants
  restaurants: {
    all: ['restaurants'],
    lists: () => [...queryKeys.restaurants.all, 'list'],
    list: () => [...queryKeys.restaurants.lists()],
    details: () => [...queryKeys.restaurants.all, 'detail'],
    detail: (slug) => [...queryKeys.restaurants.details(), slug],
    menu: (slug) => [...queryKeys.restaurants.detail(slug), 'menu'],
  },

  // Analytics
  analytics: {
    all: ['analytics'],
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'],
    revenue: (params) => [...queryKeys.analytics.all, 'revenue', params],
    leaderboard: (period) => [...queryKeys.analytics.all, 'leaderboard', period],
  },
};
```

**Benefits:**
- Easy to invalidate all orders: `queryClient.invalidateQueries(queryKeys.orders.all)`
- Easy to invalidate specific order: `queryClient.invalidateQueries(queryKeys.orders.detail(123))`
- Type-safe and autocomplete-friendly

---

### 3.3 Custom Hooks for Data Fetching

#### 3.3.1 Orders Hooks

**File:** `frontend/src/hooks/useOrders.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/services/api/orders.api';
import { queryKeys } from '@/lib/queryKeys';
import { useUIStore } from '@/stores/uiStore';

/**
 * Get all orders (admin view)
 */
export function useAdminOrders() {
  return useQuery({
    queryKey: queryKeys.orders.admin(),
    queryFn: () => ordersApi.getAdminOrders().then((res) => res.data),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Get restaurant orders with filters
 */
export function useRestaurantOrders(slug) {
  const { orderFilters } = useUIStore();

  return useQuery({
    queryKey: queryKeys.orders.restaurant(slug),
    queryFn: () =>
      ordersApi
        .getRestaurantOrders(slug, orderFilters.status)
        .then((res) => res.data),
    enabled: !!slug, // Only run if slug exists
    refetchInterval: 30000,
  });
}

/**
 * Get single order by ID
 */
export function useOrder(orderId) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrderById(orderId).then((res) => res.data),
    enabled: !!orderId,
  });
}

/**
 * Update order status mutation
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }) =>
      ordersApi.updateOrderStatus(orderId, status),

    // Optimistic update
    onMutate: async ({ orderId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.all });

      // Snapshot previous value
      const previousOrders = queryClient.getQueryData(queryKeys.orders.admin());

      // Optimistically update to new value
      queryClient.setQueryData(queryKeys.orders.admin(), (old) =>
        old?.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );

      // Return context with snapshot
      return { previousOrders };
    },

    // On error, rollback
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.orders.admin(),
        context.previousOrders
      );
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Mark order as done mutation
 */
export function useMarkOrderDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId) => ordersApi.markOrderAsDone(orderId),
    onSuccess: () => {
      // Invalidate all order queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
```

**Usage in Component:**
```javascript
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/useOrders';

function OrdersTable() {
  const { data: orders, isLoading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = (orderId, newStatus) => {
    updateStatus.mutate(
      { orderId, status: newStatus },
      {
        onSuccess: () => {
          // Show success toast
        },
        onError: (error) => {
          // Show error toast
        },
      }
    );
  };

  if (isLoading) return <CircularProgress />;

  return (
    <DataGrid
      rows={orders}
      columns={[
        // ...
        {
          field: 'status',
          headerName: 'Status',
          renderCell: (params) => (
            <Select
              value={params.row.status}
              onChange={(e) => handleStatusChange(params.row.id, e.target.value)}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="preparing">Preparing</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
            </Select>
          ),
        },
      ]}
    />
  );
}
```

---

#### 3.3.2 Authentication Hooks

**File:** `frontend/src/hooks/useAuth.js`

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api/auth.api';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Login mutation
 */
export function useLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (response) => {
      // Store user in Zustand
      setUser(response.data);

      // Redirect to admin dashboard
      navigate('/admin');
    },
  });
}

/**
 * Logout mutation
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout: logoutStore } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear Zustand store
      logoutStore();

      // Clear all React Query cache
      queryClient.clear();

      // Redirect to login
      navigate('/login');
    },
  });
}

/**
 * Get current user profile
 */
export function useProfile() {
  const { user, isAuthenticated } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isAdmin: user?.role === 'admin',
    isRestaurant: user?.role === 'restaurant',
  };
}
```

**Usage:**
```javascript
import { useLogin } from '@/hooks/useAuth';

function LoginPage() {
  const login = useLogin();

  const handleSubmit = (data) => {
    login.mutate(data, {
      onError: (error) => {
        // Show error toast
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Login form */}
      <Button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

---

## 4. Component Hierarchy

### 4.1 Admin Dashboard Component Tree

```
App
└── Router
    ├── PublicRoutes
    │   ├── LoginPage
    │   ├── StartPage (existing)
    │   └── MenuPage (existing)
    │
    └── ProtectedRoutes (requires authentication)
        └── AdminLayout
            ├── AdminSidebar
            │   ├── Logo
            │   ├── NavigationMenu
            │   │   ├── DashboardLink
            │   │   ├── OrdersLink
            │   │   ├── RestaurantsLink (Phase 2)
            │   │   ├── CouriersLink (Phase 3A)
            │   │   └── AnalyticsLink (Phase 3B)
            │   └── UserProfile
            │       ├── Avatar
            │       ├── UserMenu
            │       └── LogoutButton
            │
            ├── AdminTopBar
            │   ├── BreadcrumbsNavigation
            │   ├── NotificationBell
            │   └── DarkModeToggle
            │
            └── AdminContent (Outlet)
                ├── DashboardPage
                │   ├── StatsCards
                │   │   ├── TodayOrdersCard
                │   │   ├── TodayRevenueCard
                │   │   ├── ActiveCouriersCard
                │   │   └── PendingOrdersCard
                │   ├── RecentOrdersTable
                │   └── QuickActions
                │
                ├── OrdersPage
                │   ├── OrdersFilters
                │   │   ├── RestaurantSelect
                │   │   ├── StatusSelect
                │   │   ├── DateRangePicker
                │   │   └── SearchInput
                │   ├── OrdersTable (MUI DataGrid)
                │   │   ├── OrderRow
                │   │   ├── StatusCell
                │   │   ├── ActionsCell
                │   │   └── Pagination
                │   └── OrderDetailsModal
                │       ├── CustomerInfo
                │       ├── OrderItems
                │       ├── StatusTimeline
                │       └── ActionButtons
                │
                ├── RestaurantsPage (Phase 2)
                ├── CouriersPage (Phase 3A)
                └── AnalyticsPage (Phase 3B)
```

---

### 4.2 Component Specifications

#### 4.2.1 AdminLayout Component

**File:** `frontend/src/components/admin/AdminLayout.jsx`

```javascript
import { Box, CssBaseline, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { useUIStore } from '@/stores/uiStore';

const DRAWER_WIDTH = 240;

export function AdminLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Top Bar */}
      <AdminTopBar drawerWidth={DRAWER_WIDTH} />

      {/* Sidebar */}
      <AdminSidebar
        drawerWidth={DRAWER_WIDTH}
        open={sidebarOpen}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: sidebarOpen ? 0 : `-${DRAWER_WIDTH}px` },
          transition: (theme) =>
            theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        <Toolbar /> {/* Spacer for top bar */}
        <Outlet /> {/* Nested routes render here */}
      </Box>
    </Box>
  );
}
```

---

#### 4.2.2 OrdersTable Component

**File:** `frontend/src/components/admin/orders/OrdersTable.jsx`

```javascript
import { useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Chip, IconButton, MenuItem, Select } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { OrderDetailsModal } from './OrderDetailsModal';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: 'warning',
  preparing: 'info',
  ready: 'primary',
  out_for_delivery: 'secondary',
  delivered: 'success',
  cancelled: 'error',
};

export function OrdersTable() {
  const { data: orders = [], isLoading } = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const columns = [
    {
      field: 'id',
      headerName: 'Order #',
      width: 90,
    },
    {
      field: 'customer_name',
      headerName: 'Customer',
      width: 150,
    },
    {
      field: 'restaurant_slug',
      headerName: 'Restaurant',
      width: 130,
    },
    {
      field: 'total_amount',
      headerName: 'Total',
      width: 100,
      valueFormatter: (value) => `${value} kr`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <Select
          value={params.row.status}
          onChange={(e) =>
            updateStatus.mutate({
              orderId: params.row.id,
              status: e.target.value,
            })
          }
          size="small"
          fullWidth
        >
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="preparing">Preparing</MenuItem>
          <MenuItem value="ready">Ready</MenuItem>
          <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
          <MenuItem value="delivered">Delivered</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Order Time',
      width: 160,
      valueFormatter: (value) =>
        format(new Date(value), 'yyyy-MM-dd HH:mm'),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params) => (
        <IconButton
          onClick={() => setSelectedOrderId(params.row.id)}
          size="small"
        >
          <Visibility />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <DataGrid
        rows={orders}
        columns={columns}
        loading={isLoading}
        pageSize={25}
        rowsPerPageOptions={[25, 50, 100]}
        checkboxSelection
        disableSelectionOnClick
        autoHeight
        sx={{
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
        }}
      />

      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          open={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </>
  );
}
```

---

#### 4.2.3 OrderDetailsModal Component

**File:** `frontend/src/components/admin/orders/OrderDetailsModal.jsx`

```javascript
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { useOrder, useMarkOrderDone } from '@/hooks/useOrders';
import { format } from 'date-fns';

export function OrderDetailsModal({ orderId, open, onClose }) {
  const { data: order, isLoading } = useOrder(orderId);
  const markDone = useMarkOrderDone();

  if (isLoading || !order) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>Loading...</DialogContent>
      </Dialog>
    );
  }

  const handleMarkDone = () => {
    markDone.mutate(orderId, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Order #{order.id}
        <Chip
          label={order.status}
          color={STATUS_COLORS[order.status]}
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>

      <DialogContent dividers>
        {/* Customer Information */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Customer Information
          </Typography>
          <Typography>Name: {order.customer_name}</Typography>
          <Typography>Email: {order.customer_email}</Typography>
          <Typography>Phone: {order.customer_phone}</Typography>
          <Typography>Address: {order.delivery_address}</Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Order Items */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Order Items
          </Typography>
          <List dense>
            {order.items?.map((item, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${item.quantity}x ${item.name}`}
                  secondary={`${item.price} kr`}
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="h6" align="right">
            Total: {order.total_amount} kr
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Order Timeline */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Order Timeline
          </Typography>
          <Typography variant="body2">
            Created: {format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss')}
          </Typography>
          <Typography variant="body2">
            Updated: {format(new Date(order.updated_at), 'yyyy-MM-dd HH:mm:ss')}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {order.status !== 'delivered' && (
          <Button
            onClick={handleMarkDone}
            variant="contained"
            color="success"
            disabled={markDone.isPending}
          >
            Mark as Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
```

---

## 5. Form Validation Schemas (Zod)

### 5.1 Login Form Schema

**File:** `frontend/src/schemas/authSchemas.js`

```javascript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),

  losenord: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

**Usage with React Hook Form:**
```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/schemas/authSchemas';

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => {
    // data is validated and typed!
    console.log(data); // { email: string, losenord: string }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextField
        {...register('email')}
        label="Email"
        error={!!errors.email}
        helperText={errors.email?.message}
      />
      <TextField
        {...register('losenord')}
        label="Password"
        type="password"
        error={!!errors.losenord}
        helperText={errors.losenord?.message}
      />
      <Button type="submit">Login</Button>
    </form>
  );
}
```

---

### 5.2 Order Status Update Schema

**File:** `frontend/src/schemas/orderSchemas.js`

```javascript
import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'pending',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

export const updateOrderStatusSchema = z.object({
  orderId: z.number().int().positive(),
  status: orderStatusSchema,
});
```

---

### 5.3 Restaurant Form Schema (Phase 2)

**File:** `frontend/src/schemas/restaurantSchemas.js`

```javascript
import { z } from 'zod';

export const restaurantSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),

  name: z
    .string()
    .min(2, 'Restaurant name is required')
    .max(100, 'Name too long'),

  description: z
    .string()
    .max(500, 'Description too long')
    .optional(),

  address: z.string().min(5, 'Address is required'),

  phone: z
    .string()
    .regex(/^[0-9\-\s+]+$/, 'Invalid phone number format'),

  email: z
    .string()
    .email('Invalid email')
    .optional(),

  delivery_fee: z
    .number()
    .min(0, 'Delivery fee must be positive')
    .max(200, 'Delivery fee too high'),

  min_order: z
    .number()
    .min(0, 'Minimum order must be positive')
    .max(1000, 'Minimum order too high'),

  opening_hours: z.record(z.string()).optional(),
});
```

---

## 6. Routing Architecture

### 6.1 Route Configuration

**File:** `frontend/src/routes/index.jsx`

```javascript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { OrdersPage } from '@/pages/admin/OrdersPage';
import { StartPage } from '@/pages/Start'; // Existing
import { MenuPage } from '@/pages/Menu'; // Existing

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <StartPage />,
  },
  {
    path: '/menu/:slug',
    element: <MenuPage />,
  },

  // Protected admin routes
  {
    path: '/admin',
    element: (
      <ProtectedRoute requireAny={['admin']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      // Phase 2
      {
        path: 'restaurants',
        element: <div>Restaurants (Phase 2)</div>,
      },
      // Phase 3A
      {
        path: 'couriers',
        element: <div>Couriers (Phase 3A)</div>,
      },
      // Phase 3B
      {
        path: 'analytics',
        element: <div>Analytics (Phase 3B)</div>,
      },
    ],
  },

  // 404
  {
    path: '*',
    element: <div>404 Not Found</div>,
  },
]);
```

**Setup in App:**
```javascript
// frontend/src/App.jsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
```

---

## 7. File Structure

```
frontend/src/
├── main.jsx                    # Entry point
├── App.jsx                     # Root component
│
├── components/
│   ├── common/                 # Shared components
│   │   ├── ProtectedRoute.jsx  # Existing
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorBoundary.jsx
│   │   └── NotFound.jsx
│   │
│   └── admin/                  # Admin-specific components
│       ├── AdminLayout.jsx
│       ├── AdminSidebar.jsx
│       ├── AdminTopBar.jsx
│       │
│       ├── orders/
│       │   ├── OrdersTable.jsx
│       │   ├── OrdersFilters.jsx
│       │   ├── OrderDetailsModal.jsx
│       │   └── OrderStatusSelect.jsx
│       │
│       ├── dashboard/
│       │   ├── StatsCard.jsx
│       │   ├── RecentOrdersTable.jsx
│       │   └── QuickActions.jsx
│       │
│       └── restaurants/        # Phase 2
│           ├── RestaurantsTable.jsx
│           └── RestaurantForm.jsx
│
├── pages/
│   ├── LoginPage.jsx           # New
│   ├── Start.jsx               # Existing
│   ├── Menu.jsx                # Existing
│   │
│   └── admin/
│       ├── DashboardPage.jsx
│       ├── OrdersPage.jsx
│       ├── RestaurantsPage.jsx  # Phase 2
│       ├── CouriersPage.jsx     # Phase 3A
│       └── AnalyticsPage.jsx    # Phase 3B
│
├── hooks/
│   ├── useAuth.js              # Authentication hooks
│   ├── useOrders.js            # Orders data hooks
│   ├── useRestaurants.js       # Restaurants data hooks (Phase 2)
│   └── useCouriers.js          # Couriers data hooks (Phase 3A)
│
├── stores/
│   ├── authStore.js            # Zustand auth store
│   └── uiStore.js              # Zustand UI store
│
├── services/
│   └── api/
│       ├── client.js           # Axios instance
│       ├── auth.api.js         # Auth endpoints
│       ├── orders.api.js       # Orders endpoints
│       ├── restaurants.api.js  # Restaurants endpoints
│       ├── menu.api.js         # Menu endpoints
│       ├── couriers.api.js     # Couriers endpoints (Phase 3A)
│       └── analytics.api.js    # Analytics endpoints (Phase 3B)
│
├── schemas/
│   ├── authSchemas.js          # Zod validation schemas
│   ├── orderSchemas.js
│   └── restaurantSchemas.js    # Phase 2
│
├── lib/
│   ├── queryClient.js          # React Query config
│   └── queryKeys.js            # Query keys structure
│
├── theme/
│   └── theme.js                # MUI theme config (created)
│
├── styles/
│   ├── index.css               # Global styles (existing)
│   └── App.css                 # Component styles (existing)
│
├── utils/
│   ├── formatters.js           # Date, currency formatters
│   └── validators.js           # Custom validators
│
└── routes/
    └── index.jsx               # Router configuration
```

---

## 8. Implementation Code Examples

### 8.1 Complete Login Page

**File:** `frontend/src/pages/LoginPage.jsx`

```javascript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { useLogin } from '@/hooks/useAuth';
import { loginSchema } from '@/schemas/authSchemas';

export function LoginPage() {
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      losenord: '',
    },
  });

  const onSubmit = (data) => {
    login.mutate(data);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom>
          Annos Admin
        </Typography>

        <Card sx={{ mt: 3, width: '100%' }}>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                {...register('email')}
                margin="normal"
                fullWidth
                label="Email Address"
                autoComplete="email"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <TextField
                {...register('losenord')}
                margin="normal"
                fullWidth
                label="Password"
                type="password"
                autoComplete="current-password"
                error={!!errors.losenord}
                helperText={errors.losenord?.message}
              />

              {login.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {login.error?.response?.data?.error || 'Login failed'}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={login.isPending}
              >
                {login.isPending ? 'Logging in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
```

---

### 8.2 Complete Orders Page

**File:** `frontend/src/pages/admin/OrdersPage.jsx`

```javascript
import { Box, Paper, Typography } from '@mui/material';
import { OrdersFilters } from '@/components/admin/orders/OrdersFilters';
import { OrdersTable } from '@/components/admin/orders/OrdersTable';

export function OrdersPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Orders Management
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <OrdersFilters />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <OrdersTable />
      </Paper>
    </Box>
  );
}
```

---

### 8.3 Orders Filters Component

**File:** `frontend/src/components/admin/orders/OrdersFilters.jsx`

```javascript
import { Box, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useUIStore } from '@/stores/uiStore';

export function OrdersFilters() {
  const { orderFilters, setOrderFilters, resetOrderFilters } = useUIStore();

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={orderFilters.status}
          label="Status"
          onChange={(e) => setOrderFilters({ status: e.target.value })}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="preparing">Preparing</MenuItem>
          <MenuItem value="ready">Ready</MenuItem>
          <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
          <MenuItem value="delivered">Delivered</MenuItem>
          <MenuItem value="cancelled">Cancelled</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Date From"
        type="date"
        value={orderFilters.dateFrom || ''}
        onChange={(e) => setOrderFilters({ dateFrom: e.target.value })}
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Date To"
        type="date"
        value={orderFilters.dateTo || ''}
        onChange={(e) => setOrderFilters({ dateTo: e.target.value })}
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );
}
```

---

## 9. Next Steps

### Phase 1.1.4: Wireframes & UI Mockups
- Create ASCII wireframes for admin dashboard
- Define exact layout and spacing
- Plan responsive breakpoints

### Phase 1.1.5: Design Review & Approval
- Review all architecture decisions
- Get approval to proceed with implementation

### Phase 1.2: Development Environment Setup
- Create API service layer files
- Setup React Query provider
- Setup MUI ThemeProvider
- Create initial Zustand stores

### Phase 1.3: Core Components Implementation
- Implement login page
- Implement admin layout
- Implement orders table
- Implement order details modal

---

**Component Architecture Design Completed By:** Claude (AI Assistant)
**Date:** 2025-12-02
**Status:** ✅ Architecture defined and documented
**Next Phase:** 1.1.4 - Wireframes & UI Mockups
