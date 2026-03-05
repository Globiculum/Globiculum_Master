import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ConsentType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'data_processing'
  | 'marketing'
  | 'analytics'
  | 'child_data_coppa'
  | 'data_export'
  | 'data_deletion';

export interface ConsentRecord {
  id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  version: string;
}

export interface UseConsentReturn {
  consents: ConsentRecord[];
  loading: boolean;
  error: string | null;
  grantConsent: (consentType: ConsentType, version?: string) => Promise<boolean>;
  revokeConsent: (consentType: ConsentType) => Promise<boolean>;
  hasConsent: (consentType: ConsentType) => boolean;
  getRequiredConsents: () => ConsentType[];
  hasMissingRequiredConsents: () => boolean;
  refreshConsents: () => Promise<void>;
}

const REQUIRED_CONSENTS: ConsentType[] = [
  'terms_of_service',
  'privacy_policy',
  'data_processing',
];

const CURRENT_VERSIONS: Record<ConsentType, string> = {
  terms_of_service: '1.0',
  privacy_policy: '1.0',
  data_processing: '1.0',
  marketing: '1.0',
  analytics: '1.0',
  child_data_coppa: '1.0',
  data_export: '1.0',
  data_deletion: '1.0',
};

export function useConsent(): UseConsentReturn {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConsents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConsents([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_consents')
        .select('id, consent_type, granted, granted_at, revoked_at, version')
        .eq('user_id', user.id)
        .is('revoked_at', null);

      if (fetchError) throw fetchError;

      setConsents((data as ConsentRecord[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch consents';
      setError(message);
      console.error('Error fetching consents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const grantConsent = useCallback(async (
    consentType: ConsentType,
    version?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to provide consent',
        });
        return false;
      }

      const { error: insertError } = await supabase
        .from('user_consents')
        .upsert({
          user_id: user.id,
          consent_type: consentType,
          granted: true,
          granted_at: new Date().toISOString(),
          version: version || CURRENT_VERSIONS[consentType],
        }, {
          onConflict: 'user_id,consent_type,version',
        });

      if (insertError) throw insertError;

      await fetchConsents();
      
      toast({
        title: 'Consent Recorded',
        description: `Your consent for ${formatConsentType(consentType)} has been recorded.`,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record consent';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return false;
    }
  }, [fetchConsents, toast]);

  const revokeConsent = useCallback(async (consentType: ConsentType): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to revoke consent',
        });
        return false;
      }

      const { error: updateError } = await supabase
        .from('user_consents')
        .update({
          granted: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('consent_type', consentType)
        .is('revoked_at', null);

      if (updateError) throw updateError;

      await fetchConsents();
      
      toast({
        title: 'Consent Revoked',
        description: `Your consent for ${formatConsentType(consentType)} has been revoked.`,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to revoke consent';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return false;
    }
  }, [fetchConsents, toast]);

  const hasConsent = useCallback((consentType: ConsentType): boolean => {
    const consent = consents.find(
      (c) => c.consent_type === consentType && 
             c.granted && 
             c.version === CURRENT_VERSIONS[consentType]
    );
    return !!consent;
  }, [consents]);

  const getRequiredConsents = useCallback((): ConsentType[] => {
    return REQUIRED_CONSENTS;
  }, []);

  const hasMissingRequiredConsents = useCallback((): boolean => {
    return REQUIRED_CONSENTS.some((type) => !hasConsent(type));
  }, [hasConsent]);

  return {
    consents,
    loading,
    error,
    grantConsent,
    revokeConsent,
    hasConsent,
    getRequiredConsents,
    hasMissingRequiredConsents,
    refreshConsents: fetchConsents,
  };
}

function formatConsentType(type: ConsentType): string {
  const labels: Record<ConsentType, string> = {
    terms_of_service: 'Terms of Service',
    privacy_policy: 'Privacy Policy',
    data_processing: 'Data Processing',
    marketing: 'Marketing Communications',
    analytics: 'Analytics',
    child_data_coppa: 'Child Data (COPPA)',
    data_export: 'Data Export',
    data_deletion: 'Data Deletion',
  };
  return labels[type];
}
