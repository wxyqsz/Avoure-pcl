import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const UserBlogs = () => {
  interface Blog {
    id: number;
    title: string;
    author_email: string;
    content: string;
    created_at: string;
    approved: boolean;
    flagged: boolean;
  }

  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'flagged'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    const { data, error } = await supabase
      .from('user_blogs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blogs:', error);
    } else {
      setBlogs(data || []);
    }
  };

  const handleApprove = async (id: number) => {
    const { error } = await supabase
      .from('user_blogs')
      .update({ approved: true, flagged: false })
      .eq('id', id);

    if (error) {
      console.error('Error approving blog:', error);
    } else {
      setBlogs(blogs.map(blog => 
        blog.id === id ? { ...blog, approved: true, flagged: false } : blog
      ));
    }
  };

  const handleFlag = async (id: number) => {
    const { error } = await supabase
      .from('user_blogs')
      .update({ flagged: true, approved: false })
      .eq('id', id);

    if (error) {
      console.error('Error flagging blog:', error);
    } else {
      setBlogs(blogs.map(blog => 
        blog.id === id ? { ...blog, flagged: true, approved: false } : blog
      ));
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this blog?')) {
      const { error } = await supabase
        .from('user_blogs')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting blog:', error);
      } else {
        setBlogs(blogs.filter(blog => blog.id !== id));
      }
    }
  };

  const filteredBlogs = blogs.filter(blog => {
    // Apply status filter
    if (filter === 'approved' && !blog.approved) return false;
    if (filter === 'pending' && (blog.approved || blog.flagged)) return false;
    if (filter === 'flagged' && !blog.flagged) return false;
    
    // Apply search filter
    if (searchTerm && 
        !blog.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !blog.content.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !blog.author_email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          User Submissions
        </h1>
        <div className="flex space-x-2">
          <select 
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Blogs</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Review</option>
            <option value="flagged">Flagged Content</option>
          </select>
          <input
            type="text"
            placeholder="Search blogs..."
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredBlogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-500">No blogs match your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredBlogs.map((blog) => (
            <div 
              key={blog.id} 
              className={`border rounded-lg p-6 shadow-md transition-all duration-300 hover:shadow-lg ${
                blog.approved ? 'border-green-300 bg-green-50' : 
                blog.flagged ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-2xl font-semibold">{blog.title}</h2>
                  <p className="text-sm text-gray-500">
                    By: {blog.author_email} • {new Date(blog.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2 items-center">
                  {blog.approved && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Approved
                    </span>
                  )}
                  {blog.flagged && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Flagged
                    </span>
                  )}
                  {!blog.approved && !blog.flagged && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>
              
              <div className="prose max-w-none mt-4 mb-6">
                <p>{blog.content}</p>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                {!blog.approved && (
                  <button 
                    onClick={() => handleApprove(blog.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                )}
                {!blog.flagged && (
                  <button 
                    onClick={() => handleFlag(blog.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Flag
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(blog.id)}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserBlogs;