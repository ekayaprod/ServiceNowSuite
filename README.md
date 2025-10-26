# ServiceNow Bookmarklet Suite

A client-side web application for generating ServiceNow automation bookmarklets. The system employs a meta-builder architecture where static HTML pages generate builder bookmarklets, which in turn produce task-specific automation tools.

## Architecture Overview

### Core Pattern: Meta-Builder Architecture

The application follows a three-tier generation model:

1. **Configuration UI** (Static HTML) - User defines tool parameters
2. **Builder Bookmarklet** (Generated JavaScript) - Interactive field selection interface injected into ServiceNow
3. **Final Bookmarklet** (Generated JavaScript) - Task-specific automation tool

This architecture enables field discovery and validation against live ServiceNow instances while maintaining zero server dependencies.

### File Structure

```
├── ticket_template.html     # Main hub with simple tools (Template, Deferred Updater)
├── ticket_automation.html   # Universal Automation Builder (complex)
├── data_extractor.html      # CSV Data Extractor Builder (complex)
```

**Design Philosophy:**
- Simple, frequently-used tools are consolidated in `ticket_template.html` for quick access
- Complex tools with extensive UI requirements are separated into dedicated pages
- Each page can function independently as a bookmarkable entry point

## Application Components

### 1. Main Hub (`ticket_template.html`)

Central entry point providing quick access to frequently-used tools and navigation to specialized builders.

**Integrated Tools:**

#### Ticket Template Builder
Captures field values from existing forms and generates templates for rapid ticket creation.

**Configuration Options:**
- Two-click mode: Opens new form in separate tab before applying template

**Generated Builder Functionality:**
- Scans all visible form fields via `g_form.elements`
- Click-to-capture interface for field selection
- Handles reference fields and display values
- Manages dependent fields (assignment groups, owner groups) with delayed execution

**Final Bookmarklet Behavior:**
- Validates execution context (must run on matching form type)
- Applies non-dependent fields immediately
- Delays dependent field population by 1500ms to ensure parent fields load
- Supports optional two-click workflow for new record creation

#### Deferred Bulk Updater
Schedules delayed bulk comment updates for checked tickets from list views.

**Configuration:**
- Target comment field (work_notes or comments)

**Execution Logic:**
- Captures checked ticket sys_ids from list view
- Presents ticket selection interface with descriptions
- Accepts user-defined comment and delay (minutes)
- Schedules `setTimeout` for batch execution
- Processes tickets sequentially via hidden iframes
- Updates comment field and saves each ticket
- Requires browser window to remain open (tab can close)

**Navigation:**
- Links to `ticket_automation.html` (Universal Automation Builder)
- Links to `data_extractor.html` (CSV Data Extractor)

### 2. Universal Automation Builder (`ticket_automation.html`)

Advanced rule-based ticket modification system supporting conditional logic and batch processing. Separated into dedicated page due to complexity.

**Page Interface:**
- Single-step generation: directly produces the builder bookmarklet
- No multi-tool selection required

**Generated Builder Functionality:**
- Automatic field enumeration with type detection
- Condition builder with operator selection (contains, equals, is empty, date comparisons)
- Action builder supporting field updates and global target modifications
- Real-time validation of rule logic

**Final Bookmarklet Capabilities:**

*Single Ticket Mode:*
- Evaluates conditions against current form state
- Applies actions only when all conditions match
- Supports date parsing and manipulation (MM/DD/YYYY replacement)
- Action types: append, prepend, replace, overwrite, set specific field

*Batch Mode:*
- Processes checked tickets from list view
- Loads each ticket in hidden iframe for g_form access
- Concurrent processing (5 tickets at a time)
- Modal progress tracking with success/failure reporting
- Optional prompted values applied to all matching tickets
- Automatic page reload on completion

### 3. CSV Data Extractor (`data_extractor.html`)

Sophisticated data extraction tool for generating CSV exports from ServiceNow list views. Separated into dedicated page due to multi-step builder complexity.

**Page Interface:**
- Single-step generation: directly produces the extractor builder bookmarklet
- Clear instructions for multi-phase workflow

**Generated Builder Functionality:**
- Runs on ServiceNow form pages to scan available fields
- Click-to-select interface for choosing export fields
- Filter builder with multiple condition types:
  - Contains / Does not contain
  - Is / Is not
  - Is empty
- Generates final extractor bookmarklet from within builder

**Final Bookmarklet Behavior:**
- Executes on ServiceNow list views
- Identifies all visible tickets in current list
- Processes each ticket via hidden iframe to access g_form
- Applies filter conditions to determine inclusion
- Extracts specified field values
- Generates CSV file with proper escaping
- Downloads automatically with UTF-8 BOM for Excel compatibility
- Modal progress tracking during processing

**Technical Features:**
- Batch processing with timeout protection (8000ms per ticket)
- Concurrent iframe loading (5 at a time)
- Error handling for inaccessible tickets
- Escaped CSV output (handles quotes, commas, newlines)

## Technical Implementation

### Environment Detection System

Critical function for locating ServiceNow's execution context across shadow DOM and iframe boundaries.

```javascript
findEnv(window) → {
  type: 'form' | 'list',
  context: { win: Window, g_form?: Object, listEl?: Element }
}
```

**Detection Algorithm:**
1. Recursively search for `#gsft_main` iframe through shadow DOM
2. Check iframe content window for `g_form` object (form context)
3. Check for `.list_table` or `[data-list_id]` elements (list context)
4. Fall back to direct window context if iframe not found

**Handles:**
- Shadow DOM encapsulation in modern ServiceNow instances
- Cross-origin frame restrictions (graceful degradation)
- Multiple possible frame naming conventions

### Iframe Management Pattern

Used throughout for accessing ServiceNow forms without navigation.

**Standard Implementation:**
```javascript
createManagedFrame(url) → Promise<{frame, cleanup}>
```

**Features:**
- Absolute positioning (off-screen, 1px × 1px)
- Timeout protection (8000ms default)
- Automatic cleanup on success/failure
- Memory leak prevention via explicit removal

**Use Cases:**
- Loading ticket forms for field value extraction
- Accessing g_form API for validation checks
- Batch processing without visible navigation

### State Polling Pattern

Ensures ServiceNow APIs are available before execution.

```javascript
waitForGForm(window) → Promise<g_form>
```

**Parameters:**
- Poll interval: 100ms
- Maximum attempts: 50 (5 second total timeout)
- Success condition: `g_form` exists and has `getValue` method

**Critical for:**
- Post-iframe-load initialization
- Dynamic script injection scenarios
- Handling ServiceNow's asynchronous UI initialization

### Custom Modal System

Several tools implement custom modal dialogs to avoid browser popup blockers and provide better UX.

**Implementation Pattern:**
```javascript
SN_UI.showInfo(title, message) → Promise<void>
SN_UI.prompt(title, message, defaultValue) → Promise<string|null>
```

**Features:**
- Promise-based async/await compatibility
- Keyboard support (Enter/Escape)
- Consistent styling across all tools
- Self-contained (no external dependencies)
- Injected directly into generated bookmarklets

## Code Generation Techniques

### Minification Strategy

Applied to final bookmarklets to reduce size and avoid browser URL length limits.

**Transformations:**
1. Remove block comments (`/* */`)
2. Remove line comments (`//`)
3. Collapse whitespace around operators
4. Remove unnecessary semicolons before closing braces
5. URL-encode result with `encodeURIComponent()`

**Preservation:**
- String literals remain intact
- Functional code structure maintained
- Variable names not obfuscated (readability for debugging)

### Function Serialization

Critical functions are serialized as strings and injected into generated code.

**Example:**
```javascript
const findEnvFn = `function(w){...}`;
const generatedCode = `const findEnv = ${findEnvFn};`;
```

**Benefits:**
- Single source of truth for shared utilities
- Consistent behavior across all generated bookmarklets
- Easier maintenance and updates

### Configuration Embedding

User-defined settings are JSON-serialized and embedded directly.

```javascript
const cfg = ${JSON.stringify(userConfig)};
```

**Includes:**
- Tool-specific options (two-click mode, batch processing)
- Field lists and rule definitions
- Filter criteria and extraction parameters

## User Experience Flow

### Typical Workflow: Template Builder

1. **Configuration Phase**
   - Navigate to `ticket_template.html`
   - Select "Ticket Template" tool
   - Configure two-click mode if desired
   - Specify bookmarklet name
   - Drag generated builder link to bookmarks

2. **Builder Phase**
   - Navigate to ServiceNow form
   - Click builder bookmarklet
   - Interactive panel appears
   - Click form fields to capture values
   - Generate final template bookmarklet

3. **Execution Phase**
   - Navigate to new ticket form (or use two-click mode)
   - Click final bookmarklet
   - Fields populate automatically

### Typical Workflow: Automation Builder

1. **Configuration Phase**
   - Navigate to `ticket_automation.html`
   - Click "Generate Automation Builder"
   - Drag generated builder link to bookmarks

2. **Builder Phase**
   - Navigate to ServiceNow form to scan fields
   - Click builder bookmarklet
   - Panel appears with condition/action builders
   - Add IF conditions (field checks)
   - Add THEN actions (field modifications)
   - Generate final automation bookmarklet

3. **Execution Phase (Single Mode)**
   - Navigate to ticket form
   - Click final bookmarklet
   - Rules evaluate and actions apply if conditions met

4. **Execution Phase (Batch Mode)**
   - Navigate to list view
   - Check tickets to process
   - Click final bookmarklet
   - Modal shows matching tickets
   - Enter prompted values if configured
   - Process executes with progress tracking

### Typical Workflow: Data Extractor

1. **Configuration Phase**
   - Navigate to `data_extractor.html`
   - Click "Generate Extractor Builder"
   - Drag generated builder link to bookmarks

2. **Builder Phase**
   - Navigate to ServiceNow form to scan available fields
   - Click builder bookmarklet
   - Panel appears for field selection
   - Click fields to add to export
   - Add optional filter conditions
   - Generate final extractor bookmarklet

3. **Execution Phase**
   - Navigate to list view with target tickets
   - Click final bookmarklet
   - Processing modal appears
   - Tickets load and filter in background
   - CSV downloads automatically when complete

## Browser Compatibility

**Tested Environments:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Requirements:**
- JavaScript ES6+ support (async/await, arrow functions, template literals)
- iframe support with cross-origin handling
- Bookmarklet execution enabled

**Known Limitations:**
- Cross-origin restrictions prevent access to frames from different domains
- ServiceNow's CSP may block certain inline script patterns
- Browser bookmark character limits (~2000 chars for most browsers)

## Security Considerations

### Client-Side Only
- No server communication required
- All code generation happens in browser
- No data persistence or external requests

### ServiceNow Integration
- Relies on ServiceNow's existing authentication
- Executes within user's current session context
- Subject to ServiceNow's role-based access controls

### Code Injection
- Generated bookmarklets execute with page privileges
- Users should review generated code before use
- No remote code execution or dynamic eval patterns

## Performance Considerations

### Batch Processing
- Concurrent iframe limit: 5 simultaneous
- Frame timeout: 8000ms per ticket
- Save delay: 1500ms to allow field dependencies
- Total processing time scales linearly with ticket count

### Memory Management
- Iframes explicitly removed after use
- Event listeners cleaned up on panel close
- No persistent state in generated bookmarklets

### Network Impact
- Each ticket processed requires full form load
- Batch operations generate significant ServiceNow server load
- Users should limit batch sizes to avoid performance issues

## Development Notes

### Debugging Generated Code

To debug a generated bookmarklet:

1. Copy bookmarklet URL
2. Decode with `decodeURIComponent()`
3. Remove `javascript:` prefix
4. Format code with prettier or similar tool
5. Add console.log statements
6. Test in browser console on ServiceNow page

### Common Issues

**"g_form not available"**
- Increase `waitForGForm` timeout or poll attempts
- Verify execution on actual form page (not list view)
- Check for ServiceNow version compatibility

**"Environment not detected"**
- Confirm correct page type (form vs list)
- Check for shadow DOM changes in ServiceNow version
- Verify iframe structure matches detection logic

**"Cross-origin frame access blocked"**
- Expected for different subdomain setups
- Implement graceful fallback in detection logic
- Document as known limitation for users

## Maintenance Guidelines

### File Organization
- Each page is self-contained with all dependencies inline
- Utility functions duplicated across files for independence
- No shared JavaScript libraries or external dependencies

### Version Control
- Test all tools after ServiceNow instance updates
- Verify field detection logic with new ServiceNow versions
- Update documentation for breaking changes

### User Support
- Generated bookmarklets are self-contained
- Users can copy/save bookmarklet code independently
- No backend dependencies means zero maintenance overhead for deployed tools
