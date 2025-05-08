import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bold, Italic, Underline, AlignCenter, AlignLeft, AlignRight, Image as ImageIcon, X, Plus, Type, RefreshCw } from 'lucide-react';
import { moderateBlogContent } from "../auth/moderation";

export default function SubmitBlog() {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>(''); // Debug information
  const [submissionTimeout, setSubmissionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const [activeTextStyle, setActiveTextStyle] = useState({
    bold: false,
    italic: false,
    underline: false,
    align: 'left'
  });

  const [formData, setFormData] = useState<{
    excerpt: string;
    subtitle: string;
    title: string;
    content: string;
    images: string[];
    category: string;
    authorName: string;
  }>({
    excerpt: "",
    subtitle: "",
    title: "",
    content: "",
    images: [''],
    category: "fashion",
    authorName: "",
  });
  
  // Check authentication on component mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setError('Authentication error. Please try signing in again.');
          setDebugInfo(`Session error: ${JSON.stringify(sessionError)}`);
          return;
        }
        
        // Make sure we have a session
        if (!data.session) {
          setError('Please sign in to submit a blog post');
          setDebugInfo('No active session found');
          return;
        }
        
        setCurrentUserId(data.session.user.id);
        console.log("User authenticated with ID:", data.session.user.id);
        
        // Pre-fill author name if available
        if (data.session.user.user_metadata?.full_name) {
          setFormData(prev => ({
            ...prev,
            authorName: data.session.user.user_metadata.full_name || ''
          }));
        }

        // Verify database access early
        try {
          const { error: tableCheckError } = await supabase
            .from("user_blogs")
            .select("id", { count: 'exact', head: true })
            .limit(1);
            
          if (tableCheckError) {
            console.error("Database access check failed:", tableCheckError);
            setDebugInfo(prev => `${prev}\nEarly DB check: ${JSON.stringify(tableCheckError)}`);
            // Don't set an error yet, just log for debugging
          } else {
            setDebugInfo(prev => `${prev}\nDatabase access verified successfully`);
          }
        } catch (dbCheckErr) {
          console.error("Error checking database:", dbCheckErr);
          setDebugInfo(prev => `${prev}\nEarly DB check error: ${JSON.stringify(dbCheckErr)}`);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Authentication error. Please try signing in again.');
        setDebugInfo(`Auth check error: ${JSON.stringify(err)}`);
      }
    };
    
    getUser();
    
    // Cleanup function to cancel any pending timeouts
    return () => {
      if (submissionTimeout) {
        clearTimeout(submissionTimeout);
      }
    };
  }, []);

  // Add timeout handling for submission process
  useEffect(() => {
    if (isSubmitting && !submitSuccess && submissionAttempts > 0) {
      const timeout = setTimeout(() => {
        setError("Submission is taking longer than expected. The server might be experiencing issues.");
        setDebugInfo(prev => `${prev}\nSubmission timeout reached after 30 seconds.`);
        setIsSubmitting(false);
      }, 30000); // 30 second timeout
      
      setSubmissionTimeout(timeout);
      
      return () => clearTimeout(timeout);
    }
  }, [isSubmitting, submitSuccess, submissionAttempts]);

  const cancelSubmission = () => {
    if (submissionTimeout) {
      clearTimeout(submissionTimeout);
    }
    setIsSubmitting(false);
    setError('Submission cancelled by user.');
    setDebugInfo(prev => `${prev}\nSubmission cancelled by user.`);
  };

  const retrySubmission = async () => {
    // Reset states but maintain form data
    setError('');
    setIsSubmitting(true);
    setDebugInfo('Retrying submission...');
    setSubmissionAttempts(prev => prev + 1);
    
    try {
      await submitFormToSupabase();
    } catch (err) {
      console.error('Error during retry:', err);
      setError('Retry failed. Please try again later.');
      setDebugInfo(prev => `${prev}\nRetry error: ${JSON.stringify(err)}`);
      setIsSubmitting(false);
    }
  };
  const submitFormToSupabase = async () => {
    setDebugInfo(prev => `${prev}\nPreparing blog post submission...`);
    
    if (!currentUserId) {
      setError('You must be signed in to submit a blog post.');
      setIsSubmitting(false);
      setDebugInfo(prev => `${prev}\nSubmission failed: No user ID`);
      return;
    }
    
    // Filter out empty image URLs
    const filteredImages = formData.images.filter(img => img.trim() !== '');
    
    // Get moderation result but with a timeout to avoid hanging
    let moderationResult: { status: string; flagged: boolean; flag_reason: string | null } = { 
      status: "pending", flagged: false, flag_reason: null 
    };
    
    try {
      // Create a promise with timeout for moderation
      const moderationPromise = Promise.race([
        moderateBlogContent({
          title: formData.title,
          content: formData.content,
          category: formData.category,
        }),
        new Promise<{ status: string; flagged: boolean; flag_reason: string | null }>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Moderation timed out'));
          }, 5000); // 5 second timeout for moderation
        })
      ]);
      
      moderationResult = await moderationPromise as { status: string; flagged: boolean; flag_reason: string | null };
      setDebugInfo(prev => `${prev}\nModeration result: ${JSON.stringify(moderationResult)}`);
    } catch (moderationError) {
      console.error("Moderation error or timeout:", moderationError);
      setDebugInfo(prev => `${prev}\nModeration error: ${JSON.stringify(moderationError)}`);
      // Continue with default pending status if moderation fails
    }
    
    // Prepare the blog post data
    const blogPost = {
      title: formData.title,
      subtitle: formData.subtitle || null, // Handle empty string
      excerpt: formData.excerpt,
      content: formData.content,
      images: filteredImages,
      category: formData.category,
      status: moderationResult?.status || "pending",
      flagged: moderationResult?.flagged || false,
      flag_reason: moderationResult?.flag_reason || null,
      author_id: currentUserId,
      author_name: formData.authorName,
      created_at: new Date().toISOString()
    };
    
    console.log("Submitting blog post:", blogPost);
    setDebugInfo(prev => `${prev}\nSubmitting data to Supabase...`);
    
    try {
      // Verify the table exists and user has permissions again right before insert
      const { error: countError } = await supabase
        .from("user_blogs")
        .select("id", { count: 'exact', head: true })
        .limit(1);
      
      if (countError) {
        // Handle specific database errors
        if (countError.message.includes('does not exist')) {
          setError("The blog database does not exist. Please contact support.");
          setDebugInfo(prev => `${prev}\nTable does not exist: ${countError.message}`);
        } else if (countError.message.includes('permission denied')) {
          setError("You don't have permission to submit blogs. Please check your account privileges.");
          setDebugInfo(prev => `${prev}\nPermission denied: ${countError.message}`);
        } else {
          setError(`Database connection issue: ${countError.message}`);
          setDebugInfo(prev => `${prev}\nDatabase error: ${countError.message}`);
        }
        throw new Error(`Database check failed: ${countError.message}`);
      }
      
      // Table exists and we have permission, proceed with insert
      setDebugInfo(prev => `${prev}\nDatabase check passed, proceeding with insertion...`);
      
      // Insert the blog post with a timeout
      const insertPromise = Promise.race([
        supabase
          .from("user_blogs")
          .insert([blogPost])
          .select(),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Database insert timed out'));
          }, 10000); // 10 second timeout for database operation
        })
      ]);
      
      const { error: insertError, data } = await insertPromise as any;
      
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        setError("Failed to submit blog: " + insertError.message);
        setDebugInfo(prev => `${prev}\nSubmission error: ${JSON.stringify(insertError)}`);
        throw new Error(`Submission error: ${insertError.message}`);
      } else {
        console.log("Submission successful:", data);
        setSubmitSuccess(true);
        setDebugInfo(prev => `${prev}\nSubmission successful! Response: ${JSON.stringify(data)}`);
        
        // Clear form after successful submission
        setFormData({
          excerpt: "",
          subtitle: "",
          title: "",
          content: "",
          images: [''],
          category: "fashion",
          authorName: formData.authorName, // Keep author name
        });
        
        // Optional: Redirect to blog page
        setTimeout(() => { 
          window.location.href = '/blogs'; 
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error submitting blog:', err);
      
      // Special handling for timeout errors
      if (error.message?.includes('timed out')) {
        setError('The server is taking too long to respond. Please try again later.');
        setDebugInfo(prev => `${prev}\nTimeout error: ${error.message}`);
      } else if (!error) {
        setError(`An error occurred: ${error.message || 'Unknown error'}`);
        setDebugInfo(prev => `${prev}\nUnexpected error: ${JSON.stringify(error)}`);
      }
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };
   
  / Helper function to handle database errors with more specific messages
  const handleDatabaseError = (error: any) => {
    console.error('Database error:', error);
    
    if (error.message?.includes('does not exist')) {
      setError("The blog database table does not exist. Please contact support.");
      setDebugInfo(prev => `${prev}\nTable does not exist: ${error.message}`);
    } 
    else if (error.message?.includes('permission denied')) {
      setError("You don't have permission to submit blogs. Please check your account privileges.");
      setDebugInfo(prev => `${prev}\nPermission denied: ${error.message}`);
    }
    else if (error.code === '23505') {
      setError("This appears to be a duplicate submission. Please try again with different content.");
      setDebugInfo(prev => `${prev}\nUnique constraint violation: ${error.message}`);
    }
    else if (error.code === '23502') {
      setError("Missing required fields in your submission. Please fill all required fields.");
      setDebugInfo(prev => `${prev}\nNot null violation: ${error.message}`);
    }
    else if (error.message?.includes('timed out')) {
      setError("The database is taking too long to respond. Please try again later.");
      setDebugInfo(prev => `${prev}\nTimeout error: ${error.message}`);
    }
    else {
      setError(`Database error: ${error.message}`);
      setDebugInfo(prev => `${prev}\nDatabase error: ${JSON.stringify(error)}`);
    }
    
    setIsSubmitting(false);
  };
      
      // Special handling for timeout errors
      if (err.message?.includes('timed out')) {
        setError('The server is taking too long to respond. Please try again later.');
        setDebugInfo(prev => `${prev}\nTimeout error: ${err.message}`);
      } else if (!error) {
        setError(`An error occurred: ${err.message || 'Unknown error'}`);
        setDebugInfo(prev => `${prev}\nUnexpected error: ${JSON.stringify(err)}`);
      }
      
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset states
    setIsSubmitting(true);
    setError('');
    setSubmitSuccess(false);
    setDebugInfo('Starting submission process...');
    setSubmissionAttempts(prev => prev + 1);
    
    try {
      // Check if user is logged in
      if (!currentUserId) {
        setError('You must be signed in to submit a blog post.');
        setDebugInfo('No user ID found - authentication issue');
        setIsSubmitting(false);
        return;
      }
      
      // Validate form data
      if (!formData.title.trim()) {
        setError('Please enter a title for your article.');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.content.trim()) {
        setError('Please enter content for your article.');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.excerpt.trim()) {
        setError('Please enter an excerpt for your article.');
        setIsSubmitting(false);
        return;
      }
      
      if (!formData.authorName.trim()) {
        setError('Please enter your name as the author.');
        setIsSubmitting(false);
        return;
      }
      
      // Validate at least one image URL is provided
      const filteredImages = formData.images.filter(img => img.trim() !== '');
      if (filteredImages.length === 0) {
        setError('Please add at least one image URL.');
        setIsSubmitting(false);
        return;
      }

      setDebugInfo('Form validation passed, proceeding with submission...');
      
      // Submit to Supabase
      await submitFormToSupabase();
      
    } catch (err) {
      console.error('Error in submission flow:', err);
      // Error is handled in submitFormToSupabase
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        images: newImages
      }));
    }
  };

  const applyTextStyle = (style: string) => {
    if (!contentRef.current) return;
    
    const textArea = contentRef.current;
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    let newText = formData.content;
    let cursorOffset = 0;
    let newEnd = end;
    
    if (style === 'bold') {
      newText = formData.content.substring(0, start) + `**${selectedText}**` + formData.content.substring(end);
      cursorOffset = 2;
      newEnd = end + 4; // Account for the ** markers
      setActiveTextStyle(prev => ({ ...prev, bold: !prev.bold }));
    } else if (style === 'italic') {
      newText = formData.content.substring(0, start) + `*${selectedText}*` + formData.content.substring(end);
      cursorOffset = 1;
      newEnd = end + 2; // Account for the * markers
      setActiveTextStyle(prev => ({ ...prev, italic: !prev.italic }));
    } else if (style === 'underline') {
      newText = (formData?.content || "").substring(0, start) + `__${selectedText}__` + (formData?.content || "").substring(end);
      cursorOffset = 2;
      newEnd = end + 4; // Account for the __ markers
      setActiveTextStyle(prev => ({ ...prev, underline: !prev.underline }));
    } else if (style === 'left' || style === 'center' || style === 'right') {
      let alignMarker = '';
      if (style === 'center') alignMarker = '<center>';
      else if (style === 'right') alignMarker = '<right>';
      else alignMarker = '<left>';
      
      const closeTag = `</${style}>`;
      newText = formData.content.substring(0, start) + `${alignMarker}${selectedText}${closeTag}` + formData.content.substring(end);
      cursorOffset = alignMarker.length;
      newEnd = end + alignMarker.length + closeTag.length;
      setActiveTextStyle(prev => ({ ...prev, align: style }));
    } else if (style === 'heading') {
      newText = formData.content.substring(0, start) + `## ${selectedText}` + formData.content.substring(end);
      cursorOffset = 3;
      newEnd = end + 3; // Account for the ## and space
    } else if (style === 'image') {
      // Insert image reference based on available images
      const imageCount = formData.images.filter(img => img.trim() !== '').length;
      if (imageCount > 0) {
        const nextImageRef = `{image${Math.min(imageCount, 5)}}`;
        newText = formData.content.substring(0, start) + nextImageRef + formData.content.substring(end);
        cursorOffset = nextImageRef.length;
        newEnd = start + nextImageRef.length;
      } else {
        alert('Please add at least one image URL first');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      content: newText
    }));
    
    // Restore focus after state update and reposition cursor
    setTimeout(() => {
      if (textArea) {
        textArea.focus();
        if (selectedText) {
          // If text was selected, select the newly formatted text
          textArea.setSelectionRange(start, newEnd);
        } else {
          // If no text was selected, place cursor after insertion
          textArea.setSelectionRange(start + cursorOffset, start + cursorOffset);
        }
      }
    }, 10);
  };

  // Check if network is online
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="pt-20 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white shadow-lg p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-serif tracking-tight mb-2 text-center">Submit Your Article</h1>
          <p className="text-center text-gray-500 mb-12 font-light italic tracking-wide">Share your voice with the AVOURE community</p>
          
          {/* Network Status Indicator */}
          {!isOnline && (
            <div className="bg-yellow-50 text-yellow-700 p-4 mb-8 text-center border-l-4 border-yellow-500">
              You are currently offline. Please check your internet connection.
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 mb-8 text-center border-l-4 border-red-600">
              <div className="font-medium mb-1">Error</div>
              <div>{error}</div>
              {isSubmitting && (
                <button 
                  onClick={cancelSubmission} 
                  className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                >
                  Cancel Submission
                </button>
              )}
              {!isSubmitting && submissionAttempts > 0 && (
                <button 
                  onClick={retrySubmission} 
                  className="mt-2 px-4 py-2 flex items-center justify-center mx-auto bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                >
                  <RefreshCw size={16} className="mr-2" /> Retry Submission
                </button>
              )}
            </div>
          )}
          
          {submitSuccess && (
            <div className="bg-green-50 text-green-600 p-4 mb-8 text-center border-l-4 border-green-600">
              <div className="font-medium mb-1">Success!</div>
              <div>Article submitted successfully! Redirecting to blog page...</div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full border-0 border-b-2 border-gray-200 focus:ring-0 focus:border-black py-3 text-2xl font-serif"
                placeholder="Your Captivating Title"
                required
                disabled={isSubmitting}
              />
            </div>
            
            {/* Subtitle */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Subtitle</label>
              <input
                type="text"
                name="subtitle"
                value={formData.subtitle}
                onChange={handleChange}
                className="w-full border-0 border-b-2 border-gray-200 focus:ring-0 focus:border-black py-2 text-lg italic font-serif"
                placeholder="An elegant subtitle to draw readers in"
                disabled={isSubmitting}
              />
            </div>

            {/* Category Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 rounded-none focus:ring-0 focus:border-black py-3"
                disabled={isSubmitting}
              >
                <option value="fashion">Fashion</option>
                <option value="beauty">Beauty</option>
                <option value="lifestyle">Lifestyle</option>
                <option value="shopping">Shopping</option>
              </select>
            </div>
            
            {/* Images Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">
                Images
                <span className="normal-case ml-2 text-gray-400 italic">Add up to 5 images</span>
              </label>
              
              <div className="space-y-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 border-2 border-gray-200 p-3 focus:ring-0 focus:border-black"
                      required={index === 0}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageField(index)}
                      className="p-2 text-gray-500 hover:text-red-500"
                      disabled={formData.images.length === 1 && index === 0 || isSubmitting}
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
                
                {formData.images.length < 5 && !isSubmitting && (
                  <button
                    type="button"
                    onClick={addImageField}
                    className="flex items-center text-gray-500 hover:text-black py-2"
                  >
                    <Plus size={16} className="mr-1" /> Add Another Image
                  </button>
                )}
              </div>
            </div>
            
            {/* Excerpt Section */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Short Excerpt</label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                rows={2}
                className="w-full border-2 border-gray-200 focus:ring-0 focus:border-black p-3"
                placeholder="A brief introduction to entice your readers (will appear in previews)"
                required
                disabled={isSubmitting}
              />
            </div>
            
            {/* Content Section with Rich Text Controls */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Content</label>
              
              {/* Text formatting toolbar */}
              <div className="flex flex-wrap border-2 border-b-0 border-gray-200 p-2 space-x-1 bg-gray-50">
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.bold ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('bold')}
                  title="Bold"
                  disabled={isSubmitting}
                >
                  <Bold size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.italic ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('italic')}
                  title="Italic"
                  disabled={isSubmitting}
                >
                  <Italic size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.underline ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('underline')}
                  title="Underline"
                  disabled={isSubmitting}
                >
                  <Underline size={16} />
                </button>
                <div className="border-l border-gray-300 mx-1"></div>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.align === 'left' ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('left')}
                  title="Align Left"
                  disabled={isSubmitting}
                >
                  <AlignLeft size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.align === 'center' ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('center')}
                  title="Align Center"
                  disabled={isSubmitting}
                >
                  <AlignCenter size={16} />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded ${activeTextStyle.align === 'right' ? 'bg-gray-200' : ''}`}
                  onClick={() => applyTextStyle('right')}
                  title="Align Right"
                  disabled={isSubmitting}
                >
                  <AlignRight size={16} />
                </button>
                <div className="border-l border-gray-300 mx-1"></div>
                <button 
                  type="button" 
                  className="p-2 rounded flex items-center" 
                  title="Insert image reference"
                  onClick={() => applyTextStyle('image')}
                  disabled={isSubmitting}
                >
                  <ImageIcon size={16} className="mr-1" />
                  <span className="text-xs">Image</span>
                </button>
                <button 
                  type="button" 
                  className="p-2 rounded flex items-center" 
                  title="Format as heading"
                  onClick={() => applyTextStyle('heading')}
                  disabled={isSubmitting}
                >
                  <Type size={16} className="mr-1" />
                  <span className="text-xs">Heading</span>
                </button>
              </div>
              
              <textarea
                ref={contentRef}
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={15}
                className="w-full border-2 border-t-0 border-gray-200 focus:ring-0 focus:border-black p-4"
                placeholder="Write your article here..."
                required
                disabled={isSubmitting}
              />
              <div className="text-xs text-gray-500 mt-2 italic space-y-1">
                <p>Tip: Select text and click formatting buttons to apply styles.</p>
                <p>To add an image in your text, select where you want to insert it and click the Image button, or type {"{image1}"}, {"{image2}"}, etc.</p>
                <p>Markdown is supported: **bold**, *italic*, __underline__, ## headings</p>
              </div>
            </div>
            
            {/* Author Name */}
            <div>
              <label className="block uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">Author Name</label>
              <input
                type="text"
                name="authorName"
                value={formData.authorName}
                onChange={handleChange}
                className="w-full border-2 border-gray-200 focus:ring-0 focus:border-black p-3"
                placeholder="Your name as it will appear on the published article"
                required
                disabled={isSubmitting}
              />
            </div>
            
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || submitSuccess || !isOnline}
              className="w-full bg-black text-white py-4 px-6 uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? 'Submitting...' : submitSuccess ? 'Submitted Successfully!' : 'Publish Article'}
            </button>
            
            {/* Submission Progress */}
            {isSubmitting && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 text-blue-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Submitting your article...</h4>
                    <p className="text-sm text-blue-600">This may take a few moments</p>
                  </div>
                  <button 
                    type="button"
                    onClick={cancelSubmission}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Debug Section - Useful during development */}
            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 text-gray-700 text-sm overflow-auto max-h-64">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold">Debug Information:</h4>
                  <button 
                    type="button" 
                    onClick={() => setDebugInfo('')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
                <pre className="whitespace-pre-wrap">{debugInfo}</pre>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}