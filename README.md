# ⚡ ServiceNow Meta-Builder Bookmarklet Suite

## 🚀 Quick Start
Welcome aboard! To boot the application locally and start generating tools:
1. `npm ci` (Install testing dependencies).
2. `npx jest --passWithNoTests` (Verify the build environment).
3. Open `index.html` directly in your browser.

## 🛠️ Features & Workflow Optimization
This suite is built on four core, independently engineered generators located in `js/generators/`. Each is designed to surgically eliminate specific administrative bottlenecks.

| Tool | Benefit | Use Case |
| :--- | :--- | :--- |
| **CWOPA List Automation** | Condenses 15 minutes of manual bulk ticket updates into a 5-second asynchronous headless operation. | Scrapes your User ID to generate a multi-ticket processor that intercepts list views, processes payloads in hidden iframes, and performs bulk assignment, renaming, and closures. |
| **Queue Interceptor** | Eliminates manual refresh latency and cognitive fatigue when monitoring unassigned queues. | Injects sticky UI hooks into list views, allowing for single-click ticket claiming and localized skip-caching via `localStorage`. |
| **Form Template** | Converts transient form states into permanent, single-click boot scripts without hardcoding sensitive GUIDs. | Scrapes an active ServiceNow form (like a Request Item) and generates a payload that instantly rebuilds the form's state, featuring dynamic caller resolution. |
| **Onboarding Extractor** | Eradicates manual data entry errors and multi-click navigation when building employee onboarding matrices. | Bypasses surface UI to parse variable payloads through hidden `sysparm_nostack` iframes and packages the structural data directly into a downloadable CSV. |

## 1. Overview
The **ServiceNow Meta-Builder Bookmarklet Suite** is a zero-dependency, client-side application designed to dynamically generate environment-aware automation tools for ServiceNow.

> **⚠️ CRITICAL CONTEXT:** This project is a strictly localized, individual utility. I developed it **solely to optimize my personal daily workflow**, eliminate repetitive manual bottlenecks, and prevent data entry errors. It is an independent engineering experiment and is *not* an officially approved, team-wide, or enterprise-level deployment.

Operating entirely within the browser, this suite uses a meta-builder architecture—static HTML pages generate customized builder bookmarklets, which in turn dynamically inject specialized automation scripts directly into the user's active session. It is the ultimate tool for bypassing cumbersome UI layers and executing precision operations directly within the ServiceNow execution context.

## 2. The Operational Catalyst
Working within complex ITSM platforms often involves navigating dense, multi-layered interfaces. The driving force behind this project was the sheer technical friction and manual nightmare of processing bulk tickets, tracking unassigned queues, and extracting nested variables.

Specifically, I faced:
- **Multi-Click Bottlenecks:** Simple bulk operations (e.g., reassigning, updating titles, and closing tickets for offboarding employees) required dozens of manual clicks, endless page reloads, and navigating through sluggish form views.
- **Queue Interception Latency:** Manually refreshing lists to catch incoming priority tickets led to missed opportunities and wasted time.
- **Data Inaccessibility:** Crucial payload variables (like CWOPA IDs or Onboarding specifics) were often buried behind multiple UI layers, requiring manual copy-pasting that was highly prone to human error.

I needed a way to interact with ServiceNow's underlying data layer instantly, headlessly, and without waiting for heavy UI rendering.

## 3. Under the Hood (Technical Architecture)
This suite achieves execution by injecting self-contained, minimized JavaScript directly into the ServiceNow environment.

**Execution Pattern:**
1. **Configuration UI (HTML/Tailwind CSS):** A static frontend allows the configuration of the target tool (e.g., CWOPA List Automation, Queue Interceptor, Form Template, Onboarding Extractor).
2. **Meta-Builder Generation:** The UI generates a "Builder Bookmarklet."
3. **Context Injection:** When executed in ServiceNow, the Builder scrapes the live environment for required parameters (like User IDs or Form DOM states).
4. **Final Tool Creation:** It dynamically constructs a highly specific, finalized bookmarklet for daily execution.

**Key Engineering Mechanics:**
- **Shadow DOM Traversal:** ServiceNow frequently wraps its frames in Shadow DOMs. The scripts utilize recursive traversal algorithms (`querySelector` across `shadowRoot` boundaries) to reliably locate the `#gsft_main` iframe and extract the `g_form` object or `.list_table` elements regardless of UI encapsulation.
- **Headless Background Processing:** Tools like the *Onboarding Extractor* and *CWOPA List Automation* bypass surface-level UI limitations by injecting hidden `<iframe style="position:absolute;left:-9999px;">` elements. These frames load target records in the background (`sysparm_nostack=true`), scrape variable payloads, and perform updates without disrupting the user's active view.
- **Asynchronous Execution Loops:** To handle bulk operations without browser lockup, the suite leverages `Promise.allSettled` to execute concurrent tasks in batched chunks. This ensures that a failure on one ticket does not halt the entire queue processing loop.
- **Dynamic DOM Manipulation:** The *Queue Interceptor* continuously scans list views (`GlideList2` API or DOM polling) and dynamically injects custom UI hooks directly into the table cells, allowing for inline actions like one-click assignment or localized skipping.

## 4. Robustness & Integrity
Executing headless automation requires rigorous safeguards to prevent data corruption or runaway loops.

- **Execution Context Validation:** Every generated script runs a pre-flight environment check. If the required execution context (`g_form` or a valid list view) is not detected, the script gracefully aborts, preventing misfired commands on invalid pages.
- **Pre-Flight UI Modals:** For bulk operations, the script injects a custom pre-flight modal summarizing all planned changes (e.g., title updates, closures). Execution only proceeds after explicit user confirmation.
- **Strict Iframe Timeout Controls:** Hidden iframe operations are wrapped in Promises with strict timeout limits (e.g., 8-18 seconds). If a frame fails to load or the API is unresponsive, the Promise rejects, triggering the error handler rather than hanging indefinitely.
- **Memory Leak Prevention:** Asynchronous tasks include explicit cleanup routines. Event listeners are unbound, timeouts are cleared, and hidden iframes are aggressively purged from the DOM immediately upon promise resolution or rejection.
- **Localized State Management:** Tools like the Interceptor utilize `localStorage` to maintain a skip cache, ensuring the system state is remembered across page refreshes without needing server-side persistence.

## 5. Localized ROI (Impact)
The implementation of these engineered bookmarklets fundamentally transformed my individual productivity:

- **Massive Time Condensation:** Multi-ticket processing workflows that previously took 10-15 minutes of manual clicking and waiting for page loads are now executed via hidden API calls in under 5 seconds.
- **Elimination of Human Error:** Automated parsing of ticket variables, intelligent formatting of Short Descriptions (e.g., appending `- TRANSFER`), and zero-touch CSV extraction eliminated the data entry errors associated with manual copy-pasting.
- **Asynchronous Advantage:** By intercepting tickets and extracting data in the background, I reclaimed cognitive focus, allowing me to concentrate on complex problem-solving rather than rote administrative UI navigation.
