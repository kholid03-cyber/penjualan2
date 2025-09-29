# Lababil Sales System - TODO List

## Current Status
- [x] Setup Firebase Auth integration (js/firebase.js, js/auth.js, js/main.js)
- [x] Basic login testing via browser (login page loads, form visible)

## Firebase Migration & TODO Fixes (New Implementation Plan)
This section tracks the full Firebase migration and fixes for original TODO items. Steps will be marked as completed progressively.

### Phase 1: Firebase Setup & Core Migration
- [x] **Step 1.1**: Update js/firebase.js - Add Firestore imports, helper functions for CRUD (getCollectionRef, addDocWithId, etc.), and one-time migration function.
- [x] **Step 1.2**: Test Firebase helpers - Verify Firestore connection and basic read/write via console or browser tool.
- [x] **Step 1.3**: Migrate data models in js/dashboard.js - Replace localStorage with Firestore for products, sales, purchases, categories, customers, settings. Add offline fallback.
- [x] **Step 1.4**: Implement one-time data migration - Run script to sync existing localStorage data to Firestore collections.
- [x] **Step 1.5**: Update init() in js/dashboard.js - Load data from Firestore on dashboard load, handle errors.
- [x] **Step 1.6**: Update managers (products.js, sales.js, purchases.js) - Replace localStorage operations with Firebase methods.

### Phase 2: Fix Original TODO Items
- [x] **Step 2.1**: Fix Manual Price Editing in Sales - Update js/sales.js to allow dynamic price input, remove readonly from HTML, recalculate totals.
- [x] **Step 2.2**: Fix Cost Price Input in Purchases - Add costPrice input to admin-dashboard.html (purchases section), update js/purchases.js to save to products via Firestore.
- [x] **Step 2.3**: Fix Profit Calculation in Reports - Add calculateProfit() in js/dashboard.js using Firestore data, update reports UI to show profit metrics.
- [x] **Step 2.4**: Fix Dynamic Categories - Add "+ Add Category" button to product modal in admin-dashboard.html, update js/products.js to save/load from Firestore 'categories' collection.
  - [x] Sub-step 2.4.1: Update js/dashboard.js - Add loadCategoriesFromFirestore() and updateCategorySelect() methods.
  - [x] Sub-step 2.4.2: Update js/products.js - Make addCategory() async with Firestore uniqueness check, expose as global window.addCategory.
  - [ ] Sub-step 2.4.3: Test dynamic category addition and selection in modal.
  - [ ] Sub-step 2.4.4: Verify real-time updates and error handling.

### Phase 3: Auth & Security Enhancements
- [ ] **Step 3.1**: Update js/auth.js - Sync user role to Firestore document after login, add requireAuth() with Firestore role check.
- [ ] **Step 3.2**: Secure admin-only features - Add role checks in dashboard sections (e.g., purchases for admin only).

### Phase 4: Testing & Finalization
- [ ] **Step 4.1**: Critical-path testing - Test login, CRUD operations (add/edit/delete product/sale/purchase), real-time sync via browser tool.
- [ ] **Step 4.2**: Thorough testing - Test offline mode, error scenarios, multi-user (if possible), role restrictions.
- [ ] **Step 4.3**: Update this TODO.md - Mark all steps as [x], add new TODOs for future features (e.g., offline sync, data export).
- [ ] **Step 4.4**: Deployment & Verification - Commit changes, deploy to Netlify, test production URL.

## Original TODO Items (Marked for Reference)
- [ ] Manual editing harga di sales (sekarang di Phase 2.1)
- [ ] Input cost price di purchases (sekarang di Phase 2.2)
- [ ] Perhitungan profit di reports (sekarang di Phase 2.3)
- [ ] Dynamic category addition (sekarang di Phase 2.4)

## Notes
- **Dependencies**: Semua changes pakai existing Firebase SDK (no new installs).
- **Testing Approach**: Gunakan browser_action tool untuk live testing setelah setiap phase.
- **Risks**: Data migration one-time - backup localStorage dulu. Firestore rules perlu di-set allow read/write authenticated users.
- **Estimated Time**: 2-3 phases per session, full completion dalam 4-5 interactions.

Progress will be updated after each completed step.
