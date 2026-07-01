# ⚡ ServiceNow Bookmarklet Suite

[![build: passing](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/project)

A zero-dependency client-side application for generating ServiceNow automation
bookmarklets. The system employs a meta-builder architecture where static HTML
pages generate builder bookmarklets, which in turn produce task-specific,
self-contained automation tools.

## Architecture Overview

### Core Pattern: Meta-Builder Architecture

The application follows a three-tier generation model:

1. **Configuration UI** (Static HTML) - User defines tool parameters.
2. **Builder Bookmarklet** (Generated JavaScript) - Interactive field selection
   interface injected into ServiceNow.
3. **Final Bookmarklet** (Generated JavaScript) - Task-specific automation tool.

This architecture enables field discovery and validation against live ServiceNow
instances while maintaining zero server dependencies.

### Application Hub

The main hub `index.html` offers direct access to generating specialized tools:

- **CWOPA List Automation**
- **Queue Interceptor**
- **Form Template**
- **Onboarding Extractor**

## Integrated Tools

### CWOPA List Automation

Generates a Builder that scrapes your User ID and creates the CWOPA/Transfer/
Offboard multi-ticket updater.

**Benefits & Use Cases:**
- **Mass Processing:** Provides a unified interface to bulk assign, rename, and close onboarding, offboarding, and transfer tickets directly from a list view.
- **Intelligent Formatting:** Automatically analyzes ticket variables (dates, job titles, CWOPA IDs) to intelligently format and standardize ticket titles (e.g., appending `- TRANSFER` or `- No AD`).
- **Execution Safeguards:** Runs pre-flight checks on the queue to determine workable status before applying bulk updates to the targeted ServiceNow instances.

### Queue Interceptor

Generates a Builder for the sticky queue interceptor. Captures your User ID for
automatic ticket claiming.

**Benefits & Use Cases:**
- **Active Monitoring:** Continuously scans a ServiceNow list view at a user-defined interval to identify incoming unassigned tickets.
- **Targeted Acquisition:** Automatically claims tickets matching specific keywords (e.g., "Distribution Lists", "VPN") and assigns them directly to the scraped User ID.
- **State Management:** Implements a localized skip cache, allowing the user to ignore specific tickets without triggering repeated interception attempts.

### Form Template

Generates a Builder that scrapes any active ServiceNow form to create a permanent,
one-click auto-fill template featuring dynamic caller resolution.

**Benefits & Use Cases:**
- **State Replication:** Converts a fully populated ServiceNow form into a localized, static bookmarklet capable of instantly recreating that exact form state.
- **Privacy-Safe Execution:** Generates the automated template strictly within the browser, avoiding the need to hardcode sensitive GUIDs or payloads in the source repository.
- **Runtime Resolution:** Actively intercepts 'caller' inputs to prompt the user dynamically at runtime, ensuring templates remain reusable across different employee contexts.

### Onboarding Extractor

Generates the Onboarding CSV Extractor. Securely packages the logic to scrape
variable payloads via hidden iframes.

**Benefits & Use Cases:**
- **Deep Extraction:** Scans a list view for "onboard" tickets and utilizes hidden iframes to extract embedded variable data (CWOPA ID, First Name, Last Name) that is otherwise inaccessible from the surface list.
- **Local Packaging:** Aggregates the extracted payloads entirely client-side and generates a dynamically downloadable CSV file for reporting workflows.
- **Non-blocking Operations:** Parses ticket data in the background via hidden execution contexts, preserving the user's current list view without forced navigation.

## Technical Implementation

### Environment Detection System

Critical function for locating ServiceNow's execution context across shadow DOM
and iframe boundaries.

```javascript
findEnv(window) → {
  type: 'form' | 'list',
  context: { win: Window, g_form?: Object, listEl?: Element }
}
```

**Detection Algorithm:**

1. Recursively search for `#gsft_main` iframe through shadow DOM.
2. Check iframe content window for `g_form` object (form context).
3. Check for `.list_table` or `[data-list_id]` elements (list context).
4. Fall back to direct window context if iframe not found.

**Handles:**

- Shadow DOM encapsulation in modern ServiceNow instances.
- Cross-origin frame restrictions (graceful degradation).
- Multiple possible frame naming conventions.

### Code Generation Techniques

#### Minification Strategy

Applied to final bookmarklets to reduce size and avoid browser URL length limits.

**Transformations:**

1. Remove block comments (`/* */`).
2. Remove line comments (`//`).
3. Collapse whitespace around operators.
4. Remove unnecessary semicolons before closing braces.
5. URL-encode result with `encodeURIComponent()`.

**Preservation:**

- String literals remain intact.
- Functional code structure maintained.
- Variable names not obfuscated (readability for debugging).

### Security Considerations

- **Client-Side Only:** No server communication required. All code generation
  happens in browser. No data persistence or external requests.
- **ServiceNow Integration:** Relies on ServiceNow's existing authentication.
  Executes within user's current session context. Subject to ServiceNow's
  role-based access controls.
- **Code Injection:** Generated bookmarklets execute with page privileges.
  Users should review generated code before use. No remote code execution or
  dynamic eval patterns.
