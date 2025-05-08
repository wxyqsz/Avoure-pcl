import { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authLogs, setAuthLogs] = useState<{ message: string; type: string }[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState('Checking Supabase connection...');

  // Helper function to add timestamped logs with more visibility
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
    const logEntry = `[${timestamp}] ${message}`;
    
    console.log(`%c${logEntry}`, type === 'error' ? 'color: red; font-weight: bold' : 
                              type === 'success' ? 'color: green; font-weight: bold' : 
                              'color: blue');
    
    setAuthLogs(prev => [...prev, { message: logEntry, type }]);
  };

  // Test Supabase connection on component mount
  useEffect(() => {
    const testSupabaseConnection = async () => {
      try {
        addLog('Testing Supabase connection...');
        
        // Check if supabase client is properly initialized
        if (!supabase || typeof supabase.from !== 'function') {
          throw new Error('Supabase client is not properly initialized');
        }
        
        // Test authentication service
        const { error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          throw new Error(`Auth service error: ${authError.message}`);
        }
        
        addLog('Auth service is working properly', 'success');
        
        // Test database connection with a simple query
        const { error: testError } = await supabase
          .from('subscriptions')
          .select('id')
          .limit(1);
        
        if (testError) {
          throw new Error(`Database query error: ${testError.message}`);
        }
        
        addLog('Database connection successful', 'success');
        setSupabaseStatus('Supabase connection verified ✓');
        
        // Check Supabase version and configuration
        const { data: versionData, error: versionError } = await supabase
          .rpc('version', {});
        
        if (!versionError && versionData) {
          addLog(`Supabase version: ${JSON.stringify(versionData)}`, 'success');
        }
        
      } catch (err) {
        console.error('Supabase connection test failed:', err);
        addLog(`Supabase connection error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        setSupabaseStatus(`Supabase connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    
    testSupabaseConnection();
  }, []);

  // Helper function to normalize email addresses
  const normalizeEmail = (email: string) => {
    return email.trim().toLowerCase();
  };

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  // Get form errors
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

  // Determine if user is admin or regular subscriber
  const determineUserRole = async (userId: string, userEmail: string) => {
    addLog('Determining user role...', 'info');
    
    try {
      // First check the auth.users metadata for admin flag
      // In Supabase, admin users might be created with specific metadata
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        addLog(`Error getting user data: ${userError.message}`, 'error');
        return { role: 'subscriber', fullName: 'User' }; // Default to subscriber on error
      }
      
      // Check if metadata contains admin flag
      if (userData?.user?.user_metadata?.is_admin === true) {
        addLog('User has admin flag in metadata', 'success');
        return { 
          role: 'admin', 
          fullName: userData.user.user_metadata.full_name || 'Admin' 
        };
      }
      
      // Check user_profiles table for role
      addLog('Checking user_profiles table for role...', 'info');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, full_name')
        .eq('user_id', userId);
        
      if (!profileError && profileData && profileData.length > 0) {
        addLog(`Found user in user_profiles with role: ${profileData[0].role}`, 'success');
        return {
          role: profileData[0].role || 'subscriber',
          fullName: profileData[0].full_name || 'User'
        };
      }
      
      // If no profile exists, check if user is in subscriptions table
      addLog('Checking subscriptions table...', 'info');
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('full_name')
        .eq('email', userEmail);
        
      if (!subError && subData && subData.length > 0) {
        // User exists in subscription table - create profile with subscriber role
        addLog('User found in subscriptions table', 'success');
        
        // Create a profile for this user
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            email: userEmail,
            full_name: subData[0].full_name || 'Subscriber',
            role: 'subscriber'
          });
          
        if (createError) {
          addLog(`Error creating profile: ${createError.message}`, 'error');
        } else {
          addLog('Created subscriber profile', 'success');
        }
        
        return {
          role: 'subscriber',
          fullName: subData[0].full_name || 'Subscriber'
        };
      }
      
      // Final check - could be an admin user without metadata
      // This is where we'd check if the user was created through setup-admin
      addLog('Checking if user is admin without explicit flags...', 'info');
      
      // You might have a specific table for admins or some other way to identify them
      // For now, we'll assume any authenticated user not in subscriptions is an admin
      return {
        role: 'admin', // Default to admin if not found in subscriptions
        fullName: userData?.user?.user_metadata?.full_name || 'Admin User'
      };
      
    } catch (err) {
      addLog(`Error determining role: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      return { role: 'subscriber', fullName: 'User' }; // Default on error
    }
  };

  // Updated authentication handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset status, errors, and logs
    setError('');
    setAuthLogs([]);
    
    const startTime = Date.now();
    addLog('Starting authentication process');
    
    // Touch all fields to show validation errors
    setFormTouched({ email: true, password: true });
    
    const validationError = getFormErrors();
    if (validationError) {
      setError(validationError);
      addLog(`Validation error: ${validationError}`, 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const normalizedEmail = normalizeEmail(email);
      addLog(`Attempting to sign in with email: ${normalizedEmail}`);
      
      // Step 1: Try to sign in with Supabase Auth
      addLog('Step 1: Calling supabase.auth.signInWithPassword...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      // Detailed error handling for auth errors
      if (authError) {
        addLog(`Auth error details: ${JSON.stringify(authError)}`, 'error');
        throw new Error(authError.message || 'Invalid email or password');
      }

      if (!authData?.user) {
        addLog('No user data returned from auth service', 'error');
        throw new Error('No user data returned');
      }

      addLog(`Authentication successful for user ID: ${authData.user.id}`, 'success');
      
      // Store the auth token
      localStorage.setItem('authToken', authData.session?.access_token || '');
      addLog('Auth token stored in localStorage', 'success');
      
      // Step 2: Determine if user is admin or subscriber
      const { role, fullName } = await determineUserRole(authData.user.id, normalizedEmail);
      
      addLog(`User determined to have role: ${role}`, 'success');
      
      // Store user info
      localStorage.setItem('user', JSON.stringify({
        id: authData.user.id,
        email: authData.user.email,
        name: fullName,
        role: role
      }));
      
      // Save remembered email if selected
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', normalizedEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      setIsSubmitting(false);
      
      // Redirect based on role
      if (role === 'admin') {
        addLog('Admin login successful - redirecting to admin dashboard', 'success');
        setTimeout(() => {
          navigate('/admin');
        }, 500);
      } else {
        addLog('Subscriber login successful - redirecting to home page', 'success');
        setTimeout(() => {
          navigate('/');
        }, 500);
      }
      
    } catch (err) {
      const duration = Date.now() - startTime;
      addLog(`Authentication failed after ${duration}ms: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsSubmitting(false);
    } finally {
      const duration = Date.now() - startTime;
      addLog(`Authentication process completed in ${duration}ms`);
    }
  };

  // Modified session check - only loads email if remembered, but doesn't auto-login
  useEffect(() => {
    const initializeSignIn = async () => {
      setIsCheckingAuth(true);
      addLog('Initializing sign-in page');
      
      try {
        // Clear any existing session data to force manual login
        addLog('Clearing any existing session data', 'info');
        await supabase.auth.signOut();
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Load remembered email if enabled
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
          addLog('Loading remembered email', 'info');
          setEmail(rememberedEmail);
          setRememberMe(true);
        }
        
      } catch (err) {
        addLog(`Initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      } finally {
        setIsCheckingAuth(false);
        addLog('Sign-in page ready for manual login');
      }
    };

    initializeSignIn();
  }, []);

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
        
        {/* Supabase Connection Status */}
        <div className={`mb-6 p-3 ${
          supabaseStatus.includes('failed') 
            ? 'bg-red-50 text-red-700 border-red-200' 
            : supabaseStatus.includes('verified') 
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
        } text-sm border flex items-start`}>
          <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{supabaseStatus}</span>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm border border-red-200 flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Debug Logs */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-xs overflow-y-auto max-h-40">
          <strong>Auth Logs:</strong>
          <ul className="mt-1">
            {authLogs.map((log, index) => (
              <li key={index} className={`mb-1 ${
                log.type === 'error' ? 'text-red-700' : 
                log.type === 'success' ? 'text-green-700' : 'text-blue-700'
              }`}>{log.message}</li>
            ))}
          </ul>
        </div>
        
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
      </div>
    </div>
  );
}