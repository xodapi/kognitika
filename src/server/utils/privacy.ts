interface BrainIdentitySource {
  id: string;
  name?: string | null;
  pseudonym?: string | null;
  brainId?: string | null;
}

export function displayNameForIdentity(user: BrainIdentitySource) {
  return user.pseudonym || user.name || `Brain ${user.id.slice(0, 8)}`;
}

export function brainLabelForIdentity(user: BrainIdentitySource) {
  return user.brainId ? `Brain ${user.brainId.slice(0, 8)}` : `User ${user.id.slice(0, 8)}`;
}

export function sanitizePublicUserIdentity(user: BrainIdentitySource) {
  const name = displayNameForIdentity(user);

  return {
    name,
    pseudonym: user.pseudonym,
    brainLabel: brainLabelForIdentity(user),
  };
}

export function sanitizeAdminUserIdentity(user: BrainIdentitySource) {
  const displayName = displayNameForIdentity(user);

  return {
    id: user.id,
    displayName,
    name: displayName,
    brainLabel: brainLabelForIdentity(user),
    pseudonym: user.pseudonym,
  };
}
