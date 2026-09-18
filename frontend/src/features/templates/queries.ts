import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Template, TemplateSummary } from '@/lib/types';

export interface VersionInput {
  schema: string;
  example?: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<TemplateSummary[]>('/api/templates'),
  });
}

/** `versionNo` undefined means the published version; passing one browses history. */
export function useTemplate(id: number | undefined, versionNo?: number) {
  return useQuery({
    queryKey: ['template', id, versionNo ?? 'current'],
    queryFn: () =>
      api.get<Template>(`/api/templates/${id}${versionNo === undefined ? '' : `?version=${versionNo}`}`),
    enabled: id !== undefined,
  });
}

function useTemplateMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Template>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (template) => {
      void client.invalidateQueries({ queryKey: ['templates'] });
      void client.invalidateQueries({ queryKey: ['template', template.id] });
    },
  });
}

export function useCreateTemplate() {
  return useTemplateMutation((input: { name: string; description?: string } & VersionInput) =>
    api.post<Template>('/api/templates', input),
  );
}

export function useSaveTemplateVersion() {
  return useTemplateMutation(({ id, ...input }: { id: number; changelog?: string } & VersionInput) =>
    api.post<Template>(`/api/templates/${id}/versions`, input),
  );
}

export function useRestoreTemplateVersion() {
  return useTemplateMutation(({ id, versionNo }: { id: number; versionNo: number }) =>
    api.post<Template>(`/api/templates/${id}/versions/${versionNo}/restore`),
  );
}

export function useUpdateTemplate() {
  return useTemplateMutation(
    ({ id, ...patch }: { id: number; name?: string; description?: string; archived?: boolean }) =>
      api.patch<Template>(`/api/templates/${id}`, patch),
  );
}

export function useDeleteTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/api/templates/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['templates'] }),
  });
}
