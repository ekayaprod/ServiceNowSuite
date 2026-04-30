const generateUpdater = (app) => {
    const cfg = { commentField: document.getElementById('commentField').value };
    const name = document.getElementById('bookmarkletName-updater').value.trim() || 'Deferred Updater';

    /**
     * Environment Detection Function (Form & List)
     *
     * Locates the ServiceNow environment (form or list) within the window hierarchy.
     * Handles shadow DOM traversal and cross-origin iframe restrictions.
     *
     * @param {Window} w - The window object to start searching from.
     * @returns {{type: 'form'|'list', context: {win: Window, g_form?: Object, listEl?: Element}} | null}
     */
    const findEnvFn = `function(w){try{function e(t){let n=t.querySelector("#gsft_main,iframe[name=gsft_main]");if(n)return n;const o=t.querySelectorAll("*");for(const r of o){if(!r.shadowRoot)continue;n=e(r.shadowRoot);if(n)return n;}return null}function t(n){return n?n.g_form&&"function"==typeof n.g_form.getTableName?{type:"form",context:{win:n,g_form:n.g_form}}:n.document.querySelector("#task_table,.list_table,[data-list_id]")?{type:"list",context:{win:n,listEl:n.document.querySelector("#task_table,.list_table,[data-list_id]")}}:null:null}const n=e(w.document);if(n&&n.contentWindow){try{const o=t(n.contentWindow);if(o)return o}catch(o){console.debug("Cross-origin frame access blocked (expected):",o.message)}}return t(w)}catch(o){return console.error("Error finding ServiceNow environment:",o.message),null}}`;

    // Generate final tool script
    const updaterCode = `(function(){
            const cfg = ${JSON.stringify(cfg)};
            const findEnv = ${findEnvFn};
            const env = findEnv(window.top);

            if (!env || env.type !== 'list') {
                alert('This tool must be run on a ServiceNow list view. Please navigate to a list (like incident_list.do) and try again.');
                return;
            }

            const { win: winCtx, listEl } = env.context;
            const tableName = listEl.getAttribute('glide_table') || 'task';
            const modalId = 'sdbu-' + Date.now() + '-' + performance.now().toString(36).replace('.', '') + '-' + Math.random().toString(36).substr(2, 9);

            if (document.getElementById(modalId)) return;

            const tickets = Array.from(listEl.querySelectorAll('tbody > tr[sys_id]')).map(row => {
                const sysId = row.getAttribute('sys_id');
                const numberEl = row.querySelector('td[glide_field="number"] a');
                const shortDescEl = row.querySelector('td[glide_field="short_description"]');
                if (!sysId || !numberEl) return null;
                const isChecked = row.querySelector('input.list_checkbox[type="checkbox"]')?.checked || false;
                return {
                    sysId: sysId,
                    number: numberEl.textContent.trim(),
                    shortDesc: shortDescEl ? shortDescEl.textContent.trim() : '',
                    checked: isChecked
                };
            }).filter(Boolean);

            const checkedTickets = tickets.filter(t => t.checked);
            const targetTickets = checkedTickets.length > 0 ? checkedTickets : tickets;

            if (targetTickets.length === 0) {
                alert('No tickets found in the current list view.');
                return;
            }

            const modalHTML = \`
                <div id="\${modalId}" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">
                    <div style="width:90%;max-width:800px;background:#fff;color:#000;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);display:flex;flex-direction:column;max-height:90vh;">
                        <h3 style="margin:0;padding:20px;background:#0066cc;color:#fff;border-radius:12px 12px 0 0;">Deferred Bulk Updater</h3>
                        <div style="padding:20px;overflow-y:auto;flex-grow:1;">
                            <div style="font-size: 0.9em; margin-bottom: 15px;">
                                \${checkedTickets.length > 0 ? \`Updating <strong>\${checkedTickets.length}</strong> checked ticket(s).\` : \`No tickets were checked. Updating <strong>all \${tickets.length}</strong> tickets in list.\`}
                            </div>
                            <div id="\${modalId}-ticket-list" style="max-height:30vh;overflow-y:auto;border:1px solid #ccc;padding:10px;border-radius:6px;">
                                \${targetTickets.map(t => \`
                                    <label style="display:flex;align-items:center;padding:8px;border-bottom:1px solid #eee;cursor:pointer;">
                                        <input type="checkbox" value="\${t.sysId}" class="\${modalId}-ticket-cb" style="margin-right:12px;" checked>
                                        <div>
                                            <strong>\${t.number}</strong><br>
                                            <span style="font-size:0.9em;opacity:0.8;">\${t.shortDesc}</span>
                                        </div>
                                    </label>
                                \`).join('')}
                            </div>
                            <div style="margin-top:20px;">
                                <label for="\${modalId}-comment" style="display:block;font-weight:bold;margin-bottom:5px;">Comment to Add:</label>
                                <textarea id="\${modalId}-comment" style="width:100%;height:100px;padding:8px;border:1px solid #ccc;border-radius:6px;box-sizing: border-box;"></textarea>
                            </div>
                            <div style="margin-top:20px;">
                                <label for="\${modalId}-delay" style="display:block;font-weight:bold;margin-bottom:5px;">Delay (in minutes):</label>
                                <input type="number" id="\${modalId}-delay" value="5" min="1" style="width:100px;padding:8px;border:1px solid #ccc;border-radius:6px;box-sizing: border-box;">
                            </div>
                        </div>
                        <div id="\${modalId}-footer" style="padding:20px;border-top:1px solid #ccc;display:flex;justify-content:flex-end;gap:10px;">
                            <button id="\${modalId}-cancel" style="padding:8px 16px;">Cancel</button>
                            <button id="\${modalId}-schedule" style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;">Schedule Update</button>
                        </div>
                    </div>
                </div>
            \`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const closeModal = () => document.getElementById(modalId)?.remove();

            document.getElementById(modalId + '-cancel').onclick = closeModal;
            document.getElementById(modalId + '-schedule').onclick = () => {
                const selectedIds = Array.from(document.querySelectorAll('.\${modalId}-ticket-cb:checked')).map(cb => cb.value);
                const comment = document.getElementById(modalId + '-comment').value.trim();
                const delayMinutes = parseInt(document.getElementById(modalId + '-delay').value, 10);

                if (selectedIds.length === 0) { alert('Please select at least one ticket.'); return; }
                if (!comment) { alert('Please enter a comment.'); return; }
                if (isNaN(delayMinutes) || delayMinutes < 1) { alert('Please enter a valid delay in minutes (1 or more).'); return; }

                const delayMs = delayMinutes * 60 * 1000;

                alert(\`Update for \${selectedIds.length} tickets has been scheduled to run in \${delayMinutes} minutes. You can close this tab, but not the browser window.\`);
                closeModal();

                setTimeout(() => {
                    (async () => {
                        console.log(\`Starting deferred update for \${selectedIds.length} tickets...\`);
                        const GFORM_POLL_INTERVAL = 100, GFORM_MAX_ATTEMPTS = 50, SAVE_DELAY_MS = 1500;
                        const waitForGForm = (win) => new Promise((resolve, reject) => { let attempts = 0; const check = () => { if (win && win.g_form && typeof win.g_form.getValue === 'function') { resolve(win.g_form); } else if (attempts++ < GFORM_MAX_ATTEMPTS) { setTimeout(check, GFORM_POLL_INTERVAL); } else { reject(new Error('g_form not available')); } }; check(); });

                        for (const sysId of selectedIds) {
                            try {
                                const url = '/' + tableName + '.do?sys_id=' + sysId + '&sysparm_nostack=true';
                                const frame = document.createElement('iframe');
                                frame.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;';
                                document.body.appendChild(frame);

                                await new Promise((resolve, reject) => {
                                    let frameLoaded = false;
                                    const frameTimeout = setTimeout(() => {
                                        if (!frameLoaded) {
                                            frame.remove();
                                            reject(new Error('Frame load timeout'));
                                        }
                                    }, 8000);

                                    frame.onload = async () => {
                                        frameLoaded = true;
                                        clearTimeout(frameTimeout);
                                        try {
                                            const g_form = await waitForGForm(frame.contentWindow);
                                            g_form.setValue(cfg.commentField, comment);
                                            g_form.save();
                                            console.log(\`Successfully updated ticket with sys_id: \${sysId}\`);
                                            setTimeout(() => { frame.remove(); resolve(); }, SAVE_DELAY_MS);
                                        } catch(e) { frame.remove(); reject(e); }
                                    };
                                    frame.onerror = () => {
                                        frameLoaded = true;
                                        clearTimeout(frameTimeout);
                                        frame.remove();
                                        reject(new Error('Frame load error'));
                                    };
                                    frame.src = url;
                                });
                            } catch (e) {
                                console.warn('Error updating individual ticket:', e.message);
                            }
                        }
                        alert('Deferred bulk update process has completed.');
                    })();
                }, delayMs);
            };
        })();`;

    const finalCode = "javascript:" + updaterCode;
    const instructions = "Run this tool on a ServiceNow list view. A panel will appear allowing you to select tickets (or all tickets, if none are checked) and schedule a bulk comment update.";
    app.showResult(finalCode, name, "Your Tool Bookmarklet", instructions);
};
