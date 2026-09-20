import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Role, User } from '@/lib/types';

export interface CreateUserInput {
  username: string;
  password: string;
  email?: string | null;
  displayName?: string | null;
  role: Role;
}

export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<User[]>('/api/admin/users'),
    enabled,
  });
}

export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<User>('/api/admin/users', input),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useSetUserEnabled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.post<User>(`/api/admin/users/${id}/${enabled ? 'enable' : 'disable'}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      api.post<void>(`/api/admin/users/${id}/password`, { newPassword }),
  });
}

export interface ProxySetting {
  host: string | null;
  port: number | null;
}

export interface ProxyTestResult {
  ok: boolean;
  message: string;
}

export function useProxySetting(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'proxy'],
    queryFn: () => api.get<ProxySetting>('/api/admin/settings/proxy'),
    enabled,
  });
}

export function useUpdateProxySetting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProxySetting) => api.put<ProxySetting>('/api/admin/settings/proxy', input),
    onSuccess: (data) => client.setQueryData(['admin', 'proxy'], data),
  });
}

export function useTestProxy() {
  return useMutation({
    mutationFn: (input: ProxySetting) => api.post<ProxyTestResult>('/api/admin/settings/proxy/test', input),
  });
}
