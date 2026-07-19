/**
 * IdP Group Mapper
 *
 * Maps IdP groups to DSG RBAC roles for automatic group-based access assignment.
 * Syncs user group memberships on login (JIT - Just-In-Time provisioning).
 */

import { getSupabaseAdmin } from '@/lib/supabase-server';

export interface GroupMapResult {
  ok: boolean;
  roleId?: string;
  roleName?: string;
  error?: string;
}

export interface GroupSyncResult {
  ok: boolean;
  rolesAssigned: string[];
  rolesRemoved?: string[];
  error?: string;
}

/**
 * Get DSG role for an IdP group
 * @param orgId Organization ID
 * @param idpGroupName IdP group name (e.g., engineering@acme.com)
 * @returns Mapped role ID and name
 */
export async function getGroupMapping(orgId: string, idpGroupName: string): Promise<GroupMapResult> {
  try {
    const supabase = getSupabaseAdmin() as any;

    // Look up group mapping
    const mappingResult = await supabase
      .from('org_idp_groups')
      .select('rbac_role_id')
      .eq('org_id', orgId)
      .eq('idp_group_name', idpGroupName)
      .eq('auto_assign', true)
      .single();

    if (mappingResult.error) {
      // No mapping exists (not an error, just no mapping)
      return { ok: true };
    }

    const roleId = mappingResult.data.rbac_role_id;

    // Get role details
    const roleResult = await supabase
      .from('org_rbac_roles')
      .select('id, name')
      .eq('id', roleId)
      .single();

    if (roleResult.error) {
      return { ok: false, error: 'Role not found' };
    }

    return { ok: true, roleId: roleResult.data.id, roleName: roleResult.data.name };
  } catch (error) {
    console.error('[group-mapper] Error getting mapping:', error);
    return { ok: false, error: `Mapping lookup failed: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Get all role mappings for an organization
 * @param orgId Organization ID
 * @returns Map of IdP groups to role IDs
 */
export async function getOrgGroupMappings(orgId: string): Promise<Record<string, string> | null> {
  try {
    const supabase = getSupabaseAdmin() as any;

    const mappingResult = await supabase
      .from('org_idp_groups')
      .select('idp_group_name, rbac_role_id')
      .eq('org_id', orgId)
      .eq('auto_assign', true);

    if (mappingResult.error) {
      return null;
    }

    const mappings: Record<string, string> = {};
    for (const mapping of mappingResult.data) {
      mappings[mapping.idp_group_name] = mapping.rbac_role_id;
    }

    return mappings;
  } catch (error) {
    console.error('[group-mapper] Error getting org mappings:', error);
    return null;
  }
}

/**
 * Create/update a group mapping
 * @param orgId Organization ID
 * @param idpGroupName IdP group name
 * @param roleId DSG role ID
 * @returns Success result
 */
export async function createGroupMapping(
  orgId: string,
  idpGroupName: string,
  roleId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin() as any;

    // Check if mapping already exists
    const existingResult = await supabase
      .from('org_idp_groups')
      .select('id')
      .eq('org_id', orgId)
      .eq('idp_group_name', idpGroupName)
      .single();

    if (existingResult.data) {
      // Update existing mapping
      const updateResult = await supabase
        .from('org_idp_groups')
        .update({ rbac_role_id: roleId })
        .eq('id', existingResult.data.id);

      if (updateResult.error) {
        return { ok: false, error: updateResult.error.message };
      }

      return { ok: true };
    }

    // Create new mapping
    const createResult = await supabase.from('org_idp_groups').insert({
      org_id: orgId,
      idp_group_name: idpGroupName,
      rbac_role_id: roleId,
      auto_assign: true,
    });

    if (createResult.error) {
      console.error('[group-mapper] Error creating mapping:', createResult.error);
      return { ok: false, error: createResult.error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('[group-mapper] Error creating mapping:', error);
    return { ok: false, error: `Mapping creation failed: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Sync user groups on login (Just-In-Time provisioning)
 * Assigns roles based on IdP group membership
 * @param userId User ID
 * @param orgId Organization ID
 * @param idpGroups Array of IdP groups user belongs to
 * @returns Sync result
 */
export async function syncUserGroupsOnLogin(
  userId: string,
  orgId: string,
  idpGroups: string[],
): Promise<GroupSyncResult> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const rolesAssigned: string[] = [];
    const rolesRemoved: string[] = [];

    // Get group mappings for org
    const mappings = await getOrgGroupMappings(orgId);
    if (!mappings) {
      return { ok: false, rolesAssigned: [], error: 'Failed to load group mappings' };
    }

    // Determine which roles user should have based on groups
    const targetRoleIds = new Set<string>();
    for (const group of idpGroups) {
      if (mappings[group]) {
        targetRoleIds.add(mappings[group]);
      }
    }

    // Get current user roles
    const currentRolesResult = await supabase
      .from('user_org_roles')
      .select('rbac_role_id')
      .eq('user_id', userId)
      .eq('org_id', orgId);

    if (currentRolesResult.error) {
      console.error('[group-sync] Error getting current roles:', currentRolesResult.error);
      return { ok: false, rolesAssigned: [], error: 'Failed to get current roles' };
    }

    const currentRoleIds = new Set<string>(currentRolesResult.data.map((r: any) => r.rbac_role_id as string).filter(Boolean));

    // Add roles that should be added
    for (const roleId of targetRoleIds) {
      if (!currentRoleIds.has(roleId)) {
        const addResult = await supabase.from('user_org_roles').insert({
          user_id: userId,
          org_id: orgId,
          rbac_role_id: roleId,
        });

        if (addResult.error) {
          console.warn(`[group-sync] Failed to assign role ${roleId}:`, addResult.error);
        } else {
          rolesAssigned.push(roleId);
        }
      }
    }

    // Remove roles that should be removed (IdP group based roles only)
    for (const roleId of currentRoleIds) {
      if (roleId && !targetRoleIds.has(roleId)) {
        // Check if this is an IdP-synced role (would need a flag in org_rbac_roles)
        // For now, be conservative and don't auto-remove
        // Only remove if explicitly mapped
        const mappingValues = Object.values(mappings);
        if (mappingValues.includes(roleId)) {
          const removeResult = await supabase
            .from('user_org_roles')
            .delete()
            .eq('user_id', userId)
            .eq('org_id', orgId)
            .eq('rbac_role_id', roleId);

          if (removeResult.error) {
            console.warn(`[group-sync] Failed to remove role ${roleId}:`, removeResult.error);
          } else {
            rolesRemoved.push(roleId);
          }
        }
      }
    }

    return { ok: true, rolesAssigned, rolesRemoved };
  } catch (error) {
    console.error('[group-sync] Exception:', error);
    return { ok: false, rolesAssigned: [], error: `Sync failed: ${String(error).slice(0, 100)}` };
  }
}

/**
 * Delete a group mapping
 * @param orgId Organization ID
 * @param idpGroupName IdP group name
 * @returns Success result
 */
export async function deleteGroupMapping(orgId: string, idpGroupName: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin() as any;

    const result = await supabase
      .from('org_idp_groups')
      .delete()
      .eq('org_id', orgId)
      .eq('idp_group_name', idpGroupName);

    if (result.error) {
      return { ok: false, error: result.error.message };
    }

    return { ok: true };
  } catch (error) {
    console.error('[group-mapper] Error deleting mapping:', error);
    return { ok: false, error: `Deletion failed: ${String(error).slice(0, 100)}` };
  }
}
