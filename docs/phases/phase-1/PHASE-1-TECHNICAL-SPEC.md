# Phase 1: Core Layout - Technical Specification

**Phase:** Implementation Phase 1
**Date:** 2025-12-03
**Status:** 📝 SPECIFICATION
**Duration:** 3-4 days
**Dependencies:** Phase 1.1.3 (API services, React Query hooks)

---

## 📋 Overview

This document provides the complete technical specification for implementing the admin dashboard core layout. It includes exact component interfaces, PropTypes, state management patterns, and implementation guidelines.

---

## 🎯 Objectives

1. Create reusable `AdminLayout` wrapper component
2. Implement responsive `AdminHeader` with search and profile
3. Build collapsible `AdminSidebar` with navigation
4. Setup nested routing under `/admin`
5. Implement route guards for admin access
6. Ensure responsive design (desktop → tablet → mobile)

---

## 🗂️ File Structure

```
frontend/src/
├── layouts/
│   └── AdminLayout.jsx                 # Main layout wrapper
├── components/
│   └── admin/
│       ├── layout/
│       │   ├── AdminHeader.jsx         # Top navigation bar
│       │   ├── AdminSidebar.jsx        # Side navigation menu
│       │   └── MainContent.jsx         # Content area wrapper
│       └── shared/
│           ├── SearchBar.jsx           # Global search component
│           ├── NotificationButton.jsx  # Notifications dropdown
│           ├── ProfileMenu.jsx         # User profile menu
│           └── ThemeToggle.jsx         # Dark mode toggle
├── pages/
│   └── admin/
│       ├── Dashboard.jsx               # Dashboard page (placeholder)
│       ├── OrdersPage.jsx              # Orders page (placeholder)
│       ├── RestaurantsPage.jsx         # Restaurants page (placeholder)
│       ├── CouriersPage.jsx            # Couriers page (placeholder)
│       └── AnalyticsPage.jsx           # Analytics page (placeholder)
└── hooks/
    └── useAdminLayout.js               # Layout state hook (sidebar collapse)
```

---

## 🧩 Component Specifications

### 1. AdminLayout Component

**File:** `src/layouts/AdminLayout.jsx`

**Purpose:** Main layout wrapper that provides consistent structure for all admin pages.

**Component Interface:**

```javascript
/**
 * AdminLayout Component
 *
 * Provides the main layout structure for admin pages with:
 * - Fixed header at top
 * - Collapsible sidebar on left
 * - Main content area with Outlet for nested routes
 *
 * @component
 */
function AdminLayout() {
  // Implementation
}

export default AdminLayout;
```

**Structure:**

```jsx
<Box sx={{ display: 'flex', minHeight: '100vh' }}>
  <AdminHeader />
  <AdminSidebar />
  <MainContent>
    <Outlet /> {/* React Router outlet for nested routes */}
  </MainContent>
</Box>
```

**State Management:**

```javascript
// Uses custom hook for sidebar state
const { sidebarOpen, toggleSidebar } = useAdminLayout();
```

**Props:** None (uses React Router's Outlet)

**MUI Components Used:**
- `Box` - Container
- No direct styling - delegates to child components

**Responsive Behavior:**
- Desktop (md+): Full sidebar visible
- Tablet (sm-md): Collapsible sidebar
- Mobile (xs): Drawer-based sidebar (hamburger menu)

---

### 2. AdminHeader Component

**File:** `src/components/admin/layout/AdminHeader.jsx`

**Purpose:** Top navigation bar with search, notifications, and profile menu.

**Component Interface:**

```javascript
/**
 * AdminHeader Component
 *
 * Fixed header bar at the top of admin pages.
 *
 * @component
 * @param {Object} props
 * @param {Function} props.onMenuClick - Callback when mobile menu button is clicked
 */
function AdminHeader({ onMenuClick }) {
  // Implementation
}

AdminHeader.propTypes = {
  onMenuClick: PropTypes.func.isRequired,
};

export default AdminHeader;
```

**Structure:**

```jsx
<AppBar
  position="fixed"
  sx={{
    zIndex: (theme) => theme.zIndex.drawer + 1,
    backgroundColor: (theme) => theme.palette.background.paper,
    color: (theme) => theme.palette.text.primary,
    boxShadow: 1,
  }}
>
  <Toolbar>
    {/* Mobile menu button (visible on xs-sm) */}
    <IconButton
      color="inherit"
      edge="start"
      onClick={onMenuClick}
      sx={{ mr: 2, display: { md: 'none' } }}
    >
      <MenuIcon />
    </IconButton>

    {/* Logo */}
    <Typography variant="h6" component="div" sx={{ mr: 4 }}>
      Annos Admin
    </Typography>

    {/* Search bar (hidden on xs) */}
    <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
      <SearchBar />
    </Box>

    {/* Right side actions */}
    <Box sx={{ display: 'flex', gap: 1 }}>
      <ThemeToggle />
      <NotificationButton />
      <ProfileMenu />
    </Box>
  </Toolbar>
</AppBar>
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onMenuClick` | `function` | Yes | - | Called when hamburger menu is clicked (mobile) |

**State:**
- No internal state (stateless component)
- Theme state from Zustand `useUIStore`
- Auth state from Zustand `useAuthStore`

**MUI Components:**
- `AppBar` - Header container
- `Toolbar` - Content wrapper
- `IconButton` - Menu button
- `Typography` - Logo text
- `Box` - Layout containers

**Responsive Behavior:**
- Mobile (xs): Show hamburger menu, hide search
- Tablet (sm): Show search, hide hamburger
- Desktop (md+): Full layout

---

### 3. AdminSidebar Component

**File:** `src/components/admin/layout/AdminSidebar.jsx`

**Purpose:** Side navigation menu with collapsible sections.

**Component Interface:**

```javascript
/**
 * AdminSidebar Component
 *
 * Collapsible sidebar with navigation menu.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.open - Whether sidebar is open
 * @param {Function} props.onClose - Called when sidebar should close (mobile)
 * @param {boolean} props.isMobile - Whether in mobile mode
 */
function AdminSidebar({ open, onClose, isMobile }) {
  // Implementation
}

AdminSidebar.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
};

export default AdminSidebar;
```

**Structure:**

```jsx
{isMobile ? (
  // Mobile: Temporary drawer
  <Drawer
    variant="temporary"
    open={open}
    onClose={onClose}
    ModalProps={{ keepMounted: true }}
    sx={{
      '& .MuiDrawer-paper': {
        width: DRAWER_WIDTH,
      },
    }}
  >
    <SidebarContent />
  </Drawer>
) : (
  // Desktop: Permanent drawer
  <Drawer
    variant="permanent"
    open={open}
    sx={{
      width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
      '& .MuiDrawer-paper': {
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        transition: 'width 0.3s',
      },
    }}
  >
    <SidebarContent />
  </Drawer>
)}
```

**SidebarContent Structure:**

```jsx
function SidebarContent() {
  const location = useLocation();

  return (
    <>
      <Toolbar /> {/* Spacer for header */}

      <List>
        <NavigationItem
          to="/admin/dashboard"
          icon={<DashboardIcon />}
          text="Dashboard"
          active={location.pathname === '/admin/dashboard'}
        />
        <NavigationItem
          to="/admin/orders"
          icon={<ShoppingCartIcon />}
          text="Orders"
          active={location.pathname.startsWith('/admin/orders')}
        />
        <NavigationItem
          to="/admin/restaurants"
          icon={<RestaurantIcon />}
          text="Restaurants"
          active={location.pathname.startsWith('/admin/restaurants')}
        />
        <NavigationItem
          to="/admin/couriers"
          icon={<LocalShippingIcon />}
          text="Couriers"
          active={location.pathname.startsWith('/admin/couriers')}
        />
        <NavigationItem
          to="/admin/analytics"
          icon={<BarChartIcon />}
          text="Analytics"
          active={location.pathname.startsWith('/admin/analytics')}
        />
      </List>

      <Divider />

      {/* Collapse button (desktop only) */}
      {!isMobile && (
        <List>
          <ListItem button onClick={toggleSidebar}>
            <ListItemIcon>
              {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </ListItemIcon>
            {open && <ListItemText primary="Collapse" />}
          </ListItem>
        </List>
      )}
    </>
  );
}
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | Yes | - | Controls sidebar open/closed state |
| `onClose` | `function` | Yes | - | Called when mobile drawer should close |
| `isMobile` | `boolean` | Yes | - | Determines drawer variant (temporary vs permanent) |

**Constants:**

```javascript
const DRAWER_WIDTH = 240;           // Expanded width
const DRAWER_WIDTH_COLLAPSED = 64;  // Collapsed width (icons only)
```

**Navigation Items:**

```javascript
const navigationItems = [
  {
    path: '/admin/dashboard',
    icon: DashboardIcon,
    text: 'Dashboard',
    badge: null, // Optional badge count
  },
  {
    path: '/admin/orders',
    icon: ShoppingCartIcon,
    text: 'Orders',
    badge: 5, // Example: 5 pending orders
  },
  {
    path: '/admin/restaurants',
    icon: RestaurantIcon,
    text: 'Restaurants',
    badge: null,
  },
  {
    path: '/admin/couriers',
    icon: LocalShippingIcon,
    text: 'Couriers',
    badge: null,
  },
  {
    path: '/admin/analytics',
    icon: BarChartIcon,
    text: 'Analytics',
    badge: null,
  },
];
```

**MUI Components:**
- `Drawer` - Sidebar container
- `List` / `ListItem` - Navigation items
- `ListItemIcon` / `ListItemText` - Item content
- `Divider` - Visual separator
- `Badge` - Notification badges

---

### 4. NavigationItem Component

**File:** `src/components/admin/layout/AdminSidebar.jsx` (internal component)

**Purpose:** Individual navigation menu item with active state.

**Component Interface:**

```javascript
/**
 * NavigationItem Component
 *
 * Single navigation item in sidebar.
 *
 * @component
 * @param {Object} props
 * @param {string} props.to - Route path
 * @param {ReactElement} props.icon - Icon component
 * @param {string} props.text - Display text
 * @param {boolean} props.active - Whether this route is active
 * @param {number} [props.badge] - Optional badge count
 */
function NavigationItem({ to, icon, text, active, badge }) {
  const navigate = useNavigate();

  return (
    <ListItem
      button
      onClick={() => navigate(to)}
      selected={active}
      sx={{
        borderLeft: active ? '3px solid' : 'none',
        borderLeftColor: 'primary.main',
        backgroundColor: active ? 'action.selected' : 'transparent',
      }}
    >
      <ListItemIcon>
        <Badge badgeContent={badge} color="error">
          {icon}
        </Badge>
      </ListItemIcon>
      <ListItemText primary={text} />
    </ListItem>
  );
}

NavigationItem.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.element.isRequired,
  text: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  badge: PropTypes.number,
};
```

---

### 5. MainContent Component

**File:** `src/components/admin/layout/MainContent.jsx`

**Purpose:** Content area wrapper with proper spacing for header and sidebar.

**Component Interface:**

```javascript
/**
 * MainContent Component
 *
 * Wraps the main content area with proper padding and spacing.
 *
 * @component
 * @param {Object} props
 * @param {ReactNode} props.children - Page content
 */
function MainContent({ children }) {
  const { sidebarOpen } = useAdminLayout();

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        p: 3,
        mt: 8, // Toolbar height
        ml: {
          xs: 0,
          md: sidebarOpen ? `${DRAWER_WIDTH}px` : `${DRAWER_WIDTH_COLLAPSED}px`,
        },
        transition: 'margin 0.3s',
      }}
    >
      {children}
    </Box>
  );
}

MainContent.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MainContent;
```

---

### 6. SearchBar Component

**File:** `src/components/admin/shared/SearchBar.jsx`

**Purpose:** Global search input with debouncing.

**Component Interface:**

```javascript
/**
 * SearchBar Component
 *
 * Global search input for admin panel.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.placeholder] - Input placeholder
 * @param {Function} [props.onSearch] - Search callback (debounced)
 */
function SearchBar({ placeholder = 'Search...', onSearch }) {
  const [value, setValue] = useState('');

  // Debounce search for 300ms
  const debouncedSearch = useMemo(
    () => debounce((searchTerm) => {
      if (onSearch) {
        onSearch(searchTerm);
      }
    }, 300),
    [onSearch]
  );

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  return (
    <TextField
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      size="small"
      sx={{ width: 300 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
}

SearchBar.propTypes = {
  placeholder: PropTypes.string,
  onSearch: PropTypes.func,
};

export default SearchBar;
```

**Utility Function:**

```javascript
// Helper function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

---

### 7. NotificationButton Component

**File:** `src/components/admin/shared/NotificationButton.jsx`

**Purpose:** Notifications dropdown (placeholder for Phase 1).

**Component Interface:**

```javascript
/**
 * NotificationButton Component
 *
 * Shows notification count and dropdown.
 *
 * @component
 */
function NotificationButton() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications] = useState([]); // TODO: Replace with real data

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={notifications.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Box sx={{ p: 2, minWidth: 300 }}>
          {notifications.length === 0 ? (
            <Typography>No notifications</Typography>
          ) : (
            <List>
              {notifications.map((notification) => (
                <ListItem key={notification.id}>
                  <ListItemText
                    primary={notification.title}
                    secondary={notification.message}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}

export default NotificationButton;
```

---

### 8. ProfileMenu Component

**File:** `src/components/admin/shared/ProfileMenu.jsx`

**Purpose:** User profile dropdown with logout.

**Component Interface:**

```javascript
/**
 * ProfileMenu Component
 *
 * User profile dropdown menu.
 *
 * @component
 */
function ProfileMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Avatar sx={{ width: 32, height: 32 }}>
          {user?.email?.[0]?.toUpperCase() || 'A'}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem disabled>
          <Typography variant="body2">
            {user?.email || 'Admin'}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          navigate('/profil');
          handleClose();
        }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}

export default ProfileMenu;
```

---

### 9. ThemeToggle Component

**File:** `src/components/admin/shared/ThemeToggle.jsx`

**Purpose:** Dark mode toggle button.

**Component Interface:**

```javascript
/**
 * ThemeToggle Component
 *
 * Toggles between light and dark mode.
 *
 * @component
 */
function ThemeToggle() {
  const darkMode = useUIStore((state) => state.darkMode);
  const toggleDarkMode = useUIStore((state) => state.toggleDarkMode);

  return (
    <IconButton color="inherit" onClick={toggleDarkMode}>
      {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
    </IconButton>
  );
}

export default ThemeToggle;
```

---

## 🔗 Routing Configuration

### App.jsx Updates

**File:** `src/App.jsx`

**New Route Structure:**

```javascript
import AdminLayout from './layouts/AdminLayout';
import DashboardPage from './pages/admin/Dashboard';
import OrdersPage from './pages/admin/OrdersPage';
import RestaurantsPage from './pages/admin/RestaurantsPage';
import CouriersPage from './pages/admin/CouriersPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';

// Inside <Routes>
<Route path="/admin" element={<RequireAuth role="admin" />}>
  <Route element={<AdminLayout />}>
    {/* Redirect /admin to /admin/dashboard */}
    <Route index element={<Navigate to="dashboard" replace />} />

    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="orders" element={<OrdersPage />} />
    <Route path="orders/:id" element={<OrderDetailPage />} />
    <Route path="restaurants" element={<RestaurantsPage />} />
    <Route path="restaurants/:slug/edit" element={<RestaurantEditPage />} />
    <Route path="couriers" element={<CouriersPage />} />
    <Route path="analytics" element={<AnalyticsPage />} />
  </Route>
</Route>
```

---

### RequireAuth Component

**File:** `src/components/auth/RequireAuth.jsx`

**Purpose:** Route guard that checks authentication and role.

**Component Interface:**

```javascript
/**
 * RequireAuth Component
 *
 * Route guard that redirects to login if not authenticated
 * or to home if user doesn't have required role.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.role] - Required role (optional)
 */
function RequireAuth({ role }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login, save attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    // User doesn't have required role
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has correct role
  return <Outlet />;
}

RequireAuth.propTypes = {
  role: PropTypes.string,
};

export default RequireAuth;
```

---

## 📦 State Management

### Custom Hook: useAdminLayout

**File:** `src/hooks/useAdminLayout.js`

**Purpose:** Manages sidebar collapse state.

**Hook Interface:**

```javascript
/**
 * useAdminLayout Hook
 *
 * Manages admin layout state (sidebar open/close).
 *
 * @returns {Object} Layout state and actions
 * @returns {boolean} sidebarOpen - Whether sidebar is open
 * @returns {Function} toggleSidebar - Toggle sidebar state
 * @returns {Function} setSidebarOpen - Set sidebar state directly
 */
function useAdminLayout() {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((state) => state.setSidebarCollapsed);

  return {
    sidebarOpen: !sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
    setSidebarOpen: (open) => setSidebarCollapsed(!open),
  };
}

export default useAdminLayout;
```

**Zustand Store Updates:**

No changes needed - `useUIStore` already has `sidebarCollapsed` state from Phase 1.1.3.

---

## 🎨 Styling Guidelines

### MUI sx Prop Pattern

**Consistent Spacing:**
```javascript
sx={{
  p: 3,      // padding: 24px
  m: 2,      // margin: 16px
  mt: 8,     // marginTop: 64px (toolbar height)
}}
```

**Responsive Values:**
```javascript
sx={{
  display: { xs: 'none', md: 'block' },  // Hidden on mobile, visible on desktop
  width: { xs: '100%', sm: 300, md: 400 },
}}
```

**Theme-Based Values:**
```javascript
sx={{
  backgroundColor: (theme) => theme.palette.background.paper,
  color: (theme) => theme.palette.text.primary,
  borderColor: (theme) => theme.palette.divider,
}}
```

### Color Palette

**Light Mode:**
- Background: `#ffffff`
- Paper: `#f5f5f5`
- Text Primary: `#000000`
- Text Secondary: `#666666`

**Dark Mode:**
- Background: `#121212`
- Paper: `#1e1e1e`
- Text Primary: `#ffffff`
- Text Secondary: `#b0b0b0`

---

## 📱 Responsive Breakpoints

### MUI Breakpoints

```javascript
xs: 0px     // Mobile
sm: 600px   // Tablet
md: 960px   // Desktop
lg: 1280px  // Large Desktop
xl: 1920px  // Extra Large
```

### Layout Behavior

**Mobile (xs - 0-599px):**
- Sidebar: Temporary drawer (overlay)
- Header: Hamburger menu visible
- Search: Hidden (can be accessed via button)
- Content: Full width

**Tablet (sm - 600-959px):**
- Sidebar: Temporary drawer
- Header: Full header with search
- Content: Full width

**Desktop (md+ - 960px+):**
- Sidebar: Permanent drawer (collapsible)
- Header: Full header
- Content: Adjusted for sidebar width

---

## 🧪 Testing Strategy

### Unit Tests (Jest + React Testing Library)

**AdminLayout.test.jsx:**
```javascript
describe('AdminLayout', () => {
  it('renders header, sidebar, and content area', () => {
    render(<AdminLayout />);
    expect(screen.getByRole('banner')).toBeInTheDocument(); // Header
    expect(screen.getByRole('navigation')).toBeInTheDocument(); // Sidebar
    expect(screen.getByRole('main')).toBeInTheDocument(); // Content
  });

  it('toggles sidebar on button click', () => {
    render(<AdminLayout />);
    const toggleButton = screen.getByLabelText('Toggle sidebar');
    fireEvent.click(toggleButton);
    // Assert sidebar state changed
  });
});
```

**AdminSidebar.test.jsx:**
```javascript
describe('AdminSidebar', () => {
  it('renders all navigation items', () => {
    render(<AdminSidebar open={true} onClose={jest.fn()} isMobile={false} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Restaurants')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    render(<AdminSidebar open={true} onClose={jest.fn()} isMobile={false} />);
    const dashboardLink = screen.getByText('Dashboard').closest('li');
    expect(dashboardLink).toHaveClass('Mui-selected');
  });
});
```

### Integration Tests

**Routing:**
```javascript
describe('Admin Routing', () => {
  it('redirects /admin to /admin/dashboard', () => {
    render(<App />, { initialRoute: '/admin' });
    expect(window.location.pathname).toBe('/admin/dashboard');
  });

  it('protects admin routes', () => {
    // Simulate logged out user
    render(<App />, { initialRoute: '/admin/dashboard' });
    expect(window.location.pathname).toBe('/login');
  });
});
```

### Manual Testing Checklist

- [ ] Sidebar opens/closes on desktop
- [ ] Hamburger menu works on mobile
- [ ] Navigation items navigate correctly
- [ ] Active route is highlighted
- [ ] Theme toggle works
- [ ] Profile menu dropdown works
- [ ] Responsive design works at all breakpoints
- [ ] Route guards protect admin routes
- [ ] Redirects work correctly

---

## 📊 Performance Considerations

### Code Splitting

```javascript
// Lazy load admin pages
const DashboardPage = lazy(() => import('./pages/admin/Dashboard'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
// ... etc

// Wrap in Suspense
<Suspense fallback={<CircularProgress />}>
  <Outlet />
</Suspense>
```

### Memoization

```javascript
// Memoize navigation items to prevent re-renders
const navigationItems = useMemo(() => [
  { path: '/admin/dashboard', icon: DashboardIcon, text: 'Dashboard' },
  // ... etc
], []);
```

---

## ✅ Definition of Done

Phase 1 is complete when:

- [ ] All components implemented and styled
- [ ] Routing works correctly (nested routes, redirects)
- [ ] Route guards protect admin access
- [ ] Responsive design works on all breakpoints
- [ ] Sidebar collapses/expands smoothly
- [ ] All navigation links work
- [ ] Theme toggle persists across refreshes
- [ ] No console errors or warnings
- [ ] Lint passes with no errors
- [ ] Build succeeds
- [ ] Manual testing checklist complete
- [ ] Code reviewed and approved
- [ ] Documentation updated

---

## 🚀 Implementation Order

### Day 1-2: Core Structure
1. Create `AdminLayout.jsx`
2. Create `AdminHeader.jsx` (basic version)
3. Create `AdminSidebar.jsx` (basic version)
4. Update routing in `App.jsx`
5. Create `RequireAuth` component

### Day 2-3: Header Components
6. Implement `SearchBar.jsx`
7. Implement `NotificationButton.jsx` (placeholder)
8. Implement `ProfileMenu.jsx`
9. Implement `ThemeToggle.jsx`

### Day 3-4: Refinement
10. Add responsive behavior
11. Polish animations and transitions
12. Add unit tests
13. Manual testing
14. Fix bugs and issues

---

## 📝 Code Review Checklist

- [ ] Component props are properly typed (PropTypes)
- [ ] No inline styles (use sx prop or styled components)
- [ ] Consistent naming conventions
- [ ] No hardcoded strings (use constants)
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Mobile-friendly
- [ ] Performance optimized (memo, useMemo, useCallback)
- [ ] Error handling in place
- [ ] Loading states handled
- [ ] Comments for complex logic

---

**Next Steps:** Begin implementation following this spec!

**Document Created:** 2025-12-03
**Last Updated:** 2025-12-03
**Version:** 1.0
