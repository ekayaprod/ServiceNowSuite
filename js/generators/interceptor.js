function generateInterceptor(app) {
    if (!app) return;

    const nameEl = document.getElementById('bookmarkletName-interceptor');
    const name = nameEl ? nameEl.value : 'Queue Interceptor';

    const bookmarkletPayload = async function() {
        const topWin = window.top;

        const findEnv = function(w) {
            try {
                function findFS(n) {
                    let f = n.querySelector('#gsft_main,iframe[name="gsft_main"]');
                    if (f) return f;
                    const a = n.querySelectorAll('*');
                    for (const e of a) if (e.shadowRoot && (f = findFS(e.shadowRoot))) return f;
                    return null;
                }
                function gC(t) {
                    if (!t) return null;
                    if (t.g_form && typeof t.g_form.getTableName === 'function') return { type: 'form', ctx: { w: t, g: t.g_form } };
                    const l = t.document.querySelector('#task_table,.list_table,[data-list_id]');
                    if (l) return { type: 'list', ctx: { w: t, l } };
                    return null;
                }
                const fe = findFS(w.document);
                if (fe && fe.contentWindow) {
                    const fv = gC(fe.contentWindow);
                    if (fv) return fv;
                }
                return gC(w);
            } catch (e) {
                return null;
            }
        };

        const env = findEnv(topWin);
        if (!env || env.type !== 'list') {
            alert('This tool must be run on a ServiceNow list view.');
            return;
        }

        if (topWin.document.getElementById('sn-interceptor-modal')) {
            alert('Interceptor is already running.');
            return;
        }

        const winCtx = env.ctx.w;
        const listEl = env.ctx.l;
        const tableName = listEl.getAttribute('glide_table') || 'task';
        const targetUserId = (winCtx.g_user && winCtx.g_user.userID) || '3688734ec3e25e98e2e1d00c050131b9';

        const CACHE_KEY = 'sn_interceptor_skipped_tickets';
        const getSkippedCache = () => JSON.parse(topWin.localStorage.getItem(CACHE_KEY) || '{}');
        const setSkippedCache = (data) => topWin.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        const updateCacheUI = () => {
            const countEl = topWin.document.getElementById('sn-interceptor-skip-count');
            if (countEl) countEl.textContent = Object.keys(getSkippedCache()).length;
        };
        const toggleSkipState = (sysId, ticketNum) => {
            const cache = getSkippedCache();
            if (cache[sysId]) delete cache[sysId];
            else cache[sysId] = ticketNum || 'Unknown';
            setSkippedCache(cache);
            updateCacheUI();
        };

        const modalHTML = '<div id="sn-interceptor-modal" style="position:fixed;top:20px;right:20px;width:320px;background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;font-family:sans-serif;border:1px solid #ddd;display:flex;flex-direction:column;overflow:hidden;">' +
            '<div id="sn-interceptor-header" style="background:#0066cc;color:#fff;padding:10px 15px;cursor:grab;display:flex;justify-content:space-between;align-items:center;user-select:none;">' +
                '<span style="font-weight:bold;font-size:14px;">Queue Interceptor</span>' +
                '<button id="sn-interceptor-close" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">&times;</button>' +
            '</div>' +
            '<div style="padding:15px;display:flex;flex-direction:column;gap:10px;">' +
                '<div>' +
                    '<label style="font-size:12px;font-weight:bold;color:#555;">Keywords</label>' +
                    '<input type="text" id="sn-interceptor-keywords" value="Distribution Lists, Resource Account, Security Group, Shared Folder, VPN" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-top:4px;font-size:11px;" />' +
                    '<div id="sn-interceptor-presets" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;"></div>' +
                '</div>' +
                '<div>' +
                    '<label style="font-size:12px;font-weight:bold;color:#555;">Interval (s)</label>' +
                    '<input type="number" id="sn-interceptor-interval" value="15" min="5" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;margin-top:4px;" />' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:#f5f5f5;border-radius:4px;">' +
                    '<span style="font-size:11px;">Skipped: <strong id="sn-interceptor-skip-count">0</strong></span>' +
                    '<button id="sn-interceptor-clear-skip" style="font-size:9px;padding:2px 4px;cursor:pointer;border:1px solid #ccc;background:#fff;border-radius:3px;">Clear</button>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<input type="checkbox" id="sn-interceptor-active" />' +
                    '<label for="sn-interceptor-active" style="font-size:13px;font-weight:bold;cursor:pointer;">Active Monitoring</label>' +
                '</div>' +
                '<div id="sn-interceptor-status" style="font-size:10px;color:#666;min-height:14px;">Ready.</div>' +
                '<div style="font-size:11px;font-weight:bold;color:#555;border-top:1px solid #eee;padding-top:8px;">Recent Assignments</div>' +
                '<div id="sn-interceptor-history" style="font-size:10px;color:#333;height:85px;overflow-y:auto;background:#f9f9f9;border:1px solid #eee;border-radius:4px;padding:4px;"></div>' +
            '</div>' +
        '</div>';

        topWin.document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modalEl = topWin.document.getElementById('sn-interceptor-modal');
        const keywordsInput = topWin.document.getElementById('sn-interceptor-keywords');
        const presetDiv = topWin.document.getElementById('sn-interceptor-presets');
        const statusDiv = topWin.document.getElementById('sn-interceptor-status');
        const historyDiv = topWin.document.getElementById('sn-interceptor-history');
        const activeCheckbox = topWin.document.getElementById('sn-interceptor-active');

        topWin.document.getElementById('sn-interceptor-clear-skip').onclick = () => {
            if (confirm('Clear all skipped tickets from local cache?')) {
                topWin.localStorage.removeItem(CACHE_KEY);
                updateCacheUI();
                injectUIHooks();
            }
        };

        topWin.document.getElementById('sn-interceptor-close').onclick = () => { 
            if(queueTimerId) clearInterval(queueTimerId); 
            if(uiTimerId) clearInterval(uiTimerId); 
            modalEl.remove(); 
        };

        const header = topWin.document.getElementById('sn-interceptor-header');
        header.onmousedown = (e) => {
            if (e.target.id === 'sn-interceptor-close') return;
            let startX = e.clientX, startY = e.clientY, rect = modalEl.getBoundingClientRect();
            let initialLeft = rect.left, initialTop = rect.top;
            const move = (me) => { modalEl.style.left = (initialLeft + (me.clientX - startX)) + 'px'; modalEl.style.top = (initialTop + (me.clientY - startY)) + 'px'; modalEl.style.right = 'auto'; };
            const up = () => { topWin.document.removeEventListener('mousemove', move); topWin.document.removeEventListener('mouseup', up); };
            topWin.document.addEventListener('mousemove', move);
            topWin.document.addEventListener('mouseup', up);
        };

        const getKeywords = () => keywordsInput.value.toLowerCase().split(',').map(k => k.trim()).filter(Boolean);
        const logAssignment = (ticketNum, shortDesc) => {
            const entry = topWin.document.createElement('div');
            entry.style.cssText = 'border-bottom:1px solid #eee; margin-bottom:2px; padding-bottom:2px;';
            entry.innerHTML = '<span style="color:#0066cc;">[' + new Date().toLocaleTimeString() + ']</span> <strong>' + ticketNum + '</strong>';
            historyDiv.prepend(entry);
            if (historyDiv.children.length > 10) historyDiv.lastChild.remove();
        };

        const renderPresets = () => {
            const list = ['Distribution Lists', 'Resource Account', 'Security Group', 'Shared Folder', 'VPN'];
            const current = getKeywords();
            presetDiv.innerHTML = list.map(kw => {
                const active = current.includes(kw.toLowerCase());
                const bg = active ? '#0066cc' : '#f1f3f4';
                const col = active ? '#fff' : '#555';
                const icon = active ? '\u2713' : '+';
                return '<span class="sn-preset-btn" data-kw="' + kw + '" style="background:' + bg + ';color:' + col + ';border:1px solid #ccc;font-size:9px;padding:1px 5px;border-radius:10px;cursor:pointer;">' + icon + ' ' + kw + '</span>';
            }).join('');
        };
        
        presetDiv.onclick = (e) => {
            const btn = e.target.closest('.sn-preset-btn'); 
            if (!btn) return;
            let kw = btn.getAttribute('data-kw'), kws = getKeywords();
            const idx = kws.indexOf(kw.toLowerCase());
            if (idx > -1) kws.splice(idx, 1); 
            else kws.push(kw);
            keywordsInput.value = kws.join(', ');
            renderPresets(); 
            injectUIHooks();
        };
        
        renderPresets(); 
        updateCacheUI();

        const getColIndexes = (l) => {
            const idxs = { a: -1, d: -1, n: -1 };
            const headers = l.querySelectorAll('th.list_header_cell, th.list_hdr, .list_header th');
            Array.from(headers).forEach((th, i) => {
                const attr = (th.getAttribute('glide_field') || th.getAttribute('name') || '').toLowerCase();
                if (attr.includes('assigned_to')) idxs.a = i;
                else if (attr.includes('short_description')) idxs.d = i;
                else if (attr.includes('number')) idxs.n = i;
            });
            return idxs;
        };

        const assignTicket = (sysId) => new Promise((resolve, reject) => {
            const url = '/' + tableName + '.do?sys_id=' + sysId + '&sysparm_nostack=true';
            const fr = topWin.document.createElement('iframe');
            fr.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;border:none;';
            let to = setTimeout(() => { fr.remove(); reject('timeout'); }, 10000);
            fr.onload = () => {
                setTimeout(() => {
                    try {
                        const targetEnv = findEnv(fr.contentWindow);
                        if (targetEnv && targetEnv.ctx && targetEnv.ctx.g) {
                            const g = targetEnv.ctx.g;
                            if (g.getValue('assigned_to')) { fr.remove(); clearTimeout(to); resolve(false); return; }
                            g.setValue('assigned_to', targetUserId);
                            g.save();
                            setTimeout(() => { fr.remove(); clearTimeout(to); resolve(true); }, 1500);
                        }
                    } catch(e) { fr.remove(); clearTimeout(to); reject(e); }
                }, 500);
            };
            topWin.document.body.appendChild(fr);
            fr.src = url;
        });

        const injectUIHooks = () => {
            const current = findEnv(topWin); 
            if (!current || current.type !== 'list') return;
            const curWin = current.ctx.w;
            const curList = current.ctx.l;
            const cols = getColIndexes(curList); 
            if (cols.a === -1) return;
            const cache = getSkippedCache(); 
            const kws = getKeywords();
            
            curList.querySelectorAll('tbody > tr[sys_id]').forEach(row => {
                const sysId = row.getAttribute('sys_id');
                const assignedCell = row.cells[cols.a];
                if (!assignedCell || (assignedCell.textContent.trim() && assignedCell.textContent.trim() !== '(empty)')) return;
                
                let ui = row.querySelector('.sn-interceptor-ui');
                if (!ui) { 
                    ui = curWin.document.createElement('div'); 
                    ui.className = 'sn-interceptor-ui'; 
                    ui.style.marginLeft = '5px'; 
                    assignedCell.appendChild(ui); 
                }
                
                const skipped = !!cache[sysId];
                const dCell = row.cells[cols.d];
                const desc = dCell ? dCell.textContent.trim().toLowerCase() : '';
                const match = kws.length === 0 || kws.some(k => desc.includes(k));
                
                const bg = skipped ? '#fee' : (match ? '#efe' : '#f5f5f5');
                const txt = skipped ? '\uD83D\uDEAB Skip' : (match ? '\uD83C\uDFAF Pick' : '\u26AA Ignore');
                const btnTxt = skipped ? 'Unskip' : 'Skip';

                ui.innerHTML = '<span style="font-size:9px; font-weight:bold; padding:1px 4px; border-radius:4px; background:' + bg + '">' + txt + '</span>' +
                               '<button style="font-size:9px; cursor:pointer; margin-left:3px;">' + btnTxt + '</button>';
                
                row.style.background = skipped ? 'rgba(255,0,0,0.05)' : (match ? 'rgba(0,255,0,0.05)' : '');
                
                ui.querySelector('button').onclick = (e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    const nCell = row.cells[cols.n];
                    toggleSkipState(sysId, nCell ? nCell.textContent.trim() : ''); 
                    injectUIHooks(); 
                };
            });
        };

        const processQueue = async () => {
            const current = findEnv(topWin); 
            if (!current || current.type !== 'list') return;
            const curWin = current.ctx.w;
            const curList = current.ctx.l;
            const cols = getColIndexes(curList); 
            if (cols.a === -1) return;
            
            const cache = getSkippedCache();
            const kws = getKeywords();
            const matches = [];
            
            curList.querySelectorAll('tbody > tr[sys_id]').forEach(row => {
                const id = row.getAttribute('sys_id');
                const assigned = row.cells[cols.a];
                if (!id || cache[id] || (assigned.textContent.trim() && assigned.textContent.trim() !== '(empty)')) return;
                const dCell = row.cells[cols.d];
                const desc = dCell ? dCell.textContent.trim() : '';
                if (kws.length === 0 || kws.some(k => desc.toLowerCase().includes(k))) {
                    const nCell = row.cells[cols.n];
                    matches.push({ id: id, desc: desc, num: nCell ? nCell.textContent.trim() : '' });
                }
            });

            if (!matches.length) { 
                statusDiv.textContent = 'Checked at ' + new Date().toLocaleTimeString() + '. No matches.'; 
                return; 
            }
            statusDiv.textContent = 'Claiming ' + matches.length + ' ticket(s)...';
            
            let assignedCount = 0;
            for (const m of matches) {
                try { 
                    if (await assignTicket(m.id)) {
                        logAssignment(m.num, m.desc); 
                        assignedCount++;
                    } 
                } catch(e) {}
            }
            
            if (assignedCount === 0) return;
            
            if (curWin.GlideList2) curWin.GlideList2.get(curList.getAttribute('data-list_id') || tableName)?.refresh();
            else curWin.location.reload();
        };

        let queueTimerId = null;
        let uiTimerId = setInterval(injectUIHooks, 1500);
        
        activeCheckbox.onchange = () => {
            if (queueTimerId) clearInterval(queueTimerId);
            if (!activeCheckbox.checked) { statusDiv.textContent = 'Paused.'; return; }
            const ms = Math.max(5, parseInt(topWin.document.getElementById('sn-interceptor-interval').value, 10)) * 1000;
            queueTimerId = setInterval(processQueue, ms);
            processQueue();
        };
        
        keywordsInput.addEventListener('input', () => {
            renderPresets();
            injectUIHooks();
        });
    };

    let funcString = bookmarkletPayload.toString();
    const bodyStart = funcString.indexOf('{') + 1;
    const bodyEnd = funcString.lastIndexOf('}');
    let bodyCode = funcString.substring(bodyStart, bodyEnd);

    bodyCode = bodyCode.replace(/\s+/g, ' ');

    const executableCode = '(async function(){' + bodyCode + '})();';
    const finalCode = 'javascript:' + encodeURIComponent(executableCode);
    const instructions = "Drag this link to your bookmarks bar. When on a ServiceNow list, click it to open the Queue Interceptor modal. Set your keywords, check 'Active Monitoring', and it will continually check for matching unassigned tickets and claim them for you.";

    app.showResult(finalCode, name, "Your Interceptor Tool", instructions);
}
