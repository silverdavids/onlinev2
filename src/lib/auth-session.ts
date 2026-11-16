export type SmartBetSessionUser = {
  UserId?: string;
  AccountId?: string | number;
  UserName?: string;
  PhoneNumber?: string;
  Email?: string;
};

export type AuthenticatedCustomer = {
  id: string;
  email: string | undefined;
  username?: string;
};

export type SmartBetCheckLoginPayload = {
  authenticated?: boolean;
  user?: { id?: string; username?: string; email?: string; phone?: string } | null;
  roles?: string[];
};

export function normalizeSmartBetCheckLogin(
  response: SmartBetCheckLoginPayload | null,
): SmartBetSessionUser | null {
  if (!response?.authenticated || !response.user?.id || !response.user.username) return null;
  return {
    UserId: response.user.id,
    UserName: response.user.username,
    ...(response.user.email ? { Email: response.user.email } : {}),
    ...(response.user.phone ? { PhoneNumber: response.user.phone } : {}),
  };
}

export function toAuthenticatedCustomer(
  user: SmartBetSessionUser | null,
): AuthenticatedCustomer | null {
  if (!user) return null;
  const id = user.UserId ?? user.AccountId;
  if (id === undefined || id === null || String(id).trim() === "") return null;
  if (!user.UserName && !user.PhoneNumber) return null;
  return {
    id: String(id),
    email: user.Email,
    ...(user.UserName ? { username: user.UserName } : {}),
  };
}

export async function validateSmartBetSession(
  checkSession: () => Promise<SmartBetSessionUser | null>,
): Promise<AuthenticatedCustomer | null> {
  try {
    return toAuthenticatedCustomer(await checkSession());
  } catch {
    return null;
  }
}
