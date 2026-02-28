import { useState } from "react";
import { X, Loader2, Github } from "lucide-react";
import { signIn } from "../../../lib/auth-client"; // The tools we exported

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [loadingProvider, setLoadingProvider] = useState<
    "github" | "google" | null
  >(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSocialLogin = async (provider: "github" | "google") => {
    setLoadingProvider(provider);
    setErrorMsg("");

    try {
      // Better Auth handles the physical redirect instantly
      const { error } = await signIn.social({
        provider: provider,
        callbackURL: `${window.location.origin}/`,
      });

      if (error) throw new Error(error.message);
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Please try again.");
      setLoadingProvider(null); // release UI lock if fails
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-[#09090b] border border-zinc-800 rounded-lg shadow-2xl p-6 font-sans text-zinc-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold tracking-tight mb-2 text-center">
          Authenticate
        </h3>
        <p className="text-xs text-zinc-500 text-center mb-6">
          Access the Socratic IDE system.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {errorMsg}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleSocialLogin("github")}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 transition-colors py-2.5 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {loadingProvider === "github" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Github className="w-4 h-4" />
            )}
            Continue with GitHub
          </button>

          <button
            onClick={() => handleSocialLogin("google")}
            disabled={loadingProvider !== null}
            className="w-full flex items-center justify-center gap-2 bg-[#121214] border border-zinc-800 hover:bg-zinc-800 transition-colors py-2.5 rounded-md text-sm text-zinc-300 disabled:opacity-50"
          >
            {loadingProvider === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};
