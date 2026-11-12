import {
  ILocalBridgeClient,
  IDEProviderId,
  IDEDetectionResult,
  HandoffResult,
  LaunchResult,
  WorkspaceChangesResult,
  ExecutionSessionStatus,
} from '../types';

export class LocalBridgeClient implements ILocalBridgeClient {
  private baseUrl: string;
  private pairingToken: string | null = null;

  constructor(port = 4488) {
    this.baseUrl = `http://127.0.0.1:${port}`;
  }

  setPairingToken(token: string | null): void {
    this.pairingToken = token ? token.trim() : null;
  }

  getPairingToken(): string | null {
    return this.pairingToken;
  }

  setPort(port: number): void {
    this.baseUrl = `http://127.0.0.1:${port}`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.pairingToken) {
      headers['Authorization'] = `Bearer ${this.pairingToken}`;
    }
    return headers;
  }

  async isBridgeReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<{ status: string; version: string; port: number }> {
    const res = await fetch(`${this.baseUrl}/health`, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      throw new Error(`Bridge returned HTTP ${res.status}`);
    }
    return await res.json();
  }

  async pair(token: string): Promise<boolean> {
    const trimmed = token.trim();
    if (!trimmed) return false;

    try {
      const res = await fetch(`${this.baseUrl}/auth/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmed}`,
        },
        body: JSON.stringify({ token: trimmed }),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        this.setPairingToken(trimmed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async detectIDEs(): Promise<Record<IDEProviderId, IDEDetectionResult>> {
    const res = await fetch(`${this.baseUrl}/providers/detect`, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Failed to detect IDEs: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.providers || {};
  }

  async validatePath(
    projectPath: string
  ): Promise<{ valid: boolean; resolvedPath?: string; error?: string; isGitRepo?: boolean }> {
    const res = await fetch(`${this.baseUrl}/workspace/validate-path`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ projectPath }),
      signal: AbortSignal.timeout(4000),
    });

    return await res.json();
  }

  async prepareHandoffFile(
    projectPath: string,
    content: string,
    fileName = 'DEADLINE_CONTEXT.md'
  ): Promise<HandoffResult> {
    const res = await fetch(`${this.baseUrl}/workspace/prepare-handoff`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ projectPath, content, fileName }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Failed to write handoff file: HTTP ${res.status}`);
    }

    return await res.json();
  }

  async launchIDE(params: {
    providerId: IDEProviderId;
    projectPath: string;
    command: string;
    args: string[];
    interactive: boolean;
    env?: Record<string, string>;
  }): Promise<LaunchResult> {
    const res = await fetch(`${this.baseUrl}/execute/launch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Failed to launch IDE: HTTP ${res.status}`);
    }

    return await res.json();
  }

  async getSessionStatus(
    sessionId: string,
    pid?: number
  ): Promise<{ isAlive: boolean; status: ExecutionSessionStatus }> {
    const res = await fetch(`${this.baseUrl}/execute/session/${encodeURIComponent(sessionId)}?pid=${pid || ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return { isAlive: false, status: 'completed' };
    }

    return await res.json();
  }

  async stopSession(sessionId: string, pid?: number): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/execute/stop/${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ pid }),
      signal: AbortSignal.timeout(5000),
    });

    return res.ok;
  }

  async inspectWorkspaceChanges(projectPath: string): Promise<WorkspaceChangesResult> {
    const res = await fetch(`${this.baseUrl}/workspace/verify-changes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ projectPath }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return {
        isGitRepo: false,
        modifiedFiles: [],
        untrackedFiles: [],
        deletedFiles: [],
        totalChanges: 0,
        summary: 'Failed to inspect workspace changes.',
      };
    }

    return await res.json();
  }
}

export const localBridgeClient = new LocalBridgeClient();
