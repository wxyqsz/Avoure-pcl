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
  additionalImages?: {url: string, caption: string, position: number}[];
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
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
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
  
  // Load blogs when the manage tab is active
  useEffect(() => {
    if (activeTab === 'manage') {
      fetchBlogs();
    }
  }, [activeTab]);
  
  // Fetch blogs from Supabase
  const fetchBlogs = async () => {
    setIsLoadingBlogs(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
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
            // This assumes the URL format ends with /storage/v1/object/public/blog-images/filename.ext
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
      console.log(`Starting upload for file: ${file.name} (${(file.size / 1024).toFixed(2)}KB, type: ${file.type})`);
      
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Check file size - Supabase has a limit
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error(`File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      }
  
      console.log(`Uploading file to path: ${filePath}`);
      
      // Upload file to Supabase Storage with timeout
      const uploadPromise = supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timed out after 30 seconds')), 30000);
      });
      
      // Race the upload against the timeout
      const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;
  
      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
  
      console.log('Upload successful, getting public URL');
      
      // Get public URL
      const { data } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);
      
      if (!data || !data.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      console.log('Retrieved public URL:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('Error in uploadImageToStorage:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: 'Starting blog creation process...', type: 'info' });
    
    try {
      let imageUrl = formData.image;
      
      // If there's a selected file for the main image, upload it first
      if (selectedFile) {
        setMessage({ text: 'Uploading main image...', type: 'info' });
        try {
          console.log('Starting main image upload');
          imageUrl = await uploadImageToStorage(selectedFile);
          console.log('Main image uploaded successfully:', imageUrl);
        } catch (error) {
          console.error('Main image upload error details:', error);
          throw new Error(`Main image upload failed: ${(error as Error).message}`);
        }
      } else if (!imageUrl) {
        throw new Error('Please select a main image or provide an image URL');
      }
      
      // Upload all inline images and get their URLs
      const uploadedInlineImages = [];
      
      if (inlineImages.length > 0) {
        setMessage({ text: `Uploading ${inlineImages.length} inline images...`, type: 'info' });
        console.log(`Processing ${inlineImages.length} inline images`);
        
        for (const [index, image] of inlineImages.entries()) {
          console.log(`Processing inline image ${index + 1}/${inlineImages.length}`);
          if (image.file) {
            try {
              console.log(`Uploading inline image file: ${image.file.name}`);
              const uploadedUrl = await uploadImageToStorage(image.file);
              console.log('Inline image uploaded successfully:', uploadedUrl);
              uploadedInlineImages.push({
                url: uploadedUrl,
                caption: image.caption,
                position: image.position
              });
            } catch (error) {
              console.error(`Inline image ${index} upload error:`, error);
              throw new Error(`Failed to upload inline image ${index + 1}: ${(error as Error).message}`);
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
      }
      
      // Prepare content - remove image placeholders as they'll be stored separately
      let cleanContent = formData.content;
      inlineImages.forEach(img => {
        cleanContent = cleanContent.replace(`[IMAGE:${img.id}]`, `[INLINE_IMAGE]`);
      });
      
      setMessage({ text: 'Creating blog post in database...', type: 'info' });
      
      // Add detailed logging before database insertion
      console.log('Preparing to insert article with data:', {
        title: formData.title,
        excerpt: formData.excerpt,
        contentLength: cleanContent.length,
        category: formData.category,
        gender: formData.gender,
        imageUrl: imageUrl,
        author: formData.author,
        inlineImagesCount: uploadedInlineImages.length
      });
      
      // Validate content is not too large
      const contentSizeInKB = new Blob([cleanContent]).size / 1024;
      if (contentSizeInKB > 1000) { // Check if larger than ~1MB
        console.warn('Content size might be too large:', contentSizeInKB.toFixed(2) + 'KB');
        // Consider truncating or processing content differently
      }
      
      // Insert the article with additional images
      const { data, error } = await supabase
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
            additionalImages: uploadedInlineImages.length > 0 ? uploadedInlineImages : null
          }
        ])
        .select();
  
      console.log('Database response:', { data, error });
  
      if (error) {
        console.error('Supabase insertion error details:', error);
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
      console.error('Error creating blog post:', error);
      setMessage({ 
        text: `Error: ${(error as Error).message}. Check browser console for details.`, 
        type: 'error' 
      });
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

  return (
    <div className="max-w-6xl mx-auto p-6 mt-16 bg-white">
      {/* Header with Vogue-inspired styling */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-serif tracking-wider uppercase mb-2">VOGUE</h1>
        <div className="w-16 h-px bg-black mx-auto mb-4"></div>
        <h2 className="text-xl font-light tracking-widest uppercase">Editorial Dashboard</h2>
      </div>
      
      {/* Tabs - styled with subtle underline */}
      <div className="flex justify-center border-b border-gray-100 mb-12">
        <button
          className={`px-6 py-3 font-light tracking-wider uppercase text-sm ${
            activeTab === 'upload' 
              ? 'border-b border-black text-black' 
              : 'text-gray-400 hover:text-black'
          }`}
          onClick={() => setActiveTab('upload')}
        >
          Create New Article
        </button>
        <button
          className={`px-6 py-3 font-light tracking-wider uppercase text-sm ${
            activeTab === 'manage' 
              ? 'border-b border-black text-black' 
              : 'text-gray-400 hover:text-black'
          }`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Articles
        </button>
      </div>
      
      {message.text && (
        <div className={`p-5 mb-8 ${
          message.type === 'success' ? 'bg-gray-100 text-green-800 border-l-4 border-green-500' : 
          message.type === 'error' ? 'bg-gray-100 text-red-800 border-l-4 border-red-500' : 
          'bg-gray-100 text-gray-800 border-l-4 border-gray-500'
        } font-light`}>
          {message.text}
        </div>
      )}
      
      {/* Upload Blog Form - Vogue Styled */}
      {activeTab === 'upload' && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full border-0 border-b border-gray-200 px-0 py-2 font-light focus:ring-0 focus:border-black"
              required
              placeholder="Enter article title"
            />
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Excerpt</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              className="w-full border-0 border-b border-gray-200 px-0 py-2 font-light focus:ring-0 focus:border-black"
              rows={2}
              required
              placeholder="Write a captivating summary"
            />
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Content</label>
            
            {/* Text formatting toolbar - Minimalist */}
            <div className="flex flex-wrap gap-3 mb-3 p-3 border border-gray-100 bg-gray-50">
              <button 
                type="button" 
                onClick={() => applyFormatting('bold')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Bold"
              >
                Bold
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('italic')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Italic"
              >
                Italic
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('underline')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Underline"
              >
                Underline
              </button>
              <div className="h-4 border-r border-gray-200"></div>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading1')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Heading 1"
              >
                H1
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading2')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Heading 2"
              >
                H2
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading3')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Heading 3"
              >
                H3
              </button>
              <div className="h-4 border-r border-gray-200"></div>
              <button 
                type="button" 
                onClick={() => applyFormatting('list')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Bullet List"
              >
                Bullets
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('olist')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Numbered List"
              >
                Numbers
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('quote')}
                className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100"
                title="Quote"
              >
                Quote
              </button>
              <div className="ml-auto">
                <button 
                  type="button" 
                  onClick={handleAddInlineImageClick}
                  className="px-3 py-1 text-xs uppercase tracking-wider border border-gray-300 hover:bg-gray-100"
                  title="Insert Image"
                >
                  + Insert Image
                </button>
              </div>
            </div>
            
            <textarea
              name="content"
              ref={contentEditorRef}
              value={formData.content}
              onChange={handleChange}
              onClick={handleContentClick}
              onKeyUp={handleContentKeyUp}
              className="w-full border border-gray-100 rounded-none p-4 font-light min-h-64 focus:ring-0 focus:border-gray-300"
              rows={12}
              required
              placeholder="Write your article content here..."
            />
            
            {/* Hidden file input for inline images */}
            <input
              type="file"
              ref={inlineFileInputRef}
              onChange={handleInlineFileChange}
              accept="image/*"
              className="hidden"
            />
            
            {/* Inline images preview - Gallery style */}
            {inlineImages.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <h3 className="text-xs uppercase tracking-wider mb-4 text-gray-500">Inline Images</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {inlineImages.map((image) => (
                    <div key={image.id} className="flex bg-gray-50 p-4">
                      <div className="w-24 h-24 flex-shrink-0 mr-4 bg-gray-100">
                        <img 
                          src={image.previewUrl || image.url} 
                          alt="Preview" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                      <div className="flex-grow">
                        <input
                          type="text"
                          placeholder="Image caption"
                          value={image.caption}
                          onChange={(e) => handleInlineImageCaptionChange(image.id, e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-gray-200 mb-2 text-sm font-light focus:ring-0 focus:border-black"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Position marker: {image.id}</span>
                          <button 
                            type="button"
                            onClick={() => removeInlineImage(image.id)}
                            className="text-xs uppercase tracking-wider text-gray-500 hover:text-black"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border-0 border-b border-gray-200 px-0 py-2 font-light focus:ring-0 focus:border-black"
              >
                <option value="fashion">Fashion</option>
                <option value="beauty">Beauty</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="latest-news">Latest News</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Gender (if applicable)</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border-0 border-b border-gray-200 px-0 py-2 font-light focus:ring-0 focus:border-black"
              >
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="">Not applicable</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Featured Image</label>
            <div className="bg-gray-50 p-6">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              {/* Custom upload area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  {(previewUrl || formData.image) ? (
                    <div className="mb-4">
                      <img 
                        src={previewUrl || formData.image} 
                        alt="Preview" 
                        className="w-full h-64 object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-gray-100 text-gray-400 mb-4">
                      No image selected
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={handleBrowseClick}
                    className="w-full py-2 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800"
                  >
                    {selectedFile ? 'Change Image' : 'Select Image'}
                  </button>
                </div>
                
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Or use image URL</p>
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="Enter image URL"
                    className="w-full border-0 border-b border-gray-200 bg-transparent px-0 py-2 font-light focus:ring-0 focus:border-black"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">Author</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              className="w-full border-0 border-b border-gray-200 px-0 py-2 font-light focus:ring-0 focus:border-black"
              required
              placeholder="Enter author name"
            />
          </div>
          
          <div className="pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Publishing...' : 'Publish Article'}
            </button>
          </div>
        </form>
      )}
      
      {/* Manage Blogs Panel */}
      {activeTab === 'manage' && (
        <div>
          {isLoadingBlogs ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-t-black border-r-gray-200 border-b-gray-200 border-l-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 font-light">Loading articles...</p>
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-light">No articles found.</p>
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-4 px-6 py-2 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800"
              >
                Create Your First Article
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {blogs.map((blog) => (
                <div key={blog.id} className="border-b border-gray-100 pb-8">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-1/4 pr-0 md:pr-6 mb-4 md:mb-0">
                      <img 
                        src={blog.image} 
                        alt={blog.title} 
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                        }}
                      />
                    </div>
                    <div className="w-full md:w-3/4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-serif">{blog.title}</h3>
                          <div className="flex items-center text-xs text-gray-500 mt-1 space-x-4">
                            <span>{formatDate(blog.date)}</span>
                            <span>By {blog.author}</span>
                            <span className="capitalize">{blog.category}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/edit-blog/${blog.id}`)}
                            className="px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100 border border-gray-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBlog(blog.id)}
                            disabled={deleteInProgress === blog.id}
                            className={`px-3 py-1 text-xs uppercase tracking-wider hover:bg-gray-100 border border-gray-200 ${deleteInProgress === blog.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {deleteInProgress === blog.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-gray-600 font-light">{blog.excerpt}</p>
                      <div className="mt-4 flex items-center space-x-6 text-xs text-gray-500">
                        <div className="flex items-center">
                          <span className="mr-1">👁️</span>
                          <span>{blog.views || 0} views</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">❤️</span>
                          <span>{blog.likes || 0} likes</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-1">💬</span>
                          <span>{blog.comments || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-16 border-t border-gray-100 pt-8 pb-4 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Editorial Management System</p>
      </div>
    </div>
  );
}

export default AdminPage;