export const buildSignupUserPayload = (user, tenant, membership = null) => {
  const safeUser = typeof user?.toObject === "function" ? user.toObject() : { ...user };
  delete safeUser.password;

  if (tenant) safeUser.tenant = tenant;

  if (safeUser.role === "student" && tenant?.slug && membership) {
    safeUser.memberships = [{
      institutionId: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      logo: tenant.logo,
      title: tenant.title,
      institutionType: tenant.institutionType,
      joinedAt: membership.joinedAt,
    }];
  }

  return safeUser;
};
