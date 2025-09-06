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
            return {
                success: false,
                error: error.message || 'Failed to connect to manifest recovery service'
            };
        }
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
}

/**
 * Manifest Recovery UI Controller
 * Handles the overlay display and user interactions
 */
class ManifestRecoveryUI {
    constructor() {
        this.service = new ManifestRecoveryService();
        this.overlayId = 'c2pa-scan-overlay';
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
            const results = await this.service.scanForManifestRecovery(mpdUrl);
            
            // Show results
            this.showResults(results);
            
        } catch (error) {
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
        const overlay = document.getElementById(this.overlayId);
        if (!overlay) return;
        
        const content = overlay.querySelector('.scan-overlay-content');
        if (!content) return;
        
        if (results.success) {
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
