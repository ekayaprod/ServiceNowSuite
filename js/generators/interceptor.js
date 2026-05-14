function generateInterceptor(app) {
    // [SECURITY BOUNDARY] Ensure app instance is provided
    if (!app) return console.warn('[generateInterceptor] Missing app context');

    const nameEl = document.getElementById('bookmarkletName-interceptor');
    const name = nameEl ? nameEl.value : 'Queue Interceptor';

    // The entire bookmarklet logic is defined as a standard JavaScript function.
    // This entirely avoids template literal escaping and brittle string minification.
    const bookmarkletPayload = async function() {
        const findEnv = function(w) {
            try {
                function findFS(n) {
                    let f = n.querySelector('#gsft_main,iframe[name="gsft_main"]');
                    if (f) return f;
                    for (const e of n.querySelectorAll('*')) {
                        if (!e.shadowRoot) continue;
                        f = findFS(e.shadowRoot);
                        if (f) return f;
                    }
                    return null;
                }
                function getE(t) {
                    if (!t) return null;
                    const l = t.document.querySelector('#task_table,.list_table,[data-list_id]');
                    return l ? { type: 'list', ctx: { win: t, listEl: l } } : null;
                }
                const fe = findFS(w.document);
                if (fe && fe.contentWindow) {
                    const fv = getE(fe.contentWindow);
                    if (fv) return fv;
                }
                return getE(w);
            } catch (e) {
                console.warn('[findEnvFn] Failed to find environment:', e.message);
            }
            return null;
        };

        const topWin = window.top;
        const env = findEnv(topWin);

        if (!env || env.type !== 'list') {
            alert('This tool must be run on a ServiceNow list view. Please navigate to a list and try again.');
            return;
        }

        if (topWin.document.getElementById('sn-interceptor-modal')) {
            alert('Interceptor is already running.');
            return;
        }

        const { win: winCtx, listEl } = env.ctx;
        const tableName = listEl.getAttribute('glide_table') || 'task';

        // Local Storage Cache Management
        const CACHE_KEY = 'sn_interceptor_skipped_tickets';
        const getSkippedCache = () => JSON.parse(topWin.localStorage.getItem(CACHE_KEY) || '{}');
        const setSkippedCache = (data) => topWin.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        
        const updateCacheUI = () => {
            const countEl = topWin.document.getElementById('sn-interceptor-skip-count');
            if (countEl) countEl.textContent = Object.keys(getSkippedCache()).length;
        };

        const toggleSkipState = (sysId, ticketNum) => {
            const cache = getSkippedCache();
            if (cache[sysId]) {
                delete cache[sysId];
            } else {
                cache[sysId] = ticketNum || 'Unknown';
            }
            setSkippedCache(cache);
            updateCacheUI();
        };

        const modalHTML = `
        <div id="sn-interceptor-modal" style="position:fixed;top:20px;right:20px;width:320px;background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;font-family:sans-serif;border:1px solid #ddd;display:flex;flex-direction:column;overflow:hidden;">
            <div id="sn-interceptor-header" style="background:#0066cc;color:#fff;padding:10px 15px;cursor:grab;display:flex;justify-content:space-between;align-items:center;user-select:none;">
                <span style="font-weight:bold;font-size:14px;">Queue Interceptor</span>
                <button id="sn-interceptor-close" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">&times;</button>
            </div>
            <div style="padding:15px;display:flex;flex-direction:column;gap:10px;">
                <div>
                    <label style="font-size:12px;font-weight:bold;color:#555;">Keywords (comma separated)</label>
                    <input type="text" id="sn-interceptor-keywords" placeholder="e.g. VIP, Urgent, Database" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-top:4px;" />
                </div>
                <div>
                    <label style="font-size:12px;font-weight:bold;color:#555;">Refresh Interval (seconds)</label>
                    <input type="number" id="sn-interceptor-interval" value="30" min="5" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-top:4px;" />
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#f5f5f5;border-radius:4px;border:1px solid #eee;">
                    <span style="font-size:12px;color:#333;">Skipped Tickets: <strong id="sn-interceptor-skip-count">0</strong></span>
                    <button id="sn-interceptor-clear-skip" style="font-size:10px;padding:3px 6px;cursor:pointer;border:1px solid #ccc;background:#fff;border-radius:3px;color:#d9534f;font-weight:bold;">Clear</button>
                </div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:5px;">
                    <input type="checkbox" id="sn-interceptor-active" />
                    <label for="sn-interceptor-active" style="font-size:14px;font-weight:bold;cursor:pointer;">Active Monitoring</label>
                </div>
                <div id="sn-interceptor-status" style="font-size:11px;color:#666;margin-top:5px;min-height:16px;">Ready.</div>
            </div>
        </div>
        `;

        topWin.document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalEl = topWin.document.getElementById('sn-interceptor-modal');
        const headerEl = topWin.document.getElementById('sn-interceptor-header');
        const closeBtn = topWin.document.getElementById('sn-interceptor-close');
        const keywordsInput = topWin.document.getElementById('sn-interceptor-keywords');
        const intervalInput = topWin.document.getElementById('sn-interceptor-interval');
        const activeCheckbox = topWin.document.getElementById('sn-interceptor-active');
        const statusDiv = topWin.document.getElementById('sn-interceptor-status');
        const clearSkipBtn = topWin.document.getElementById('sn-interceptor-clear-skip');

        updateCacheUI();

        clearSkipBtn.addEventListener('click', () => {
            if (confirm('Clear all skipped tickets from local cache?')) {
                topWin.localStorage.removeItem(CACHE_KEY);
                updateCacheUI();
            }
        });

        let isDragging = false, startX, startY, initialLeft, initialTop;
        const onMouseMove = (e) => {
            if (!isDragging) return;
            modalEl.style.left = `${initialLeft + (e.clientX - startX)}px`;
            modalEl.style.top = `${initialTop + (e.clientY - startY)}px`;
            modalEl.style.right = 'auto';
        };
        const onMouseUp = () => {
            isDragging = false;
            headerEl.style.cursor = 'grab';
            topWin.document.removeEventListener('mousemove', onMouseMove);
            topWin.document.removeEventListener('mouseup', onMouseUp);
        };
        headerEl.addEventListener('mousedown', (e) => {
            if (e.target === closeBtn) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = modalEl.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            headerEl.style.cursor = 'grabbing';
            topWin.document.addEventListener('mousemove', onMouseMove);
            topWin.document.addEventListener('mouseup', onMouseUp);
        });

        let queueTimerId = null;
        let uiTimerId = null;
        let isProcessing = false;

        const updateStatus = (msg) => { statusDiv.textContent = msg; };

        class TicketAssignmentError extends Error {
            constructor(message, cause) {
                super(message);
                this.name = 'TicketAssignmentError';
                this.cause = cause;
            }
        }

        const assignTicket = async (sysId) => {
            const GFORM_POLL_INTERVAL = 100, GFORM_MAX_ATTEMPTS = 50;
            const waitForGForm = (win) => new Promise((resolve, reject) => {
                let attempts = 0;
                const check = () => {
                    if (win && win.g_form && typeof win.g_form.getValue === 'function' && win.g_user && win.g_user.userID) {
                        return resolve({ g_form: win.g_form, g_user: win.g_user });
                    }
                    if (attempts++ < GFORM_MAX_ATTEMPTS) return setTimeout(check, GFORM_POLL_INTERVAL);
                    reject(new Error('g_form/g_user not available within iframe'));
                };
                check();
            });

            return new Promise((resolve, reject) => {
                const url = `/${tableName}.do?sys_id=${sysId}&sysparm_nostack=true`;
                const frame = topWin.document.createElement('iframe');
                frame.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
                topWin.document.body.appendChild(frame);
                
                let frameLoaded = false;
                const frameTimeout = setTimeout(() => {
                    if (!frameLoaded) {
                        frame.remove();
                        reject(new Error('Frame load timeout'));
                    }
                }, 10000);

                frame.onload = async () => {
                    frameLoaded = true;
                    clearTimeout(frameTimeout);
                    try {
                        const { g_form, g_user } = await waitForGForm(frame.contentWindow);
                        const currentAssignee = g_form.getValue('assigned_to');
                        if (currentAssignee) {
                            setTimeout(() => { frame.remove(); resolve(false); }, 500);
                            return;
                        }
                        g_form.setValue('assigned_to', g_user.userID);
                        g_form.save();
                        setTimeout(() => { frame.remove(); resolve(true); }, 2000);
                    } catch (e) {
                        frame.remove();
                        reject(new TicketAssignmentError(`Failed to assign ticket ${sysId}`, e));
                    }
                };
                frame.onerror = () => {
                    frameLoaded = true;
                    clearTimeout(frameTimeout);
                    frame.remove();
                    reject(new TicketAssignmentError(`Frame failed to load for ticket ${sysId}`));
                };
                frame.src = url;
            });
        };

        const injectUIHooks = () => {
            const currentEnv = findEnv(topWin);
            if (!currentEnv || currentEnv.type !== 'list') return;
            const { win: currentWin, listEl: currentListEl } = currentEnv.ctx;
            const cache = getSkippedCache();
            
            const rows = currentListEl.querySelectorAll('tbody > tr[sys_id]');
            rows.forEach(row => {
                const sysId = row.getAttribute('sys_id');
                if (!sysId) return;
                
                const assignedCell = row.querySelector('td[glide_field="assigned_to"]');
                const isUnassigned = assignedCell && (!assignedCell.textContent.trim() || assignedCell.textContent.trim() === '(empty)');
                
                if (isUnassigned) {
                    let btn = row.querySelector('.sn-interceptor-skip-btn');
                    if (!btn) {
                        btn = currentWin.document.createElement('button');
                        btn.className = 'sn-interceptor-skip-btn';
                        btn.style.cssText = 'margin-left:8px;font-size:10px;padding:2px 5px;border-radius:3px;cursor:pointer;border:1px solid #ccc;vertical-align:middle;';
                        assignedCell.appendChild(btn);
                    }
                    
                    const isSkipped = !!cache[sysId];
                    btn.textContent = isSkipped ? '🚫 Skipped' : 'Skip';
                    btn.style.background = isSkipped ? '#fce8e6' : '#fff';
                    btn.style.color = isSkipped ? '#c5221f' : '#333';
                    btn.style.borderColor = isSkipped ? '#f2b8b5' : '#ccc';
                    
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const numCell = row.querySelector('td[glide_field="number"]');
                        const tNum = numCell ? numCell.textContent.trim() : sysId;
                        toggleSkipState(sysId, tNum);
                        injectUIHooks();
                    };
                } else {
                    const btn = row.querySelector('.sn-interceptor-skip-btn');
                    if (btn) btn.remove();
                }
            });
        };

        const processQueue = async () => {
            if (isProcessing) return;
            isProcessing = true;
            try {
                const currentEnv = findEnv(topWin);
                if (!currentEnv || currentEnv.type !== 'list') {
                    updateStatus('Error: Not on a list view.');
                    isProcessing = false;
                    return;
                }
                const { win: currentWin, listEl: currentListEl } = currentEnv.ctx;
                const rows = Array.from(currentListEl.querySelectorAll('tbody > tr[sys_id]'));
                const cache = getSkippedCache();
                const unassignedTickets = [];

                rows.forEach(row => {
                    const sysId = row.getAttribute('sys_id');
                    if (!sysId || cache[sysId]) return;
                    
                    const assignedCell = row.querySelector('td[glide_field="assigned_to"]');
                    const isUnassigned = assignedCell && (!assignedCell.textContent.trim() || assignedCell.textContent.trim() === '(empty)');
                    if (!isUnassigned) return;
                    
                    const shortDescCell = row.querySelector('td[glide_field="short_description"]');
                    const shortDesc = shortDescCell ? shortDescCell.textContent.trim() : '';
                    unassignedTickets.push({ sysId, shortDesc });
                });

                if (unassignedTickets.length === 0) {
                    updateStatus(`Checked at ${new Date().toLocaleTimeString()}. No pending tickets.`);
                    isProcessing = false;
                    return;
                }

                const kwStr = keywordsInput.value.trim().toLowerCase();
                const keywords = kwStr ? kwStr.split(',').map(k => k.trim()).filter(Boolean) : [];
                
                const matchingTickets = unassignedTickets.filter(t => {
                    if (keywords.length === 0) return true;
                    const desc = t.shortDesc.toLowerCase();
                    return keywords.some(k => desc.includes(k));
                });

                if (matchingTickets.length === 0) {
                    updateStatus(`Checked at ${new Date().toLocaleTimeString()}. No keyword matches.`);
                    isProcessing = false;
                    return;
                }

                updateStatus(`Intercepting ${matchingTickets.length} ticket(s)...`);
                let assignedCount = 0;
                
                for (const t of matchingTickets) {
                    try {
                        const success = await assignTicket(t.sysId);
                        if (success) assignedCount++;
                    } catch (assignErr) {
                        console.error(`Failed assigning ticket ${t.sysId}:`, assignErr);
                    }
                }

                if (assignedCount === 0) {
                    updateStatus(`Checked at ${new Date().toLocaleTimeString()}. Match found but already assigned.`);
                    return;
                }

                updateStatus(`Assigned ${assignedCount} ticket(s). Refreshing...`);
                const refreshBtn = currentWin.document.querySelector('button[data-type="list_refresh"]');
                if (refreshBtn) {
                    return refreshBtn.click();
                }
                currentWin.location.reload();
                
            } catch (err) {
                console.error("Error during queue processing:", err);
                updateStatus(`Error: ${err.message}`);
            } finally {
                isProcessing = false;
            }
        };

        const checkTick = () => {
            if (activeCheckbox.checked) processQueue();
        };

        const toggleTimer = () => {
            if (queueTimerId) clearInterval(queueTimerId);
            if (!activeCheckbox.checked) {
                updateStatus('Monitoring paused.');
                return;
            }
            const val = parseInt(intervalInput.value, 10);
            const interval = (isNaN(val) || val < 5) ? 5000 : val * 1000;
            queueTimerId = setInterval(checkTick, interval);
            updateStatus('Monitoring active...');
            processQueue();
        };

        uiTimerId = setInterval(injectUIHooks, 1500);

        activeCheckbox.addEventListener('change', toggleTimer);
        intervalInput.addEventListener('change', toggleTimer);
        
        closeBtn.addEventListener('click', () => {
            if (queueTimerId) clearInterval(queueTimerId);
            if (uiTimerId) clearInterval(uiTimerId);
            modalEl.remove();
        });
    };

    // Extract the exact function body text dynamically
    const funcString = bookmarkletPayload.toString();
    const bodyStart = funcString.indexOf('{') + 1;
    const bodyEnd = funcString.lastIndexOf('}');
    const bodyCode = funcString.substring(bodyStart, bodyEnd);

    // Wrap in an IIFE and execute
    const executableCode = '(async () => {' + bodyCode + '})();';

    // Directly URL encode without naive regex minification to preserve standard syntax integrity
    const finalCode = 'javascript:' + encodeURIComponent(executableCode);
    const instructions = "Drag this link to your bookmarks bar. When on a ServiceNow list, click it to open the Queue Interceptor modal. Set your keywords, check 'Active Monitoring', and it will continually check for matching unassigned tickets and claim them for you.";

    app.showResult(finalCode, name, "Your Interceptor Tool", instructions);
}
