import { useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/primitives';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useProxySetting, useTestProxy, useUpdateProxySetting, type ProxySetting } from './queries';

function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

/** Server-wide outbound proxy used when the backend fetches video cover thumbnails (e.g. YouTube). */
export function ServerProxySection() {
  const proxy = useProxySetting(true);
  const updateProxy = useUpdateProxySetting();
  const testProxy = useTestProxy();

  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (proxy.data) {
      setHost(proxy.data.host ?? '');
      setPort(proxy.data.port != null ? String(proxy.data.port) : '');
    }
  }, [proxy.data]);

  function payload(): ProxySetting {
    return { host: host.trim() || null, port: port.trim() ? Number(port) : null };
  }

  function save() {
    setMessage(null);
    updateProxy.mutate(payload(), {
      onSuccess: () => setMessage({ tone: 'ok', text: 'Proxy saved.' }),
      onError: (cause) => setMessage({ tone: 'error', text: messageOf(cause, 'Could not save the proxy') }),
    });
  }

  function test() {
    setMessage(null);
    testProxy.mutate(payload(), {
      onSuccess: (result) => setMessage({ tone: result.ok ? 'ok' : 'error', text: result.message }),
      onError: (cause) => setMessage({ tone: 'error', text: messageOf(cause, 'Test failed') }),
    });
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 text-lg font-semibold">Server proxy</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        The server uses this HTTP proxy to reach the internet when fetching video cover images (e.g.
        YouTube thumbnails). Leave both fields blank for a direct connection.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[10rem] text-xs font-medium text-muted-foreground">
          Proxy IP address
          <Input
            className="mt-1"
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder="127.0.0.1"
          />
        </label>
        <label className="w-24 text-xs font-medium text-muted-foreground">
          Port
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(event) => setPort(event.target.value)}
            placeholder="7890"
          />
        </label>
      </div>

      {message && (
        <p className={cn('mt-3 text-sm', message.tone === 'ok' ? 'text-muted-foreground' : 'text-destructive')}>
          {message.text}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="primary" onClick={save} disabled={updateProxy.isPending}>
          {updateProxy.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="outline" onClick={test} disabled={testProxy.isPending}>
          <Wifi />
          {testProxy.isPending ? 'Testing…' : 'Test'}
        </Button>
      </div>
    </Card>
  );
}
