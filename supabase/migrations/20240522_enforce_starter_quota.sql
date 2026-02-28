-- 1. Cleanup existing trigger and function to allow re-run
DROP TRIGGER IF EXISTS enforce_booking_quota ON bookings;
DROP FUNCTION IF EXISTS check_booking_quota();

-- 2. Create the quota enforcement function
CREATE OR REPLACE FUNCTION check_booking_quota()
RETURNS TRIGGER AS $$
DECLARE
    v_biz_record RECORD;
    v_monthly_total INTEGER;
BEGIN
    -- Fetch business subscription details for the business associated with the new booking
    SELECT subscription_plan, sub_end_date INTO v_biz_record
    FROM businesses
    WHERE id = NEW.business_id;

    -- If no business record is found, we allow the insert (Foreign keys usually handle validation)
    IF v_biz_record IS NULL THEN
        RETURN NEW;
    END IF;

    -- REQUIREMENT: If trial is active (current date <= sub_end_date), allow unlimited bookings
    IF v_biz_record.sub_end_date IS NOT NULL AND v_biz_record.sub_end_date >= NOW() THEN
        RETURN NEW;
    END IF;

    -- REQUIREMENT: If trial expired AND business plan is 'Starter'
    -- Note: Plan check is case-sensitive based on common conventions, adjust if your DB uses 'starter'
    IF v_biz_record.subscription_plan = 'Starter' THEN
        -- Count existing bookings for this business within the current calendar month
        SELECT COUNT(*) INTO v_monthly_total
        FROM bookings
        WHERE business_id = NEW.business_id
          AND booking_time >= date_trunc('month', NOW())
          AND booking_time < (date_trunc('month', NOW()) + INTERVAL '1 month');

        -- REQUIREMENT: Allow max 15 bookings per calendar month
        -- If count is 15, the 16th booking insertion will trigger the exception
        IF v_monthly_total >= 15 THEN
            RAISE EXCEPTION 'Starter plan limit reached: 15 bookings per month. Upgrade to Premium to continue.';
        END IF;
    END IF;

    -- Premium plan businesses or those with valid trials fall through to here
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the BEFORE INSERT trigger on the bookings table
CREATE TRIGGER enforce_booking_quota
BEFORE INSERT ON bookings
FOR EACH ROW
EXECUTE FUNCTION check_booking_quota();