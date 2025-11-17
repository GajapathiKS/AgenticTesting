export interface ConsoleLogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface NetworkEvent {
  url: string;
  method: string;
  status: number;
  timestamp: number;
  errorText?: string;
}

export interface ObservedState {
  url: string;
  title: string;
  domSnapshot: string;
  ariaSnapshot: string;
  visibleText: string[];
  consoleLogs: ConsoleLogEntry[];
  networkEvents: NetworkEvent[];
  timestamp: number;
}
