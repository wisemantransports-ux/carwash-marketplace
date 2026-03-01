-- Admin Script for Business Verification and Subscription Management
-- Run this in the Supabase SQL Editor using service_role permissions.
-- This script updates the status of the Arnold Demo, Mula, and Doris carwash businesses.

BEGIN;

-- 1. Update Arnold Demo Business
-- Action: Verify identity, activate platform status, set plan to Pro, and enable subscription.
UPDATE businesses 
SET 
    verification_status = 'verified',
    status = 'verified',
    subscription_plan = 'Pro',
    subscription_status = 'active',
    sub_end_date = NOW() + INTERVAL '30 days'
WHERE id = 'd3bfaf49-91c4-498c-8523-c753ffd62498';

-- 2. Update Mula Carwash
-- Action: Verify identity, activate platform status, set plan to Enterprise, and enable subscription.
UPDATE businesses 
SET 
    verification_status = 'verified',
    status = 'verified',
    subscription_plan = 'Enterprise',
    subscription_status = 'active',
    sub_end_date = NOW() + INTERVAL '30 days'
WHERE id = 'f77f8168-a069-47a5-9cfd-d974be5e5682';

-- 3. Update Doris Wash
-- Action: Verify identity, activate platform status, set plan to Starter, and enable subscription.
UPDATE businesses 
SET 
    verification_status = 'verified',
    status = 'verified',
    subscription_plan = 'Starter',
    subscription_status = 'active',
    sub_end_date = NOW() + INTERVAL '30 days'
WHERE id = 'ed4877ff-d035-48f5-8706-00a3580776d6';

-- 4. Example: How to Deactivate/Unverify (Commented out for safety)
/*
UPDATE businesses 
SET 
    verification_status = 'pending',
    status = 'suspended',
    subscription_status = 'inactive'
WHERE id = 'ed4877ff-d035-48f5-8706-00a3580776d6';
*/

COMMIT;

-- Verify the changes
SELECT id, name, verification_status, status, subscription_plan, subscription_status FROM businesses 
WHERE id IN ('d3bfaf49-91c4-498c-8523-c753ffd62498', 'f77f8168-a069-47a5-9cfd-d974be5e5682', 'ed4877ff-d035-48f5-8706-00a3580776d6');