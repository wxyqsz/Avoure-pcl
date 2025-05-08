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
  position: number;
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
  const [inlineImages, setInlineImages] = useState<InlineImage[]>([]);
  const [currentCursorPosition, setCurrentCursorPosition] = useState<number>(0);
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
        
      if (error) throw error;
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
        // Get the image URL to delete from storage
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
        
        // Delete main image if it's in Supabase storage
        if (blogData && blogData.image && blogData.image.includes('blog-images')) {
          try {
            const urlParts = blogData.image.split('/');
            const fileName = urlParts[urlParts.length - 1];
            
            if (fileName) {
              await supabase.storage.from('blog-images').remove([fileName]);
            }
          } catch (imageError) {
            console.warn('Error trying to delete main image:', imageError);
          }
        }
        
        // Delete additional images if any
        if (blogData && blogData.additionalImages && blogData.additionalImages.length > 0) {
          for (const imageData of blogData.additionalImages) {
            if (imageData.url && imageData.url.includes('blog-images')) {
              try {
                const urlParts = imageData.url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                
                if (fileName) {
                  await supabase.storage.from('blog-images').remove([fileName]);
                }
              } catch (imageError) {
                console.warn('Error trying to delete additional image:', imageError);
              }
            }
          }
        }
        
        // Update the UI
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Clean up previous preview URL
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
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
      prev.map(img => img.id === id ? { ...img, caption } : img)
    );
  };

  const removeInlineImage = (id: string) => {
    // Clean up the preview URL
    const imageToRemove = inlineImages.find(img => img.id === id);
    if (imageToRemove && imageToRemove.previewUrl) {
      URL.revokeObjectURL(imageToRemove.previewUrl);
    }
    
    // Remove the image from the array
    setInlineImages(prev => prev.filter(img => img.id !== id));
    
    // Remove the placeholder from the content
    const newContent = formData.content.replace(`[IMAGE:${id}]`, '');
    setFormData(prev => ({
      ...prev,
      content: newContent
    }));
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
      case 'bold': formattedText = `**${selectedText}**`; break;
      case 'italic': formattedText = `*${selectedText}*`; break;
      case 'underline': formattedText = `<u>${selectedText}</u>`; break;
      case 'heading1': formattedText = `\n# ${selectedText}\n`; break;
      case 'heading2': formattedText = `\n## ${selectedText}\n`; break;
      case 'heading3': formattedText = `\n### ${selectedText}\n`; break;
      case 'quote': formattedText = `\n> ${selectedText}\n`; break;
      case 'list': formattedText = selectedText.split('\n').map(line => `- ${line}`).join('\n'); break;
      case 'olist': formattedText = selectedText.split('\n').map((line, i) => `${i+1}. ${line}`).join('\n'); break;
      default: formattedText = selectedText;
    }
    
    const newContent = formData.content.substring(0, start) + formattedText + formData.content.substring(end);
    
    setFormData(prev => ({ ...prev, content: newContent }));
    
    // Reset focus to the textarea
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
      const filePath = `${fileName}`;
      
      // Check file size - 5MB limit
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
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
      
      // Upload main image if selected
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
      
      // Upload all inline images
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
          uploadedInlineImages.push({
            url: image.url,
            caption: image.caption,
            position: image.position
          });
        }
      }
      
      // Clean content - replace image placeholders
      let cleanContent = formData.content;
      inlineImages.forEach(img => {
        cleanContent = cleanContent.replace(`[IMAGE:${img.id}]`, `[INLINE_IMAGE]`);
      });
      
      setMessage({ text: 'Creating blog post...', type: 'info' });
      
      // Insert the article
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
      
      // Reset form and clean up
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
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      
      // Clean up inline image previews
      inlineImages.forEach(img => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      setInlineImages([]);
      
      // Switch to manage tab
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

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      inlineImages.forEach(img => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
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
    <div className="max-w-6xl mx-auto p-8 bg-white">
      <h1 className="text-4xl font-serif mb-8 tracking-tight">AVOURE ADMIN</h1>
      
      {/* Tabs with more elegant styling */}
      <div className="flex border-b border-gray-200 mb-10">
        <button
          className={`px-6 py-3 font-medium text-sm tracking-widest uppercase ${
            activeTab === 'upload' 
              ? 'border-b-2 border-black text-black' 
              : 'text-gray-400 hover:text-black'
          }`}
          onClick={() => setActiveTab('upload')}
        >
          Create
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm tracking-widest uppercase ${
            activeTab === 'manage' 
              ? 'border-b-2 border-black text-black' 
              : 'text-gray-400 hover:text-black'
          }`}
          onClick={() => setActiveTab('manage')}
        >
          Manage
        </button>
      </div>
      
      {message.text && (
        <div className={`p-4 mb-8 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border-l-4 border-green-500' : 
          message.type === 'error' ? 'bg-red-50 text-red-700 border-l-4 border-red-500' : 
          'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
        }`}>
          {message.text}
        </div>
      )}
      
      {/* Upload Blog Form with refined aesthetics */}
      {activeTab === 'upload' && (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full border-0 border-b border-gray-200 focus:ring-0 focus:border-black px-0 py-2 text-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Excerpt</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-none focus:ring-0 focus:border-black px-3 py-2"
              rows={3}
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Content</label>
            
            {/* More sophisticated text formatting toolbar */}
            <div className="flex flex-wrap gap-3 mb-3 p-3 bg-gray-50 border-0 border-b border-gray-200">
              <button 
                type="button" 
                onClick={() => applyFormatting('bold')}
                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm font-bold"
                title="Bold"
              >
                B
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('italic')}
                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm italic"
                title="Italic"
              >
                I
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('underline')}
                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm underline"
                title="Underline"
              >
                U
              </button>
              <div className="h-8 border-r border-gray-200 mx-1"></div>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading1')}
                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm font-bold"
                title="Heading 1"
              >
                H1
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading2')}
                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm font-bold"
                title="Heading 2"
              >
                H2
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('heading3')}
                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm font-bold"
                title="Heading 3"
              >
                H3
              </button>
              <div className="h-8 border-r border-gray-200 mx-1"></div>
              <button 
                type="button" 
                onClick={() => applyFormatting('list')}
                className="px-3 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm"
                title="Bullet List"
              >
                • List
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('olist')}
                className="px-3 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm"
                title="Numbered List"
              >
                1. List
              </button>
              <button 
                type="button" 
                onClick={() => applyFormatting('quote')}
                className="px-3 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm"
                title="Quote"
              >
                " Quote
              </button>
              <div className="h-8 border-r border-gray-200 mx-1"></div>
              <button 
                type="button" 
                onClick={() => inlineFileInputRef.current?.click()}
                className="px-3 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-sm hover:bg-gray-100 text-sm"
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
              onClick={(e) => setCurrentCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
              onKeyUp={(e) => setCurrentCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
              className="w-full border border-gray-200 rounded-none focus:ring-0 focus:border-black px-3 py-2"
              rows={12}
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
            
            {/* Inline images preview with elegant styling */}
            {inlineImages.length > 0 && (
              <div className="mt-6 border-0 border-t border-gray-100 pt-4">
                <h3 className="text-sm uppercase tracking-wide font-medium text-gray-500 mb-4">Inline Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inlineImages.map((image) => (
                    <div key={image.id} className="flex items-start space-x-4 p-4 bg-gray-50">
                      <div className="w-20 h-20 flex-shrink-0 bg-gray-100">
                        <img 
                          src={image.previewUrl || image.url} 
                          alt="Preview" 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                          <input
                            type="text"
                            placeholder="Caption"
                            value={image.caption}
                            onChange={(e) => handleInlineImageCaptionChange(image.id, e.target.value)}
                            className="flex-grow border-0 border-b border-gray-200 focus:ring-0 focus:border-black px-0 py-1 text-sm bg-transparent"
                          />
                          <button 
                            type="button"
                            onClick={() => removeInlineImage(image.id)}
                            className="ml-2 text-gray-400 hover:text-black"
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
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border-0 border-b border-gray-200 focus:ring-0 focus:border-black px-0 py-2"
              >
                <option value="fashion">Fashion</option>
                <option value="beauty">Beauty</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="latest-news">Latest News</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border-0 border-b border-gray-200 focus:ring-0 focus:border-black px-0 py-2"
              >
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="">Not applicable</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Featured Image</label>
            <div className="space-y-4">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              {/* Custom upload button and URL input */}
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-black text-white px-6 py-2 hover:bg-gray-800 tracking-wider uppercase text-xs"
                >
                  {selectedFile ? 'Change Image' : 'Select Image'}
                </button>
                
                <div className="flex-1">
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="Or paste image URL here"
                    className="w-full border-0 border-b border-gray-200 focus:ring-0 focus:border-black px-0 py-2"
                  />
                  {selectedFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
                    </p>
                  )}
                </div>
              </div>
              
              {/* Image preview */}
              {(previewUrl || formData.image) && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide font-medium text-gray-500 mb-2">Preview</p>
                  <img 
                    src={previewUrl || formData.image} 
                    alt="Preview" 
                    className="h-56 object-cover border border-gray-100" 
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
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Author</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              className="w-full border-0 border-b border-gray-200 focus:ring-0 focus:border-black px-0 py-2"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="bg-black text-white px-8 py-3 uppercase tracking-wider text-sm hover:bg-gray-800 disabled:bg-gray-300 mt-6"
          >
            {isLoading ? 'Publishing...' : 'Publish Article'}
          </button>
        </form>
      )}
      
      {/* Manage Blogs Table with elegant styling */}
{activeTab === 'manage' && (
  <div>
    {isLoadingBlogs ? (
      <div className="text-center py-20">
        <div className="inline-block mx-auto w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-gray-500 uppercase tracking-wide text-xs">Loading articles...</p>
      </div>
    ) : blogs.length === 0 ? (
      <div className="text-center py-20 border border-gray-100 bg-gray-50">
        <p className="text-2xl font-serif mb-3">No articles yet</p>
        <p className="text-gray-500 mb-6">Create your first article to see it here</p>
        <button 
          onClick={() => setActiveTab('upload')}
          className="px-6 py-2 bg-black text-white uppercase tracking-wider text-xs"
        >
          Create Article
        </button>
      </div>
    ) : (
      <>
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-serif">Published Articles</h2>
          <button 
            onClick={() => setActiveTab('upload')}
            className="px-6 py-2 bg-black text-white uppercase tracking-wider text-xs"
          >
            New Article
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-4 text-left font-serif font-normal text-sm uppercase tracking-wider">Image</th>
                <th className="py-4 text-left font-serif font-normal text-sm uppercase tracking-wider">Title</th>
                <th className="py-4 text-left font-serif font-normal text-sm uppercase tracking-wider">Category</th>
                <th className="py-4 text-left font-serif font-normal text-sm uppercase tracking-wider">Date</th>
                <th className="py-4 text-left font-serif font-normal text-sm uppercase tracking-wider">Views</th>
                <th className="py-4 text-left font-serif font-normal text-sm uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog) => (
                <tr key={blog.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-5">
                    <div className="w-16 h-16 bg-gray-100">
                      <img 
                        src={blog.image || '/placeholder-image.jpg'} 
                        alt={blog.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-5 font-serif">
                    <div className="line-clamp-2 pr-6">{blog.title}</div>
                    <div className="text-xs text-gray-500 mt-1">By {blog.author}</div>
                  </td>
                  <td className="py-5">
                    <span className="uppercase text-xs tracking-wider px-2 py-1 bg-gray-100">
                      {blog.category}
                    </span>
                    {blog.gender && (
                      <span className="uppercase text-xs tracking-wider px-2 py-1 bg-gray-100 ml-2">
                        {blog.gender}
                      </span>
                    )}
                  </td>
                  <td className="py-5 text-sm">{formatDate(blog.date)}</td>
                  <td className="py-5 text-sm">{blog.views.toLocaleString()}</td>
                  <td className="py-5">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => navigate(`/blog/${blog.id}`)}
                        className="text-gray-500 hover:text-black transition-colors"
                        title="View"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/admin/edit/${blog.id}`)}
                        className="text-gray-500 hover:text-black transition-colors"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(blog.id)}
                        className="text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete"
                        disabled={deleteInProgress === blog.id}
                      >
                        {deleteInProgress === blog.id ? (
                          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></span>
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
  </div>
)}

    </div>
  );
}

export default AdminPage;