import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from "react-router-dom";

function AvoureAdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState({
    totalBlogs: 0,
    pendingApprovals: 0,
    publishedToday: 0,
    totalViews: 0
  });
  const [pendingBlogs, setPendingBlogs] = useState<{ id: any; title: any; excerpt: any; author: any; date: any; category: any; status: any; }[]>([]);
  const [recentBlogs, setRecentBlogs] = useState<{ id: any; title: any; excerpt: any; author: any; date: any; category: any; views: any; status: any; }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<{
    viewsByDay: { date: string; views: number }[];
    topCategories: { name: string; count: number }[];
    topAuthors: { name: string; views: number }[];
  }>({
    viewsByDay: [],
    topCategories: [],
    topAuthors: []
  });
  const [filterCategory, setFilterCategory] = useState('all');

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Get counts and stats
        const { data: articles, error: articlesError } = await supabase
          .from('articles')
          .select('id, views, date, status');
          
        if (articlesError) throw articlesError;
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        
        const totalBlogs = articles.length;
        const pendingApprovals = articles.filter(article => article.status === 'pending').length;
        const publishedToday = articles.filter(article => 
          article.status === 'published' && new Date(article.date) >= new Date(todayStart)
        ).length;
        const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);

        console.log('Total blogs:', totalBlogs);
        console.log('Pending approval:', pendingBlogs);
        console.log('Published today:', publishedToday);
        console.log('Total views:', totalViews);

        
        setStats({
          totalBlogs,
          pendingApprovals,
          publishedToday,
          totalViews
        });
        
        // Fetch pending approval blogs
        const { data: pendingData, error: pendingError } = await supabase
          .from('articles')
          .select('id, title, excerpt, author, date, category, status')
          .eq('status', 'pending')
          .order('date', { ascending: false })
          .limit(5);
          
        if (pendingError) throw pendingError;
        setPendingBlogs(pendingData || []);
        
        // Fetch recent blogs
        const { data: recentData, error: recentError } = await supabase
          .from('articles')
          .select('id, title, excerpt, author, date, category, views, status')
          .order('date', { ascending: false })
          .limit(10);
          
        if (recentError) throw recentError;
        setRecentBlogs(recentData || []);
        
        // Fetch analytics data
        await fetchAnalyticsData();
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const fetchAnalyticsData = async () => {
    try {
      // Get views by day for the last 7 days
      const dates = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      // Simulate views data (in a real app, you'd query analytics_events)
      const viewsByDay = dates.map(date => ({
        date,
        views: Math.floor(Math.random() * 500) + 100 // Sample data
      }));
      
      // Top categories
      const { data: categoryData } = await supabase
        .from('articles')
        .select('category, id');
        
      const categoryCount: Record<string, number> = {};
      if (categoryData) {
        categoryData.forEach(article => {
          if (article.category) {
            categoryCount[article.category] = (categoryCount[article.category] || 0) + 1;
          }
        });
      }
      
      const topCategories = Object.entries(categoryCount)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Top authors
      const { data: authorData } = await supabase
        .from('articles')
        .select('author, views');
        
      const authorViews: Record<string, number> = {};
      authorData?.forEach(article => {
        if (article.author) {
          authorViews[article.author] = (authorViews[article.author] || 0) + (article.views || 0);
        }
      });
      
      const topAuthors = Object.entries(authorViews)
        .map(([name, views]) => ({ name, views: views as number }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);
      
      setAnalyticsData({
        viewsByDay,
        topCategories,
        topAuthors
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };
  
  const handleApprove = async (id: number | string) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ status: 'published', date: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update UI
      setPendingBlogs(pendingBlogs.filter(blog => blog.id !== id));
      setStats(prev => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals - 1,
        publishedToday: prev.publishedToday + 1
      }));
      
    } catch (error) {
      console.error('Error approving blog:', error);
    }
  };
  
  const handleReject = async (id: number | string) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ status: 'rejected' })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update UI
      setPendingBlogs(pendingBlogs.filter(blog => blog.id !== id));
      setStats(prev => ({
        ...prev,
        pendingApprovals: prev.pendingApprovals - 1
      }));
      
    } catch (error) {
      console.error('Error rejecting blog:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    const options = { year: 'numeric' as const, month: 'short' as const, day: 'numeric' as const };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  // Filter blogs by category
  const filteredRecentBlogs = filterCategory === 'all' 
    ? recentBlogs 
    : recentBlogs.filter(blog => blog.category === filterCategory);
  
  // Get unique categories for filter
  const categories = ['all', ...new Set(recentBlogs.map(blog => blog.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <nav className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="font-serif text-2xl tracking-wider">AVOURE</div>
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-19">
        {/* Dashboard header */}
        <div className="mb-8 mt-32">
          <h1 className="text-3xl font-serif font-light tracking-wide mt-38">Dashboard</h1>
          <p className="text-gray-500">Welcome back, manage your fashion blog with style</p>
        </div>
        
        {/* Main actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link to="/admin/upload" className="bg-white p-6 shadow-sm rounded-md border-l-4 border-black hover:shadow-md transition-shadow group">
  <div className="flex justify-between items-center">
    <div>
      <h3 className="font-serif text-xl mb-1">Upload New Blog</h3>
      <p className="text-gray-500 text-sm">Create and publish new content</p>
    </div>
    <div className="bg-gray-100 p-3 rounded-full group-hover:bg-black group-hover:text-white transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </Link>
          
          <a 
            href="/admin/moderate" 
            className="bg-white p-6 shadow-sm rounded-md border-l-4 border-blue-500 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl mb-1">Moderate Content</h3>
                <p className="text-gray-500 text-sm">Review and approve user submissions</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </a>
          
          <a 
            href="/admin/analytics" 
            className="bg-white p-6 shadow-sm rounded-md border-l-4 border-purple-500 hover:shadow-md transition-shadow group"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl mb-1">Analytics</h3>
                <p className="text-gray-500 text-sm">Track performance metrics</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-full group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </a>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-md shadow-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Total Blogs</div>
            <div className="text-3xl font-serif">{stats.totalBlogs}</div>
          </div>
          
          <div className="bg-white p-6 rounded-md shadow-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Pending Approval</div>
            <div className="text-3xl font-serif">{stats.pendingApprovals}</div>
          </div>
          
          <div className="bg-white p-6 rounded-md shadow-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Published Today</div>
            <div className="text-3xl font-serif">{stats.publishedToday}</div>
          </div>
          
          <div className="bg-white p-6 rounded-md shadow-sm">
            <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Total Views</div>
            <div className="text-3xl font-serif">{stats.totalViews.toLocaleString()}</div>
          </div>
        </div>
        
        {/* Content tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveSection('overview')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm 
                  ${activeSection === 'overview' 
                    ? 'border-black text-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveSection('approvals')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm 
                  ${activeSection === 'approvals' 
                    ? 'border-black text-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Pending Approvals
              </button>
              <button
                onClick={() => setActiveSection('analytics')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm 
                  ${activeSection === 'analytics' 
                    ? 'border-black text-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                Analytics
              </button>
            </nav>
          </div>
        </div>
        
        {/* Tab content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-serif">Recent Blog Posts</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Filter:</span>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
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
                
                <div className="bg-white shadow-sm rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Post
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Author
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecentBlogs.map((blog) => (
                        <tr key={blog.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">{blog.excerpt}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {blog.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {blog.author}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(blog.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {blog.views || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${blog.status === 'published' ? 'bg-green-100 text-green-800' : 
                                blog.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-red-100 text-red-800'}`}>
                              {blog.status?.charAt(0).toUpperCase() + blog.status?.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Approvals Section */}
            {activeSection === 'approvals' && (
              <div>
                <h2 className="text-xl font-serif mb-6">Pending Approvals</h2>
                
                {pendingBlogs.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-md shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
                    <p className="mt-1 text-sm text-gray-500">All user submissions have been reviewed.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingBlogs.map((blog) => (
                      <div key={blog.id} className="bg-white rounded-md shadow-sm overflow-hidden">
                        <div className="p-6">
                          <div className="flex justify-between">
                            <h3 className="text-lg font-serif font-medium">{blog.title}</h3>
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          </div>
                          <p className="mt-2 text-gray-600">{blog.excerpt}</p>
                          <div className="mt-4 flex items-center text-sm text-gray-500">
                            <span>By {blog.author}</span>
                            <span className="mx-2">•</span>
                            <span>{formatDate(blog.date)}</span>
                            <span className="mx-2">•</span>
                            <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                              {blog.category}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4">
                          <button 
                            onClick={() => handleReject(blog.id)}
                            className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => handleApprove(blog.id)}
                            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                          >
                            Approve & Publish
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Analytics Section */}
            {activeSection === 'analytics' && (
              <div>
                <h2 className="text-xl font-serif mb-6">Analytics Overview</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Views chart */}
                  <div className="bg-white p-6 rounded-md shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-medium mb-4">Views - Last 7 Days</h3>
                    <div className="h-64">
                      <div className="h-full flex items-end space-x-6">
                        {analyticsData.viewsByDay.map((day, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div className="w-full bg-purple-100 rounded-t-md" style={{ 
                              height: `${(day.views / 500) * 100}%`,
                              maxHeight: '90%'
                            }}></div>
                            <div className="text-xs text-gray-500 mt-2">{day.date.split('-')[2]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Top categories */}
                  <div className="bg-white p-6 rounded-md shadow-sm">
                    <h3 className="text-lg font-medium mb-4">Top Categories</h3>
                    <div className="space-y-4">
                      {analyticsData.topCategories.map((category, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-medium">{category.name}</span>
                            <span className="text-gray-500">{category.count} posts</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ 
                                width: `${(category.count / analyticsData.topCategories[0].count) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Top authors */}
                  <div className="bg-white p-6 rounded-md shadow-sm">
                    <h3 className="text-lg font-medium mb-4">Top Authors</h3>
                    <div className="space-y-4">
                      {analyticsData.topAuthors.map((author, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            {author.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{author.name}</div>
                            <div className="text-sm text-gray-500">{author.views.toLocaleString()} views</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Additional metrics */}
                  <div className="bg-white p-6 rounded-md shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-medium mb-4">Engagement Metrics</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-serif">45%</div>
                        <div className="text-sm text-gray-500 mt-1">Returning Visitors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-serif">2:18</div>
                        <div className="text-sm text-gray-500 mt-1">Avg. Time on Page</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-serif">3.2</div>
                        <div className="text-sm text-gray-500 mt-1">Pages per Session</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
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

export default AvoureAdminDashboard;