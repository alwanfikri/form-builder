export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-gray-500 mt-1 text-sm">Internal form management platform</p>
        </div>

        <div className="space-y-3">
          <a
            href="/auth/google"
            className="btn btn-secondary w-full justify-center py-3 text-base"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46.145 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h12.445c-.535 2.9-2.16 5.36-4.605 7.01l7.44 5.78c4.345-4.01 6.865-9.92 6.865-16.8z"/>
              <path fill="#34A853" d="M24 47c6.24 0 11.475-2.065 15.3-5.6l-7.44-5.78c-2.065 1.385-4.71 2.205-7.86 2.205-6.045 0-11.165-4.085-12.99-9.575l-7.665 5.925C7.195 41.655 14.98 47 24 47z"/>
              <path fill="#FBBC05" d="M11.01 28.25A14.63 14.63 0 0110.5 24c0-1.485.255-2.925.51-4.25L3.345 13.825A23.997 23.997 0 001 24c0 3.875.93 7.545 2.345 10.875l7.665-6.625z"/>
              <path fill="#EA4335" d="M24 9.5c3.405 0 6.45 1.17 8.85 3.465l6.63-6.63C35.455 2.62 30.22.5 24 .5 14.98.5 7.195 5.845 3.345 14.175l7.665 5.925C12.835 14.585 17.955 9.5 24 9.5z"/>
            </svg>
            Continue with Google
          </a>

          <a
            href="/auth/microsoft"
            className="btn btn-secondary w-full justify-center py-3 text-base"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
              <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
            </svg>
            Continue with Microsoft
          </a>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Internal use only. By signing in you agree to the data usage policy.
        </p>
      </div>
    </div>
  );
}
