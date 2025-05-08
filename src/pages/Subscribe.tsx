import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// This would be your actual Supabase client
import { supabase } from '../supabaseClient';

export default function AvoureSignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formTouched, setFormTouched] = useState({
    email: false,
    password: false,
    fullName: false
  });

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validateFullName = (name: string) => {
    return name.trim().length >= 2;
  };

  const getFormErrors = () => {
    const errors = [];
    
    if (formTouched.fullName && !fullName) {
      errors.push('Full name is required');
    } else if (formTouched.fullName && !validateFullName(fullName)) {
      errors.push('Full name must be at least 2 characters');
    }
    
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

  const handleInputChange = (field: string, value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else if (field === 'password') {
      setPassword(value);
    } else {
      setFullName(value);
    }
    
    setFormTouched({
      ...formTouched,
      [field]: true
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset errors
    setError('');
    
    // Touch all fields to show validation errors
    setFormTouched({ 
      email: true, 
      password: true,
      fullName: true 
    });
    
    const validationError = getFormErrors();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Normalize email (lowercase and trim)
      const normalizedEmail = email.trim().toLowerCase();
      
      console.log('Creating user account...');
      
      // 1. Register user using Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'subscriber'
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      if (!data?.user) {
        throw new Error('Failed to create account. Please try again.');
      }

      console.log('User created successfully:', data.user.id);
      
      // 2. Add user profile to user_profiles table (same as in signin.tsx)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: normalizedEmail,
          full_name: fullName.trim(),
          role: 'subscriber'
        });

      if (profileError) {
        console.error('Error adding user profile:', profileError);
        throw new Error('Failed to complete signup. Please contact support.');
      }
      
      // 3. Navigate to email verification screen
      navigate('/verify-email?email=' + encodeURIComponent(normalizedEmail));
      
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-12 font-serif">
      {/* Header with elegant typography */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-light uppercase tracking-widest mb-3">AVOURE</h1>
        <div className="text-sm uppercase tracking-wider text-gray-500 border-b border-t border-gray-200 py-2 px-8 inline-block">INDIA</div>
      </div>

      <div className="bg-white p-8 shadow-md max-w-md w-full border border-gray-100">
        <h2 className="text-2xl font-light mb-8 text-center uppercase tracking-wide">Become a Subscriber</h2>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm border border-red-200 flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              onBlur={() => setFormTouched({ ...formTouched, fullName: true })}
              className={`w-full border ${
                formTouched.fullName && !validateFullName(fullName) ? 'border-red-300' : 'border-gray-300'
              } px-4 py-3 focus:outline-none focus:border-black transition-colors`}
              placeholder="Enter your full name"
            />
            {formTouched.fullName && !fullName && (
              <p className="mt-1 text-xs text-red-600">Full name is required</p>
            )}
            {formTouched.fullName && fullName && !validateFullName(fullName) && (
              <p className="mt-1 text-xs text-red-600">Full name must be at least 2 characters</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => setFormTouched({ ...formTouched, email: true })}
              className={`w-full border ${
                formTouched.email && !validateEmail(email) ? 'border-red-300' : 'border-gray-300'
              } px-4 py-3 focus:outline-none focus:border-black transition-colors`}
              placeholder="your@email.com"
            />
            {formTouched.email && !email && (
              <p className="mt-1 text-xs text-red-600">Email is required</p>
            )}
            {formTouched.email && email && !validateEmail(email) && (
              <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm uppercase tracking-wider text-gray-500 mb-2">Create Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={() => setFormTouched({ ...formTouched, password: true })}
                className={`w-full border ${
                  formTouched.password && !validatePassword(password) ? 'border-red-300' : 'border-gray-300'
                } px-4 py-3 focus:outline-none focus:border-black transition-colors`}
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
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
          
          <div className="mt-8">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full px-6 py-3 flex items-center justify-center ${
                isSubmitting ? 'bg-gray-700' : 'bg-black hover:bg-gray-900'
              } text-white uppercase tracking-wide font-light text-sm transition-colors`}
            >
              {isSubmitting ? (
                <span>Creating Account...</span>
              ) : (
                <span className="flex items-center">
                  Subscribe to Avoure <ArrowRight size={16} className="ml-2" />
                </span>
              )}
            </button>
          </div>
          
          <div className="text-center mt-6 text-sm text-gray-500">
            Already have an account? <a href="/login" className="text-black underline hover:no-underline">Sign In</a>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-center text-gray-400">
          By subscribing, you agree to our <a href="/terms" className="underline hover:text-gray-600">Terms of Service</a> and <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Avoure India. All rights reserved.
      </div>
    </div>
  );
}