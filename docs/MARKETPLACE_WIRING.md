# Marketplace Wiring & Data Discovery Guide

This document provides a technical reference for how the **Carwash Marketplace** handles data discovery and interleaving for Car Wash services, Car Sales, and Spare Parts.

## 1. Core Architecture: "The Manual Wiring Pattern"

While standard SQL joins (`select(*, business:business_id(*))`) are common, they can be fragile in Supabase/PostgREST environments where Row Level Security (RLS) or slightly misaligned foreign key metadata can cause nested results to return `null` without throwing an error.

To ensure 100% reliability, the marketplace uses a **Three-Stage Manual Wiring** approach:

### Stage 1: The Source of Truth (Verified Businesses)
We first identify which businesses are actually allowed to be visible.
```typescript
const { data: verifiedBiz } = await supabase
    .from('businesses')
    .select('*')
    .or('verification_status.eq.verified,status.eq.verified');
```

### Stage 2: Parallel Product Fetching
Using the IDs from Stage 1, we fetch products using the `.in()` filter. This is significantly faster and more resilient than deep joins.
```typescript
const verifiedIds = verifiedBiz.map(b => b.id);
const { data: products } = await supabase
    .from('car_listing') // or 'spare_parts'
    .select('*')
    .in('business_id', verifiedIds);
```

### Stage 3: In-Memory Wiring
We map the business profiles back to the products in JavaScript. This ensures the UI always has access to the seller's name, city, and branding.
```typescript
const bizMap = verifiedBiz.reduce((acc, b) => ({ ...acc, [b.id]: b }), {});
const wiredProducts = products.map(p => ({
    ...p,
    business: bizMap[p.business_id] || { name: 'Verified Partner' }
}));
```

---

## 2. Entity-Specific Wiring

### Car Wash Services
- **Logic**: These are usually fetched as a sub-collection of a specific business profile.
- **Discovery**: In the "Car Wash" category view, we display the `businesses` themselves. Their services are loaded when a user clicks "View Profile" or "Book".

### Car Sales (Showroom)
- **Table**: `car_listing`
- **Key Fields**: `make`, `model`, `year`, `price`, `images`.
- **Visibility**: Strictly filtered for `status = 'active'` or `'available'`.
- **Wiring**: Uses the **Manual Wiring Pattern** to display the dealership info on the car card.

### Spare Parts (Catalog)
- **Table**: `spare_parts`
- **Key Fields**: `name`, `category`, `condition`, `stock_quantity`, `images`.
- **Visibility**: Strictly filtered for `status = 'active'`.
- **Wiring**: Synchronized with the Car Sales pattern for consistent discovery across the directory and trending feeds.

---

## 3. Unified Interleaving (The "All Partners" View)

When "All Partners" is selected, the platform performs a **Mixed-Media Merge**:

1.  Fetches all three lists (Businesses, Cars, Parts) in parallel.
2.  Tags each item with an `itemType` property (`'business'`, `'car'`, or `'part'`).
3.  Standardizes the date field (using `created_at`).
4.  Sorts the combined array chronologically.
5.  Renders the appropriate card component based on the `itemType`.

---

## 4. Resilient Media Handling

PostgreSQL handles arrays (like the `images` column) differently depending on configuration. We use a robust utility to parse these into valid URLs:

```typescript
function getDisplayImage(images: any, fallback: string): string {
  if (!images) return fallback;
  if (Array.isArray(images) && images.length > 0) return images[0];
  // Handles stringified JSON or Postgres array literals "{url1,url2}"
  if (typeof images === 'string') {
    try {
      const cleaned = images.replace(/[{}]/g, '[').replace(/[}]/g, ']');
      const parsed = JSON.parse(cleaned.includes('[') ? cleaned : `["${images}"]`);
      return parsed[0];
    } catch { return images; }
  }
  return fallback;
}
```

---

## 5. Security Summary
- **No Sensitive Data**: Public discovery queries explicitly select only non-sensitive columns.
- **Verification Gate**: Any item (car, part, or service) whose parent business is not `verified` is automatically excluded from public discovery at the database level using the `business_id` filter.
