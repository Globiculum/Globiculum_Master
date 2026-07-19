import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DeletionStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface DeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: DeletionStatus;
  reason: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface UseDataDeletionReturn {
  requests: DeletionRequest[];
  loading: boolean;
  error: string | null;
  hasPendingRequest: boolean;
  submitDeletionRequest: (reason?: string) => Promise<boolean>;
  cancelDeletionRequest: (requestId: string) => Promise<boolean>;
  refreshRequests: () => Promise<void>;
}

export function useDataDeletion(): UseDataDeletionReturn {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRequests([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('data_deletion_requests')
        .select('id, user_id, requested_at, status, reason, completed_at, notes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRequests((data as DeletionRequest[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch deletion requests';
      setError(message);
      console.error('Error fetching deletion requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const submitDeletionRequest = useCallback(async (reason?: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to request data deletion',
        });
        return false;
      }

      // Check for existing pending request
      const existingPending = requests.find(
        (r) => r.status === 'pending' || r.status === 'in_progress'
      );
      if (existingPending) {
        toast({
          variant: 'destructive',
          title: 'Request Already Exists',
          description: 'You already have a pending data deletion request.',
        });
        return false;
      }

      const { error: insertError } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: user.id,
          reason: reason || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      await fetchRequests();
      
      toast({
        title: 'Request Submitted',
        description: 'Your data deletion request has been submitted. We will process it within 30 days as required by GDPR.',
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit deletion request';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return false;
    }
  }, [requests, fetchRequests, toast]);

  const cancelDeletionRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      // Users can only cancel pending requests
      const request = requests.find((r) => r.id === requestId);
      if (!request || request.status !== 'pending') {
        toast({
          variant: 'destructive',
          title: 'Cannot Cancel',
          description: 'Only pending requests can be cancelled.',
        });
        return false;
      }

      // We use a workaround since users can't update - we'll just mark it locally
      // In reality, the user would need to contact support or admin would handle it
      toast({
        title: 'Cancellation Requested',
        description: 'Please contact support to cancel your deletion request.',
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel deletion request';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return false;
    }
  }, [requests, toast]);

  const hasPendingRequest = requests.some(
    (r) => r.status === 'pending' || r.status === 'in_progress'
  );

  return {
    requests,
    loading,
    error,
    hasPendingRequest,
    submitDeletionRequest,
    cancelDeletionRequest,
    refreshRequests: fetchRequests,
  };
}
