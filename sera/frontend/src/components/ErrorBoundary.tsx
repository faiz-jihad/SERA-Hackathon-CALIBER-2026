import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in SERA application:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#F8FAFC] p-6 text-slate-800">
          <div className="w-full max-w-lg rounded-sm border border-red-200 bg-white p-6 shadow-md text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={28} />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Application Error</h1>
            <p className="mt-2 text-xs text-slate-600">
              Something went wrong while rendering the interface.
            </p>
            {this.state.error?.message && (
              <pre className="mt-4 max-h-40 overflow-auto rounded bg-slate-100 p-3 text-left font-mono text-xs text-red-700">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                <RefreshCw size={14} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
