export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    displayName: string | null;
    role?: string;
  };
};

export type AuthSession = LoginResponse | null;

export type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string | null;
};

export type KeyValueItem = {
  label: string;
  value: string | number | null | undefined;
};
