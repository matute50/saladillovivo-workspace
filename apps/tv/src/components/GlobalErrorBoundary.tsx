'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * GlobalErrorBoundary
 * Catch JavaScript errors anywhere in the child component tree, log those errors,
 * and display a fallback UI instead of the component tree that crashed.
 * 
 * CRITICAL FOR TV DEBUGGING: Displays error on screen instead of white screen.
 */
class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full bg-red-900 text-white p-8 flex flex-col justify-center items-start overflow-auto z-[9999] absolute top-0 left-0">
                    <h1 className="text-4xl font-bold mb-4">CRITICAL APPLICATION ERROR</h1>
                    <h2 className="text-2xl font-semibold mb-2">Something went wrong.</h2>

                    <div className="bg-black/50 p-6 rounded-lg border border-white/20 w-full mb-6">
                        <h3 className="text-xl text-red-300 font-mono mb-2">Error Message:</h3>
                        <pre className="whitespace-pre-wrap font-mono text-lg break-all">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                    </div>

                    {this.state.errorInfo && (
                        <div className="bg-black/50 p-6 rounded-lg border border-white/20 w-full">
                            <h3 className="text-xl text-yellow-300 font-mono mb-2">Component Stack:</h3>
                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300 overflow-x-auto">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </div>
                    )}

                    <button
                        className="mt-8 px-8 py-4 bg-white text-red-900 font-bold text-xl rounded hover:bg-gray-200 transition-colors"
                        onClick={() => window.location.reload()}
                    >
                        RELOAD APPLICATION
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
