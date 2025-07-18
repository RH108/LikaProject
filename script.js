document.addEventListener('DOMContentLoaded', function() {
    const mainContentArea = document.getElementById('main-content');
    const loadingMessage = document.getElementById('loadingMessage');
    const animationDuration = 300; // milliseconds for fade animation

    // Auth elements
    const userStatusSpan = document.getElementById('user-status');
    const profilePictureImg = document.getElementById('profile-picture');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    // Modal elements
    const addArticleModal = document.getElementById('addArticleModal');
    const openAddArticleModalBtn = document.getElementById('openAddArticleModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelAddArticleBtn = document.getElementById('cancelAddArticleBtn');
    const addArticleForm = document.getElementById('addArticleForm');

    // Data array for articles
    let articlesData = [];

    // API Endpoint for the backend server
    const API_BASE_URL = 'https://lika.onrender.com/api/articles'; // Ensure this matches your server.js port
    const AUTH_API_URL = 'https://lika.onrender.com/api/auth/google';

    // IMPORTANT: Replace with your actual Google Client ID from Google Cloud Console
    // This value needs to match the one configured in your Google Cloud Project for OAuth 2.0
    const GOOGLE_CLIENT_ID = '875578945883-b9ig8c0iojdr1opfnintrj9abtu42ef1.apps.googleusercontent.com'; // <--- REPLACE THIS WITH YOUR CLIENT ID

    // Function to get the JWT token from localStorage
    function getAuthToken() {
        return localStorage.getItem('authToken');
    }

    // Function to set the JWT token in localStorage
    function setAuthToken(token) {
        localStorage.setItem('authToken', token);
    }

    // Function to remove the JWT token from localStorage
    function removeAuthToken() {
        localStorage.removeItem('authToken');
    }

    // Function to update UI based on login status
    function updateAuthUI(user = null) {
        if (user && getAuthToken()) {
            userStatusSpan.textContent = `Logged in as: ${user.name || user.email}`;
            profilePictureImg.src = user.picture || 'https://placehold.co/40x40/FFFFFF/000000?text=User';
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden');
            openAddArticleModalBtn.classList.remove('hidden'); // Show add article button if logged in
        } else {
            userStatusSpan.textContent = 'Not Logged In';
            profilePictureImg.src = 'https://placehold.co/40x40/FFFFFF/000000?text=User';
            loginButton.classList.remove('hidden');
            logoutButton.classList.add('hidden');
            openAddArticleModalBtn.classList.add('hidden'); // Hide add article button if logged out
        }
    }

    // Google Sign-In Initialization
    function initializeGoogleSignIn() {
        // Initialize the Google Identity Services client
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse, // Function to call after successful login
            auto_select: false // Set to true for automatic sign-in if user has a session
        });

        // Render the Google Login Button into the 'login-button' element
        google.accounts.id.renderButton(
            loginButton, // The HTML element to render the button into
            { theme: "outline", size: "large", text: "signin_with", width: "200" } // Customization options
        );
        // Ensure the custom button is visible initially
        loginButton.style.display = 'block';
    }

    // Callback function for Google Sign-In
    async function handleCredentialResponse(response) {
        const idToken = response.credential; // This is the ID token from Google

        try {
            // Send the ID token to your backend for verification
            const backendResponse = await fetch(AUTH_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ credential: idToken }),
            });

            if (!backendResponse.ok) {
                const errorData = await backendResponse.json();
                throw new Error(`Authentication failed: ${errorData.message}`);
            }

            const data = await backendResponse.json();
            setAuthToken(data.token); // Store the JWT token received from your backend
            updateAuthUI(data.user); // Update UI with user info from backend
            console.log('Successfully logged in:', data.user);
            fetchArticles(); // Re-fetch articles, potentially showing user-specific content

        } catch (error) {
            console.error('Login failed:', error);
            // Using alert for critical login failures, consider a custom modal for better UX
            alert(`Login failed: ${error.message}`);
            updateAuthUI(null); // Ensure UI reflects logged out state
        }
    }

    // Logout function
    logoutButton.addEventListener('click', () => {
        removeAuthToken(); // Clear the stored JWT token
        updateAuthUI(null); // Update UI to logged out state
        console.log('Logged out.');
        fetchArticles(); // Re-fetch articles (will now only show public articles)
    });


    // Function to truncate text to a word limit
    function truncateText(text, wordLimit) {
        const words = text.split(' ');
        if (words.length > wordLimit) {
            return words.slice(0, wordLimit).join(' ') + '...';
        }
        return text;
    }

    // Function to fetch articles from the backend
    async function fetchArticles() {
        loadingMessage.style.display = 'block'; // Show loading message
        try {
            const headers = {};
            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`; // Include JWT in Authorization header
            }

            const response = await fetch(API_BASE_URL, { headers });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            articlesData = await response.json();
            console.log("Articles fetched from backend:", articlesData);
        } catch (error) {
            console.error("Error fetching articles from backend:", error);
            mainContentArea.innerHTML = `<div class="col-span-full text-center text-red-500 text-lg mt-20">Error loading articles: ${error.message}. Please ensure the backend server is running and accessible.</div>`;
            articlesData = []; // Clear data on error
        } finally {
            loadingMessage.style.display = 'none'; // Hide loading message
        }
        renderHomePage(); // Re-render the home page with fetched data
    }

    // Function to render the home page content
    function renderHomePage() {
        mainContentArea.classList.add('fade-out'); // Start fade-out
        setTimeout(() => {
            let homePageHtml = '';
            const categories = ['politics', 'defence', 'lifestyle', 'gossips'];

            categories.forEach(category => {
                const categoryArticles = articlesData.filter(article => article.category === category);
                homePageHtml += `
                    <section id="${category}" class="category-section mb-12 pt-4">
                        <div class="flex justify-between items-center mb-8">
                            <h2 class="category-title text-gray-900 text-left">${category.charAt(0).toUpperCase() + category.slice(1)}</h2>
                            <button class="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 read-more-category-btn" data-category-id="${category}">Read More</button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                `;
                if (categoryArticles.length === 0) {
                    homePageHtml += `<div class="col-span-full text-center text-gray-500 py-10">No news yet in the ${category} category.</div>`;
                } else {
                    // Sort articles by timestamp in descending order (newest first)
                    const sortedArticles = [...categoryArticles].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    sortedArticles.forEach(article => {
                        homePageHtml += `
                            <article class="news-article bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" data-article-id="${article._id}"> <!-- Use _id from MongoDB -->
                                <img src="${article.imageUrl}" alt="Article Cover" class="w-full h-48 object-cover rounded-t-lg article-trigger" onerror="this.onerror=null;this.src='https://placehold.co/400x200/cccccc/333333?text=Image+Not+Found';">
                                <div class="p-6">
                                    <h3 class="text-gray-900 leading-tight hover:text-blue-700 cursor-pointer article-trigger">${article.headline}</h3>
                                    <p class="dateline text-gray-600"><em>${article.dateline}</em></p>
                                    <p class="text-gray-700 article-summary">${truncateText(article.summary, 30)}</p>
                                    <p class="full-article-content hidden">${article.fullContent}</p>
                                </div>
                            </article>
                        `;
                    });
                }
                homePageHtml += `
                        </div>
                    </section>
                `;
            });
            mainContentArea.innerHTML = homePageHtml;
            // originalMainContentHTML = homePageHtml; // No longer needed as content is always dynamic
            mainContentArea.classList.remove('fade-out');
            mainContentArea.classList.add('fade-in'); // Start fade-in

            // Remove fade-in class after animation to prevent interference with other transitions
            setTimeout(() => {
                mainContentArea.classList.remove('fade-in');
            }, animationDuration);

            attachEventListeners(); // Re-attach all event listeners
        }, animationDuration); // Wait for fade-out to complete
    }

    // Function to display a single article
    function displaySingleArticle(articleId) {
        // Find article by _id from MongoDB
        const article = articlesData.find(a => a._id === articleId);
        if (!article) return;

        mainContentArea.classList.add('fade-out'); // Start fade-out
        setTimeout(() => {
            const articleHtml = `
                <article class="full-article bg-white p-6 md:p-10 rounded-lg shadow-md">
                    <h1 class="article-headline text-gray-900">${article.headline}</h1>
                    <p class="article-meta">${article.dateline}</p>

                    <img src="${article.imageUrl}" alt="Article Cover" class="w-full h-96 object-cover mb-8 rounded-lg shadow-md" onerror="this.onerror=null;this.src='https://placehold.co/800x400/cccccc/333333?text=Image+Not+Found';">

                    <div class="article-content text-gray-700">
                        ${article.fullContent}
                    </div>
                </article>

                <div class="text-center mt-10">
                    <button id="back-to-home-btn" class="bg-gray-800 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-300">Back to Home</button>
                </div>
            `;

            mainContentArea.innerHTML = articleHtml;
            mainContentArea.classList.remove('fade-out');
            mainContentArea.classList.add('fade-in'); // Start fade-in

            // Remove fade-in class after animation
            setTimeout(() => {
                mainContentArea.classList.remove('fade-in');
            }, animationDuration);

            // Add event listener to the "Back to Home" button
            document.getElementById('back-to-home-btn').addEventListener('click', () => {
                renderHomePage(); // Go back to the dynamically rendered home page
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
            });
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top after content loads
        }, animationDuration); // Wait for fade-out to complete
    }

    // Function to display all articles for a given category
    function displayCategoryArticles(categoryId) {
        const categoryArticles = articlesData.filter(article => article.category === categoryId);
        
        mainContentArea.classList.add('fade-out'); // Start fade-out
        setTimeout(() => {
            let categoryPageHtml = `
                <section class="category-full-view mb-12 pt-4">
                    <h2 class="category-title text-gray-900 text-left mb-8">${categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} Articles</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            `;

            if (categoryArticles.length === 0) {
                categoryPageHtml += `<div class="col-span-full text-center text-gray-500 py-10">No news yet in the ${categoryId} category.</div>`;
            } else {
                // Sort articles by timestamp in descending order (newest first)
                const sortedArticles = [...categoryArticles].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                sortedArticles.forEach(article => {
                    categoryPageHtml += `
                        <article class="news-article bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" data-article-id="${article._id}"> <!-- Use _id from MongoDB -->
                            <img src="${article.imageUrl}" alt="Article Cover" class="w-full h-48 object-cover rounded-t-lg article-trigger" onerror="this.onerror=null;this.src='https://placehold.co/400x200/cccccc/333333?text=Image+Not+Found';">
                            <div class="p-6">
                                <h3 class="text-gray-900 leading-tight hover:text-blue-700 cursor-pointer article-trigger">${article.headline}</h3>
                                <p class="dateline text-gray-600"><em>${article.dateline}</em></p>
                                <p class="text-gray-700">${article.fullContent}</p> <!-- Display full content here -->
                            </div>
                        </article>
                    `;
                });
            }

            categoryPageHtml += `
                    </div>
                    <div class="text-center mt-10">
                        <button id="back-to-home-btn" class="bg-gray-800 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-300">Back to Home</button>
                    </div>
                </section>
            `;
            mainContentArea.innerHTML = categoryPageHtml;
            mainContentArea.classList.remove('fade-out');
            mainContentArea.classList.add('fade-in'); // Start fade-in

            // Remove fade-in class after animation
            setTimeout(() => {
                mainContentArea.classList.remove('fade-in');
            }, animationDuration);

            // Add event listener to the "Back to Home" button on category page
            document.getElementById('back-to-home-btn').addEventListener('click', () => {
                renderHomePage(); // Go back to the dynamically rendered home page
                window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
            });

            // Re-attach single article click listeners for articles on this category page
            document.querySelectorAll('.news-article .article-trigger').forEach(trigger => {
                trigger.removeEventListener('click', handleArticleClick); // Prevent duplicates
                trigger.addEventListener('click', handleArticleClick);
            });
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top after content loads
        }, animationDuration); // Wait for fade-out to complete
    }

    // Function to attach all necessary event listeners
    function attachEventListeners() {
        // Event listeners for individual article clicks (image and headline)
        document.querySelectorAll('.news-article .article-trigger').forEach(trigger => {
            trigger.removeEventListener('click', handleArticleClick); // Prevent duplicates
            trigger.addEventListener('click', handleArticleClick);
        });

        // Event listeners for "Read More" buttons (category view)
        document.querySelectorAll('.read-more-category-btn').forEach(button => {
            button.removeEventListener('click', handleReadMoreCategoryClick); // Prevent duplicates
            button.addEventListener('click', handleReadMoreCategoryClick);
        });

        // Smooth scrolling for navigation links
        const navLinks = document.querySelectorAll('nav ul li a');
        for (const link of navLinks) {
            link.removeEventListener('click', handleNavLinkClick); // Prevent duplicates
            link.addEventListener('click', handleNavLinkClick);
        }
    }

    // Handler for individual article clicks
    function handleArticleClick(event) {
        event.preventDefault();
        const articleElement = event.target.closest('.news-article');
        if (articleElement) {
            displaySingleArticle(articleElement.dataset.articleId);
        }
    }

    // Handler for "Read More" category button clicks
    function handleReadMoreCategoryClick(event) {
        event.preventDefault();
        const categoryId = event.target.dataset.categoryId;
        if (categoryId) {
            displayCategoryArticles(categoryId);
        }
    }

    // Handler for navigation link clicks (smooth scroll or return to home)
    function handleNavLinkClick(event) {
        event.preventDefault();
        const targetId = event.target.getAttribute('href');

        mainContentArea.classList.add('fade-out');
        setTimeout(() => {
            if (targetId.startsWith('#')) {
                renderHomePage(); // Restore home page first
                setTimeout(() => {
                    const targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        window.scrollTo({ top: targetSection.offsetTop - 70, behavior: 'smooth' });
                    }
                }, 50); // Small delay for scroll after content is visible
            }
        }, animationDuration);
    }

    // --- Modal Logic ---

    // Open Modal
    openAddArticleModalBtn.addEventListener('click', () => {
        // Only allow opening if logged in
        if (getAuthToken()) {
            addArticleModal.classList.add('show');
        } else {
            // Using alert for simplicity, consider a custom modal for better UX
            alert('Please log in to add articles.');
        }
    });

    // Close Modal
    closeModalBtn.addEventListener('click', () => {
        addArticleModal.classList.remove('show');
        addArticleForm.reset(); // Clear form fields on close
    });

    cancelAddArticleBtn.addEventListener('click', () => {
        addArticleModal.classList.remove('show');
        addArticleForm.reset(); // Clear form fields on cancel
    });

    // Handle form submission
    addArticleForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Prevent default form submission

        const category = document.getElementById('articleCategory').value;
        const headline = document.getElementById('articleHeadline').value;
        const imageUrl = document.getElementById('articleImageUrl').value;
        const dateline = document.getElementById('articleDateline').value;
        const summary = document.getElementById('articleSummary').value;
        const fullContent = document.getElementById('articleFullContent').value;

        // Basic validation
        if (!category || !headline || !imageUrl || !dateline || !summary || !fullContent) {
            console.error('Please fill in all fields.');
            return;
        }

        const newArticle = {
            category: category,
            headline: headline,
            imageUrl: imageUrl,
            dateline: dateline,
            summary: summary,
            fullContent: fullContent,
            // timestamp will be added by the server
        };

        try {
            const token = getAuthToken();
            if (!token) {
                alert('You must be logged in to add articles.');
                return;
            }

            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Send the JWT token
                },
                body: JSON.stringify(newArticle),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
            }

            const addedArticle = await response.json();
            console.log("Article added to backend:", addedArticle);

            addArticleModal.classList.remove('show'); // Hide modal
            addArticleForm.reset(); // Reset form

            await fetchArticles(); // Re-fetch all articles to include the new one and re-render
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
        } catch (e) {
            console.error("Error adding article to backend: ", e);
            alert(`Error adding article: ${e.message}. Please ensure you are logged in and the backend server is running.`);
        }
    });

    // Initial checks and loads
    updateAuthUI(null); // Set initial UI state (logged out)
    initializeGoogleSignIn(); // Initialize Google Sign-In
    fetchArticles(); // Initial load of data from the backend
});
