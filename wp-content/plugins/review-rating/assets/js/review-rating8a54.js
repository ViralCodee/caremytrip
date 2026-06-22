(function ($) {
    ("use strict");

    document.addEventListener("DOMContentLoaded", function () {
        const ratingContainers = document.querySelectorAll(".rating-container");
        ratingContainers.forEach(container => {
            const stars = container.querySelectorAll(".star-icon");
            const hiddenInput = container.parentElement.querySelector("input[type='hidden']");
            stars.forEach(star => {
                star.addEventListener("click", function () {
                    let rating = this.getAttribute("data-value");
                    container.setAttribute("data-rating", rating);
                    hiddenInput.value = rating;
                    // Update star UI
                    stars.forEach(s => {
                        if (s.getAttribute("data-value") <= rating) {
                            s.classList.remove("bi-star");
                            s.classList.add("bi-star-fill");
                        } else {
                            s.classList.remove("bi-star-fill");
                            s.classList.add("bi-star");
                        }
                    });
                });
            });
        });
    });



})(jQuery);