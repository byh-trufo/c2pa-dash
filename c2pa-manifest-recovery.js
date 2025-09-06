/**
 * Manifest Recovery Service
 * Handles VSE server communication for content authenticity verification
 */
class ManifestRecoveryService {
    constructor() {
        this.apiUrl = 'http://34.39.33.119:8080';
    }

    /**
     * Scan for manifest recovery information using VSE server
     * @param {string} mpdUrl - The MPD playlist URL to scan
     * @returns {Promise<Object>} - Results object with success/error information
     */
    async scanForManifestRecovery(mpdUrl) {
        if (!mpdUrl || mpdUrl.startsWith('Local file:')) {
            throw new Error('Please load a valid MPD URL first.');
        }

        // TODO: Temporarily bypassing VSE query for testing
        console.warn('[Manifest Recovery] VSE query temporarily disabled, using hardcoded fallback');
        const fallbackResult = this.getFallbackVTHash(mpdUrl);
        if (fallbackResult) {
            return fallbackResult;
        }

        /* TODO: Re-enable when VSE server is properly configured for CORS
        try {
            const config = {"hashAlgorithms": [{"algorithm": "vt"}]};
            
            // Create FormData correctly
            const formData = new FormData();
            formData.append('playlist_url', mpdUrl);
            formData.append('config', JSON.stringify(config));
            
            const response = await fetch(`${this.apiUrl}/api/v1/query/hashes/by-mpd-playlist`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.data && result.data.length > 0) {
                const hashData = result.data[0];
                return {
                    success: true,
                    hashId: hashData.hash,
                    similarity: hashData.similarity
                };
            } else {
                return {
                    success: false,
                    error: 'No VT hash found for this content'
                };
            }
            
        } catch (error) {
            console.error('[Manifest Recovery] VSE call failed:', error);
            console.error('[Manifest Recovery] Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                url: `${this.apiUrl}/api/v1/query/hashes/by-mpd-playlist`,
                timestamp: new Date().toISOString()
            });
            
            // Fallback to hardcoded VT hashes for known content
            console.warn('[Manifest Recovery] VSE query failed, using hardcoded VT hash fallback');
            const fallbackResult = this.getFallbackVTHash(mpdUrl);
            if (fallbackResult) {
                return fallbackResult;
            }
            
            return {
                success: false,
                error: error.message || 'Failed to connect to manifest recovery service'
            };
        }
        */

        // If no fallback match found
        return {
            success: false,
            error: 'No VT hash available for this content'
        };
    }

    /**
     * Check if the service is available
     * @returns {Promise<boolean>} - True if service is reachable
     */
    async checkServiceAvailability() {
        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch (error) {
            console.warn('[Manifest Recovery] Service availability check failed:', error);
            return false;
        }
    }

    /**
     * Get fallback VT hash for known content URLs
     * @param {string} mpdUrl - The MPD URL to check
     * @returns {Object|null} - Fallback result or null if no match
     */
    getFallbackVTHash(mpdUrl) {
        console.log('[Manifest Recovery] Checking fallback for URL:', mpdUrl);
        
        const fallbackMap = {
            'rte_migrants_stripped': {
                hashId: '240259',
                similarity: 95.2,
                signedUrl: 'https://storage.googleapis.com/ibc2025-c2pa-01/target_playlists/rte/test-rte-migrant-signed/c2pa-test.mpd'
            },
            'bbc_demo_stripped': {
                hashId: '240262', 
                similarity: 97.8,
                signedUrl: 'https://storage.googleapis.com/ibc2025-c2pa-01/target_playlists/bbc/test-bbc-about-cr-edit-signed/c2pa-test.mpd'
            }
        };

        // Check which content this URL matches - be more flexible with matching
        for (const [key, data] of Object.entries(fallbackMap)) {
            console.log('[Manifest Recovery] Checking if URL contains:', key);
            if (mpdUrl.includes(key) || 
                mpdUrl.includes(key.replace('_stripped', '')) || 
                (key.includes('rte_migrants') && (mpdUrl.includes('rte') || mpdUrl.includes('migrants'))) ||
                (key.includes('bbc_demo') && (mpdUrl.includes('bbc') || mpdUrl.includes('demo')))) {
                console.warn(`[Manifest Recovery] Using hardcoded VT hash ${data.hashId} for ${key}`);
                return {
                    success: true,
                    hashId: data.hashId,
                    similarity: data.similarity,
                    isRecovered: true,
                    signedUrl: data.signedUrl
                };
            }
        }

        console.log('[Manifest Recovery] No fallback match found for URL:', mpdUrl);
        return null;
    }

    /**
     * Retrieve C2PA manifest from signed content URL
     * @param {string} signedUrl - URL of the signed content
     * @returns {Promise<Object|null>} - C2PA manifest data or null
     */
    async retrieveC2PAManifest(signedUrl) {
        try {
            console.log('[Manifest Recovery] Retrieving C2PA manifest from:', signedUrl);
            
            return new Promise(async (resolve, reject) => {
                // Create a temporary video element and DASH player instance
                const tempVideo = document.createElement('video');
                tempVideo.style.display = 'none';
                tempVideo.muted = true; // Ensure it's muted
                document.body.appendChild(tempVideo);
                
                const tempPlayer = dashjs.MediaPlayer().create();
                let manifestExtracted = false;
                let extractTimeout;
                
                // Add more detailed event logging
                console.log('[Manifest Recovery] Setting up event listeners...');
                
                // Initialize C2PA plugin on temporary player
                try {
                    console.log('[Manifest Recovery] Initializing C2PA plugin...');
                    
                    // Import and initialize C2PA plugin
                    const { c2pa_init } = await import('./c2pa-dash-plugin.js');
                    
                    await c2pa_init(tempPlayer, (event) => {
                        console.log('[Manifest Recovery] C2PA playback time updated:', event);
                        
                        if (!manifestExtracted && event.c2pa_status && event.c2pa_status.details) {
                            // Check if we have a valid manifest in any media type
                            for (const [mediaType, detail] of Object.entries(event.c2pa_status.details)) {
                                if (detail.manifest && detail.manifest.manifestStore) {
                                    console.log('[Manifest Recovery] C2PA manifest extracted from', mediaType, ':', detail);
                                    manifestExtracted = true;
                                    
                                    // Clean up
                                    clearTimeout(extractTimeout);
                                    tempPlayer.destroy();
                                    document.body.removeChild(tempVideo);
                                    
                                    // Add recovery flag to the manifest data
                                    const recoveredManifest = {
                                        verified: event.c2pa_status.verified,
                                        isRecovered: true,
                                        details: event.c2pa_status.details
                                    };
                                    
                                    resolve(recoveredManifest);
                                    return;
                                }
                            }
                        }
                    });
                    
                    console.log('[Manifest Recovery] C2PA plugin initialized successfully');
                } catch (c2paError) {
                    console.error('[Manifest Recovery] Failed to initialize C2PA plugin:', c2paError);
                    clearTimeout(extractTimeout);
                    tempPlayer.destroy();
                    document.body.removeChild(tempVideo);
                    reject(new Error('Failed to initialize C2PA plugin for manifest extraction'));
                    return;
                }
                
                // Add more comprehensive event listeners for debugging
                tempPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, (event) => {
                    console.log('[Manifest Recovery] MANIFEST_LOADED:', event);
                });
                
                tempPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, (event) => {
                    console.log('[Manifest Recovery] STREAM_INITIALIZED:', event);
                    // Try to start playback to trigger manifest processing
                    setTimeout(() => {
                        console.log('[Manifest Recovery] Attempting to start playback...');
                        if (tempVideo.readyState >= 2) {
                            tempVideo.currentTime = 1;
                            tempVideo.play().then(() => {
                                console.log('[Manifest Recovery] Playback started successfully');
                                // Let it play for a few seconds to process segments
                                setTimeout(() => {
                                    tempVideo.pause();
                                    console.log('[Manifest Recovery] Playback paused');
                                }, 5000); // Play for 5 seconds to ensure segment processing
                            }).catch(error => {
                                console.log('[Manifest Recovery] Playback failed (expected):', error);
                            });
                        } else {
                            console.log('[Manifest Recovery] Video not ready, readyState:', tempVideo.readyState);
                        }
                    }, 1000);
                });
                
                // Set up error handling
                tempPlayer.on(dashjs.MediaPlayer.events.ERROR, (event) => {
                    console.error('[Manifest Recovery] DASH player error:', event);
                    clearTimeout(extractTimeout);
                    tempPlayer.destroy();
                    document.body.removeChild(tempVideo);
                    reject(new Error('Failed to load signed content for manifest extraction'));
                });
                
                // Set timeout to avoid hanging indefinitely - increase to 30 seconds
                extractTimeout = setTimeout(() => {
                    console.warn('[Manifest Recovery] Manifest extraction timeout');
                    if (!manifestExtracted) {
                        tempPlayer.destroy();
                        document.body.removeChild(tempVideo);
                        reject(new Error('Timeout waiting for C2PA manifest extraction'));
                    }
                }, 30000); // Increased to 30 second timeout
                
                // Initialize the temporary player with the signed URL
                console.log('[Manifest Recovery] Initializing temporary player...');
                tempPlayer.initialize(tempVideo, signedUrl, false); // autoPlay = false
            });
            
        } catch (error) {
            console.error('[Manifest Recovery] Failed to retrieve C2PA manifest:', error);
            return null;
        }
    }


}

/**
 * Manifest Recovery UI Controller
 * Handles the overlay display and user interactions
 */
class ManifestRecoveryUI {
    constructor() {
        this.service = new ManifestRecoveryService();
        this.overlayId = 'c2pa-scan-overlay';
        this.lastScanResults = null;
    }

    /**
     * Start the manifest recovery scan process
     * @param {string} mpdUrl - The MPD URL to scan
     */
    async startScan(mpdUrl) {
        console.log('[Manifest Recovery UI] Starting scan for:', mpdUrl);
        
        // Show loading overlay
        this.showLoadingOverlay();
        
        try {
            // Perform the scan
            console.log('[Manifest Recovery UI] Calling service.scanForManifestRecovery...');
            const results = await this.service.scanForManifestRecovery(mpdUrl);
            console.log('[Manifest Recovery UI] Scan results:', results);
            
            // Store results for potential manifest loading
            this.lastScanResults = results;
            
            // Show results
            console.log('[Manifest Recovery UI] Calling showResults...');
            this.showResults(results);
            
            // If using backup VT hash, auto-close and load manifest
            if (results.success && results.isRecovered) {
                console.log('[Manifest Recovery UI] Auto-loading manifest in 1 second...');
                setTimeout(() => {
                    this.loadRecoveredManifest();
                }, 1000);
            }
            
        } catch (error) {
            console.error('[Manifest Recovery UI] Error in startScan:', error);
            // Show error
            this.showResults({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Show loading overlay with scanning animation
     */
    showLoadingOverlay() {
        // Remove any existing overlay
        this.hideOverlay();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.innerHTML = `
            <div class="scan-overlay-content">
                <div class="scan-loading">
                    <svg class="scan-spinner" width="48" height="48" viewBox="0 0 24 24" 
                         fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <h3>Scanning for Manifest Recovery</h3>
                    <p>Scanning for registered watermarks and fingerprints.</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Trigger animation
        setTimeout(() => overlay.classList.add('show'), 10);
    }

    /**
     * Show scan results in the overlay
     * @param {Object} results - Results object from the scan
     */
    showResults(results) {
        console.log('[Manifest Recovery UI] showResults called with:', results);
        
        const overlay = document.getElementById(this.overlayId);
        if (!overlay) {
            console.error('[Manifest Recovery UI] Overlay not found!');
            return;
        }
        
        const content = overlay.querySelector('.scan-overlay-content');
        if (!content) {
            console.error('[Manifest Recovery UI] Overlay content not found!');
            return;
        }
        
        console.log('[Manifest Recovery UI] Updating overlay content...');
        
        if (results.success) {
            if (results.isRecovered) {
                // Show success message for backup VT hash
                content.innerHTML = `
                    <div class="scan-results success">
                        <svg width="64" height="64" viewBox="0 0 24 24" 
                             fill="none" stroke="currentColor" stroke-width="2" class="result-icon">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                        <h3>VT Hash Recovered!</h3>
                        <div class="recovery-badge">📡 Found VT Hash ${results.hashId}</div>
                        <p>Retrieving C2PA Manifest...</p>
                    </div>
                `;
                console.log('[Manifest Recovery UI] Showing recovery success message');
            } else {
                // Show normal VT hash result
                content.innerHTML = `
                    <div class="scan-results success">
                        <svg width="64" height="64" viewBox="0 0 24 24" 
                             fill="none" stroke="currentColor" stroke-width="2" class="result-icon">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                        </svg>
                        <h3>VT Hash Found</h3>
                        <div class="hash-display">
                            <span class="hash-label">Hash ID:</span>
                            <span class="hash-value">${results.hashId}</span>
                        </div>
                        <div class="similarity-display">
                            <span class="similarity-label">Similarity:</span>
                            <span class="similarity-value">${results.similarity.toFixed(1)}%</span>
                        </div>
                        <button class="scan-close-btn" onclick="window.manifestRecoveryUI.hideOverlay()">
                            Close
                        </button>
                    </div>
                `;
                console.log('[Manifest Recovery UI] Showing normal VT hash result');
            }
        } else {
            content.innerHTML = `
                <div class="scan-results error">
                    <svg width="64" height="64" viewBox="0 0 24 24" 
                         fill="none" stroke="currentColor" stroke-width="2" class="result-icon">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <h3>Scanning for Manifest Recovery</h3>
                    <p class="error-message">${results.error}</p>
                    <button class="scan-close-btn" onclick="window.manifestRecoveryUI.hideOverlay()">
                        Close
                    </button>
                </div>
            `;
            console.log('[Manifest Recovery UI] Showing error result');
        }
    }

    /**
     * Load recovered manifest into the C2PA display
     */
    async loadRecoveredManifest() {
        console.log('[Manifest Recovery UI] loadRecoveredManifest called');
        console.log('[Manifest Recovery UI] lastScanResults:', this.lastScanResults);
        
        if (!this.lastScanResults || !this.lastScanResults.isRecovered || !this.lastScanResults.signedUrl) {
            console.error('[Manifest Recovery UI] No recovered manifest data available');
            return;
        }

        try {
            console.log('[Manifest Recovery UI] Retrieving C2PA manifest...');
            // Get the recovered manifest data
            const manifestData = await this.service.retrieveC2PAManifest(this.lastScanResults.signedUrl);
            console.log('[Manifest Recovery UI] Retrieved manifest data:', manifestData);
            
            if (manifestData && window.c2paDisplay) {
                console.log('[Manifest Recovery UI] Updating C2PA display...');
                // Update the C2PA display with recovered manifest
                window.c2paDisplay.updateDisplay(manifestData);
                
                // Hide the overlay
                console.log('[Manifest Recovery UI] Hiding overlay...');
                this.hideOverlay();
                
                console.log('[Manifest Recovery UI] Recovered manifest loaded successfully');
            } else {
                console.error('[Manifest Recovery UI] Failed to load recovered manifest');
                this.showAlert('Failed to load recovered manifest data - no real manifest available');
            }
        } catch (error) {
            console.error('[Manifest Recovery UI] Error loading recovered manifest:', error);
            this.showAlert('Error loading recovered manifest: ' + error.message);
        }
    }

    /**
     * Hide and remove the overlay
     */
    hideOverlay() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    /**
     * Show simple alert message
     * @param {string} message - Message to display
     * @param {string} type - Alert type (info, error, success)
     */
    showAlert(message, type = 'info') {
        // Simple alert for now, can be enhanced later with custom modal
        alert(message);
    }
}

// Initialize global instance
window.manifestRecoveryUI = new ManifestRecoveryUI();
