
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

  return (
    <div className="max-w-6xl mx-auto p-6 mt-32">
      <h1 className="text-3xl font-serif mb-6">Admin Dashboard</h1>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'upload' 
              ? 'border-b-2 border-black text-black' 
              : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('upload')}
        >
          Upload New Blog
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'manage' 
              ? 'border-b-2 border-black text-black' 
              : 'text-gray-500 hover:text-black'
          }`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Blogs
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
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            
            {/* Text formatting toolbar */}
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 border border-gray-300 rounded-md">
              <button 
                type="button" 
                onClick={() => applyFormatting('bold')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                title="Bold"
              >
                B
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('italic')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm italic"
                title="Italic"
              >
                I
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('underline')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm underline"
                title="Underline"
              >
                U
              </button>
              <div className="h-6 border-r border-gray-300 mx-1"></div>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading1')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                title="Heading 1"
              >
                H1
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading2')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                title="Heading 2"
              >
                H2
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading3')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                title="Heading 3"
              >
                H3
              </button>
              <div className="h-6 border-r border-gray-300 mx-1"></div>
              <button 
                type="button" 
                onClick={() => applyFormatting('list')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                title="Bullet List"
              >
                • List
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('olist')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                title="Numbered List"
              >
                1. List
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('quote')}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                title="Quote"
              >
                " Quote
              </button>
              <div className="h-6 border-r border-gray-300 mx-1"></div>
              <button 
                type="button" 
                onClick={handleAddInlineImageClick}
                className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                title="Insert Image"
              >
                + Image
              </button>
            </div>
            
            <textarea
              name="content"
              ref={contentEditorRef}
              value={formData.content}
              onChange={handleChange}
              onClick={handleContentClick}
              onKeyUp={handleContentKeyUp}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={10}
              required
            />
            
            {/* Hidden file input for inline images */}
            <input
              type="file"
              ref={inlineFileInputRef}
              onChange={handleInlineFileChange}
              accept="image/*"
              className="hidden"
            />
            
            {/* Inline images preview and management */}
            {inlineImages.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-md p-4 bg-gray-50">
                <h3 className="text-md font-medium mb-3">Inline Images</h3>
                <div className="space-y-4">
                  {inlineImages.map((image) => (
                    <div key={image.id} className="flex items-start space-x-4 p-3 border border-gray-200 rounded-md bg-white">
                      <div className="w-20 h-20 flex-shrink-0">
                        <img 
                          src={image.previewUrl || image.url} 
                          alt="Preview" 
                          className="h-full w-full object-cover rounded-md" 
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <input
                            type="text"
                            placeholder="Image caption (optional)"
                            value={image.caption}
                            onChange={(e) => handleInlineImageCaptionChange(image.id, e.target.value)}
                            className="flex-grow border border-gray-300 rounded-md px-2 py-1 text-sm"
                          />
                          <button 
                            type="button"
                            onClick={() => removeInlineImage(image.id)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          This image will appear where marker [IMAGE:{image.id}] is in your content
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="fashion">Fashion</option>
                <option value="beauty">Beauty</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="latest-news">Latest News</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender (if applicable)</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="">Not applicable</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
            <div className="space-y-3">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              {/* Custom upload button and URL input */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  {selectedFile ? 'Change Image' : 'Browse Images'}
                </button>
                
                <div className="flex-1">
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="Or paste image URL here"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-500 mt-1">
                      Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
                    </p>
                  )}
                </div>
              </div>
              
              {/* Image preview */}
              {(previewUrl || formData.image) && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-2">Preview:</p>
                  <img 
                    src={previewUrl || formData.image} 
                    alt="Preview" 
                    className="h-48 object-cover rounded-md border border-gray-200" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                      setMessage({text: 'Warning: Unable to load image preview', type: 'error'});
                    }}
                  />
                </div>
              )}
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
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 disabled:bg-gray-400"
          >
            {isLoading ? 'Uploading...' : 'Publish Blog Post'}
          </button>
        </form>
      )}
      
      {/* Manage Blogs Table */}
      {activeTab === 'manage' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Manage Blog Posts</h2>
            <button 
              onClick={fetchBlogs}
              className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
              disabled={isLoadingBlogs}
            >
              {isLoadingBlogs ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          {isLoadingBlogs ? (
            <div className="text-center py-8">Loading blogs...</div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No blog posts found</div>
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
                              className="h-10 w-10 rounded-full object-cover" 
                              src={blog.image || '/placeholder-image.jpg'} 
                              alt="" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                            <div className="text-xs text-gray-500">
                              {blog.additionalImages && blog.additionalImages.length > 0 ? (
                                <span className="text-xs text-green-600">
                                  {blog.additionalImages.length} additional {blog.additionalImages.length === 1 ? 'image' : 'images'}
                                </span>
                              ) : null}
                            </div>
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
    </div>
  );
}

export default AdminPage;