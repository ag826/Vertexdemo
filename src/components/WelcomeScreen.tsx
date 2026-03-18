import { Users, Mic, Brain } from 'lucide-react';

interface WelcomeScreenProps {
  onSignIn: () => void;
}

export function WelcomeScreen({ onSignIn }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center max-w-lg mx-auto w-full">
        <div className="text-blue-400 font-semibold text-xl">Vertex</div>
        <button
          onClick={onSignIn}
          className="text-slate-300 hover:text-white transition-colors px-4 py-2"
        >
          Sign in
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-4">Capture conversations.<br />Build networking personas.</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Never forget a networking conversation again. Vertex automatically captures details and creates memorable persona cards for every contact.
          </p>
        </div>

        {/* Features */}
        <div className="w-full space-y-4 mb-12">
          <div className="flex items-start gap-4 bg-slate-900/50 backdrop-blur-sm p-4 rounded-lg border border-slate-800">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Mic className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Automatic Recording</h3>
              <p className="text-slate-400 text-sm">Record conversations hands-free without disrupting the flow</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-slate-900/50 backdrop-blur-sm p-4 rounded-lg border border-slate-800">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Smart Personas</h3>
              <p className="text-slate-400 text-sm">AI-generated persona cards with key facts and fun details</p>
            </div>
          </div>

          <div className="flex items-start gap-4 bg-slate-900/50 backdrop-blur-sm p-4 rounded-lg border border-slate-800">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">LinkedIn Integration</h3>
              <p className="text-slate-400 text-sm">Automatically pull professional details from LinkedIn profiles</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={onSignIn}
            className="w-full bg-gradient-to-r from-blue-400 to-purple-400 text-white py-3.5 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all font-semibold shadow-lg"
          >
            Sign up
          </button>
          <button
            onClick={onSignIn}
            className="w-full bg-slate-800 text-slate-200 py-3.5 rounded-lg hover:bg-slate-700 transition-colors font-semibold border border-slate-700"
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