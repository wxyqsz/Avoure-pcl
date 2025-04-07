import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Define the Article type for TypeScript
interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  gender: string;
  image: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
  views: number;
  status: 'published' | 'pending' | 'rejected';
  submittedBy?: string;
  additionalImages?: {url: string, caption: string, position: number}[];
}

// Interface for analytics data
interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  mostViewedArticle: Article | null;
  mostLikedArticle: Article | null;
  categoryBreakdown: {category: string, count: number}[];
  recentTrend: {date: string, views: number}[];
}

// Interface for inline images
interface InlineImage {
  id: string;
  file: File | null;
  url: string;
  previewUrl: string;
  caption: string;
  position: number; // Cursor position in the content where image should appear
}

function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'analytics' | 'submissions'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const contentEditorRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'fashion',
    gender: 'women',
    image: '',
    author: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // State for managing inline images
  const [inlineImages, setInlineImages] = useState<InlineImage[]>([]);
  const [currentCursorPosition, setCurrentCursorPosition] = useState<number>(0);
  
  // State for managing blogs
  const [blogs, setBlogs] = useState<Article[]>([]);
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState<number | null>(null);
  
  // State for managing user submissions
  const [submissions, setSubmissions] = useState<Article[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionAction, setSubmissionAction] = useState<{id: number, action: string} | null>(null);
  
  // State for analytics
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'week' | 'month' | 'year'>('month');
  
  // Load data when tabs are activated
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchBlogs();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab, analyticsTimeframe]);
  
  // Fetch blogs from Supabase
  const fetchBlogs = async () => {
    setIsLoadingBlogs(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setBlogs(data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setMessage({ 
        text: `Failed to load blogs: ${(error as Error).message}`, 
        type: 'error' 
      });
    } finally {
      setIsLoadingBlogs(false);
    }
  };
  
  // Fetch user submissions
  const fetchSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'pending')
        .order('date', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setMessage({ 
        text: `Failed to load submissions: ${(error as Error).message}`, 
        type: 'error' 
      });
    } finally {
      setIsLoadingSubmissions(false);
    }
  };
  
  // Fetch analytics data
  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      // Get date range based on timeframe
      const now = new Date();
      let startDate = new Date();
      
      if (analyticsTimeframe === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (analyticsTimeframe === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (analyticsTimeframe === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      
      const startDateStr = startDate.toISOString();
      
      // Fetch articles for this time period
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .gte('date', startDateStr);
        
      if (articlesError) throw articlesError;
      
      if (!articles || articles.length === 0) {
        setAnalyticsData({
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          mostViewedArticle: null,
          mostLikedArticle: null,
          categoryBreakdown: [],
          recentTrend: []
        });
        return;
      }
      
      // Calculate total metrics
      const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
      const totalLikes = articles.reduce((sum, article) => sum + (article.likes || 0), 0);
      const totalComments = articles.reduce((sum, article) => sum + (article.comments || 0), 0);
      
      // Find most viewed and liked articles
      const mostViewedArticle = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
      const mostLikedArticle = [...articles].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0];
      
      // Get category breakdown
      const categories: {[key: string]: number} = {};
      articles.forEach(article => {
        if (!categories[article.category]) {
          categories[article.category] = 0;
        }
        categories[article.category]++;
      });
      
      const categoryBreakdown = Object.entries(categories).map(([category, count]) => ({
        category,
        count
      }));
      
      // Create recent trend data (last 10 days)
      const trendDates: {[key: string]: number} = {};
      const endDate = new Date();
      const trendStartDate = new Date();
      
      if (analyticsTimeframe === 'week') {
        trendStartDate.setDate(endDate.getDate() - 7);
      } else if (analyticsTimeframe === 'month') {
        trendStartDate.setDate(endDate.getDate() - 30);
      } else {
        trendStartDate.setDate(endDate.getDate() - 60);
      }
      
      // Initialize all dates in range
      let currentDate = new Date(trendStartDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        trendDates[dateStr] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Populate with actual data
      articles.forEach(article => {
        const articleDate = new Date(article.date).toISOString().split('T')[0];
        if (trendDates[articleDate] !== undefined) {
          trendDates[articleDate] += article.views || 0;
        }
      });
      
      const recentTrend = Object.entries(trendDates).map(([date, views]) => ({
        date,
        views
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      setAnalyticsData({
        totalViews,
        totalLikes,
        totalComments,
        mostViewedArticle,
        mostLikedArticle,
        categoryBreakdown,
        recentTrend
      });
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setMessage({
        text: `Failed to load analytics: ${(error as Error).message}`,
        type: 'error'
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  };
  
  // Handle user submission actions (approve/reject)
  const handleSubmissionAction = async (id: number, action: 'approve' | 'reject' | 'delete') => {
    setSubmissionAction({ id, action });
    
    try {
      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
          setSubmissionAction(null);
          return;
        }
        
        // Delete the submission
        await handleDeleteBlog(id);
        
      } else {
        const newStatus = action === 'approve' ? 'published' : 'rejected';
        
        const { error } = await supabase
          .from('articles')
          .update({ status: newStatus })
          .eq('id', id);
          
        if (error) throw error;
        
        // Update local state
        setSubmissions(submissions.filter(sub => sub.id !== id));
        
        setMessage({
          text: `Submission ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing submission:`, error);
      setMessage({
        text: `Failed to ${action} submission: ${(error as Error).message}`,
        type: 'error'
      });
    } finally {
      setSubmissionAction(null);
    }
  };
  
  // Delete a blog post
  const handleDeleteBlog = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      setDeleteInProgress(id);
      try {
        // First, get the image URL to delete from storage
        const { data: blogData } = await supabase
          .from('articles')
          .select('image, additionalImages')
          .eq('id', id)
          .single();
          
        // Delete from the database
        const { error: deleteError } = await supabase
          .from('articles')
          .delete()
          .eq('id', id);
          
        if (deleteError) throw deleteError;
        
        // If the image is from Supabase storage, try to delete it too
        if (blogData && blogData.image && blogData.image.includes('blog-images')) {
          try {
            // Extract the filename from the URL
            const urlParts = blogData.image.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            if (fileName) {
              const { error: storageError } = await supabase.storage
                .from('blog-images')
                .remove([fileName]);
                
              if (storageError) {
                console.warn('Could not delete main image from storage:', storageError);
              }
            }
          } catch (imageError) {
            console.warn('Error trying to delete main image:', imageError);
            // Continue even if image deletion fails
          }
        }
        
        // Delete additional images if they exist
        if (blogData && blogData.additionalImages && blogData.additionalImages.length > 0) {
          for (const imageData of blogData.additionalImages) {
            if (imageData.url && imageData.url.includes('blog-images')) {
              try {
                const urlParts = imageData.url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                
                if (fileName) {
                  const { error: storageError } = await supabase.storage
                    .from('blog-images')
                    .remove([fileName]);
                    
                  if (storageError) {
                    console.warn(`Could not delete additional image ${fileName} from storage:`, storageError);
                  }
                }
              } catch (imageError) {
                console.warn('Error trying to delete additional image:', imageError);
              }
            }
          }
        }
        
        // Update the UI by removing the deleted blog
        setBlogs(blogs.filter(blog => blog.id !== id));
        setSubmissions(submissions.filter(sub => sub.id !== id));
        setMessage({ text: 'Blog post deleted successfully', type: 'success' });
        
      } catch (error) {
        console.error('Error deleting blog:', error);
        setMessage({ 
          text: `Failed to delete blog: ${(error as Error).message}`, 
          type: 'error' 
        });
      } finally {
        setDeleteInProgress(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Track cursor position in content area
  const handleContentCursorChange = (e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    setCurrentCursorPosition(textarea.selectionStart);
  };

  const handleContentClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    handleContentCursorChange(e);
  };

  const handleContentKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleContentCursorChange(e);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Clean up previous preview URL to avoid memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      
      // Clear any manually entered image URL
      setFormData(prev => ({ ...prev, image: '' }));
    }
  };

  const handleInlineFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a unique ID for this inline image
      const imageId = `inline-image-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      
      // Add to inline images array with the current cursor position
      const newImage: InlineImage = {
        id: imageId,
        file: file,
        url: '',
        previewUrl: objectUrl,
        caption: '',
        position: currentCursorPosition
      };
      
      setInlineImages(prev => [...prev, newImage]);
      
      // Insert a placeholder marker in the content at cursor position
      const content = formData.content;
      const beforeCursor = content.substring(0, currentCursorPosition);
      const afterCursor = content.substring(currentCursorPosition);
      const newContent = `${beforeCursor}\n[IMAGE:${imageId}]\n${afterCursor}`;
      
      setFormData(prev => ({
        ...prev,
        content: newContent
      }));
    }
  };

  const handleInlineImageCaptionChange = (id: string, caption: string) => {
    setInlineImages(prev => 
      prev.map(img => 
        img.id === id ? { ...img, caption } : img
      )
    );
  };

  const removeInlineImage = (id: string) => {
    // Remove the image from the inline images array
    setInlineImages(prev => prev.filter(img => img.id !== id));
    
    // Remove the placeholder from the content
    const newContent = formData.content.replace(`[IMAGE:${id}]`, '');
    setFormData(prev => ({
      ...prev,
      content: newContent
    }));
    
    // Clean up the preview URL
    const imageToRemove = inlineImages.find(img => img.id === id);
    if (imageToRemove && imageToRemove.previewUrl) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleAddInlineImageClick = () => {
    inlineFileInputRef.current?.click();
  };

  // Text formatting functions
  const applyFormatting = (format: string) => {
    if (!contentEditorRef.current) return;
    
    const textarea = contentEditorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    
    let formattedText = '';
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      case 'heading1':
        formattedText = `\n# ${selectedText}\n`;
        break;
      case 'heading2':
        formattedText = `\n## ${selectedText}\n`;
        break;
      case 'heading3':
        formattedText = `\n### ${selectedText}\n`;
        break;
      case 'quote':
        formattedText = `\n> ${selectedText}\n`;
        break;
      case 'list':
        formattedText = selectedText.split('\n').map(line => `- ${line}`).join('\n');
        break;
      case 'olist':
        formattedText = selectedText.split('\n').map((line, i) => `${i+1}. ${line}`).join('\n');
        break;
      default:
        formattedText = selectedText;
    }
    
    const newContent = formData.content.substring(0, start) + formattedText + formData.content.substring(end);
    
    setFormData(prev => ({
      ...prev,
      content: newContent
    }));
    
    // Reset focus to the textarea and set cursor position after the formatted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formattedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const uploadImageToStorage = async (file: File) => {
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`; // No subfolder as bucket is already blog-images
      
      // Check file size - Supabase has a limit
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size exceeds 5MB limit');
      }

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('blog-images') // Using the correct bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type // Explicitly set content type
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);
      
      if (!data || !data.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error in uploadImageToStorage:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      let imageUrl = formData.image;
      
      // If there's a selected file for the main image, upload it first
      if (selectedFile) {
        setMessage({ text: 'Uploading main image...', type: 'info' });
        try {
          imageUrl = await uploadImageToStorage(selectedFile);
        } catch (error) {
          throw new Error(`Main image upload failed: ${(error as Error).message}`);
        }
      } else if (!imageUrl) {
        throw new Error('Please select a main image or provide an image URL');
      }
      
      // Upload all inline images and get their URLs
      setMessage({ text: 'Uploading inline images...', type: 'info' });
      const uploadedInlineImages = [];
      
      for (const image of inlineImages) {
        if (image.file) {
          try {
            const uploadedUrl = await uploadImageToStorage(image.file);
            uploadedInlineImages.push({
              url: uploadedUrl,
              caption: image.caption,
              position: image.position
            });
          } catch (error) {
            throw new Error(`Failed to upload inline image: ${(error as Error).message}`);
          }
        } else if (image.url) {
          // If it's an external URL, just use that
          uploadedInlineImages.push({
            url: image.url,
            caption: image.caption,
            position: image.position
          });
        }
      }
      
      // Prepare content - remove image placeholders as they'll be stored separately
      let cleanContent = formData.content;
      inlineImages.forEach(img => {
        cleanContent = cleanContent.replace(`[IMAGE:${img.id}]`, `[INLINE_IMAGE]`);
      });
      
      setMessage({ text: 'Creating blog post...', type: 'info' });
      
      // Insert the article with additional images
      const { error } = await supabase
        .from('articles')
        .insert([
          {
            title: formData.title,
            excerpt: formData.excerpt,
            content: cleanContent,
            category: formData.category,
            gender: formData.gender,
            image: imageUrl,
            author: formData.author,
            date: new Date().toISOString(),
            likes: 0,
            comments: 0,
            views: 0,
            status: 'published', // Auto-publish admin posts
            additionalImages: uploadedInlineImages
          }
        ]);

      if (error) {
        console.error('Supabase insertion error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      setMessage({ text: 'Blog post created successfully!', type: 'success' });
      
      // Reset form
      setFormData({
        title: '',
        excerpt: '',
        content: '',
        category: 'fashion',
        gender: 'women',
        image: '',
        author: ''
      });
      setSelectedFile(null);
      setInlineImages([]);
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      
      // Cleanup inline image preview URLs
      inlineImages.forEach(img => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
      
      // Switch to manage tab to see the new post
      setTimeout(() => {
        setActiveTab('manage');
        fetchBlogs();
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading blog:', error);
      setMessage({ text: `Error: ${(error as Error).message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      // Clean up all inline image preview URLs
      inlineImages.forEach(img => {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [previewUrl, inlineImages]);

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };
  
  // Format number helper (for analytics)
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with Vogue-inspired styling */}
      <div className="mb-10 border-b border-black pb-6 mt-24">
        <h1 className="text-4xl font-serif tracking-tight uppercase text-center mb-2">EDITORIAL DASHBOARD</h1>
        <p className="text-center text-gray-500 tracking-widest text-sm uppercase">MANAGE CONTENT • REVIEW SUBMISSIONS • MONITOR PERFORMANCE</p>
      </div>
      
      {/* Main Navigation Tabs - Vogue-inspired */}
      <div className="flex justify-center border-b border-gray-200 mb-8">
        <button
          className={`px-6 py-3 font-medium uppercase tracking-wider text-sm ${
            activeTab === 'upload' 
              ? 'border-b-2 border-black text-black font-bold' 
              : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('upload')}
        >
          Admin Upload
        </button>
        <button
          className={`px-6 py-3 font-medium uppercase tracking-wider text-sm ${
            activeTab === 'manage' 
              ? 'border-b-2 border-black text-black font-bold' 
              : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Content
        </button>
        <button
          className={`px-6 py-3 font-medium uppercase tracking-wider text-sm ${
            activeTab === 'submissions' 
              ? 'border-b-2 border-black text-black font-bold' 
              : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('submissions')}
        >
          User Submissions
        </button>
        <button
          className={`px-6 py-3 font-medium uppercase tracking-wider text-sm ${
            activeTab === 'analytics' 
              ? 'border-b-2 border-black text-black font-bold' 
              : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>
      
      {message.text && (
        <div className={`p-4 mb-6 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 
          message.type === 'error' ? 'bg-red-100 text-red-700' : 
          'bg-blue-100 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Upload Blog Form */}
      {activeTab === 'upload' && (
        <div>
          <h2 className="text-2xl font-serif mb-6 border-l-4 border-black pl-4">Create New Article</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="Enter article title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt (short summary)</label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                required
                placeholder="A brief summary of the article (appears in previews)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              
              {/* Text formatting toolbar */}
              <div className="flex flex-wrap gap-2 mb-2 border border-gray-200 rounded-md p-2 bg-gray-50">
                <button 
                  type="button" 
                  onClick={() => applyFormatting('bold')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Bold"
                >
                  <strong>B</strong>
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('italic')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Italic"
                >
                  <em>I</em>
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('underline')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Underline"
                >
                  <u>U</u>
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('heading1')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Heading 1"
                >
                  H1
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('heading2')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Heading 2"
                >
                  H2
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('heading3')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Heading 3"
                >
                  H3
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('quote')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Blockquote"
                >
                  Quote
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('list')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Bullet List"
                >
                  • List
                </button>
                <button 
                  type="button" 
                  onClick={() => applyFormatting('olist')} 
                  className="px-2 py-1 bg-white border rounded hover:bg-gray-100"
                  title="Numbered List"
                >
                  1. List
                </button>
                <button 
                  type="button" 
                  onClick={handleAddInlineImageClick} 
                  className="px-2 py-1 bg-white border border-black rounded hover:bg-gray-100"
                  title="Add Image"
                >
                  + Image
                </button>
                <input 
                  type="file"
                  ref={inlineFileInputRef}
                  onChange={handleInlineFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                onClick={handleContentClick}
                onKeyUp={handleContentKeyUp}
                ref={contentEditorRef}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={15}
                required
                placeholder="Write your article content here. You can use Markdown formatting."
              />
              
              {/* Preview inline images */}
              {inlineImages.length > 0 && (
                <div className="my-4 border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-medium mb-2">Inline Images</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {inlineImages.map(img => (
                      <div key={img.id} className="border rounded-md p-3">
                        <img 
                          src={img.previewUrl} 
                          alt="Preview" 
                          className="w-full h-40 object-cover mb-2"
                        />
                        <input
                          type="text"
                          value={img.caption}
                          onChange={(e) => handleInlineImageCaptionChange(img.id, e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 mb-2"
                          placeholder="Image caption"
                        />
                        <button
                          type="button"
                          onClick={() => removeInlineImage(img.id)}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          Remove Image
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="fashion">Fashion</option>
                  <option value="beauty">Beauty</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="culture">Culture</option>
                  <option value="wellness">Wellness</option>
                  <option value="celebrity">Celebrity</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender Focus</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="unisex">Unisex</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
                placeholder="Author name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Main Image</label>
              <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                {/* Image preview */}
                {previewUrl && (
                  <div className="mb-4">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-h-64 mx-auto"
                    />
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Image</label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={handleBrowseClick}
                        className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Browse...
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <span className="ml-2 text-sm text-gray-500">
                        {selectedFile ? selectedFile.name : 'No file selected'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Or use image URL</label>
                    <input
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 uppercase tracking-wider ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Publishing...' : 'Publish Article'}
              </button>
            </div>
          </form>
        </div>
      )}
      
     {/* Manage Blogs */}
{activeTab === 'manage' && (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-medium border-l-4 border-black pl-4">Manage Blog Posts</h2>
      <button 
        onClick={fetchBlogs}
        className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
        disabled={isLoadingBlogs}
      >
        {isLoadingBlogs ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
    
    {isLoadingBlogs ? (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading blogs...</p>
      </div>
    ) : blogs.length === 0 ? (
      <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-md">
        No blog posts found
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
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
                Metrics
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {blogs.map((blog) => (
              <tr key={blog.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <img 
                        className="h-10 w-10 rounded object-cover" 
                        src={blog.image} 
                        alt={blog.title}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-image.jpg';
                        }}
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{blog.excerpt}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {blog.category} {blog.gender ? `• ${blog.gender}` : ''}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {blog.author}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(blog.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-3 text-xs text-gray-500">
                    <span>{blog.views} Views</span>
                    <span>{blog.likes} Likes</span>
                    <span>{blog.comments} Comments</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/blogs/${blog.id}`)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </button>
                    <button
                      onClick={() => navigate(`/admin/edit/${blog.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBlog(blog.id)}
                      disabled={deleteInProgress === blog.id}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                    >
                      {deleteInProgress === blog.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
      
      {/* User Submissions */}
      {activeTab === 'submissions' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif border-l-4 border-black pl-4">Review User Submissions</h2>
            <button
              onClick={fetchSubmissions}
              className="text-sm px-4 py-2 border border-black rounded-md hover:bg-black hover:text-white"
            >
              Refresh List
            </button>
          </div>
          
          {isLoadingSubmissions ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 border border-gray-200 rounded-md">
              <p className="text-gray-600">No pending submissions found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {submissions.map(submission => (
                <div key={submission.id} className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-1/4">
                      <img 
                        src={submission.image} 
                        alt={submission.title}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                        }}
                      />
                    </div>
                    <div className="p-4 w-full md:w-3/4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-serif mb-2">{submission.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="uppercase">{submission.category}</span> • {formatDate(submission.date)} • 
                            By {submission.author} • 
                            <span className="text-orange-600 font-semibold ml-1">Submitted by: {submission.submittedBy || 'Anonymous'}</span>
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSubmissionAction(submission.id, 'approve')}
                            disabled={submissionAction?.id === submission.id}
                            className={`bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm hover:bg-green-200 ${
                              submissionAction?.id === submission.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {submissionAction?.id === submission.id && submissionAction?.action === 'approve' ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleSubmissionAction(submission.id, 'reject')}
                            disabled={submissionAction?.id === submission.id}
                            className={`bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm hover:bg-red-200 ${
                              submissionAction?.id === submission.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {submissionAction?.id === submission.id && submissionAction?.action === 'reject' ? 'Rejecting...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => handleSubmissionAction(submission.id, 'delete')}
                            disabled={submissionAction?.id === submission.id}
                            className={`bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm hover:bg-gray-200 ${
                              submissionAction?.id === submission.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {submissionAction?.id === submission.id && submissionAction?.action === 'delete' ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 my-2 line-clamp-2">{submission.excerpt}</p>
                      <div className="mt-4">
                        <button
                          onClick={() => navigate(`/preview/${submission.id}`)}
                          className="text-sm underline text-gray-600 hover:text-black"
                        >
                          Preview Full Article
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Analytics Dashboard */}
      {activeTab === 'analytics' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif border-l-4 border-black pl-4">Analytics Dashboard</h2>
            <div className="flex space-x-2">
              <select
                value={analyticsTimeframe}
                onChange={(e) => setAnalyticsTimeframe(e.target.value as 'week' | 'month' | 'year')}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 12 Months</option>
              </select>
              <button
                onClick={fetchAnalytics}
                className="text-sm px-4 py-2 border border-black rounded-md hover:bg-black hover:text-white"
              >
                Refresh Data
              </button>
            </div>
          </div>
          
          {isLoadingAnalytics ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading analytics data...</p>
            </div>
          ) : analyticsData ? (
            <div className="space-y-8">
              {/* Key metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                  <h3 className="text-sm uppercase text-gray-500 mb-1">Total Views</h3>
                  <p className="text-3xl font-serif">{formatNumber(analyticsData.totalViews)}</p>
                </div>
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                  <h3 className="text-sm uppercase text-gray-500 mb-1">Total Likes</h3>
                  <p className="text-3xl font-serif">{formatNumber(analyticsData.totalLikes)}</p>
                </div>
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                  <h3 className="text-sm uppercase text-gray-500 mb-1">Total Comments</h3>
                  <p className="text-3xl font-serif">{formatNumber(analyticsData.totalComments)}</p>
                </div>
              </div>
              
              {/* Top performing content */}
              <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Top Performing Content</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analyticsData.mostViewedArticle && (
                    <div className="border border-gray-100 rounded-md p-4">
                      <h4 className="text-sm uppercase text-gray-500 mb-1">Most Viewed Article</h4>
                      <p className="font-serif text-lg mb-1">{analyticsData.mostViewedArticle.title}</p>
                      <div className="flex justify-between text-sm">
                        <span>{formatNumber(analyticsData.mostViewedArticle.views || 0)} views</span>
                        <span>{formatDate(analyticsData.mostViewedArticle.date)}</span>
                      </div>
                    </div>
                  )}
                  
                  {analyticsData.mostLikedArticle && (
                    <div className="border border-gray-100 rounded-md p-4">
                      <h4 className="text-sm uppercase text-gray-500 mb-1">Most Liked Article</h4>
                      <p className="font-serif text-lg mb-1">{analyticsData.mostLikedArticle.title}</p>
                      <div className="flex justify-between text-sm">
                        <span>{formatNumber(analyticsData.mostLikedArticle.likes || 0)} likes</span>
                        <span>{formatDate(analyticsData.mostLikedArticle.date)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Category distribution */}
              <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Category Distribution</h3>
                {analyticsData.categoryBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {analyticsData.categoryBreakdown.map(item => (
                      <div key={item.category} className="flex items-center">
                        <div className="w-24 font-medium capitalize">{item.category}</div>
                        <div className="flex-1 mx-4">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-black" 
                              style={{ 
                                width: `${(item.count / analyticsData.categoryBreakdown.reduce((sum, cat) => sum + cat.count, 0)) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-10 text-right">{item.count}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No category data available.</p>
                )}
              </div>
              
              {/* Recent traffic trend */}
              <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium mb-4">Traffic Trend</h3>
                {analyticsData.recentTrend.length > 0 ? (
                  <div className="h-64">
                    <div className="flex h-full items-end space-x-1">
                      {analyticsData.recentTrend.map((day) => {
                        const maxViews = Math.max(...analyticsData.recentTrend.map(d => d.views));
                        const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                        
                        return (
                          <div 
                            key={day.date}
                            className="flex-1 flex flex-col items-center group"
                          >
                            <div className="w-full">
                              <div 
                                className="w-full bg-black hover:bg-gray-700 transition-all" 
                                style={{ height: `${height}%` }}
                              ></div>
                            </div>
                            <div className="text-xs mt-1 text-gray-600 truncate w-full text-center">
                              {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">No trend data available.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 border border-gray-200 rounded-md">
              <p className="text-gray-600">No analytics data available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPage;