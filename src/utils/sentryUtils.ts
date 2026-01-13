// utils/sentryUtils.ts
import * as Sentry from '@sentry/nextjs';

export function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

export function addErrorContext(context: Record<string, any>) {
  Sentry.setContext('additional_info', context);
}

export function addTag(key: string, value: string) {
  Sentry.setTag(key, value);
}