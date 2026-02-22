(function () {
    if (typeof window === 'undefined') return;

    // NUCLEAR FIX: Disable Vercel Feedback and Toolbar scripts entirely
    // This is the only way to stop feedback.js from adding non-passive listeners
    window.VERCEL_FEEDBACK_DISABLED = 1;
    window.VERCEL_TOOLBAR_DISABLED = 1;

    // Guardar la referencia original
    var originalAddEventListener = EventTarget.prototype.addEventListener;

    // Sobrescribir EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        var modifiedOptions = options;

        // List of events that Chrome audits for passivity
        if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
            if (typeof options === 'boolean') {
                modifiedOptions = { capture: options, passive: true };
            } else if (typeof options === 'object' && options !== null) {
                // Enforce passive: true
                modifiedOptions = Object.assign({}, options, { passive: true });
            } else {
                modifiedOptions = { passive: true };
            }
        }

        return originalAddEventListener.call(this, type, listener, modifiedOptions);
    };

    console.log('--- NUCLEAR TOUCH EVENT PATCH ACTIVE (Vercel Feedback Disabled) ---');
})();
