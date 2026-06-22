jQuery(document).ready(function ($) {

    let symbol = localize_params.symbol;

    let packagesWithQty = gofly_core_ajax.packages.map(pkg => {
        return {
            title: pkg.title,
            booking_date: pkg.booking_date || {},
            is_expired: pkg.is_expired || false,
            services: pkg.services || [],
            pricing_categories: pkg.pricing_categories.map(cat => ({
                slug: cat.slug,
                price: cat.price,
                quantity: 1 // initial quantity
            })),
            inOUt: '',
        };
    });

    jQuery(document).on('change', '.tour-order input[name="inOut"]', function () {
        const selectedDate = moment(jQuery(this).val(), 'DD-MMM-YYYY', true);

        packagesWithQty.forEach(pkg => {
            pkg.inOUt = jQuery(this).val();
        });

        updateTourPackageAvailability(selectedDate);
    });

    function isPackageAvailableForDate(pkg, selectedDate) {
        if (!pkg || pkg.is_expired || !selectedDate || !selectedDate.isValid()) {
            return false;
        }

        const from = moment(pkg.booking_date.from, 'YYYY-MM-DD', true);
        const to = moment(pkg.booking_date.to, 'YYYY-MM-DD', true);

        return from.isValid() &&
            to.isValid() &&
            selectedDate.isBetween(from, to, 'day', '[]');
    }

    function updateTourPackageAvailability(selectedDate) {
        let availableCount = 0;
        let $firstAvailable = null;

        $('.tour-accordion-item').each(function () {
            const $packageItem = $(this);
            const packageIndex = parseInt($packageItem.data('package-index'), 10);
            const pkg = packagesWithQty[packageIndex];
            const isAvailable = isPackageAvailableForDate(pkg, selectedDate);
            const isExpired = Boolean(pkg && pkg.is_expired);
            const $accordionButton = $packageItem.find('.accordion-button').first();
            const $bookingButton = $packageItem.find('.add-to-cart-btn');
            const $status = $packageItem.find('.tour-package-status');
            const collapseTarget = $accordionButton.data('collapse-target');

            $packageItem.show();

            if (isAvailable) {
                availableCount++;
                $packageItem.removeClass('disabled-package date-unavailable-package');
                $accordionButton
                    .removeClass('disabled')
                    .attr('data-bs-toggle', 'collapse')
                    .attr('data-bs-target', collapseTarget)
                    .attr('aria-disabled', 'false');
                $bookingButton.removeClass('disabled').attr('aria-disabled', 'false');
                $status.hide().text('');

                if (!$firstAvailable) {
                    $firstAvailable = $packageItem;
                }
            } else {
                const statusMessage = isExpired
                    ? 'This package date has expired and is not available for booking.'
                    : (!selectedDate || !selectedDate.isValid()
                        ? gofly_core_ajax.select_date_message
                        : gofly_core_ajax.package_date_message);

                $packageItem.addClass('disabled-package date-unavailable-package');
                $accordionButton
                    .addClass('disabled collapsed')
                    .removeAttr('data-bs-toggle data-bs-target')
                    .attr('aria-disabled', 'true')
                    .attr('aria-expanded', 'false');
                $bookingButton.addClass('disabled').attr('aria-disabled', 'true');
                $status.text(statusMessage).show();
            }
        });

        $('.tour-accordion-item .accordion-collapse.show').removeClass('show');
        $('.tour-accordion-item .accordion-button')
            .addClass('collapsed')
            .attr('aria-expanded', 'false');

        if ($firstAvailable) {
            $firstAvailable.find('.accordion-button')
                .removeClass('collapsed')
                .attr('aria-expanded', 'true');
            $firstAvailable.find('.accordion-collapse').addClass('show');
        }

        const message = !selectedDate || !selectedDate.isValid()
            ? gofly_core_ajax.select_date_message
            : (availableCount ? '' : gofly_core_ajax.no_package_message);

        $('.tour-package-selection-message')
            .text(message)
            .toggle(Boolean(message));
    }

    function updateQuantityGlobal(slug, qty) {
        packagesWithQty.forEach(pkg => {
            pkg.pricing_categories.forEach(cat => {
                if (cat.slug === slug) {
                    cat.quantity = parseInt(qty, 10) || 0;
                }
            });
        });
    }

    $(".quantity__input").on("keyup", function () {
        const $input = $(this);
        const slug = $input.data("type");
        let qty = parseInt($input.val(), 10) || 0;
        // Update all packages
        updateQuantityGlobal(slug, qty);
        recalcAllPackages();
    });

    $(".guest-quantity__minus, .guest-quantity__plus").on("click", function (e) {
        e.preventDefault();

        $(".package-list").addClass("loading");

        setTimeout(() => {
            const $btn = $(this);
            const $input = $btn.siblings(".quantity__input");
            const slug = $input.data("type");
            let val = parseInt($input.val(), 10) || 0;

            // find li index (0-based)
            const index = $btn.closest("li.single-item").index();

            if ($btn.hasClass("guest-quantity__minus")) {
                if (index > 0) {
                    val = Math.max(0, val - 1);
                }
            }
            $input.val(val);
            updateQuantityGlobal(slug, val);
            recalcAllPackages();
        }, 0);

        setTimeout(() => {
            $(".package-list").removeClass("loading");
        }, 500);

    });

    function recalcAllPackages() {
        $(".tour-accordion-item").each(function (index) {
            const $packageItem = $(this);
            const pkg = packagesWithQty[index];

            let total = 0;

            // Pricing categories
            pkg.pricing_categories.forEach(cat => {
                total += cat.price * cat.quantity;
                $packageItem.find(`.line-qty[data-type="${cat.slug}"]`).text(cat.quantity);
            });

            // Services
            pkg.services.forEach((srv, srvIndex) => {
                if (srv.selected) {
                    total += srv.price * srv.quantity;
                }

                // update input value in DOM (sync)
                $packageItem.find(".service").eq(srvIndex).find(".quantity__input").val(srv.quantity);
            });

            // Update total
            $packageItem.find(".total").text(symbol + total.toFixed(2));
        });
    }


    $(".tour-accordion-item").each(function (index) {
        const $packageItem = $(this);
        const pkg = packagesWithQty[index];

        pkg.services = [];
        $packageItem.find(".service").each(function () {
            const $service = $(this);
            pkg.services.push({
                id: $service.data("id") || null, // if you have unique id
                price: parseFloat($service.data("price")) || 0,
                quantity: 0,
                selected: false
            });
        });
    });

    // Checkbox toggle
    $(document).on("change", ".service input[type='checkbox']", function () {
        handleServiceToggle($(this));
    });

    // H6 click toggle
    $(document).on("click", ".service h6", function () {
        const $service = $(this).closest(".service");
        const $checkbox = $service.find("input[type='checkbox']");
        $checkbox.prop("checked", !$checkbox.is(":checked")).trigger("change");
    });

    // Common function for both checkbox and h6
    function handleServiceToggle($checkbox) {
        const $service = $checkbox.closest(".service");
        const $packageItem = $service.closest(".tour-accordion-item");
        const pkgIndex = $packageItem.index(".tour-accordion-item");
        const pkg = packagesWithQty[pkgIndex];

        const serviceIndex = $service.index();
        pkg.services[serviceIndex].selected = $checkbox.is(":checked");

        // remove & add class 
        if ($checkbox.is(':checked')) {
            $service.find('.pricing-and-count-area').removeClass('disabled');
        } else {
            $service.find('.pricing-and-count-area').addClass('disabled');
        }

        recalcAllPackages();
    }


    // Quantity update
    $(document).on("keyup click", ".service .quantity__input, .service .quantity__minus, .service .quantity__plus", function () {
        const $service = $(this).closest(".service");
        const $packageItem = $service.closest(".tour-accordion-item");
        const pkgIndex = $packageItem.index(".tour-accordion-item");
        const pkg = packagesWithQty[pkgIndex];

        const serviceIndex = $service.index();
        const qty = parseInt($service.find(".quantity__input").val(), 10) || 0;
        pkg.services[serviceIndex].quantity = qty;

        recalcAllPackages();
    });

    // Add to Cart AJAX
    $(document).on('click', '.add-to-cart-btn', function (e) {
        e.preventDefault();
        var checkoutUrl = gofly_core_ajax.checkout_url;
        var $button = $(this);
        var $packageItem = $(this).closest('.tour-accordion-item');
        var pkgIndex = parseInt($packageItem.data('package-index'), 10);
        var pkg = packagesWithQty[pkgIndex];
        var selectedDate = moment(pkg ? pkg.inOUt : '', 'DD-MMM-YYYY', true);

        if ($button.data('adding')) {
            return;
        }

        if (!isPackageAvailableForDate(pkg, selectedDate)) {
            alert(selectedDate.isValid() ? gofly_core_ajax.no_package_message : gofly_core_ajax.select_date_message);
            return;
        }

        if ($packageItem.hasClass('disabled-package') || (pkg && pkg.is_expired)) {
            alert('This package date has expired and is not available for booking.');
            return;
        }

        $button.data('adding', true).addClass('disabled');

        // Prepare pricing data
        var pricing = pkg.pricing_categories.map(function (cat) {
            return {
                label: cat.slug,
                price: cat.price,
                quantity: cat.quantity
            };
        });

        // Prepare services data
        var services = pkg.services.filter(function (srv) {
            return srv.selected;
        }).map(function (srv) {
            return {
                label: srv.id,
                price: srv.price,
                quantity: srv.quantity,
                selected: srv.selected
            };
        });

        var post_id = gofly_core_ajax.post_id;

        $.ajax({
            url: gofly_core_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'egns_add_to_cart',
                post_id: post_id,
                data: {
                    pktitle: pkg.title,
                    pricing: pricing,
                    services: services,
                    meta: [{
                        label: gofly_core_ajax.date_label,
                        value: pkg.inOUt,
                    }]
                }
            },
            success: function (response) {
                // Redirect to Checkout page on success
                window.location.href = checkoutUrl;

                // Disable the button after it's clicked once
                $button.prop('disabled', true);

            },
            error: function () {
                $button.data('adding', false).removeClass('disabled');
                alert('Failed to add to cart.');
            }
        });
    });

    updateTourPackageAvailability(null);





});
