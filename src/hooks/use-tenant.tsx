
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/lib/types';

type TenantContextType = {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
};

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
});

/**
 * TenantProvider handles white-label context resolution.
 * Detects tenant by hostname/domain or user session.
 */
export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolveTenant = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Resolve by Domain (Primary white-label detection)
      const hostname = window.location.hostname;
      
      // For local dev, we might use a hardcoded default or query param
      // In prod, hostname would match tenants.domain
      const { data: domainTenant, error: domainError } = await supabase
        .from('tenants')
        .select('*')
        .eq('domain', hostname)
        .maybeSingle();

      if (domainTenant) {
        setTenant(domainTenant as Tenant);
        setLoading(false);
        return;
      }

      // 2. Resolve by User Profile (Secondary detection)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single();
        
        if (userProfile?.tenant_id) {
          const { data: userTenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', userProfile.tenant_id)
            .single();
          
          if (userTenant) {
            setTenant(userTenant as Tenant);
            setLoading(false);
            return;
          }
        }
      }

      // 3. Fallback to Default Tenant (or first found)
      const { data: defaultTenant } = await supabase
        .from('tenants')
        .select('*')
        .limit(1)
        .single();
      
      setTenant(defaultTenant as Tenant);

    } catch (e: any) {
      console.error("Tenant resolution failed:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveTenant();
  }, [resolveTenant]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error }}>
      {/* Branding Injection */}
      {tenant && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            ${tenant.primary_color ? `--primary: ${tenant.primary_color};` : ''}
            ${tenant.secondary_color ? `--accent: ${tenant.secondary_color};` : ''}
          }
        `}} />
      )}
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
