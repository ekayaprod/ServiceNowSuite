const fs = require('fs');

describe('ticket_template.html app logic boundary interrogation', () => {
    let app;
    let mockDOM;

    beforeEach(() => {
        const html = fs.readFileSync('ticket_template.html', 'utf8');
        const scriptContent = html.split('<script>')[1].split('</script>')[0];

        mockDOM = {
            getElementById: jest.fn().mockImplementation((id) => {
                if (id === 'step1' || id === 'step2-template' || id === 'step3-result') {
                    return { classList: { add: jest.fn(), remove: jest.fn() } };
                }
                if (id === 'bookmarklet-link') return { href: '' };
                if (id === 'startOverBtn') return { addEventListener: jest.fn() };
                return null;
            }),
            querySelectorAll: jest.fn().mockReturnValue([
                { classList: { add: jest.fn(), remove: jest.fn() } }
            ])
        };

        global.document = mockDOM;
        global.console = {
            warn: jest.fn(),
            log: jest.fn(),
            error: jest.fn()
        };

        const evalStr = `
            (() => {
                ${scriptContent.replace('app.init();', '')}
                return app;
            })();
        `;
        app = eval(evalStr);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.document;
        delete global.console;
    });

    describe('showStep', () => {
        test('gracefully rejects strict null and empty boundaries without mutating DOM', () => {
            app.showStep(null);
            app.showStep(undefined);
            app.showStep('');

            expect(global.document.querySelectorAll).not.toHaveBeenCalled();
            expect(global.document.getElementById).not.toHaveBeenCalled();
            expect(global.console.warn).not.toHaveBeenCalled();
        });

        test('handles truthy integers by prefixing step', () => {
            app.showStep(1);
            expect(global.document.querySelectorAll).toHaveBeenCalledWith('.step');
            expect(global.document.getElementById).toHaveBeenCalledWith('step1');
        });

        test('handles strings with partial IDs', () => {
            app.showStep('2-template');
            expect(global.document.getElementById).toHaveBeenCalledWith('step2-template');
        });

        test('handles strings with full IDs', () => {
            app.showStep('step2-template');
            expect(global.document.getElementById).toHaveBeenCalledWith('step2-template');
        });

        test('handles falsey non-null values without crashing, logging a warning if element not found', () => {
            app.showStep(0);
            expect(global.document.getElementById).toHaveBeenCalledWith('step0');
            expect(global.console.warn).toHaveBeenCalledWith('[showStep] Invalid target: step0');

            app.showStep(false);
            expect(global.document.getElementById).toHaveBeenCalledWith('stepfalse');
            expect(global.console.warn).toHaveBeenCalledWith('[showStep] Invalid target: stepfalse');
        });
    });

    describe('showResult', () => {
        test('rejects execution when mandatory code or name parameters are strictly null or empty', () => {
            app.showResult(null, 'Name', 'Title', 'Instructions');
            expect(global.console.warn).toHaveBeenCalledWith('[showResult] Missing required parameters');

            app.showResult(undefined, 'Name', 'Title', 'Instructions');
            expect(global.console.warn).toHaveBeenCalledWith('[showResult] Missing required parameters');

            app.showResult('', 'Name', 'Title', 'Instructions');
            expect(global.console.warn).toHaveBeenCalledWith('[showResult] Missing required parameters');

            app.showResult('javascript:void(0)', null, 'Title', 'Instructions');
            expect(global.console.warn).toHaveBeenCalledWith('[showResult] Missing required parameters');

            app.showResult('javascript:void(0)', '', 'Title', 'Instructions');
            expect(global.console.warn).toHaveBeenCalledWith('[showResult] Missing required parameters');

            // Prove that missing parameters stopped execution before DOM manipulation
            expect(global.document.getElementById).not.toHaveBeenCalled();
        });

        test('rejects execution when the target container is missing from the DOM', () => {
            // Mock getElementById to return null for step3-result
            global.document.getElementById.mockReturnValueOnce(null);

            app.showResult('javascript:void(0)', 'Name', 'Title', 'Instructions');
            expect(global.console.warn).toHaveBeenCalledWith('[showResult] Container not found');
        });

        test('executes successfully and binds events with valid parameters', () => {
            const startOverBtnMock = { addEventListener: jest.fn() };
            const containerMock = { innerHTML: '', classList: { add: jest.fn(), remove: jest.fn() } };
            const linkMock = { href: '' };

            global.document.getElementById.mockImplementation((id) => {
                if (id === 'step3-result') return containerMock;
                if (id === 'bookmarklet-link') return linkMock;
                if (id === 'startOverBtn') return startOverBtnMock;
                return null;
            });

            app.showResult('javascript:void(0)', 'Test Name', 'Test Title', 'Test Instructions');

            expect(global.document.getElementById).toHaveBeenCalledWith('step3-result');
            expect(containerMock.innerHTML).toContain('Test Title');
            expect(containerMock.innerHTML).toContain('Test Instructions');
            expect(linkMock.href).toBe('javascript:void(0)');
            expect(startOverBtnMock.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });
});