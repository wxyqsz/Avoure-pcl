import { useState, useEffect } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Link } from "react-router-dom";
import { supabase } from '../supabaseClient';

export default function AvoureSubscribe() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  // Helper function to normalize email addresses
  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
  };

  // For simplicity in this demo, we'll use a simple encoding function
  const encodePassword = (password: string): string => {
    // This is a simple encoding, NOT secure for production
    return btoa(password); // Base64 encoding - not secure but works for demo
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo(null);
    setIsLoading(true);
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Set timeout to prevent endless loading state - reduced to 10 seconds
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setError('Request timed out. Please try again later.');
    }, 10000);
    
    setTimeoutId(timeout);
    
    // Validate form inputs
    if (!email || !name || !password || !termsAccepted) {
      setError('Please fill all required fields and accept the terms');
      setIsLoading(false);
      clearTimeout(timeout);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      clearTimeout(timeout);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      clearTimeout(timeout);
      return;
    }
    
    // Normalize the email address
    const normalizedEmail = normalizeEmail(email);
  
    try {
      console.log('Checking if user already exists:', normalizedEmail);
      
      // Check if email exists in subscriptions - added single() to force error if multiple results
      const { error: checkError } = await supabase
        .from('subscriptions')
        .select('email')
        .eq('email', normalizedEmail)
        .single();
      
      if (checkError) {
        // If the error is PGRST116 (not found), that means the user doesn't exist
        if (checkError.code === 'PGRST116') {
          console.log('User does not exist, proceeding with registration');
          
          // Encode the password - simple method for demo purposes
          const encodedPassword = encodePassword(password);
          
          // Insert into subscriptions table
          const { data: insertData, error: insertError } = await supabase
            .from('subscriptions')
            .insert([{ 
              email: normalizedEmail, 
              full_name: name,
              password_hash: encodedPassword,
              created_at: new Date().toISOString()
            }])
            .select();
        
          if (insertError) {
            console.error('Database insert error:', insertError);
            setDebugInfo(`Insert error: ${JSON.stringify(insertError)}`);
            throw new Error(`Failed to store user information: ${insertError.message}`);
          }
          
          console.log('User data inserted successfully', insertData);
          setSubmitted(true);
        } else {
          // This is a real error
          console.error('Error checking existing user:', checkError);
          setDebugInfo(`Database check error: ${JSON.stringify(checkError)}`);
          throw new Error(`Error checking existing user: ${checkError.message}`);
        }
      } else {
        // User exists
        setError('This email is already registered. Please sign in instead.');
        setIsLoading(false);
        clearTimeout(timeout);
        return;
      }
      
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err?.message || 'An unexpected error occurred. Please try again later.');
      setDebugInfo(`Catch error: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const handleSignInInstead = () => {
    window.location.href = '/signin';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-12 font-serif">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-light uppercase tracking-widest mb-2">AVOURE</h1>
        <div className="text-sm uppercase tracking-wider text-gray-500">INDIA</div>
      </div>

      {submitted ? (
        <div className="bg-white p-8 shadow-md max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-black text-white rounded-full p-2">
              <Check size={24} />
            </div>
          </div>
          <h2 className="text-2xl font-light mb-4">Thank You</h2>
          <p className="text-gray-600 mb-6">Your subscription to Avoure India has been confirmed. You can now sign in with your email and password.</p>
          <Link to="/signin">
            <button 
              className="px-6 py-3 bg-black text-white uppercase text-sm tracking-wider"
            >
              Sign In
            </button>
          </Link>
        </div>
      ) : (
        <div className="bg-white p-8 shadow-md max-w-md w-full">
          <h2 className="text-2xl font-light mb-6 text-center">Subscribe to Avoure India</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200">
              {error}
              {error.includes('already registered') && (
                <div className="mt-2">
                  <button 
                    onClick={handleSignInInstead}
                    className="text-red-700 underline"
                  >
                    Sign in instead
                  </button>
                </div>
              )}
            </div>
          )}
          
          {debugInfo && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 border border-blue-200 text-xs overflow-auto">
              <strong>Debug info:</strong> {debugInfo}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-black"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-black"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-black pr-10"
                  required
                  minLength={6}
                />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 px-4 py-2 focus:outline-none focus:border-black pr-10"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 mr-2" 
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required 
                />
                <span className="text-sm text-gray-600">I agree to the terms and conditions</span>
              </label>
            </div>
            
            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full px-6 py-3 bg-black text-white uppercase text-sm tracking-wider transition-colors focus:outline-none ${
                isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-900 active:bg-gray-800'
              }`}
            >
              {isLoading ? 'Processing...' : 'Subscribe Now'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Already a subscriber? <Link to="/signin" className="underline">Sign in</Link>
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Avoure India. All rights reserved.</p>
      </div>
    </div>
  );
}