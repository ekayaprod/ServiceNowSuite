/**
 * @jest-environment jsdom
 */
const fs = require('fs');

describe('The Fair-Weather Alibi Shakedown', () => {
    let mockApp;
    let consoleWarnSpy;
    let alertSpy;

    beforeEach(() => {
        // Provide the perfect setup for the initial state
        document.body.innerHTML = `
            <div id="step1" class="step active"></div>
            <div id="step2-template" class="step"></div>
            <div id="step3-result"></div>
            <a id="bookmarklet-link"></a>
            <button id="startOverBtn"></button>

            <input id="two_click" type="checkbox" checked />
            <input id="bookmarkletName-template" type="text" value="Test Template" />

            <input id="bookmarkletName-updater" type="text" value="Test Updater" />
            <input id="commentField" type="text" value="comments" />
            <textarea id="updaterFields">[{"name":"state","value":"2"}]</textarea>

            <input id="bookmarkletName-automation" type="text" value="Test Automation" />

            <input id="bookmarkletName-extractor" type="text" value="Test Extractor" />

            <input id="bookmarkletName-interceptor" type="text" value="Test Interceptor" />
        `;

        mockApp = {
            showResult: jest.fn(),
            showStep: jest.fn()
        };

        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

        const html = fs.readFileSync('ticket_template.html', 'utf8');

        // Extract the app object safely
        const appCodeMatch = html.match(/const app = \{[\s\S]*?\n\};/);
        if (appCodeMatch) {
            eval('global.app = ' + appCodeMatch[0].substring(12));
        }

        // Load generators directly from the files to ensure they are parsed into global scope
        const files = [
            'js/generators/template.js',
            'js/generators/updater.js',
            'js/generators/automation.js',
            'js/generators/interceptor.js'
        ];

        files.forEach(file => {
            if (fs.existsSync(file)) {
                let code = fs.readFileSync(file, 'utf8');
                // Replace const generateX = with global.generateX =
                code = code.replace(/const\s+(generate[A-Z][a-z]+)\s*=\s*/g, 'global.$1 = ');
                code = code.replace(/function\s+(generate[A-Z][a-z]+)\s*\(/g, 'global.$1 = function(');
                eval(code);
            }
        });

        // Load extractor specifically because it's a const arrow function
        let extractorCode = fs.readFileSync('js/generators/extractor.js', 'utf8');
        extractorCode = extractorCode.replace(/const\s+generateExtractor\s*=\s*/, 'global.generateExtractor = ');
        eval(extractorCode);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('App Logic (ticket_template.html)', () => {
        it('app.showStep should handle objects with missing classList gracefully', () => {
            const el = document.createElement('div');
            // Remove classList for the trap
            Object.defineProperty(el, 'classList', { value: undefined });
            jest.spyOn(document, 'getElementById').mockReturnValueOnce(el);

            global.app.showStep('test');
            expect(consoleWarnSpy).toHaveBeenCalledWith('[showStep] Invalid target: steptest');
        });

        it('app.showResult should warn if container is not found', () => {
            document.body.innerHTML = ''; // Remove container
            global.app.showResult('code', 'name', 'title', 'instructions');
            expect(consoleWarnSpy).toHaveBeenCalledWith('[showResult] Container not found');
        });
    });

    describe('Generators (The Truth Mandate)', () => {
        it('generateTemplate should NOT crash on missing two_click element (Expose The Fair-Weather Alibi)', () => {
            document.getElementById('two_click').remove();

            expect(() => {
                global.generateTemplate(mockApp);
            }).not.toThrow();
        });

        it('generateUpdater should NOT crash on missing commentField element', () => {
            document.getElementById('commentField').remove();

            expect(() => {
                global.generateUpdater(mockApp);
            }).not.toThrow();
        });

        it('generateAutomation should NOT crash on missing bookmarkletName element', () => {
            document.getElementById('bookmarkletName-automation').remove();

            expect(() => {
                global.generateAutomation(mockApp);
            }).not.toThrow();
        });

        it('generateExtractor should NOT crash on missing bookmarkletName element', () => {
            document.getElementById('bookmarkletName-extractor').remove();

            expect(() => {
                global.generateExtractor(mockApp);
            }).not.toThrow();
        });

        it('generateInterceptor should safely handle missing bookmarkletName element', () => {
            document.getElementById('bookmarkletName-interceptor').remove();

            expect(() => {
                global.generateInterceptor(mockApp);
            }).not.toThrow();

            expect(mockApp.showResult).toHaveBeenCalled();
            expect(mockApp.showResult.mock.calls[0][1]).toBe('Queue Interceptor');
        });
    });
});
