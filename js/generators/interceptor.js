function generateInterceptor(app) {
    // [SECURITY BOUNDARY] Ensure app instance is provided
    if (!app) return console.warn('[generateInterceptor] Missing app context');

    const nameEl = document.getElementById('bookmarkletName-interceptor');
    const name = nameEl ? nameEl.value : 'Queue Interceptor';

    // The findEnvFn function finds the ServiceNow context window and list table element
    const findEnvFn = `function(w){
        try{
            function findFS(n){
                let f=n.querySelector('#gsft_main,iframe[name="gsft_main"]');
                if(f)return f;
                for(const e of n.querySelectorAll('*'))if(e.shadowRoot&&(f=findFS(e.shadowRoot)))return f;
                return null
            }
            function getE(t){
                if(!t)return null;
                const l=t.document.querySelector('#task_table,.list_table,[data-list_id]');
                return l?{type:'list',ctx:{win:t,listEl:l}}:null
            }
            const fe=findFS(w.document);
            if(fe&&fe.contentWindow){
                const fv=getE(fe.contentWindow);
                if(fv)return fv
            }
            return getE(w)
        }catch(e){console.warn('[findEnvFn] Failed to find environment:', e.message);}
        return null
    }`;

    // Here we use \\` to output \` in the JS literal, and \\${ to output \${ in the JS literal.
    // That way, it doesn't try to interpolate during the generator run, but evaluates correctly in the browser.
    const interceptorCode = `(async () => {
        const findEnv = ${findEnvFn};
        const env = findEnv(window.top);

        if (!env || env.type !== 'list') {
            alert('This tool must be run on a ServiceNow list view. Please navigate to a list and try again.');
            return;
        }

        const { win: winCtx, listEl } = env.context;
        const tableName = listEl.getAttribute('glide_table') || 'task';
        const topWin = window.top;

        // Modal initialization and drag/drop logic on the top frame
        const modalId = 'sn-interceptor-' + Date.now();
        if (topWin.document.getElementById('sn-interceptor-modal')) {
             alert('Interceptor is already running.');
             return;
        }

        const modalHTML = \\\`
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
                    <div style="display:flex;align-items:center;gap:8px;margin-top:5px;">
                        <input type="checkbox" id="sn-interceptor-active" />
                        <label for="sn-interceptor-active" style="font-size:14px;font-weight:bold;cursor:pointer;">Active Monitoring</label>
                    </div>
                    <div id="sn-interceptor-status" style="font-size:11px;color:#666;margin-top:5px;min-height:16px;">Ready.</div>
                </div>
            </div>
        \\\`;
        topWin.document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalEl = topWin.document.getElementById('sn-interceptor-modal');
        const headerEl = topWin.document.getElementById('sn-interceptor-header');
        const closeBtn = topWin.document.getElementById('sn-interceptor-close');
        const keywordsInput = topWin.document.getElementById('sn-interceptor-keywords');
        const intervalInput = topWin.document.getElementById('sn-interceptor-interval');
        const activeCheckbox = topWin.document.getElementById('sn-interceptor-active');
        const statusDiv = topWin.document.getElementById('sn-interceptor-status');

        // Drag and drop implementation
        let isDragging = false, startX, startY, initialLeft, initialTop;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            modalEl.style.left = \\\`\\\${initialLeft + dx}px\\\`;
            modalEl.style.top = \\\`\\\${initialTop + dy}px\\\`;
            modalEl.style.right = 'auto'; // Disable right positioning once moved
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

        // App state
        let timerId = null;
        let isProcessing = false;

        const updateStatus = (msg) => { statusDiv.textContent = msg; };

        // Finds the assigned_to field and sets it to the current user
        // Using window.g_user to get the current user ID
        const assignTicket = async (sysId) => {
             const GFORM_POLL_INTERVAL = 100, GFORM_MAX_ATTEMPTS = 50;
             const waitForGForm = (win) => new Promise((resolve, reject) => {
                let attempts = 0;
                const check = () => {
                    if (win && win.g_form && typeof win.g_form.getValue === 'function' && win.g_user && win.g_user.userID) {
                        return resolve({ g_form: win.g_form, g_user: win.g_user });
                    }
                    if (attempts++ < GFORM_MAX_ATTEMPTS) {
                        return setTimeout(check, GFORM_POLL_INTERVAL);
                    }
                    reject(new Error('g_form/g_user not available'));
                };
                check();
             });

             return new Promise((resolve, reject) => {
                const url = '/' + tableName + '.do?sys_id=' + sysId + '&sysparm_nostack=true';
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
                        const context = await waitForGForm(frame.contentWindow);
                        const { g_form, g_user } = context;

                        // Check if it's already assigned
                        const currentAssignee = g_form.getValue('assigned_to');
                        if (currentAssignee) {
                            setTimeout(() => { frame.remove(); resolve(false); }, 1000);
                            return;
                        }

                        g_form.setValue('assigned_to', g_user.userID);
                        g_form.save();
                        setTimeout(() => { frame.remove(); resolve(true); }, 2000);
                    } catch(e) {
                        console.error(\`[assignTicket] Failed to assign ticket \${sysId}:\`, e.message);
                        frame.remove();
                        resolve(false);
                    }
                };
                frame.onerror = () => {
                    frameLoaded = true;
                    clearTimeout(frameTimeout);
                    frame.remove();
                    resolve(false);
                };
                frame.src = url;
            });
        };

        const processQueue = async () => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                // Determine current list environment and get tickets
                const currentEnv = findEnv(topWin);
                if (!currentEnv || currentEnv.type !== 'list') {
                     updateStatus('Error: Not on a list view.');
                     isProcessing = false;
                     return;
                }

                const { win: currentWin, listEl: currentListEl } = currentEnv.context;

                // Get tickets that appear unassigned (empty assignment cell)
                // Assumes there's an assigned_to column in the list view
                const rows = Array.from(currentListEl.querySelectorAll('tbody > tr[sys_id]'));
                const unassignedTickets = [];

                rows.forEach(row => {
                     const sysId = row.getAttribute('sys_id');
                     if (!sysId) return;

                     const assignedCell = row.querySelector('td[glide_field="assigned_to"]');
                     // If column exists and is empty or has a specific empty representation
                     const isUnassigned = assignedCell && (!assignedCell.textContent.trim() || assignedCell.textContent.trim() === '(empty)');

                     if (!isUnassigned) return;

                     const shortDescCell = row.querySelector('td[glide_field="short_description"]');
                     const shortDesc = shortDescCell ? shortDescCell.textContent.trim() : '';
                     unassignedTickets.push({ sysId, shortDesc });
                });

                if (unassignedTickets.length === 0) {
                     updateStatus(\`Checked at \${new Date().toLocaleTimeString()}. No unassigned tickets.\`);
                     isProcessing = false;
                     return;
                }

                // Apply keyword filter
                const kwStr = keywordsInput.value.trim().toLowerCase();
                const keywords = kwStr ? kwStr.split(',').map(k => k.trim()).filter(Boolean) : [];

                const matchingTickets = unassignedTickets.filter(t => {
                     if (keywords.length === 0) return true;
                     const desc = t.shortDesc.toLowerCase();
                     return keywords.some(k => desc.includes(k));
                });

                if (matchingTickets.length === 0) {
                     updateStatus(\`Checked at \${new Date().toLocaleTimeString()}. No matches.\`);
                     isProcessing = false;
                     return;
                }

                updateStatus(\`Intercepting \${matchingTickets.length} ticket(s)...\`);

                let assignedCount = 0;
                for (const t of matchingTickets) {
                     const success = await assignTicket(t.sysId);
                     if (success) assignedCount++;
                }

                if (assignedCount === 0) {
                     updateStatus(\`Checked at \${new Date().toLocaleTimeString()}. Tickets were already assigned.\`);
                     return;
                }

                updateStatus(\`Assigned \${assignedCount} ticket(s). Refreshing...\`);

                // Try to trigger the list refresh native to ServiceNow
                const refreshBtn = currentWin.document.querySelector('button[data-type="list_refresh"]');
                if (refreshBtn) {
                    return refreshBtn.click();
                }

                // Fallback to location reload
                currentWin.location.reload();

            } catch (err) {
                console.error(err);
                updateStatus(\`Error during processing: \${err.message}\`);
            } finally {
                isProcessing = false;
            }
        };

        const checkTick = () => {
             if (activeCheckbox.checked) {
                  processQueue();
             }
        };

        const toggleTimer = () => {
             if (timerId) clearInterval(timerId);
             if (!activeCheckbox.checked) {
                  updateStatus('Monitoring paused.');
                  return;
             }

             const val = parseInt(intervalInput.value, 10);
             const interval = (isNaN(val) || val < 5) ? 5000 : val * 1000;
             timerId = setInterval(checkTick, interval);
             updateStatus('Monitoring active...');
             // Run immediately once when turned on
             processQueue();
        };

        activeCheckbox.addEventListener('change', toggleTimer);
        intervalInput.addEventListener('change', toggleTimer);

        closeBtn.addEventListener('click', () => {
             if (timerId) clearInterval(timerId);
             modalEl.remove();
        });

    })();`;

    // Minify and encode
    let minified = interceptorCode
        .replace(/\/\*([\s\S]*?)\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
        .replace(/\s+/g, ' ')
        .trim();

    // Convert the triple backslash back to single literal backtick
    minified = minified.replace(/\\\\\\`/g, '\`');

    const finalCode = 'javascript:' + encodeURIComponent(minified);
    const instructions = "Drag this link to your bookmarks bar. When on a ServiceNow list, click it to open the Queue Interceptor modal. Set your keywords, check 'Active Monitoring', and it will continually check for matching unassigned tickets and claim them for you.";

    app.showResult(finalCode, name, "Your Interceptor Tool", instructions);
}
