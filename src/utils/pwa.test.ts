import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal EventTarget-ish stub so we can dispatch state/lifecycle events.
class FakeEmitter {
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  addEventListener(type: string, cb: (...args: unknown[]) => void) {
    (this.listeners[type] ||= []).push(cb);
  }
  emit(type: string, event?: unknown) {
    (this.listeners[type] || []).forEach((cb) => cb(event));
  }
}

class FakeWorker extends FakeEmitter {
  state = "installing";
  postMessage = vi.fn();
  setState(next: string) {
    this.state = next;
    this.emit("statechange");
  }
}

class FakeRegistration extends FakeEmitter {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
}

function installFakeSwEnv(options: { hasController: boolean }) {
  const registration = new FakeRegistration();
  const container = new FakeEmitter() as FakeEmitter & {
    controller: unknown;
    register: (url: string) => Promise<FakeRegistration>;
  };
  (container as unknown as { controller: unknown }).controller = options.hasController ? {} : null;
  (container as unknown as { register: unknown }).register = vi.fn(async () => registration);

  // jsdom's navigator has no serviceWorker; stub the whole navigator. document is
  // already "complete" in jsdom so register() runs synchronously on call. We do
  // NOT stub window.location (jsdom disallows redefining it) — controllerchange
  // is never dispatched in these tests, so reload() is never reached.
  vi.stubGlobal("navigator", { serviceWorker: container as unknown });

  return { registration, container };
}

describe("onSwUpdate / registerAppServiceWorker", () => {
  beforeEach(() => {
    vi.stubEnv("PROD", true);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("notifies subscribers when a new worker installs while a controller exists, and accept() posts SKIP_WAITING", async () => {
    const { registration } = installFakeSwEnv({ hasController: true });
    const pwa = await import("./pwa");

    const received: Array<() => void> = [];
    pwa.onSwUpdate((accept) => received.push(accept));

    pwa.registerAppServiceWorker();
    // let register()'s promise resolve
    await Promise.resolve();
    await Promise.resolve();

    // A new worker starts installing, then reaches "installed" with a controller
    // present -> that's an update, not a first install.
    const worker = new FakeWorker();
    registration.installing = worker;
    registration.emit("updatefound");
    worker.setState("installed");

    expect(received).toHaveLength(1);
    received[0]();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("fires immediately for a worker already waiting at registration time", async () => {
    const { registration } = installFakeSwEnv({ hasController: true });
    const pwa = await import("./pwa");

    const waiting = new FakeWorker();
    waiting.state = "installed";
    registration.waiting = waiting;

    pwa.registerAppServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    // Subscribing AFTER the waiting worker is known should still fire immediately.
    const accept = vi.fn();
    pwa.onSwUpdate((acceptUpdate) => accept(acceptUpdate));
    expect(accept).toHaveBeenCalledTimes(1);

    // Accepting posts SKIP_WAITING to the waiting worker.
    accept.mock.calls[0][0]();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });

  it("does NOT notify on the first-ever install (no existing controller)", async () => {
    const { registration } = installFakeSwEnv({ hasController: false });
    const pwa = await import("./pwa");

    const cb = vi.fn();
    pwa.onSwUpdate(cb);

    pwa.registerAppServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    const worker = new FakeWorker();
    registration.installing = worker;
    registration.emit("updatefound");
    worker.setState("installed"); // installed, but no controller -> first install

    expect(cb).not.toHaveBeenCalled();
  });

  it("unsubscribe stops further notifications", async () => {
    const { registration } = installFakeSwEnv({ hasController: true });
    const pwa = await import("./pwa");

    const cb = vi.fn();
    const unsubscribe = pwa.onSwUpdate(cb);
    unsubscribe();

    pwa.registerAppServiceWorker();
    await Promise.resolve();
    await Promise.resolve();

    const worker = new FakeWorker();
    registration.installing = worker;
    registration.emit("updatefound");
    worker.setState("installed");

    expect(cb).not.toHaveBeenCalled();
  });
});
