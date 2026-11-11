export const mergeEnrollmentUser = (currentUser, updatedUser) => ({
  ...currentUser,
  ...updatedUser,
  memberships: Array.isArray(updatedUser?.memberships) && updatedUser.memberships.length > 0
    ? updatedUser.memberships
    : currentUser?.memberships ?? [],
  tenant: updatedUser?.tenant ?? currentUser?.tenant,
  tenantId: updatedUser?.tenantId ?? currentUser?.tenantId,
});
