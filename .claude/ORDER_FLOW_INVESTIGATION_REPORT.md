# Order Flow Investigation Report

**Datum:** 2025-11-23
**Status:** ✅ ROOT CAUSE IDENTIFIERAD
**Investigator:** Claude Code Analysis

---

## Executive Summary

En kritisk bug har identifierats som blockerar hela order flow-funktionaliteten. Buggen orsakas av **status mismatch** mellan frontend och backend, där frontend försöker sätta status "accepted" men backend endast accepterar en helt annan uppsättning status-värden.

**Impact:** 🔴 CRITICAL
- Admin kan INTE acceptera orders
- Hela order workflow är blockerad
- Kunder kan beställa men orders fastnar i "received" status

**Root Cause:** Status enum inkonsekvens mellan 3 olika kod-delar
**Recommended Action:** Implementera Phase 0 i TODO-listan (6 tasks, 2-4 hours)

---

## 1. Problem Statement

### Vad Användaren Rapporterade

**User Flow som fungerar:**
1. ✅ Logga in som admin
2. ✅ Navigera till "Välj restaurang"
3. ✅ Välja restaurang (Campino)
4. ✅ Välja tillbehör
5. ✅ Lägga beställning
6. ✅ Se tacksida
7. ✅ Navigera till adminpanelen
8. ✅ Se restaurangsidan
9. ✅ Se ordern i Campino

**Vad som INTE fungerar:**
10. ❌ Trycka "Acceptera order" - **Här blir det stopp!**

---

## 2. Investigation Process

### 2.1 Kod-analys

**Files Analyzed:**
1. `frontend/src/pages/restaurant/RestaurangVy.jsx` - Restaurang UI
2. `frontend/src/services/orders/orderService.js` - API client
3. `backend/src/routes/orders.js` - Route definitions
4. `backend/src/controllers/orderController.js` - Request handler
5. `backend/src/services/orderService.js` - Business logic
6. `backend/src/middleware/authMiddleware.js` - Status transitions

### 2.2 Request Flow Trace

```
User clicks "Acceptera order"
  ↓
RestaurangVy.jsx: handleUpdateOrderStatus(orderId, "accepted")
  ↓
orderService.js: updateAdminOrderStatus(orderId, "accepted")
  ↓
API Request: PATCH /api/order/:orderId/status
              Body: { status: "accepted" }
  ↓
Backend Route: /api/order/:orderId/status
  ↓
OrderController.updateOrderStatus()
  ↓
OrderService.updateOrderStatus(orderId, "accepted", userId)
  ↓
Validation: if (!validStatuses.includes("accepted"))
  ↓
❌ ERROR: "accepted" NOT IN validStatuses
  ↓
throw new Error('Invalid status')
```

---

## 3. Root Cause Analysis

### 3.1 The Status Mismatch

**Three Different Status Systems:**

#### System 1: Frontend (RestaurangVy.jsx, rad 48-82)
```javascript
"received" → "accepted" → "in_progress" → "out_for_delivery" → "delivered"
```

#### System 2: Backend Service (orderService.js, rad 287)
```javascript
validStatuses = [
  'received',
  'preparing',   // ⚠️ Frontend använder INTE denna
  'ready',       // ⚠️ Frontend använder INTE denna
  'assigned',    // ⚠️ Frontend använder INTE denna
  'delivered',
  'cancelled'
]
```

#### System 3: Middleware (authMiddleware.js, rad 33-39)
```javascript
validTransitions = {
  'received': ['accepted'],           // ✅ Samma som frontend
  'accepted': ['in_progress'],        // ✅ Samma som frontend
  'in_progress': ['out_for_delivery'], // ✅ Samma som frontend
  'out_for_delivery': ['delivered'],  // ✅ Samma som frontend
  'delivered': []
}
```

**Konflikt:**
- Frontend + Middleware använder: `accepted`, `in_progress`, `out_for_delivery`
- Backend Service använder: `preparing`, `ready`, `assigned`
- **INGEN OVERLAP** mellan systemen!

---

### 3.2 Varför Detta Händer

**Historia (antagande):**

1. **Ursprunglig implementation:** Backend hade `preparing`, `ready`, `assigned`
2. **Ny implementation:** Middleware och frontend skapades med `accepted`, `in_progress`, `out_for_delivery`
3. **Syncing missade:** OrderService.js uppdaterades aldrig för att matcha nya statuser
4. **Result:** Total mismatch → acceptera-knappen fungerar inte

**Evidence:**
- Middleware har kommentar "Statusmaskin för ordrar" → Planerad feature
- Frontend använder samma statuser som middleware → Implementerad enligt plan
- OrderService har gamla statuser → Glömdes att uppdatera

---

### 3.3 Secondary Issue: User ID Field

**Problem:**
```javascript
// orderController.js, rad 136
const userId = req.user?.id;  // ⚠️ Kan vara undefined
```

**Why it's wrong:**
- JWT payload har `userId` field (vi fixade detta tidigare)
- Backward compatibility middleware sätter både `userId` och `id`
- Men vi borde använda: `req.user?.userId || req.user?.id`

**Impact:** MEDIUM (fungerar via backward compat, men är inte robust)

---

## 4. Impact Assessment

### 4.1 Affected Features

| Feature | Status | Impact |
|---------|--------|--------|
| Place order (customer) | ✅ Works | None |
| View orders (admin) | ✅ Works | None |
| **Accept order (admin)** | ❌ **BROKEN** | **CRITICAL** |
| Update status (restaurant) | ❌ **BROKEN** | **CRITICAL** |
| Courier workflow | ❌ **BLOCKED** | **HIGH** (can't start if orders not accepted) |
| Customer tracking | ⚠️ **DEGRADED** | **MEDIUM** (stuck on "received") |

### 4.2 User Experience Impact

**Admin:**
- ❌ Cannot accept orders → stuck in "received"
- ❌ Cannot progress orders through workflow
- ❌ Cannot mark orders ready for pickup

**Restaurant:**
- ❌ Same as admin (role overlap)

**Courier:**
- ⚠️ No orders available (nothing reaches "ready_for_pickup")
- ❌ Cannot start delivery workflow

**Customer:**
- ⚠️ Orders show "received" forever
- ❌ No status updates
- 😞 Poor customer experience

---

## 5. Solution Architecture

### 5.1 Strategy: Single Source of Truth

**Create:** `backend/src/constants/orderStatuses.js`

```javascript
/**
 * Order Status Constants
 * SINGLE SOURCE OF TRUTH for all order statuses
 *
 * DO NOT MODIFY without updating:
 * - Frontend: RestaurangVy.jsx, KurirVy.jsx, MinaBeställningar.jsx
 * - Backend: OrderService, OrderController
 * - Middleware: authMiddleware.js
 * - Database: Existing orders (require migration)
 */

const ORDER_STATUS = {
  RECEIVED: 'received',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  READY_FOR_PICKUP: 'ready_for_pickup', // NEW: when restaurant marks ready
  ASSIGNED: 'assigned',                  // KEPT: when courier accepts
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

const STATUS_TRANSITIONS = {
  [ORDER_STATUS.RECEIVED]: [
    ORDER_STATUS.ACCEPTED,
    ORDER_STATUS.CANCELLED
  ],
  [ORDER_STATUS.ACCEPTED]: [
    ORDER_STATUS.IN_PROGRESS
  ],
  [ORDER_STATUS.IN_PROGRESS]: [
    ORDER_STATUS.READY_FOR_PICKUP
  ],
  [ORDER_STATUS.READY_FOR_PICKUP]: [
    ORDER_STATUS.ASSIGNED
  ],
  [ORDER_STATUS.ASSIGNED]: [
    ORDER_STATUS.OUT_FOR_DELIVERY
  ],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [
    ORDER_STATUS.DELIVERED
  ],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: []
};

module.exports = { ORDER_STATUS, STATUS_TRANSITIONS };
```

### 5.2 Files to Update

**Phase 0 Changes:**

1. **Create:** `backend/src/constants/orderStatuses.js`
   - Define canonical enum
   - Define transition rules
   - Add extensive documentation

2. **Update:** `backend/src/services/orderService.js`
   - Line 287: Replace hardcoded array with `Object.values(ORDER_STATUS)`

3. **Update:** `backend/src/middleware/authMiddleware.js`
   - Line 33-39: Import and use `STATUS_TRANSITIONS`

4. **Update:** `backend/src/controllers/orderController.js`
   - Line 136: Fix userId backward compatibility

5. **Verify:** Frontend files use correct statuses
   - `frontend/src/pages/restaurant/RestaurangVy.jsx`
   - `frontend/src/pages/courier/KurirVy.jsx`
   - `frontend/src/pages/customer/MinaBeställningar.jsx`

6. **Test:** End-to-end flow
   - Login as admin
   - Accept order
   - Verify status changes to "accepted"

---

## 6. TODO List Summary

### Overview

**Total Tasks:** 30
**Total Phases:** 7
**Estimated Total Effort:** 30-40 hours
**Critical Path:** Phase 0 → Phase 1 → Phase 2 → Phase 3

### Phase Breakdown

#### Phase 0: Critical Bug Fix 🔴 **START HERE**
- **Tasks:** 6
- **Effort:** 2-4 hours
- **Priority:** P0 (CRITICAL)
- **Blocks:** Everything else
- **Deliverable:** "Acceptera order" knappen fungerar

**Tasks:**
1. Create orderStatuses.js constants file
2. Update OrderService validation
3. Update Middleware transitions
4. Fix OrderController userId handling
5. Verify Frontend status names
6. Test critical bug fix

---

#### Phase 1: Restaurang Order Management ⭐
- **Tasks:** 3
- **Effort:** 4-6 hours
- **Priority:** P1 (HIGH)
- **Dependencies:** Phase 0
- **Deliverable:** Restaurang kan hantera orders från received → ready_for_pickup

**Tasks:**
1. Implement full status workflow
2. Add real-time notifications (polling)
3. Create order detail view

---

#### Phase 2: Kurir Order Management ⭐
- **Tasks:** 5
- **Effort:** 6-8 hours
- **Priority:** P1 (HIGH)
- **Dependencies:** Phase 1
- **Deliverable:** Kurir kan acceptera, hämta och leverera orders

**Tasks:**
1. Create courier dashboard
2. Implement accept order
3. Show pickup/delivery info
4. Implement mark as picked up
5. Implement mark as delivered

---

#### Phase 3: Kund Order Tracking ⭐
- **Tasks:** 3
- **Effort:** 4-6 hours
- **Priority:** P2 (MEDIUM)
- **Dependencies:** Phase 2
- **Deliverable:** Kund kan följa sin order i real-time

**Tasks:**
1. Status timeline display
2. Picked up notification
3. Delivered notification

---

#### Phase 4: Database Schema Updates 📊
- **Tasks:** 2
- **Effort:** 1-2 hours
- **Priority:** P1 (HIGH)
- **Dependencies:** Phase 0 (can run in parallel)
- **Deliverable:** Database schema supports new features

**Tasks:**
1. Add tracking columns (picked_up_at, ready_for_pickup_at, etc.)
2. Update createTables.js

---

#### Phase 5: Testing & QA 🧪
- **Tasks:** 4
- **Effort:** 6-8 hours
- **Priority:** P1 (HIGH)
- **Dependencies:** All features complete
- **Deliverable:** Comprehensive test coverage

**Tasks:**
1. Unit tests (backend)
2. Integration tests (API)
3. E2E tests (frontend)
4. Manual testing checklist

---

#### Phase 6: UI/UX Improvements 🎨
- **Tasks:** 4
- **Effort:** 4-6 hours
- **Priority:** P2 (MEDIUM)
- **Dependencies:** Phase 1-3
- **Deliverable:** Polished user experience

**Tasks:**
1. Status color coding
2. Loading states
3. Toast notifications
4. Mobile responsiveness

---

#### Phase 7: Documentation & Deployment 📚
- **Tasks:** 3
- **Effort:** 3-4 hours
- **Priority:** P2 (MEDIUM)
- **Dependencies:** All phases
- **Deliverable:** Production-ready deployment

**Tasks:**
1. API documentation
2. User guides (admin, courier, customer)
3. Deployment checklist

---

## 7. Milestones & Timeline

### Recommended Timeline

**Week 1:**
- ✅ Phase 0: Bug fix (Day 1-2)
- ✅ Phase 1: Restaurang workflow (Day 3-5)

**Week 2:**
- ✅ Phase 4: Database updates (Day 1)
- ✅ Phase 2: Kurir workflow (Day 2-5)

**Week 3:**
- ✅ Phase 3: Kund tracking (Day 1-3)
- ✅ Phase 6: UI/UX polish (Day 4-5)

**Week 4:**
- ✅ Phase 5: Testing (Day 1-3)
- ✅ Phase 7: Documentation & Deploy (Day 4-5)

**Total:** 4 weeks to production-ready

### Critical Milestones

**🎯 Milestone 1: Acceptera Fungerar (Day 2)**
- Admin kan acceptera orders
- Status ändras korrekt
- UI uppdateras

**🎯 Milestone 2: Restaurang Complete (Week 1)**
- Full workflow: received → accepted → in_progress → ready_for_pickup
- Real-time updates (polling)
- Order details visible

**🎯 Milestone 3: Kurir Can Deliver (Week 2)**
- Kurir ser tillgängliga orders
- Kan acceptera och leverera
- Info om hämta/leverans-adresser

**🎯 Milestone 4: Customer Tracking (Week 3)**
- Kund ser status i real-time
- Notifications när status ändras
- Professional UX

**🎯 Milestone 5: Production Ready (Week 4)**
- All tests passing
- Documented
- Deployed to production

---

## 8. Risks & Mitigation

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Status enum conflict with old orders | HIGH | HIGH | Database migration + backward compat |
| Concurrent order acceptance (2 couriers) | MEDIUM | MEDIUM | Database constraints + optimistic locking |
| Real-time updates lag | LOW | MEDIUM | Start with polling, plan WebSocket later |
| Breaking changes during refactor | MEDIUM | HIGH | Comprehensive testing + staging env |

### Mitigation Strategies

**For Status Enum:**
- Create migration script to update old statuses
- Test on staging first
- Keep backward compatibility for 30 days
- Backup database before deployment

**For Concurrent Access:**
- Add unique constraint on assigned_courier_id
- Implement optimistic locking on order updates
- Show "Already accepted" message if conflict

**For Real-time:**
- Start with 30s polling (simple, works)
- Plan WebSocket for Phase 2 if needed
- Use feature flag to switch between methods

---

## 9. Recommendations

### Immediate Actions (This Week)

1. **START Phase 0 NOW** - Critical bug blocks everything
   - Estimated: 2-4 hours
   - Impact: Unlocks entire order flow
   - Risk: Very low (mostly constants and validation)

2. **Test Phase 0 Thoroughly** - Don't rush to Phase 1
   - Manual test: Login → Accept order → Verify status
   - Check backend logs for any errors
   - Verify database updated correctly

3. **Review TODO List** - Understand full scope before starting
   - Read entire TODO list document
   - Identify any missing requirements
   - Adjust priorities if needed

### Medium-term Strategy (This Month)

1. **Follow Phase Order** - Don't skip phases
   - Phase 0 → 1 → 2 → 3 is the critical path
   - Phase 4 can run in parallel with Phase 0
   - Phase 5-7 require all features complete

2. **Test After Each Phase** - Don't accumulate bugs
   - Manual testing checklist after each phase
   - Fix bugs before moving to next phase
   - Document any issues found

3. **Keep Token System Stable** - Don't break what works
   - Token refresh flow is working perfectly
   - Backward compatibility is in place
   - Don't touch unless absolutely necessary

### Long-term Vision (Next Quarter)

1. **WebSocket Real-time** - Better than polling
2. **Push Notifications** - Mobile alerts
3. **Advanced Analytics** - Order metrics dashboard
4. **Multiple Couriers** - Optimize delivery routes

---

## 10. Conclusion

### Key Findings

1. ✅ **Root cause identified:** Status mismatch between frontend and backend
2. ✅ **Solution designed:** Single source of truth constants file
3. ✅ **TODO list created:** 30 tasks organized in 7 phases
4. ✅ **Timeline established:** 4 weeks to production-ready
5. ✅ **Risks assessed:** Mitigation strategies in place

### Success Metrics

**After Phase 0:**
- ✅ Admin can accept orders
- ✅ Status transitions work correctly
- ✅ No errors in console or logs

**After Phase 1-3:**
- ✅ Full order workflow functional
- ✅ Admin → Restaurant → Courier → Customer
- ✅ Real-time status updates (polling)

**After Phase 4-7:**
- ✅ 80%+ test coverage
- ✅ Complete documentation
- ✅ Production deployment successful

### Next Steps

1. **Read full TODO list:** `.claude/ORDER_FLOW_TODO_LIST.md`
2. **Start Phase 0:** Begin with Task 0.1 (create constants file)
3. **Test frequently:** After each task, verify it works
4. **Ask questions:** If anything is unclear, investigate before coding
5. **Document changes:** Update TODO list as tasks complete

---

## Appendix

### A. File Locations

**Critical Files:**
- Frontend UI: `frontend/src/pages/restaurant/RestaurangVy.jsx`
- API Client: `frontend/src/services/orders/orderService.js`
- Backend Routes: `backend/src/routes/orders.js`
- Backend Controller: `backend/src/controllers/orderController.js`
- Backend Service: `backend/src/services/orderService.js`
- Middleware: `backend/src/middleware/authMiddleware.js`

**Documentation:**
- TODO List: `.claude/ORDER_FLOW_TODO_LIST.md`
- This Report: `.claude/ORDER_FLOW_INVESTIGATION_REPORT.md`
- Token Flow: `backend/docs/TOKEN_FLOW.md`

### B. Command Reference

**Start Development:**
```bash
# Backend
cd backend && npm start

# Frontend (new terminal)
cd frontend && npm run dev
```

**Run Tests:**
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

**Database:**
```bash
# Connect to database
PGPASSWORD="asha" psql -h localhost -U macfatty -d annos_dev

# Check order statuses
SELECT id, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10;
```

### C. Contact & Support

**For Questions:**
- Read TODO list first
- Check this investigation report
- Look at token flow docs: `backend/docs/TOKEN_FLOW.md`
- Check existing code patterns

**For Bugs:**
- Check backend logs
- Check browser console
- Verify status enum consistency
- Test API endpoints with curl/Postman

---

**Report Created:** 2025-11-23
**Created By:** Claude Code Investigation
**Version:** 1.0
**Status:** ✅ COMPLETE - Ready for Implementation
