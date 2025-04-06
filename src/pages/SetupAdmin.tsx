import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const createAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Step 1: Register the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      
      if (!data.user?.id) {
        throw new Error('User creation failed - no user ID returned');
      }

      // Step 2: Update the role in the "profiles" table
      const { error: updateError } = await supabase
        .from('profiles') // Ensure this table exists
        .update({ role: 'admin' })
        .eq('id', data.user.id);

      if (updateError) throw updateError;

      setMessage('✅ Admin user created successfully! Please check your email for verification.');
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-32 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-serif mb-6 text-center">Setup Admin</h1>
      
      <form onSubmit={createAdminUser} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Creating Admin...' : 'Create Admin Account'}
        </button>
      </form>
      
      {message && (
        <div className={`mt-4 p-3 rounded ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
    </div>
  );
}