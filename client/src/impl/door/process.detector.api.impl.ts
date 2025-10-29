import { InvokeType, Protocols } from "@eleapi/base";
import log from 'electron-log';
import { processDetector, ProcessDetector } from "./process.detector";
// Import ProcessDetectorApi from the common directory using a relative path
import { ProcessDetectorApi } from "../../../../common/eleapi/door/process.detector.api";

/**
 * Implementation of the ProcessDetectorApi to control the process detector from the renderer process
 */
export class ProcessDetectorApiImpl extends ProcessDetectorApi {
  getApiName(): string {
    return "ProcessDetectorApi";
  }

  /**
   * Start the process detector
   * @param intervalMs Interval in milliseconds to check for proxy tools
   * @param startDelay Delay in milliseconds before starting the first check
   */
  @InvokeType(Protocols.INVOKE)
  async startDetection(intervalMs?: number, startDelay?: number): Promise<boolean> {
    try {
      log.info(`ProcessDetectorApi.startDetection called with intervalMs=${intervalMs}, startDelay=${startDelay}`);
      
      if (processDetector.isDetectionRunning()) {
        log.info('Process detector is already running, stopping it first');
        processDetector.stop();
      }
      
      if (intervalMs !== undefined && startDelay !== undefined) {
        // Create a new detector with the specified parameters
        log.info(`Creating new ProcessDetector with interval=${intervalMs}ms, startDelay=${startDelay}ms`);
        const detector = new ProcessDetector(intervalMs, startDelay);
        detector.start();
      } else if (intervalMs !== undefined) {
        // Create a new detector with the specified interval and default delay
        log.info(`Creating new ProcessDetector with interval=${intervalMs}ms and default delay`);
        const detector = new ProcessDetector(intervalMs);
        detector.start();
      } else {
        // Use the default detector
        log.info('Starting default ProcessDetector');
        processDetector.start();
      }
      
      log.info(`Process detector started successfully`);
      return true;
    } catch (error) {
      log.error('Failed to start process detector:', error);
      return false;
    }
  }

  /**
   * Stop the process detector
   */
  @InvokeType(Protocols.INVOKE)
  async stopDetection(): Promise<boolean> {
    try {
      log.info('ProcessDetectorApi.stopDetection called');
      
      if (!processDetector.isDetectionRunning()) {
        log.info('Process detector is not running, nothing to stop');
        return true;
      }
      
      processDetector.stop();
      log.info('Process detector stopped successfully');
      return true;
    } catch (error) {
      log.error('Failed to stop process detector:', error);
      return false;
    }
  }

  /**
   * Check if the process detector is currently running
   */
  @InvokeType(Protocols.INVOKE)
  async isDetectionRunning(): Promise<boolean> {
    try {
      const isRunning = processDetector.isDetectionRunning();
      log.info(`ProcessDetectorApi.isDetectionRunning called, result: ${isRunning}`);
      return isRunning;
    } catch (error) {
      log.error('Failed to check if process detector is running:', error);
      return false;
    }
  }
  
  /**
   * Get the list of detected proxy tools (for debugging)
   */
  @InvokeType(Protocols.INVOKE)
  async getDetectedTools(): Promise<string[]> {
    try {
      const tools = processDetector.getDetectedTools();
      log.info(`ProcessDetectorApi.getDetectedTools called, found ${tools.length} tools: ${tools.join(', ')}`);
      return tools;
    } catch (error) {
      log.error('Failed to get detected tools:', error);
      return [];
    }
  }
  
  /**
   * Get diagnostic information about the process detector
   */
  @InvokeType(Protocols.INVOKE)
  async getDiagnosticInfo(): Promise<any> {
    try {
      log.info('ProcessDetectorApi.getDiagnosticInfo called');
      
      const info = {
        isRunning: processDetector.isDetectionRunning(),
        detectedTools: processDetector.getDetectedTools(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        v8Version: process.versions.v8,
        timestamp: new Date().toISOString()
      };
      
      log.info('Diagnostic info collected:', info);
      return info;
    } catch (error) {
      log.error('Failed to get diagnostic info:', error);
      return {
        error: error as string,
        timestamp: new Date().toISOString()
      };
    }
  }
} 