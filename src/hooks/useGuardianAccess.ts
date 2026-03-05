import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type RelationshipType = 'parent' | 'guardian' | 'authorized_adult';
export type AccessLevel = 'view_only' | 'limited' | 'full';

export interface GuardianRelationship {
  id: string;
  guardian_user_id: string;
  student_user_id: string;
  relationship_type: RelationshipType;
  verified: boolean;
  verified_at: string | null;
  access_level: AccessLevel;
  expires_at: string | null;
  created_at: string;
}

export interface UseGuardianAccessReturn {
  relationships: GuardianRelationship[];
  loading: boolean;
  error: string | null;
  addGuardianRelationship: (
    studentUserId: string,
    relationshipType: RelationshipType,
    accessLevel?: AccessLevel
  ) => Promise<boolean>;
  updateAccessLevel: (relationshipId: string, accessLevel: AccessLevel) => Promise<boolean>;
  removeRelationship: (relationshipId: string) => Promise<boolean>;
  getStudentsForGuardian: () => GuardianRelationship[];
  getGuardiansForStudent: () => GuardianRelationship[];
  canAccessStudentData: (studentUserId: string) => AccessLevel | null;
  refreshRelationships: () => Promise<void>;
}

export function useGuardianAccess(): UseGuardianAccessReturn {
  const [relationships, setRelationships] = useState<GuardianRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRelationships = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRelationships([]);
        setCurrentUserId(null);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from('guardian_relationships')
        .select('*')
        .or(`guardian_user_id.eq.${user.id},student_user_id.eq.${user.id}`);

      if (fetchError) throw fetchError;

      // Filter out expired relationships and cast to proper types
      const validRelationships = ((data || []) as GuardianRelationship[]).filter((rel) => {
        if (!rel.expires_at) return true;
        return new Date(rel.expires_at) > new Date();
      });

      setRelationships(validRelationships);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch guardian relationships';
      setError(message);
      console.error('Error fetching guardian relationships:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  const addGuardianRelationship = useCallback(async (
    studentUserId: string,
    relationshipType: RelationshipType,
    accessLevel: AccessLevel = 'full'
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You must be logged in to add a guardian relationship',
        });
        return false;
      }

      if (user.id === studentUserId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You cannot be your own guardian',
        });
        return false;
      }

      const { error: insertError } = await supabase
        .from('guardian_relationships')
        .insert({
          guardian_user_id: user.id,
          student_user_id: studentUserId,
          relationship_type: relationshipType,
          access_level: accessLevel,
          verified: false,
        });

      if (insertError) throw insertError;

      await fetchRelationships();
      
      toast({
        title: 'Relationship Added',
        description: 'Guardian relationship has been created. Pending verification.',
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add guardian relationship';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return false;
    }
  }, [fetchRelationships, toast]);

  const updateAccessLevel = useCallback(async (
    relationshipId: string,
    accessLevel: AccessLevel
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('guardian_relationships')
        .update({ access_level: accessLevel })
        .eq('id', relationshipId);

      if (updateError) throw updateError;

      await fetchRelationships();
      
      toast({
        title: 'Access Level Updated',
        description: `Access level has been updated to ${accessLevel.replace('_', ' ')}.`,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update access level';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return false;
    }
  }, [fetchRelationships, toast]);

  const removeRelationship = useCallback(async (relationshipId: string): Promise<boolean> => {
    try {
      // Note: Only admins can delete via RLS policy
      // Guardians can update to set expires_at to now
      const { error: updateError } = await supabase
        .from('guardian_relationships')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', relationshipId);

      if (updateError) throw updateError;

      await fetchRelationships();
      
      toast({
        title: 'Relationship Removed',
        description: 'Guardian relationship has been removed.',
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove relationship';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return false;
    }
  }, [fetchRelationships, toast]);

  const getStudentsForGuardian = useCallback((): GuardianRelationship[] => {
    if (!currentUserId) return [];
    return relationships.filter(
      (rel) => rel.guardian_user_id === currentUserId && rel.verified
    );
  }, [relationships, currentUserId]);

  const getGuardiansForStudent = useCallback((): GuardianRelationship[] => {
    if (!currentUserId) return [];
    return relationships.filter(
      (rel) => rel.student_user_id === currentUserId
    );
  }, [relationships, currentUserId]);

  const canAccessStudentData = useCallback((studentUserId: string): AccessLevel | null => {
    if (!currentUserId) return null;
    
    // User can always access their own data
    if (currentUserId === studentUserId) return 'full';

    const relationship = relationships.find(
      (rel) => 
        rel.guardian_user_id === currentUserId && 
        rel.student_user_id === studentUserId &&
        rel.verified
    );

    return relationship?.access_level || null;
  }, [relationships, currentUserId]);

  return {
    relationships,
    loading,
    error,
    addGuardianRelationship,
    updateAccessLevel,
    removeRelationship,
    getStudentsForGuardian,
    getGuardiansForStudent,
    canAccessStudentData,
    refreshRelationships: fetchRelationships,
  };
}
