import { Users, Mic, Brain } from 'lucide-react';
import vertexLogo from 'figma:asset/62edb3c51125a4b122ed2c06dafbbf9a9e7bec60.png';

interface WelcomeScreenProps {
  onSignIn: () => void;
}

export function WelcomeScreen({ onSignIn }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center max-w-lg mx-auto w-full">
        <img src={vertexLogo} alt="Vertex" className="h-8" />
        <button
          onClick={onSignIn}
          className="text-slate-700 hover:text-slate-900 transition-colors px-4 py-2 font-medium"
        >
          Sign in
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-8">
            <img src={vertexLogo} alt="Vertex" className="w-64 h-auto" />
          </div>
          <h1 className="text-slate-900 mb-4">Capture conversations.<br />Build networking personas.</h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Never forget a networking conversation again. Vertex automatically captures details and creates memorable persona cards for every contact.
          </p>
        </div>

        {/* Features */}
        <div className="w-full space-y-4 mb-12">
          <div className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <Mic className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold mb-1">Automatic Recording</h3>
              <p className="text-slate-600 text-sm">Record conversations hands-free without disrupting the flow</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex-shrink-0 w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold mb-1">Smart Personas</h3>
              <p className="text-slate-600 text-sm">AI-generated persona cards with key facts and fun details</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold mb-1">LinkedIn Integration</h3>
              <p className="text-slate-600 text-sm">Automatically pull professional details from LinkedIn profiles</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={onSignIn}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3.5 rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all font-semibold shadow-lg"
          >
            Sign up
          </button>
          <button
            onClick={onSignIn}
            className="w-full bg-white text-slate-700 py-3.5 rounded-lg hover:bg-slate-50 transition-colors font-semibold border border-slate-300"
          >
            Sign in
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-slate-500 text-sm">
        <p>Designed for busy professionals at networking events</p>
      </footer>
    </div>
  );
}