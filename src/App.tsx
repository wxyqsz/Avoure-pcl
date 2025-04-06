import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import { AuthProvider } from './context/AuthContext';
import { supabase } from './lib/supabase';
import SignIn from './pages/signin';
import Subscribe from './pages/Subscribe';
import SubmitBlog from './pages/SubmitBlog';
import Blogs from './pages/Blogs';
import AdminDashboard from './pages/AdminDashboard';
import ArticlePage from './pages/ArticlePage';
import AdminUpload from './pages/AdminUpload';
import Fashion from "../src/pages/Fashion";
import Beauty from "../src/pages/Beauty";
import Lifestyle from "../src/pages/Lifestyle";
import Shopping from "../src/pages/Shopping";
import SetupAdmin from './pages/SetupAdmin';
import UserBlogs from './pages/UserBlogs';

function App() {
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        await supabase.from('articles').select('count').single();
        setSupabaseInitialized(true);
      } catch (error) {
        console.log('Waiting for Supabase configuration...');
      }
    };
    checkSupabase();
  }, []);

  if (!supabaseInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif mb-4">Welcome to Avoure</h1>
          <p className="text-gray-600">The best of best Fashion News </p>
          <p className="text-sm text-gray-500 mt-2">Enjoy your Fashion Ride.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/submit-blog" element={<SubmitBlog />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="/admin-upload" element={<AdminUpload />} />
            <Route path="/fashion" element={<Fashion />} />
            <Route path="/beauty" element={<Beauty />} />
            <Route path="/lifestyle" element={<Lifestyle />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            <Route path="/admin/user-blogs" element={<UserBlogs />} />
            {/* Add more routes as needed */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App