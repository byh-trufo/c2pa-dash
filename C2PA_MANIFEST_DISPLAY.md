# C2PA Manifest Display Integration

This document describes the new C2PA manifest display functionality that has been added to the DASH player.

## Overview

The `C2PAManifestDisplay` class provides a visual interface for displaying Content Authenticity Protocol (C2PA) manifest information decoded from DASH video streams. The display shows verification status, manifest details, and raw C2PA data in an organized and user-friendly format.

## Features

### Status Indicator
- **✅ Verified**: Content authenticity has been successfully verified
- **❌ Failed**: Content authenticity verification failed
- **🔄 Pending**: Verification is in progress
- **⏳ Waiting**: Waiting for content to load

### Detailed Information Display
- **Verification Summary**: Overall status of content authenticity
- **Media Type Details**: Separate information for video and audio tracks
- **Manifest Metadata**: Title, format, instance ID, and other metadata
- **Claims Information**: Digital signature and provenance claims
- **Validation Issues**: Error codes and explanations when verification fails
- **Raw Manifest Data**: Collapsible JSON view of the complete manifest

## Usage

### Basic Integration

The C2PA manifest display is automatically initialized when the page loads:

```javascript
// Automatically created on page load
c2paManifestDisplay = new C2PAManifestDisplay('c2paManifestContainer');
```

### Updating the Display

The display is automatically updated whenever the DASH player processes C2PA data:

```javascript
// This happens automatically in the c2pa_init callback
c2paManifestDisplay.updateDisplay(e.c2pa_status);
```

### Manual Control

You can also manually control the display:

```javascript
// Reset the display
c2paManifestDisplay.reset();

// Toggle expanded view
c2paManifestDisplay.toggleExpanded();

// Toggle raw manifest data for a specific media type
c2paManifestDisplay.toggleRawManifest('video');
```

## Data Structure

The C2PA status object passed to `updateDisplay()` should have the following structure:

```javascript
{
    "verified": true|false|undefined,  // Overall verification status
    "details": {
        "video": {
            "verified": true|false,
            "manifest": {
                "manifestStore": {
                    "title": "Content Title",
                    "format": "video/mp4",
                    "instanceId": "uuid-string",
                    "validationStatus": [...],  // Array of validation issues
                    "claims": [...]  // Array of C2PA claims
                }
            },
            "error": "Error message if any"
        },
        "audio": {
            // Similar structure for audio track
        }
    }
}
```

## Styling

The component includes comprehensive CSS styling that matches the existing player theme:
- Responsive design for mobile devices
- Dark theme with transparency effects
- Color-coded status indicators
- Expandable/collapsible sections
- Syntax-highlighted JSON display

## Error Handling

The component gracefully handles various error conditions:
- Missing container element
- Invalid or missing C2PA data
- C2PA initialization failures
- Network or parsing errors

## Testing with Sample Content

To test the C2PA manifest display:

1. Load a C2PA-signed DASH stream using the sample URL provided in the interface
2. The status indicator will show the verification progress
3. Click "Show Details" to expand the manifest information
4. Use "Show Raw Data" buttons to view the complete JSON manifests

## Browser Compatibility

The C2PA manifest display works in all modern browsers that support:
- ES6 modules
- CSS flexbox
- Async/await
- JSON.stringify with formatting

## Troubleshooting

### Common Issues

1. **Display not appearing**: Check that the container element exists and the JavaScript module loaded correctly
2. **No C2PA data**: Ensure the video stream contains C2PA metadata and the c2pa-dash-plugin is working
3. **Styling issues**: Verify that the CSS styles are being applied correctly

### Debug Information

The component logs debug information to the browser console:
```
[C2PA Display] Updating with status: {...}
```

Check the browser console for any error messages or debug information.
