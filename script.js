// JavaScript for smooth scrolling when clicking navigation links
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');

    for (const link of navLinks) {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default anchor link behavior
            const targetId = this.getAttribute('href'); // Get the href attribute (e.g., "#politics")
            const targetSection = document.querySelector(targetId); // Select the target section element

            if (targetSection) {
                // Scroll to the target section smoothly
                // Adjusting 'top' by 70px to account for the fixed header, so content isn't hidden behind it
                window.scrollTo({
                    top: targetSection.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    }
});
