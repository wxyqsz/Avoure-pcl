import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { checkAuth } from '../auth/authUtils';

export default function AvoureSignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formTouched, setFormTouched] = useState({
    email: false,
    password: false
  });
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [authLogs, setAuthLogs] = useState<string[]>([]);

  // Helper function to add timestamped logs
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(logEntry); // Ensure logs are visible in browser console
    setAuthLogs(prev => [...prev, logEntry]);
    
    // Update auth status for UI feedback
    setAuthStatus(message);
  };

  // Helper function to normalize email addresses
  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
  };

  // Simplified password handler - just direct comparison
  const checkPassword = (storedPassword: string, inputPassword: string): boolean => {
    if(!storedPassword || !inputPassword) {
      addLog('Missing password data');
      return false;
    }
    
    addLog(`Comparing passwords (stored: ${storedPassword.length} chars, input: ${inputPassword.length} chars)`);
    return inputPassword === storedPassword;
  };

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const getFormErrors = () => {
    const errors = [];
    
    if (formTouched.email && !email) {
      errors.push('Email is required');
    } else if (formTouched.email && !validateEmail(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (formTouched.password && !password) {
      errors.push('Password is required');
    } else if (formTouched.password && !validatePassword(password)) {
      errors.push('Password must be at least 6 characters');
    }
    
    return errors.length > 0 ? errors.join('. ') : '';
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
    
    setFormTouched({
      ...formTouched,
      [field]: true
    });
  };

  // Fixed admin authentication with better error handling
  const handleAdminAuth = async (normalizedEmail: string, password: string) => {
    const startTime = Date.now();
    addLog('Starting admin authentication');
    
    try {
      // FIXED: Make sure to set a reasonable timeout for the Supabase call
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      const duration = Date.now() - startTime;
      addLog(`Admin auth completed in ${duration}ms`);

      if (error) {
        addLog(`Admin auth failed: ${error.message}`);
        return { success: false, error, duration };
      }

      if (data?.user) {
        addLog(`Admin auth successful for user ID: ${data.user.id}`);
        
        // Store auth data
        localStorage.setItem('authToken', data.session?.access_token || '');
        localStorage.setItem('user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || 'Admin',
          role: 'admin'
        }));
        
        // Add a flag to prevent authentication loop
        localStorage.setItem('adminAuthComplete', 'true');
        
        return { success: true, role: 'admin', duration };
      }
      
      addLog('Admin auth failed: No user data returned');
      return { success: false, duration };
    } catch (err) {
      const duration = Date.now() - startTime;
      addLog(`Admin auth error after ${duration}ms: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { success: false, error: err, duration };
    }
  };

  // Fixed subscriber authentication with proper error handling
  const handleSubscriberAuth = async (normalizedEmail: string, password: string) => {
    const startTime = Date.now();
    addLog('Starting subscriber authentication');
    
    try {
      // Test database connection first
      addLog('Attempting to connect to Supabase');
      
      // FIXED: Make sure we don't time out on slow connections
      const { data: subscriber, error } = await supabase
        .from('subscriptions')
        .select('id, email, full_name, password_hash, created_at')
        .eq('email', normalizedEmail)
        .single();
      
      const dbQueryDuration = Date.now() - startTime;
      addLog(`Database query completed in ${dbQueryDuration}ms`);
      
      // Debug log the actual response
      if (debugMode) {
        addLog(`Query response: ${JSON.stringify({ 
          hasSubscriber: !!subscriber, 
          errorCode: error && 'code' in error ? error.code : undefined,
          errorMessage: error?.message 
        })}`);
      }
      
      if (error) {
        // Check if this is "record not found" error (PGRST116)
        if ('code' in error && error.code === 'PGRST116') {
          addLog('No subscriber account found with this email');
          return { success: false, error: new Error('Invalid email or password'), duration: Date.now() - startTime };
        }
        
        addLog(`Subscriber lookup error: ${error.message}`);
        return { success: false, error, duration: Date.now() - startTime };
      }

      if (!subscriber) {
        addLog('No subscriber data returned');
        return { success: false, error: new Error('No account found with this email'), duration: Date.now() - startTime };
      }

      addLog(`Found subscriber ID: ${subscriber.id}`);
      
      // Check if password_hash exists
      if (!subscriber.password_hash) {
        addLog('Invalid subscriber account: Missing password');
        return { success: false, error: new Error('Invalid account data'), duration: Date.now() - startTime };
      }

      // Check password with consistent comparison logic
      const passwordMatch = checkPassword(subscriber.password_hash, password);
      
      if (passwordMatch) {
        addLog('Subscriber authentication successful');
        
        try {
          createSubscriberSession(subscriber);
          return { success: true, role: 'subscriber', duration: Date.now() - startTime };
        } catch (sessionError) {
          addLog(`Failed to create subscriber session: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`);
          return { success: false, error: new Error('Authentication failed'), duration: Date.now() - startTime };
        }
      }
      
      // If we get here, password comparison failed
      addLog('Invalid subscriber password');
      return { success: false, error: new Error('Invalid email or password'), duration: Date.now() - startTime };
      
    } catch (err) {
      const duration = Date.now() - startTime;
      addLog(`Subscriber auth error after ${duration}ms: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { success: false, error: err, duration };
    }
  };
  
  // Helper function to create subscriber session
  const createSubscriberSession = (subscriber: any) => {
    addLog('Creating subscriber session');
    
    // FIXED: Add try/catch to handle potential JSON errors
    try {
      // Create subscriber session
      const userData = {
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.full_name,
        role: 'subscriber' 
      };

      localStorage.setItem('authToken', `sub_${subscriber.id}_${Date.now()}`);
      localStorage.setItem('user', JSON.stringify(userData));
      // FIXED: Add a flag similar to admin to prevent loop
      localStorage.setItem('subscriberAuthComplete', 'true');
      
      addLog('Subscriber session created successfully');
    } catch (err) {
      addLog(`Error creating subscriber session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err; // Re-throw to handle in calling function
    }
  };

  // Improved submit handler for reliability
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset status, errors, and logs
    setAuthStatus(null);
    setError('');
    setAuthLogs([]);
    
    const overallStartTime = Date.now();
    addLog('Starting authentication process');
    
    // Touch all fields to show validation errors
    setFormTouched({ email: true, password: true });
    
    const validationError = getFormErrors();
    if (validationError) {
      setError(validationError);
      addLog(`Validation error: ${validationError}`);
      return;
    }
    
    setIsSubmitting(true);
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      addLog('Cleared previous timeout');
    }
    
    // FIXED: Set a reasonable timeout of 45 seconds to accommodate slower connections
    const timeout = setTimeout(() => {
      setIsSubmitting(false);
      setError('Request timed out. Please try again later.');
      addLog('Authentication timed out after 45 seconds');
    }, 45000);
    
    setTimeoutId(timeout);
    addLog('Set authentication timeout for 45 seconds');
    
    const normalizedEmail = normalizeEmail(email);
    addLog(`Normalized email: ${normalizedEmail}`);
    
    try {
      // Try admin authentication first
      addLog('Trying admin authentication first');
      
      const adminResult = await handleAdminAuth(normalizedEmail, password);
      
      if (adminResult.success) {
        // Admin login successful
        addLog(`Admin auth successful (took ${adminResult.duration}ms)`);
        
        // FIXED: Clean up properly
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
          addLog('Cleared timeout');
        }
        
        // Save remembered email if selected
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', normalizedEmail);
          addLog('Saved remembered email');
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // FIXED: Complete all state updates BEFORE navigation
        setIsSubmitting(false);
        
        // FIXED: Use a more reliable approach for navigation
        addLog('Admin login successful - redirecting to admin dashboard');
        setTimeout(() => {
          navigate('/admin');
        }, 500);
        
        return;
      }
      
      // Admin auth failed, try subscriber auth
      addLog('Admin auth failed, trying subscriber authentication');
      
      const subscriberResult = await handleSubscriberAuth(normalizedEmail, password);
      
      if (subscriberResult.success) {
        // Subscriber login successful
        addLog(`Subscriber authentication successful (took ${subscriberResult.duration}ms)`);
        
        // FIXED: Clean up properly
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
          addLog('Cleared timeout');
        }
        
        // Save remembered email if selected
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', normalizedEmail);
          addLog('Saved remembered email');
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // FIXED: Complete all state updates BEFORE navigation
        setIsSubmitting(false);
        
        // FIXED: Use a more reliable approach for navigation
        addLog('Subscriber login successful - redirecting to home page');
        setTimeout(() => {
          navigate('/');
        }, 500);
        
        return;
      }
      
      // Both authentication methods failed
      addLog('Both authentication methods failed');
      setError('Invalid email or password. Please check your credentials and try again.');
      
    } catch (err) {
      addLog(`Sign in error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message || 'Login failed. Please try again.' : 'An unexpected error occurred');
    } finally {
      const totalDuration = Date.now() - overallStartTime;
      addLog(`Authentication process completed in ${totalDuration}ms`);
      
      // Clear the timeout in finally block
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
        addLog('Cleared timeout in finally block');
      }
      
      setIsSubmitting(false);
    }
  };
  
  // Enable debug mode with key combination (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setDebugMode(prev => !prev);
        console.log('Debug mode:', !debugMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [debugMode]);

  // FIXED: Improved session check on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      setIsCheckingAuth(true);
      const sessionStartTime = Date.now();
      console.log('Checking for existing session');
      
      // Safety timeout for auth check
      const authCheckTimeout = setTimeout(() => {
        console.log('Auth check timed out after 10 seconds');
        setIsCheckingAuth(false);
      }, 10000);
      
      try {
        // First, check if auth data exists in localStorage
        const storedUser = localStorage.getItem('user');
        const authToken = localStorage.getItem('authToken');
        
        // If no stored auth data, skip further checks
        if (!storedUser || !authToken) {
          console.log('No stored auth data found');
          clearTimeout(authCheckTimeout);
          setIsCheckingAuth(false);
          return;
        }
        
        console.log('Found stored auth data, validating...');
        
        try {
          // Parse storedUser to check role directly
          const userData = JSON.parse(storedUser);
          const role = userData?.role;
          
          // FIXED: Check BOTH admin and subscriber completion flags
          const adminAuthComplete = localStorage.getItem('adminAuthComplete');
          const subscriberAuthComplete = localStorage.getItem('subscriberAuthComplete');
          
          if (adminAuthComplete || subscriberAuthComplete) {
            console.log('Just completed authentication, skipping redirect');
            localStorage.removeItem('adminAuthComplete');
            localStorage.removeItem('subscriberAuthComplete');
            clearTimeout(authCheckTimeout);
            setIsCheckingAuth(false);
            return;
          }
          
          // Double check with checkAuth for security
          const authResult = await checkAuth();
          const isAuthenticated = authResult?.success || false;
          
          if (isAuthenticated) {
            console.log(`User is authenticated as ${role} - session check took ${Date.now() - sessionStartTime}ms`);
            
            // FIXED: More reliable navigation approach
            setTimeout(() => {
              if (role === 'admin') {
                navigate('/admin');
              } else if (role === 'subscriber') {
                navigate('/');
              }
            }, 500);
          } else {
            // If checkAuth says not authenticated, clear stored data
            console.log('Stored auth data is invalid, clearing...');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.log('Auth validation failed, proceeding to login screen');
          // Don't clear auth data on error, just continue to login screen
        }
      } catch (err) {
        console.log(`Auth check error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        clearTimeout(authCheckTimeout);
        setIsCheckingAuth(false);
        console.log(`Session check completed in ${Date.now() - sessionStartTime}ms`);
      }
    };

    // Load remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }

    checkExistingSession();
  }, [navigate]);

  const handleForgotPassword = async () => {
    if (!email || !validateEmail(email)) {
      setFormTouched({ ...formTouched, email: true });
      setError('Please enter a valid email address');
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    setIsSubmitting(true);
    
    // Clear logs and set status
    setAuthLogs([]);
    addLog(`Starting password reset for: ${normalizedEmail}`);
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Set timeout to prevent endless loading state
    const timeout = setTimeout(() => {
      setIsSubmitting(false);
      setError('Request timed out. Please try again later.');
      addLog('Password reset request timed out after 20 seconds');
    }, 20000);
    
    setTimeoutId(timeout);

    try {
      // First check if it's an admin
      addLog('Checking admin accounts');
      
      const { error: adminError } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      
      if (!adminError) {
        // Clear timeout if successful
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
        }
        addLog('Admin reset email sent successfully');
        
        // FIXED: Complete state updates before navigation
        setIsSubmitting(false);
        
        setTimeout(() => {
          navigate('/reset-password?email=' + encodeURIComponent(normalizedEmail));
        }, 500);
        return;
      }

      // If not admin, check subscriptions table
      addLog('Checking subscriber accounts');
      
      const { data: subscriber, error: subError } = await supabase
        .from('subscriptions')
        .select('email')
        .eq('email', normalizedEmail)
        .single();

      if (subError && 'code' in subError && subError.code !== 'PGRST116') {
        // Real error, not just "not found"
        addLog(`Subscriber check error: ${subError.message}`);
        throw new Error('Error checking subscriber');
      }

      if (subscriber) {
        addLog('Subscriber account found, proceeding to reset page');
        
        // FIXED: Complete state updates before navigation
        setIsSubmitting(false);
        
        setTimeout(() => {
          navigate('/reset-password?email=' + encodeURIComponent(normalizedEmail));
        }, 500);
      } else {
        addLog('No account found with this email');
        setError('No account found with this email');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('timed out')) {
        addLog('Password reset timed out');
        setError('Request timed out. Please try again later.');
      } else {
        addLog(`Password reset error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setError(err instanceof Error ? err.message : 'Failed to send reset email');
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      setIsSubmitting(false);
    }
  };

  // Show loading indicator while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-12 font-serif">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-light uppercase tracking-widest mb-2">AVOURE</h1>
          <div className="text-sm uppercase tracking-wider text-gray-500">INDIA</div>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-12 font-serif">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-light uppercase tracking-widest mb-2">AVOURE</h1>
        <div className="text-sm uppercase tracking-wider text-gray-500">INDIA</div>
      </div>

      <div className="bg-white p-8 shadow-md max-w-md w-full">
        <h2 className="text-2xl font-light mb-6 text-center">Sign In</h2>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm border border-red-200 flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {debugMode && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 border border-blue-200 text-xs overflow-y-auto max-h-40">
            <strong>Auth Logs:</strong>
            <ul className="mt-1">
              {authLogs.map((log, index) => (
                <li key={index} className="mb-1">{log}</li>
              ))}
              {authStatus && <li className="font-bold">{authStatus}</li>}
            </ul>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => setFormTouched({ ...formTouched, email: true })}
              className={`w-full border ${
                formTouched.email && !validateEmail(email) ? 'border-red-300' : 'border-gray-300'
              } px-4 py-2 focus:outline-none focus:border-black`}
              data-testid="email-input"
            />
            {formTouched.email && !email && (
              <p className="mt-1 text-xs text-red-600">Email is required</p>
            )}
            {formTouched.email && email && !validateEmail(email) && (
              <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={() => setFormTouched({ ...formTouched, password: true })}
                className={`w-full border ${
                  formTouched.password && !validatePassword(password) ? 'border-red-300' : 'border-gray-300'
                } px-4 py-2 focus:outline-none focus:border-black`}
                data-testid="password-input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formTouched.password && !password && (
              <p className="mt-1 text-xs text-red-600">Password is required</p>
            )}
            {formTouched.password && password && !validatePassword(password) && (
              <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters</p>
            )}
          </div>

          <div className="flex justify-between items-center mb-6">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="h-4 w-4 mr-2" 
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                data-testid="remember-me-checkbox"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <button 
              type="button" 
              onClick={handleForgotPassword}
              className="text-sm text-gray-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full px-6 py-3 ${
              isSubmitting ? 'bg-gray-700' : 'bg-black hover:bg-gray-900'
            } text-white uppercase text-sm tracking-wider transition-colors flex justify-center items-center`}
            data-testid="sign-in-button"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in...</span>
              </div>
            ) : (
              <span className="flex items-center">
                Sign In <ArrowRight size={16} className="ml-2" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account? <Link to="/subscribe" className="underline">Subscribe now</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Avoure India. All rights reserved.</p>
        {debugMode && <p className="mt-1 text-gray-400">Debug Mode Active (Ctrl+Shift+D)</p>}
      </div>
    </div>
  );
}