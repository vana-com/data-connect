/**
 * DataConnect Connector Type Definitions
 *
 * These types define the interface for building connectors that export
 * data from various platforms.
 */

/** Status types that connectors can send to the host */
export type ConnectorStatus =
  | 'CONNECT_WEBSITE'   // User needs to log in
  | 'DOWNLOADING'       // Export has started, waiting for download
  | 'COMPLETE'          // Export completed successfully
  | 'ERROR'             // An error occurred
  | { data: unknown };  // Custom status with data

/** Scope definition for a connector */
export interface ConnectorScope {
  scope: string;
  label: string;
  description: string;
}

/** Metadata structure for connector definition files */
export interface ConnectorMetadata {
  /** Unique identifier for the connector (e.g., 'chatgpt-001') */
  id?: string;
  /** Display name of the platform */
  name: string;
  /** Company/organization that owns the platform */
  company?: string;
  /** Description of what the connector exports */
  description: string;
  /** URL to navigate to for connecting/logging in */
  connectURL: string;
  /** CSS selector to check if user is logged in */
  connectSelector: string;
  /** How often exports should be refreshed */
  exportFrequency?: 'daily' | 'weekly' | 'monthly';
  /** Data scopes this connector supports */
  scopes?: ConnectorScope[];
  /** Configuration for vectorization */
  vectorize_config?: {
    documents?: string;
    [key: string]: unknown;
  };
}

/** API interface injected into connectors */
export interface ConnectorAPI {
  /**
   * Log a message to the connector console
   * @param args - Arguments to log
   */
  log(...args: unknown[]): void;

  /**
   * Wait for an element to appear on the page
   * @param selector - CSS selector for the element
   * @param elementName - Human-readable name for logging
   * @param multipleElements - If true, returns NodeList instead of single element
   * @param timeout - Timeout in milliseconds (default: 10000)
   * @returns The found element(s) or null if timeout
   */
  waitForElement<T extends boolean = false>(
    selector: string,
    elementName: string,
    multipleElements?: T,
    timeout?: number
  ): Promise<T extends true ? NodeListOf<Element> | null : Element | null>;

  /**
   * Wait for a specified number of seconds
   * @param seconds - Number of seconds to wait
   */
  wait(seconds: number): Promise<void>;

  /**
   * Send a status update to the host
   * @param status - The status to send
   */
  sendStatus(status: ConnectorStatus): void;

  /**
   * Navigate to a URL
   * @param url - URL to navigate to
   */
  navigate(url: string): void;

  /**
   * Get the current run ID
   */
  getRunId(): string;

  /**
   * Get connector metadata
   */
  getMetadata(): ConnectorMetadata;
}

/** Main connector function signature */
export type ConnectorFunction = (
  api: ConnectorAPI,
  runId: string,
  platformId: string,
  filename: string,
  company: string,
  name: string
) => Promise<ConnectorStatus>;

/** Connector module export */
export interface ConnectorModule {
  default: ConnectorFunction;
  metadata?: ConnectorMetadata;
}

/** Global augmentation for the injected API */
declare global {
  interface Window {
    __DATACONNECT_API__: ConnectorAPI;
    __DATACONNECT_RUN_ID__: string;
    __DATACONNECT_PLATFORM_ID__: string;
    __DATACONNECT_FILENAME__: string;
    __DATACONNECT_COMPANY__: string;
    __DATACONNECT_NAME__: string;
  }
}

export {};
