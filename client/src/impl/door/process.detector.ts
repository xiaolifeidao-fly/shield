import { app } from 'electron';
import * as childProcess from 'child_process';
import * as os from 'os';
import log from 'electron-log';

// List of process names to detect (proxy/capture tools)
// 更精确的代理工具列表，避免误判
const PROXY_TOOLS = [
  // Charles Proxy
  'charles',
  'charlesproxy',
  'charles.app',
  
  // Fiddler
  'fiddler',
  'fiddlereverywhere',
  'fiddlercoreservice',
  
  // Burp Suite
  'burp',
  'burpsuite',
  'burpsuitecommunitye',
  'burpsuitepro',
  
  // Proxyman
  'proxyman',
  'proxyman.app',
  
  // Wireshark
  'wireshark',
  'wireshark-gtk',
  'tshark',
  
  // mitmproxy
  'mitmproxy',
  'mitmweb',
  'mitmdump',
  
  // Others
  'anyproxy',
  'whistle',
  'fiddle',
  'zap.jar', // OWASP ZAP
  'owasp-zap',
  'zaproxy',
  'httpproxy'
];

// 需要精确匹配的进程名称（避免部分匹配导致的误判）
const EXACT_MATCH_TOOLS = [
  'proxy',
  'http',
  'web'
];

/**
 * Class to detect proxy/capture tools running on the system
 */
export class ProcessDetector {
  private checkInterval: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private startDelay: number;
  private checkCount: number = 0;
  private detectedTools: string[] = [];
  private isRunning: boolean = false;
  private debugMode: boolean = false;
  private onDetectionCallback: ((tools: string[]) => void) | null = null;

  /**
   * Create a new process detector
   * @param intervalMs Interval in milliseconds to check for proxy tools (default: 10000ms = 10s)
   * @param startDelay Delay in milliseconds before starting the first check (default: 5000ms = 5s)
   * @param debugMode If true, will not exit app when proxy tools are detected (default: false)
   */
  constructor(intervalMs: number = 10000, startDelay: number = 5000, debugMode: boolean = false) {
    this.intervalMs = intervalMs;
    this.startDelay = startDelay;
    this.debugMode = debugMode;
    log.info(`ProcessDetector initialized with interval: ${intervalMs}ms, start delay: ${startDelay}ms, debug mode: ${debugMode}`);
  }

  /**
   * Set a callback function to be called when proxy tools are detected
   * @param callback Function to call with the list of detected tools
   */
  public setDetectionCallback(callback: (tools: string[]) => void): void {
    this.onDetectionCallback = callback;
    log.info('Detection callback set');
  }

  /**
   * Enable or disable debug mode
   * @param enabled Whether debug mode should be enabled
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    log.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Start the periodic detection of proxy tools
   */
  public start(): void {
    if (this.isRunning) {
      log.info('ProcessDetector is already running, ignoring start request');
      return;
    }

    this.isRunning = true;
    log.info(`Starting proxy tool detection service (delay: ${this.startDelay}ms, interval: ${this.intervalMs}ms, debug mode: ${this.debugMode})`);
    log.info(`Process detector will check for these tools: ${PROXY_TOOLS.join(', ')}`);
    log.info(`Process detector will exactly match these tools: ${EXACT_MATCH_TOOLS.join(', ')}`);
    log.info(`Current platform: ${os.platform()}, OS: ${os.type()} ${os.release()}`);
    
    // Delay the first check to allow the app to fully initialize
    log.info(`Delaying first check by ${this.startDelay}ms to allow app to initialize`);
    setTimeout(() => {
      // Run immediately once after delay
      this.checkForProxyTools();
      
      // Then set up the interval
      this.checkInterval = setInterval(() => {
        this.checkForProxyTools();
      }, this.intervalMs);
    }, this.startDelay);
  }

  /**
   * Stop the periodic detection
   */
  public stop(): void {
    if (!this.isRunning) {
      log.info('ProcessDetector is not running, ignoring stop request');
      return;
    }
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    log.info(`Stopped proxy tool detection service after ${this.checkCount} checks`);
  }

  /**
   * Check if the detector is currently running
   */
  public isDetectionRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get list of detected proxy tools (for debugging)
   */
  public getDetectedTools(): string[] {
    return [...this.detectedTools];
  }

  /**
   * Get the number of checks performed
   */
  public getCheckCount(): number {
    return this.checkCount;
  }

  /**
   * Get the detector configuration
   */
  public getConfig(): { intervalMs: number; startDelay: number; debugMode: boolean } {
    return {
      intervalMs: this.intervalMs,
      startDelay: this.startDelay,
      debugMode: this.debugMode
    };
  }

  /**
   * Check for proxy tools based on the current operating system
   */
  private checkForProxyTools(): void {
    try {
      this.checkCount++;
      log.info(`Running proxy tool check #${this.checkCount}`);
      
      const platform = os.platform();
      let proxyToolFound = false;
      
      // Clear previous detections
      this.detectedTools = [];
      
      switch (platform) {
        case 'darwin': // macOS
          proxyToolFound = this.checkMacOS();
          break;
        case 'win32': // Windows
          proxyToolFound = this.checkWindows();
          break;
        case 'linux': // Linux
          proxyToolFound = this.checkLinux();
          break;
        default:
          log.warn(`Unsupported platform for proxy tool detection: ${platform}`);
          return;
      }

      if (proxyToolFound) {
        log.warn(`Proxy/capture tools detected: ${this.detectedTools.join(', ')}`);
        
        // Call detection callback if set
        if (this.onDetectionCallback) {
          log.info('Calling detection callback');
          this.onDetectionCallback(this.detectedTools);
        }
        
        if (this.debugMode) {
          log.warn('Debug mode is enabled, not exiting application');
        } else {
          log.warn('Exiting application for security reasons.');
          this.exitApp();
        }
      } else {
        log.info(`Check #${this.checkCount} completed: No proxy tools detected`);
      }
    } catch (error) {
      log.error(`Error checking for proxy tools (check #${this.checkCount}):`, error);
    }
  }

  /**
   * Check if a process name matches any of the proxy tools
   * @param processName The process name to check
   * @returns true if the process name matches a proxy tool
   */
  private matchesProxyTool(processName: string): boolean {
    const lowerProcessName = processName.toLowerCase();
    
    // Check for exact matches first (to avoid false positives)
    if (EXACT_MATCH_TOOLS.includes(lowerProcessName)) {
      log.warn(`Exact match found for process: ${processName}`);
      this.detectedTools.push(processName);
      return true;
    }
    
    // Check for partial matches in the main list
    for (const tool of PROXY_TOOLS) {
      if (lowerProcessName.includes(tool.toLowerCase())) {
        log.warn(`Proxy tool match found: ${tool} in process: ${processName}`);
        this.detectedTools.push(tool);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for proxy tools on macOS
   * @returns true if a proxy tool was found
   */
  private checkMacOS(): boolean {
    try {
      // Use ps command to list all processes
      log.info('Running macOS process check: ps -A -o comm');
      const output = childProcess.execSync('ps -A -o comm').toString();
      log.debug(`Process list length: ${output.length} characters`);
      
      // For debugging, log all processes
      const processes = output.split('\n').filter(p => p.trim().length > 0);
      log.debug(`Found ${processes.length} processes running`);
      
      // Check each process against the proxy tool lists
      let found = false;
      for (const process of processes) {
        if (this.matchesProxyTool(process.trim())) {
          found = true;
          // Continue checking to find all matching tools
        }
      }
      
      return found;
    } catch (error) {
      log.error('Error checking macOS processes:', error);
      return false;
    }
  }

  /**
   * Check for proxy tools on Windows
   * @returns true if a proxy tool was found
   */
  private checkWindows(): boolean {
    try {
      // Use tasklist to get all running processes
      log.info('Running Windows process check: tasklist /FO CSV');
      const output = childProcess.execSync('tasklist /FO CSV').toString();
      log.debug(`Process list length: ${output.length} characters`);
      
      // Parse CSV format (skip header row)
      const lines = output.split('\n').slice(1);
      log.debug(`Found ${lines.length} processes running`);
      
      // Process format is: "Image Name","PID","Session Name","Session#","Mem Usage"
      let found = false;
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Extract process name from CSV format
        const match = line.match(/"([^"]+)"/);
        if (match && match[1]) {
          const processName = match[1].replace('.exe', ''); // Remove .exe extension
          
          if (this.matchesProxyTool(processName)) {
            found = true;
            // Continue checking to find all matching tools
          }
        }
      }
      
      return found;
    } catch (error) {
      log.error('Error checking Windows processes:', error);
      return false;
    }
  }

  /**
   * Check for proxy tools on Linux
   * @returns true if a proxy tool was found
   */
  private checkLinux(): boolean {
    try {
      // Use ps command to list all processes
      log.info('Running Linux process check: ps -e -o comm');
      const output = childProcess.execSync('ps -e -o comm').toString();
      log.debug(`Process list length: ${output.length} characters`);
      
      // For debugging, log all processes
      const processes = output.split('\n').filter(p => p.trim().length > 0);
      log.debug(`Found ${processes.length} processes running`);
      
      // Check each process against the proxy tool lists
      let found = false;
      for (const process of processes) {
        if (this.matchesProxyTool(process.trim())) {
          found = true;
          // Continue checking to find all matching tools
        }
      }
      
      return found;
    } catch (error) {
      log.error('Error checking Linux processes:', error);
      return false;
    }
  }

  /**
   * Run a manual check for proxy tools
   * @returns List of detected proxy tools
   */
  public runManualCheck(): string[] {
    log.info('Running manual proxy tool check');
    this.detectedTools = [];
    
    try {
      const platform = os.platform();
      
      switch (platform) {
        case 'darwin': // macOS
          this.checkMacOS();
          break;
        case 'win32': // Windows
          this.checkWindows();
          break;
        case 'linux': // Linux
          this.checkLinux();
          break;
        default:
          log.warn(`Unsupported platform for proxy tool detection: ${platform}`);
      }
      
      if (this.detectedTools.length > 0) {
        log.warn(`Manual check detected proxy tools: ${this.detectedTools.join(', ')}`);
      } else {
        log.info('Manual check completed: No proxy tools detected');
      }
      
      return [...this.detectedTools];
    } catch (error) {
      log.error('Error running manual check for proxy tools:', error);
      return [];
    }
  }

  /**
   * Exit the application
   */
  private exitApp(): void {
    // Stop the interval first
    this.stop();
    
    // Log detailed information before exiting
    log.warn('Application exit triggered by ProcessDetector');
    log.warn(`Detected proxy tools: ${this.detectedTools.join(', ')}`);
    log.warn(`Total checks performed: ${this.checkCount}`);
    log.warn('Exiting with code 1');
    
    // Exit the app
    app.exit(1);
  }
}

// Export a singleton instance with 10s interval, 5s startup delay, and debug mode disabled
export const processDetector = new ProcessDetector(10000, 5000, false); 