document.addEventListener('DOMContentLoaded', function() {
    const mainContentArea = document.getElementById('main-content');
    const loadingMessage = document.getElementById('loadingMessage');
    const animationDuration = 300; // milliseconds for fade animation

    // Auth elements
    const userStatusSpan = document.getElementById('user-status');
    const profilePictureImg = document.getElementById('profile-picture');
    const loginButton = document.getElementById('login-button'); // This is the hidden div where Google button renders
    const logoutButton = document.getElementById('logout-button');
    const authSection = document.getElementById('auth-section'); // For hover effect

    // Modal elements
    const addArticleModal = document.getElementById('addArticleModal');
    const openAddArticleModalBtn = document.getElementById('openAddArticleModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelAddArticleBtn = document.getElementById('cancelAddArticleBtn');
    const addArticleForm = document.getElementById('addArticleForm');

    // New elements for content visibility
    const loginPromptContainer = document.getElementById('login-prompt-container');
    const newsContentSections = document.getElementById('news-content-sections');
    const googleLoginButtonContainer = document.getElementById('google-login-button-container'); // The div where Google button will be rendered

    // Data array for articles
    let articlesData = [];

    // API Endpoint for the backend server
    const API_BASE_URL = 'https://lika.onrender.com/api/articles';
    const AUTH_API_URL = 'https://lika.onrender.com/api/auth/google';

    // IMPORTANT: Replace with your actual Google Client ID from Google Cloud Console
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

    // Function to control content visibility (news sections and add article button)
    function toggleContentVisibility(isVisible) {
        if (isVisible) {
            loginPromptContainer.style.display = 'none';
            newsContentSections.style.display = 'block';
            openAddArticleModalBtn.classList.remove('hidden');
        } else {
            loginPromptContainer.style.display = 'flex'; // Use flex to center content
            newsContentSections.style.display = 'none';
            openAddArticleModalBtn.classList.add('hidden');
        }
    }

    // Function to update UI based on login status
    function updateAuthUI(user = null) {
        if (user && getAuthToken()) {
            userStatusSpan.textContent = `${user.name || user.email}`;
            profilePictureImg.src = user.picture || 'https://placehold.co/40x40/FFFFFF/000000?text=User';
            // loginButton in header is now just a placeholder for the Google button,
            // which is rendered in googleLoginButtonContainer. Keep it hidden in header.
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden'); // Logout button is managed by CSS hover
            toggleContentVisibility(true); // Show news content
            fetchArticles(); // Fetch articles when logged in
        } else {
            userStatusSpan.textContent = 'Not Logged In';
            profilePictureImg.src = 'https://placehold.co/40x40/FFFFFF/000000?text=User';
            loginButton.classList.remove('hidden'); // Show the login button in the header (though it's not the actual Google button)
            logoutButton.classList.add('hidden'); // Hide logout button
            toggleContentVisibility(false); // Hide news content, show login prompt
        }
    }

    // Google Sign-In Initialization
    function initializeGoogleSignIn() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
                auto_select: false
            });

            // Render the Google Login Button into the dedicated container in main content
            google.accounts.id.renderButton(
                googleLoginButtonContainer, // Render into the new div in main
                { theme: "outline", size: "large", text: "signin_with", width: "200" }
            );
            // The original loginButton in the header can remain hidden or be removed if not used for rendering
            // loginButton.style.display = 'none'; // Ensure the header placeholder is not visible
        } else {
            console.error("Google Identity Services library not loaded or initialized correctly.");
            loginPromptContainer.innerHTML = `<h2 class="text-2xl font-bold mb-4 text-red-600">Login Unavailable</h2><p class="text-red-500">Please check your internet connection or try again later.</p>`;
        }
    }

    // Callback function for Google Sign-In
    async function handleCredentialResponse(response) {
        const idToken = response.credential;

        try {
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
            setAuthToken(data.token);
            updateAuthUI(data.user);
            console.log('Successfully logged in:', data.user);
            // Articles will be fetched by updateAuthUI -> fetchArticles
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}. Please check your Google Cloud Console settings and backend server logs.`);
            updateAuthUI(null);
        }
    }

    // Logout function
    logoutButton.addEventListener('click', () => {
        removeAuthToken();
        updateAuthUI(null);
        console.log('Logged out.');
        // No need to fetch articles immediately after logout, as toggleContentVisibility(false) will hide them.
        // If you want to clear the displayed articles immediately, you could clear articlesData and re-render.
        // articlesData = [];
        // renderHomePage(); // This would render empty sections with "No news yet"
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
        loadingMessage.style.display = 'block';
        try {
            const headers = {};
            const token = getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(API_BASE_URL, { headers });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            articlesData = await response.json();
            console.log("Articles fetched from backend:", articlesData);
        } catch (error) {
            console.error("Error fetching articles from backend:", error);
            // Display error message within the news content area if it's visible
            if (newsContentSections.style.display !== 'none') {
                 newsContentSections.innerHTML = `<div class="col-span-full text-center text-red-500 text-lg mt-20">Error loading articles: ${error.message}. Please ensure the backend server is running and accessible.</div>`;
            }
            articlesData = [];
        } finally {
            loadingMessage.style.display = 'none';
        }
        renderHomePage();
    }

    // Function to render the home page content
    function renderHomePage() {
        // Only render if news content is supposed to be visible
        if (newsContentSections.style.display === 'none') {
            return; // Don't render if not logged in
        }

        // Clear existing content before rendering new
        newsContentSections.innerHTML = '';

        mainContentArea.classList.add('fade-out');
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
            // Replace the content of newsContentSections, not mainContentArea directly
            newsContentSections.innerHTML = homePageHtml;
            newsContentSections.classList.remove('fade-out');
            newsContentSections.classList.add('fade-in');

            setTimeout(() => {
                newsContentSections.classList.remove('fade-in');
            }, animationDuration);

            attachEventListeners();
        }, animationDuration);
    }

    // Function to display a single article (remains largely the same)
    function displaySingleArticle(articleId) {
        const article = articlesData.find(a => a._id === articleId);
        if (!article) return;

        mainContentArea.classList.add('fade-out');
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
            mainContentArea.classList.add('fade-in');

            setTimeout(() => {
                mainContentArea.classList.remove('fade-in');
            }, animationDuration);

            document.getElementById('back-to-home-btn').addEventListener('click', () => {
                renderHomePage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, animationDuration);
    }

    // Function to display all articles for a given category (remains largely the same)
    function displayCategoryArticles(categoryId) {
        const categoryArticles = articlesData.filter(article => article.category === categoryId);
        
        mainContentArea.classList.add('fade-out');
        setTimeout(() => {
            let categoryPageHtml = `
                <section class="category-full-view mb-12 pt-4">
                    <h2 class="category-title text-gray-900 text-left mb-8">${categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} Articles</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            `;

            if (categoryArticles.length === 0) {
                categoryPageHtml += `<div class="col-span-full text-center text-gray-500 py-10">No news yet in the ${categoryId} category.</div>`;
                } else {
                    const sortedArticles = [...categoryArticles].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    sortedArticles.forEach(article => {
                        categoryPageHtml += `
                            <article class="news-article bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300" data-article-id="${article._id}">
                                <img src="${article.imageUrl}" alt="Article Cover" class="w-full h-48 object-cover rounded-t-lg article-trigger" onerror="this.onerror=null;this.src='https://placehold.co/400x200/cccccc/333333?text=Image+Not+Found';">
                                <div class="p-6">
                                    <h3 class="text-gray-900 leading-tight hover:text-blue-700 cursor-pointer article-trigger">${article.headline}</h3>
                                    <p class="dateline text-gray-600"><em>${article.dateline}</em></p>
                                    <p class="text-gray-700">${article.fullContent}</p>
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
            mainContentArea.classList.add('fade-in');

            setTimeout(() => {
                mainContentArea.classList.remove('fade-in');
            }, animationDuration);

            document.getElementById('back-to-home-btn').addEventListener('click', () => {
                renderHomePage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            document.querySelectorAll('.news-article .article-trigger').forEach(trigger => {
                trigger.removeEventListener('click', handleArticleClick);
                trigger.addEventListener('click', handleArticleClick);
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, animationDuration);
    }

    // Function to attach all necessary event listeners
    function attachEventListeners() {
        // Event listeners for individual article clicks (image and headline)
        document.querySelectorAll('.news-article .article-trigger').forEach(trigger => {
            trigger.removeEventListener('click', handleArticleClick);
            trigger.addEventListener('click', handleArticleClick);
        });

        // Event listeners for "Read More" buttons (category view)
        document.querySelectorAll('.read-more-category-btn').forEach(button => {
            button.removeEventListener('click', handleReadMoreCategoryClick);
            button.addEventListener('click', handleReadMoreCategoryClick);
        });

        // Smooth scrolling for navigation links
        const navLinks = document.querySelectorAll('nav ul li a');
        for (const link of navLinks) {
            link.removeEventListener('click', handleNavLinkClick);
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
                // Ensure news content is visible before attempting to scroll to a section
                if (getAuthToken()) {
                    toggleContentVisibility(true); // Ensure news sections are visible
                    const targetSection = document.querySelector(targetId);
                    if (targetSection) {
                        window.scrollTo({ top: targetSection.offsetTop - 70, behavior: 'smooth' });
                    }
                } else {
                    // If not logged in, just show the login prompt and don't scroll
                    toggleContentVisibility(false);
                }
            }
        }, animationDuration);
    }

    // --- Modal Logic ---

    // Open Modal
    openAddArticleModalBtn.addEventListener('click', () => {
        if (getAuthToken()) {
            addArticleModal.classList.add('show');
        } else {
            alert('Please log in to add articles.');
        }
    });

    // Close Modal
    closeModalBtn.addEventListener('click', () => {
        addArticleModal.classList.remove('show');
        addArticleForm.reset();
    });

    cancelAddArticleBtn.addEventListener('click', () => {
        addArticleModal.classList.remove('show');
        addArticleForm.reset();
    });

    // Handle form submission
    addArticleForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        const category = document.getElementById('articleCategory').value;
        const headline = document.getElementById('articleHeadline').value;
        const imageUrl = document.getElementById('articleImageUrl').value;
        const dateline = document.getElementById('articleDateline').value;
        const summary = document.getElementById('articleSummary').value;
        const fullContent = document.getElementById('articleFullContent').value;

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
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newArticle),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
            }

            const addedArticle = await response.json();
            console.log("Article added to backend:", addedArticle);

            addArticleModal.classList.remove('show');
            addArticleForm.reset();

            await fetchArticles(); // Re-fetch all articles to include the new one and re-render
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error("Error adding article to backend: ", e);
            alert(`Error adding article: ${e.message}. Please ensure you are logged in and the backend server is running.`);
        }
    });

    // Initial checks and loads
    // Check if user is already logged in (e.g., token exists from a previous session)
    if (getAuthToken()) {
        // In a real app, you'd verify this token with your backend to get actual user info.
        // For this example, we'll use placeholder info for UI update.
        updateAuthUI({ name: 'User', email: 'user@example.com', picture: 'https://placehold.co/40x40/FFFFFF/000000?text=User' });
    } else {
        updateAuthUI(null); // Set initial UI state (logged out), hides content
    }
    initializeGoogleSignIn(); // Initialize Google Sign-In
});
