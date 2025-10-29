import { BrowserContext } from "playwright-core"

export async function injectAntiDetectionScripts(context: BrowserContext) {
        // 增强版反检测脚本 - 针对持久化上下文优化  
        const antiDetectionScript = `
        // 立即执行，确保在其他脚本运行前就隐藏自动化痕迹
        (function() {
            'use strict';
            
            // 1. 彻底隐藏webdriver属性（最重要）
            delete Object.getPrototypeOf(navigator).webdriver;
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                set: () => {},
                configurable: false,
                enumerable: false
            });
        
        // 2. 删除selenium相关属性
        delete window.navigator.__webdriver_script_fn;
        delete window.navigator.__selenium_unwrapped;
        delete window.navigator.__webdriver_unwrapped;
        delete window.navigator.__driver_evaluate;
        delete window.navigator.__webdriver_evaluate;
        delete window.navigator.__selenium_evaluate;
        delete window.navigator.__fxdriver_evaluate;
        delete window.navigator.__driver_unwrapped;
        delete window.navigator.__fxdriver_unwrapped;
        delete window.navigator.__webdriver_script_func;
        
        // 3. 重写plugins（更真实的插件列表）
        Object.defineProperty(navigator, 'plugins', {
            get: function() {
                return [
                    {
                        0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
                        description: "Portable Document Format",
                        filename: "internal-pdf-viewer",
                        length: 1,
                        name: "Chrome PDF Plugin"
                    },
                    {
                        0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
                        description: "",
                        filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
                        length: 1,
                        name: "Chrome PDF Viewer"
                    },
                    {
                        0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
                        1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin},
                        description: "",
                        filename: "internal-nacl-plugin",
                        length: 2,
                        name: "Native Client"
                    }
                ];
            },
            configurable: true
        });
        
        // 4. 重写languages
        Object.defineProperty(navigator, 'languages', {
            get: function() {
                return ['zh-CN', 'zh', 'en-US', 'en'];
            },
            configurable: true
        });
        
        // 5. 伪装chrome对象（更完整）
        if (!window.chrome) {
            window.chrome = {};
        }
        
        if (!window.chrome.runtime) {
            window.chrome.runtime = {
                onConnect: {
                    addListener: function() {},
                    hasListener: function() { return false; },
                    hasListeners: function() { return false; }
                },
                connect: function() {
                    return {
                        onMessage: { addListener: function() {} },
                        postMessage: function() {},
                        disconnect: function() {}
                    };
                },
                sendMessage: function() {},
                getManifest: function() {
                    return {
                        name: "Chrome",
                        version: "120.0.0.0"
                    };
                }
            };
        }
        
        // 6. 伪装权限API
        if (!navigator.permissions) {
            navigator.permissions = {
                query: function() {
                    return Promise.resolve({state: 'granted'});
                }
            };
        }
        
        // 7. 重写toString方法
        const originalToString = Function.prototype.toString;
        Function.prototype.toString = function() {
            if (this === navigator.permissions.query) {
                return 'function query() { [native code] }';
            }
            return originalToString.call(this);
        };
        
        // 8. 添加更多navigator属性
        Object.defineProperty(navigator, 'platform', {
            get: function() { return 'Win32'; },
            configurable: true
        });
        
        Object.defineProperty(navigator, 'productSub', {
            get: function() { return '20030107'; },
            configurable: true
        });
        
        Object.defineProperty(navigator, 'vendor', {
            get: function() { return 'Google Inc.'; },
            configurable: true
        });
        
        Object.defineProperty(navigator, 'vendorSub', {
            get: function() { return ''; },
            configurable: true
        });
        
        Object.defineProperty(navigator, 'appCodeName', {
            get: function() { return 'Mozilla'; },
            configurable: true
        });
        
        Object.defineProperty(navigator, 'appName', {
            get: function() { return 'Netscape'; },
            configurable: true
        });
        
        Object.defineProperty(navigator, 'appVersion', {
            get: function() { return '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'; },
            configurable: true
        });
        
        // 9. 模拟真实的屏幕指纹
        Object.defineProperty(screen, 'availHeight', {
            get: function() { return 738; },
            configurable: true
        });
        
        Object.defineProperty(screen, 'availWidth', {
            get: function() { return 1366; },
            configurable: true
        });
        
        Object.defineProperty(screen, 'colorDepth', {
            get: function() { return 24; },
            configurable: true
        });
        
        Object.defineProperty(screen, 'pixelDepth', {
            get: function() { return 24; },
            configurable: true
        });
        
        // 10. 伪装WebGL指纹
        if (window.WebGLRenderingContext) {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel(R) Iris(R) Xe Graphics';
                }
                return getParameter.call(this, parameter);
            };
        }
        
        // 11. 隐藏自动化相关的window属性
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
        
        // 12. 伪装MouseEvent
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'mousedown' || type === 'mouseup' || type === 'click') {
                // 添加随机的isTrusted属性
                const originalListener = listener;
                const wrappedListener = function(event) {
                    Object.defineProperty(event, 'isTrusted', {
                        get: function() { return true; },
                        configurable: true
                    });
                    return originalListener.call(this, event);
                };
                return originalAddEventListener.call(this, type, wrappedListener, options);
            }
            return originalAddEventListener.call(this, type, listener, options);
        };
        
        // 13. 模拟电池API
        if (!navigator.getBattery) {
            navigator.getBattery = function() {
                return Promise.resolve({
                    charging: true,
                    chargingTime: 0,
                    dischargingTime: Infinity,
                    level: 1
                });
            };
        }
        
        // 14. 设置真实的时区
        try {
            Object.defineProperty(Date.prototype, 'getTimezoneOffset', {
                value: function() { return -480; }, // UTC+8 北京时间
                configurable: true
            });
        } catch(e) {}
        
                 console.log('🛡️ 反检测脚本已加载完成');
         
         // 监听页面加载，确保反检测持续生效
         if (document.readyState === 'loading') {
             document.addEventListener('DOMContentLoaded', function() {
                 // 页面加载后再次确认关键属性
                 if (navigator.webdriver !== undefined) {
                     Object.defineProperty(navigator, 'webdriver', {
                         get: () => undefined,
                         configurable: false
                     });
                 }
             });
         }
         
        })(); // 立即执行函数结束
         `
        // 在每个页面加载前注入脚本
        await context.addInitScript(antiDetectionScript)
}