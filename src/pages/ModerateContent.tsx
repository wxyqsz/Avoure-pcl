import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from "react-router-dom";

function ModerateContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [blogs, setBlogs] = useState<{ 
    id: number; 
    title: string; 
    excerpt: string; 
    content: string; 
    author: string; 
    date: string; 
    category: string; 
    status: 'pending' | 'published' | 'rejected'; 
    views: number; 
    flagged: boolean; 
    flag_reason: string | null; 
  }[]>([]);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [filterCategory, setFilterCategory] = useState('all');
  const [categories, setCategories] = useState(['all']);
  const [searchTerm, setSearchTerm] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
  const [paginationCursor, setPaginationCursor] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const ITEMS_PER_PAGE = 10;

  // Fetch blogs based on current tab, category filter, and search term
  useEffect(() => {
    fetchBlogs();
    fetchCategories();
  }, [selectedTab, filterCategory, paginationCursor]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('category')
        .not('category', 'is', null);
        
      if (error) throw error;
      
      // Extract unique categories
      const uniqueCategories = ['all', ...new Set(data.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('articles')
        .select('id, title, excerpt, content, author, date, category, status, views, flagged, flag_reason')
        .order('date', { ascending: false });
      
      // Apply status filter based on selected tab
      if (selectedTab !== 'all') {
        query = query.eq('status', selectedTab);
      }
      
      // Apply category filter if not "all"
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }
      
      // Apply search filter if search term exists
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`);
      }
      
      // Apply pagination
      query = query.range(paginationCursor, paginationCursor + ITEMS_PER_PAGE - 1);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setBlogs(data || []);
      setHasMorePages(data.length === ITEMS_PER_PAGE);
      
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPaginationCursor(0); // Reset pagination when searching
    fetchBlogs();
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setPaginationCursor(0);
    fetchBlogs();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Blog content preview with truncation
  const truncateContent = (content: string, maxLength = 150) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // Handle approve action
  const handleApprove = async (id: number) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'published', 
          flagged: false, 
          flag_reason: null 
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update the UI
      setBlogs(blogs.map(blog => 
        blog.id === id 
          ? { ...blog, status: 'published', flagged: false, flag_reason: null } 
          : blog
      ));
      
    } catch (error) {
      console.error('Error approving blog:', error);
    }
  };

  // Handle reject action
  const handleReject = async (id: number) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'rejected',
          flagged: false,
          flag_reason: null 
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update the UI
      setBlogs(blogs.map(blog => 
        blog.id === id 
          ? { ...blog, status: 'rejected', flagged: false, flag_reason: null } 
          : blog
      ));
      
    } catch (error) {
      console.error('Error rejecting blog:', error);
    }
  };

  // Open flag modal
  const openFlagModal = (id: number) => {
    setSelectedBlogId(id);
    setShowFlagModal(true);
  };

  // Handle flag action
  const handleFlag = async () => {
    if (!selectedBlogId || !flagReason.trim()) return;
    
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          flagged: true, 
          flag_reason: flagReason 
        })
        .eq('id', selectedBlogId);
        
      if (error) throw error;
      
      // Update the UI
      setBlogs(blogs.map(blog => 
        blog.id === selectedBlogId 
          ? { ...blog, flagged: true, flag_reason: flagReason } 
          : blog
      ));
      
      // Close the modal and reset the form
      setShowFlagModal(false);
      setFlagReason('');
      setSelectedBlogId(null);
      
    } catch (error) {
      console.error('Error flagging blog:', error);
    }
  };

  // Handle remove flag action
  const handleRemoveFlag = async (id: number) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          flagged: false, 
          flag_reason: null 
        })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update the UI
      setBlogs(blogs.map(blog => 
        blog.id === id 
          ? { ...blog, flagged: false, flag_reason: null } 
          : blog
      ));
      
    } catch (error) {
      console.error('Error removing flag:', error);
    }
  };

  // Handle delete action
  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this blog? This action cannot be undone.")) {
      try {
        const { error } = await supabase
          .from('articles')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Update the UI
        setBlogs(blogs.filter(blog => blog.id !== id));
        
      } catch (error) {
        console.error('Error deleting blog:', error);
      }
    }
  };

  // Pagination handlers
  const goToNextPage = () => {
    if (hasMorePages) {
      setPaginationCursor(paginationCursor + ITEMS_PER_PAGE);
    }
  };

  const goToPreviousPage = () => {
    if (paginationCursor > 0) {
      setPaginationCursor(Math.max(0, paginationCursor - ITEMS_PER_PAGE));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin" className="font-serif text-2xl tracking-wider">AVOURE</Link>
              <div className="ml-2 text-xs tracking-widest uppercase">Admin</div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-sm hover:underline">Settings</button>
              <button className="text-sm hover:underline">Profile</button>
              <button className="text-sm hover:underline">Logout</button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8 pt-16 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-serif font-light tracking-wide">Moderate Content</h1>
              <p className="text-gray-500">Review, approve, and manage user-submitted blog posts</p>
            </div>
            <Link 
              to="/admin" 
              className="flex items-center text-sm text-gray-600 hover:text-black"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
        
        {/* Filter and search section */}
        <div className="bg-white p-6 rounded-md shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Status tabs */}
            <div className="flex space-x-4">
              <button
                onClick={() => { setSelectedTab('pending'); setPaginationCursor(0); }}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedTab === 'pending' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => { setSelectedTab('published'); setPaginationCursor(0); }}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedTab === 'published' 
                    ? 'bg-green-50 text-green-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => { setSelectedTab('rejected'); setPaginationCursor(0); }}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedTab === 'rejected' 
                    ? 'bg-red-50 text-red-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => { setSelectedTab('all'); setPaginationCursor(0); }}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  selectedTab === 'all' 
                    ? 'bg-gray-100 text-gray-800' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
            </div>
            
            {/* Category filter */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPaginationCursor(0); }}
                className="text-sm border-gray-300 rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Search bar */}
          <div className="mt-4">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, content or author..."
                className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </button>
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                >
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>
        
        {/* Content listing */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-md shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No blog posts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm 
                ? "No results match your search criteria." 
                : `No ${selectedTab !== 'all' ? selectedTab : ''} blog posts in ${filterCategory !== 'all' ? 'the ' + filterCategory + ' category' : 'any category'}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {blogs.map((blog) => (
              <div 
                key={blog.id} 
                className={`bg-white rounded-md shadow-sm overflow-hidden ${
                  blog.flagged ? 'border-l-4 border-yellow-500' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <h3 className="text-lg font-serif font-medium">
                      {blog.title}
                    </h3>
                    <div className="flex items-center mt-2 sm:mt-0">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${blog.status === 'published' ? 'bg-green-100 text-green-800' : 
                          blog.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}
                      >
                        {blog.status.charAt(0).toUpperCase() + blog.status.slice(1)}
                      </span>
                      {blog.flagged && (
                        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Flagged
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="mt-3 text-gray-600">
                    {blog.excerpt || truncateContent(blog.content)}
                  </p>
                  
                  {blog.flagged && (
                    <div className="mt-3 p-3 bg-yellow-50 text-yellow-800 rounded-md">
                      <div className="font-medium text-sm">Flag reason:</div>
                      <p className="text-sm">{blog.flag_reason}</p>
                    </div>
                  )}
                  
                  <div className="mt-4 flex flex-wrap items-center text-sm text-gray-500 gap-2 sm:gap-4">
                    <span>By {blog.author}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{formatDate(blog.date)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                      {blog.category}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span>{blog.views || 0} views</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-4 flex flex-wrap gap-3 justify-end">
                  <Link 
                    to={`/admin/blog/${blog.id}`} 
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    View Full
                  </Link>
                  
                  {blog.flagged ? (
                    <button 
                      onClick={() => handleRemoveFlag(blog.id)}
                      className="px-3 py-1.5 border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      Remove Flag
                    </button>
                  ) : (
                    <button 
                      onClick={() => openFlagModal(blog.id)}
                      className="px-3 py-1.5 border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                    >
                      Flag
                    </button>
                  )}
                  
                  {blog.status !== 'rejected' && (
                    <button 
                      onClick={() => handleReject(blog.id)}
                      className="px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Reject
                    </button>
                  )}
                  
                  {blog.status !== 'published' && (
                    <button 
                      onClick={() => handleApprove(blog.id)}
                      className="px-3 py-1.5 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                    >
                      Approve & Publish
                    </button>
                  )}
                  
                  <button 
                    onClick={() => handleDelete(blog.id)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination controls */}
        {!isLoading && blogs.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {paginationCursor + 1} to {paginationCursor + blogs.length} of many results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={goToPreviousPage}
                disabled={paginationCursor === 0}
                className={`px-3 py-1.5 border border-gray-300 text-sm rounded-md ${
                  paginationCursor === 0 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Previous
              </button>
              <button
                onClick={goToNextPage}
                disabled={!hasMorePages}
                className={`px-3 py-1.5 border border-gray-300 text-sm rounded-md ${
                  !hasMorePages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Flag reason modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium mb-4">Flag Content</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for flagging this content:</p>
            <textarea
              value={flagReason}
              onChange={e => setFlagReason(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-black focus:ring-black"
              rows={4}
              placeholder="Explain why this content is being flagged..."
            ></textarea>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  setFlagReason('');
                  setSelectedBlogId(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFlag}
                disabled={!flagReason.trim()}
                className={`px-4 py-2 text-white rounded-md ${
                  flagReason.trim() 
                    ? 'bg-black hover:bg-gray-800' 
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Submit Flag
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="bg-gray-100 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Avoure. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ModerateContent;