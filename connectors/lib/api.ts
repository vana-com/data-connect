/**
 * DataBridge Connector API
 *
 * This script is injected into webviews to provide the connector API.
 * It communicates with the Rust backend via Tauri's event system.
 */

import type { ConnectorAPI, ConnectorStatus, ConnectorMetadata } from '../types/connector';

// These will be set by the host before injection
declare const __TAURI__: {
  event: {
    emit: (event: string, payload?: unknown) => Promise<void>;
  };
};

// Runtime values injected by the host
declare const __RUN_ID__: string;
declare const __PLATFORM_ID__: string;
declare const __FILENAME__: string;
declare const __COMPANY__: string;
declare const __NAME__: string;
declare const __METADATA__: ConnectorMetadata;

/**
 * Log a message and emit it to the host
 */
function log(...args: unknown[]): void {
  const stringArgs = args.map((arg) =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  );
  console.log('[DataBridge]', ...stringArgs);

  // Emit to host
  if (typeof __TAURI__ !== 'undefined') {
    __TAURI__.event.emit('connector-log', {
      runId: __RUN_ID__,
      message: stringArgs.join(' '),
      timestamp: Date.now(),
    });
  }
}

/**
 * Wait for an element to appear on the page
 */
function waitForElement<T extends boolean = false>(
  selector: string,
  elementName: string,
  multipleElements: T = false as T,
  timeout: number = 10000
): Promise<T extends true ? NodeListOf<Element> | null : Element | null> {
  if (!multipleElements) {
    log(`Waiting for ${elementName}`);
  }

  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkElement = () => {
      const element = multipleElements
        ? document.querySelectorAll(selector)
        : document.querySelector(selector);

      if (element && (multipleElements ? (element as NodeListOf<Element>).length > 0 : true)) {
        if (!multipleElements) {
          log(`Found ${elementName}`);
        }
        resolve(element as T extends true ? NodeListOf<Element> : Element);
      } else if (Date.now() - startTime >= timeout) {
        log(`Timeout waiting for ${elementName}`);
        resolve(null as T extends true ? NodeListOf<Element> | null : Element | null);
      } else {
        setTimeout(checkElement, 100);
      }
    };

    checkElement();
  });
}

/**
 * Wait for a specified number of seconds
 */
async function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

/**
 * Send a status update to the host
 */
function sendStatus(status: ConnectorStatus): void {
  log(`Status: ${typeof status === 'string' ? status : JSON.stringify(status)}`);

  if (typeof __TAURI__ !== 'undefined') {
    __TAURI__.event.emit('connector-status', {
      runId: __RUN_ID__,
      status,
      timestamp: Date.now(),
    });
  }
}

/**
 * Navigate to a URL
 */
function navigate(url: string): void {
  log(`Navigating to: ${url}`);
  window.location.assign(url);
}

/**
 * Get the current run ID
 */
function getRunId(): string {
  return __RUN_ID__;
}

/**
 * Get connector metadata
 */
function getMetadata(): ConnectorMetadata {
  return __METADATA__;
}

// Create the API object
const api: ConnectorAPI = {
  log,
  waitForElement,
  wait,
  sendStatus,
  navigate,
  getRunId,
  getMetadata,
};

// Expose the API globally
(window as typeof window & { __DATABRIDGE_API__: ConnectorAPI }).__DATABRIDGE_API__ = api;
(window as typeof window & { __DATABRIDGE_RUN_ID__: string }).__DATABRIDGE_RUN_ID__ = __RUN_ID__;
(window as typeof window & { __DATABRIDGE_PLATFORM_ID__: string }).__DATABRIDGE_PLATFORM_ID__ = __PLATFORM_ID__;
(window as typeof window & { __DATABRIDGE_FILENAME__: string }).__DATABRIDGE_FILENAME__ = __FILENAME__;
(window as typeof window & { __DATABRIDGE_COMPANY__: string }).__DATABRIDGE_COMPANY__ = __COMPANY__;
(window as typeof window & { __DATABRIDGE_NAME__: string }).__DATABRIDGE_NAME__ = __NAME__;

export { api };
