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
            <div class="c2pa-display-container">
                <div class="c2pa-header">
                    <h3>🔐 C2PA Content Authenticity</h3>
                    <button class="c2pa-toggle-btn" onclick="window.c2paDisplay.toggleExpanded()">
                        <span class="toggle-text">Show Details</span>
                    </button>
                </div>
                <div class="c2pa-status">
                    <span class="status-indicator waiting">⏳</span>
                    <span class="status-text">Waiting for content verification...</span>
                </div>
                <div class="c2pa-details" style="display: none;">
                    <div class="c2pa-manifest-content">
                        <p>No manifest data available</p>
                    </div>
                </div>
            </div>
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
        
        if (status.verified === true) {
            statusIndicator.classList.add('verified');
            statusIndicator.textContent = '✅';
            statusText.textContent = 'Content authenticity verified';
        } else if (status.verified === false) {
            statusIndicator.classList.add('failed');
            statusIndicator.textContent = '❌';
            statusText.textContent = 'Content authenticity verification failed';
        } else {
            statusIndicator.classList.add('pending');
            statusIndicator.textContent = '🔄';
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
        
        // Overall status
        html += `<div class="manifest-section">
            <h4>Verification Summary</h4>
            <div class="verification-status ${status.verified === true ? 'success' : status.verified === false ? 'error' : 'pending'}">
                Status: ${status.verified === true ? 'VERIFIED' : status.verified === false ? 'FAILED' : 'PENDING'}
            </div>
        </div>`;

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
     * Generate HTML for a specific media type section
     */
    generateMediaTypeSection(mediaType, detail) {
        let html = `<div class="media-type-section">
            <h5>${mediaType.toUpperCase()} Track</h5>
            <div class="media-details">`;

        // Verification status for this media type
        const verified = detail.verified;
        html += `<div class="detail-item">
            <span class="detail-label">Verified:</span>
            <span class="detail-value ${verified ? 'success' : 'error'}">${verified ? 'Yes' : 'No'}</span>
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
                        <strong>Explanation:</strong> ${issue.explanation || 'No explanation provided'}
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
                        html += `<div><strong>Signature Info:</strong> ${typeof claim.signature === 'string' ? claim.signature : 'Present'}</div>`;
                    }
                    
                    html += `</div></div>`;
                });
                
                html += `</div></div>`;
            }

            // Raw manifest data (collapsible)
            html += `<div class="detail-item">
                <span class="detail-label">Raw Manifest:</span>
                <div class="detail-value">
                    <button class="toggle-raw-btn" onclick="window.c2paDisplay.toggleRawManifest('${mediaType}')">
                        Show Raw Data
                    </button>
                    <pre class="raw-manifest" id="raw-${mediaType}" style="display: none;">${JSON.stringify(manifest, null, 2)}</pre>
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
        
        if (detailsDiv && toggleText) {
            if (this.isExpanded) {
                detailsDiv.style.display = 'block';
                toggleText.textContent = 'Hide Details';
                if (this.currentManifestData) {
                    this.updateManifestDetails(this.currentManifestData);
                }
            } else {
                detailsDiv.style.display = 'none';
                toggleText.textContent = 'Show Details';
            }
        }
    }

    /**
     * Toggle raw manifest data visibility
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
                            title: "Sample C2PA Protected Content",
                            format: "video/mp4",
                            instanceId: "12345678-1234-5678-9abc-123456789abc",
                            validationStatus: [], // No validation issues for video
                            claims: [
                                {
                                    label: "c2pa.content_credentials",
                                    signature: "RS256 signature present"
                                },
                                {
                                    label: "c2pa.creator",
                                    signature: "Content created by Demo Studio"
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
                            title: "Sample Audio Track",
                            format: "audio/mp4",
                            instanceId: "87654321-4321-8765-dcba-987654321cba",
                            validationStatus: [
                                {
                                    code: "signing_credential.untrusted",
                                    explanation: "The signing credential is not trusted"
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
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .c2pa-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding-bottom: 10px;
            }

            .c2pa-header h3 {
                margin: 0;
                color: white;
                font-weight: bold;
                font-size: 1.2rem;
            }

            .c2pa-toggle-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .c2pa-toggle-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.5);
            }

            .c2pa-status {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 16px;
                margin-bottom: 15px;
            }

            .status-indicator {
                font-size: 20px;
                padding: 5px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 30px;
                min-height: 30px;
            }

            .status-indicator.verified {
                background: rgba(76, 175, 80, 0.2);
                border: 2px solid #4CAF50;
            }

            .status-indicator.failed {
                background: rgba(244, 67, 54, 0.2);
                border: 2px solid #f44336;
            }

            .status-indicator.pending {
                background: rgba(255, 193, 7, 0.2);
                border: 2px solid #FFC107;
            }

            .status-indicator.waiting {
                background: rgba(158, 158, 158, 0.2);
                border: 2px solid #9E9E9E;
            }

            .c2pa-details {
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                padding-top: 15px;
            }

            .manifest-section {
                margin-bottom: 20px;
            }

            .manifest-section h4 {
                color: white;
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 1.1rem;
            }

            .verification-status {
                padding: 10px;
                border-radius: 8px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 15px;
            }

            .verification-status.success {
                background: rgba(76, 175, 80, 0.2);
                border: 1px solid #4CAF50;
                color: #4CAF50;
            }

            .verification-status.error {
                background: rgba(244, 67, 54, 0.2);
                border: 1px solid #f44336;
                color: #f44336;
            }

            .verification-status.pending {
                background: rgba(255, 193, 7, 0.2);
                border: 1px solid #FFC107;
                color: #FFC107;
            }

            .media-type-section {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 15px;
            }

            .media-type-section h5 {
                color: white;
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 1rem;
            }

            .detail-item {
                display: flex;
                margin-bottom: 8px;
                align-items: flex-start;
                gap: 10px;
            }

            .detail-label {
                font-weight: bold;
                min-width: 120px;
                color: #E0E0E0;
                margin-right: 0;
                display: flex;
                align-items: center;
            }

            .detail-value {
                flex: 1;
                word-break: break-word;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }

            .detail-value.success {
                color: #4CAF50;
            }

            .detail-value.error {
                color: #f44336;
            }

            .detail-value.code {
                font-family: 'Courier New', monospace;
                background: rgba(0, 0, 0, 0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
            }

            .validation-issues {
                background: rgba(244, 67, 54, 0.1);
                border: 1px solid rgba(244, 67, 54, 0.3);
                border-radius: 8px;
                padding: 10px;
                margin-top: 5px;
            }

            .validation-issue {
                margin-bottom: 10px;
                padding: 8px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                font-size: 14px;
            }

            .claims-list {
                margin-top: 5px;
            }

            .claim-item {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 8px;
            }

            .claim-details {
                margin-top: 8px;
                font-size: 14px;
                color: #E0E0E0;
            }

            .toggle-raw-btn {
                background: rgba(33, 150, 243, 0.2);
                border: 1px solid #2196F3;
                color: #2196F3;
                padding: 4px 8px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-bottom: 10px;
                align-self: flex-start;
            }

            .toggle-raw-btn:hover {
                background: rgba(33, 150, 243, 0.3);
            }

            .raw-manifest {
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                padding: 10px;
                margin-top: 0;
                color: #E0E0E0;
                font-size: 12px;
                overflow-x: auto;
                max-height: 300px;
                overflow-y: auto;
                width: 100%;
            }

            @media (max-width: 768px) {
                .c2pa-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                }

                .detail-item {
                    flex-direction: column;
                    gap: 5px;
                }

                .detail-label {
                    min-width: unset;
                    margin-bottom: 5px;
                }
                
                .detail-value {
                    align-items: stretch;
                }
            }
        `;
        
        document.head.appendChild(styleSheet);
    }
}

// Export for use in other modules
export { C2PAManifestDisplay };
