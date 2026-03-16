-- Migration: Add payment method columns to user_subscriptions
-- Run this in your Supabase SQL editor

-- Add payment method info columns
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT,
ADD COLUMN IF NOT EXISTS payment_method_brand TEXT,
ADD COLUMN IF NOT EXISTS source TEXT;

-- Comment for documentation
COMMENT ON COLUMN user_subscriptions.payment_method_last4 IS 'Last 4 digits of the credit/debit card used for payment';
COMMENT ON COLUMN user_subscriptions.payment_method_brand IS 'Card brand (visa, mastercard, amex, etc.)';
COMMENT ON COLUMN user_subscriptions.source IS 'Payment provider source (Polar, Whop, etc.)';
