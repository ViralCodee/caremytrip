jQuery(document).ready(function ($) {

    let symbol = localize_params.symbol;

    let packagesWithQty = gofly_exp_core_ajax.packages.map(pkg => {
        return {
            title: pkg.title,
            package_index: pkg.package_index,
            booking_date: pkg.booking_date || {},
            is_expired: pkg.is_expired || false,
            ticket_capacity: parseInt(pkg.ticket_capacity, 10) || 0,
            weekly_off_days: pkg.weekly_off_days || [],
            booked_dates: pkg.booked_dates || {},
            services: pkg.services || [],
            pricing_categories: pkg.pricing_categories.map(cat => ({
                slug: cat.slug,
                price: cat.price,
                quantity: 1 // initial quantity
            })),
            inOUt: '',
        };
    });

    jQuery(document).on('change', '.exp-order input[name="inOut"]', function () {
        const selectedDate = moment(jQuery(this).val(), 'DD-MMM-YYYY', true);
        packagesWithQty.forEach(pkg => {
            pkg.inOUt = jQuery(this).val();
        });
        updatePackageAvailability(selectedDate);
    });

    function getPackageStatus(pkg, selectedDate, requestedTickets) {
        if (pkg.is_expired) {
            return gofly_exp_core_ajax.expired_message;
        }

        if (!selectedDate || !selectedDate.isValid()) {
            return gofly_exp_core_ajax.select_date_message;
        }

        const from = moment(pkg.booking_date.from, 'YYYY-MM-DD', true);
        const to = moment(pkg.booking_date.to, 'YYYY-MM-DD', true);
        const dateKey = selectedDate.format('YYYY-MM-DD');
        const dayName = selectedDate.format('dddd').toLowerCase();

        if (!from.isValid() || !to.isValid() || !selectedDate.isBetween(from, to, 'day', '[]')) {
            return gofly_exp_core_ajax.select_date_message;
        }

        if (pkg.weekly_off_days.indexOf(dayName) !== -1) {
            return gofly_exp_core_ajax.off_day_message;
        }

        const booked = parseInt(pkg.booked_dates[dateKey], 10) || 0;
        const remaining = pkg.ticket_capacity - booked;

        if (!pkg.ticket_capacity || remaining <= 0) {
            return gofly_exp_core_ajax.sold_out_message;
        }

        if (requestedTickets && requestedTickets > remaining) {
            return gofly_exp_core_ajax.capacity_message.replace('%d', remaining);
        }

        return '';
    }

    function getTicketQuantity(pkg) {
        const ticket = pkg.pricing_categories.find(function (category) {
            return category.slug === 'ticket';
        });

        return ticket ? (parseInt(ticket.quantity, 10) || 0) : 0;
    }

    function updatePackageAvailability(selectedDate) {
        $('.exp-accordion-item').each(function (index) {
            const $packageItem = $(this);
            const requestedTickets = getTicketQuantity(packagesWithQty[index]);
            const status = getPackageStatus(packagesWithQty[index], selectedDate, requestedTickets);

            $packageItem.toggleClass('disabled-package', Boolean(status));
            $packageItem.find('.add-to-cart-btn').toggleClass('disabled', Boolean(status)).attr('aria-disabled', status ? 'true' : 'false');
            $packageItem.find('.exp-package-status').text(status).toggle(Boolean(status));
            $packageItem.find('.exp-package-header-status').text(status).toggle(Boolean(status));
        });
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

    $(".ticket-quantity__minus, .ticket-quantity__plus").on("click", function (e) {
        e.preventDefault();

        $(".package-list").addClass("loading");

        setTimeout(() => {
            const $btn = $(this);
            const $input = $btn.siblings(".quantity__input");
            const slug = $input.data("type");
            let val = parseInt($input.val(), 10) || 0;

            // find li index (0-based)
            const index = $btn.closest("li.single-item").index();

            if ($btn.hasClass("ticket-quantity__minus")) {
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
        $(".exp-accordion-item").each(function (index) {
            const $packageItem = $(this);
            const pkg = packagesWithQty[index];
            let total = 0;
            // Pricing categories
            pkg.pricing_categories.forEach(cat => {
                total += cat.price * cat.quantity;
                $packageItem.find(`.line-tc-qty[data-type="${cat.slug}"]`).text(cat.quantity);
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

        const selectedDate = moment($('.exp-order input[name="inOut"]').first().val(), 'DD-MMM-YYYY', true);
        updatePackageAvailability(selectedDate);
    }


    $(".exp-accordion-item").each(function (index) {
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
        handleExpServiceToggle($(this));
    });

    // H6 click toggle
    $(document).on("click", ".service h6", function () {
        const $service = $(this).closest(".service");
        const $checkbox = $service.find("input[type='checkbox']");
        $checkbox.prop("checked", !$checkbox.is(":checked")).trigger("change");
    });

    // Common function for both checkbox and h6
    function handleExpServiceToggle($checkbox) {
        const $service = $checkbox.closest(".service");
        const $packageItem = $service.closest(".exp-accordion-item");
        const pkgIndex = $packageItem.index(".exp-accordion-item");
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
        const $packageItem = $service.closest(".exp-accordion-item");
        const pkgIndex = $packageItem.index(".exp-accordion-item");
        const pkg = packagesWithQty[pkgIndex];

        const serviceIndex = $service.index();
        const qty = parseInt($service.find(".quantity__input").val(), 10) || 0;
        pkg.services[serviceIndex].quantity = qty;

        recalcAllPackages();
    });

    // Add to Cart AJAX
    $(document).on('click', '.exp-accordion-item .add-to-cart-btn', function (e) {
        e.preventDefault();
        var checkoutUrl = gofly_exp_core_ajax.checkout_url;
        var $button = $(this);
        var $packageItem = $button.closest('.exp-accordion-item');
        var pkgIndex = $packageItem.index('.exp-accordion-item');
        var pkg = packagesWithQty[pkgIndex];
        var selectedDate = moment(pkg.inOUt, 'DD-MMM-YYYY', true);
        var ticketQuantity = getTicketQuantity(pkg);
        var status = getPackageStatus(pkg, selectedDate, ticketQuantity);

        if ($button.data('adding') || status) {
            if (status) {
                alert(status);
            }
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

        var post_id = gofly_exp_core_ajax.post_id;

        $.ajax({
            url: gofly_exp_core_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'egns_add_to_cart',
                _ajax_nonce: gofly_exp_core_ajax.nonce,
                post_id: post_id,
                data: {
                    package_index: pkg.package_index,
                    booking_date: selectedDate.format('YYYY-MM-DD'),
                    ticket_quantity: ticketQuantity,
                    pktitle: pkg.title,
                    pricing: pricing,
                    services: services,
                    meta: [{
                        label: gofly_exp_core_ajax.date_label,
                        value: pkg.inOUt,
                    }]
                }
            },
            success: function (response) {
                if (!response || !response.success) {
                    $button.data('adding', false).removeClass('disabled');
                    alert(response && response.data && response.data.message ? response.data.message : 'Failed to add to cart.');
                    return;
                }
                // Redirect to Checkout page on success
                window.location.href = checkoutUrl;
                
                // Disable the button after it's clicked once
                $button.prop('disabled', true);
            },
            error: function (xhr) {
                $button.data('adding', false).removeClass('disabled');
                const response = xhr.responseJSON;
                alert(response && response.data && response.data.message ? response.data.message : 'Failed to add to cart.');
            }
        });
    });

    const $dateInput = $('.exp-order input[name="inOut"]').first();
    if ($dateInput.length && $dateInput.val()) {
        $dateInput.trigger('change');
    } else {
        updatePackageAvailability(null);
    }
});
