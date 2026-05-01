import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocketUrl() {
  // Prefer explicit public socket URL (frontend config)
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  // Fallback to explicit backend URL if provided
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  return 'http://localhost:5001';
}

export function getSocketInstance() {
  return socketInstance;
}

export function initSocketConnection() {
  if (socketInstance) {
    return socketInstance;
  }
  const socketUrl = getSocketUrl();

  console.log('[socket] Connecting to socket:', socketUrl);
  console.log('🚨 SOCKET URL =', socketUrl);

  socketInstance = io(socketUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  });

  // Add debug listeners for connection lifecycle
  socketInstance.on('connect', () => {
    console.log('✅ SOCKET CONNECTED', socketInstance?.id, 'url=', socketUrl);
  });

  socketInstance.on('connect_error', (err: any) => {
    try {
      console.error('❌ SOCKET CONNECT_ERROR:', err?.message || err, err);
    } catch (e) {
      console.error('❌ SOCKET CONNECT_ERROR (unknown)');
    }
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// Dev helper: force a one-off connection to verify reachability and report logs.
// Enable by setting NEXT_PUBLIC_SOCKET_DEBUG=true in your env and calling testSocketConnection().
export async function testSocketConnection(timeout = 10000): Promise<{ success: boolean; message: string }> {
  const url = getSocketUrl();
  console.log('🚨 SOCKET URL =', url, '(testSocketConnection)');

  return new Promise((resolve) => {
    let resolved = false;
    const tmp = io(url, {
      transports: ['websocket', 'polling'],
      timeout,
      autoConnect: true,
      reconnection: false,
    });

    const finish = (success: boolean, msg: string) => {
      if (resolved) return;
      resolved = true;
      try { tmp.disconnect(); } catch (e) {}
      resolve({ success, message: msg });
    };

    tmp.on('connect', () => {
      console.log('✅ testSocketConnection: connected', tmp.id);
      finish(true, `connected ${tmp.id}`);
    });

    tmp.on('connect_error', (err: any) => {
      console.error('❌ testSocketConnection connect_error:', err?.message || err);
      finish(false, `connect_error: ${err?.message || String(err)}`);
    });

    setTimeout(() => {
      if (!resolved) finish(false, 'timeout');
    }, timeout + 1000);
  });
}
