/**
 * C2PA Manifest Display Class
 * Handles parsing and displaying C2PA manifest information from DASH player events
 */
class C2PAManifestDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentManifestData = null;
        this.isExpanded = false;
        
        if (!this.container) {
            console.error(`C2PAManifestDisplay: Container with ID '${containerId}' not found`);
            return;
        }
        
        this.initializeDisplay();
    }

    /**
     * Initialize the display container with basic structure
     */
    initializeDisplay() {
        this.container.innerHTML = `
            <section class="c2pa-display-container">
                <div class="c2pa-header">
                    <h2 class="section-title">
                        Content Authenticity
                    </h2>
                    <div class="c2pa-header-buttons">
                        <button class="c2pa-scan-btn" onclick="window.c2paDisplay.scanManifestRecovery()">
                            <svg width="16" height="16" viewBox="0 0 24 24"
                                 fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                            <span>Scan for Manifest Recovery</span>
                        </button>
                        <button class="c2pa-toggle-btn" onclick="window.c2paDisplay.toggleExpanded()">
                            <span class="toggle-text">Show Details</span>
                            <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" 
                                 fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6,9 12,15 18,9"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="c2pa-status">
                    <div class="status-indicator waiting">
                        <svg width="16" height="16" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                    </div>
                    <span class="status-text">Waiting for content verification...</span>
                </div>
                <div class="c2pa-details" style="display: none;">
                    <div class="c2pa-manifest-content">
                        <p class="no-data-message">No manifest data available</p>
                    </div>
                </div>
                
                <!-- Scan Overlay -->
                <div id="c2pa-scan-overlay" style="display: none;">
                    <div class="scan-overlay-content">
                        <div class="scan-loading">
                            <div class="scan-spinner">⟳</div>
                            <h3>Scanning for Manifest Recovery</h3>
                            <p>Analyzing content for authenticity information...</p>
                        </div>
                        <div class="scan-results" style="display: none;">
                            <div class="result-icon">✓</div>
                            <h3>Scan Complete</h3>
                            <div class="hash-display">
                                <span class="hash-label">Hash ID:</span>
                                <span class="hash-value" id="hash-result">000000</span>
                            </div>
                            <div class="similarity-display">
                                <span class="similarity-label">Similarity:</span>
                                <span class="similarity-value" id="similarity-result">0.0%</span>
                            </div>
                            <div class="error-message" style="display: none;" id="error-result">
                                An error occurred during scanning.
                            </div>
                            <button class="scan-close-btn" onclick="window.c2paDisplay.hideScanOverlay()">Close</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        this.addStyles();
    }

    /**
     * Update the display with new C2PA status data from the player
     */
    updateDisplay(c2paStatus) {
        if (!c2paStatus || !this.container) {
            return;
        }

        console.log('[C2PA Display] Updating with status:', c2paStatus);
        this.currentManifestData = c2paStatus;
        
        // Update status indicator
        this.updateStatusIndicator(c2paStatus);
        
        // Update manifest details if expanded
        if (this.isExpanded) {
            this.updateManifestDetails(c2paStatus);
        }
    }

    /**
     * Update the status indicator based on verification results
     */
    updateStatusIndicator(status) {
        const statusIndicator = this.container.querySelector('.status-indicator');
        const statusText = this.container.querySelector('.status-text');
        
        if (!statusIndicator || !statusText) return;

        // Reset classes
        statusIndicator.className = 'status-indicator';
        
        // Check if there are errors indicating no manifest
        const hasManifestErrors = status.details && Object.values(status.details).some(detail => 
            detail.error && (
                detail.error.includes('null manifestStore') || 
                detail.error.includes('No segment found') || 
                detail.error.includes('no validation status available')
            )
        );
        
        if (status.verified === true) {
            statusIndicator.classList.add('verified');
            statusIndicator.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            `;
            statusText.textContent = 'Content authenticity verified.';
        } else if (status.verified === false) {
            statusIndicator.classList.add('failed');
            statusIndicator.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            `;
            statusText.textContent = 'Content authenticity verification failed.';
        } else if (hasManifestErrors) {
            statusIndicator.classList.add('not-found');
            statusIndicator.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4"/>
                    <path d="m12 16 .01 0"/>
                </svg>
            `;
            statusText.textContent = 'No valid C2PA manifest found in this content.';
        } else {
            statusIndicator.classList.add('pending');
            statusIndicator.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
            `;
            statusText.textContent = 'Content verification in progress...';
        }
    }

    /**
     * Update the detailed manifest information
     */
    updateManifestDetails(status) {
        const manifestContent = this.container.querySelector('.c2pa-manifest-content');
        if (!manifestContent) return;

        let html = '<div class="manifest-summary">';
        
        // C2PA Manifest Chain section with toggle
        html += this.generateManifestChainSection(status);

        // Details for each media type
        if (status.details && Object.keys(status.details).length > 0) {
            html += '<div class="manifest-section"><h4>Media Type Details</h4>';
            
            for (const [mediaType, detail] of Object.entries(status.details)) {
                html += this.generateMediaTypeSection(mediaType, detail);
            }
            
            html += '</div>';
        }

        html += '</div>';
        manifestContent.innerHTML = html;
    }

    /**
     * Generate HTML for the C2PA Manifest Chain section
     * @param {Object} status - The C2PA status object containing manifest data
     * @returns {string} HTML string for the manifest chain section
     */
    generateManifestChainSection(status) {
        // Find video manifest for chain analysis (prioritize video over audio as requested)
        let chainManifest = null;
        let manifestCount = 0;
        
        if (status.details) {
            // Prioritize video manifest
            if (status.details.video && status.details.video.manifest) {
                chainManifest = status.details.video.manifest;
            } else if (status.details.audio && status.details.audio.manifest) {
                chainManifest = status.details.audio.manifest;
            }
        }

        // Count manifests - for now we'll show 1 if we have a manifest, 0 if not
        // In a real implementation, you'd count actual chain manifests
        manifestCount = chainManifest ? 1 : 0;
        
        // Extract assertions if available
        let assertions = [];
        if (chainManifest && chainManifest.manifestStore) {
            const manifestStore = chainManifest.manifestStore;
            
            // Look for assertions in various places
            if (manifestStore.assertions) {
                assertions = manifestStore.assertions;
            } else if (manifestStore.claims) {
                // Convert claims to assertion-like format
                assertions = manifestStore.claims.map((claim, index) => ({
                    label: claim.label || `Assertion ${index + 1}`,
                    kind: claim.label || 'unknown',
                    data: claim
                }));
            }
        }

        let html = `<div class="manifest-section">
            <div class="manifest-chain-header">
                <h4>C2PA Manifest Chain</h4>
                <button class="manifest-chain-toggle-btn" 
                        onclick="window.c2paDisplay.toggleManifestChain()">
                    <span class="chain-toggle-text">Show Details</span>
                    <svg class="chain-toggle-icon" width="12" height="12" viewBox="0 0 24 24" 
                         fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6,9 12,15 18,9"/>
                    </svg>
                </button>
            </div>
            <div class="manifest-chain-summary">
                <span class="manifest-count">
                    ${manifestCount} manifest${manifestCount !== 1 ? 's' : ''} in chain.
                </span>
            </div>
            <div class="manifest-chain-details" style="display: none;">`;
        
        if (manifestCount > 0 && assertions.length > 0) {
            html += `<div class="assertions-list">
                <h5>Video Stream Assertions</h5>`;
            
            assertions.forEach((assertion, index) => {
                html += `<div class="assertion-item">
                    <div class="assertion-header">
                        <span class="assertion-number">${index + 1}</span>
                        <span class="assertion-label">
                            ${assertion.label || assertion.kind || 'Unknown Assertion'}
                        </span>
                    </div>`;
                
                if (assertion.data) {
                    html += `<div class="assertion-details">`;
                    
                    // Display assertion details based on available data
                    if (typeof assertion.data === 'object') {
                        for (const [key, value] of Object.entries(assertion.data)) {
                            if (key !== 'label' && value !== null && value !== undefined) {
                                html += `<div class="assertion-property">
                                    <span class="property-name">${key}:</span>
                                    <span class="property-value">${
                                        typeof value === 'object' 
                                            ? this.safeJSONStringify(value, null, 2) 
                                            : value
                                    }</span>
                                </div>`;
                            }
                        }
                    } else {
                        html += `<div class="assertion-property">
                            <span class="property-value">${assertion.data}</span>
                        </div>`;
                    }
                    
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        } else if (manifestCount > 0) {
            html += `<div class="no-assertions">
                <p>No assertions found in the manifest chain.</p>
            </div>`;
        } else {
            html += `<div class="no-chain-data">
                <p>No manifest chain data available.</p>
            </div>`;
        }
        
        html += `</div></div>`;
        
        return html;
    }

    /**
     * Generate HTML for a specific media type section
     * @param {string} mediaType - The media type (e.g., 'video', 'audio')
     * @param {Object} detail - The detail object for this media type
     * @returns {string} HTML string for the media type section
     */
    generateMediaTypeSection(mediaType, detail) {
        let html = `<div class="media-type-section">
            <h5>${mediaType.toUpperCase()} Track</h5>
            <div class="media-details">`;

        // Verification status for this media type
        const verified = detail.verified;
        html += `<div class="detail-item">
            <span class="detail-label">Verified:</span>
            <span class="detail-value ${verified ? 'success' : 'error'}">
                ${verified ? 'Yes' : 'No'}
            </span>
        </div>`;

        // Error information
        if (detail.error) {
            html += `<div class="detail-item">
                <span class="detail-label">Error:</span>
                <span class="detail-value error">${detail.error}</span>
            </div>`;
        }

        // Manifest information
        if (detail.manifest && detail.manifest.manifestStore) {
            const manifest = detail.manifest.manifestStore;
            
            // Validation status
            if (manifest.validationStatus && manifest.validationStatus.length > 0) {
                html += `<div class="detail-item">
                    <span class="detail-label">Validation Issues:</span>
                    <div class="validation-issues">`;
                
                manifest.validationStatus.forEach(issue => {
                    html += `<div class="validation-issue">
                        <strong>Code:</strong> ${issue.code || 'Unknown'}<br>
                        <strong>Explanation:</strong> ${
                            issue.explanation || 'No explanation provided'
                        }
                    </div>`;
                });
                
                html += `</div></div>`;
            }

            // Manifest metadata
            if (manifest.title) {
                html += `<div class="detail-item">
                    <span class="detail-label">Title:</span>
                    <span class="detail-value">${manifest.title}</span>
                </div>`;
            }

            if (manifest.format) {
                html += `<div class="detail-item">
                    <span class="detail-label">Format:</span>
                    <span class="detail-value">${manifest.format}</span>
                </div>`;
            }

            if (manifest.instanceId) {
                html += `<div class="detail-item">
                    <span class="detail-label">Instance ID:</span>
                    <span class="detail-value code">${manifest.instanceId}</span>
                </div>`;
            }

            // Claims information
            if (manifest.claims && manifest.claims.length > 0) {
                html += `<div class="detail-item">
                    <span class="detail-label">Claims:</span>
                    <div class="claims-list">`;
                
                manifest.claims.forEach((claim, index) => {
                    html += `<div class="claim-item">
                        <strong>Claim ${index + 1}:</strong><br>
                        <div class="claim-details">`;
                    
                    if (claim.label) {
                        html += `<div><strong>Label:</strong> ${claim.label}</div>`;
                    }
                    
                    if (claim.signature) {
                        html += `<div><strong>Signature Info:</strong> ${
                            typeof claim.signature === 'string' 
                                ? claim.signature 
                                : 'Present'
                        }</div>`;
                    }
                    
                    html += `</div></div>`;
                });
                
                html += `</div></div>`;
            }

            // Raw manifest data (collapsible)
            html += `<div class="detail-item">
                <span class="detail-label">Raw Manifest:</span>
                <div class="detail-value">
                    <button class="toggle-raw-btn" 
                            onclick="window.c2paDisplay.toggleRawManifest('${mediaType}')">
                        Show Raw Data
                    </button>
                    <pre class="raw-manifest" id="raw-${mediaType}" style="display: none;">
${this.safeJSONStringify(manifest, null, 2)}</pre>
                </div>
            </div>`;
        }

        html += `</div></div>`;
        return html;
    }

    /**
     * Reset the display to initial state
     */
    reset() {
        this.currentManifestData = null;
        this.isExpanded = false;
        this.initializeDisplay();
    }

    /**
     * Toggle expanded view
     */
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        const detailsDiv = this.container.querySelector('.c2pa-details');
        const toggleText = this.container.querySelector('.toggle-text');
        const toggleBtn = this.container.querySelector('.c2pa-toggle-btn');
        
        if (detailsDiv && toggleText && toggleBtn) {
            if (this.isExpanded) {
                detailsDiv.style.display = 'block';
                toggleText.textContent = 'Hide Details';
                toggleBtn.setAttribute('aria-expanded', 'true');
                if (this.currentManifestData) {
                    this.updateManifestDetails(this.currentManifestData);
                }
            } else {
                detailsDiv.style.display = 'none';
                toggleText.textContent = 'Show Details';
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /**
     * Scan for manifest recovery information
     */
    async scanManifestRecovery() {
        console.log('[C2PA Display] Scanning for manifest recovery information...');
        
        // Get the current MPD URL from the input field
        const mpdUrlInput = document.getElementById('mpdUrl');
        const mpdUrl = mpdUrlInput ? mpdUrlInput.value.trim() : '';
        
        // Use the new manifest recovery UI service
        if (window.manifestRecoveryUI) {
            await window.manifestRecoveryUI.startScan(mpdUrl);
        } else {
            this.showAlert('Manifest recovery service not available.', 'error');
        }
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        // Simple alert for now, can be enhanced later
        alert(message);
    }

    /**
     * Toggle raw manifest data visibility
     * @param {string} mediaType - The media type identifier for the raw data
     */
    toggleRawManifest(mediaType) {
        const rawElement = document.getElementById(`raw-${mediaType}`);
        const buttonElement = event.target;
        
        if (rawElement) {
            if (rawElement.style.display === 'none') {
                rawElement.style.display = 'block';
                buttonElement.textContent = 'Hide Raw Data';
            } else {
                rawElement.style.display = 'none';
                buttonElement.textContent = 'Show Raw Data';
            }
        }
    }

    /**
     * Toggle manifest chain details visibility
     */
    toggleManifestChain() {
        const detailsElement = this.container.querySelector('.manifest-chain-details');
        const toggleText = this.container.querySelector('.chain-toggle-text');
        const toggleIcon = this.container.querySelector('.chain-toggle-icon');
        const toggleBtn = this.container.querySelector('.manifest-chain-toggle-btn');

        if (detailsElement && toggleText && toggleIcon && toggleBtn) {
            const isHidden = detailsElement.style.display === 'none';

            if (isHidden) {
                detailsElement.style.display = 'block';
                toggleText.textContent = 'Hide Details';
                toggleIcon.style.transform = 'rotate(180deg)';
                toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                detailsElement.style.display = 'none';
                toggleText.textContent = 'Show Details';
                toggleIcon.style.transform = 'rotate(0deg)';
                toggleBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }

    /**
     * Safe JSON stringify that handles circular references
     * @param {Object} obj - Object to stringify
     * @param {Function} replacer - Replacer function
     * @param {number} space - Indentation spaces
     * @returns {string} Safe JSON string
     */
    safeJSONStringify(obj, replacer, space) {
        const seen = new Set();
        return JSON.stringify(obj, function(key, val) {
            if (val != null && typeof val === "object") {
                if (seen.has(val)) {
                    return "[Circular Reference]";
                }
                seen.add(val);
            }
            return replacer ? replacer(key, val) : val;
        }, space);
    }

    /**
     * Demo function to test the display with mock C2PA data
     */
    showDemo() {
        const mockData = {
            verified: false, // Mixed result: video verified, audio failed
            details: {
                video: {
                    verified: true,
                    manifest: {
                        manifestStore: {
                            title: "IBC 2025 Accelerator Demo Content",
                            format: "video/mp4",
                            instanceId: "ibc2025-c2pa-demo-12345678-1234-5678-9abc-123456789abc",
                            validationStatus: [], // No validation issues for video
                            claims: [
                                {
                                    label: "c2pa.content_credentials",
                                    signature: "Content Authenticity Initiative verified signature"
                                },
                                {
                                    label: "c2pa.creator",
                                    signature: "Created by IBC Accelerator Programme"
                                },
                                {
                                    label: "c2pa.hash",
                                    signature: "SHA-256 content hash verified"
                                }
                            ],
                            assertions: [
                                {
                                    label: "c2pa.actions",
                                    kind: "c2pa.actions.v1",
                                    data: {
                                        actions: [
                                            {
                                                action: "c2pa.created",
                                                when: "2025-01-15T10:30:00Z",
                                                softwareAgent: "IBC Content Creator v1.0"
                                            },
                                            {
                                                action: "c2pa.edited", 
                                                when: "2025-01-15T14:45:00Z",
                                                softwareAgent: "Video Editor Pro v2.1"
                                            }
                                        ]
                                    }
                                },
                                {
                                    label: "c2pa.hash.data",
                                    kind: "c2pa.hash.data.v1",
                                    data: {
                                        algorithm: "SHA-256",
                                        hash: "abc123def456789...",
                                        pad: "0x00"
                                    }
                                },
                                {
                                    label: "c2pa.thumbnail",
                                    kind: "c2pa.thumbnail.claim.jpeg.v1", 
                                    data: {
                                        format: "image/jpeg",
                                        identifier: "jumbf://self#content-thumbnail"
                                    }
                                },
                                {
                                    label: "c2pa.creative.work",
                                    kind: "c2pa.creative.work.v1",
                                    data: {
                                        author: [
                                            {
                                                name: "IBC 2025 Content Team",
                                                identifier: "https://ibc.org/accelerator"
                                            }
                                        ],
                                        datePublished: "2025-01-15",
                                        license: "https://creativecommons.org/licenses/by/4.0/"
                                    }
                                }
                            ]
                        }
                    },
                    error: null
                },
                audio: {
                    verified: false,
                    manifest: {
                        manifestStore: {
                            title: "Demo Audio Track",
                            format: "audio/mp4",
                            instanceId: "ibc2025-audio-87654321-4321-8765-dcba-987654321cba",
                            validationStatus: [
                                {
                                    code: "signing_credential.untrusted",
                                    explanation: "The signing credential chain could not be " +
                                               "validated against known trusted authorities"
                                }
                            ],
                            claims: []
                        }
                    },
                    error: "error code signing_credential.untrusted"
                }
            }
        };
        
        this.updateDisplay(mockData);
        
        // Auto-expand for demo
        if (!this.isExpanded) {
            this.toggleExpanded();
        }
    }

    /**
     * Add CSS styles for the C2PA display
     */
    addStyles() {
        if (document.getElementById('c2pa-display-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'c2pa-display-styles';
        styleSheet.textContent = `
            .c2pa-display-container {
                background: white;
                border-radius: 12px;
                border: 1px solid var(--neutral-200);
                box-shadow: var(--shadow-sm);
                overflow: hidden;
            }

            .c2pa-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid var(--neutral-200);
                background: white;
                color: var(--primary-red);
            }

            .c2pa-header .section-title {
                margin: 0;
                color: var(--primary-red);
                font-weight: 600;
                font-size: 1.125rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .c2pa-header-buttons {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .c2pa-scan-btn {
                background: var(--primary-red);
                border: 1px solid var(--primary-red);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.875rem;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .c2pa-scan-btn:hover {
                background: var(--primary-dark);
                border-color: var(--primary-dark);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(227, 30, 36, 0.2);
            }

            .c2pa-toggle-btn {
                background: white;
                border: 1px solid var(--neutral-300);
                color: var(--neutral-700);
                padding: 0.5rem 1rem;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.875rem;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .c2pa-toggle-btn:hover {
                background: var(--neutral-50);
                border-color: var(--neutral-400);
                transform: translateY(-1px);
            }

            .toggle-icon {
                transition: transform 0.2s;
            }

            .c2pa-toggle-btn[aria-expanded="true"] .toggle-icon {
                transform: rotate(180deg);
            }

            .c2pa-status {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1.5rem;
                background: var(--neutral-50);
                border-bottom: 1px solid var(--neutral-200);
            }

            .status-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .status-indicator.verified {
                background: rgb(16 185 129 / 0.1);
                color: var(--success-green);
                border: 2px solid var(--success-green);
            }

            .status-indicator.failed {
                background: rgb(239 68 68 / 0.1);
                color: var(--error-red);
                border: 2px solid var(--error-red);
            }

            .status-indicator.pending {
                background: rgb(245 158 11 / 0.1);
                color: var(--warning-amber);
                border: 2px solid var(--warning-amber);
            }

            .status-indicator.waiting {
                background: rgb(148 163 184 / 0.1);
                color: var(--neutral-600);
                border: 2px solid var(--neutral-300);
            }

            .status-indicator.not-found {
                background: rgb(99 102 241 / 0.1);
                color: #6366f1;
                border: 2px solid #6366f1;
            }

            .status-indicator.scanning {
                background: rgb(59 130 246 / 0.1);
                color: #3b82f6;
                border: 2px solid #3b82f6;
            }

            .status-indicator.recovery-found {
                background: rgb(245 158 11 / 0.1);
                color: var(--warning-amber);
                border: 2px solid var(--warning-amber);
            }

            .spinning {
                animation: spin 1s linear infinite;
            }

            /* Scan Overlay Styles */
            #c2pa-scan-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            #c2pa-scan-overlay.show {
                opacity: 1;
            }

            .scan-overlay-content {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 550px;
                width: 90%;
                text-align: center;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            #c2pa-scan-overlay.show .scan-overlay-content {
                transform: scale(1);
            }

            .scan-loading h3, .scan-results h3 {
                margin: 1rem 0 0.5rem 0;
                color: var(--neutral-800);
                font-size: 1.25rem;
                font-weight: 600;
            }

            .scan-loading p {
                color: var(--neutral-600);
                margin: 0.5rem 0 0 0;
            }

            .scan-spinner {
                color: var(--primary-red);
                animation: spin 1s linear infinite;
            }

            .result-icon {
                margin-bottom: 1rem;
            }

            .scan-results.success .result-icon {
                color: var(--success-green);
            }

            .scan-results.error .result-icon {
                color: var(--error-red);
            }

            .hash-display, .similarity-display {
                background: var(--neutral-50);
                border: 1px solid var(--neutral-200);
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .hash-label, .similarity-label {
                font-weight: 500;
                color: var(--neutral-700);
            }

            .hash-value {
                font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
                font-size: 1.125rem;
                font-weight: 600;
                color: var(--primary-red);
                background: white;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                border: 1px solid var(--primary-red);
            }

            .similarity-value {
                font-weight: 600;
                color: var(--success-green);
            }

            .error-message {
                color: var(--error-red);
                margin: 1rem 0;
                padding: 1rem;
                background: rgb(239 68 68 / 0.1);
                border: 1px solid rgb(239 68 68 / 0.2);
                border-radius: 8px;
            }

            .scan-close-btn {
                background: var(--primary-red);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 0.75rem 1.5rem;
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                margin-top: 1rem;
            }

            .scan-close-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
            }

            .status-text {
                font-size: 0.9375rem;
                font-weight: 500;
                color: var(--neutral-700);
            }

            .c2pa-details {
                border-top: 1px solid var(--neutral-200);
            }

            .c2pa-manifest-content {
                padding: 1.5rem;
            }

            .no-data-message {
                color: var(--neutral-600);
                font-style: italic;
                text-align: center;
                padding: 2rem;
                margin: 0;
            }

            .manifest-section {
                margin-bottom: 2rem;
            }

            .manifest-section:last-child {
                margin-bottom: 0;
            }

            .manifest-section h4 {
                color: var(--neutral-900);
                font-weight: 600;
                margin-bottom: 1rem;
                font-size: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--neutral-200);
            }

            .manifest-chain-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
            }

            .manifest-chain-header h4 {
                margin-bottom: 0;
                border-bottom: none;
                padding-bottom: 0;
            }

            .manifest-chain-toggle-btn {
                background: var(--neutral-100);
                border: 1px solid var(--neutral-300);
                color: var(--neutral-700);
                padding: 0.375rem 0.75rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 500;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .manifest-chain-toggle-btn:hover {
                background: var(--neutral-200);
                border-color: var(--neutral-400);
            }

            .chain-toggle-icon {
                transition: transform 0.2s;
            }

            .manifest-chain-summary {
                background: var(--neutral-50);
                border: 1px solid var(--neutral-200);
                border-radius: 6px;
                padding: 0.75rem 1rem;
                margin-bottom: 1rem;
            }

            .manifest-count {
                font-size: 0.875rem;
                color: var(--neutral-700);
                font-weight: 500;
            }

            .manifest-chain-details {
                border-top: 1px solid var(--neutral-200);
                padding-top: 1rem;
            }

            .assertions-list h5 {
                color: var(--neutral-800);
                font-weight: 600;
                margin-bottom: 1rem;
                font-size: 0.9375rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid var(--neutral-200);
            }

            .assertion-item {
                background: white;
                border: 1px solid var(--neutral-200);
                border-radius: 8px;
                margin-bottom: 1rem;
                overflow: hidden;
            }

            .assertion-item:last-child {
                margin-bottom: 0;
            }

            .assertion-header {
                background: var(--neutral-50);
                padding: 0.75rem 1rem;
                border-bottom: 1px solid var(--neutral-200);
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .assertion-number {
                background: var(--primary-red);
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
                font-weight: 600;
                flex-shrink: 0;
            }

            .assertion-label {
                font-weight: 500;
                color: var(--neutral-800);
                font-size: 0.875rem;
            }

            .assertion-details {
                padding: 1rem;
            }

            .assertion-property {
                display: grid;
                grid-template-columns: 120px 1fr;
                gap: 0.75rem;
                margin-bottom: 0.75rem;
                align-items: start;
            }

            .assertion-property:last-child {
                margin-bottom: 0;
            }

            .property-name {
                font-weight: 500;
                color: var(--neutral-600);
                font-size: 0.8125rem;
            }

            .property-value {
                font-size: 0.8125rem;
                color: var(--neutral-800);
                word-break: break-word;
                font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
                background: var(--neutral-50);
                padding: 0.375rem 0.5rem;
                border-radius: 4px;
                border: 1px solid var(--neutral-200);
            }

            .no-assertions, .no-chain-data {
                text-align: center;
                padding: 2rem 1rem;
                color: var(--neutral-600);
                font-style: italic;
            }

            .verification-status {
                padding: 1rem 1.5rem;
                border-radius: 8px;
                font-weight: 600;
                text-align: center;
                margin-bottom: 1.5rem;
                font-size: 0.875rem;
            }

            .verification-status.success {
                background: rgb(16 185 129 / 0.1);
                border: 1px solid var(--success-green);
                color: var(--success-green);
            }

            .verification-status.error {
                background: rgb(239 68 68 / 0.1);
                border: 1px solid var(--error-red);
                color: var(--error-red);
            }

            .verification-status.pending {
                background: rgb(245 158 11 / 0.1);
                border: 1px solid var(--warning-amber);
                color: var(--warning-amber);
            }

            .media-type-section {
                background: var(--neutral-50);
                border: 1px solid var(--neutral-200);
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1rem;
            }

            .media-type-section:last-child {
                margin-bottom: 0;
            }

            .media-type-section h5 {
                color: var(--neutral-900);
                font-weight: 600;
                margin-bottom: 1rem;
                font-size: 0.9375rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .media-type-section h5::before {
                content: '';
                width: 8px;
                height: 8px;
                background: var(--primary-red);
                border-radius: 50%;
            }

            .detail-item {
                display: grid;
                grid-template-columns: 140px 1fr;
                gap: 1rem;
                margin-bottom: 1rem;
                align-items: start;
            }

            .detail-item:last-child {
                margin-bottom: 0;
            }

            .detail-label {
                font-weight: 500;
                color: var(--neutral-700);
                font-size: 0.8125rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .detail-value {
                word-break: break-word;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: var(--neutral-800);
            }

            .detail-value.success {
                color: var(--success-green);
                font-weight: 500;
            }

            .detail-value.error {
                color: var(--error-red);
                font-weight: 500;
            }

            .detail-value.code {
                font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
                background: var(--neutral-100);
                padding: 0.5rem;
                border-radius: 6px;
                font-size: 0.75rem;
                border: 1px solid var(--neutral-200);
            }

            .validation-issues {
                background: rgb(239 68 68 / 0.05);
                border: 1px solid rgb(239 68 68 / 0.2);
                border-radius: 8px;
                padding: 1rem;
            }

            .validation-issue {
                margin-bottom: 0.75rem;
                padding: 0.75rem;
                background: white;
                border-radius: 6px;
                font-size: 0.8125rem;
                border: 1px solid rgb(239 68 68 / 0.1);
            }

            .validation-issue:last-child {
                margin-bottom: 0;
            }

            .claims-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .claim-item {
                background: white;
                border: 1px solid var(--neutral-200);
                border-radius: 6px;
                padding: 1rem;
            }

            .claim-details {
                margin-top: 0.5rem;
                font-size: 0.8125rem;
                color: var(--neutral-600);
                line-height: 1.5;
            }

            .toggle-raw-btn {
                background: var(--primary-red);
                border: none;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.75rem;
                font-weight: 500;
                transition: all 0.2s;
                align-self: flex-start;
                margin-top: -7px;
            }

            .toggle-raw-btn:hover {
                background: var(--primary-dark);
                transform: translateY(-1px);
                box-shadow: var(--shadow-sm);
            }

            .raw-manifest {
                background: var(--neutral-900);
                border: 1px solid var(--neutral-700);
                border-radius: 8px;
                padding: 1rem;
                color: #e2e8f0;
                font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
                font-size: 0.75rem;
                overflow-x: auto;
                max-height: 400px;
                overflow-y: auto;
                width: 100%;
                margin-top: 0.75rem;
            }

            /* Animations */
            .animate-spin {
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .c2pa-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 1rem;
                    text-align: center;
                }

                .c2pa-header-buttons {
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: stretch;
                }

                .c2pa-scan-btn,
                .c2pa-toggle-btn {
                    align-self: center;
                    min-width: 200px;
                }

                .manifest-chain-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 0.75rem;
                }

                .manifest-chain-toggle-btn {
                    align-self: center;
                }

                .detail-item {
                    grid-template-columns: 1fr;
                    gap: 0.5rem;
                }

                .assertion-property {
                    grid-template-columns: 1fr;
                    gap: 0.5rem;
                }

                .property-name {
                    font-weight: 600;
                    color: var(--neutral-800);
                }

                .detail-label {
                    font-weight: 600;
                    color: var(--neutral-800);
                }

                .media-type-section {
                    padding: 1rem;
                }

                .c2pa-manifest-content {
                    padding: 1rem;
                }
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .c2pa-display-container {
                    border: 2px solid var(--neutral-800);
                }

                .status-indicator {
                    border-width: 3px;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                .animate-spin {
                    animation: none;
                }

                .c2pa-toggle-btn,
                .toggle-raw-btn,
                .manifest-chain-toggle-btn {
                    transition: none;
                }

                .toggle-icon,
                .chain-toggle-icon {
                    transition: none;
                }
            }
        `;
        
        document.head.appendChild(styleSheet);
    }
}

// Export for use in other modules
export { C2PAManifestDisplay };
