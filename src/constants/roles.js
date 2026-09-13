export const ROLES = Object.freeze({
  OWNER: "OWNER",
  ADMIN: "ADMIN",
});

export const BUSINESS_OWNER_ROLES = [ROLES.OWNER, ROLES.ADMIN];
export const PLATFORM_AUTH_ROLES = BUSINESS_OWNER_ROLES;
